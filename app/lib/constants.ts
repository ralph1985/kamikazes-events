/**
 * Configuración común para la app.
 * - CACHE_*: controlan prefijos y expiraciones de la caché en sessionStorage.
 * - STORAGE_KEYS: claves de localStorage para datos del cliente.
 * - VOTING: configuración provisional de días habilitados (TODO: mover a cada evento).
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
  voterWeight: 'voterWeight'
} as const;

/**
 * Configuración de votación.
 * TODO: mover los días permitidos a la definición de cada evento en la API y eliminar esta constante global.
 */
export const VOTING = {
  allowedDayKeys: ['2026-01-17', '2026-02-07', '2026-02-08', '2026-02-21', '2026-02-22', '2026-02-28']
} as const;
