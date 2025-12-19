import { ensureDefaultEvent } from '../../lib/storage';
import { jsonNoStore } from '../../lib/api';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

export async function POST(request: Request) {
  try {
    const body = await request.json().catch(() => null);
    const voterId = typeof body?.voterId === 'string' ? body.voterId.trim() : '';
    const name = typeof body?.name === 'string' ? body.name.trim() : '';
    const eventIds = Array.isArray(body?.eventIds)
      ? body.eventIds.filter((id: unknown): id is string => typeof id === 'string')
      : null;

    if (!voterId || !name) {
      return jsonNoStore({ message: 'voterId y name son obligatorios' }, { status: 400 });
    }

    const driver = await ensureDefaultEvent();
    const events = await driver.getEvents();
    const targetIds = eventIds && eventIds.length > 0 ? eventIds : events.map((e) => e.id);

    await Promise.all(
      targetIds.map((eventId: string) =>
        driver.setVoterName(eventId, voterId, name).catch((error) => {
          console.error(`setVoterName failed for ${eventId}`, error);
        })
      )
    );

    return jsonNoStore({ ok: true });
  } catch (error) {
    console.error('POST /api/voter-name', error);
    return jsonNoStore({ message: 'No se pudo actualizar el nombre' }, { status: 500 });
  }
}
