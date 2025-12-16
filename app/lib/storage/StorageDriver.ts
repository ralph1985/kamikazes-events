export type EventItem = {
  id: string;
  name: string;
};

export type VoteResult = {
  day: string;
  votes: number;
};

export interface StorageDriver {
  getEvents(): Promise<EventItem[]>;
  createEvent(name: string): Promise<EventItem>;
  getResults(eventId: string): Promise<VoteResult[]>;
  vote(eventId: string, name: string, day: string): Promise<void>;
}
