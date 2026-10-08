import { expect, test, type Page } from '@playwright/test';
import { collectProblems } from './helpers/console';

// Generic smoke test. It checks only what the scaffold and the finished page both
// have (one h1, main#main, data-boot), so it keeps working once real sections
// replace the scaffold.

const BOOT_TIMEOUT_MS = 15_000;
const SCROLL_RATIO = 0.8; // one step = 0.8 * innerHeight
const SCROLL_PAUSE_MS = 120;
const MAX_SCROLL_STEPS = 200; // bounds each sweep so a runaway page cannot hang the run

interface Layout {
  scrollY: number;
  maxScroll: number;
  step: number;
  centerX: number;
  centerY: number;
}

const pause = (ms: number): Promise<void> => new Promise((resolve) => setTimeout(resolve, ms));

async function layout(page: Page): Promise<Layout> {
  return page.evaluate(
    (ratio: number) => ({
      scrollY: window.scrollY,
      maxScroll: Math.max(0, document.documentElement.scrollHeight - window.innerHeight),
      step: Math.round(window.innerHeight * ratio),
      centerX: Math.round(window.innerWidth / 2),
      centerY: Math.round(window.innerHeight / 2),
    }),
    SCROLL_RATIO,
  );
}

/**
 * Scrolls in one direction in fixed steps, pausing between steps, until the edge is
 * reached. Desktop uses the mouse wheel; touch emulation uses window.scrollBy.
 * Returns false if the edge was not reached within MAX_SCROLL_STEPS.
 */
async function sweep(page: Page, direction: 1 | -1, useWheel: boolean): Promise<boolean> {
  for (let i = 0; i < MAX_SCROLL_STEPS; i++) {
    const at = await layout(page);
    const atEdge = direction === 1 ? at.scrollY >= at.maxScroll - 2 : at.scrollY <= 1;
    if (atEdge) return true;
    const dy = direction * at.step;
    if (useWheel) {
      await page.mouse.wheel(0, dy);
    } else {
      await page.evaluate((amount: number) => window.scrollBy(0, amount), dy);
    }
    await pause(SCROLL_PAUSE_MS);
  }
  return false;
}

async function expectNoHorizontalOverflow(page: Page, when: string): Promise<void> {
  const { scrollWidth, innerWidth } = await page.evaluate(() => ({
    scrollWidth: document.documentElement.scrollWidth,
    innerWidth: window.innerWidth,
  }));
  expect
    .soft(scrollWidth, `no horizontal overflow ${when} (scrollWidth ${scrollWidth}, innerWidth ${innerWidth})`)
    .toBeLessThanOrEqual(innerWidth);
}

test('boots, renders one h1, scrolls the full page without errors', async ({ page }, testInfo) => {
  // Listeners go on before navigation so problems raised during load are recorded.
  const problems = collectProblems(page);
  // Mouse wheel on desktop, window.scrollBy on touch-emulated mobile.
  const useWheel = testInfo.project.use.isMobile !== true;
  // A full-page sweep with 120 ms pauses can run slowly on a WebGL page on software GL.
  test.setTimeout(90_000);

  const response = await page.goto('/', { waitUntil: 'load' });
  expect(response?.ok(), 'GET / returns a 2xx status').toBe(true);
  await page.waitForFunction(() => document.documentElement.dataset.boot === 'ok', undefined, {
    timeout: BOOT_TIMEOUT_MS,
  });

  await expect.soft(page.locator('h1'), 'exactly one h1 on the page').toHaveCount(1);
  await expect.soft(page.locator('main#main'), 'main#main is visible').toBeVisible();
  await expectNoHorizontalOverflow(page, 'after load');

  const start = await layout(page);
  if (useWheel) await page.mouse.move(start.centerX, start.centerY);

  expect.soft(await sweep(page, 1, useWheel), 'scrolls to the bottom of the page').toBe(true);
  await expectNoHorizontalOverflow(page, 'at the bottom');

  expect.soft(await sweep(page, -1, useWheel), 'scrolls back to the top of the page').toBe(true);
  await page.evaluate(() => window.scrollTo(0, 0));

  problems.assertClean();
});
