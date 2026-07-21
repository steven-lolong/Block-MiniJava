import { expect, test } from '@playwright/test';
import {
  expectNoUncaughtErrors,
  openHeaderMenu,
  openBottomPanel,
  openFreshApp,
  openPersistedApp,
  selectBottomTab,
  selectPerspective,
  toggleTheme
} from './helpers';

test('loads without uncaught browser errors and has no duplicate IDs', async ({ page }) => {
  const errors = await openFreshApp(page);
  await expect(page.locator('#run-program')).toBeVisible();
  await expect(page.locator('#toolbox-column')).toBeVisible();
  const duplicateIds = await page.locator('[id]').evaluateAll((elements) => {
    const counts = new Map();
    for (const element of elements) counts.set(element.id, (counts.get(element.id) || 0) + 1);
    return [...counts.entries()].filter(([, count]) => count > 1).map(([id]) => id);
  });
  expect(duplicateIds).toEqual([]);
  expectNoUncaughtErrors(errors);
});

test('header menus and compact status preserve global command reachability', async ({ page }) => {
  const errors = await openFreshApp(page);
  await expect(page.locator('.brand-name')).toHaveText('Block-MiniJava');
  await expect(page.locator('.project-name')).toBeVisible();
  for (const label of ['File', 'Examples', 'Run', 'View', 'More']) {
    await expect(page.getByRole('button', { name: new RegExp(`^${label}`) }).first()).toBeVisible();
  }

  const fileButton = page.locator('#file-menu-button');
  await fileButton.focus();
  await fileButton.press('ArrowDown');
  await expect(page.locator('#new-workspace')).toBeFocused();
  for (const id of ['new-workspace', 'load-workspace', 'save-workspace', 'export-code', 'load-autosave']) {
    await expect(page.locator(`#${id}`)).toBeVisible();
  }
  await page.keyboard.press('Escape');
  await expect(fileButton).toBeFocused();

  const examplesButton = page.locator('#examples-button');
  await examplesButton.focus();
  await examplesButton.press('ArrowDown');
  await expect(page.locator('#examples-panel [role="menuitem"]').first()).toBeFocused();
  await page.keyboard.press('Escape');

  await openHeaderMenu(page, 'view');
  for (const id of ['view-toggle-sidebar', 'view-toggle-inspector', 'top-toggle-bottom-panel', 'perspective-select', 'theme-toggle', 'status-perspective']) {
    await expect(page.locator(`#${id}`)).toBeVisible();
  }
  await page.keyboard.press('Escape');
  await openHeaderMenu(page, 'more');
  await expect(page.locator('#command-palette-trigger')).toBeVisible();
  await expect(page.locator('#about-button')).toBeVisible();
  await page.keyboard.press('Escape');

  const status = page.locator('.workspace-footer');
  await expect(status.locator('#status-block-count')).toBeVisible();
  await expect(status.locator('#status-problems-count')).toBeVisible();
  await expect(status.locator('#autosave-status')).toBeVisible();
  await expect(status.locator('#status-perspective')).toHaveCount(0);
  await expect(status).not.toContainText('BMJ-Thrasos');
  expectNoUncaughtErrors(errors);
});

test('desktop sidebar and inspector can be hidden and restored', async ({ page }) => {
  const errors = await openFreshApp(page);
  await page.locator('#toggle-toolbox').click();
  await expect(page.locator('body')).toHaveClass(/toolbox-hidden/);
  await page.locator('#show-toolbox-button').click();
  await expect(page.locator('body')).not.toHaveClass(/toolbox-hidden/);

  await page.locator('#toggle-code-column').click();
  await expect(page.locator('body')).toHaveClass(/code-hidden/);
  await page.locator('#show-code-button').click();
  await expect(page.locator('body')).not.toHaveClass(/code-hidden/);
  expectNoUncaughtErrors(errors);
});

test('primary Run opens Output and command palette exposes registered commands', async ({ page }) => {
  const errors = await openFreshApp(page);
  await page.locator('#header-run-program').click();
  await expect(page.locator('#viz-dock')).toHaveAttribute('data-open', 'true');
  await expect(page.locator('#bottom-tab-output')).toHaveAttribute('aria-selected', 'true');
  await expect(page.locator('#bottom-program-output')).toContainText('[Run]');

  await page.keyboard.press('Control+Shift+P');
  await expect(page.locator('#command-palette-overlay')).not.toHaveAttribute('hidden', '');
  await expect(page.locator('.command-palette-option[data-command-id="run.program"]')).toBeVisible();
  await expect(page.locator('.command-palette-option')).toHaveCount(22);
  await page.keyboard.press('Escape');
  await expect(page.locator('#command-palette-overlay')).toHaveAttribute('hidden', '');
  expectNoUncaughtErrors(errors);
});

