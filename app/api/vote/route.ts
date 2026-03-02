import { formatDayKey, isVotingClosed, isWithinVoteWindow, parseDayKey } from '../../lib/dates';
import { ensureDefaultEvent } from '../../lib/storage';
import { jsonNoStore } from '../../lib/api';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

export async function POST(request: Request) {
  try {
    const body = await request.json().catch(() => null);
    const name = typeof body?.name === 'string' ? body.name.trim() : '';
    const voterId = typeof body?.voterId === 'string' ? body.voterId.trim() : '';
    const eventId = typeof body?.eventId === 'string' ? body.eventId.trim() : '';
    const daysRaw: unknown = body?.days ?? body?.day;
    const days: string[] = Array.isArray(daysRaw)
      ? daysRaw
          .filter((value): value is string => typeof value === 'string')
          .map((d) => d.trim())
      : typeof daysRaw === 'string' && daysRaw.trim()
        ? [daysRaw.trim()]
        : [];

    if (!name) {
      return jsonNoStore({ message: 'El nombre es obligatorio' }, { status: 400 });
    }
    if (!voterId) {
      return jsonNoStore({ message: 'No se pudo identificar al votante' }, { status: 400 });
    }
    if (!eventId) {
      return jsonNoStore({ message: 'eventId es obligatorio' }, { status: 400 });
    }
    const driver = await ensureDefaultEvent();
    const events = await driver.getEvents();
    const event = events.find((item) => item.id === eventId);
    if (!event) {
      return jsonNoStore({ message: 'El evento no existe' }, { status: 400 });
    }
    if (event.completed) {
      return jsonNoStore({ message: 'Este evento está completado y no admite más votos' }, { status: 400 });
    }
    if (isVotingClosed(event?.closeAt)) {
      return jsonNoStore({ message: 'Las votaciones están cerradas' }, { status: 400 });
    }

    let normalizedDays: string[];
    try {
      normalizedDays =
        days.length === 0
          ? []
          : Array.from(
              new Set(
                days.map((day) => {
                  if (
                    !isWithinVoteWindow(
                      day,
                      event.window.start,
                      event.window.end,
                      event.blockedDays ?? []
                    )
                  )
                    throw new Error('Fuera de rango');
                  return formatDayKey(parseDayKey(day));
                })
              )
            );
    } catch {
      return jsonNoStore(
        {
          message: 'El día no es válido, no cae en fin de semana o está bloqueado para este evento'
        },
        { status: 400 }
      );
    }

    await driver.vote(eventId, voterId, name, normalizedDays);
    return jsonNoStore({ ok: true, replacedDays: normalizedDays });
  } catch (error) {
    console.error('POST /api/vote', error);
    return jsonNoStore({ message: 'No se pudo registrar el voto' }, { status: 500 });
  }
}

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const eventId = searchParams.get('eventId')?.trim();
    const voterId = searchParams.get('voterId')?.trim();
    if (!eventId || !voterId) {
      return jsonNoStore({ message: 'eventId y voterId son obligatorios' }, { status: 400 });
    }

    const driver = await ensureDefaultEvent();
    const events = await driver.getEvents();
    const event = events.find((item) => item.id === eventId);
    if (!event) {
      return jsonNoStore({ message: 'El evento no existe' }, { status: 400 });
    }
    if (event.completed) {
      return jsonNoStore({ days: [] });
    }

    const selection = await driver.getSelection(eventId, voterId);
    const normalized = selection
      .filter((day) =>
        isWithinVoteWindow(day, event.window.start, event.window.end, event.blockedDays ?? [])
      )
      .map((day) => formatDayKey(parseDayKey(day)));

    return jsonNoStore({ days: normalized });
  } catch (error) {
    console.error('GET /api/vote', error);
    return jsonNoStore({ message: 'No se pudo obtener el voto' }, { status: 500 });
  }
}
