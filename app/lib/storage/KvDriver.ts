import { kv } from '@vercel/kv';
import { formatDayKey, parseDayKey } from '../dates';
import { slugify } from '../slug';
import type { EventItem, StorageDriver, VoteResult, VoterInfo } from './StorageDriver';
import { VOTING } from '../constants';

export class KvDriver implements StorageDriver {
  async getEvents(): Promise<EventItem[]> {
    const entries = (await kv.hgetall<Record<string, string>>('events:list')) || {};
    const events: EventItem[] = Object.entries(entries).map(([id, value]) => {
      const sanitize = (eventLike: any): EventItem => {
        // Si name es un JSON stringificado, intentar parsearlo.
        let base = eventLike;
        if (typeof base?.name === 'string' && base.name.trim().startsWith('{')) {
          try {
            const inner = JSON.parse(base.name);
            if (inner?.window?.start && inner?.window?.end) {
              base = inner;
            }
          } catch {
            // ignore parse
          }
        } else if (base?.name && typeof base.name === 'object' && base.name.window) {
          // Caso en que name es otro objeto evento anidado
          base = base.name;
        }

        const window = base?.window ?? { start: '2026-01-07', end: '2026-03-01' };
        const closeAt = base?.closeAt ?? VOTING.closeAt;
        const cleanName =
          typeof base?.name === 'string'
            ? base.name
            : typeof base?.name?.name === 'string'
              ? base.name.name
              : String(base?.name ?? id);
        return {
          id,
          name: cleanName,
          window,
          closeAt
        };
      };

      try {
        const parsed = JSON.parse(value) as EventItem;
        if (parsed?.window?.start && parsed?.window?.end) {
          return sanitize(parsed);
        }
      } catch {
        // ignore parse error
      }
      const safeName = typeof value === 'string' ? value : String(id);
      return {
        id,
        name: safeName,
        window: { start: '2026-01-07', end: '2026-03-01' },
        closeAt: VOTING.closeAt
      };
    });
    const normalized = events.map((event) => ({
      ...event,
      name: typeof event.name === 'string' ? event.name : String(event.id),
      closeAt: event.closeAt ?? VOTING.closeAt
    }));
    return normalized.sort((a, b) => a.name.localeCompare(b.name, 'es'));
  }

