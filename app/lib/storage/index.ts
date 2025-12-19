import { KvDriver } from "./KvDriver";
import { MockDriver } from "./MockDriver";
import type { EventItem, StorageDriver } from "./StorageDriver";

export const DEFAULT_EVENT: EventItem = {
  id: "babyshower-mullor-gallego-v2",
  name: "Babyshower Mullor-Gallego V2",
  window: {
    start: "2026-01-07",
    end: "2026-03-01",
  },
  closeAt: "2025-12-19T16:00:00+01:00",
};

let driverPromise: Promise<StorageDriver> | null = null;

function hasKvEnv(): boolean {
  return Boolean(process.env.KV_REST_API_URL && process.env.KV_REST_API_TOKEN);
}

export function getDriver(): Promise<StorageDriver> {
  if (!driverPromise) {
    const instance: StorageDriver = hasKvEnv()
      ? new KvDriver()
      : new MockDriver();
    driverPromise = Promise.resolve(instance);
  }
  return driverPromise;
}

export async function ensureDefaultEvent(): Promise<StorageDriver> {
  const driver = await getDriver();
  const events = await driver.getEvents();
  const existing = events.find((event) => event.id === DEFAULT_EVENT.id);
  if (!existing) {
    await driver.createEvent(
      DEFAULT_EVENT.name,
      DEFAULT_EVENT.window,
      DEFAULT_EVENT.closeAt
    );
  }
  return driver;
}
