import { NextResponse } from 'next/server';
import { formatDayKey, isWithinVoteWindow, parseDayKey } from '../../lib/dates';
import { ensureDefaultEvent } from '../../lib/storage';

export const dynamic = 'force-dynamic';

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
      return NextResponse.json({ message: 'El nombre es obligatorio' }, { status: 400 });
    }
    if (!voterId) {
      return NextResponse.json({ message: 'No se pudo identificar al votante' }, { status: 400 });
    }
    if (!eventId) {
      return NextResponse.json({ message: 'eventId es obligatorio' }, { status: 400 });
    }
    if (days.length === 0) {
      return NextResponse.json({ message: 'Debes elegir al menos un día' }, { status: 400 });
    }

    const driver = await ensureDefaultEvent();
    const events = await driver.getEvents();
    const event = events.find((item) => item.id === eventId);
    if (!event) {
      return NextResponse.json({ message: 'El evento no existe' }, { status: 400 });
    }

    let normalizedDays: string[];
    try {
      normalizedDays = Array.from(
        new Set(
          days.map((day) => {
            if (!isWithinVoteWindow(day, event.window.start, event.window.end))
              throw new Error('Fuera de rango');
            return formatDayKey(parseDayKey(day));
          })
        )
      );
    } catch {
      return NextResponse.json(
        {
          message: `El día no es válido o está fuera de rango (${event.window.start} a ${event.window.end}, solo fines de semana)`
        },
        { status: 400 }
      );
    }

    if (normalizedDays.length === 0) {
      return NextResponse.json(
        {
          message: `El día no es válido o está fuera de rango (${event.window.start} a ${event.window.end}, solo fines de semana)`
        },
        { status: 400 }
      );
    }

    await driver.vote(eventId, voterId, name, normalizedDays);
    return NextResponse.json({ ok: true, replacedDays: normalizedDays });
  } catch (error) {
    console.error('POST /api/vote', error);
    return NextResponse.json({ message: 'No se pudo registrar el voto' }, { status: 500 });
  }
}

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const eventId = searchParams.get('eventId')?.trim();
    const voterId = searchParams.get('voterId')?.trim();
    if (!eventId || !voterId) {
      return NextResponse.json({ message: 'eventId y voterId son obligatorios' }, { status: 400 });
    }

    const driver = await ensureDefaultEvent();
    const events = await driver.getEvents();
    const event = events.find((item) => item.id === eventId);
    if (!event) {
      return NextResponse.json({ message: 'El evento no existe' }, { status: 400 });
    }

    const selection = await driver.getSelection(eventId, voterId);
    const normalized = selection
      .filter((day) => isWithinVoteWindow(day, event.window.start, event.window.end))
      .map((day) => formatDayKey(parseDayKey(day)));

    return NextResponse.json({ days: normalized });
  } catch (error) {
    console.error('GET /api/vote', error);
    return NextResponse.json({ message: 'No se pudo obtener el voto' }, { status: 500 });
  }
}