test('perspectives coordinate activity, inspector, and bottom panel', async ({ page }) => {
  const errors = await openFreshApp(page);
  await selectPerspective(page, 'debug');
  await expect(page.locator('body')).toHaveAttribute('data-perspective', 'debug');
  await expect(page.locator('#tab-outline')).toHaveAttribute('aria-selected', 'true');
  await expect(page.locator('#bottom-tab-machine')).toHaveAttribute('aria-selected', 'true');

  await selectPerspective(page, 'types');
  await expect(page.locator('body')).toHaveAttribute('data-perspective', 'types');
  await expect(page.locator('#bottom-tab-problems')).toHaveAttribute('aria-selected', 'true');

  await selectPerspective(page, 'presentation');
  await expect(page.locator('body')).toHaveClass(/presentation-mode/);
  await selectPerspective(page, 'edit');
  await expect(page.locator('body')).toHaveAttribute('data-perspective', 'edit');
  await expect(page.locator('#tab-code')).toHaveAttribute('aria-selected', 'true');
  expectNoUncaughtErrors(errors);
});

test('bottom panel opens, closes, maximizes, and reaches every documented view', async ({ page }) => {
  const errors = await openFreshApp(page);
  await openBottomPanel(page);
  for (const kind of ['problems', 'output', 'structure', 'value', 'machine', 'compare', 'subst']) {
    await selectBottomTab(page, kind);
  }
  await page.locator('#viz-maximize').click();
  await expect(page.locator('body')).toHaveClass(/bottom-maximized/);
  await page.locator('#viz-collapse').click();
  await expect(page.locator('#viz-dock')).toHaveAttribute('data-open', 'false');
  await expect(page.locator('body')).not.toHaveClass(/bottom-maximized/);
  expectNoUncaughtErrors(errors);
});

test('Code, Types, Outline, Problems, Output, and runtime controls remain reachable', async ({ page }) => {
  const errors = await openFreshApp(page);
  for (const panel of ['code', 'typing', 'outline']) {
    await page.locator(`#tab-${panel === 'typing' ? 'typing' : panel}`).click();
    await expect(page.locator(`#panel-${panel}`)).toHaveClass(/is-active/);
  }
  await openBottomPanel(page);
  await selectBottomTab(page, 'problems');
  await selectBottomTab(page, 'output');
  await selectBottomTab(page, 'machine');
  await expect(page.locator('#stepper-load')).toBeVisible();
  await selectBottomTab(page, 'compare');
  await expect(page.locator('#compare-load')).toBeVisible();
  await selectBottomTab(page, 'subst');
  await expect(page.locator('#subst-load')).toBeVisible();
  expectNoUncaughtErrors(errors);
});

test('keyboard resizers change and persist panel dimensions and visibility state', async ({ page }) => {
  const errors = await openFreshApp(page);
  const readState = () => page.evaluate(() => ({
    sidebar: getComputedStyle(document.documentElement).getPropertyValue('--ide-primary-sidebar-width').trim(),
    code: getComputedStyle(document.documentElement).getPropertyValue('--ide-code-panel-width').trim(),
    bottom: getComputedStyle(document.documentElement).getPropertyValue('--ide-bottom-panel-height').trim()
  }));
  const before = await readState();
  await page.locator('#sidebar-resizer').press('ArrowRight');
  await page.locator('#code-resizer').press('ArrowLeft');
  await openBottomPanel(page);
  await page.locator('#viz-resizer').press('ArrowUp');
  const after = await readState();
  expect(after.sidebar).not.toBe(before.sidebar);
  expect(after.code).not.toBe(before.code);
  expect(after.bottom).not.toBe(before.bottom);

  await page.locator('#toggle-toolbox').click();
  await page.locator('#toggle-code-column').click();
  await page.reload();
  await expect(page.locator('body')).toHaveClass(/toolbox-hidden/);
  await expect(page.locator('body')).toHaveClass(/code-hidden/);
  expect(await page.evaluate(() => localStorage.getItem('block-minijava.layout.sidebar.width'))).not.toBeNull();
  expect(await page.evaluate(() => localStorage.getItem('block-minijava.code.width'))).not.toBeNull();
  expectNoUncaughtErrors(errors);
});

