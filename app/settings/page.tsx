"use client";

import Link from 'next/link';
import { FormEvent, useEffect, useState } from 'react';
import { EventSelect } from '../components/EventSelect';
import { getClientId, getStoredEvent, getStoredName, saveEvent, saveName } from '../lib/client';
import type { EventItem } from '../lib/storage/StorageDriver';

export default function SettingsPage() {
  const [events, setEvents] = useState<EventItem[]>([]);
  const [eventsLoading, setEventsLoading] = useState(true);
  const [selectedEvent, setSelectedEvent] = useState<string>('');
  const [voterName, setVoterName] = useState<string>('');
  const [clientId, setClientId] = useState<string>('');
  const [status, setStatus] = useState<'idle' | 'saving' | 'saved' | 'error'>('idle');
  const [errorMessage, setErrorMessage] = useState<string>('');

  useEffect(() => {
    if (typeof window === 'undefined') return;
    setClientId(getClientId());
    setVoterName(getStoredName());
  }, []);

  useEffect(() => {
    const fetchEvents = async () => {
      setEventsLoading(true);
      try {
        const res = await fetch('/api/events', { cache: 'no-store' });
        if (!res.ok) throw new Error('No se pudieron cargar los eventos');
        const data: EventItem[] = await res.json();
        setEvents(data);
        const stored = typeof window !== 'undefined' ? getStoredEvent() : null;
        const defaultEvent = stored && data.some((e) => e.id === stored) ? stored : data[0]?.id ?? '';
        setSelectedEvent(defaultEvent);
      } catch (error) {
        setErrorMessage(error instanceof Error ? error.message : 'Error al cargar eventos');
      } finally {
        setEventsLoading(false);
      }
    };

    fetchEvents();
  }, []);

  const handleSave = (event: FormEvent) => {
    event.preventDefault();
    if (!voterName.trim()) {
      setErrorMessage('El nombre es obligatorio');
      return;
    }
    if (!selectedEvent) {
      setErrorMessage('Selecciona un evento');
      return;
    }
    setStatus('saving');
    try {
      saveName(voterName.trim());
      saveEvent(selectedEvent);
      setStatus('saved');
      setTimeout(() => setStatus('idle'), 2000);
    } catch (error) {
      setStatus('error');
      setErrorMessage(error instanceof Error ? error.message : 'No se pudo guardar');
    }
  };

  return (
    <main className="max-w-md mx-auto px-4 py-8 sm:py-12 space-y-6">
      <header className="space-y-3">
        <div className="flex items-center gap-3">
          <p className="text-emerald-400 text-sm font-semibold tracking-wide uppercase">
            kamikazes-events · Preferencias
          </p>
          <nav className="flex gap-2 text-sm">
            <Link className="tag" href="/">
              Votar
            </Link>
            <Link className="tag" href="/results">
              Resultados
            </Link>
          </nav>
        </div>
        <h1 className="text-3xl font-bold text-slate-50 leading-tight">Configura tu perfil</h1>
        <p className="text-slate-300 text-sm">
          Define tu nombre y el evento activo. El ID del cliente se guarda al acceder por primera
          vez y se mantiene para reemplazar votos.
        </p>
        <div className="flex flex-wrap gap-2 text-xs text-slate-300"></div>
      </header>

      <section className="card space-y-4">
        <form className="space-y-4" onSubmit={handleSave}>
          <div className="field">
            <label className="text-sm text-slate-300">Tu nombre (obligatorio)</label>
            <input
              className="input"
              placeholder="Ej: Alex"
              value={voterName}
              onChange={(e) => setVoterName(e.target.value)}
              aria-label="Introduce tu nombre"
              required
            />
          </div>

          <EventSelect
            events={events}
            value={selectedEvent}
            onChange={setSelectedEvent}
            disabled={eventsLoading}
          />

          <button
            type="submit"
            className="btn btn-primary"
            disabled={eventsLoading || status === 'saving'}
          >
            {status === 'saving' ? 'Guardando...' : 'Guardar preferencias'}
          </button>
        </form>

        {status === 'saved' && <p className="text-emerald-300 text-sm">Preferencias guardadas.</p>}
        {errorMessage && <p className="text-red-300 text-sm">{errorMessage}</p>}
      </section>
    </main>
  );
}
