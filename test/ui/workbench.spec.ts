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

const applicationCommandIds = [
  'analysis.compare', 'analysis.machine', 'analysis.rewrite', 'analysis.structure', 'analysis.value',
  'editor.copy',
  'file.autosave', 'file.examples', 'file.export', 'file.new', 'file.open', 'file.save',
  'help.about',
  'perspective.debug', 'perspective.edit', 'perspective.presentation', 'perspective.types',
  'run.program',
  'theme.toggle', 'types.print',
  'view.blocks', 'view.bottom', 'view.bottomMaximize', 'view.code', 'view.inspector',
  'view.inspectorMaximize', 'view.outline', 'view.output', 'view.problems', 'view.search',
  'view.semantics', 'view.types',
  'workspace.fit', 'workspace.redo', 'workspace.screenshot', 'workspace.undo',
  'workspace.zoomIn', 'workspace.zoomOut', 'workspace.zoomReset'
].sort();

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
  await expect(page.locator('.brand-name')).toHaveText('B-MJ');
  await expect(page.locator('.project-name')).toHaveCount(0);
  await expect(page.locator('#status-file-name')).toHaveText('Project.java');
  const menuBounds = await page.locator('#main-menu').boundingBox();
  const brandBounds = await page.locator('.brand-zone').boundingBox();
  expect(brandBounds?.x).toBeLessThan(menuBounds?.x || Number.POSITIVE_INFINITY);
  for (const label of ['File', 'Examples', 'View', 'More']) {
    await expect(page.getByRole('button', { name: new RegExp(`^${label}`) }).first()).toBeVisible();
  }
  await expect(page.locator('#header-run-program')).toHaveCount(0);

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
  const viewMenuBounds = await page.locator('#view-menu').boundingBox();
  const viewport = page.viewportSize();
  expect(viewMenuBounds?.x).toBeGreaterThanOrEqual(0);
  expect((viewMenuBounds?.x || 0) + (viewMenuBounds?.width || 0)).toBeLessThanOrEqual(viewport?.width || Number.POSITIVE_INFINITY);
  for (const id of ['view-toggle-sidebar', 'view-toggle-inspector', 'top-toggle-bottom-panel', 'perspective-select', 'theme-toggle', 'autosave-interval']) {
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
  await expect(page.locator('#show-toolbox-button')).toBeVisible();
  await page.locator('#show-toolbox-button').click();
  await expect(page.locator('body')).not.toHaveClass(/toolbox-hidden/);
  await expect(page.locator('#show-toolbox-button')).toBeHidden();

  await page.locator('#toggle-code-column').click();
  await expect(page.locator('body')).toHaveClass(/code-hidden/);
  await expect(page.locator('#show-inspector-button')).toBeVisible();
  await page.locator('#show-inspector-button').click();
  await expect(page.locator('body')).not.toHaveClass(/code-hidden/);
  await expect(page.locator('#show-inspector-button')).toBeHidden();
  expectNoUncaughtErrors(errors);
});

