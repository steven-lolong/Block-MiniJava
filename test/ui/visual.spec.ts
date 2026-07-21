import { expect, test } from '@playwright/test';
import { expectNoUncaughtErrors, openFreshApp } from './helpers';

async function capture(page: Parameters<typeof openFreshApp>[0], name: string): Promise<void> {
  await expect(page).toHaveScreenshot(name, { animations: 'disabled', caret: 'hide' });
}

test('light Edit at 1440 × 900', async ({ page }) => {
  const errors = await openFreshApp(page);
  await page.locator('.theme-switch').click();
  await capture(page, 'light-edit-1440x900.png');
  expectNoUncaughtErrors(errors);
});

test('dark Edit at 1440 × 900', async ({ page }) => {
  const errors = await openFreshApp(page);
  await capture(page, 'dark-edit-1440x900.png');
  expectNoUncaughtErrors(errors);
});

test('dark Debug at 1440 × 900', async ({ page }) => {
  const errors = await openFreshApp(page);
  await page.locator('#perspective-select').selectOption('debug');
  await capture(page, 'dark-debug-1440x900.png');
  expectNoUncaughtErrors(errors);
});

test('light Type Analysis at 1440 × 900', async ({ page }) => {
  const errors = await openFreshApp(page);
  await page.locator('.theme-switch').click();
  await page.locator('#perspective-select').selectOption('types');
  await capture(page, 'light-types-1440x900.png');
  expectNoUncaughtErrors(errors);
});

test('dark Presentation at 1440 × 900', async ({ page }) => {
  const errors = await openFreshApp(page);
  await page.locator('#perspective-select').selectOption('presentation');
  await capture(page, 'dark-presentation-1440x900.png');
  expectNoUncaughtErrors(errors);
});

test('dark Edit at 1024 × 768', async ({ page }) => {
  await page.setViewportSize({ width: 1024, height: 768 });
  const errors = await openFreshApp(page);
  await capture(page, 'dark-edit-1024x768.png');
  expectNoUncaughtErrors(errors);
});

test('dark Edit at 768 × 1024', async ({ page }) => {
  await page.setViewportSize({ width: 768, height: 1024 });
  const errors = await openFreshApp(page);
  await capture(page, 'dark-edit-768x1024.png');
  expectNoUncaughtErrors(errors);
});

test('dark mobile sidebar at 390 × 844', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  const errors = await openFreshApp(page);
  await page.locator('#activity-search').click();
  await capture(page, 'dark-mobile-sidebar-390x844.png');
  expectNoUncaughtErrors(errors);
});
