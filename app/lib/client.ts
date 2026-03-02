import { STORAGE_KEYS } from './constants';

const CLIENT_ID_KEY = STORAGE_KEYS.clientId;
const VOTER_NAME_KEY = STORAGE_KEYS.voterName;
const SELECTED_EVENT_KEY = STORAGE_KEYS.selectedEventId;
const VOTER_WEIGHT_KEY = STORAGE_KEYS.voterWeight;
const STORAGE_RESET_20260301_DONE_KEY = STORAGE_KEYS.storageReset20260301Done;
const STORAGE_RESET_20260301_AT = Date.parse('2026-03-01T00:00:00Z');

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

export function getStoredWeight(): number {
  if (typeof window === 'undefined') return 1;
  const raw = localStorage.getItem(VOTER_WEIGHT_KEY);
  const parsed = raw ? Number(raw) : NaN;
  return Number.isFinite(parsed) && parsed > 0 ? parsed : 1;
}

export function saveWeight(weight: number) {
  if (typeof window === 'undefined') return;
  const safe = Number.isFinite(weight) && weight > 0 ? weight : 1;
  localStorage.setItem(VOTER_WEIGHT_KEY, String(safe));
}

export function clearClientData() {
  if (typeof window === 'undefined') return;
  localStorage.removeItem(CLIENT_ID_KEY);
  localStorage.removeItem(VOTER_NAME_KEY);
  localStorage.removeItem(SELECTED_EVENT_KEY);
  localStorage.removeItem(VOTER_WEIGHT_KEY);
}

export function runStorageResetMigration(now: Date = new Date()) {
  if (typeof window === 'undefined') return false;
  if (now.getTime() < STORAGE_RESET_20260301_AT) return false;
  const alreadyDone = localStorage.getItem(STORAGE_RESET_20260301_DONE_KEY) === '1';
  if (alreadyDone) return false;

  clearClientData();
  window.sessionStorage.clear();
  localStorage.setItem(STORAGE_RESET_20260301_DONE_KEY, '1');
  return true;
}

export const localStorageKeys = {
  clientId: CLIENT_ID_KEY,
  voterName: VOTER_NAME_KEY,
  selectedEvent: SELECTED_EVENT_KEY
};