test('blocks-only sidebar and quiet workspace toolbar preserve editing workflows', async ({ page }) => {
  const errors = await openFreshApp(page);
  await expect(page.locator('#sidebar-title')).toHaveText('Blocks');
  await expect(page.locator('.sidebar-view')).toHaveCount(1);
  await expect(page.locator('#toolbox-search')).toBeVisible();
  await expect(page.locator('#toolbox-content .toolbox-category')).toHaveCount(6);

  const searchGeometry = await page.locator('.toolbox-search').evaluate((label) => {
    const input = label.querySelector('input')!.getBoundingClientRect();
    const icon = label.querySelector('.app-icon')!.getBoundingClientRect();
    return {
      iconCenterX: icon.left + icon.width / 2,
      iconCenterY: icon.top + icon.height / 2,
      inputLeft: input.left,
      inputRight: input.right,
      inputTop: input.top,
      inputBottom: input.bottom
    };
  });
  expect(searchGeometry.iconCenterX).toBeGreaterThan(searchGeometry.inputRight - 30);
  expect(searchGeometry.iconCenterX).toBeLessThan(searchGeometry.inputRight);
  expect(searchGeometry.iconCenterY).toBeGreaterThan(searchGeometry.inputTop);
  expect(searchGeometry.iconCenterY).toBeLessThan(searchGeometry.inputBottom);

  const gridUsesThemeToken = await page.evaluate(() => {
    const line = document.querySelector<SVGLineElement>('#blockly-div pattern[id^="blocklyGridPattern"] line');
    if (!line) return false;
    const probe = document.createElement('span');
    probe.style.color = 'var(--workspace-grid)';
    document.body.appendChild(probe);
    const tokenColor = getComputedStyle(probe).color;
    probe.remove();
    return getComputedStyle(line).stroke === tokenColor;
  });
  expect(gridUsesThemeToken).toBe(true);

  const toolbarIds = await page.locator('.workspace-tools button').evaluateAll((buttons) =>
    buttons.map((button) => button.id)
  );
  expect(toolbarIds).toEqual([
    'workspace-undo',
    'workspace-redo',
    'workspace-zoom-out',
    'workspace-zoom-in',
    'workspace-fit',
    'workspace-toggle-bottom-panel',
    'run-program',
    'show-inspector-button'
  ]);
  await expect(page.locator('#show-toolbox-button')).toBeHidden();
  await expect(page.locator('#show-inspector-button')).toBeHidden();
  await expect(page.locator('#run-program')).toContainText('Run');

  const bottomToggle = page.locator('#workspace-toggle-bottom-panel');
  await bottomToggle.click();
  await expect(page.locator('#viz-dock')).toHaveAttribute('data-open', 'true');
  await expect(bottomToggle).toHaveAttribute('aria-pressed', 'true');
  await expect(bottomToggle).toHaveAttribute('aria-label', 'Hide bottom tools');
  await bottomToggle.click();
  await expect(page.locator('#viz-dock')).toHaveAttribute('data-open', 'false');
  await expect(bottomToggle).toHaveAttribute('aria-label', 'Show bottom tools');

  await page.locator('#toolbox-search').fill('integer');
  await expect(page.locator('#toolbox-content [data-block-type="mj_expr_integer"]')).toBeVisible();
  await expect(page.locator('#toolbox-content .toolbox-category')).toHaveCount(1);
  await page.locator('#toolbox-search').fill('');

  const expressions = page.locator('[data-category="expressions"] .toolbox-category-header');
  await expressions.click();
  await expect(expressions).toHaveAttribute('aria-expanded', 'false');
  await expressions.click();
  await expect(expressions).toHaveAttribute('aria-expanded', 'true');

  const beforeAdd = await page.locator('#status-block-count').textContent();
  const integer = page.locator('#toolbox-content [data-block-type="mj_expr_integer"]');
  await integer.click();
  await expect(page.locator('#status-block-count')).not.toHaveText(beforeAdd || '');
  await page.locator('#workspace-undo').click();
  await expect(page.locator('#status-block-count')).toHaveText(beforeAdd || '');
  await page.locator('#workspace-redo').click();
  await expect(page.locator('#status-block-count')).not.toHaveText(beforeAdd || '');

  const scaleBefore = await page.evaluate(() => (window as any).Blockly.getMainWorkspace().getScale());
  await page.locator('#workspace-zoom-in').click();
  await expect.poll(() => page.evaluate(() => (window as any).Blockly.getMainWorkspace().getScale())).toBeGreaterThan(scaleBefore);
  await page.locator('#workspace-zoom-out').click();
  await page.locator('#workspace-fit').click();

  const beforeDrag = await page.locator('#status-block-count').textContent();
  await integer.dragTo(page.locator('#blockly-area'));
  await expect(page.locator('#status-block-count')).not.toHaveText(beforeDrag || '');
  await page.locator('#run-program').click();
  await expect(page.locator('#bottom-tab-output')).toHaveAttribute('aria-selected', 'true');
  expectNoUncaughtErrors(errors);
});

