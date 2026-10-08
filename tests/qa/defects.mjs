// Game defects found by the QA suite. Each entry is written from runtime evidence (page errors, stack traces and
// state read through window.__BRAWL__), not from game source. A failed check whose detail contains one of the
// signatures is linked to the defect. A fixed defect stays in the registry with the checks that verify it; if its
// signature shows up in a failed check again, it is reported as REGRESSED and listed as open.
export const DEFECTS = [
  {
    id: 'DEF-01',
    severity: 'high',
    status: 'fixed',
    title: 'Brawler preview canvas is force-context-lost on match start and reused by the next select screen',
    signatures: ["reading 'precision'"],
    verifiedBy: ['D03', 'D04', 'D05', 'D06', 'D19', 'D20'],
    evidence: [
      'Reproduced in a fresh page with real clicks: after START, the preview canvas (class preview-canvas) reports isContextLost() === true.',
      'Stack of the loseContext() call (runtime, served paths): toMatchmaking (src/game.js:549) > closePreview (src/game.js:539) > preview.dispose (src/entities/preview.js:89) > WebGLRenderer.forceContextLoss (three.module.js).',
      'The next visit to the select screen builds a new WebGLRenderer on the same canvas. The canvas returns the lost context, so three.js WebGLCapabilities throws "TypeError: Cannot read properties of null (reading \'precision\')" in getMaxPrecision.',
      'Seen on every select-screen visit after a match: checks D03, D04, D05 and D06 each recorded one page error at the select step, while the match flow itself still reached playing.',
    ].join(' '),
    impact: 'Uncaught page error on each select-screen visit after the first match. The brawler preview renderer could not be constructed on those visits, so the turntable did not render. Per the WebGL spec a lost context stays lost on its canvas, so this did not depend on the GPU.',
    fix: 'Do not force-lose the context of a canvas that will be reused. Either keep one preview renderer for the page lifetime and only pause its loop, or create a fresh canvas for each preview and dispose the old one completely.',
    fixNote: 'Fixed in the game (reported by the coordinator): the preview renderer is kept and paused and no longer force-loses its context. D20 checks that the preview canvas context is still live after matches and select visits.',
  },
];

// Splits the registry against one run's rows.
// open: unfixed defects, plus fixed defects whose signature failed again (marked regressed).
// fixed: fixed defects with no failing signature, with the status of the checks that verify them.
export function classifyDefects(rows) {
  const failed = rows.filter((r) => r.status === 'FAIL');
  const byId = new Map(rows.map((r) => [r.id, r]));
  const open = [];
  const fixed = [];
  for (const d of DEFECTS) {
    const checks = failed
      .filter((r) => d.signatures.some((sig) => r.detail.includes(sig)))
      .map((r) => r.id);
    if (d.status === 'fixed' && checks.length === 0) {
      const verified = d.verifiedBy.map((id) => ({ id, status: byId.has(id) ? byId.get(id).status : 'not run' }));
      fixed.push({ ...d, verified });
    } else {
      open.push({ ...d, checks, regressed: d.status === 'fixed' });
    }
  }
  return { open, fixed };
}
