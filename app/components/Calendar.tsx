"use client";

import { DayPicker } from 'react-day-picker';
import { es } from 'date-fns/locale';
import { clsx } from 'clsx';

type Props = {
  selected?: Date;
  onSelect: (date: Date | undefined) => void;
  fromDate: Date;
  toDate: Date;
};

export function Calendar({ selected, onSelect, fromDate, toDate }: Props) {
  return (
    <div className="card">
      <div className="flex items-center justify-between mb-3">
        <div>
          <p className="text-xs uppercase tracking-wide text-slate-400">Calendario</p>
          <p className="text-lg font-semibold text-slate-100">Elige un día</p>
        </div>
        <span className="tag">Rango 30 días</span>
      </div>

      <DayPicker
        mode="single"
        locale={es}
        weekStartsOn={1}
        fromDate={fromDate}
        toDate={toDate}
        selected={selected}
        onSelect={onSelect}
        showOutsideDays
        classNames={{
          root: 'text-slate-100',
          months: 'flex flex-col',
          month: 'space-y-3',
          caption: 'flex justify-between items-center text-slate-200',
          caption_label: 'text-base font-semibold',
          nav: 'flex gap-2',
          nav_button: 'w-9 h-9 rounded-full bg-slate-800 hover:bg-slate-700 text-slate-100',
          nav_button_previous: 'flex items-center justify-center',
          nav_button_next: 'flex items-center justify-center',
          table: 'w-full border-collapse',
          head_row: 'grid grid-cols-7 text-sm text-slate-400',
          head_cell: 'text-center pb-2',
          row: 'grid grid-cols-7',
          cell: 'aspect-square p-1',
          day: clsx(
            'w-full h-full flex items-center justify-center rounded-xl text-sm font-semibold transition',
            'hover:bg-emerald-500 hover:text-slate-900 focus-visible:outline focus-visible:outline-2 focus-visible:outline-emerald-400'
          ),
          day_selected: 'bg-emerald-500 text-slate-900 shadow-lg',
          day_outside: 'text-slate-600 opacity-60',
          day_disabled: 'text-slate-700 opacity-40 cursor-not-allowed',
          day_today: 'border border-emerald-400',
          week: 'contents'
        }}
      />
    </div>
  );
}
