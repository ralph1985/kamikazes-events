import { NextResponse } from 'next/server';
import { ensureDefaultEvent } from '../../../lib/storage';

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const eventId = searchParams.get('eventId')?.trim();

  if (!eventId) {
    return NextResponse.json({ message: 'eventId es obligatorio' }, { status: 400 });
  }

  try {
    const driver = await ensureDefaultEvent();
    const events = await driver.getEvents();
    const exists = events.some((event) => event.id === eventId);
    if (!exists) {
      return NextResponse.json({ message: 'Evento no encontrado' }, { status: 400 });
    }

    const voters = await driver.getVotersSelections(eventId);
    return NextResponse.json({ voters });
  } catch (error) {
    console.error('GET /api/voters/people', error);
    return NextResponse.json({ message: 'Error interno' }, { status: 500 });
  }
}
