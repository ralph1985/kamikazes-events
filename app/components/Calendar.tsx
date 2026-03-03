"use client";

import { addDays, eachDayOfInterval, endOfWeek, format, isAfter, isBefore, isSameDay, isSameMonth, startOfWeek } from 'date-fns';
import { eachMonthOfInterval, endOfMonth, startOfMonth } from 'date-fns';
import { es } from 'date-fns/locale';
import { clsx } from 'clsx';
import { useMemo } from 'react';
import { formatDayKey } from '../lib/dates';

type Props = {
  selected?: Date[];
  onSelect: (date: Date) => void;
  fromDate: Date;
  toDate: Date;
  windowLabel?: string;
  dayVotes?: Record<string, number>;
  loadingDayKey?: string | null;
  allowedDayKeys?: string[];
  disabled?: boolean;
};

export function Calendar({
  selected = [],
  onSelect,
  fromDate,
  toDate,
  windowLabel,
  dayVotes,
  loadingDayKey,
  allowedDayKeys = [],
  disabled = false
}: Props) {
  const allowedSet = useMemo(() => new Set(allowedDayKeys), [allowedDayKeys]);

  const weeks = useMemo(() => {
    const months = eachMonthOfInterval({ start: fromDate, end: toDate });
    return months.map((monthDate) => {
      const monthStart = startOfMonth(monthDate);
      const monthEnd = endOfMonth(monthDate);
      const gridStart = startOfWeek(monthStart, { weekStartsOn: 1 });
      const gridEnd = endOfWeek(monthEnd, { weekStartsOn: 1 });
      const days = eachDayOfInterval({ start: gridStart, end: gridEnd });
      const monthWeeks: Date[][] = [];

      for (let i = 0; i < days.length; i += 7) {
        monthWeeks.push(days.slice(i, i + 7));
      }

      return {
        key: format(monthDate, 'yyyy-MM'),
        label: format(monthDate, 'MMMM yyyy', { locale: es }),
        weeks: monthWeeks
      };
    });
  }, [fromDate, toDate]);

  const toggleDate = (day: Date) => {
    if (disabled || isDisabled(day)) return;
    onSelect(day);
  };

  const isDisabled = (day: Date) => {
    const key = formatDayKey(day);
    const outOfRange = isBefore(day, fromDate) || isAfter(day, toDate);
    if (outOfRange || disabled) return true;
    if (allowedSet.size > 0) {
      return !allowedSet.has(key);
    }
    return false;
  };

  return (
    <div className="card">
      <div className="flex items-center justify-between mb-3">
        <div>
          <p className="text-xs uppercase tracking-wide text-slate-400">Calendario</p>
          <p className="text-lg font-semibold text-slate-100">Elige tus días</p>
        </div>
        <span className="tag">{windowLabel ?? 'Rango activo'}</span>
      </div>

      <div className="space-y-2">
        <div className="grid grid-cols-7 text-center text-xs text-slate-400 uppercase">
          {['L', 'M', 'X', 'J', 'V', 'S', 'D'].map((label) => (
            <span key={label} className="py-1">
              {label}
            </span>
          ))}
        </div>

        {weeks.map((month) => (
          <div key={month.key} className="space-y-2">
            <div className="flex items-center gap-2 text-slate-300 text-sm font-semibold px-1">
              <span className="w-2 h-2 rounded-full bg-emerald-400"></span>
              <span>{month.label}</span>
            </div>
            {month.weeks.map((week, index) => (
              <div key={`${month.key}-${index}`} className="grid grid-cols-7 gap-2">
                {week.map((day) => {
                  const inCurrentMonth = isSameMonth(day, parseMonthDate(month.key));
                  if (!inCurrentMonth) {
                    return <div key={day.toISOString()} className="h-12" aria-hidden="true" />;
                  }
                  const disabled = isDisabled(day);
                  const active = selected.some((d) => isSameDay(d, day));
                  const voteCount = dayVotes?.[formatDayKey(day)] ?? 0;
                  const isLoading = loadingDayKey === formatDayKey(day);
                  return (
                    <button
                      key={day.toISOString()}
                      type="button"
                      disabled={disabled || isLoading}
                      onClick={() => toggleDate(day)}
                      className={clsx(
                        'h-12 rounded-lg border text-sm font-semibold transition',
                        'flex flex-col items-center justify-center gap-0.5',
                        active
                          ? 'bg-emerald-500 text-slate-900 border-emerald-400 shadow-lg'
                          : 'border-slate-700 bg-slate-800/70 text-slate-100 hover:border-emerald-400',
                        (disabled || isLoading) && 'cursor-not-allowed opacity-40 hover:border-slate-700'
                      )}
                    >
                      <span>{format(day, 'd')}</span>
                      {isLoading ? (
                        <span className="h-3 w-3 rounded-full border-2 border-emerald-200 border-t-transparent animate-spin" />
                      ) : (
                        <span className="text-[10px] text-emerald-200">{voteCount > 0 ? voteCount : ''}</span>
                      )}
                    </button>
                  );
                })}
              </div>
            ))}
          </div>
        ))}
      </div>
    </div>
  );
}

function parseMonthDate(monthKey: string): Date {
  const [year, month] = monthKey.split('-').map(Number);
  return new Date(year, (month || 1) - 1, 1);
}
