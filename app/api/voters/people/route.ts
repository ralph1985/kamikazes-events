import { ensureDefaultEvent } from '../../../lib/storage';
import { allowedDaysWithinWindow } from '../../../lib/dates';
import { jsonNoStore } from '../../../lib/api';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

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

    const allowed = new Set(
      allowedDaysWithinWindow(
        events.find((event) => event.id === eventId)?.window.start ?? '',
        events.find((event) => event.id === eventId)?.window.end ?? ''
      )
    );
    const voters = (await driver.getVotersSelections(eventId)).map((voter) => ({
      name: voter.name,
      days: voter.days.filter((day) => allowed.has(day)),
      weight: typeof voter.weight === 'number' && voter.weight > 0 ? voter.weight : 1
    }));
    return jsonNoStore({ voters });
  } catch (error) {
    console.error('GET /api/voters/people', error);
    return jsonNoStore({ message: 'Error interno' }, { status: 500 });
  }
}
