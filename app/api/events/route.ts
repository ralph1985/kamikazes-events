import { ensureDefaultEvent } from '../../lib/storage';
import { jsonNoStore } from '../../lib/api';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

export async function GET() {
  try {
    const driver = await ensureDefaultEvent();
    const events = await driver.getEvents();
    return jsonNoStore(events);
  } catch (error) {
    console.error('GET /api/events', error);
    return jsonNoStore({ message: 'Error al obtener eventos' }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json().catch(() => null);
    const name = typeof body?.name === 'string' ? body.name.trim() : '';
    const window =
      body?.window &&
      typeof body.window.start === 'string' &&
      typeof body.window.end === 'string'
        ? { start: body.window.start, end: body.window.end }
        : undefined;
    const closeAt = typeof body?.closeAt === 'string' ? body.closeAt : undefined;

    if (!name) {
      return jsonNoStore({ message: 'El nombre del evento es obligatorio' }, { status: 400 });
    }

    const driver = await ensureDefaultEvent();
    const event = await driver.createEvent(name, window, closeAt);
    return jsonNoStore(event);
  } catch (error) {
    console.error('POST /api/events', error);
    return jsonNoStore({ message: 'No se pudo crear el evento' }, { status: 500 });
  }
}
