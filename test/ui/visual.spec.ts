import { expect, test, type Page } from '@playwright/test';
import { expectNoUncaughtErrors, openFreshApp, selectPerspective, toggleTheme } from './helpers';

async function capture(page: Parameters<typeof openFreshApp>[0], name: string): Promise<void> {
  await expect(page).toHaveScreenshot(name, { animations: 'disabled', caret: 'hide' });
}

async function loadExample(page: Page, label: string): Promise<void> {
  await page.locator('#examples-button').click();
  await page.locator('#examples-panel [role="menuitem"]').filter({ hasText: label }).evaluate((item) =>
    (item as HTMLButtonElement).click()
  );
  await expect(page.locator('#example-load-modal')).toHaveAttribute('open', '');
  await page.locator('#example-load-modal button[value="replace"]').click();
  await expect(page.locator('#loaded-file-label')).toContainText(`${label}.bml`);
  await page.waitForTimeout(700);
}

async function prepareGrammarFamilyWorkspace(page: Page): Promise<void> {
  await loadExample(page, 'Simple Sum');
  await page.locator('#toggle-toolbox').click();
  await page.locator('#toggle-code-column').click();
  await page.locator('#workspace-fit').click();
  await page.waitForTimeout(350);
}

test('light Edit at 1440 × 900', async ({ page }) => {
  const errors = await openFreshApp(page);
  await toggleTheme(page);
  await capture(page, 'light-edit-1440x900.png');
  expectNoUncaughtErrors(errors);
});

test('dark Edit at 1440 × 900', async ({ page }) => {
  const errors = await openFreshApp(page);
  await capture(page, 'dark-edit-1440x900.png');
  expectNoUncaughtErrors(errors);
});

test('dark Edit at 1920 × 1080', async ({ page }) => {
  await page.setViewportSize({ width: 1920, height: 1080 });
  const errors = await openFreshApp(page);
  await capture(page, 'dark-edit-1920x1080.png');
  expectNoUncaughtErrors(errors);
});

test('dark Edit at 1280 × 800', async ({ page }) => {
  await page.setViewportSize({ width: 1280, height: 800 });
  const errors = await openFreshApp(page);
  await capture(page, 'dark-edit-1280x800.png');
  expectNoUncaughtErrors(errors);
});

test('dark Debug at 1440 × 900', async ({ page }) => {
  const errors = await openFreshApp(page);
  await selectPerspective(page, 'debug');
  await capture(page, 'dark-debug-1440x900.png');
  expectNoUncaughtErrors(errors);
});

test('light Type Analysis at 1440 × 900', async ({ page }) => {
  const errors = await openFreshApp(page);
  await toggleTheme(page);
  await selectPerspective(page, 'types');
  await capture(page, 'light-types-1440x900.png');
  expectNoUncaughtErrors(errors);
});

test('dark Presentation at 1440 × 900', async ({ page }) => {
  const errors = await openFreshApp(page);
  await selectPerspective(page, 'presentation');
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

test('dark grammatical block families at 1440 × 900', async ({ page }) => {
  const errors = await openFreshApp(page);
  await prepareGrammarFamilyWorkspace(page);
  await capture(page, 'dark-block-grammar-families-1440x900.png');
  expectNoUncaughtErrors(errors);
});

test('light grammatical block families at 1440 × 900', async ({ page }) => {
  const errors = await openFreshApp(page);
  await toggleTheme(page);
  await prepareGrammarFamilyWorkspace(page);
  await capture(page, 'light-block-grammar-families-1440x900.png');
  expectNoUncaughtErrors(errors);
});

test('dark runtime and semantic blocks at 1440 × 900', async ({ page }) => {
  const errors = await openFreshApp(page);
  await loadExample(page, 'Simple Sum');
  await page.evaluate(() => {
    const blockly = (window as any).Blockly;
    const programWorkspace = blockly.getMainWorkspace();
    const block = programWorkspace.getBlocksByType('mj_expr_method_call')[0];
    blockly.ContextMenuRegistry.registry.getItem('miniJavaVizValue').callback({ block });
  });
  await expect(page.locator('#bottom-panel-value .blocklySvg')).toBeVisible();
  await page.locator('#viz-maximize').click();
  await page.waitForTimeout(350);
  await capture(page, 'dark-runtime-semantic-blocks-1440x900.png');
  expectNoUncaughtErrors(errors);
});
