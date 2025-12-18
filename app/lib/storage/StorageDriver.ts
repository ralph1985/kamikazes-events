export type EventItem = {
  id: string;
  name: string;
  window: {
    start: string; // YYYY-MM-DD
    end: string; // YYYY-MM-DD
  };
};

export type VoteResult = {
  day: string;
  votes: number;
};

export type VoterSelection = {
  name: string;
  days: string[];
  weight?: number;
};

export type VoterInfo = {
  id: string;
  name: string;
};

export interface StorageDriver {
  getEvents(): Promise<EventItem[]>;
  createEvent(name: string, window?: EventItem['window']): Promise<EventItem>;
  getResults(eventId: string): Promise<VoteResult[]>;
  vote(eventId: string, voterId: string, name: string, days: string[]): Promise<void>;
  getSelection(eventId: string, voterId: string): Promise<string[]>;
  getVotersByDay(eventId: string, day: string): Promise<string[]>;
  setVoterName(eventId: string, voterId: string, name: string): Promise<void>;
   setVoterWeight(eventId: string, voterId: string, weight: number): Promise<void>;
   getVoterWeight(eventId: string, voterId: string): Promise<number>;
  getVotersSelections(eventId: string): Promise<VoterSelection[]>;
  listVoters(): Promise<VoterInfo[]>;
}
