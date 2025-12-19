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
  getStoredWeight,
  saveEvent,
  saveName,
  saveWeight,
  setClientId as persistClientId
} from '../lib/client';
import { clearCacheByPrefix } from '../lib/cache';
import { EVENTS_CACHE_TTL_MS } from '../lib/constants';
import type { EventItem } from '../lib/storage/StorageDriver';
import { fetchJsonWithCache } from '../lib/apiClient';

export default function SettingsPage() {
  const [events, setEvents] = useState<EventItem[]>([]);
  const [eventsLoading, setEventsLoading] = useState(true);
  const [selectedEvent, setSelectedEvent] = useState<string>('');
  const [voterName, setVoterName] = useState<string>('');
  const [voterWeight, setVoterWeight] = useState<number>(1);
  const [clientId, setClientId] = useState<string>('');
  const [status, setStatus] = useState<'idle' | 'saving' | 'saved' | 'error'>('idle');
  const [resetStatus, setResetStatus] = useState<'idle' | 'working' | 'done' | 'error'>('idle');
  const [errorMessage, setErrorMessage] = useState<string>('');
  const [recoveryLoading, setRecoveryLoading] = useState(false);
  const [recoveryError, setRecoveryError] = useState<string>('');
  const [recoveryList, setRecoveryList] = useState<{ id: string; name: string }[]>([]);
  const [selectedRecovery, setSelectedRecovery] = useState<string>('');
  const [recoverySuccess, setRecoverySuccess] = useState<string>('');

  useEffect(() => {
    if (typeof window === 'undefined') return;
    setClientId(getClientId());
    setVoterName(getStoredName());
    setVoterWeight(getStoredWeight());
  }, []);

  useEffect(() => {
    const fetchEvents = async () => {
      setEventsLoading(true);
      try {
        const cacheKey = '/api/events';
        const data = await fetchJsonWithCache<EventItem[]>(
          cacheKey,
          {},
          { cacheKey, ttlMs: EVENTS_CACHE_TTL_MS }
        );
        setEvents(data);
        const stored = typeof window !== 'undefined' ? getStoredEvent() : null;
        const defaultEvent = stored && data.some((e) => e.id === stored) ? stored : data[0]?.id ?? '';
        setSelectedEvent(defaultEvent);
        if (defaultEvent && clientId) {
          try {
            const weightKey = `/api/voter-weight?eventId=${encodeURIComponent(defaultEvent)}&voterId=${encodeURIComponent(clientId)}`;
            const payload = await fetchJsonWithCache<{ weight?: number }>(weightKey);
            if (typeof payload.weight === 'number' && payload.weight > 0) {
              setVoterWeight(payload.weight);
              saveWeight(payload.weight);
            }
          } catch {
            // ignore load errors, keep local weight
          }
        }
      } catch (error) {
        setErrorMessage(error instanceof Error ? error.message : 'Error al cargar eventos');
      } finally {
        setEventsLoading(false);
      }
    };

    fetchEvents();
  }, [clientId]);

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
    if (!Number.isFinite(voterWeight) || voterWeight <= 0) {
      setErrorMessage('El peso debe ser mayor que 0');
      return;
    }
    setStatus('saving');
    const nameToSave = voterName.trim();
    try {
      saveName(nameToSave);
      saveEvent(selectedEvent);
      saveWeight(voterWeight);

      // sincronizar nombre en votos existentes
      if (events.length > 0 && clientId) {
        await fetch('/api/voter-name', {
          method: 'POST',
          cache: 'no-store',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            voterId: clientId,
            name: nameToSave,
            eventIds: events.map((event) => event.id)
          })
        }).catch((error) => {
          console.error('sync voter name failed', error);
        });

        await fetch('/api/voter-weight', {
          method: 'POST',
          cache: 'no-store',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            voterId: clientId,
            weight: voterWeight,
            eventIds: events.map((event) => event.id)
          })
        }).catch((error) => {
          console.error('sync voter weight failed', error);
        });
      }

      setStatus('saved');
      setTimeout(() => setStatus('idle'), 2000);
      clearCacheByPrefix('/api/results');
      clearCacheByPrefix('/api/voters');
      clearCacheByPrefix('/api/vote');
      clearCacheByPrefix('/api/voter-weight');
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

          <div className="field">
            <label className="text-sm text-slate-300">Peso del voto (ej. 1 = un voto)</label>
            <input
              type="number"
              min={0.1}
              step={0.1}
              className="input"
              value={voterWeight}
              onChange={(e) => setVoterWeight(Number(e.target.value))}
              aria-label="Configura el peso de tu voto"
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
                      cache: 'no-store',
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
                clearCacheByPrefix('/api/results');
                clearCacheByPrefix('/api/voters');
                clearCacheByPrefix('/api/vote');
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

          <div className="pt-4 space-y-2">
            <p className="text-slate-200 font-semibold text-sm">Recuperar usuario</p>
            <p className="text-slate-400 text-xs">
              Si borraste tus datos o cambiaste de dispositivo, puedes seleccionar un usuario ya registrado
              para recuperar tu ID y votos. Se sobrescribirá tu identificador local.
            </p>
            <div className="flex items-center gap-2">
              <button
                type="button"
                className="btn bg-sky-500 hover:bg-sky-400 text-slate-900"
                disabled={recoveryLoading}
                onClick={async () => {
                  setRecoveryLoading(true);
                  setRecoveryError('');
                  setRecoverySuccess('');
                  try {
                    const cacheKey = '/api/voters/recovery';
                    const payload = await fetchJsonWithCache<{ voters: { id: string; name: string }[] }>(
                      cacheKey
                    );
                    setRecoveryList(payload.voters);
                    setSelectedRecovery(payload.voters[0]?.id ?? '');
                  } catch (error) {
                    setRecoveryError(error instanceof Error ? error.message : 'Error al recuperar usuarios');
                  } finally {
                    setRecoveryLoading(false);
                  }
                }}
              >
                {recoveryLoading ? 'Cargando...' : 'Mostrar usuarios'}
              </button>
              {recoveryError && <span className="text-red-300 text-xs">{recoveryError}</span>}
            </div>

            {recoveryList.length > 0 && (
              <div className="space-y-2">
                <label className="text-sm text-slate-300">Selecciona tu usuario</label>
                <select
                  className="input"
                  value={selectedRecovery}
                  onChange={(e) => setSelectedRecovery(e.target.value)}
                >
                  {recoveryList.map((user) => (
                    <option key={user.id} value={user.id}>
                      {user.name} — {user.id}
                    </option>
                  ))}
                </select>
                <button
                  type="button"
                  className="btn bg-emerald-500 hover:bg-emerald-400 text-slate-900"
                  disabled={!selectedRecovery}
                  onClick={() => {
                    const target = recoveryList.find((user) => user.id === selectedRecovery);
                    if (!target) return;
                    persistClientId(target.id);
                    setClientId(target.id);
                    setVoterName(target.name);
                    saveName(target.name);
                    clearCacheByPrefix('/api/results');
                    clearCacheByPrefix('/api/voters');
                    clearCacheByPrefix('/api/vote');
                    clearCacheByPrefix('/api/voter-weight');
                    setRecoverySuccess('Usuario recuperado. Tus votos se cargarán al volver a Votar.');
                  }}
                >
                  Usar este usuario
                </button>
                {recoverySuccess && <p className="text-emerald-300 text-xs">{recoverySuccess}</p>}
              </div>
            )}
          </div>
        </div>
      </section>
    </main>
  );
}
