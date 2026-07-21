import { expect, type Page } from '@playwright/test';

export function monitorUncaughtErrors(page: Page): string[] {
  const errors: string[] = [];
  page.on('pageerror', (error) => errors.push(error.stack || error.message));
  return errors;
}

export function expectNoUncaughtErrors(errors: string[]): void {
  expect(errors, 'uncaught browser errors').toEqual([]);
}

export async function openFreshApp(page: Page): Promise<string[]> {
  const errors = monitorUncaughtErrors(page);
  await page.goto('/');
  // Clearing after the first navigation and reloading avoids an init script
  // that would also erase state during the persistence tests' later reloads.
  await page.evaluate(() => localStorage.clear());
  await page.reload();
  await expect(page.locator('#app')).toBeVisible();
  await expect(page.locator('#blockly-div .blocklySvg')).toBeVisible();
  await expect(page.locator('#bottom-tab-problems')).toBeAttached();
  return errors;
}

export async function openPersistedApp(page: Page): Promise<string[]> {
  const errors = monitorUncaughtErrors(page);
  await page.goto('/');
  await expect(page.locator('#app')).toBeVisible();
  await expect(page.locator('#blockly-div .blocklySvg')).toBeVisible();
  await expect(page.locator('#bottom-tab-problems')).toBeAttached();
  return errors;
}

export async function openBottomPanel(page: Page): Promise<void> {
  const dock = page.locator('#viz-dock');
  if (await dock.getAttribute('data-open') !== 'true') await page.locator('#toggle-viz-dock').click();
  await expect(dock).toHaveAttribute('data-open', 'true');
}

export async function selectBottomTab(page: Page, kind: string): Promise<void> {
  await page.locator(`#bottom-tab-${kind}`).click();
  await expect(page.locator(`#bottom-tab-${kind}`)).toHaveAttribute('aria-selected', 'true');
  await expect(page.locator(`#bottom-panel-${kind}`)).not.toHaveAttribute('hidden', '');
}
