import { ensureDefaultEvent } from '../../lib/storage';
import { allowedDaysWithinWindow } from '../../lib/dates';
import { jsonNoStore } from '../../lib/api';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const eventId = searchParams.get('eventId')?.trim();

    if (!eventId) {
      return jsonNoStore({ message: 'eventId es obligatorio' }, { status: 400 });
    }

    const driver = await ensureDefaultEvent();
    const events = await driver.getEvents();
    const exists = events.some((event) => event.id === eventId);
    if (!exists) {
      return jsonNoStore({ message: 'El evento no existe' }, { status: 400 });
    }

    const results = await driver.getResults(eventId);
    const allowed = new Set(
      allowedDaysWithinWindow(
        events.find((event) => event.id === eventId)?.window.start ?? '',
        events.find((event) => event.id === eventId)?.window.end ?? '',
        events.find((event) => event.id === eventId)?.blockedDays ?? []
      )
    );
    const filtered = results.filter((result) => allowed.has(result.day));
    return jsonNoStore(filtered);
  } catch (error) {
    console.error('GET /api/results', error);
    return jsonNoStore({ message: 'Error al obtener resultados' }, { status: 500 });
  }
}
