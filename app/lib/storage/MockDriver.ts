import { addDays } from 'date-fns';
import { formatDayKey, minDate, maxDate } from '../dates';
import { slugify } from '../slug';
import type { EventItem, StorageDriver, VoteResult } from './StorageDriver';

type Counts = Map<string, number>;

const defaultEvent: EventItem = {
  id: 'babyshower-mullor-gallego-v2',
  name: 'Babyshower Mullor-Gallego V2',
  window: {
    start: '2026-01-07',
    end: '2026-03-01'
  }
};

export class MockDriver implements StorageDriver {
  private events: Map<string, string>;
  private votes: Map<string, Counts>;
  private voterSelections: Map<string, Map<string, string[]>>;
  private windows: Map<string, { start: string; end: string }>;

  constructor() {
    const initialEvents: EventItem[] = [
      defaultEvent,
      {
        id: slugify('evento de prueba 1'),
        name: 'evento de prueba 1',
        window: { start: '2026-01-07', end: '2026-02-01' }
      },
      {
        id: slugify('evento de prueba 2'),
        name: 'evento de prueba 2',
        window: { start: '2026-02-02', end: '2026-03-01' }
      }
    ];
    this.events = new Map(initialEvents.map((event) => [event.id, event.name]));
    this.votes = new Map();
    this.voterSelections = new Map();
    this.windows = new Map(initialEvents.map((event) => [event.id, event.window]));
    this.seedVotes();
  }

  private seedVotes() {
    const sampleDays: string[] = [];
    let cursor = minDate(defaultEvent);
    const end = maxDate(defaultEvent);
    while (sampleDays.length < 4 && cursor <= end) {
      const weekday = cursor.getDay();
      const isWeekend = weekday === 0 || weekday === 6;
      if (isWeekend) {
        sampleDays.push(formatDayKey(cursor));
      }
      cursor = addDays(cursor, 1);
    }

    const counts: Counts = new Map();
    const voters = new Map<string, string[]>();
    const sampleVoters = [
      { id: 'v-ana', days: [sampleDays[0]] },
      { id: 'v-luis', days: [sampleDays[0], sampleDays[1]] },
      { id: 'v-carlota', days: [sampleDays[2]] },
      { id: 'v-marcos', days: [sampleDays[3]] }
    ];

    sampleVoters.forEach(({ id, days }) => {
      const key = this.normalizeId(id);
      voters.set(key, days);
      days.forEach((day) => counts.set(day, (counts.get(day) ?? 0) + 1));
    });

    this.votes.set(defaultEvent.id, counts);
    this.voterSelections.set(defaultEvent.id, voters);
  }

  async getEvents(): Promise<EventItem[]> {
    return Array.from(this.events.entries())
      .map(([id, name]) => ({
        id,
        name,
        window: this.windows.get(id) ?? { start: '2026-01-07', end: '2026-03-01' }
      }))
      .sort((a, b) => a.name.localeCompare(b.name, 'es'));
  }

  async createEvent(
    name: string,
    window: EventItem['window'] = { start: '2026-01-07', end: '2026-03-01' }
  ): Promise<EventItem> {
    const cleanName = name.trim();
    const id = slugify(cleanName);
    if (!this.events.has(id)) {
      this.events.set(id, cleanName);
    }
    if (!this.windows.has(id)) {
      this.windows.set(id, window);
    }
    return { id, name: this.events.get(id) ?? cleanName, window: this.windows.get(id) ?? window };
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

  async vote(eventId: string, voterId: string, _name: string, days: string[]): Promise<void> {
    const counts = this.votes.get(eventId) ?? new Map();
    const voterKey = this.normalizeId(voterId);
    const voterMap = this.voterSelections.get(eventId) ?? new Map();
    const previous = voterMap.get(voterKey) ?? [];

    previous.forEach((day) => {
      counts.set(day, Math.max(0, (counts.get(day) ?? 0) - 1));
    });

    days.forEach((day) => {
      counts.set(day, (counts.get(day) ?? 0) + 1);
    });

    voterMap.set(voterKey, days);
    this.voterSelections.set(eventId, voterMap);
    this.votes.set(eventId, counts);
  }

  async getSelection(eventId: string, voterId: string): Promise<string[]> {
    const voterKey = this.normalizeId(voterId);
    const voterMap = this.voterSelections.get(eventId) ?? new Map();
    return voterMap.get(voterKey) ?? [];
  }

  private normalizeId(id: string): string {
    return slugify(id.trim().toLowerCase()) || 'anon';
  }
}
