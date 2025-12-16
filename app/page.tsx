"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useMemo, useState } from "react";
import { Calendar } from "./components/Calendar";
import {
  formatDayKey,
  isWeekendDate,
  isWithinVoteWindow,
  nextWeekend,
  parseDayKey,
} from "./lib/dates";
import { isSameDay } from "date-fns";
import type { EventItem, VoteResult } from "./lib/storage/StorageDriver";
import {
  getClientId,
  getStoredEvent,
  getStoredName,
  saveEvent,
  saveName,
} from "./lib/client";
import { LoadingOverlay } from "./components/LoadingOverlay";

type VoteState = "idle" | "loading" | "success" | "error";

export default function Page() {
  const router = useRouter();
  const [events, setEvents] = useState<EventItem[]>([]);
  const [eventsLoading, setEventsLoading] = useState(true);
  const [results, setResults] = useState<VoteResult[]>([]);
  const [resultsLoading, setResultsLoading] = useState(false);
  const [selectedEvent, setSelectedEvent] = useState<string>("");
  const [selectedDates, setSelectedDates] = useState<Date[]>([]);
  const [voterName, setVoterName] = useState<string>("");
  const [clientId, setClientId] = useState<string>("");
  const [voteState, setVoteState] = useState<VoteState>("idle");
  const [errorMessage, setErrorMessage] = useState<string>("");
  const [votingDayKey, setVotingDayKey] = useState<string | null>(null);
  const [initialLoading, setInitialLoading] = useState(true);

  const selectedEventData = useMemo(
    () => events.find((event) => event.id === selectedEvent),
    [events, selectedEvent]
  );
  const votesByDay = useMemo(() => {
    const map: Record<string, number> = {};
    results.forEach((item) => {
      map[item.day] = item.votes;
    });
    return map;
  }, [results]);
  const windowStartDate = useMemo(
    () => parseDayKey(selectedEventData?.window.start ?? "2026-01-07"),
    [selectedEventData?.window.start]
  );
  const windowEndDate = useMemo(
    () => parseDayKey(selectedEventData?.window.end ?? "2026-03-01"),
    [selectedEventData?.window.end]
  );
  const defaultSelection = useMemo(
    () =>
      nextWeekend(
        selectedEventData?.window.start ?? "2026-01-07",
        selectedEventData?.window.end ?? "2026-03-01"
      ),
    [selectedEventData?.window.end, selectedEventData?.window.start]
  );

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
    if (storedName) setVoterName(storedName);
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
        setInitialLoading(false);
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
          isWithinVoteWindow(
            formatDayKey(date),
            selectedEventData.window.start,
            selectedEventData.window.end
          )
        );
        return filtered;
      });
    }
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
    const fetchSelection = async () => {
      if (!clientId) return;
      try {
        const res = await fetch(
          `/api/vote?eventId=${encodeURIComponent(
            selectedEvent
          )}&voterId=${encodeURIComponent(clientId)}`,
          { cache: "no-store" }
        );
        if (res.ok) {
          const payload: { days?: string[] } = await res.json();
          const days = payload.days ?? [];
          setSelectedDates(days.map((day) => parseDayKey(day)));
          return;
        }
      } catch {
        // ignore
      }
      setSelectedDates([]);
    };
    fetchResults();
    fetchSelection();
  }, [
    clientId,
    defaultSelection,
    refreshResults,
    selectedEvent,
    selectedEventData,
  ]);

  const handleVote = async (day: Date) => {
    if (!selectedEvent || !voterName.trim() || !clientId || !selectedEventData)
      return;
    const dayKey = formatDayKey(day);
    if (
      !isWithinVoteWindow(
        dayKey,
        selectedEventData.window.start,
        selectedEventData.window.end
      )
    )
      return;

    const isSelected = selectedDates.some((d) => isSameDay(d, day));
    const nextSelection = isSelected
      ? selectedDates.filter((d) => !isSameDay(d, day))
      : [...selectedDates, day];

    const prevSelection = selectedDates;
    setSelectedDates(nextSelection);
    setVotingDayKey(dayKey);
    setVoteState("loading");
    setErrorMessage("");

    try {
      const res = await fetch("/api/vote", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          eventId: selectedEvent,
          voterId: clientId,
          name: voterName.trim(),
          days: nextSelection.map((d) => formatDayKey(d)),
        }),
      });

      if (!res.ok) {
        const payload = await res.json().catch(() => ({}));
        throw new Error(payload.message || "No se pudo registrar el voto");
      }

      saveName(voterName.trim());
      setVoteState("success");
      await refreshResults(selectedEvent);
    } catch (error) {
      setSelectedDates(prevSelection);
      setVoteState("error");
      setErrorMessage(
        error instanceof Error ? error.message : "Error al votar"
      );
    } finally {
      setVotingDayKey(null);
      setTimeout(() => setVoteState("idle"), 2500);
    }
  };

  return (
    <main className="max-w-md mx-auto px-4 py-8 sm:py-12 space-y-6">
      <LoadingOverlay visible={initialLoading} />
      <header className="space-y-3">
        <div className="flex items-center gap-3">
          <p className="text-emerald-400 text-sm font-semibold tracking-wide uppercase">
            kamikazes-events · Votar
          </p>
          <nav className="flex gap-2 text-sm items-center">
            <Link
              className="tag"
              href="/results"
            >
              Resultados
            </Link>
            <Link
              className="tag"
              href="/settings"
              aria-label="Preferencias"
              title="Preferencias"
            >
              <span className="inline-flex h-4 w-4 items-center justify-center">⚙️</span>
            </Link>
          </nav>
        </div>
        <h1 className="text-3xl font-bold text-slate-50 leading-tight">
          Vota el día del evento
        </h1>
        <p className="text-slate-300 text-sm">
          Elige tu evento, escribe tu nombre y marca los días que mejor te
          encajan. Los resultados se actualizan al instante.
        </p>
        <div className="flex flex-wrap gap-2 text-xs text-slate-300">
          <span className="tag">
            Evento: {events.find((e) => e.id === selectedEvent)?.name || "—"}
          </span>
          <span className="tag">Nombre: {voterName || "Pendiente"}</span>
        </div>
      </header>

      {!voterName && (
        <p className="text-red-300 text-sm">
          El nombre es obligatorio para votar. Ve a{" "}
          <Link href="/settings">Preferencias</Link> para configurarlo.
        </p>
      )}

      <Calendar
        selected={selectedDates}
        onSelect={(date) => handleVote(date)}
        fromDate={windowStartDate}
        toDate={windowEndDate}
        dayVotes={votesByDay}
        loadingDayKey={votingDayKey}
        windowLabel={
          selectedEventData
            ? `${selectedEventData.window.start} - ${selectedEventData.window.end}`
            : "Rango activo"
        }
      />

      <section className="space-y-3">
        {voteState === "success" && (
          <p className="text-emerald-300 text-sm">
            ¡Voto registrado! Si cambias de opinión, toca otro día para
            reemplazar tu voto.
          </p>
        )}
        {voteState === "error" && (
          <p className="text-red-300 text-sm">
            No se pudo registrar el voto. {errorMessage}
          </p>
        )}
      </section>

      {errorMessage && voteState !== "error" && (
        <p className="text-red-300 text-sm">Aviso: {errorMessage}</p>
      )}
    </main>
  );
}
