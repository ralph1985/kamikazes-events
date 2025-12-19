import { ensureDefaultEvent } from '../../lib/storage';
import { jsonNoStore } from '../../lib/api';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const eventId = searchParams.get('eventId')?.trim();
  const voterId = searchParams.get('voterId')?.trim();

  if (!eventId || !voterId) {
    return jsonNoStore({ message: 'eventId y voterId son obligatorios' }, { status: 400 });
  }

  try {
    const driver = await ensureDefaultEvent();
    const events = await driver.getEvents();
    const exists = events.some((event) => event.id === eventId);
    if (!exists) {
      return jsonNoStore({ message: 'Evento no encontrado' }, { status: 400 });
    }
    const weight = await driver.getVoterWeight(eventId, voterId);
    return jsonNoStore({ weight });
  } catch (error) {
    console.error('GET /api/voter-weight', error);
    return jsonNoStore({ message: 'No se pudo obtener el peso' }, { status: 500 });
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
      return jsonNoStore({ message: 'voterId es obligatorio' }, { status: 400 });
    }
    if (eventIds.length === 0) {
      return jsonNoStore({ message: 'eventIds es obligatorio' }, { status: 400 });
    }

    const driver = await ensureDefaultEvent();
    await Promise.all(eventIds.map((eventId: string) => driver.setVoterWeight(eventId, voterId, weight)));

    return jsonNoStore({ ok: true });
  } catch (error) {
    console.error('POST /api/voter-weight', error);
    return jsonNoStore({ message: 'No se pudo guardar el peso' }, { status: 500 });
  }
}
