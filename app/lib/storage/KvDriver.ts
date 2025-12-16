import { kv } from '@vercel/kv';
import { formatDayKey, parseDayKey } from '../dates';
import { slugify } from '../slug';
import type { EventItem, StorageDriver, VoteResult } from './StorageDriver';

export class KvDriver implements StorageDriver {
  async getEvents(): Promise<EventItem[]> {
    const entries = (await kv.hgetall<Record<string, string>>('events:list')) || {};
    const events: EventItem[] = Object.entries(entries).map(([id, name]) => ({ id, name }));
    return events.sort((a, b) => a.name.localeCompare(b.name, 'es'));
  }

  async createEvent(name: string): Promise<EventItem> {
    const cleanName = name.trim();
    const id = slugify(cleanName);
    const existing = await kv.hget<string>('events:list', id);
    if (existing) {
      return { id, name: existing };
    }
    await kv.hset('events:list', { [id]: cleanName });
    return { id, name: cleanName };
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

  async vote(eventId: string, _name: string, day: string): Promise<void> {
    await kv.hincrby(`event:${eventId}:counts`, day, 1);
  }
}
