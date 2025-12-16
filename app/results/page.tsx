"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useState } from "react";
import { EventSelect } from "../components/EventSelect";
import { formatDisplay } from "../lib/dates";
import {
  getClientId,
  getStoredEvent,
  getStoredName,
  saveEvent,
} from "../lib/client";
import type { EventItem, VoteResult } from "../lib/storage/StorageDriver";

export default function ResultsPage() {
  const router = useRouter();
  const [events, setEvents] = useState<EventItem[]>([]);
  const [eventsLoading, setEventsLoading] = useState(true);
  const [selectedEvent, setSelectedEvent] = useState<string>("");
  const [results, setResults] = useState<VoteResult[]>([]);
  const [resultsLoading, setResultsLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string>("");
  const [clientId, setClientId] = useState<string>("");
  const [voterName, setVoterName] = useState<string>("");
  const selectedEventData = events.find((e) => e.id === selectedEvent);
  const [modalDay, setModalDay] = useState<string | null>(null);
  const [modalVoters, setModalVoters] = useState<string[]>([]);
  const [modalLoading, setModalLoading] = useState(false);
  const [modalError, setModalError] = useState<string>("");

  const refreshResults = useCallback(async (eventId: string) => {
    const res = await fetch(
      `/api/results?eventId=${encodeURIComponent(eventId)}`,
      {
        cache: "no-store",
      }
    );
    if (!res.ok) throw new Error("No se pudieron cargar los resultados");
    const data: VoteResult[] = await res.json();
    setResults(data);
  }, []);

  useEffect(() => {
    if (typeof window === "undefined") return;
    setClientId(getClientId());
    const storedName = getStoredName();
    setVoterName(storedName);
    if (!storedName) router.push("/settings");
  }, [router]);

  useEffect(() => {
    const fetchEvents = async () => {
      setEventsLoading(true);
      try {
        const res = await fetch("/api/events", { cache: "no-store" });
        if (!res.ok) throw new Error("No se pudieron cargar los eventos");
        const data: EventItem[] = await res.json();
        setEvents(data);
        const storedEventId =
          typeof window !== "undefined" ? getStoredEvent() : null;
        const defaultEventId =
          storedEventId && data.some((event) => event.id === storedEventId)
            ? storedEventId
            : data[0]?.id ?? "";
        setSelectedEvent(defaultEventId);
      } catch (error) {
        setErrorMessage(
          error instanceof Error ? error.message : "Error al cargar eventos"
        );
      } finally {
        setEventsLoading(false);
      }
    };

    fetchEvents();
  }, []);

  useEffect(() => {
    if (!selectedEvent) return;
    saveEvent(selectedEvent);
    const fetchResults = async () => {
      setResultsLoading(true);
      try {
        await refreshResults(selectedEvent);
      } catch (error) {
        setErrorMessage(
          error instanceof Error ? error.message : "Error al cargar resultados"
        );
      } finally {
        setResultsLoading(false);
      }
    };
    fetchResults();
  }, [refreshResults, selectedEvent]);

  const openModal = async (day: string) => {
    if (!selectedEvent) return;
    setModalDay(day);
    setModalLoading(true);
    setModalError("");
    try {
      const res = await fetch(
        `/api/voters?eventId=${encodeURIComponent(
          selectedEvent
        )}&day=${encodeURIComponent(day)}`,
        { cache: "no-store" }
      );
      if (!res.ok) {
        const payload = await res.json().catch(() => ({}));
        throw new Error(
          payload.message || "No se pudo cargar el detalle de votos"
        );
      }
      const payload: { voters: string[] } = await res.json();
      setModalVoters(payload.voters);
    } catch (error) {
      setModalError(
        error instanceof Error ? error.message : "Error al cargar el detalle"
      );
      setModalVoters([]);
    } finally {
      setModalLoading(false);
    }
  };

  const closeModal = () => {
    setModalDay(null);
    setModalVoters([]);
    setModalError("");
  };

  return (
    <main className="max-w-md mx-auto px-4 py-8 sm:py-12 space-y-6">
      <header className="space-y-3">
        <div className="flex items-center gap-3">
          <p className="text-emerald-400 text-sm font-semibold tracking-wide uppercase">
            kamikazes-events · Resultados
          </p>
          <nav className="flex gap-2 text-sm items-center">
            <Link
              className="tag"
              href="/"
            >
              Votar
            </Link>
            <Link
              className="tag"
              href="/settings"
              aria-label="Preferencias"
              title="Preferencias"
            >
              <span className="inline-flex h-4 w-4 items-center justify-center">
                ⚙️
              </span>
            </Link>
          </nav>
        </div>
        <h1 className="text-3xl font-bold text-slate-50 leading-tight">
          Resultados por evento
        </h1>
        <p className="text-slate-300 text-sm">
          Consulta las fechas más votadas. La ventana de voto es{" "}
          {selectedEventData
            ? `${selectedEventData.window.start} - ${selectedEventData.window.end}`
            : "—"}{" "}
          (solo fines de semana).
        </p>
        <div className="flex flex-wrap gap-2 text-xs text-slate-300">
          <span className="tag">
            Evento: {events.find((e) => e.id === selectedEvent)?.name || "—"}
          </span>
          <span className="tag">Nombre: {voterName || "Pendiente"}</span>
        </div>
      </header>

      <section className="card space-y-4">
        <EventSelect
          events={events}
          value={selectedEvent}
          onChange={setSelectedEvent}
          disabled={eventsLoading}
        />
        <div className="flex flex-wrap gap-2 text-xs text-slate-400">
          <span className="tag">
            Ventana:{" "}
            {selectedEventData
              ? `${selectedEventData.window.start} - ${selectedEventData.window.end}`
              : "—"}
          </span>
          <span className="tag">Solo fines de semana</span>
          <span className="tag">Resultados ordenados por votos y fecha</span>
        </div>
      </section>

      <section className="card space-y-3">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-xs uppercase tracking-wide text-slate-400">
              Resultados
            </p>
            <p className="text-lg font-semibold text-slate-100">
              Votos por día
            </p>
          </div>
          {resultsLoading && <span className="tag">Cargando...</span>}
        </div>

        {results.length === 0 && !resultsLoading && (
          <p className="text-slate-400 text-sm">
            Aún no hay votos para este evento.
          </p>
        )}

        {results.length > 0 && (
          <div className="list">
            {results.map((result) => (
              <button
                key={result.day}
                className="list-item text-left w-full"
                onClick={() => openModal(result.day)}
              >
                <div className="flex flex-col">
                  <span className="text-slate-200 font-semibold">
                    {formatDisplay(result.day)}
                  </span>
                  <span className="text-slate-400 text-xs">Clave: {result.day}</span>
                </div>
                <span className="text-emerald-300 font-bold text-lg">
                  {result.votes}
                </span>
              </button>
            ))}
          </div>
        )}
    </section>

    {errorMessage && (
      <p className="text-red-300 text-sm">Aviso: {errorMessage}</p>
    )}

    {modalDay && (
      <div className="fixed inset-0 bg-slate-950/80 backdrop-blur-sm z-50 flex items-center justify-center px-4">
        <div className="w-full max-w-sm bg-slate-900 border border-slate-700 rounded-2xl p-5 space-y-3">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs uppercase tracking-wide text-slate-400">Votantes</p>
              <p className="text-lg font-semibold text-slate-50">{formatDisplay(modalDay)}</p>
            </div>
            <button
              onClick={closeModal}
              className="text-slate-400 hover:text-slate-100 text-sm"
              aria-label="Cerrar"
            >
              ✕
            </button>
          </div>
          {modalLoading && <p className="text-slate-300 text-sm">Cargando...</p>}
          {modalError && <p className="text-red-300 text-sm">{modalError}</p>}
          {!modalLoading && !modalError && modalVoters.length === 0 && (
            <p className="text-slate-400 text-sm">Sin votos en este día.</p>
          )}
          {!modalLoading && !modalError && modalVoters.length > 0 && (
            <ul className="text-slate-100 text-sm space-y-2">
              {modalVoters.map((voter, idx) => (
                <li key={`${voter}-${idx}`} className="flex items-center gap-2">
                  <span className="w-2 h-2 rounded-full bg-emerald-400 inline-block" />
                  <span>{voter}</span>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>
    )}
  </main>
);
}
