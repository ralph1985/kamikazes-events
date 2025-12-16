import { NextResponse } from 'next/server';
import { ensureDefaultEvent } from '../../lib/storage';

export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    const driver = await ensureDefaultEvent();
    const events = await driver.getEvents();
    return NextResponse.json(events);
  } catch (error) {
    console.error('GET /api/events', error);
    return NextResponse.json({ message: 'Error al obtener eventos' }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json().catch(() => null);
    const name = typeof body?.name === 'string' ? body.name.trim() : '';

    if (!name) {
      return NextResponse.json({ message: 'El nombre del evento es obligatorio' }, { status: 400 });
    }

    const driver = await ensureDefaultEvent();
    const event = await driver.createEvent(name);
    return NextResponse.json(event);
  } catch (error) {
    console.error('POST /api/events', error);
    return NextResponse.json({ message: 'No se pudo crear el evento' }, { status: 500 });
  }
}
