"use client";

import { addDays, eachDayOfInterval, endOfWeek, format, isAfter, isBefore, isSameDay, isWeekend, startOfWeek } from 'date-fns';
import { clsx } from 'clsx';
import { useMemo } from 'react';

type Props = {
  selected?: Date[];
  onSelect: (dates: Date[]) => void;
  fromDate: Date;
  toDate: Date;
  windowLabel?: string;
};

export function Calendar({ selected = [], onSelect, fromDate, toDate, windowLabel }: Props) {
  const weeks = useMemo(() => {
    const start = startOfWeek(fromDate, { weekStartsOn: 1 });
    const end = endOfWeek(toDate, { weekStartsOn: 1 });
    const days = eachDayOfInterval({ start, end });
    const grouped: Date[][] = [];
    for (let i = 0; i < days.length; i += 7) {
      grouped.push(days.slice(i, i + 7));
    }
    return grouped;
  }, [fromDate, toDate]);

  const toggleDate = (day: Date) => {
    const isSelected = selected.some((d) => isSameDay(d, day));
    if (isSelected) {
      onSelect(selected.filter((d) => !isSameDay(d, day)));
    } else {
      onSelect([...selected, day]);
    }
  };

  const isDisabled = (day: Date) =>
    isBefore(day, fromDate) || isAfter(day, toDate) || !isWeekend(day);

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

        {weeks.map((week, index) => (
          <div key={index} className="grid grid-cols-7 gap-2">
            {week.map((day) => {
              const disabled = isDisabled(day);
              const active = selected.some((d) => isSameDay(d, day));
              const monthChange = day.getDate() <= 7; // show month tag near start
              return (
                <button
                  key={day.toISOString()}
                  type="button"
                  disabled={disabled}
                  onClick={() => toggleDate(day)}
                  className={clsx(
                    'h-12 rounded-lg border text-sm font-semibold transition',
                    'flex flex-col items-center justify-center gap-0.5',
                    active
                      ? 'bg-emerald-500 text-slate-900 border-emerald-400 shadow-lg'
                      : 'border-slate-700 bg-slate-800/70 text-slate-100 hover:border-emerald-400',
                    disabled && 'cursor-not-allowed opacity-40 hover:border-slate-700'
                  )}
                >
                  <span>{format(day, 'd')}</span>
                  {monthChange && <span className="text-[10px] uppercase">{format(day, 'MMM')}</span>}
                </button>
              );
            })}
          </div>
        ))}
      </div>
    </div>
  );
}
