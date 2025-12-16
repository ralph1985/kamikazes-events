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
  private voterNames: Map<string, string>;
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
    this.voterNames = new Map();
    this.windows = new Map(initialEvents.map((event) => [event.id, event.window]));
    this.seedVotes();
  }

  private seedVotes() {
    // start with empty votes and selections; no mock ballots preloaded
    this.votes.set(defaultEvent.id, new Map());
    this.voterSelections.set(defaultEvent.id, new Map());
  }

  async getEvents(): Promise<EventItem[]> {
    return Array.from(this.events.entries())
      .map(([id, name]) => ({
        id,
        name: typeof name === 'string' ? name : String(name),
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
    this.recomputeCounts(eventId);
    const counts = this.votes.get(eventId) ?? new Map();
    return Array.from(counts.entries())
      .map(([day, votes]) => ({ day, votes }))
      .sort((a, b) => {
        if (b.votes !== a.votes) return b.votes - a.votes;
        return a.day.localeCompare(b.day);
      });
  }

  async vote(eventId: string, voterId: string, _name: string, days: string[]): Promise<void> {
    const voterKey = this.normalizeId(voterId);
    const voterMap = this.voterSelections.get(eventId) ?? new Map();

    voterMap.set(voterKey, days);
    this.voterNames.set(voterKey, _name);
    this.voterSelections.set(eventId, voterMap);
    this.recomputeCounts(eventId);
  }

  async getSelection(eventId: string, voterId: string): Promise<string[]> {
    const voterKey = this.normalizeId(voterId);
    const voterMap = this.voterSelections.get(eventId) ?? new Map();
    return voterMap.get(voterKey) ?? [];
  }

  async setVoterName(eventId: string, voterId: string, name: string): Promise<void> {
    const voterKey = this.normalizeId(voterId);
    this.voterNames.set(voterKey, name);
  }

  private normalizeId(id: string): string {
    return slugify(id.trim().toLowerCase()) || 'anon';
  }

  private recomputeCounts(eventId: string) {
    const voterMap = this.voterSelections.get(eventId) ?? new Map();
    const counts: Counts = new Map();
    voterMap.forEach((days) => {
      days.forEach((day: string) => counts.set(day, (counts.get(day) ?? 0) + 1));
    });
    this.votes.set(eventId, counts);
  }

  async getVotersByDay(eventId: string, day: string): Promise<string[]> {
    const voterMap = this.voterSelections.get(eventId) ?? new Map();
    const matches: string[] = [];
    voterMap.forEach((days, voterKey) => {
      if (days.includes(day)) {
        matches.push(this.voterNames.get(voterKey) ?? 'Anónimo');
      }
    });
    return matches;
  }
}
