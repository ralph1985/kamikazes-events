const CACHE_PREFIX = 'cache:';
const TTL_MS = 5 * 60 * 1000; // 5 minutes

function canUseSessionStorage(): boolean {
  if (typeof window === 'undefined') return false;
  try {
    const key = '__cache_test__';
    window.sessionStorage.setItem(key, '1');
    window.sessionStorage.removeItem(key);
    return true;
  } catch {
    return false;
  }
}

export function getCachedJson<T>(key: string): T | null {
  if (!canUseSessionStorage()) return null;
  const raw = window.sessionStorage.getItem(`${CACHE_PREFIX}${key}`);
  if (!raw) return null;
  try {
    const payload = JSON.parse(raw) as { ts: number; data: T };
    if (Date.now() - payload.ts > TTL_MS) {
      window.sessionStorage.removeItem(`${CACHE_PREFIX}${key}`);
      return null;
    }
    return payload.data;
  } catch {
    window.sessionStorage.removeItem(`${CACHE_PREFIX}${key}`);
    return null;
  }
}

export function setCachedJson<T>(key: string, data: T) {
  if (!canUseSessionStorage()) return;
  const payload = JSON.stringify({ ts: Date.now(), data });
  window.sessionStorage.setItem(`${CACHE_PREFIX}${key}`, payload);
}

export function clearCacheByPrefix(prefix: string) {
  if (!canUseSessionStorage()) return;
  const entries: string[] = [];
  for (let i = 0; i < window.sessionStorage.length; i += 1) {
    const k = window.sessionStorage.key(i);
    if (k && k.startsWith(`${CACHE_PREFIX}${prefix}`)) {
      entries.push(k);
    }
  }
  entries.forEach((k) => window.sessionStorage.removeItem(k));
}