test('grammatical block families integrate with both themes and preserve Blockly visual states', async ({ page }) => {
  const errors = await openFreshApp(page);
  await page.locator('#examples-button').click();
  await page.locator('#examples-panel [role="menuitem"]').filter({ hasText: 'Simple Sum' }).click();
  await page.locator('#example-load-modal button[value="replace"]').click();
  await expect(page.locator('#loaded-file-label')).toContainText('Simple Sum.bml');
  await expect(page.locator('#status-file-name')).toContainText('Simple Sum.bml');

  const blockColors = () => page.evaluate(() => {
    const workspace = (window as any).Blockly.getMainWorkspace();
    return Object.fromEntries(workspace.getAllBlocks(false).map((block: any) => [block.type, {
      color: block.getColour(),
      style: block.getStyleName()
    }]));
  });

  const dark = await blockColors();
  expect(dark.mj_goal).toEqual({ color: '#80505a', style: 'mj_grammar_structure_blocks' });
  expect(dark.mj_method_declaration).toEqual({ color: '#685b7a', style: 'mj_grammar_declaration_blocks' });
  expect(dark.mj_type_int).toEqual({ color: '#3d6d5a', style: 'mj_grammar_type_blocks' });
  expect(dark.mj_statement_print).toEqual({ color: '#80602f', style: 'mj_grammar_statement_blocks' });
  expect(dark.mj_expr_arith).toEqual({ color: '#455f7f', style: 'mj_grammar_expression_blocks' });
  expect(dark.mj_expr_integer).toEqual({ color: '#5c713e', style: 'mj_grammar_value_blocks' });
  const darkToolbox = await page.locator('#toolbox-content .toolbox-category').evaluateAll((categories) =>
    Object.fromEntries(categories.map((category) => [
      (category as HTMLElement).dataset.category,
      getComputedStyle(category).getPropertyValue('--category-color').trim()
    ]))
  );
  expect(darkToolbox).toEqual({
    program: '#80505a', declarations: '#685b7a', types: '#3d6d5a',
    statements: '#80602f', expressions: '#455f7f', values: '#5c713e'
  });

  const states = await page.evaluate(() => {
    const blockly = (window as any).Blockly;
    const block = blockly.getMainWorkspace().getBlocksByType('mj_method_declaration')[0];
    const root = block.getSvgRoot();
    block.addSelect();
    const selected = root.classList.contains('blocklySelected');
    block.setHighlighted(true);
    const highlighted = root.classList.contains('blocklyHighlighted');
    block.setDisabledReason(true, 'block-color-test');
    const disabled = root.classList.contains('blocklyDisabled');
    block.setWarningText('Color-independent warning', 'block-color-test');
    const warning = Boolean(root.querySelector('.blocklyIconGroup'));
    block.setWarningText(null, 'block-color-test');
    block.setDisabledReason(false, 'block-color-test');
    block.setHighlighted(false);
    block.removeSelect();
    return { selected, highlighted, disabled, warning };
  });
  expect(states).toEqual({ selected: true, highlighted: true, disabled: true, warning: true });

  await toggleTheme(page);
  const light = await blockColors();
  expect(light.mj_goal).toEqual({ color: '#754650', style: 'mj_grammar_structure_blocks' });
  expect(light.mj_method_declaration).toEqual({ color: '#5e5074', style: 'mj_grammar_declaration_blocks' });
  expect(light.mj_type_int).toEqual({ color: '#346252', style: 'mj_grammar_type_blocks' });
  expect(light.mj_statement_print).toEqual({ color: '#75552a', style: 'mj_grammar_statement_blocks' });
  expect(light.mj_expr_arith).toEqual({ color: '#3a5878', style: 'mj_grammar_expression_blocks' });
  expect(light.mj_expr_integer).toEqual({ color: '#526638', style: 'mj_grammar_value_blocks' });
  const lightToolbox = await page.locator('#toolbox-content .toolbox-category').evaluateAll((categories) =>
    Object.fromEntries(categories.map((category) => [
      (category as HTMLElement).dataset.category,
      getComputedStyle(category).getPropertyValue('--category-color').trim()
    ]))
  );
  expect(lightToolbox).toEqual({
    program: '#754650', declarations: '#5e5074', types: '#346252',
    statements: '#75552a', expressions: '#3a5878', values: '#526638'
  });
  expectNoUncaughtErrors(errors);
});

