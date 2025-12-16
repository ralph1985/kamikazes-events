import { NextResponse } from 'next/server';
import { ensureDefaultEvent } from '../../lib/storage';

export const dynamic = 'force-dynamic';

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const eventId = searchParams.get('eventId')?.trim();

    if (!eventId) {
      return NextResponse.json({ message: 'eventId es obligatorio' }, { status: 400 });
    }

    const driver = await ensureDefaultEvent();
    const events = await driver.getEvents();
    const exists = events.some((event) => event.id === eventId);
    if (!exists) {
      return NextResponse.json({ message: 'El evento no existe' }, { status: 400 });
    }

    const results = await driver.getResults(eventId);
    return NextResponse.json(results);
  } catch (error) {
    console.error('GET /api/results', error);
    return NextResponse.json({ message: 'Error al obtener resultados' }, { status: 500 });
  }
}
