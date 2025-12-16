import { addDays, format, isAfter, isBefore, isValid, isWeekend, parseISO, startOfDay, isSameDay } from 'date-fns';
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

export function isWithinVoteWindow(dayKey: string, start: string, end: string): boolean {
  if (!isValidDayKey(dayKey)) return false;
  const date = parseDayKey(dayKey);
  const startDate = parseDayKey(start);
  const endDate = parseDayKey(end);
  return !isBefore(date, startDate) && !isAfter(date, endDate) && isWeekend(date);
}

export function formatDisplay(dayKey: string): string {
  return format(parseDayKey(dayKey), 'EEE dd/MM/yyyy', { locale: es });
}

export function isWeekendDate(date: Date): boolean {
  return isWeekend(date);
}

export function nextWeekend(start: string, end: string): Date {
  let cursor = parseDayKey(start);
  const endDate = parseDayKey(end);
  while (!isAfter(cursor, endDate)) {
    if (isWeekend(cursor)) return cursor;
    cursor = addDays(cursor, 1);
  }
  return endDate;
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
