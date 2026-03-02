import { addDays, format, getDay, isAfter, isBefore, isValid, parseISO, startOfDay } from 'date-fns';
import { es } from 'date-fns/locale';
import { VOTING } from './constants';

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

export function formatDisplay(dayKey: string): string {
  return format(parseDayKey(dayKey), 'EEE dd/MM/yyyy', { locale: es });
}

export function weekendDaysWithinWindow(start: string, end: string): string[] {
  const startDate = parseDayKey(start);
  const endDate = parseDayKey(end);
  if (isAfter(startDate, endDate)) return [];

  const days: string[] = [];
  let cursor = startDate;
  while (!isAfter(cursor, endDate)) {
    const day = getDay(cursor);
    if (day === 0 || day === 6) {
      days.push(formatDayKey(cursor));
    }
    cursor = addDays(cursor, 1);
  }
  return days;
}

export function allowedDaysWithinWindow(
  start: string,
  end: string,
  blockedDays: string[] = []
): string[] {
  const blockedSet = new Set(
    blockedDays
      .filter((value) => isValidDayKey(value))
      .map((value) => formatDayKey(parseDayKey(value)))
  );
  return weekendDaysWithinWindow(start, end).filter((day) => !blockedSet.has(day));
}

export function firstAllowedDay(start: string, end: string, blockedDays: string[] = []): Date {
  const filtered = allowedDaysWithinWindow(start, end, blockedDays);
  if (filtered.length === 0) return parseDayKey(start);
  return parseDayKey(filtered[0]);
}

export function isWithinVoteWindow(
  dayKey: string,
  start: string,
  end: string,
  blockedDays: string[] = []
): boolean {
  if (!isValidDayKey(dayKey)) return false;
  const filtered = allowedDaysWithinWindow(start, end, blockedDays);
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

export function isVotingClosed(closeAt: string | undefined = VOTING.closeAt, now: Date = new Date()): boolean {
  if (!closeAt) return false;
  const close = parseISO(closeAt ?? VOTING.closeAt);
  return isAfter(now, close);
}
