import * as Blockly from 'blockly';
import { defineMiniJavaBlocks, MINI_JAVA_CATEGORIES, MINI_JAVA_REQUIRED_BLOCK_TYPES } from '../blocks/minijavaBlocks';
import { generateMiniJava } from '../generator/minijavaGenerator';
import { highlightMiniJava } from '../generator/highlighter';
import { BLOCKLY_RENDERER, createBlocklyTheme } from '../renderer/theme';
import { registerMiniJavaRenderer } from '../renderer/minijavaRenderer';
import { registerMiniJavaContextMenus } from './contextMenus';
import {
  disposeVizWorkspaces,
  initVisualizationPanel,
  isVizOpen,
  openBottomTool,
  openVisualization,
  resizeVisualizationPanel,
  setVizOpen,
  type VizKind
} from './visualizationPanel';
import { initExamplesMenu } from './examplesMenu';
import type { MiniJavaExample } from '../examples';
import { installEditableMiniJavaCodeEditor, type EditableMiniJavaCodeEditor } from './codeEditor';
import { refreshTypeDiagnostics } from './typeDiagnostics';
import { initTypingPanel, scheduleTypingRender, printTyping } from './typingPanel';
import { initStepperPanel } from './stepperPanel';
import { initComparePanel } from './comparePanel';
import { initSubstPanel } from './substPanel';
import { appendConsoleLog, mirrorProgramOutput } from './programConsole';
import { injectMachine, run } from '../semantics/minijavaMachine';
import { installCommandPalette, type IdeCommand } from './commandPalette';

const AUTOSAVE_KEY = 'block-minijava.autosave.v2';
const THEME_KEY = 'block-minijava.theme';
const AUTOSAVE_INTERVAL_KEY = 'block-minijava.autosave.interval';
const CODE_WIDTH_KEY = 'block-minijava.code.width';
const CODE_VISIBLE_KEY = 'block-minijava.layout.code.visible';
const SIDEBAR_WIDTH_KEY = 'block-minijava.layout.sidebar.width';
const SIDEBAR_VISIBLE_KEY = 'block-minijava.layout.sidebar.visible';
const ACTIVE_ACTIVITY_KEY = 'block-minijava.layout.activity';
const PERSPECTIVE_KEY = 'block-minijava.layout.perspective';

let workspace: Blockly.WorkspaceSvg | null = null;
let codeEditor: EditableMiniJavaCodeEditor | null = null;
let autosaveTimer: number | null = null;
let requiredBlockTimer: number | null = null;
let typeCheckTimer: number | null = null;
let outlineFrame: number | null = null;
let latestCode = '';
let codeHidden = false;
let toolboxHidden = false;
let currentTheme: 'dark' | 'light' = 'dark';
let clickAddOffset = 0;
let enforcingRequiredBlocks = false;
let activeActivity: ActivityKind = 'blocks';
let currentPerspective: Perspective = 'edit';
let applyingPerspective = false;
let codeMaximized = false;
let compactPanelLayout = window.matchMedia('(max-width: 1100px)').matches;
let layoutResizeFrame: number | null = null;
let layoutResizeTimers: number[] = [];
let layoutResizeObserver: ResizeObserver | null = null;

const TOOLBOX_BLOCK_MIME = 'application/x-block-minijava-block';
const [GOAL_BLOCK_TYPE, MAIN_BLOCK_TYPE] = MINI_JAVA_REQUIRED_BLOCK_TYPES;
const BLOCK_WORKSPACE_MUTATION_EVENTS = new Set<string>([
  Blockly.Events.BLOCK_CREATE,
  Blockly.Events.BLOCK_DELETE,
  Blockly.Events.BLOCK_CHANGE,
  Blockly.Events.BLOCK_FIELD_INTERMEDIATE_CHANGE,
  Blockly.Events.BLOCK_MOVE
]);
type InspectorPanel = 'code' | 'typing' | 'outline';
type ActivityKind = 'blocks' | 'search' | 'run' | 'settings';
type Perspective = 'edit' | 'debug' | 'types' | 'presentation' | 'custom';

const ACTIVITY_KINDS: ActivityKind[] = ['blocks', 'search', 'run', 'settings'];
const PERSPECTIVES: Perspective[] = ['edit', 'debug', 'types', 'presentation', 'custom'];
const ACTIVITY_META: Record<ActivityKind, { title: string; icon: string }> = {
  blocks: { title: 'Blocks', icon: 'icon-blocks' },
  search: { title: 'Search Blocks', icon: 'icon-search' },
  run: { title: 'Run and Analysis', icon: 'icon-run' },
  settings: { title: 'Settings and Layout', icon: 'icon-settings' }
};

function byId<T extends HTMLElement>(id: string): T {
  const el = document.getElementById(id);
  if (!el) throw new Error(`Missing element #${id}`);
  return el as T;
}

function syncLayoutSize(): void {
  if (workspace) {
    Blockly.svgResize(workspace);
  }
  codeEditor?.resize();
  resizeVisualizationPanel();
}

/**
 * One coordinator for shell-level layout changes. The animation frame handles
 * pointer-driven resizing; the settle passes cover CSS grid transitions.
 */
function requestLayoutResize(settle = true): void {
  if (layoutResizeFrame === null) {
    layoutResizeFrame = window.requestAnimationFrame(() => {
      layoutResizeFrame = null;
      syncLayoutSize();
    });
  }
  if (!settle) return;
  for (const timer of layoutResizeTimers) window.clearTimeout(timer);
  layoutResizeTimers = [
    window.setTimeout(syncLayoutSize, 60),
    window.setTimeout(syncLayoutSize, 180)
  ];
}

function initLayoutResizeCoordinator(): void {
  if ('ResizeObserver' in window) {
    layoutResizeObserver = new ResizeObserver(() => requestLayoutResize(false));
    for (const id of ['blockly-area', 'toolbox-column', 'code-column', 'viz-dock']) {
      const element = document.getElementById(id);
      if (element) layoutResizeObserver.observe(element);
    }
  }
  requestLayoutResize();
}

function storedBoolean(key: string, fallback: boolean): boolean {
  const value = localStorage.getItem(key);
  return value === 'true' ? true : value === 'false' ? false : fallback;
}

function updateProjectIdentity(): void {
  const fileLabel = byId<HTMLDivElement>('loaded-file-label').textContent?.trim();
  const projectName = document.querySelector<HTMLElement>('.project-name');
  if (projectName) projectName.textContent = fileLabel || 'Project.java';
}

function workspaceFileDisplayName(): string {
  const label = byId<HTMLDivElement>('loaded-file-label').textContent?.trim();
  if (!label || label.startsWith('Autosave') || label.startsWith('Could not')) return 'block-minijava-workspace';
  return label.replace(/\.bml$/i, '');
}

