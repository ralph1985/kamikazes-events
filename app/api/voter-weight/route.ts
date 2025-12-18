import { NextResponse } from 'next/server';
import { ensureDefaultEvent } from '../../lib/storage';

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const eventId = searchParams.get('eventId')?.trim();
  const voterId = searchParams.get('voterId')?.trim();

  if (!eventId || !voterId) {
    return NextResponse.json({ message: 'eventId y voterId son obligatorios' }, { status: 400 });
  }

  try {
    const driver = await ensureDefaultEvent();
    const events = await driver.getEvents();
    const exists = events.some((event) => event.id === eventId);
    if (!exists) {
      return NextResponse.json({ message: 'Evento no encontrado' }, { status: 400 });
    }
    const weight = await driver.getVoterWeight(eventId, voterId);
    return NextResponse.json({ weight });
  } catch (error) {
    console.error('GET /api/voter-weight', error);
    return NextResponse.json({ message: 'No se pudo obtener el peso' }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json().catch(() => null);
    const voterId = typeof body?.voterId === 'string' ? body.voterId.trim() : '';
    const weightRaw = body?.weight;
    const eventIds = Array.isArray(body?.eventIds)
      ? body.eventIds.filter((v: unknown): v is string => typeof v === 'string')
      : [];

    const weightNum = typeof weightRaw === 'number' ? weightRaw : Number(weightRaw);
    const weight = Number.isFinite(weightNum) && weightNum > 0 ? weightNum : 1;

    if (!voterId) {
      return NextResponse.json({ message: 'voterId es obligatorio' }, { status: 400 });
    }
    if (eventIds.length === 0) {
      return NextResponse.json({ message: 'eventIds es obligatorio' }, { status: 400 });
    }

    const driver = await ensureDefaultEvent();
    await Promise.all(eventIds.map((eventId: string) => driver.setVoterWeight(eventId, voterId, weight)));

    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error('POST /api/voter-weight', error);
    return NextResponse.json({ message: 'No se pudo guardar el peso' }, { status: 500 });
  }
}
