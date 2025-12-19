import { NextResponse } from 'next/server';

export const noStoreHeaders = {
  'Cache-Control': 'no-store, max-age=0, must-revalidate',
  Pragma: 'no-cache',
  Expires: '0'
};

export function jsonNoStore<T>(body: T, init?: ResponseInit) {
  return NextResponse.json(body, {
    ...init,
    headers: { ...noStoreHeaders, ...(init?.headers ?? {}) }
  });
}