  async createEvent(
    name: string,
    window: EventItem['window'] = { start: '2026-01-07', end: '2026-03-01' },
    closeAt: string | undefined = VOTING.closeAt
  ): Promise<EventItem> {
    const cleanName = name.trim();
    const id = slugify(cleanName);
    const existing = await kv.hget<string>('events:list', id);
    let parsedExisting: EventItem | null = null;
    if (existing && this.isSerialized(existing)) {
      try {
        parsedExisting = JSON.parse(existing) as EventItem;
        // Reparar si name contiene otro JSON anidado
        if (typeof parsedExisting?.name === 'string' && parsedExisting.name.trim().startsWith('{')) {
          const inner = JSON.parse(parsedExisting.name);
          if (inner?.window?.start && inner?.window?.end) {
            parsedExisting = { ...inner, id };
          }
        } else if (parsedExisting?.name && typeof (parsedExisting as any).name === 'object') {
          const inner = (parsedExisting as any).name;
          if (inner?.window?.start && inner?.window?.end) {
            parsedExisting = { ...inner, id };
          }
        }
      } catch {
        parsedExisting = null;
      }
    }

    // Si ya existe, devolvemos la versión saneada pero no reescribimos para evitar corromper datos.
    if (parsedExisting) {
      return {
        id,
        name: typeof parsedExisting.name === 'string' ? parsedExisting.name : cleanName,
        window: parsedExisting.window ?? window,
        closeAt: parsedExisting.closeAt ?? closeAt
      };
    }
    if (existing) {
      return { id, name: existing, window, closeAt: closeAt ?? VOTING.closeAt };
    }

    const event: EventItem = { id, name: cleanName, window, closeAt: closeAt ?? VOTING.closeAt };
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
    const voterKeys = await this.getVoterKeys(eventId);
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

  async setVoterWeight(eventId: string, voterId: string, weight: number): Promise<void> {
    const voterKey = this.buildVoterKey(voterId);
    await kv.set(this.voterWeightKey(eventId, voterKey), weight);
  }

  async getVoterWeight(eventId: string, voterId: string): Promise<number> {
    const voterKey = this.buildVoterKey(voterId);
    const value = await kv.get<number>(this.voterWeightKey(eventId, voterKey));
    return typeof value === 'number' && value > 0 ? value : 1;
  }

  async getVotersSelections(eventId: string) {
    const voterKeys = await this.getVoterKeys(eventId);
    const voters: { name: string; days: string[]; weight?: number }[] = [];
    for (const voterKey of voterKeys) {
      const selection = (await kv.get<string[]>(this.voterStoreKey(eventId, voterKey))) || [];
      if (selection.length === 0) {
        await kv.srem(this.votersSetKey(eventId), voterKey); // limpia set obsoleto
        continue;
      }
      const name = (await kv.get<string>(this.voterNameKey(eventId, voterKey))) || '';
      if (!name.trim()) {
        await kv.srem(this.votersSetKey(eventId), voterKey);
        continue; // evita registros huérfanos o borrados
      }
      const weight = await this.getVoterWeight(eventId, voterKey);
      voters.push({ name, days: selection, weight });
    }
    return voters;
  }

  async listVoters(): Promise<VoterInfo[]> {
    const events = await this.getEvents();
    const voterMap = new Map<string, string>();

    for (const event of events) {
      const voterKeys = await this.getVoterKeys(event.id);
      for (const voterKey of voterKeys) {
        if (voterMap.has(voterKey)) continue;
        const selection = (await kv.get<string[]>(this.voterStoreKey(event.id, voterKey))) || [];
        if (selection.length === 0) continue;
        const name = (await kv.get<string>(this.voterNameKey(event.id, voterKey))) || 'Anónimo';
        voterMap.set(voterKey, name);
      }
    }

    return Array.from(voterMap.entries())
      .map(([id, name]) => ({ id, name }))
      .sort((a, b) => a.name.localeCompare(b.name, 'es', { sensitivity: 'base' }));
  }

  private buildVoterKey(raw: string): string {
    return slugify(raw.trim().toLowerCase()) || 'anon';
  }

  private async aggregateCounts(eventId: string) {
    const voterKeys = await this.getVoterKeys(eventId);
    const aggregate: Record<string, number> = {};

    for (const voterKey of voterKeys) {
      const selection = (await kv.get<string[]>(this.voterStoreKey(eventId, voterKey))) || [];
      const weight = await this.getVoterWeight(eventId, voterKey);
      selection.forEach((day) => {
        aggregate[day] = (aggregate[day] ?? 0) + weight;
      });
    }
    return aggregate;
  }

  private async getVoterKeys(eventId: string): Promise<string[]> {
    const fromSet = (await kv.smembers(this.votersSetKey(eventId))) || [];
    // Fallback: buscar claves directas por si el set no está completo (datos antiguos).
    // TODO: migrar las claves legacy al set de votantes y eliminar este fallback cuando los datos estén saneados.
    let fromKeys: string[] = [];
    try {
      const keys = await kv.keys(`event:${eventId}:voter:*`);
      fromKeys = keys
        .map((key) => key.split(':').pop() || '')
        .filter((value) => value.trim().length > 0);
    } catch {
      // ignore if keys is not supported
    }
    return Array.from(new Set([...fromSet, ...fromKeys]));
  }

  private voterStoreKey(eventId: string, voterKey: string) {
    return `event:${eventId}:voter:${voterKey}`;
  }

  private voterNameKey(eventId: string, voterKey: string) {
    return `event:${eventId}:voter:${voterKey}:name`;
  }

  private voterWeightKey(eventId: string, voterKey: string) {
    return `event:${eventId}:voter:${voterKey}:weight`;
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
