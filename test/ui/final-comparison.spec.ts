import { expect, test, type Page } from '@playwright/test';
import { expectNoUncaughtErrors, openBottomPanel, openFreshApp, selectBottomTab, toggleTheme } from './helpers';

type Viewport = { width: number; height: number };
type CaptureCase = {
  id: string;
  viewport: Viewport;
  setup: (page: Page) => Promise<void>;
};

test.setTimeout(240_000);

async function loadExample(page: Page, label: string): Promise<void> {
  if (!await page.locator('#examples-button').isVisible()) {
    await page.locator('#menu-toggle').click();
  }
  await page.locator('#examples-button').click();
  await page.locator('#examples-panel [role="menuitem"]').filter({ hasText: label }).evaluate((item) =>
    (item as HTMLButtonElement).click()
  );
  await expect(page.locator('#example-load-modal')).toHaveAttribute('open', '');
  await page.locator('#example-load-modal button[value="replace"]').click();
  await expect(page.locator('#loaded-file-label')).toContainText(`${label}.bml`);
  await page.waitForTimeout(500);
}

async function activateSemantics(page: Page): Promise<void> {
  await openBottomPanel(page);
  await page.locator('#bottom-tab-semantics').click();
  await expect(page.locator('#bottom-panel-semantics')).not.toHaveAttribute('hidden', '');
}

async function useLightTheme(page: Page): Promise<void> {
  if (await page.locator('#view-menu-button').isVisible()) {
    await toggleTheme(page);
    return;
  }
  await page.locator('#menu-toggle').click();
  await page.locator('#view-menu-button').click();
  await page.locator('.theme-switch').click();
  await page.keyboard.press('Escape');
  if (await page.locator('#main-menu').evaluate((menu) => menu.classList.contains('menu-open'))) {
    await page.keyboard.press('Escape');
  }
}

const captures: CaptureCase[] = [
  { id: '01-default-edit', viewport: { width: 1440, height: 900 }, setup: async () => {} },
  {
    id: '02-toolbox-search', viewport: { width: 1920, height: 1080 }, setup: async (page) => {
      await page.locator('#activity-search').click();
      await page.locator('#toolbox-search').fill('integer');
      await expect(page.locator('#toolbox-content [data-block-type="mj_expr_integer"]')).toBeVisible();
    }
  },
  {
    id: '03-code-inspector', viewport: { width: 1440, height: 900 }, setup: async (page) => {
      await page.locator('#tab-code').click();
      await page.locator('#generated-code-editor').focus();
    }
  },
  {
    id: '04-types-inspector', viewport: { width: 1440, height: 900 }, setup: async (page) => {
      await page.locator('#tab-typing').click();
      await expect(page.locator('#panel-typing')).toHaveClass(/is-active/);
    }
  },
  {
    id: '05-problems-panel', viewport: { width: 1024, height: 768 }, setup: async (page) => {
      await openBottomPanel(page);
      await selectBottomTab(page, 'problems');
    }
  },
  {
    id: '06-output-panel', viewport: { width: 1024, height: 768 }, setup: async (page) => {
      await page.locator('#run-program').click();
      await expect(page.locator('#bottom-tab-output')).toHaveAttribute('aria-selected', 'true');
    }
  },
  {
    id: '07-semantics-panel', viewport: { width: 1024, height: 768 }, setup: activateSemantics
  },
  {
    id: '08-bottom-maximized', viewport: { width: 768, height: 1024 }, setup: async (page) => {
      await page.locator('#run-program').click();
      await page.locator('#viz-maximize').click();
      await expect(page.locator('body')).toHaveClass(/bottom-maximized/);
    }
  },
  {
    id: '09-toolbox-hidden', viewport: { width: 1440, height: 900 }, setup: async (page) => {
      await page.locator('#toggle-toolbox').click();
      await expect(page.locator('body')).toHaveClass(/toolbox-hidden/);
    }
  },
  {
    id: '10-inspector-hidden', viewport: { width: 1440, height: 900 }, setup: async (page) => {
      await page.locator('#toggle-code-column').click();
      await expect(page.locator('body')).toHaveClass(/code-hidden/);
    }
  },
  {
    id: '11-mobile-drawer-open', viewport: { width: 390, height: 844 }, setup: async (page) => {
      await page.locator('#activity-search').click();
      await expect(page.locator('body')).toHaveClass(/mobile-sidebar-open/);
    }
  },
  {
    id: '12-minijava-program-loaded', viewport: { width: 1920, height: 1080 }, setup: async (page) => {
      await loadExample(page, 'Simple Sum');
      await page.locator('#workspace-fit').click();
    }
  },
  {
    id: '13-runtime-visualization', viewport: { width: 768, height: 1024 }, setup: async (page) => {
      await loadExample(page, 'Simple Sum');
      await page.evaluate(() => {
        const blockly = (window as any).Blockly;
        const workspace = blockly.getMainWorkspace();
        const block = workspace.getBlocksByType('mj_expr_method_call')[0];
        blockly.ContextMenuRegistry.registry.getItem('miniJavaVizValue').callback({ block });
      });
      await expect(page.locator('#bottom-panel-value .blocklySvg')).toBeVisible();
    }
  }
];

test('captures the final UI comparison package', async ({ page }) => {
  for (const capture of captures) {
    for (const theme of ['dark', 'light'] as const) {
      await page.setViewportSize(capture.viewport);
      const errors = await openFreshApp(page);
      if (theme === 'light') await useLightTheme(page);
      await capture.setup(page);
      await page.waitForTimeout(250);
      await page.screenshot({
        path: `docs/ui-refactor/screenshots/final/${capture.id}-${theme}-${capture.viewport.width}x${capture.viewport.height}.png`,
        animations: 'disabled',
        caret: 'hide'
      });
      expectNoUncaughtErrors(errors);
    }
  }
});
