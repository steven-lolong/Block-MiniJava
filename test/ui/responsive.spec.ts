import { expect, test, type Page } from '@playwright/test';
import { expectNoUncaughtErrors, openFreshApp } from './helpers';

type ViewportCase = { width: number; height: number; compactPanels: boolean; compactMenu: boolean };

const viewports: ViewportCase[] = [
  { width: 1920, height: 1080, compactPanels: false, compactMenu: false },
  { width: 1440, height: 900, compactPanels: false, compactMenu: false },
  { width: 1280, height: 800, compactPanels: false, compactMenu: false },
  { width: 1024, height: 768, compactPanels: true, compactMenu: false },
  { width: 768, height: 1024, compactPanels: true, compactMenu: true },
  { width: 390, height: 844, compactPanels: true, compactMenu: true }
];

async function openViewSettings(page: Page, compactMenu: boolean): Promise<void> {
  if (compactMenu) {
    await page.locator('#menu-toggle').click();
    await expect(page.locator('#main-menu')).toHaveClass(/menu-open/);
  }
  await page.locator('#view-menu-button').click();
  await expect(page.locator('#view-menu')).toBeVisible();
}

for (const viewport of viewports) {
  test(`workbench remains reachable at ${viewport.width} × ${viewport.height}`, async ({ page }) => {
    await page.setViewportSize({ width: viewport.width, height: viewport.height });
    const errors = await openFreshApp(page);

    const workspace = page.locator('#blockly-area');
    await expect(workspace).toBeVisible();
    const box = await workspace.boundingBox();
    expect(box?.width).toBeGreaterThan(200);
    expect(box?.height).toBeGreaterThan(180);
    await expect(page.locator('#run-program')).toBeVisible();

    if (!viewport.compactMenu) {
      for (const label of ['File', 'Examples', 'Run', 'View', 'More']) {
        await expect(page.getByRole('button', { name: new RegExp(`^${label}`) }).first()).toBeVisible();
      }
    } else {
      await expect(page.locator('#menu-toggle')).toBeVisible();
      await page.locator('#menu-toggle').click();
      await expect(page.locator('#file-menu-button')).toBeVisible();
      await page.keyboard.press('Escape');
      await expect(page.locator('#menu-toggle')).toBeFocused();
    }

    if (viewport.compactPanels) {
      for (const id of ['sidebar-resizer', 'code-resizer']) {
        await expect(page.locator(`#${id}`)).toBeHidden();
        await expect(page.locator(`#${id}`)).toHaveAttribute('tabindex', '-1');
        await expect(page.locator(`#${id}`)).toHaveAttribute('aria-hidden', 'true');
      }
    } else {
      for (const id of ['sidebar-resizer', 'code-resizer']) {
        await expect(page.locator(`#${id}`)).toBeVisible();
        await expect(page.locator(`#${id}`)).toHaveAttribute('tabindex', '0');
      }
    }

    await page.locator('#run-program').click();
    await expect(page.locator('#bottom-tab-output')).toHaveAttribute('aria-selected', 'true');
    await page.locator('#viz-maximize').click();
    await expect(page.locator('body')).toHaveClass(/bottom-maximized/);
    await expect(page.locator('#viz-resizer')).toHaveAttribute('tabindex', '-1');
    await page.locator('#viz-maximize').click();
    await expect(page.locator('body')).not.toHaveClass(/bottom-maximized/);
    await expect(page.locator('#viz-resizer')).toHaveAttribute('tabindex', '0');

    expectNoUncaughtErrors(errors);
  });
}

for (const viewport of viewports.filter((candidate) => candidate.compactPanels)) {
  test(`drawers close transiently and restore focus at ${viewport.width} × ${viewport.height}`, async ({ page }) => {
    await page.setViewportSize({ width: viewport.width, height: viewport.height });
    const errors = await openFreshApp(page);

    const activity = page.locator('#activity-search');
    await activity.click();
    await expect(page.locator('body')).toHaveClass(/mobile-sidebar-open/);
    await page.keyboard.press('Escape');
    await expect(page.locator('body')).not.toHaveClass(/mobile-sidebar-open/);
    await expect(page.locator('body')).not.toHaveClass(/toolbox-hidden/);
    await expect(activity).toBeFocused();

    await activity.click();
    await page.mouse.click(viewport.width - 12, 180);
    await expect(page.locator('body')).not.toHaveClass(/mobile-sidebar-open/);
    await expect(page.locator('body')).not.toHaveClass(/toolbox-hidden/);

    await openViewSettings(page, viewport.compactMenu);
    await page.locator('#view-toggle-inspector').click();
    await expect(page.locator('body')).toHaveClass(/mobile-code-open/);
    await page.keyboard.press('Escape');
    await expect(page.locator('body')).not.toHaveClass(/mobile-code-open/);
    await expect(page.locator('body')).not.toHaveClass(/code-hidden/);
    await expect(viewport.compactMenu ? page.locator('#menu-toggle') : page.locator('#view-menu-button')).toBeFocused();

    await page.keyboard.press('Control+J');
    await expect(page.locator('#viz-dock')).toHaveAttribute('data-open', 'true');
    await openViewSettings(page, viewport.compactMenu);
    await page.locator('#view-toggle-inspector').click();
    await expect(page.locator('body')).toHaveClass(/mobile-code-open/);
    await page.locator('#tab-code').click();
    await page.locator('#generated-code-editor').focus();
    await expect(page.locator('#generated-code-editor')).toBeFocused();
    const activityBar = await page.locator('#activity-bar').boundingBox();
    await page.mouse.click((activityBar?.x ?? 0) + (activityBar?.width ?? 46) + 10, 180);
    await expect(page.locator('body')).not.toHaveClass(/mobile-code-open/);
    await expect(page.locator('body')).not.toHaveClass(/code-hidden/);
    expectNoUncaughtErrors(errors);
  });
}

test('panel and bottom dimensions remain safely clamped when persisted values are invalid', async ({ browser }) => {
  const context = await browser.newContext({ viewport: { width: 1024, height: 768 } });
  await context.addInitScript(() => {
    localStorage.setItem('block-minijava.theme', 'neon');
    localStorage.setItem('block-minijava.layout.perspective', 'legacy');
    localStorage.setItem('block-minijava.layout.activity', 'settings');
    localStorage.setItem('block-minijava.layout.inspector.panel', 'runtime');
    localStorage.setItem('block-minijava.autosave.interval', 'Infinity');
    localStorage.setItem('block-minijava.code.width', '-4');
    localStorage.setItem('block-minijava.layout.sidebar.width', 'not-a-number');
    localStorage.setItem('block-minijava.layout.bottom.height', '999999');
    localStorage.setItem('block-minijava.layout.bottom.tab', 'heap');
  });
  const page = await context.newPage();
  const errors = await (async () => {
    const result: string[] = [];
    page.on('pageerror', (error) => result.push(error.message));
    await page.goto('/');
    await expect(page.locator('#blockly-div .blocklySvg')).toBeVisible();
    return result;
  })();
  await expect(page.locator('body')).toHaveAttribute('data-theme', 'dark');
  await expect(page.locator('body')).toHaveAttribute('data-perspective', 'edit');
  await expect(page.locator('#tab-code')).toHaveAttribute('aria-selected', 'true');
  await expect(page.locator('#bottom-tab-problems')).toHaveAttribute('aria-selected', 'true');
  await expect(page.locator('#autosave-interval')).toHaveValue('2');
  expectNoUncaughtErrors(errors);
  await context.close();
});
