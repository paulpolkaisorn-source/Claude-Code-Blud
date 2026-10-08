import type { FormationId, SectionId, Theme, Tier } from './types';

/** Every event on the page and the payload it carries. A `void` event is emitted with no argument. */
export interface Events {
  'loader:progress': number; // 0..1, never ahead of real progress
  'loader:done': void;
  'section:enter': SectionId;
  'section:leave': SectionId;
  'theme': Theme;
  'quality': Tier;
  'formation': FormationId;
}

export type EventName = keyof Events;

type Payload<K extends EventName> = Events[K] extends void ? [] : [Events[K]];

export interface EventBus {
  /** Calls fn on every later emit of k. Returns the function that unsubscribes it. */
  on<K extends EventName>(k: K, fn: (v: Events[K]) => void): () => void;
  /** Like on, but fn runs for the next emit of k only. */
  once<K extends EventName>(k: K, fn: (v: Events[K]) => void): () => void;
  /**
   * Synchronous. Listeners run in subscription order. A listener that throws is logged with
   * console.error and the remaining listeners still run. Subscriptions made during an emit first
   * run on the next emit; unsubscribing during an emit takes effect from the next emit.
   */
  emit<K extends EventName>(k: K, ...v: Payload<K>): void;
  /** The most recent value emitted for k, or undefined if k has not been emitted yet. */
  last<K extends EventName>(k: K): Events[K] | undefined;
}

// Storage is erased to unknown here. The typed surface is EventBus, and each event's payload type
// is enforced there, so the casts at the boundaries below cannot leak a wrong payload to a caller.
type AnyListener = (v: unknown) => void;

interface Subscription {
  readonly fn: AnyListener;
  readonly once: boolean;
  spent: boolean;
}

// Each event's list is replaced on every change and never mutated in place, so an emit that is
// already running keeps iterating the list it started with.
const subs: Record<EventName, Subscription[]> = {
  'loader:progress': [],
  'loader:done': [],
  'section:enter': [],
  'section:leave': [],
  'theme': [],
  'quality': [],
  'formation': [],
};
const latest: Partial<Record<EventName, unknown>> = {};

function attach<K extends EventName>(k: K, fn: (v: Events[K]) => void, once: boolean): () => void {
  const sub: Subscription = { fn: fn as AnyListener, once, spent: false };
  subs[k] = [...subs[k], sub];
  return () => {
    const list = subs[k];
    if (list.includes(sub)) subs[k] = list.filter((s) => s !== sub);
  };
}

function emit<K extends EventName>(k: K, ...v: Payload<K>): void {
  const value: unknown = (v as unknown[])[0];
  latest[k] = value;
  const list = subs[k];
  for (let i = 0; i < list.length; i += 1) {
    const sub = list[i];
    // A once-listener can still sit in this snapshot after a nested emit has fired it.
    if (sub.spent) continue;
    if (sub.once) {
      sub.spent = true;
      subs[k] = subs[k].filter((s) => s !== sub);
    }
    try {
      sub.fn(value);
    } catch (err) {
      console.error(`[bus] a listener for "${k}" threw; the other listeners still ran`, err);
    }
  }
}

function last<K extends EventName>(k: K): Events[K] | undefined {
  return latest[k] as Events[K] | undefined;
}

export const bus: EventBus = {
  on: (k, fn) => attach(k, fn, false),
  once: (k, fn) => attach(k, fn, true),
  emit,
  last,
};
