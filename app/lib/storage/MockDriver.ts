import { addDays } from 'date-fns';
import { formatDayKey, today } from '../dates';
import { slugify } from '../slug';
import type { EventItem, StorageDriver, VoteResult } from './StorageDriver';

type Counts = Map<string, number>;

const defaultEvent = {
  id: 'babyshower-mullor-gallego-v2',
  name: 'Babyshower Mullor-Gallego V2'
};

export class MockDriver implements StorageDriver {
  private events: Map<string, string>;
  private votes: Map<string, Counts>;

  constructor() {
    this.events = new Map([[defaultEvent.id, defaultEvent.name]]);
    this.votes = new Map();
    this.seedVotes();
  }

  private seedVotes() {
    const base = today();
    const sampleDays = [
      { offset: 0, count: 4 },
      { offset: 2, count: 2 },
      { offset: 5, count: 3 },
      { offset: 7, count: 1 }
    ];
    const counts: Counts = new Map();
    sampleDays.forEach(({ offset, count }) => {
      const key = formatDayKey(addDays(base, offset));
      counts.set(key, count);
    });
    this.votes.set(defaultEvent.id, counts);
  }

  async getEvents(): Promise<EventItem[]> {
    return Array.from(this.events.entries())
      .map(([id, name]) => ({ id, name }))
      .sort((a, b) => a.name.localeCompare(b.name, 'es'));
  }

  async createEvent(name: string): Promise<EventItem> {
    const cleanName = name.trim();
    const id = slugify(cleanName);
    if (!this.events.has(id)) {
      this.events.set(id, cleanName);
    }
    return { id, name: this.events.get(id) ?? cleanName };
  }

  async getResults(eventId: string): Promise<VoteResult[]> {
    const counts = this.votes.get(eventId) ?? new Map();
    return Array.from(counts.entries())
      .map(([day, votes]) => ({ day, votes }))
      .sort((a, b) => {
        if (b.votes !== a.votes) return b.votes - a.votes;
        return a.day.localeCompare(b.day);
      });
  }

  async vote(eventId: string, _name: string, day: string): Promise<void> {
    const counts = this.votes.get(eventId) ?? new Map();
    counts.set(day, (counts.get(day) ?? 0) + 1);
    this.votes.set(eventId, counts);
  }
}
