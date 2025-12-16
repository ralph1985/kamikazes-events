"use client";

import { useEffect, useMemo, useState } from 'react';
import { EventSelect } from './components/EventSelect';
import { Calendar } from './components/Calendar';
import { formatDayKey, formatDisplay, maxDate, minDate, today } from './lib/dates';
import type { EventItem, VoteResult } from './lib/storage/StorageDriver';

type VoteState = 'idle' | 'loading' | 'success' | 'error';

const STORAGE_KEYS = {
  event: 'selectedEventId',
  name: 'voterName'
};

export default function Page() {
  const [events, setEvents] = useState<EventItem[]>([]);
  const [eventsLoading, setEventsLoading] = useState(true);
  const [results, setResults] = useState<VoteResult[]>([]);
  const [resultsLoading, setResultsLoading] = useState(false);
  const [selectedEvent, setSelectedEvent] = useState<string>('');
  const [selectedDate, setSelectedDate] = useState<Date>(today());
  const [voterName, setVoterName] = useState<string>('');
  const [voteState, setVoteState] = useState<VoteState>('idle');
  const [errorMessage, setErrorMessage] = useState<string>('');

  const fromDate = useMemo(() => minDate(), []);
  const toDate = useMemo(() => maxDate(), []);

  useEffect(() => {
    const storedName = typeof window !== 'undefined' ? localStorage.getItem(STORAGE_KEYS.name) : null;
    if (storedName) setVoterName(storedName);
  }, []);

  useEffect(() => {
    const fetchEvents = async () => {
      setEventsLoading(true);
      try {
        const res = await fetch('/api/events', { cache: 'no-store' });
        if (!res.ok) throw new Error('No se pudieron cargar los eventos');
        const data: EventItem[] = await res.json();
        setEvents(data);

        const storedEventId =
          typeof window !== 'undefined' ? localStorage.getItem(STORAGE_KEYS.event) : null;
        const defaultEventId =
          storedEventId && data.some((event) => event.id === storedEventId)
            ? storedEventId
            : data[0]?.id ?? '';
        setSelectedEvent(defaultEventId);
      } catch (error) {
        setErrorMessage(error instanceof Error ? error.message : 'Error al cargar eventos');
      } finally {
        setEventsLoading(false);
      }
    };

    fetchEvents();
  }, []);

  useEffect(() => {
    if (!selectedEvent) return;
    localStorage.setItem(STORAGE_KEYS.event, selectedEvent);
    const fetchResults = async () => {
      setResultsLoading(true);
      try {
        const res = await fetch(`/api/results?eventId=${encodeURIComponent(selectedEvent)}`, {
          cache: 'no-store'
        });
        if (!res.ok) throw new Error('No se pudieron cargar los resultados');
        const data: VoteResult[] = await res.json();
        setResults(data);
      } catch (error) {
        setErrorMessage(error instanceof Error ? error.message : 'Error al cargar resultados');
      } finally {
        setResultsLoading(false);
      }
    };
    fetchResults();
  }, [selectedEvent]);

  const handleVote = async () => {
    if (!selectedEvent || !voterName.trim() || !selectedDate) return;
    setVoteState('loading');
    setErrorMessage('');
    const dayKey = formatDayKey(selectedDate);

    try {
      const res = await fetch('/api/vote', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          eventId: selectedEvent,
          name: voterName.trim(),
          day: dayKey
        })
      });

      if (!res.ok) {
        const payload = await res.json().catch(() => ({}));
        throw new Error(payload.message || 'No se pudo registrar el voto');
      }

      localStorage.setItem(STORAGE_KEYS.name, voterName.trim());
      setVoteState('success');
      const refreshed = await fetch(`/api/results?eventId=${encodeURIComponent(selectedEvent)}`, {
        cache: 'no-store'
      });
      const data: VoteResult[] = await refreshed.json();
      setResults(data);
    } catch (error) {
      setVoteState('error');
      setErrorMessage(error instanceof Error ? error.message : 'Error al votar');
    } finally {
      setTimeout(() => setVoteState('idle'), 2500);
    }
  };

  const isVoteDisabled = !selectedEvent || !voterName.trim() || !selectedDate || voteState === 'loading';

  return (
    <main className="max-w-md mx-auto px-4 py-8 sm:py-12 space-y-6">
      <header className="space-y-2">
        <p className="text-emerald-400 text-sm font-semibold tracking-wide uppercase">
          kamikazes-events
        </p>
        <h1 className="text-3xl font-bold text-slate-50 leading-tight">Vota el día del evento</h1>
        <p className="text-slate-300 text-sm">
          Elige tu evento, escribe tu nombre y selecciona el día que mejor te encaja. Los resultados
          se actualizan al instante.
        </p>
      </header>

      <section className="card space-y-4">
        <EventSelect
          events={events}
          value={selectedEvent}
          onChange={setSelectedEvent}
          disabled={eventsLoading}
        />

        <div className="field">
          <label className="text-sm text-slate-300">Tu nombre</label>
          <input
            className="input"
            placeholder="Ej: Alex"
            value={voterName}
            onChange={(e) => setVoterName(e.target.value)}
            aria-label="Introduce tu nombre"
          />
        </div>

        <div className="flex flex-wrap gap-2 text-xs text-slate-400">
          <span className="tag">Ventanilla de voto: hoy a 30 días</span>
          <span className="tag">Semana empieza en lunes</span>
        </div>
      </section>

      <Calendar
        selected={selectedDate}
        onSelect={(date) => date && setSelectedDate(date)}
        fromDate={fromDate}
        toDate={toDate}
      />

      <section className="space-y-3">
        <button
          className="btn btn-primary text-lg"
          onClick={handleVote}
          disabled={isVoteDisabled}
        >
          {voteState === 'loading' ? 'Enviando voto...' : 'Votar'}
        </button>

        {voteState === 'success' && (
          <p className="text-emerald-300 text-sm">¡Voto registrado! Gracias por participar.</p>
        )}
        {voteState === 'error' && (
          <p className="text-red-300 text-sm">No se pudo registrar el voto. {errorMessage}</p>
        )}
      </section>

      <section className="card space-y-3">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-xs uppercase tracking-wide text-slate-400">Resultados</p>
            <p className="text-lg font-semibold text-slate-100">Votos por día</p>
          </div>
          {resultsLoading && <span className="tag">Cargando...</span>}
        </div>

        {results.length === 0 && !resultsLoading && (
          <p className="text-slate-400 text-sm">Aún no hay votos para este evento.</p>
        )}

        {results.length > 0 && (
          <div className="list">
            {results.map((result) => (
              <div key={result.day} className="list-item">
                <div className="flex flex-col">
                  <span className="text-slate-200 font-semibold">{formatDisplay(result.day)}</span>
                  <span className="text-slate-400 text-xs">Clave: {result.day}</span>
                </div>
                <span className="text-emerald-300 font-bold text-lg">{result.votes}</span>
              </div>
            ))}
          </div>
        )}
      </section>

      {errorMessage && voteState !== 'error' && (
        <p className="text-red-300 text-sm">Aviso: {errorMessage}</p>
      )}
    </main>
  );
}
