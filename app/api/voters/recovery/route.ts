import { ensureDefaultEvent } from '../../../lib/storage';
import { jsonNoStore } from '../../../lib/api';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

export async function GET() {
  try {
    const driver = await ensureDefaultEvent();
    const voters = await driver.listVoters();
    return jsonNoStore({ voters });
  } catch (error) {
    console.error('GET /api/voters/recovery', error);
    return jsonNoStore({ message: 'No se pudieron cargar los usuarios' }, { status: 500 });
  }
}
