import { NextResponse } from 'next/server';
import { formatDayKey, isWithinVoteWindow, parseDayKey } from '../../lib/dates';
import { ensureDefaultEvent } from '../../lib/storage';

export const dynamic = 'force-dynamic';

export async function POST(request: Request) {
  try {
    const body = await request.json().catch(() => null);
    const name = typeof body?.name === 'string' ? body.name.trim() : '';
    const eventId = typeof body?.eventId === 'string' ? body.eventId.trim() : '';
    const day = typeof body?.day === 'string' ? body.day.trim() : '';

    if (!name) {
      return NextResponse.json({ message: 'El nombre es obligatorio' }, { status: 400 });
    }
    if (!eventId) {
      return NextResponse.json({ message: 'eventId es obligatorio' }, { status: 400 });
    }
    if (!day || !isWithinVoteWindow(day)) {
      return NextResponse.json(
        { message: 'El día no es válido o está fuera de rango (hoy a 30 días)' },
        { status: 400 }
      );
    }

    const driver = await ensureDefaultEvent();
    const events = await driver.getEvents();
    const exists = events.some((event) => event.id === eventId);
    if (!exists) {
      return NextResponse.json({ message: 'El evento no existe' }, { status: 400 });
    }

    const dayKey = formatDayKey(parseDayKey(day));
    await driver.vote(eventId, name, dayKey);
    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error('POST /api/vote', error);
    return NextResponse.json({ message: 'No se pudo registrar el voto' }, { status: 500 });
  }
}
