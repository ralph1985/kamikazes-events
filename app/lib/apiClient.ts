import { getCachedJson, setCachedJson } from './cache';
import { CACHE_TTL_MS } from './constants';

type FetchCacheOptions = {
  cacheKey?: string;
  ttlMs?: number;
};

type FetchInit = Omit<RequestInit, 'cache'>;

/**
 * Fetch JSON with sessionStorage cache (for GET requests).
 * Usa cacheKey/ttlMs si se proporcionan; por defecto la URL y TTL global.
 */
export async function fetchJsonWithCache<T>(
  url: string,
  init: FetchInit = {},
  options: FetchCacheOptions = {}
): Promise<T> {
  const key = options.cacheKey ?? url;
  const ttl = options.ttlMs ?? CACHE_TTL_MS;
  const cached = getCachedJson<T>(key, ttl);
  if (cached) return cached;

  const res = await fetch(url, { ...init, cache: 'no-store' });
  if (!res.ok) {
    const payload = await res.json().catch(() => ({}));
    throw new Error(payload.message || `No se pudo cargar ${url}`);
  }
  const data = (await res.json()) as T;
  setCachedJson(key, data, ttl);
  return data;
}

/**
 * Fetch JSON sin cachear (POST u otros casos).
 */
export async function fetchJsonNoCache<T>(url: string, init: FetchInit = {}): Promise<T> {
  const res = await fetch(url, { ...init, cache: 'no-store' });
  if (!res.ok) {
    const payload = await res.json().catch(() => ({}));
    throw new Error(payload.message || `No se pudo procesar ${url}`);
  }
  return (await res.json()) as T;
}
