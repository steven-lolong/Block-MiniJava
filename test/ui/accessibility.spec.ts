import { expect, test } from '@playwright/test';
import { expectWorkbenchAccessibility } from './accessibility';
import { expectNoUncaughtErrors, openBottomPanel, openFreshApp, openHeaderMenu, toggleTheme } from './helpers';

test('lightweight accessibility contract covers landmarks, names, tabs, focus, and contrast in both themes', async ({ page }) => {
  const errors = await openFreshApp(page);
  await openBottomPanel(page);
  await expectWorkbenchAccessibility(page);
  await page.locator('#workspace-undo').focus();
  await page.keyboard.press('Tab');
  await expect(page.locator('#workspace-redo')).toBeFocused();
  const hasFocusRule = await page.evaluate(() => Array.from(document.styleSheets).some((sheet) => {
    try {
      return Array.from(sheet.cssRules).some((rule) => rule instanceof CSSStyleRule
        && rule.selectorText.includes('button:focus-visible')
        && rule.style.outline.includes('var(--focus-outline)'));
    } catch {
      return false;
    }
  }));
  expect(hasFocusRule).toBe(true);
  await toggleTheme(page);
  await expectWorkbenchAccessibility(page);
  expectNoUncaughtErrors(errors);
});

test('keyboard-only routes reach file, examples, toolbox search, Run, panels, perspective, and theme', async ({ page }) => {
  const errors = await openFreshApp(page);

  const file = page.locator('#file-menu-button');
  await file.focus();
  await file.press('ArrowDown');
  await expect(page.locator('#new-workspace')).toBeFocused();
  await page.keyboard.press('Escape');
  await expect(file).toBeFocused();

  const examples = page.locator('#examples-button');
  await examples.focus();
  await examples.press('ArrowDown');
  await expect(page.locator('#examples-panel [role="menuitem"]').first()).toBeFocused();
  await page.keyboard.press('Escape');

  await page.keyboard.press('Control+Shift+F');
  await expect(page.locator('#toolbox-search')).toBeFocused();
  await page.locator('#toolbox-search').pressSequentially('integer');
  await expect(page.locator('#toolbox-content [data-block-type="mj_expr_integer"]')).toBeVisible();
  await page.locator('#toolbox-search').fill('');

  await page.keyboard.press('Control+F5');
  await expect(page.locator('#bottom-tab-output')).toHaveAttribute('aria-selected', 'true');

  await page.locator('#tab-code').focus();
  await page.locator('#tab-code').press('ArrowRight');
  await expect(page.locator('#tab-typing')).toHaveAttribute('aria-selected', 'true');
  await page.locator('#tab-typing').press('ArrowRight');
  await expect(page.locator('#tab-outline')).toHaveAttribute('aria-selected', 'true');
  await page.locator('#tab-outline').press('Home');
  await expect(page.locator('#tab-code')).toHaveAttribute('aria-selected', 'true');

  await page.locator('#bottom-tab-output').focus();
  await page.locator('#bottom-tab-output').press('ArrowLeft');
  await expect(page.locator('#bottom-tab-problems')).toHaveAttribute('aria-selected', 'true');
  await page.locator('#bottom-tab-problems').press('End');
  await expect(page.locator('#bottom-tab-semantics')).toHaveAttribute('aria-selected', 'true');

  await openHeaderMenu(page, 'view');
  await page.locator('#perspective-select').focus();
  await page.locator('#perspective-select').press('Space');
  await page.locator('#perspective-select').press('ArrowDown');
  await page.locator('#perspective-select').press('Enter');
  await expect(page.locator('body')).toHaveAttribute('data-perspective', 'debug');
  await page.locator('#theme-toggle').focus();
  await page.locator('#theme-toggle').press('Space');
  await expect(page.locator('body')).toHaveAttribute('data-theme', 'light');
  await page.keyboard.press('Escape');

  expectNoUncaughtErrors(errors);
});

test('reduced-motion preference removes nonessential animation timing', async ({ page }) => {
  await page.emulateMedia({ reducedMotion: 'reduce' });
  const errors = await openFreshApp(page);
  const duration = await page.locator('#run-program').evaluate((element) => getComputedStyle(element).transitionDuration);
  expect(Number.parseFloat(duration)).toBeGreaterThan(0);
  expect(Number.parseFloat(duration)).toBeLessThanOrEqual(0.01);
  expectNoUncaughtErrors(errors);
});