test('primary Run opens Output and command palette exposes registered commands', async ({ page }) => {
  const errors = await openFreshApp(page);
  await page.locator('#run-program').click();
  await expect(page.locator('#viz-dock')).toHaveAttribute('data-open', 'true');
  await expect(page.locator('#bottom-tab-output')).toHaveAttribute('aria-selected', 'true');
  await expect(page.locator('#bottom-program-output')).toContainText('[Run]');

  await page.keyboard.press('Control+Shift+P');
  await expect(page.locator('#command-palette-overlay')).not.toHaveAttribute('hidden', '');
  await expect(page.locator('.command-palette-option[data-command-id="run.program"]')).toBeVisible();
  const commandIds = await page.locator('.command-palette-option').evaluateAll((options) =>
    options.map((option) => (option as HTMLElement).dataset.commandId ?? '').sort()
  );
  expect(commandIds).toEqual(applicationCommandIds);
  await page.keyboard.press('Escape');
  await expect(page.locator('#command-palette-overlay')).toHaveAttribute('hidden', '');
  expectNoUncaughtErrors(errors);
});

test('new command-palette bridges invoke their existing view and workspace handlers', async ({ page }) => {
  const errors = await openFreshApp(page);
  const runCommand = async (id: string): Promise<void> => {
    await page.keyboard.press('F1');
    await page.locator(`.command-palette-option[data-command-id="${id}"]`).click();
  };

  await runCommand('workspace.zoomIn');
  await expect.poll(() => page.evaluate(() => (window as any).Blockly.getMainWorkspace().getScale())).toBeGreaterThan(1);
  await runCommand('workspace.zoomReset');
  await expect.poll(() => page.evaluate(() => (window as any).Blockly.getMainWorkspace().getScale())).toBe(1);

  await runCommand('view.types');
  await expect(page.locator('#tab-typing')).toHaveAttribute('aria-selected', 'true');
  await runCommand('analysis.value');
  await expect(page.locator('#bottom-tab-value')).toHaveAttribute('aria-selected', 'true');
  await runCommand('view.bottomMaximize');
  await expect(page.locator('body')).toHaveClass(/bottom-maximized/);
  await runCommand('view.bottomMaximize');
  await expect(page.locator('body')).not.toHaveClass(/bottom-maximized/);

  await runCommand('help.about');
  await expect(page.locator('#about-modal')).toHaveAttribute('open', '');
  await page.keyboard.press('Escape');
  await runCommand('file.examples');
  await expect(page.locator('#examples-panel')).toHaveClass(/examples-open/);
  await page.keyboard.press('Escape');
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
  const primaryTabIds = await page.locator('.viz-dock-tabs [role="tab"]').evaluateAll((tabs) =>
    tabs.map((tab) => tab.id)
  );
  expect(primaryTabIds).toEqual(['bottom-tab-problems', 'bottom-tab-output', 'bottom-tab-semantics']);
  await expect(page.locator('#bottom-panel-semantics')).toHaveAttribute('hidden', '');
  for (const kind of ['problems', 'output', 'structure', 'value', 'machine', 'compare', 'subst']) {
    await selectBottomTab(page, kind);
  }
  await expect(page.locator('#bottom-tab-semantics')).toHaveAttribute('aria-selected', 'true');
  await expect(page.locator('.viz-semantics-tabs [role="tab"]')).toHaveCount(5);
  await page.locator('#viz-maximize').click();
  await expect(page.locator('body')).toHaveClass(/bottom-maximized/);
  await page.locator('#viz-maximize').click();
  await expect(page.locator('body')).not.toHaveClass(/bottom-maximized/);
  await page.locator('#viz-maximize').click();
  await page.locator('#viz-collapse').click();
  await expect(page.locator('#viz-dock')).toHaveAttribute('data-open', 'false');
  await expect(page.locator('body')).not.toHaveClass(/bottom-maximized/);
  expectNoUncaughtErrors(errors);
});

