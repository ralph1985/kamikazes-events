import { kv } from '@vercel/kv';
import { formatDayKey, parseDayKey } from '../dates';
import { slugify } from '../slug';
import type { EventItem, StorageDriver, VoteResult } from './StorageDriver';

export class KvDriver implements StorageDriver {
  async getEvents(): Promise<EventItem[]> {
    const entries = (await kv.hgetall<Record<string, string>>('events:list')) || {};
    const events: EventItem[] = Object.entries(entries).map(([id, value]) => {
      try {
        const parsed = JSON.parse(value) as EventItem;
        if (parsed?.window?.start && parsed?.window?.end) return parsed;
      } catch {
        // ignore parse error
      }
      const safeName = typeof value === 'string' ? value : String(id);
      return {
        id,
        name: safeName,
        window: { start: '2026-01-07', end: '2026-03-01' }
      };
    });
    const normalized = events.map((event) => ({
      ...event,
      name: typeof event.name === 'string' ? event.name : String(event.id)
    }));
    return normalized.sort((a, b) => a.name.localeCompare(b.name, 'es'));
  }

  async createEvent(
    name: string,
    window: EventItem['window'] = { start: '2026-01-07', end: '2026-03-01' }
  ): Promise<EventItem> {
    const cleanName = name.trim();
    const id = slugify(cleanName);
    const existing = await kv.hget<string>('events:list', id);
    const event: EventItem =
      existing && this.isSerialized(existing)
        ? (JSON.parse(existing) as EventItem)
        : existing
          ? { id, name: existing, window }
          : { id, name: cleanName, window };

    await kv.hset('events:list', { [id]: JSON.stringify(event) });
    return event;
  }

  async getResults(eventId: string): Promise<VoteResult[]> {
    const aggregate = await this.aggregateCounts(eventId);
    return Object.entries(aggregate)
      .map(([day, votes]) => ({
        day: formatDayKey(parseDayKey(day)),
        votes
      }))
      .sort((a, b) => {
        if (b.votes !== a.votes) return b.votes - a.votes;
        return a.day.localeCompare(b.day);
      });
  }

  async vote(eventId: string, voterId: string, _name: string, days: string[]): Promise<void> {
    const voterKey = this.buildVoterKey(voterId);
    const voterStoreKey = this.voterStoreKey(eventId, voterKey);
    await kv.set(voterStoreKey, days);
    await kv.sadd(this.votersSetKey(eventId), voterKey);
    await kv.set(this.voterNameKey(eventId, voterKey), _name);
  }

  async getSelection(eventId: string, voterId: string): Promise<string[]> {
    const voterKey = this.buildVoterKey(voterId);
    const voterStoreKey = this.voterStoreKey(eventId, voterKey);
    return (await kv.get<string[]>(voterStoreKey)) || [];
  }

  async getVotersByDay(eventId: string, day: string): Promise<string[]> {
    const voterKeys = (await kv.smembers(this.votersSetKey(eventId))) || [];
    const matches: string[] = [];
    for (const voterKey of voterKeys) {
      const selection = (await kv.get<string[]>(this.voterStoreKey(eventId, voterKey))) || [];
      if (selection.includes(day)) {
        const name = (await kv.get<string>(this.voterNameKey(eventId, voterKey))) || 'Anónimo';
        matches.push(name);
      }
    }
    return matches;
  }

  async setVoterName(eventId: string, voterId: string, name: string): Promise<void> {
    const voterKey = this.buildVoterKey(voterId);
    await kv.set(this.voterNameKey(eventId, voterKey), name);
  }

  async getVotersSelections(eventId: string) {
    const voterKeys = (await kv.smembers(this.votersSetKey(eventId))) || [];
    const voters: { name: string; days: string[] }[] = [];
    for (const voterKey of voterKeys) {
      const selection = (await kv.get<string[]>(this.voterStoreKey(eventId, voterKey))) || [];
      const name = (await kv.get<string>(this.voterNameKey(eventId, voterKey))) || 'Anónimo';
      voters.push({ name, days: selection });
    }
    return voters;
  }

  private buildVoterKey(raw: string): string {
    return slugify(raw.trim().toLowerCase()) || 'anon';
  }

  private async aggregateCounts(eventId: string) {
    const voterKeys = (await kv.smembers(this.votersSetKey(eventId))) || [];
    const aggregate: Record<string, number> = {};

    for (const voterKey of voterKeys) {
      const selection = (await kv.get<string[]>(this.voterStoreKey(eventId, voterKey))) || [];
      selection.forEach((day) => {
        aggregate[day] = (aggregate[day] ?? 0) + 1;
      });
    }
    return aggregate;
  }

  private voterStoreKey(eventId: string, voterKey: string) {
    return `event:${eventId}:voter:${voterKey}`;
  }

  private voterNameKey(eventId: string, voterKey: string) {
    return `event:${eventId}:voter:${voterKey}:name`;
  }

  private votersSetKey(eventId: string) {
    return `event:${eventId}:voters`;
  }

  private isSerialized(value: string): boolean {
    try {
      const parsed = JSON.parse(value);
      return Boolean(parsed?.window?.start && parsed?.window?.end);
    } catch {
      return false;
    }
  }
}
