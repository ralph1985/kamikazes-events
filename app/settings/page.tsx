"use client";

import { useRouter } from 'next/navigation';
import { FormEvent, useEffect, useState } from 'react';
import { EventSelect } from '../components/EventSelect';
import { DescriptionCard } from '../components/DescriptionCard';
import { HeaderBar } from '../components/HeaderBar';
import {
  clearClientData,
  getClientId,
  getStoredEvent,
  getStoredName,
  saveEvent,
  saveName
} from '../lib/client';
import type { EventItem } from '../lib/storage/StorageDriver';

export default function SettingsPage() {
  const [events, setEvents] = useState<EventItem[]>([]);
  const [eventsLoading, setEventsLoading] = useState(true);
  const [selectedEvent, setSelectedEvent] = useState<string>('');
  const [voterName, setVoterName] = useState<string>('');
  const [clientId, setClientId] = useState<string>('');
  const [status, setStatus] = useState<'idle' | 'saving' | 'saved' | 'error'>('idle');
  const [resetStatus, setResetStatus] = useState<'idle' | 'working' | 'done' | 'error'>('idle');
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

  const router = useRouter();

  const handleSave = async (event: FormEvent) => {
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
    const nameToSave = voterName.trim();
    try {
      saveName(nameToSave);
      saveEvent(selectedEvent);

      // sincronizar nombre en votos existentes
      if (events.length > 0 && clientId) {
        await fetch('/api/voter-name', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            voterId: clientId,
            name: nameToSave,
            eventIds: events.map((event) => event.id)
          })
        }).catch((error) => {
          console.error('sync voter name failed', error);
        });
      }

      setStatus('saved');
      setTimeout(() => setStatus('idle'), 2000);
      router.push('/');
    } catch (error) {
      setStatus('error');
      setErrorMessage(error instanceof Error ? error.message : 'No se pudo guardar');
    }
  };

  return (
    <main className="max-w-md mx-auto px-4 py-8 sm:py-12 space-y-6">
      <HeaderBar
        label="Preferencias"
        links={[{ href: '/', label: 'Votar' }, { href: '/results', label: 'Resultados' }]}
      />
      <DescriptionCard
        subtitle="Configura tu perfil"
        description="Define tu nombre y el evento activo. El ID del cliente se guarda al acceder por primera vez y se mantiene para reemplazar votos."
      />

      <section className="rounded-2xl border border-slate-800 bg-slate-900/80 p-5 space-y-4 shadow-lg">
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

        <div className="border-t border-slate-800 pt-4 space-y-3">
          <p className="text-slate-200 font-semibold text-sm">Borrar datos locales y votos</p>
          <p className="text-slate-400 text-xs">
            Esta acción elimina tus votos de todos los eventos y borra el localStorage. Se pedirá
            confirmación.
          </p>
          <button
            type="button"
            className="btn bg-red-500 hover:bg-red-400 text-slate-900"
            disabled={resetStatus === 'working' || eventsLoading || !clientId}
            onClick={async () => {
              setResetStatus('idle');
              setErrorMessage('');
              const confirmReset = window.confirm(
                'Se eliminarán todos tus votos en todos los eventos y se borrarán tus datos locales. ¿Continuar?'
              );
              if (!confirmReset) return;
              try {
                setResetStatus('working');
                // limpiar votos en todos los eventos
                const resEvents = await fetch('/api/events', { cache: 'no-store' });
                if (!resEvents.ok) throw new Error('No se pudieron obtener los eventos');
                const data: EventItem[] = await resEvents.json();
                await Promise.all(
                  data.map((event) =>
                    fetch('/api/vote', {
                      method: 'POST',
                      headers: { 'Content-Type': 'application/json' },
                      body: JSON.stringify({
                        eventId: event.id,
                        voterId: clientId,
                        name: voterName || 'Sin nombre',
                        days: []
                      })
                    })
                  )
                );
                clearClientData();
                setVoterName('');
                setSelectedEvent(data[0]?.id ?? '');
                setResetStatus('done');
              } catch (error) {
                setResetStatus('error');
                setErrorMessage(
                  error instanceof Error ? error.message : 'No se pudo borrar la información'
                );
              } finally {
                setTimeout(() => setResetStatus('idle'), 2500);
              }
            }}
          >
            {resetStatus === 'working' ? 'Borrando...' : 'Borrar votos y datos'}
          </button>
          {resetStatus === 'done' && (
            <p className="text-emerald-300 text-xs">Datos borrados correctamente.</p>
          )}
        </div>
      </section>
    </main>
  );
}
