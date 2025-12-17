"use client";

import { useRouter } from "next/navigation";
import { useCallback, useEffect, useMemo, useState } from "react";
import { Calendar } from "./components/Calendar";
import {
  allowedDaysWithinWindow,
  formatDayKey,
  isWithinVoteWindow,
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
import { DescriptionCard } from "./components/DescriptionCard";
import { HeaderBar } from "./components/HeaderBar";
import Link from "next/link";

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
  const allowedDayKeysForEvent = useMemo(
    () =>
      allowedDaysWithinWindow(
        selectedEventData?.window.start ?? "2026-01-07",
        selectedEventData?.window.end ?? "2026-03-01"
      ),
    [selectedEventData?.window.end, selectedEventData?.window.start]
  );
  const windowStartDate = useMemo(() => {
    const first = allowedDayKeysForEvent[0];
    return first
      ? parseDayKey(first)
      : parseDayKey(selectedEventData?.window.start ?? "2026-01-07");
  }, [allowedDayKeysForEvent, selectedEventData?.window.start]);
  const windowEndDate = useMemo(() => {
    const last = allowedDayKeysForEvent[allowedDayKeysForEvent.length - 1];
    return last
      ? parseDayKey(last)
      : parseDayKey(selectedEventData?.window.end ?? "2026-03-01");
  }, [allowedDayKeysForEvent, selectedEventData?.window.end]);

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
    const fetchData = async () => {
      setResultsLoading(true);
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

      try {
        await refreshResults(selectedEvent);
      } catch (error) {
        setErrorMessage(
          error instanceof Error ? error.message : "Error al cargar resultados"
        );
      }

      if (clientId) {
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
          } else {
            setSelectedDates([]);
          }
        } catch {
          setSelectedDates([]);
        }
      }
      setResultsLoading(false);
    };

    fetchData();
  }, [clientId, refreshResults, selectedEvent, selectedEventData]);

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
      <HeaderBar
        label="Votar"
        links={[
          { href: "/results", label: "Resultados" },
          {
            href: "/settings",
            label: "Preferencias",
            icon: (
              <span className="inline-flex h-4 w-4 items-center justify-center">
                ⚙️
              </span>
            ),
            ariaLabel: "Preferencias",
          },
        ]}
      />
      <DescriptionCard
        subtitle="Vota el día del evento"
        description="Marca tus días disponibles; el voto se actualiza al instante al tocar el calendario."
        chips={[
          `Evento: ${events.find((e) => e.id === selectedEvent)?.name || "—"}`,
          `Nombre: ${voterName || "Pendiente"}`,
        ]}
      />

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
        allowedDayKeys={allowedDayKeysForEvent}
        dayVotes={votesByDay}
        loadingDayKey={votingDayKey}
        windowLabel={
          selectedEventData
            ? `Días habilitados: ${allowedDayKeysForEvent.length}`
            : "Rango activo"
        }
      />

      <section className="space-y-3">
        {voteState === "success" && (
          <p className="text-emerald-300 text-sm">
            ¡Voto registrado! Añade o quita días tocando en el calendario; la
            selección se actualiza al momento.
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
