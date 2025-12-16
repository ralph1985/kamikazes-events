import { addDays, format, isAfter, isBefore, isValid, parseISO, startOfDay } from 'date-fns';
import { es } from 'date-fns/locale';

export const VOTE_WINDOW_DAYS = 30;

export function today(): Date {
  return startOfDay(new Date());
}

export function minDate(): Date {
  return today();
}

export function maxDate(): Date {
  return addDays(minDate(), VOTE_WINDOW_DAYS);
}

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

export function isWithinVoteWindow(dayKey: string): boolean {
  if (!isValidDayKey(dayKey)) return false;
  const date = parseDayKey(dayKey);
  return !isBefore(date, minDate()) && !isAfter(date, maxDate());
}

export function formatDisplay(dayKey: string): string {
  return format(parseDayKey(dayKey), 'EEE dd/MM/yyyy', { locale: es });
}
