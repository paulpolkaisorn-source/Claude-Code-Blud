/** Tick-based timeline for delayed actions (windups, delayed hits, timed effects). Pure. */
export interface ScheduledTask {
  id: number;
  tick: number;
  ownerId: string | null;
  tag: string;
  /** Cancelled when the owner is stunned (windups). */
  stunCancels: boolean;
  fn: () => void;
}

export class Scheduler {
  private tasks: ScheduledTask[] = [];
  private nextId = 1;

  schedule(tick: number, fn: () => void, opts: { ownerId?: string | null; tag?: string; stunCancels?: boolean } = {}): number {
    const t: ScheduledTask = { id: this.nextId++, tick, ownerId: opts.ownerId ?? null, tag: opts.tag ?? "", stunCancels: opts.stunCancels ?? false, fn };
    this.tasks.push(t);
    return t.id;
  }

  /** Runs every task due at or before `now`, in scheduling order. Tasks scheduled while running wait for the next call. */
  run(now: number): void {
    if (this.tasks.length === 0) return;
    const due: ScheduledTask[] = [];
    const rest: ScheduledTask[] = [];
    for (const t of this.tasks) (t.tick <= now ? due : rest).push(t);
    if (due.length === 0) return;
    this.tasks = rest;
    due.sort((a, b) => a.tick - b.tick || a.id - b.id);
    for (const t of due) t.fn();
  }

  cancel(id: number): boolean {
    const n = this.tasks.length;
    this.tasks = this.tasks.filter((t) => t.id !== id);
    return this.tasks.length !== n;
  }

  /** Cancels tasks of an owner, optionally only those with a tag prefix or the stun-cancellable ones. */
  cancelOwner(ownerId: string, filter: { tagPrefix?: string; stunOnly?: boolean } = {}): number {
    const n = this.tasks.length;
    this.tasks = this.tasks.filter((t) => {
      if (t.ownerId !== ownerId) return true;
      if (filter.stunOnly && !t.stunCancels) return true;
      if (filter.tagPrefix !== undefined && !t.tag.startsWith(filter.tagPrefix)) return true;
      return false;
    });
    return n - this.tasks.length;
  }

  has(ownerId: string, tagPrefix: string): boolean {
    return this.tasks.some((t) => t.ownerId === ownerId && t.tag.startsWith(tagPrefix));
  }

  clear(): void {
    this.tasks = [];
  }

  get size(): number {
    return this.tasks.length;
  }
}