test('theme and autosave interval remain configurable and restore after reload', async ({ page }) => {
  const errors = await openFreshApp(page);
  await toggleTheme(page);
  await expect(page.locator('body')).toHaveAttribute('data-theme', 'light');
  await page.locator('#activity-settings').click();
  const interval = page.locator('#autosave-interval');
  await interval.focus();
  await interval.press('ArrowRight');
  await expect(page.locator('#autosave-interval-label')).toContainText('3 minutes');
  await page.reload();
  await expect(page.locator('body')).toHaveAttribute('data-theme', 'light');
  await expect(interval).toHaveValue('3');
  await toggleTheme(page);
  await expect(page.locator('body')).toHaveAttribute('data-theme', 'dark');
  expectNoUncaughtErrors(errors);
});

test('global keyboard shortcuts invoke file, palette, search, bottom-tool, and Run commands', async ({ page }) => {
  const errors = await openFreshApp(page);
  const beforeNew = await page.locator('#status-block-count').textContent();
  await page.locator('#toolbox-content [data-block-type="mj_expr_integer"]').click();
  await expect(page.locator('#status-block-count')).not.toHaveText(beforeNew || '');
  await page.keyboard.press('Control+N');
  await expect(page.locator('#status-block-count')).toHaveText(beforeNew || '');

  const chooser = page.waitForEvent('filechooser');
  await page.keyboard.press('Control+O');
  await chooser;
  await page.keyboard.press('Control+S');
  await expect(page.locator('#save-name-modal')).toHaveAttribute('open', '');
  await page.keyboard.press('Escape');
  await expect(page.locator('#save-name-modal')).not.toHaveAttribute('open', '');

  await page.keyboard.press('Control+Shift+P');
  await expect(page.locator('#command-palette-overlay')).not.toHaveAttribute('hidden', '');
  await page.keyboard.press('Escape');
  await page.keyboard.press('Control+Shift+F');
  await expect(page.locator('#toolbox-search')).toBeFocused();
  await page.keyboard.press('Control+J');
  await expect(page.locator('#viz-dock')).toHaveAttribute('data-open', 'true');
  await page.keyboard.press('Control+F5');
  await expect(page.locator('#bottom-tab-output')).toHaveAttribute('aria-selected', 'true');
  expectNoUncaughtErrors(errors);
});

test('mobile sidebar and inspector drawers open and close with their scrims', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  const errors = await openFreshApp(page);

  await page.locator('#menu-toggle').click();
  await expect(page.locator('#main-menu')).toHaveClass(/menu-open/);
  for (const id of ['file-menu-button', 'examples-button', 'header-run-program', 'view-menu-button', 'more-menu-button']) {
    await expect(page.locator(`#${id}`)).toBeVisible();
  }
  await page.locator('#view-menu-button').click();
  await expect(page.locator('#view-menu')).toBeVisible();
  await page.keyboard.press('Escape');
  await expect(page.locator('#view-menu-button')).toBeFocused();
  await page.keyboard.press('Escape');
  await expect(page.locator('#main-menu')).not.toHaveClass(/menu-open/);

  await page.locator('#activity-search').click();
  await expect(page.locator('body')).toHaveClass(/mobile-sidebar-open/);
  await page.mouse.click(380, 420);
  await expect(page.locator('body')).not.toHaveClass(/mobile-sidebar-open/);

  await page.locator('#show-code-button').click();
  await expect(page.locator('body')).toHaveClass(/mobile-code-open/);
  await page.locator('#code-scrim').dispatchEvent('click');
  await expect(page.locator('body')).not.toHaveClass(/mobile-code-open/);
  expectNoUncaughtErrors(errors);
});

test('persisted state can be loaded in a fresh browser page', async ({ browser }) => {
  const context = await browser.newContext({ viewport: { width: 1440, height: 900 } });
  const page = await context.newPage();
  const errors = await openFreshApp(page);
  await page.locator('#toggle-viz-dock').click();
  await selectPerspective(page, 'debug');
  const restored = await context.newPage();
  const restoredErrors = await openPersistedApp(restored);
  await expect(restored.locator('#viz-dock')).toHaveAttribute('data-open', 'true');
  await expect(restored.locator('body')).toHaveAttribute('data-perspective', 'debug');
  expectNoUncaughtErrors(errors);
  expectNoUncaughtErrors(restoredErrors);
  await context.close();
});
