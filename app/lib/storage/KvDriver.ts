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
      name: typeof event.name === 'string' ? event.name : String(event.name?.toString?.() ?? event.id)
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
    const counts = (await kv.hgetall<Record<string, number>>(`event:${eventId}:counts`)) || {};
    return Object.entries(counts)
      .map(([day, votes]) => ({
        day: formatDayKey(parseDayKey(day)),
        votes: Number(votes)
      }))
      .sort((a, b) => {
        if (b.votes !== a.votes) return b.votes - a.votes;
        return a.day.localeCompare(b.day);
      });
  }

  async vote(eventId: string, voterId: string, _name: string, days: string[]): Promise<void> {
    const voterKey = this.buildVoterKey(voterId);
    const voterStoreKey = this.voterStoreKey(eventId, voterKey);
    const previous: string[] = (await kv.get<string[]>(voterStoreKey)) || [];
    const countsKey = `event:${eventId}:counts`;

    for (const day of previous) {
      await kv.hincrby(countsKey, day, -1);
    }

    for (const day of days) {
      await kv.hincrby(countsKey, day, 1);
    }

    await kv.set(voterStoreKey, days);
  }

  async getSelection(eventId: string, voterId: string): Promise<string[]> {
    const voterKey = this.buildVoterKey(voterId);
    const voterStoreKey = this.voterStoreKey(eventId, voterKey);
    return (await kv.get<string[]>(voterStoreKey)) || [];
  }

  private buildVoterKey(raw: string): string {
    return slugify(raw.trim().toLowerCase()) || 'anon';
  }

  private voterStoreKey(eventId: string, voterKey: string): string {
    return `event:${eventId}:voter:${voterKey}`;
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
