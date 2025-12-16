"use client";

import { ChangeEvent } from 'react';
import type { EventItem } from '../lib/storage/StorageDriver';

type Props = {
  events: EventItem[];
  value?: string;
  onChange: (eventId: string) => void;
  disabled?: boolean;
};

export function EventSelect({ events, value, onChange, disabled }: Props) {
  const handleChange = (event: ChangeEvent<HTMLSelectElement>) => {
    onChange(event.target.value);
  };

  return (
    <div className="field">
      <label className="text-sm text-slate-300">Evento</label>
      <select
        className="input"
        value={value ?? ''}
        onChange={handleChange}
        disabled={disabled}
        aria-label="Selecciona un evento"
      >
        {events.map((event) => (
          <option key={event.id} value={event.id}>
            {event.name}
          </option>
        ))}
      </select>
    </div>
  );
}
