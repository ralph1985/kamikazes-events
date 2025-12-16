import { KvDriver } from './KvDriver';
import { MockDriver } from './MockDriver';
import type { StorageDriver } from './StorageDriver';

export const DEFAULT_EVENT = {
  id: 'babyshower-mullor-gallego-v2',
  name: 'Babyshower Mullor-Gallego V2'
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
  const exists = events.some((event) => event.id === DEFAULT_EVENT.id);
  if (!exists) {
    await driver.createEvent(DEFAULT_EVENT.name);
  }
  return driver;
}
