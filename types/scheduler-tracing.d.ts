declare module 'scheduler/tracing' {
  export interface Interaction {
    id: number;
    name: string;
    timestamp: number;
  }

  export function unstable_clearCallbacks(): void;
  export function unstable_getCurrent(): Set<Interaction>;
  export function unstable_getThreadID(): number;
  export function unstable_subscribe(callback: (interactions: Set<Interaction>) => void): void;
  export function unstable_trace<T>(name: string, timestamp: number, callback: () => T): T;
  export function unstable_wrap<TArgs extends any[], TReturn>(
    callback: (...args: TArgs) => TReturn
  ): (...args: TArgs) => TReturn;
  export function unstable_unsubscribe(callback: (interactions: Set<Interaction>) => void): void;
}
