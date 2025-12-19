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
  return jsonNoStore({ message: 'Creación de eventos deshabilitada' }, { status: 405 });
}