test('Code, Types, Outline, Problems, Output, and runtime controls remain reachable', async ({ page }) => {
  const errors = await openFreshApp(page);
  await expect(page.locator('#tab-code')).toHaveText('Code');
  await expect(page.locator('#tab-typing')).toHaveText('Types');
  await expect(page.locator('#tab-outline')).toHaveText('Outline');
  for (const panel of ['code', 'typing', 'outline']) {
    await page.locator(`#tab-${panel === 'typing' ? 'typing' : panel}`).click();
    await expect(page.locator(`#panel-${panel}`)).toHaveClass(/is-active/);
  }
  await openBottomPanel(page);
  await selectBottomTab(page, 'problems');
  await selectBottomTab(page, 'output');
  await selectBottomTab(page, 'machine');
  await expect(page.locator('#bottom-tab-semantics')).toHaveAttribute('aria-selected', 'true');
  await expect(page.locator('#stepper-load')).toBeVisible();
  await selectBottomTab(page, 'compare');
  await expect(page.locator('#compare-load')).toBeVisible();
  await selectBottomTab(page, 'subst');
  await expect(page.locator('#subst-load')).toBeVisible();
  expectNoUncaughtErrors(errors);
});

test('right inspector preserves code editing, code-to-block synchronization, Types, and Outline', async ({ page }) => {
  const errors = await openFreshApp(page);
  const editor = page.locator('#generated-code-editor');
  const source = await editor.inputValue();
  await editor.fill(source.replace('System.out.println(0);', 'System.out.println(7);'));
  await expect(page.locator('#code-editor-status')).toHaveText(/Converted MiniJava text/, { timeout: 4000 });
  await expect.poll(() => page.evaluate(() => {
    const blockly = (window as any).Blockly;
    return String(blockly.getMainWorkspace().getBlocksByType('mj_expr_integer')[0]?.getFieldValue('VALUE'));
  })).toBe('7');

  await page.locator('#tab-typing').click();
  await expect(page.locator('#typing-gamma')).toContainText('Γ');
  await expect(page.locator('#typing-tree')).toContainText('WF-Print');

  await page.locator('#tab-outline').click();
  await expect(page.locator('#program-outline .outline-item')).not.toHaveCount(0);
  await page.waitForTimeout(1600);
  await page.evaluate(() => {
    const blockly = (window as any).Blockly;
    blockly.getMainWorkspace().getBlocksByType('mj_expr_integer')[0]?.setFieldValue('11', 'VALUE');
  });
  await page.locator('#tab-code').click();
  await expect(editor).toHaveValue(/System\.out\.println\(11\);/);
  expectNoUncaughtErrors(errors);
});

test('editable code preserves indentation while providing standard keyboard exits', async ({ page }) => {
  const errors = await openFreshApp(page);
  const editor = page.locator('#generated-code-editor');

  await editor.focus();
  await page.keyboard.press('Shift+Tab');
  await expect(editor).not.toBeFocused();

  await editor.focus();
  await page.keyboard.press('Escape');
  await expect(page.locator('#code-editor-status')).toHaveText('Press Tab to move focus out of the editor.');
  await page.keyboard.press('Tab');
  await expect(editor).not.toBeFocused();

  await editor.focus();
  const before = await editor.inputValue();
  await editor.evaluate((element) => {
    const textarea = element as HTMLTextAreaElement;
    textarea.setSelectionRange(textarea.value.length, textarea.value.length);
  });
  await page.keyboard.press('Tab');
  await expect(editor).toHaveValue(`${before}  `);
  await expect(editor).toBeFocused();
  expectNoUncaughtErrors(errors);
});

test('Problems and Output remain distinct bottom-panel results', async ({ page }) => {
  const errors = await openFreshApp(page);
  await page.locator('#status-problems-button').click();
  await expect(page.locator('#bottom-tab-problems')).toHaveAttribute('aria-selected', 'true');
  await expect(page.locator('#bottom-problems-list')).toContainText('No problems: the program type-checks.');

  await page.locator('#run-program').click();
  await expect(page.locator('#bottom-tab-output')).toHaveAttribute('aria-selected', 'true');
  await expect(page.locator('#bottom-program-output')).toContainText('[Run]');
  await expect(page.locator('#bottom-program-output')).toContainText('0');
  await expect(page.locator('#bottom-panel-semantics')).toHaveAttribute('hidden', '');
  expectNoUncaughtErrors(errors);
});

