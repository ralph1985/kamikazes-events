/**
 * Configuración común de caché y tiempos.
 * Ajusta aquí los TTL y el prefijo usado en sessionStorage para centralizar cambios.
 */
export const CACHE_PREFIX = 'cache:';

// TTL por defecto para las respuestas cacheadas (5 minutos).
export const CACHE_TTL_MS = 5 * 60 * 1000;

// TTL ampliado para recursos más estables como el listado de eventos (20 minutos).
export const EVENTS_CACHE_TTL_MS = 20 * 60 * 1000;
