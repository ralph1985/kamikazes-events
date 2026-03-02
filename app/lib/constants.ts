/**
 * Configuración común para la app.
 * - CACHE_*: controlan prefijos y expiraciones de la caché en sessionStorage.
 * - STORAGE_KEYS: claves de localStorage para datos del cliente.
 * - VOTING: configuración provisional de días habilitados y cierre por defecto opcional (TODO: mover a cada evento).
 */

// Prefijo para las entradas de caché en sessionStorage.
export const CACHE_PREFIX = 'cache:';
// TTL por defecto para las respuestas cacheadas (5 minutos).
export const CACHE_TTL_MS = 5 * 60 * 1000;
// TTL ampliado para recursos estables como el listado de eventos (20 minutos).
export const EVENTS_CACHE_TTL_MS = 20 * 60 * 1000;

// Claves de localStorage para los datos del cliente.
export const STORAGE_KEYS = {
  selectedEventId: 'selectedEventId',
  voterName: 'voterName',
  clientId: 'clientId',
  voterWeight: 'voterWeight',
  storageReset20260301Done: 'storageReset20260301Done'
} as const;

/**
 * Configuración de votación global por defecto.
 * Las reglas de días votables viven en cada evento (window + blockedDays).
 */
export const VOTING = {
  // Fecha/hora límite por defecto (si se omite, no hay cierre). Puede ser sobrescrita por cada evento.
  closeAt: undefined as string | undefined
} as const;
