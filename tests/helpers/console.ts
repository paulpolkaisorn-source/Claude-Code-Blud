import type { ConsoleMessage, Page, Request } from '@playwright/test';

export type ProblemKind = 'console.error' | 'console.warning' | 'pageerror' | 'requestfailed';

export interface Problem {
  kind: ProblemKind;
  text: string;
}

export interface ProblemCollector {
  /** Every problem recorded so far, in arrival order. */
  readonly problems: Problem[];
  /** Throws a readable list if anything was recorded. */
  assertClean(): void;
}

/**
 * Records console errors and warnings, uncaught page errors and failed requests
 * for one page. Call it before navigating so nothing emitted during load is missed.
 * Nothing is ignored unless it matches a RegExp in `allow`; matches are dropped.
 */
export function collectProblems(page: Page, allow: readonly RegExp[] = []): ProblemCollector {
  const problems: Problem[] = [];

  const record = (kind: ProblemKind, text: string): void => {
    if (allow.some((re) => text.search(re) !== -1)) return;
    problems.push({ kind, text });
  };

  page.on('console', (msg: ConsoleMessage) => {
    const type = msg.type();
    if (type !== 'error' && type !== 'warning') return;
    const kind: ProblemKind = type === 'error' ? 'console.error' : 'console.warning';
    const loc = msg.location();
    const where = loc.url ? ` (${loc.url}:${loc.lineNumber}:${loc.columnNumber})` : '';
    record(kind, `${msg.text()}${where}`);
  });

  page.on('pageerror', (err: Error) => {
    record('pageerror', err.stack ?? err.message);
  });

  page.on('requestfailed', (req: Request) => {
    const reason = req.failure()?.errorText ?? 'unknown failure';
    record('requestfailed', `${req.method()} ${req.url()} - ${reason}`);
  });

  return {
    problems,
    assertClean(): void {
      if (problems.length === 0) return;
      const list = problems.map((p, i) => `  ${i + 1}. [${p.kind}] ${p.text}`).join('\n');
      throw new Error(`Browser reported ${problems.length} problem(s):\n${list}`);
    },
  };
}
