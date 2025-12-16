"use client";

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { Calendar } from './components/Calendar';
import {
  formatDayKey,
  formatDisplay,
  isWeekendDate,
  isWithinVoteWindow,
  nextWeekend,
  parseDayKey
} from './lib/dates';
import type { EventItem, VoteResult } from './lib/storage/StorageDriver';
import { getClientId, getStoredEvent, getStoredName, saveEvent, saveName } from './lib/client';

type VoteState = 'idle' | 'loading' | 'success' | 'error';

export default function Page() {
  const router = useRouter();
  const [events, setEvents] = useState<EventItem[]>([]);
  const [eventsLoading, setEventsLoading] = useState(true);
  const [results, setResults] = useState<VoteResult[]>([]);
  const [resultsLoading, setResultsLoading] = useState(false);
  const [selectedEvent, setSelectedEvent] = useState<string>('');
  const [selectedDates, setSelectedDates] = useState<Date[]>([]);
  const [voterName, setVoterName] = useState<string>('');
  const [clientId, setClientId] = useState<string>('');
  const [voteState, setVoteState] = useState<VoteState>('idle');
  const [errorMessage, setErrorMessage] = useState<string>('');

  const selectedEventData = useMemo(
    () => events.find((event) => event.id === selectedEvent),
    [events, selectedEvent]
  );
  const windowStartDate = useMemo(
    () => parseDayKey(selectedEventData?.window.start ?? '2026-01-07'),
    [selectedEventData?.window.start]
  );
  const windowEndDate = useMemo(
    () => parseDayKey(selectedEventData?.window.end ?? '2026-03-01'),
    [selectedEventData?.window.end]
  );
  const defaultSelection = useMemo(
    () =>
      nextWeekend(
        selectedEventData?.window.start ?? '2026-01-07',
        selectedEventData?.window.end ?? '2026-03-01'
      ),
    [selectedEventData?.window.end, selectedEventData?.window.start]
  );

  const refreshResults = useCallback(async (eventId: string) => {
    const res = await fetch(`/api/results?eventId=${encodeURIComponent(eventId)}`, {
      cache: 'no-store'
    });
    if (!res.ok) throw new Error('No se pudieron cargar los resultados');
    const data: VoteResult[] = await res.json();
    setResults(data);
  }, []);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    setClientId(getClientId());
    const storedName = getStoredName();
    if (storedName) setVoterName(storedName);
    if (!storedName) router.push('/settings');
  }, [router]);

  useEffect(() => {
    const fetchEvents = async () => {
      setEventsLoading(true);
      try {
        const res = await fetch('/api/events', { cache: 'no-store' });
        if (!res.ok) throw new Error('No se pudieron cargar los eventos');
        const data: EventItem[] = await res.json();
        setEvents(data);

        const storedEventId = typeof window !== 'undefined' ? getStoredEvent() : null;
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
    saveEvent(selectedEvent);
    if (selectedEventData) {
      setSelectedDates((prev) => {
        const filtered = prev.filter((date) =>
          isWithinVoteWindow(formatDayKey(date), selectedEventData.window.start, selectedEventData.window.end)
        );
        if (filtered.length > 0) return filtered;
        return [defaultSelection];
      });
    }
    const fetchResults = async () => {
      setResultsLoading(true);
      try {
        await refreshResults(selectedEvent);
      } catch (error) {
        setErrorMessage(error instanceof Error ? error.message : 'Error al cargar resultados');
      } finally {
        setResultsLoading(false);
      }
    };
    const fetchSelection = async () => {
      if (!clientId) return;
      try {
        const res = await fetch(
          `/api/vote?eventId=${encodeURIComponent(selectedEvent)}&voterId=${encodeURIComponent(clientId)}`,
          { cache: 'no-store' }
        );
        if (res.ok) {
          const payload: { days?: string[] } = await res.json();
          const days = payload.days ?? [];
          if (days.length > 0) {
            setSelectedDates(days.map((day) => parseDayKey(day)));
            return;
          }
        }
      } catch {
        // ignore
      }
      setSelectedDates([defaultSelection]);
    };
    fetchResults();
    fetchSelection();
  }, [clientId, defaultSelection, refreshResults, selectedEvent, selectedEventData]);

  const handleVote = async () => {
    if (!selectedEvent || !voterName.trim() || selectedDates.length === 0 || !clientId) return;
    setVoteState('loading');
    setErrorMessage('');
    const dayKeys = selectedDates.map((date) => formatDayKey(date));

    try {
      const res = await fetch('/api/vote', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          eventId: selectedEvent,
          voterId: clientId,
          name: voterName.trim(),
          days: dayKeys
        })
      });

      if (!res.ok) {
        const payload = await res.json().catch(() => ({}));
        throw new Error(payload.message || 'No se pudo registrar el voto');
      }

      saveName(voterName.trim());
      setVoteState('success');
      await refreshResults(selectedEvent);
    } catch (error) {
      setVoteState('error');
      setErrorMessage(error instanceof Error ? error.message : 'Error al votar');
    } finally {
      setTimeout(() => setVoteState('idle'), 2500);
    }
  };

  const isVoteDisabled =
    !selectedEvent ||
    !voterName.trim() ||
    !clientId ||
    selectedDates.length === 0 ||
    !selectedEventData ||
    !selectedDates.every((date) =>
      isWeekendDate(date) &&
      isWithinVoteWindow(formatDayKey(date), selectedEventData.window.start, selectedEventData.window.end)
    ) ||
    voteState === 'loading';

  return (
    <main className="max-w-md mx-auto px-4 py-8 sm:py-12 space-y-6">
      <header className="space-y-3">
        <div className="flex items-center gap-3">
          <p className="text-emerald-400 text-sm font-semibold tracking-wide uppercase">
            kamikazes-events · Votar
          </p>
          <nav className="flex gap-2 text-sm">
            <Link className="tag" href="/settings">
              Preferencias
            </Link>
            <Link className="tag" href="/results">
              Resultados
            </Link>
          </nav>
        </div>
        <h1 className="text-3xl font-bold text-slate-50 leading-tight">Vota el día del evento</h1>
        <p className="text-slate-300 text-sm">
          Elige tu evento, escribe tu nombre y marca los días que mejor te encajan. Los resultados se
          actualizan al instante.
        </p>
        <div className="flex flex-wrap gap-2 text-xs text-slate-300">
          <span className="tag">Evento: {events.find((e) => e.id === selectedEvent)?.name || '—'}</span>
          <span className="tag">Nombre: {voterName || 'Pendiente'}</span>
          <span className="tag">ID: {clientId ? clientId.slice(0, 6) : '—'}</span>
        </div>
      </header>

      <section className="card space-y-4">
        <div className="flex flex-wrap gap-2 text-xs text-slate-400">
          <span className="tag">
            Ventanilla:{' '}
            {selectedEventData
              ? `${selectedEventData.window.start} - ${selectedEventData.window.end}`
              : '—'}
          </span>
          <span className="tag">Solo fines de semana</span>
          <span className="tag">Configura evento y nombre en Preferencias</span>
        </div>

        {!voterName && (
          <p className="text-red-300 text-sm">
            El nombre es obligatorio para votar. Ve a <Link href="/settings">Preferencias</Link> para
            configurarlo.
          </p>
        )}
      </section>

      <Calendar
        selected={selectedDates}
        onSelect={(dates) => setSelectedDates(dates)}
        fromDate={windowStartDate}
        toDate={windowEndDate}
        windowLabel={
          selectedEventData
            ? `${selectedEventData.window.start} - ${selectedEventData.window.end}`
            : 'Rango activo'
        }
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
          <p className="text-emerald-300 text-sm">
            ¡Voto registrado! Si cambias de opinión, solo actualiza tu selección y reemplazaremos tu
            voto anterior.
          </p>
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
