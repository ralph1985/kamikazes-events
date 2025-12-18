import { STORAGE_KEYS } from './constants';

const CLIENT_ID_KEY = STORAGE_KEYS.clientId;
const VOTER_NAME_KEY = STORAGE_KEYS.voterName;
const SELECTED_EVENT_KEY = STORAGE_KEYS.selectedEventId;

function randomId(): string {
  return crypto.randomUUID ? crypto.randomUUID() : Math.random().toString(36).slice(2, 10);
}

export function getClientId(): string {
  if (typeof window === 'undefined') return '';
  const existing = localStorage.getItem(CLIENT_ID_KEY);
  if (existing) return existing;
  const id = randomId();
  localStorage.setItem(CLIENT_ID_KEY, id);
  return id;
}

export function getStoredName(): string {
  if (typeof window === 'undefined') return '';
  return localStorage.getItem(VOTER_NAME_KEY) ?? '';
}

export function saveName(name: string) {
  if (typeof window === 'undefined') return;
  localStorage.setItem(VOTER_NAME_KEY, name);
}

export function setClientId(id: string) {
  if (typeof window === 'undefined') return;
  localStorage.setItem(CLIENT_ID_KEY, id);
}

export function getStoredEvent(): string {
  if (typeof window === 'undefined') return '';
  return localStorage.getItem(SELECTED_EVENT_KEY) ?? '';
}

export function saveEvent(eventId: string) {
  if (typeof window === 'undefined') return;
  localStorage.setItem(SELECTED_EVENT_KEY, eventId);
}

export function clearClientData() {
  if (typeof window === 'undefined') return;
  localStorage.removeItem(CLIENT_ID_KEY);
  localStorage.removeItem(VOTER_NAME_KEY);
  localStorage.removeItem(SELECTED_EVENT_KEY);
}

export const localStorageKeys = {
  clientId: CLIENT_ID_KEY,
  voterName: VOTER_NAME_KEY,
  selectedEvent: SELECTED_EVENT_KEY
};