test('Call-by-Structure and Call-by-Value retain their Blockly visualization state inside Semantics', async ({ page }) => {
  const errors = await openFreshApp(page);
  await page.locator('#examples-button').click();
  await page.locator('#examples-panel [role="menuitem"]').filter({ hasText: 'Simple Sum' }).click();
  await expect(page.locator('#example-load-modal')).toHaveAttribute('open', '');
  await page.locator('#example-load-modal button[value="replace"]').click();
  await expect(page.locator('#loaded-file-label')).toContainText('Simple Sum.bml');
  await page.waitForTimeout(700);
  await page.evaluate(() => {
    (window as any).__bmjProgramWorkspace = (window as any).Blockly.getMainWorkspace();
  });

  const openReduction = (kind: 'Structure' | 'Value') => page.evaluate((entry) => {
    const blockly = (window as any).Blockly;
    const block = (window as any).__bmjProgramWorkspace.getBlocksByType('mj_expr_method_call')[0];
    blockly.ContextMenuRegistry.registry.getItem(`miniJavaViz${entry}`).callback({ block });
  }, kind);

  await openReduction('Structure');
  await expect(page.locator('#bottom-tab-semantics')).toHaveAttribute('aria-selected', 'true');
  await expect(page.locator('#bottom-tab-structure')).toHaveAttribute('aria-selected', 'true');
  await expect(page.locator('#bottom-panel-structure .blocklySvg')).toBeVisible();

  await openReduction('Value');
  await expect(page.locator('#bottom-tab-value')).toHaveAttribute('aria-selected', 'true');
  await expect(page.locator('#bottom-panel-value .blocklySvg')).toBeVisible();
  await selectBottomTab(page, 'structure');
  await expect(page.locator('#bottom-panel-structure .blocklySvg')).toBeVisible();
  expectNoUncaughtErrors(errors);
});

test('CESK, A vs B, and Rewrite retain their controls, history, and shared Output behavior', async ({ page }) => {
  const errors = await openFreshApp(page);
  await openBottomPanel(page);

  await selectBottomTab(page, 'machine');
  await page.locator('#stepper-load').click();
  await expect(page.locator('#stepper-step')).toBeEnabled();
  await page.locator('#stepper-step').click();
  await expect(page.locator('#stepper-back')).toBeEnabled();
  await page.locator('#stepper-back').click();
  await expect(page.locator('#stepper-gc-auto-enabled')).toBeVisible();
  await expect(page.locator('#stepper-gc-threshold')).toBeVisible();

  await selectBottomTab(page, 'compare');
  await page.locator('#compare-load').click();
  await expect(page.locator('#compare-step')).toBeEnabled();
  await page.locator('#compare-step').click();
  await expect(page.locator('#compare-back')).toBeEnabled();
  await page.locator('#compare-back').click();

  await selectBottomTab(page, 'subst');
  await page.locator('#subst-load').click();
  await expect(page.locator('#subst-step')).toBeEnabled();
  await page.locator('#subst-step').click();
  await expect(page.locator('#subst-back')).toBeEnabled();
  await page.locator('#subst-back').click();
  await expect(page.locator('#viz-rerun')).toBeVisible();
  await selectBottomTab(page, 'output');
  await expect(page.locator('#bottom-program-output')).toContainText('[Rewrite · substitution]');
  expectNoUncaughtErrors(errors);
});

