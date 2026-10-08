// Game defects diagnosed by the QA suite. Each entry is written from runtime evidence (page errors, stack
// traces and state read through window.__BRAWL__), not from game source. QA.md links each entry to the failed
// checks whose detail contains one of its signatures. A check stays in the suite even when a defect is known.
export const DEFECTS = [
  {
    id: 'DEF-01',
    severity: 'high',
    title: 'Brawler preview canvas is force-context-lost on match start and reused by the next select screen',
    signatures: ["reading 'precision'"],
    evidence: [
      'Reproduced in a fresh page with real clicks: after START, the preview canvas (class preview-canvas) reports isContextLost() === true.',
      'Stack of the loseContext() call (runtime, served paths): toMatchmaking (src/game.js:549) > closePreview (src/game.js:539) > preview.dispose (src/entities/preview.js:89) > WebGLRenderer.forceContextLoss (three.module.js).',
      'The next visit to the select screen builds a new WebGLRenderer on the same canvas. The canvas returns the lost context, so three.js WebGLCapabilities throws "TypeError: Cannot read properties of null (reading \'precision\')" in getMaxPrecision.',
      'Seen on every select-screen visit after a match: checks D03, D04, D05 and D06 each record one page error at the select step, while the match flow itself still reaches playing.',
    ].join(' '),
    impact: 'Uncaught page error on each select-screen visit after the first match. The brawler preview renderer cannot be constructed on those visits, so the turntable does not render. Per the WebGL spec a lost context stays lost on its canvas, so this does not depend on the GPU.',
    fix: 'Do not force-lose the context of a canvas that will be reused. Either keep one preview renderer for the page lifetime and only pause its loop, or create a fresh canvas for each preview and dispose the old one completely.',
  },
];

// Returns the defects that explain at least one failed row (matched on the row detail text).
export function defectsFor(rows) {
  const failed = rows.filter((r) => r.status === 'FAIL');
  return DEFECTS.map((d) => ({
    ...d,
    checks: failed.filter((r) => d.signatures.some((sig) => r.detail.includes(sig))).map((r) => r.id),
  })).filter((d) => d.checks.length > 0);
}