function normalizeBmlFileName(value: string): string {
  const cleaned = value.trim().replace(/[\\/:*?"<>|]+/g, '-').replace(/\s+/g, '-');
  const fallback = cleaned || 'block-minijava-workspace';
  return fallback.toLowerCase().endsWith('.bml') ? fallback : `${fallback}.bml`;
}

function currentScale(): number {
  if (!workspace) return 1;
  const maybeGetScale = (workspace as unknown as { getScale?: () => number }).getScale;
  if (typeof maybeGetScale === 'function') return maybeGetScale.call(workspace);
  const maybeScale = (workspace as unknown as { scale?: number }).scale;
  return typeof maybeScale === 'number' ? maybeScale : 1;
}


function blocklyViewportRect(): DOMRect {
  return byId<HTMLDivElement>('blockly-div').getBoundingClientRect();
}

function clientPointToWorkspacePoint(clientX: number, clientY: number): { x: number; y: number } {
  if (!workspace) return { x: 40, y: 40 };
  const rect = blocklyViewportRect();
  const metrics = workspace.getMetrics();
  const scale = currentScale();
  const viewLeft = metrics?.viewLeft ?? 0;
  const viewTop = metrics?.viewTop ?? 0;
  const localX = Math.max(0, Math.min(clientX - rect.left, rect.width));
  const localY = Math.max(0, Math.min(clientY - rect.top, rect.height));
  return {
    x: viewLeft + localX / scale,
    y: viewTop + localY / scale
  };
}

function activeWorkspaceInsertionPoint(): { x: number; y: number } {
  const rect = blocklyViewportRect();
  const insetX = Math.min(140, Math.max(72, rect.width * 0.18));
  const insetY = Math.min(120, Math.max(72, rect.height * 0.18));
  const offset = clickAddOffset % 120;
  clickAddOffset += 24;
  return clientPointToWorkspacePoint(rect.left + insetX + offset, rect.top + insetY + offset);
}

function createBlockInWorkspace(type: string, position: { x: number; y: number }): void {
  if (!workspace) return;
  if (type === GOAL_BLOCK_TYPE || type === MAIN_BLOCK_TYPE) {
    ensureRequiredBlocks(workspace);
    return;
  }
  Blockly.Events.setGroup(true);
  try {
    const block = workspace.newBlock(type);
    block.initSvg();
    block.render();
    block.moveBy(position.x, position.y);
    block.select();
  } finally {
    Blockly.Events.setGroup(false);
  }
  updateCode();
  saveAutosave();
}

function updateZoomIndicator(): void {
  const label = byId<HTMLSpanElement>('zoom-size');
  label.textContent = `${Math.round(currentScale() * 100)}%`;
}

function updateCode(): void {
  if (!workspace) return;
  latestCode = generateMiniJava(workspace);
  if (codeEditor) {
    codeEditor.syncFromWorkspace(latestCode);
  } else {
    byId<HTMLElement>('generated-code').innerHTML = highlightMiniJava(latestCode);
  }
  const blockCount = workspace.getAllBlocks(false).length;
  byId<HTMLSpanElement>('status-block-count').textContent = `${blockCount} block${blockCount === 1 ? '' : 's'}`;
  updateProjectIdentity();
  scheduleTypeCheck();
}

function scheduleTypeCheck(): void {
  if (typeCheckTimer !== null) window.clearTimeout(typeCheckTimer);
  typeCheckTimer = window.setTimeout(() => {
    typeCheckTimer = null;
    if (workspace) refreshTypeDiagnostics(workspace);
  }, 250);
}

function currentCodeText(): string {
  return codeEditor?.currentText() ?? latestCode;
}

function isBlockWorkspaceMutation(event: { type: string }): boolean {
  if (!BLOCK_WORKSPACE_MUTATION_EVENTS.has(event.type)) return false;
  // A move only changes the program when a connection changes; dragging a
  // block to a new position keeps the generated code identical, so skip the
  // regeneration and required-block sweep entirely.
  if (event.type === Blockly.Events.BLOCK_MOVE) {
    const move = event as {
      oldParentId?: string;
      newParentId?: string;
      oldInputName?: string;
      newInputName?: string;
    };
    return move.oldParentId !== move.newParentId || move.oldInputName !== move.newInputName;
  }
  return true;
}

function lockRequiredBlock(block: Blockly.Block): void {
  block.setDeletable(false);
  block.setMovable(false);
  block.setCollapsed(false);
}

function createRequiredBlock(ws: Blockly.WorkspaceSvg, type: string, x: number, y: number): Blockly.BlockSvg {
  const block = ws.newBlock(type) as Blockly.BlockSvg;
  block.initSvg();
  block.render();
  block.moveBy(x, y);
  return block;
}

function removeDuplicateRequiredBlock(block: Blockly.Block): void {
  block.setDeletable(true);
  block.dispose(false);
}

function ensureRequiredBlocks(ws: Blockly.WorkspaceSvg): boolean {
  if (enforcingRequiredBlocks) return false;
  enforcingRequiredBlocks = true;

  try {
    let changed = false;
    let allBlocks = ws.getAllBlocks(false);
    let goals = allBlocks.filter((block) => block.type === GOAL_BLOCK_TYPE);
    let goal = goals[0] as Blockly.BlockSvg | undefined;

    if (!goal) {
      goal = createRequiredBlock(ws, GOAL_BLOCK_TYPE, 48, 48);
      goals = [goal];
      changed = true;
    }

    for (const duplicate of goals.slice(1)) {
      removeDuplicateRequiredBlock(duplicate);
      changed = true;
    }

    allBlocks = ws.getAllBlocks(false);
    let mains = allBlocks.filter((block) => block.type === MAIN_BLOCK_TYPE);
    const connectedMain = goal.getInputTargetBlock('MAIN');
    let main = (connectedMain?.type === MAIN_BLOCK_TYPE ? connectedMain : mains[0]) as Blockly.BlockSvg | undefined;

    if (!main) {
      main = createRequiredBlock(ws, MAIN_BLOCK_TYPE, 260, 64);
      mains = [main];
      changed = true;
    }

    for (const duplicate of mains) {
      if (duplicate.id === main.id) continue;
      removeDuplicateRequiredBlock(duplicate);
      changed = true;
    }

    const goalConnection = goal.getInput('MAIN')?.connection;
    const mainConnection = main.outputConnection;
    if (goalConnection && mainConnection && goal.getInputTargetBlock('MAIN')?.id !== main.id) {
      goalConnection.targetConnection?.disconnect();
      mainConnection.targetConnection?.disconnect();
      goalConnection.connect(mainConnection);
      changed = true;
    }

    lockRequiredBlock(goal);
    lockRequiredBlock(main);
    return changed;
  } finally {
    enforcingRequiredBlocks = false;
  }
}

function scheduleRequiredBlockEnforcement(): void {
  if (requiredBlockTimer !== null) window.clearTimeout(requiredBlockTimer);
  requiredBlockTimer = window.setTimeout(() => {
    requiredBlockTimer = null;
    if (!workspace) return;
    if (ensureRequiredBlocks(workspace)) updateCode();
  }, 0);
}

function runProgram(): void {
  if (!workspace) return;
  openBottomTool('output');
  const initial = injectMachine(workspace, 'A');
  if ('injectError' in initial) {
    mirrorProgramOutput('Run', [], `⨯ ${initial.injectError}`);
    return;
  }
  const final = run(initial);
  const note = final.status === 'done'
    ? `— program finished in ${final.stepCount} step(s) —`
    : `⨯ ${final.error}`;
  mirrorProgramOutput('Run', final.output, note);
}

function selectInspectorPanel(panel: InspectorPanel): void {
  for (const tab of Array.from(document.querySelectorAll<HTMLButtonElement>('.inspector-tab'))) {
    const isActive = tab.dataset.panel === panel;
    tab.classList.toggle('is-active', isActive);
    tab.setAttribute('aria-selected', String(isActive));
    tab.tabIndex = isActive ? 0 : -1;
  }
  for (const section of Array.from(document.querySelectorAll<HTMLElement>('.inspector-panel'))) {
    section.classList.toggle('is-active', section.id === `panel-${panel}`);
  }
  if (panel === 'outline') scheduleOutlineRender();
  if (panel === 'typing') scheduleTypingRender();
  byId<HTMLButtonElement>('print-typing').hidden = panel !== 'typing';
  requestLayoutResize(false);
}

function scheduleOutlineRender(): void {
  if (outlineFrame !== null) window.cancelAnimationFrame(outlineFrame);
  outlineFrame = window.requestAnimationFrame(() => {
    outlineFrame = null;
    renderOutline();
  });
}

function renderOutline(): void {
  const container = byId<HTMLDivElement>('program-outline');
  container.replaceChildren();
  if (!workspace) return;

  const topBlocks = workspace.getTopBlocks(true);
  if (topBlocks.length === 0) {
    const empty = document.createElement('div');
    empty.className = 'outline-empty';
    empty.textContent = 'The workspace has no blocks.';
    container.appendChild(empty);
    return;
  }

  const addBlock = (block: Blockly.Block, depth: number): void => {
    const children = block.getChildren(true);
    const item = document.createElement('button');
    item.type = 'button';
    item.className = 'outline-item';
    item.dataset.blockId = block.id;
    item.style.setProperty('--outline-depth', String(depth));
    item.setAttribute('role', 'treeitem');
    item.setAttribute('aria-level', String(depth + 1));

    const disclosure = document.createElement('span');
    disclosure.className = 'outline-disclosure';
    disclosure.textContent = children.length > 0 ? '⌄' : '·';
    disclosure.setAttribute('aria-hidden', 'true');

    const label = document.createElement('span');
    label.className = 'outline-label';
    const blockText = block.toString(54, '…');
    label.textContent = blockText.replace(/\s+/g, ' ').trim() || block.type;

    const type = document.createElement('span');
    type.className = 'outline-type';
    type.textContent = block.type.replace(/^mj_/, '').replace(/_/g, ' ');

    item.append(disclosure, label, type);
    item.addEventListener('click', () => {
      if (!workspace) return;
      const selected = workspace.getBlockById(item.dataset.blockId ?? '') as Blockly.BlockSvg | null;
      if (!selected) return;
      workspace.centerOnBlock(selected.id);
      Blockly.common.setSelected(selected);
    });
    container.appendChild(item);
    children.forEach((child) => addBlock(child, depth + 1));
  };

  topBlocks.forEach((block) => addBlock(block, 0));
}

function updateActivityButtons(): void {
  const compact = window.matchMedia('(max-width: 1100px)').matches;
  const sidebarOpen = !toolboxHidden && (!compact || document.body.classList.contains('mobile-sidebar-open'));
  for (const button of Array.from(document.querySelectorAll<HTMLButtonElement>('.activity-item[data-activity]'))) {
    const selected = button.dataset.activity === activeActivity;
    button.classList.toggle('is-active', selected);
    button.setAttribute('aria-pressed', String(selected && sidebarOpen));
  }
}

function setActiveActivity(activity: ActivityKind, ensureVisible = true, focusSearch = activity === 'search'): void {
  activeActivity = activity;
  document.body.dataset.activity = activity;
  localStorage.setItem(ACTIVE_ACTIVITY_KEY, activity);
  updateActivityButtons();

  const meta = ACTIVITY_META[activity];
  byId<HTMLSpanElement>('sidebar-title').textContent = meta.title;
  byId<HTMLSpanElement>('sidebar-title-icon').className = `icon ${meta.icon}`;
  for (const view of Array.from(document.querySelectorAll<HTMLElement>('.sidebar-view[data-activity-view]'))) {
    const visible = (view.dataset.activityView ?? '').split(/\s+/).includes(activity);
    view.classList.toggle('is-active', visible);
    view.setAttribute('aria-hidden', String(!visible));
  }

  if (ensureVisible) setToolboxHidden(false);
  if (focusSearch) window.requestAnimationFrame(() => byId<HTMLInputElement>('toolbox-search').focus());
}

function setPerspectiveIdentity(perspective: Perspective, persist = true): void {
  currentPerspective = perspective;
  document.body.dataset.perspective = perspective;
  document.body.classList.toggle('presentation-mode', perspective === 'presentation');
  const select = byId<HTMLSelectElement>('perspective-select');
  const customOption = select.querySelector<HTMLOptionElement>('option[value="custom"]');
  if (customOption) customOption.hidden = perspective !== 'custom';
  select.value = perspective;
  const label = perspective === 'types'
    ? 'Type Analysis'
    : perspective.charAt(0).toLocaleUpperCase() + perspective.slice(1);
  byId<HTMLSpanElement>('status-perspective-label').textContent = label;
  for (const button of Array.from(document.querySelectorAll<HTMLButtonElement>('.perspective-option'))) {
    button.classList.toggle('is-active', button.dataset.perspective === perspective);
  }
  if (persist) localStorage.setItem(PERSPECTIVE_KEY, perspective);
}

function markPerspectiveCustom(): void {
  if (!applyingPerspective && currentPerspective !== 'custom') setPerspectiveIdentity('custom');
}

function showProblems(): void {
  openBottomTool('problems');
  if (workspace) refreshTypeDiagnostics(workspace);
}

function applyPerspective(perspective: Perspective): void {
  applyingPerspective = true;
  try {
    setPerspectiveIdentity(perspective);
    if (perspective === 'edit') {
      setActiveActivity('blocks', false, false);
      setToolboxHidden(false);
      setCodeHidden(false);
      setCodeMaximized(false);
      selectInspectorPanel('code');
      setVizOpen(false);
    } else if (perspective === 'debug') {
      setActiveActivity('run', false, false);
      setToolboxHidden(false);
      setCodeHidden(false);
      setCodeMaximized(false);
      selectInspectorPanel('outline');
      openBottomTool('machine');
    } else if (perspective === 'types') {
      setActiveActivity('blocks', false, false);
      setToolboxHidden(false);
      setCodeHidden(false);
      setCodeMaximized(false);
      selectInspectorPanel('outline');
      openBottomTool('problems');
      if (workspace) refreshTypeDiagnostics(workspace);
    } else if (perspective === 'presentation') {
      setCodeMaximized(false);
      setToolboxHidden(true);
      setCodeHidden(true);
      setVizOpen(false);
    }
  } finally {
    applyingPerspective = false;
    if (window.matchMedia('(max-width: 1100px)').matches) {
      document.body.classList.remove('mobile-sidebar-open', 'mobile-code-open');
    }
    requestLayoutResize();
  }
}

function openAnalysisTool(kind: VizKind): void {
  if (kind !== 'structure' && kind !== 'value') {
    openBottomTool(kind);
    return;
  }
  if (!workspace) return;
  const selected = Blockly.common.getSelected() as Blockly.BlockSvg | null;
  const selectedBlock = selected && workspace.getBlockById(selected.id) ? selected : null;
  const block = selectedBlock ?? workspace.getTopBlocks(true)[0];
  if (!block) {
    scheduleAutosaveStatus('Add or select a block to visualize');
    return;
  }
  openVisualization(kind, block as Blockly.BlockSvg);
}

function scheduleAutosaveStatus(message: string): void {
  const status = byId<HTMLSpanElement>('autosave-status');
  status.textContent = message;
}

function saveAutosave(): void {
  if (!workspace) return;
  const payload = {
    savedAt: new Date().toISOString(),
    state: Blockly.serialization.workspaces.save(workspace)
  };
  localStorage.setItem(AUTOSAVE_KEY, JSON.stringify(payload));
  scheduleAutosaveStatus(`Autosaved ${new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}`);
}

function restartAutosaveTimer(): void {
  if (autosaveTimer !== null) window.clearInterval(autosaveTimer);
  const minutes = Number(byId<HTMLInputElement>('autosave-interval').value || '2');
  autosaveTimer = window.setInterval(saveAutosave, minutes * 60 * 1000);
}

function updateAutosaveIntervalLabel(): void {
  const input = byId<HTMLInputElement>('autosave-interval');
  const minutes = Number(input.value);
  byId<HTMLSpanElement>('autosave-interval-label').textContent = `${minutes} minute${minutes === 1 ? '' : 's'}`;
  localStorage.setItem(AUTOSAVE_INTERVAL_KEY, String(minutes));
  restartAutosaveTimer();
}

function loadAutosave(): void {
  if (!workspace) return;
  const raw = localStorage.getItem(AUTOSAVE_KEY);
  if (!raw) {
    scheduleAutosaveStatus('No autosave found');
    return;
  }
  try {
    const payload = JSON.parse(raw) as { savedAt?: string; state: unknown };
    workspace.clear();
    Blockly.serialization.workspaces.load(payload.state as { [key: string]: unknown }, workspace);
    ensureRequiredBlocks(workspace);
    byId<HTMLDivElement>('loaded-file-label').textContent = payload.savedAt
      ? `Autosave · ${new Date(payload.savedAt).toLocaleString()}`
      : 'Autosave loaded';
    updateCode();
    updateZoomIndicator();
    scheduleAutosaveStatus('Autosave loaded');
  } catch (error) {
    console.error(error);
    scheduleAutosaveStatus('Autosave could not be loaded');
  }
}

function applyTheme(theme: 'dark' | 'light'): void {
  currentTheme = theme;
  document.body.dataset.theme = theme;
  localStorage.setItem(THEME_KEY, theme);
  const input = byId<HTMLInputElement>('theme-toggle');
  input.checked = theme === 'dark';
  input.setAttribute('aria-label', theme === 'dark' ? 'Dark theme on' : 'Light theme on');
  if (workspace) workspace.setTheme(createBlocklyTheme(theme));
  disposeVizWorkspaces();
  requestLayoutResize();
}

function setCodeMaximized(next: boolean): void {
  codeMaximized = next;
  if (next && codeHidden) setCodeHidden(false);
  document.body.classList.toggle('code-maximized', next);
  const button = byId<HTMLButtonElement>('toggle-code-maximize');
  button.setAttribute('aria-pressed', String(next));
  button.setAttribute('aria-label', next ? 'Restore inspector' : 'Maximize inspector');
  button.title = next ? 'Restore inspector' : 'Maximize inspector';
  const glyph = button.querySelector<HTMLElement>('.toolbar-glyph');
  if (glyph) glyph.textContent = next ? '◱' : '□';
  requestLayoutResize();
}

function setCodeHidden(next: boolean): void {
  codeHidden = next;
  if (next && codeMaximized) setCodeMaximized(false);
  document.body.classList.toggle('code-hidden', codeHidden);
  if (window.matchMedia('(max-width: 1100px)').matches) {
    document.body.classList.toggle('mobile-code-open', !codeHidden);
  } else if (codeHidden) {
    document.body.classList.remove('mobile-code-open');
  }
  localStorage.setItem(CODE_VISIBLE_KEY, String(!codeHidden));

  const column = byId<HTMLButtonElement>('toggle-code-column');
  const showButton = byId<HTMLButtonElement>('show-code-button');

  column.title = codeHidden ? 'Show inspector' : 'Hide inspector';
  column.setAttribute('aria-label', codeHidden ? 'Show inspector' : 'Hide inspector');
  showButton.title = 'Show MiniJava inspector';
  showButton.setAttribute('aria-label', 'Show MiniJava inspector');
  byId<HTMLButtonElement>('settings-toggle-code').setAttribute('aria-pressed', String(!codeHidden));

  requestLayoutResize();
}


function setToolboxHidden(next: boolean): void {
  toolboxHidden = next;
  document.body.classList.toggle('toolbox-hidden', toolboxHidden);
  if (window.matchMedia('(max-width: 1100px)').matches) {
    document.body.classList.toggle('mobile-sidebar-open', !toolboxHidden);
  } else if (toolboxHidden) {
    document.body.classList.remove('mobile-sidebar-open');
  }
  localStorage.setItem(SIDEBAR_VISIBLE_KEY, String(!toolboxHidden));

  const button = byId<HTMLButtonElement>('toggle-toolbox');
  const showButton = byId<HTMLButtonElement>('show-toolbox-button');

  button.title = toolboxHidden ? 'Show sidebar' : 'Hide sidebar';
  button.setAttribute('aria-label', toolboxHidden ? 'Show sidebar' : 'Hide sidebar');
  showButton.title = 'Show sidebar';
  showButton.setAttribute('aria-label', 'Show sidebar');
  updateActivityButtons();

  requestLayoutResize();
}


function makeWorkspaceStateBlob(): Blob {
  if (!workspace) throw new Error('Workspace is not ready');
  const state = Blockly.serialization.workspaces.save(workspace);
  return new Blob([JSON.stringify({ version: 1, state }, null, 2)], { type: 'application/json' });
}

/** Ask for the workspace name without blocking the application UI. */
function askSaveName(defaultName: string): Promise<string | null> {
  const modal = document.getElementById('save-name-modal') as HTMLDialogElement | null;
  const input = document.getElementById('save-name-input') as HTMLInputElement | null;
  if (!modal || typeof modal.showModal !== 'function' || !input) return Promise.resolve(defaultName);

  input.value = defaultName;
  return new Promise<string | null>((resolve) => {
    const onClose = (): void => {
      modal.removeEventListener('close', onClose);
      resolve(modal.returnValue === 'save' ? input.value : null);
    };
    modal.addEventListener('close', onClose);
    modal.returnValue = 'cancel';
    modal.showModal();
    input.select();
  });
}

function downloadWorkspace(): void {
  askSaveName(workspaceFileDisplayName()).then((requestedName) => {
    if (requestedName === null) return;
    writeWorkspaceFile(normalizeBmlFileName(requestedName));
  });
}

function writeWorkspaceFile(fileName: string): void {
  const blob = makeWorkspaceStateBlob();
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = fileName;
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
  byId<HTMLDivElement>('loaded-file-label').textContent = fileName;
  scheduleAutosaveStatus(`Saved ${fileName}`);
}

function normalizeJavaFileName(value: string): string {
  const cleaned = value.trim().replace(/[\\/:*?"<>|]+/g, '-').replace(/\s+/g, '-');
  const fallback = cleaned || workspaceFileDisplayName() || 'Project';
  return fallback.toLowerCase().endsWith('.java') ? fallback : `${fallback.replace(/\.bml$/i, '')}.java`;
}

function exportGeneratedCode(): void {
  askExportName(workspaceFileDisplayName()).then((requestedName) => {
    if (requestedName === null) return;
    writeGeneratedCodeFile(normalizeJavaFileName(requestedName));
  });
}

function askExportName(defaultName: string): Promise<string | null> {
  const modal = document.getElementById('export-name-modal') as HTMLDialogElement | null;
  const input = document.getElementById('export-name-input') as HTMLInputElement | null;
  if (!modal || typeof modal.showModal !== 'function' || !input) return Promise.resolve(defaultName);

  input.value = defaultName;
  return new Promise<string | null>((resolve) => {
    const onClose = (): void => {
      modal.removeEventListener('close', onClose);
      resolve(modal.returnValue === 'export' ? input.value : null);
    };
    modal.addEventListener('close', onClose);
    modal.returnValue = 'cancel';
    modal.showModal();
    input.select();
  });
}

function writeGeneratedCodeFile(fileName: string): void {
  const blob = new Blob([currentCodeText()], { type: 'text/x-java-source;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = fileName;
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
  scheduleAutosaveStatus(`Exported ${fileName}`);
  appendConsoleLog(`Exported ${fileName}`);
  openBottomTool('output');
}


function loadJavaSourceFile(file: File): void {
  file.text()
    .then((source) => {
      if (!codeEditor) throw new Error('Editable code editor is not ready');
      selectInspectorPanel('code');
      setCodeHidden(false);
      codeEditor.loadText(source, file.name);
    })
    .catch((error) => {
      console.error(error);
      scheduleAutosaveStatus(`Could not load ${file.name}`);
    });
}

function loadWorkspaceFile(file: File): void {
  if (!workspace) return;
  const ws = workspace;
  const reader = new FileReader();
  reader.onload = () => {
    try {
      const parsed = JSON.parse(String(reader.result));
      const state = parsed.state ?? parsed;
      ws.clear();
      Blockly.serialization.workspaces.load(state as { [key: string]: unknown }, ws);
      ensureRequiredBlocks(ws);
      byId<HTMLDivElement>('loaded-file-label').textContent = file.name;
      updateCode();
      saveAutosave();
      scheduleAutosaveStatus(`Loaded ${file.name}`);
    } catch (error) {
      console.error(error);
      byId<HTMLDivElement>('loaded-file-label').textContent = 'Could not load workspace';
    }
  };
  reader.readAsText(file);
}

function newWorkspace(): void {
  if (!workspace) return;
  setVizOpen(false);
  workspace.clear();
  loadInitialSample(workspace);
  byId<HTMLDivElement>('loaded-file-label').textContent = '';
  updateCode();
  saveAutosave();
}

function copyCode(): void {
  navigator.clipboard
    .writeText(currentCodeText())
    .then(() => {
      scheduleAutosaveStatus('Code copied');
      appendConsoleLog('MiniJava code copied to clipboard.');
    })
    .catch(() => {
      scheduleAutosaveStatus('Copy failed');
      appendConsoleLog('Clipboard copy failed.');
    });
}

function onExampleLoaded(example: MiniJavaExample): void {
  if (!workspace) return;
  ensureRequiredBlocks(workspace);
  byId<HTMLDivElement>('loaded-file-label').textContent = `${example.label}.bml`;
  scheduleAutosaveStatus(`Loaded ${example.label}`);
  updateCode();
  updateZoomIndicator();
  saveAutosave();
}

function renderToolbox(query = ''): void {
  const root = byId<HTMLDivElement>('toolbox-content');
  root.innerHTML = '';
  const normalizedQuery = query.trim().toLocaleLowerCase();
  let visibleBlockCount = 0;

  for (const category of MINI_JAVA_CATEGORIES) {
    const categoryMatches = category.label.toLocaleLowerCase().includes(normalizedQuery)
      || category.id.toLocaleLowerCase().includes(normalizedQuery);
    const visibleBlocks = normalizedQuery && !categoryMatches
      ? category.blocks.filter((block) =>
          block.label.toLocaleLowerCase().includes(normalizedQuery)
          || block.type.toLocaleLowerCase().includes(normalizedQuery))
      : category.blocks;
    if (visibleBlocks.length === 0) continue;

    const group = document.createElement('section');
    group.className = 'toolbox-category';
    group.dataset.category = category.id;

    const header = document.createElement('button');
    header.type = 'button';
    header.className = 'toolbox-category-header';
    header.setAttribute('aria-expanded', 'true');
    header.innerHTML = `<span class="category-left"><span class="category-icon" aria-hidden="true">${category.icon}</span><span>${category.label}</span></span><span class="category-caret" aria-hidden="true">⌄</span>`;
    header.addEventListener('click', () => {
      const collapsed = group.classList.toggle('collapsed');
      header.setAttribute('aria-expanded', String(!collapsed));
    });

    const list = document.createElement('div');
    list.className = 'toolbox-block-list';
    list.id = `toolbox-category-${category.id}`;
    header.setAttribute('aria-controls', list.id);
    for (const block of visibleBlocks) {
      const button = document.createElement('button');
      button.type = 'button';
      button.className = 'toolbox-block-button';
      button.title = `Add ${block.label}`;
      button.draggable = true;
      button.dataset.blockType = block.type;
      button.innerHTML = `<span class="block-icon" aria-hidden="true">${block.icon}</span><span class="block-label">${block.label}</span>`;
      button.addEventListener('click', () => addBlockToWorkspace(block.type));
      button.addEventListener('dragstart', (event) => {
        button.classList.add('is-dragging');
        event.dataTransfer?.setData(TOOLBOX_BLOCK_MIME, block.type);
        event.dataTransfer?.setData('text/plain', block.type);
        if (event.dataTransfer) event.dataTransfer.effectAllowed = 'copy';
      });
      button.addEventListener('dragend', () => {
        button.classList.remove('is-dragging');
        byId<HTMLDivElement>('blockly-area').classList.remove('workspace-drop-target');
      });
      list.appendChild(button);
      visibleBlockCount += 1;
    }

    group.append(header, list);
    root.appendChild(group);
  }

  if (visibleBlockCount === 0) {
    const empty = document.createElement('p');
    empty.className = 'toolbox-search-empty';
    empty.setAttribute('role', 'status');
    empty.textContent = `No blocks found for “${query.trim()}”.`;
    root.appendChild(empty);
  }
}

function addBlockToWorkspace(type: string): void {
  createBlockInWorkspace(type, activeWorkspaceInsertionPoint());
}

function addBlockToWorkspaceAtClientPoint(type: string, clientX: number, clientY: number): void {
  createBlockInWorkspace(type, clientPointToWorkspacePoint(clientX, clientY));
}

function hasToolboxBlockDrag(event: DragEvent): boolean {
  return Array.from(event.dataTransfer?.types ?? []).includes(TOOLBOX_BLOCK_MIME);
}

function initToolboxDragAndDrop(): void {
  const area = byId<HTMLDivElement>('blockly-area');

  area.addEventListener('dragenter', (event) => {
    if (!hasToolboxBlockDrag(event)) return;
    event.preventDefault();
    area.classList.add('workspace-drop-target');
  });

  area.addEventListener('dragover', (event) => {
    if (!hasToolboxBlockDrag(event)) return;
    event.preventDefault();
    if (event.dataTransfer) event.dataTransfer.dropEffect = 'copy';
    area.classList.add('workspace-drop-target');
  });

  area.addEventListener('dragleave', (event) => {
    const next = event.relatedTarget as Node | null;
    if (!next || !area.contains(next)) area.classList.remove('workspace-drop-target');
  });

  area.addEventListener('drop', (event) => {
    if (!hasToolboxBlockDrag(event)) return;
    event.preventDefault();
    area.classList.remove('workspace-drop-target');
    const type = event.dataTransfer?.getData(TOOLBOX_BLOCK_MIME) || event.dataTransfer?.getData('text/plain');
    if (!type) return;
    addBlockToWorkspaceAtClientPoint(type, event.clientX, event.clientY);
  });
}


function setSidebarWidth(width: number): void {
  const maxWidth = Math.max(220, Math.min(420, Math.round(window.innerWidth * 0.45)));
  const clamped = Math.min(Math.max(width, 220), maxWidth);
  document.documentElement.style.setProperty('--ide-primary-sidebar-width', `${Math.round(clamped)}px`);
  localStorage.setItem(SIDEBAR_WIDTH_KEY, String(Math.round(clamped)));
  requestLayoutResize(false);
}

function initSidebarResizer(): void {
  const resizer = byId<HTMLDivElement>('sidebar-resizer');
  let startX = 0;
  let startWidth = 0;

  const readSidebarWidth = (): number => {
    const width = byId<HTMLElement>('toolbox-column').getBoundingClientRect().width;
    return width
      || Number.parseInt(getComputedStyle(document.documentElement).getPropertyValue('--ide-primary-sidebar-width'), 10)
      || 270;
  };
  const onPointerMove = (event: PointerEvent): void => setSidebarWidth(startWidth + event.clientX - startX);
  const stopResize = (): void => {
    document.body.classList.remove('is-resizing-sidebar');
    window.removeEventListener('pointermove', onPointerMove);
    window.removeEventListener('pointerup', stopResize);
    syncLayoutSize();
  };

  resizer.addEventListener('pointerdown', (event) => {
    if (toolboxHidden || window.matchMedia('(max-width: 1100px)').matches) return;
    startX = event.clientX;
    startWidth = readSidebarWidth();
    document.body.classList.add('is-resizing-sidebar');
    resizer.setPointerCapture?.(event.pointerId);
    window.addEventListener('pointermove', onPointerMove);
    window.addEventListener('pointerup', stopResize);
  });
  resizer.addEventListener('keydown', (event) => {
    if (toolboxHidden) return;
    const step = event.key === 'ArrowLeft' ? -24 : event.key === 'ArrowRight' ? 24 : 0;
    if (!step) return;
    event.preventDefault();
    setSidebarWidth(readSidebarWidth() + step);
  });
}

function setCodeWidth(width: number): void {
  const clamped = Math.min(Math.max(width, 300), Math.min(window.innerWidth * 0.68, 900));
  document.documentElement.style.setProperty('--ide-code-panel-width', `${Math.round(clamped)}px`);
  localStorage.setItem(CODE_WIDTH_KEY, String(Math.round(clamped)));
  requestLayoutResize(false);
}

function initCodeResizer(): void {
  const resizer = byId<HTMLDivElement>('code-resizer');
  const layout = document.querySelector<HTMLElement>('.ide-layout');
  if (!layout) return;

  let startX = 0;
  let startWidth = 0;

  const readCodeWidth = (): number => {
    const column = byId<HTMLElement>('code-column');
    const rect = column.getBoundingClientRect();
    return rect.width
      || Number.parseInt(getComputedStyle(document.documentElement).getPropertyValue('--ide-code-panel-width'), 10)
      || 430;
  };

  const onPointerMove = (event: PointerEvent): void => {
    const delta = event.clientX - startX;
    setCodeWidth(startWidth - delta);
  };

  const stopResize = (): void => {
    document.body.classList.remove('is-resizing-code');
    window.removeEventListener('pointermove', onPointerMove);
    window.removeEventListener('pointerup', stopResize);
    syncLayoutSize();
  };

  resizer.addEventListener('pointerdown', (event) => {
    if (codeHidden || window.matchMedia('(max-width: 1100px)').matches) return;
    startX = event.clientX;
    startWidth = readCodeWidth();
    document.body.classList.add('is-resizing-code');
    resizer.setPointerCapture?.(event.pointerId);
    window.addEventListener('pointermove', onPointerMove);
    window.addEventListener('pointerup', stopResize);
  });

  resizer.addEventListener('keydown', (event) => {
    if (codeHidden) return;
    const current = readCodeWidth();
    if (event.key === 'ArrowLeft') {
      event.preventDefault();
      setCodeWidth(current + 24);
    }
    if (event.key === 'ArrowRight') {
      event.preventDefault();
      setCodeWidth(current - 24);
    }
  });
}

function loadInitialSample(ws: Blockly.WorkspaceSvg): void {
  const goal = ws.newBlock('mj_goal');
  const main = ws.newBlock('mj_main_class');
  const print = ws.newBlock('mj_statement_print');
  const value = ws.newBlock('mj_expr_integer');

  goal.initSvg();
  main.initSvg();
  print.initSvg();
  value.initSvg();

  value.setFieldValue('0', 'VALUE');
  goal.getInput('MAIN')?.connection?.connect(main.outputConnection!);
  main.getInput('STATEMENT')?.connection?.connect(print.previousConnection!);
  print.getInput('VALUE')?.connection?.connect(value.outputConnection!);

  goal.moveBy(48, 48);
  goal.render();
  main.render();
  print.render();
  value.render();
  ensureRequiredBlocks(ws);
  ws.centerOnBlock(goal.id);
}

function initBlockly(): void {
  const blocklyDiv = byId<HTMLDivElement>('blockly-div');
  workspace = Blockly.inject(blocklyDiv, {
    renderer: BLOCKLY_RENDERER,
    theme: createBlocklyTheme(currentTheme),
    trashcan: true,
    comments: true,
    collapse: true,
    disable: true,
    grid: {
      spacing: 24,
      length: 3,
      colour: currentTheme === 'dark' ? '#3d465b' : '#cdd6e3',
      snap: true
    },
    zoom: {
      controls: true,
      wheel: true,
      startScale: 1,
      maxScale: 2.4,
      minScale: 0.35,
      scaleSpeed: 1.15,
      pinch: true
    },
    move: {
      scrollbars: true,
      drag: true,
      wheel: true
    }
  });

  loadInitialSample(workspace);
  ensureRequiredBlocks(workspace);
  workspace.addChangeListener((event) => {
    if (event.type !== Blockly.Events.VIEWPORT_CHANGE) {
      scheduleOutlineRender();
      scheduleTypingRender();
    }
    if (event.type === Blockly.Events.FINISHED_LOADING) {
      scheduleRequiredBlockEnforcement();
      return;
    }
    if (event.type === Blockly.Events.VIEWPORT_CHANGE) {
      updateZoomIndicator();
      return;
    }
    if (!isBlockWorkspaceMutation(event)) return;

    scheduleRequiredBlockEnforcement();
    updateCode();
  });

  updateCode();
  scheduleOutlineRender();
  updateZoomIndicator();
  requestLayoutResize();
  if (window.matchMedia('(max-width: 700px)').matches) {
    window.setTimeout(() => {
      workspace?.zoomToFit();
      updateZoomIndicator();
    }, 100);
  }
}

function installCodeEditor(): void {
  if (!workspace) return;

  codeEditor = installEditableMiniJavaCodeEditor(workspace, {
    onBeforeImport: () => setVizOpen(false),
    onImported: ({ label }) => {
      if (!workspace) return;
      ensureRequiredBlocks(workspace);
      byId<HTMLDivElement>('loaded-file-label').textContent = label;
      updateCode();
      updateZoomIndicator();
      saveAutosave();
      scheduleAutosaveStatus('Code imported to blocks');
    },
    onImportError: () => {
      scheduleAutosaveStatus('Code import needs valid MiniJava');
    }
  });
}


function updateMenuToggle(open: boolean): void {
  const button = byId<HTMLButtonElement>('menu-toggle');
  const icon = button.querySelector<HTMLElement>('.icon');
  const label = button.querySelector<HTMLElement>('.menu-label');
  if (icon) {
    icon.classList.toggle('icon-close', open);
    icon.classList.toggle('icon-menu', !open);
  }
  if (label) label.textContent = open ? 'Close' : 'Menu';
  button.title = open ? 'Close menu' : 'Menu';
  button.setAttribute('aria-label', open ? 'Close menu' : 'Open menu');
  button.setAttribute('aria-expanded', String(open));
  requestLayoutResize();
}

function initCommandPalette(): void {
  const click = (id: string): void => byId<HTMLButtonElement>(id).click();
  const commands: IdeCommand[] = [
    { id: 'file.new', category: 'File', label: 'New Workspace', shortcut: 'Ctrl N', run: newWorkspace },
    { id: 'file.open', category: 'File', label: 'Open Workspace or MiniJava File', shortcut: 'Ctrl O', run: () => click('load-workspace') },
    { id: 'file.save', category: 'File', label: 'Save Workspace', shortcut: 'Ctrl S', run: downloadWorkspace },
    { id: 'file.export', category: 'File', label: 'Export MiniJava Source', run: exportGeneratedCode },
    { id: 'file.autosave', category: 'File', label: 'Restore Autosave', run: loadAutosave },
    { id: 'run.program', category: 'Run', label: 'Run Program', shortcut: 'Ctrl F5', keywords: ['output', 'execute'], run: runProgram },
    { id: 'analysis.machine', category: 'Analysis', label: 'Open CESK Machine', run: () => openBottomTool('machine') },
    { id: 'analysis.compare', category: 'Analysis', label: 'Compare Model A and Model B', run: () => openBottomTool('compare') },
    { id: 'analysis.rewrite', category: 'Analysis', label: 'Open Rewrite Semantics', run: () => openBottomTool('subst') },
    { id: 'view.blocks', category: 'View', label: 'Show Blocks Sidebar', run: () => setActiveActivity('blocks') },
    { id: 'view.search', category: 'View', label: 'Search Blocks', shortcut: 'Ctrl Shift F', run: () => setActiveActivity('search') },
    { id: 'view.problems', category: 'View', label: 'Show Problems', run: showProblems },
    { id: 'view.inspector', category: 'View', label: 'Toggle MiniJava Inspector', run: () => { setCodeHidden(!codeHidden); markPerspectiveCustom(); } },
    { id: 'view.bottom', category: 'View', label: 'Toggle Bottom Tools', shortcut: 'Ctrl J', run: () => { setVizOpen(!isVizOpen()); markPerspectiveCustom(); } },
    { id: 'workspace.undo', category: 'Workspace', label: 'Undo Block Change', run: () => workspace?.undo(false) },
    { id: 'workspace.redo', category: 'Workspace', label: 'Redo Block Change', run: () => workspace?.undo(true) },
    { id: 'workspace.fit', category: 'Workspace', label: 'Fit Blocks in View', run: () => workspace?.zoomToFit() },
    { id: 'perspective.edit', category: 'Perspective', label: 'Switch to Edit Perspective', run: () => applyPerspective('edit') },
    { id: 'perspective.debug', category: 'Perspective', label: 'Switch to Debug Perspective', run: () => applyPerspective('debug') },
    { id: 'perspective.types', category: 'Perspective', label: 'Switch to Type Analysis Perspective', run: () => applyPerspective('types') },
    { id: 'perspective.presentation', category: 'Perspective', label: 'Switch to Presentation Perspective', run: () => applyPerspective('presentation') },
    { id: 'theme.toggle', category: 'Preferences', label: 'Toggle Color Theme', run: () => applyTheme(currentTheme === 'dark' ? 'light' : 'dark') }
  ];
  installCommandPalette(commands);
}

function wireInspectorTabKeyboard(): void {
  const tabs = Array.from(document.querySelectorAll<HTMLButtonElement>('.inspector-tab'));
  tabs.forEach((tab, index) => {
    tab.tabIndex = tab.classList.contains('is-active') ? 0 : -1;
    tab.addEventListener('keydown', (event) => {
      const offset = event.key === 'ArrowLeft' ? -1 : event.key === 'ArrowRight' ? 1 : 0;
      const targetIndex = event.key === 'Home' ? 0 : event.key === 'End' ? tabs.length - 1 : index + offset;
      if (!offset && event.key !== 'Home' && event.key !== 'End') return;
      event.preventDefault();
      const target = tabs[(targetIndex + tabs.length) % tabs.length];
      target.focus();
      target.click();
    });
  });
}

function wireEvents(): void {
  byId<HTMLInputElement>('toolbox-search').addEventListener('input', (event) => {
    renderToolbox((event.currentTarget as HTMLInputElement).value);
  });
  byId<HTMLButtonElement>('new-workspace').addEventListener('click', newWorkspace);
  byId<HTMLButtonElement>('save-workspace').addEventListener('click', downloadWorkspace);
  byId<HTMLButtonElement>('load-workspace').addEventListener('click', () => byId<HTMLInputElement>('load-file-input').click());
  byId<HTMLButtonElement>('export-code').addEventListener('click', exportGeneratedCode);
  byId<HTMLInputElement>('load-file-input').addEventListener('change', (event) => {
    const input = event.currentTarget as HTMLInputElement;
    const file = input.files?.[0];
    if (file && /\.(java|txt)$/i.test(file.name)) loadJavaSourceFile(file);
    else if (file) loadWorkspaceFile(file);
    input.value = '';
  });
  byId<HTMLButtonElement>('load-autosave').addEventListener('click', loadAutosave);
  byId<HTMLButtonElement>('toggle-code-column').addEventListener('click', () => {
    setCodeHidden(!codeHidden);
    markPerspectiveCustom();
  });
  byId<HTMLButtonElement>('toggle-toolbox').addEventListener('click', () => {
    setToolboxHidden(!toolboxHidden);
    markPerspectiveCustom();
  });
  byId<HTMLButtonElement>('show-code-button').addEventListener('click', () => {
    setCodeHidden(false);
    markPerspectiveCustom();
  });
  byId<HTMLButtonElement>('show-toolbox-button').addEventListener('click', () => {
    setToolboxHidden(false);
    markPerspectiveCustom();
  });
  byId<HTMLButtonElement>('toggle-code-maximize').addEventListener('click', () => setCodeMaximized(!codeMaximized));
  byId<HTMLButtonElement>('sidebar-scrim').addEventListener('click', () => setToolboxHidden(true));
  byId<HTMLButtonElement>('code-scrim').addEventListener('click', () => setCodeHidden(true));
  byId<HTMLButtonElement>('copy-code').addEventListener('click', copyCode);
  byId<HTMLButtonElement>('print-typing').addEventListener('click', printTyping);
  byId<HTMLButtonElement>('run-program').addEventListener('click', runProgram);
  byId<HTMLButtonElement>('sidebar-run-program').addEventListener('click', runProgram);
  byId<HTMLButtonElement>('sidebar-open-cesk').addEventListener('click', () => openAnalysisTool('machine'));
  byId<HTMLButtonElement>('sidebar-open-compare').addEventListener('click', () => openAnalysisTool('compare'));
  byId<HTMLButtonElement>('sidebar-open-rewrite').addEventListener('click', () => openAnalysisTool('subst'));
  byId<HTMLButtonElement>('sidebar-open-structure').addEventListener('click', () => openAnalysisTool('structure'));
  byId<HTMLButtonElement>('sidebar-open-value').addEventListener('click', () => openAnalysisTool('value'));
  byId<HTMLButtonElement>('settings-toggle-code').addEventListener('click', () => {
    setCodeHidden(!codeHidden);
    markPerspectiveCustom();
  });
  byId<HTMLButtonElement>('settings-toggle-bottom').addEventListener('click', () => {
    setVizOpen(!isVizOpen());
    markPerspectiveCustom();
  });
  byId<HTMLButtonElement>('workspace-undo').addEventListener('click', () => workspace?.undo(false));
  byId<HTMLButtonElement>('workspace-redo').addEventListener('click', () => workspace?.undo(true));
  byId<HTMLButtonElement>('workspace-zoom-out').addEventListener('click', () => workspace?.zoomCenter(-1));
  byId<HTMLButtonElement>('workspace-zoom-in').addEventListener('click', () => workspace?.zoomCenter(1));
  byId<HTMLButtonElement>('workspace-fit').addEventListener('click', () => {
    workspace?.zoomToFit();
    updateZoomIndicator();
  });

  for (const button of Array.from(document.querySelectorAll<HTMLButtonElement>('.activity-item[data-activity]'))) {
    button.addEventListener('click', () => {
      const activity = button.dataset.activity as ActivityKind;
      const compact = window.matchMedia('(max-width: 1100px)').matches;
      const sidebarOpen = !toolboxHidden && (!compact || document.body.classList.contains('mobile-sidebar-open'));
      if (activity === activeActivity && sidebarOpen) {
        setToolboxHidden(true);
        markPerspectiveCustom();
      } else {
        setActiveActivity(activity);
      }
    });
  }
  for (const button of Array.from(document.querySelectorAll<HTMLButtonElement>('.perspective-option[data-perspective]'))) {
    button.addEventListener('click', () => applyPerspective(button.dataset.perspective as Perspective));
  }
  byId<HTMLSelectElement>('perspective-select').addEventListener('change', (event) => {
    applyPerspective((event.currentTarget as HTMLSelectElement).value as Perspective);
  });
  byId<HTMLButtonElement>('status-perspective').addEventListener('click', () => setActiveActivity('settings'));
  byId<HTMLButtonElement>('status-problems-button').addEventListener('click', showProblems);
  for (const tab of Array.from(document.querySelectorAll<HTMLButtonElement>('.inspector-tab'))) {
    tab.addEventListener('click', () => selectInspectorPanel((tab.dataset.panel ?? 'code') as InspectorPanel));
  }
  wireInspectorTabKeyboard();
  byId<HTMLInputElement>('theme-toggle').addEventListener('change', (event) => {
    const isDark = (event.currentTarget as HTMLInputElement).checked;
    applyTheme(isDark ? 'dark' : 'light');
  });
  byId<HTMLButtonElement>('about-button').addEventListener('click', () => {
    const modal = byId<HTMLDialogElement>('about-modal');
    if (typeof modal.showModal === 'function') modal.showModal();
    else modal.setAttribute('open', 'open');
  });
  byId<HTMLInputElement>('autosave-interval').addEventListener('input', updateAutosaveIntervalLabel);
  byId<HTMLButtonElement>('menu-toggle').addEventListener('click', () => {
    const menu = byId<HTMLElement>('main-menu');
    const isOpen = menu.classList.toggle('menu-open');
    updateMenuToggle(isOpen);
  });
  byId<HTMLButtonElement>('zoom-indicator').addEventListener('click', () => {
    if (!workspace) return;
    workspace.setScale(1);
    workspace.scrollCenter();
    updateZoomIndicator();
  });
  document.addEventListener('keydown', (event) => {
    const modifier = event.ctrlKey || event.metaKey;
    const key = event.key.toLocaleLowerCase();
    if (modifier && !event.shiftKey && key === 's') {
      event.preventDefault();
      downloadWorkspace();
    } else if (modifier && !event.shiftKey && key === 'o') {
      event.preventDefault();
      byId<HTMLInputElement>('load-file-input').click();
    } else if (modifier && !event.shiftKey && key === 'n') {
      event.preventDefault();
      newWorkspace();
    } else if (modifier && !event.shiftKey && key === 'j') {
      event.preventDefault();
      setVizOpen(!isVizOpen());
      markPerspectiveCustom();
    } else if (modifier && event.shiftKey && key === 'f') {
      event.preventDefault();
      setActiveActivity('search');
    } else if (modifier && event.key === 'F5') {
      event.preventDefault();
      runProgram();
    }
  });
  new MutationObserver(updateProjectIdentity).observe(byId<HTMLDivElement>('loaded-file-label'), {
    childList: true,
    characterData: true,
    subtree: true
  });
  window.addEventListener('bmj:problem-located', () => {
    if (window.matchMedia('(max-width: 1100px)').matches) setToolboxHidden(true);
  });
  document.addEventListener('fullscreenchange', () => requestLayoutResize());
  window.addEventListener('resize', () => {
    const compact = window.matchMedia('(max-width: 1100px)').matches;
    if (compact && !compactPanelLayout) {
      document.body.classList.remove('mobile-sidebar-open', 'mobile-code-open');
    }
    compactPanelLayout = compact;
    updateActivityButtons();
    if (window.matchMedia('(min-width: 901px)').matches) {
      byId<HTMLElement>('main-menu').classList.remove('menu-open');
      updateMenuToggle(false);
    }
    requestLayoutResize();
  });
}

function restorePreferences(): void {
  const savedTheme = localStorage.getItem(THEME_KEY);
  currentTheme = savedTheme === 'light' ? 'light' : 'dark';
  const savedInterval = localStorage.getItem(AUTOSAVE_INTERVAL_KEY);
  if (savedInterval) {
    const value = Math.min(20, Math.max(2, Number(savedInterval)));
    if (!Number.isNaN(value)) byId<HTMLInputElement>('autosave-interval').value = String(value);
  }
  const savedCodeWidth = Number(localStorage.getItem(CODE_WIDTH_KEY));
  if (Number.isFinite(savedCodeWidth) && savedCodeWidth > 0) setCodeWidth(savedCodeWidth);
  const savedSidebarWidth = Number(localStorage.getItem(SIDEBAR_WIDTH_KEY));
  if (Number.isFinite(savedSidebarWidth) && savedSidebarWidth > 0) setSidebarWidth(savedSidebarWidth);

  const savedActivity = localStorage.getItem(ACTIVE_ACTIVITY_KEY) as ActivityKind | null;
  setActiveActivity(savedActivity && ACTIVITY_KINDS.includes(savedActivity) ? savedActivity : 'blocks', false, false);
  setToolboxHidden(!storedBoolean(SIDEBAR_VISIBLE_KEY, true));
  setCodeHidden(!storedBoolean(CODE_VISIBLE_KEY, true));

  const savedPerspective = localStorage.getItem(PERSPECTIVE_KEY) as Perspective | null;
  setPerspectiveIdentity(savedPerspective && PERSPECTIVES.includes(savedPerspective) ? savedPerspective : 'edit', false);
  if (compactPanelLayout) {
    document.body.classList.remove('mobile-sidebar-open', 'mobile-code-open');
    updateActivityButtons();
  }
  applyTheme(currentTheme);
  updateAutosaveIntervalLabel();
}

export function startBlockMiniJava(): void {
  registerMiniJavaRenderer();
  defineMiniJavaBlocks();
  registerMiniJavaContextMenus();
  renderToolbox();
  restorePreferences();
  wireEvents();
  initToolboxDragAndDrop();
  initSidebarResizer();
  initCodeResizer();
  initBlockly();
  installCodeEditor();
  initVisualizationPanel(() => requestLayoutResize());
  initStepperPanel(() => workspace);
  initComparePanel(() => workspace);
  initSubstPanel(() => workspace);
  initTypingPanel(() => workspace);
  initCommandPalette();
  initLayoutResizeCoordinator();
  initExamplesMenu(
    () => workspace,
    onExampleLoaded
  );
  restartAutosaveTimer();
}