test('inspector, primary bottom tabs, and semantic tabs keep independent keyboard navigation', async ({ page }) => {
  const errors = await openFreshApp(page);
  await page.locator('#tab-code').focus();
  await page.locator('#tab-code').press('ArrowRight');
  await expect(page.locator('#tab-typing')).toBeFocused();
  await expect(page.locator('#tab-typing')).toHaveAttribute('aria-selected', 'true');

  await openBottomPanel(page);
  await page.locator('#bottom-tab-problems').focus();
  await page.locator('#bottom-tab-problems').press('ArrowRight');
  await expect(page.locator('#bottom-tab-output')).toBeFocused();
  await page.locator('#bottom-tab-output').press('ArrowRight');
  await expect(page.locator('#bottom-tab-semantics')).toBeFocused();
  await expect(page.locator('#bottom-tab-semantics')).toHaveAttribute('aria-selected', 'true');

  await page.locator('#bottom-tab-structure').focus();
  await page.locator('#bottom-tab-structure').press('ArrowRight');
  await expect(page.locator('#bottom-tab-value')).toBeFocused();
  await expect(page.locator('#bottom-tab-value')).toHaveAttribute('aria-selected', 'true');
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
  await openHeaderMenu(page, 'view');
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
  for (const id of ['file-menu-button', 'examples-button', 'view-menu-button', 'more-menu-button']) {
    await expect(page.locator(`#${id}`)).toBeVisible();
  }
  await expect(page.locator('#header-run-program')).toHaveCount(0);
  await page.locator('#view-menu-button').click();
  await expect(page.locator('#view-menu')).toBeVisible();
  const compactViewMenuBounds = await page.locator('#view-menu').boundingBox();
  expect(compactViewMenuBounds?.x).toBeGreaterThanOrEqual(0);
  expect((compactViewMenuBounds?.x || 0) + (compactViewMenuBounds?.width || 0)).toBeLessThanOrEqual(390);
  await page.keyboard.press('Escape');
  await expect(page.locator('#view-menu-button')).toBeFocused();
  await page.keyboard.press('Escape');
  await expect(page.locator('#main-menu')).not.toHaveClass(/menu-open/);

  await page.locator('#activity-search').click();
  await expect(page.locator('body')).toHaveClass(/mobile-sidebar-open/);
  await page.mouse.click(380, 420);
  await expect(page.locator('body')).not.toHaveClass(/mobile-sidebar-open/);

  await page.locator('#menu-toggle').click();
  await page.locator('#view-menu-button').click();
  await page.locator('#view-toggle-inspector').click();
  await expect(page.locator('body')).toHaveClass(/mobile-code-open/);
  await page.locator('#code-scrim').dispatchEvent('click');
  await expect(page.locator('body')).not.toHaveClass(/mobile-code-open/);

  await page.keyboard.press('Control+J');
  await selectBottomTab(page, 'machine');
  await expect(page.locator('#bottom-tab-semantics')).toHaveAttribute('aria-selected', 'true');
  await expect(page.locator('.viz-semantics-tabs')).toBeVisible();
  await page.locator('#viz-maximize').click();
  await expect(page.locator('body')).toHaveClass(/bottom-maximized/);
  await page.locator('#viz-maximize').click();
  await expect(page.locator('body')).not.toHaveClass(/bottom-maximized/);
  expectNoUncaughtErrors(errors);
});

test('persisted state can be loaded in a fresh browser page', async ({ browser }) => {
  const context = await browser.newContext({ viewport: { width: 1440, height: 900 } });
  const page = await context.newPage();
  const errors = await openFreshApp(page);
  await openBottomPanel(page);
  await selectPerspective(page, 'debug');
  const restored = await context.newPage();
  const restoredErrors = await openPersistedApp(restored);
  await expect(restored.locator('#viz-dock')).toHaveAttribute('data-open', 'true');
  await expect(restored.locator('body')).toHaveAttribute('data-perspective', 'debug');
  await expect(restored.locator('#tab-outline')).toHaveAttribute('aria-selected', 'true');
  await expect(restored.locator('#bottom-tab-semantics')).toHaveAttribute('aria-selected', 'true');
  await expect(restored.locator('#bottom-tab-machine')).toHaveAttribute('aria-selected', 'true');
  await expect(restored.locator('#bottom-panel-semantics')).not.toHaveAttribute('hidden', '');
  expectNoUncaughtErrors(errors);
  expectNoUncaughtErrors(restoredErrors);
  await context.close();
});
