import { addDays, format, isAfter, isBefore, isValid, parseISO, startOfDay, isSameDay } from 'date-fns';
import { es } from 'date-fns/locale';

export function formatDayKey(date: Date): string {
  return format(date, 'yyyy-MM-dd');
}

export function parseDayKey(value: string): Date {
  return startOfDay(parseISO(value));
}

export function isValidDayKey(value: string): boolean {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) {
    return false;
  }
  const parsed = parseISO(value);
  return isValid(parsed);
}

export const allowedDayKeys = ['2026-01-17', '2026-02-07', '2026-02-08', '2026-02-21', '2026-02-22', '2026-02-28'];

export function formatDisplay(dayKey: string): string {
  return format(parseDayKey(dayKey), 'EEE dd/MM/yyyy', { locale: es });
}

export function isAllowedDay(dayKey: string): boolean {
  if (!isValidDayKey(dayKey)) return false;
  return allowedDayKeys.includes(dayKey);
}

export function allowedDaysWithinWindow(start: string, end: string): string[] {
  const startDate = parseDayKey(start);
  const endDate = parseDayKey(end);
  return allowedDayKeys.filter((day) => {
    const date = parseDayKey(day);
    return !isBefore(date, startDate) && !isAfter(date, endDate);
  });
}

export function firstAllowedDay(start: string, end: string): Date {
  const filtered = allowedDaysWithinWindow(start, end);
  if (filtered.length === 0) return parseDayKey(start);
  return parseDayKey(filtered[0]);
}

export function isWithinVoteWindow(dayKey: string, start: string, end: string): boolean {
  if (!isValidDayKey(dayKey)) return false;
  const filtered = allowedDaysWithinWindow(start, end);
  return filtered.includes(formatDayKey(parseDayKey(dayKey)));
}

export function toDate(key: string): Date {
  return parseDayKey(key);
}

export function minDate(event: { window: { start: string } }): Date {
  return parseDayKey(event.window.start);
}

export function maxDate(event: { window: { end: string } }): Date {
  return parseDayKey(event.window.end);
}
