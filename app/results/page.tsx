"use client";

import { useRouter } from "next/navigation";
import { useCallback, useEffect, useMemo, useState } from "react";
import { EventSelect } from "../components/EventSelect";
import { formatDisplay } from "../lib/dates";
import { allowedDaysWithinWindow } from "../lib/dates";
import {
  getClientId,
  getStoredEvent,
  getStoredName,
  saveEvent,
} from "../lib/client";
import type { EventItem, VoteResult, VoterSelection } from "../lib/storage/StorageDriver";
import { DescriptionCard } from "../components/DescriptionCard";
import { HeaderBar } from "../components/HeaderBar";
import { clearCacheByPrefix, getCachedJson, setCachedJson } from "../lib/cache";
import { EVENTS_CACHE_TTL_MS } from "../lib/constants";

export default function ResultsPage() {
  const router = useRouter();
  const [events, setEvents] = useState<EventItem[]>([]);
  const [eventsLoading, setEventsLoading] = useState(true);
  const [selectedEvent, setSelectedEvent] = useState<string>("");
  const [results, setResults] = useState<VoteResult[]>([]);
  const [peopleResults, setPeopleResults] = useState<VoterSelection[]>([]);
  const [resultsLoading, setResultsLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string>("");
  const [clientId, setClientId] = useState<string>("");
  const [voterName, setVoterName] = useState<string>("");
  const selectedEventData = events.find((e) => e.id === selectedEvent);
  const allowedDayKeysForEvent = useMemo(
    () =>
      allowedDaysWithinWindow(
        selectedEventData?.window.start ?? "",
        selectedEventData?.window.end ?? ""
      ),
    [selectedEventData?.window.end, selectedEventData?.window.start]
  );
  const [modalDay, setModalDay] = useState<string | null>(null);
  const [modalVoters, setModalVoters] = useState<{ name: string; weight?: number }[]>([]);
  const [modalLoading, setModalLoading] = useState(false);
  const [modalError, setModalError] = useState<string>("");
  const [viewMode, setViewMode] = useState<"day" | "person">("day");

  const refreshResults = useCallback(async (eventId: string) => {
    const cacheKey = `/api/results?eventId=${encodeURIComponent(eventId)}`;
    const cached = getCachedJson<VoteResult[]>(cacheKey);
    if (cached) {
      setResults(cached);
      return;
    }
    const res = await fetch(cacheKey, {
      cache: "no-store",
    });
    if (!res.ok) throw new Error("No se pudieron cargar los resultados");
    const data: VoteResult[] = await res.json();
    setCachedJson(cacheKey, data);
    setResults(data);
  }, []);

  const refreshPeople = useCallback(async (eventId: string) => {
    const cacheKey = `/api/voters/people?eventId=${encodeURIComponent(eventId)}`;
    const cached = getCachedJson<{ voters: VoterSelection[] }>(cacheKey);
    const allowedSet = new Set(allowedDayKeysForEvent);
    if (cached) {
      const filteredCached = cached.voters
        .map((voter) => ({
          ...voter,
          days: voter.days.filter((day) => allowedSet.has(day)),
        }))
        .filter((voter) => voter.days.length > 0);
      const sortedCached = [...filteredCached].sort((a, b) =>
        a.name.localeCompare(b.name, "es", { sensitivity: "base" })
      );
      setPeopleResults(sortedCached);
      return;
    }

    const res = await fetch(cacheKey, { cache: "no-store" });
    if (!res.ok) throw new Error("No se pudieron cargar los votos por persona");
    const data: { voters: VoterSelection[] } = await res.json();
    const filtered = data.voters
      .map((voter) => ({
        ...voter,
        days: voter.days.filter((day) => allowedSet.has(day)),
      }))
      .filter((voter) => voter.days.length > 0);
    const sorted = [...filtered].sort((a, b) =>
      a.name.localeCompare(b.name, "es", { sensitivity: "base" })
    );
    setCachedJson(cacheKey, { voters: data.voters });
    setPeopleResults(sorted);
  }, [allowedDayKeysForEvent]);

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
        const cacheKey = "/api/events";
        const cached = getCachedJson<EventItem[]>(cacheKey, EVENTS_CACHE_TTL_MS);
        let eventsData: EventItem[];
        if (cached) {
          eventsData = cached;
        } else {
          const res = await fetch(cacheKey, { cache: "no-store" });
          if (!res.ok) throw new Error("No se pudieron cargar los eventos");
          eventsData = await res.json();
          setCachedJson(cacheKey, eventsData, EVENTS_CACHE_TTL_MS);
        }
        setEvents(eventsData);
        const storedEventId =
          typeof window !== "undefined" ? getStoredEvent() : null;
        const defaultEventId =
          storedEventId && eventsData.some((event) => event.id === storedEventId)
            ? storedEventId
            : eventsData[0]?.id ?? "";
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
        if (viewMode === "day") {
          await refreshResults(selectedEvent);
        } else {
          await refreshPeople(selectedEvent);
        }
      } catch (error) {
        setErrorMessage(
          error instanceof Error ? error.message : "Error al cargar resultados"
        );
      } finally {
        setResultsLoading(false);
      }
    };
    fetchResults();
  }, [refreshPeople, refreshResults, selectedEvent, viewMode]);

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
      const payload: { voters: { name: string; weight?: number }[] } = await res.json();
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
      <HeaderBar
        label="Resultados"
        links={[
          { href: "/", label: "Votar" },
          {
            href: "/settings",
            label: "Preferencias",
            icon: <span className="inline-flex h-4 w-4 items-center justify-center">⚙️</span>,
            ariaLabel: "Preferencias",
          },
        ]}
      />
      <DescriptionCard
        subtitle="Resultados por evento"
        description={`Consulta las fechas más votadas. Ventana activa: ${
          selectedEventData
            ? `${selectedEventData.window.start} - ${selectedEventData.window.end}`
            : "—"
        }`}
        chips={[
          `Evento: ${events.find((e) => e.id === selectedEvent)?.name || "—"}`,
          `Nombre: ${voterName || "Pendiente"}`,
        ]}
      />

      <section className="rounded-2xl border border-slate-800 bg-slate-900/80 p-5 space-y-4 shadow-lg">
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
          <span className="tag">Resultados ordenados por votos y fecha</span>
          <button
            className="tag"
            type="button"
            onClick={() => clearCacheByPrefix("/api")}
          >
            Refrescar caché
          </button>
        </div>
      </section>

      <section className="rounded-2xl border border-slate-800 bg-slate-900/80 p-5 space-y-3 shadow-lg">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-xs uppercase tracking-wide text-slate-400">
              Resultados
            </p>
            <p className="text-lg font-semibold text-slate-100">
              {viewMode === "day" ? "Votos por día" : "Votos por persona"}
            </p>
          </div>
          <div className="flex items-center gap-2">
            <button
              className={`tag ${viewMode === "day" ? "bg-emerald-500/20 border-emerald-400 text-emerald-100" : ""}`}
              onClick={() => setViewMode("day")}
            >
              Por día
            </button>
            <button
              className={`tag ${viewMode === "person" ? "bg-emerald-500/20 border-emerald-400 text-emerald-100" : ""}`}
              onClick={() => setViewMode("person")}
            >
              Por persona
            </button>
            {resultsLoading && <span className="tag">Cargando...</span>}
          </div>
        </div>

        {viewMode === "day" && results.length === 0 && !resultsLoading && (
          <p className="text-slate-400 text-sm">
            Aún no hay votos para este evento.
          </p>
        )}

        {viewMode === "day" && results.length > 0 && (
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

        {viewMode === "person" && peopleResults.length === 0 && !resultsLoading && (
          <p className="text-slate-400 text-sm">
            Aún no hay votos registrados por persona en este evento.
          </p>
        )}

        {viewMode === "person" && peopleResults.length > 0 && (
          <div className="list">
            {peopleResults.map((person) => (
              <div key={person.name} className="list-item flex-col items-center gap-2 text-center">
                <div className="flex items-center gap-2">
                  <span className="w-2 h-2 rounded-full bg-emerald-400 inline-block" />
                  <span className="text-slate-100 font-semibold">{person.name}</span>
                  <span className="text-xs text-slate-400">
                    Peso: {person.weight ?? 1}
                  </span>
                </div>
                <div className="flex flex-wrap gap-2 justify-center text-xs text-slate-300">
                  {person.days.length === 0 ? (
                    <span className="tag">Sin días seleccionados</span>
                  ) : (
                    person.days.map((day) => (
                      <span key={`${person.name}-${day}`} className="tag">
                        {formatDisplay(day)}
                      </span>
                    ))
                  )}
                </div>
              </div>
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
                <li key={`${voter.name}-${idx}`} className="flex items-center gap-2">
                  <span className="w-2 h-2 rounded-full bg-emerald-400 inline-block" />
                  <span>{voter.name}</span>
                  <span className="text-xs text-slate-400">(peso: {voter.weight ?? 1})</span>
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
