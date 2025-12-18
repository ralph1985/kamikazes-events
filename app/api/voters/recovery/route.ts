import { NextResponse } from 'next/server';
import { ensureDefaultEvent } from '../../../lib/storage';

export async function GET() {
  try {
    const driver = await ensureDefaultEvent();
    const voters = await driver.listVoters();
    return NextResponse.json({ voters });
  } catch (error) {
    console.error('GET /api/voters/recovery', error);
    return NextResponse.json({ message: 'No se pudieron cargar los usuarios' }, { status: 500 });
  }
}
