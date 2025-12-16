import { KvDriver } from './KvDriver';
import { MockDriver } from './MockDriver';
import type { EventItem, StorageDriver } from './StorageDriver';

export const DEFAULT_EVENT: EventItem = {
  id: 'babyshower-mullor-gallego-v2',
  name: 'Babyshower Mullor-Gallego V2',
  window: {
    start: '2026-01-07',
    end: '2026-03-01'
  }
};

let driverPromise: Promise<StorageDriver> | null = null;

function hasKvEnv(): boolean {
  return Boolean(process.env.KV_REST_API_URL && process.env.KV_REST_API_TOKEN);
}

export function getDriver(): Promise<StorageDriver> {
  if (!driverPromise) {
    driverPromise = Promise.resolve(hasKvEnv() ? new KvDriver() : new MockDriver());
  }
  return driverPromise;
}

export async function ensureDefaultEvent(): Promise<StorageDriver> {
  const driver = await getDriver();
  const events = await driver.getEvents();
  const existing = events.find((event) => event.id === DEFAULT_EVENT.id);
  if (!existing) {
    await driver.createEvent(DEFAULT_EVENT.name, DEFAULT_EVENT.window);
  } else if (!existing.window?.start || !existing.window?.end) {
    // ensure window is present if legacy data exists
    await driver.createEvent(DEFAULT_EVENT.name, DEFAULT_EVENT.window);
  }
  return driver;
}
