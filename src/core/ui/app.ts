import * as Blockly from 'blockly';
import { defineMiniJavaBlocks, MINI_JAVA_CATEGORIES, MINI_JAVA_REQUIRED_BLOCK_TYPES } from '../blocks/minijavaBlocks';
import { generateMiniJava } from '../generator/minijavaGenerator';
import { highlightMiniJava } from '../generator/highlighter';
import { BLOCKLY_RENDERER, createBlocklyTheme } from '../renderer/theme';
import { registerMiniJavaRenderer } from '../renderer/minijavaRenderer';
import { registerMiniJavaContextMenus } from './contextMenus';
import { disposeVizWorkspaces, initVisualizationPanel, setVizOpen } from './visualizationPanel';
import { initExamplesMenu } from './examplesMenu';
import type { MiniJavaExample } from '../examples';
import { installEditableMiniJavaCodeEditor, type EditableMiniJavaCodeEditor } from './codeEditor';
import { refreshTypeDiagnostics } from './typeDiagnostics';
import { initStepperPanel } from './stepperPanel';

const AUTOSAVE_KEY = 'block-minijava.autosave.v2';
const THEME_KEY = 'block-minijava.theme';
const AUTOSAVE_INTERVAL_KEY = 'block-minijava.autosave.interval';
const CODE_WIDTH_KEY = 'block-minijava.code.width';

let workspace: Blockly.WorkspaceSvg | null = null;
let codeEditor: EditableMiniJavaCodeEditor | null = null;
let autosaveTimer: number | null = null;
let requiredBlockTimer: number | null = null;
let typeCheckTimer: number | null = null;
let latestCode = '';
let codeHidden = false;
let toolboxHidden = false;
let currentTheme: 'dark' | 'light' = 'dark';
let clickAddOffset = 0;
let enforcingRequiredBlocks = false;

const TOOLBOX_BLOCK_MIME = 'application/x-block-minijava-block';
const [GOAL_BLOCK_TYPE, MAIN_BLOCK_TYPE] = MINI_JAVA_REQUIRED_BLOCK_TYPES;
const BLOCK_WORKSPACE_MUTATION_EVENTS = new Set<string>([
  Blockly.Events.BLOCK_CREATE,
  Blockly.Events.BLOCK_DELETE,
  Blockly.Events.BLOCK_CHANGE,
  Blockly.Events.BLOCK_FIELD_INTERMEDIATE_CHANGE,
  Blockly.Events.BLOCK_MOVE
]);
type InspectorPanel = 'code' | 'output' | 'problems';

function byId<T extends HTMLElement>(id: string): T {
  const el = document.getElementById(id);
  if (!el) throw new Error(`Missing element #${id}`);
  return el as T;
}

function syncBlocklySize(): void {
  if (workspace) {
    Blockly.svgResize(workspace);
  }
}

function scheduleBlocklyResize(): void {
  window.setTimeout(syncBlocklySize, 40);
  window.setTimeout(syncBlocklySize, 160);
}

function setEyeIcon(button: HTMLElement, isEyeOff: boolean): void {
  const icon = button.querySelector<HTMLElement>('.eye-symbol');
  if (icon) icon.classList.toggle('eye-off', isEyeOff);
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
  const block = workspace.newBlock(type);
  block.initSvg();
  block.render();
  block.moveBy(position.x, position.y);
  block.select();
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

function appendConsoleOutput(message: string): void {
  const output = byId<HTMLPreElement>('program-output');
  const current = output.textContent?.trim();
  output.textContent = current && current !== 'No run yet.' ? `${current}\n${message}` : message;
}

function selectInspectorPanel(panel: InspectorPanel): void {
  for (const tab of Array.from(document.querySelectorAll<HTMLButtonElement>('.inspector-tab'))) {
    const isActive = tab.dataset.panel === panel;
    tab.classList.toggle('is-active', isActive);
    tab.setAttribute('aria-selected', String(isActive));
  }
  for (const section of Array.from(document.querySelectorAll<HTMLElement>('.inspector-panel'))) {
    section.classList.toggle('is-active', section.id === `panel-${panel}`);
  }
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
}

function setCodeHidden(next: boolean): void {
  codeHidden = next;
  document.body.classList.toggle('code-hidden', codeHidden);

  const column = byId<HTMLButtonElement>('toggle-code-column');
  const showButton = byId<HTMLButtonElement>('show-code-button');

  setEyeIcon(column, !codeHidden);
  setEyeIcon(showButton, false);

  column.title = codeHidden ? 'Show code' : 'Hide code';
  column.setAttribute('aria-label', codeHidden ? 'Show code' : 'Hide code');
  showButton.title = 'Show MiniJava';
  showButton.setAttribute('aria-label', 'Show MiniJava code');

  scheduleBlocklyResize();
}


function setToolboxHidden(next: boolean): void {
  toolboxHidden = next;
  document.body.classList.toggle('toolbox-hidden', toolboxHidden);

  const button = byId<HTMLButtonElement>('toggle-toolbox');
  const showButton = byId<HTMLButtonElement>('show-toolbox-button');

  setEyeIcon(button, !toolboxHidden);
  setEyeIcon(showButton, false);

  button.title = toolboxHidden ? 'Show Toolbox' : 'Hide Toolbox';
  button.setAttribute('aria-label', toolboxHidden ? 'Show toolbox' : 'Hide toolbox');
  showButton.title = 'Show Toolbox';
  showButton.setAttribute('aria-label', 'Show toolbox');

  scheduleBlocklyResize();
}


function makeWorkspaceStateBlob(): Blob {
  if (!workspace) throw new Error('Workspace is not ready');
  const state = Blockly.serialization.workspaces.save(workspace);
  return new Blob([JSON.stringify({ version: 1, state }, null, 2)], { type: 'application/json' });
}

function downloadWorkspace(): void {
  const requestedName = window.prompt('Workspace file name', workspaceFileDisplayName());
  if (requestedName === null) return;

  const fileName = normalizeBmlFileName(requestedName);
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
}

function normalizeJavaFileName(value: string): string {
  const cleaned = value.trim().replace(/[\\/:*?"<>|]+/g, '-').replace(/\s+/g, '-');
  const fallback = cleaned || workspaceFileDisplayName() || 'Project';
  return fallback.toLowerCase().endsWith('.java') ? fallback : `${fallback.replace(/\.bml$/i, '')}.java`;
}

function exportGeneratedCode(): void {
  const requestedName = window.prompt('Java file name', `${workspaceFileDisplayName()}.java`);
  if (requestedName === null) return;

  const fileName = normalizeJavaFileName(requestedName);
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
  appendConsoleOutput(`Exported ${fileName}`);
  selectInspectorPanel('output');
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
      appendConsoleOutput('MiniJava code copied to clipboard.');
    })
    .catch(() => {
      scheduleAutosaveStatus('Copy failed');
      appendConsoleOutput('Clipboard copy failed.');
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

function renderToolbox(): void {
  const root = byId<HTMLDivElement>('toolbox-content');
  root.innerHTML = '';

  for (const category of MINI_JAVA_CATEGORIES) {
    const group = document.createElement('section');
    group.className = 'toolbox-category';
    group.dataset.category = category.id;

    const header = document.createElement('button');
    header.type = 'button';
    header.className = 'toolbox-category-header';
    header.innerHTML = `<span class="category-left"><span class="category-icon" aria-hidden="true">${category.icon}</span><span>${category.label}</span></span><span class="category-caret" aria-hidden="true">⌄</span>`;
    header.addEventListener('click', () => {
      group.classList.toggle('collapsed');
    });

    const list = document.createElement('div');
    list.className = 'toolbox-block-list';
    for (const block of category.blocks) {
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
    }

    group.append(header, list);
    root.appendChild(group);
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


function setCodeWidth(width: number): void {
  const clamped = Math.min(Math.max(width, 300), Math.min(window.innerWidth * 0.68, 900));
  document.documentElement.style.setProperty('--code-width', `${Math.round(clamped)}px`);
  localStorage.setItem(CODE_WIDTH_KEY, String(Math.round(clamped)));
  window.setTimeout(syncBlocklySize, 20);
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
    return rect.width || Number.parseInt(getComputedStyle(document.documentElement).getPropertyValue('--code-width'), 10) || 430;
  };

  const onPointerMove = (event: PointerEvent): void => {
    const delta = event.clientX - startX;
    setCodeWidth(startWidth - delta);
  };

  const stopResize = (): void => {
    document.body.classList.remove('is-resizing-code');
    window.removeEventListener('pointermove', onPointerMove);
    window.removeEventListener('pointerup', stopResize);
    syncBlocklySize();
  };

  resizer.addEventListener('pointerdown', (event) => {
    if (codeHidden || window.matchMedia('(max-width: 980px)').matches) return;
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
  updateZoomIndicator();
  window.setTimeout(syncBlocklySize, 100);
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
  scheduleBlocklyResize();
}

function wireEvents(): void {
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
  byId<HTMLButtonElement>('toggle-code-column').addEventListener('click', () => setCodeHidden(!codeHidden));
  byId<HTMLButtonElement>('toggle-toolbox').addEventListener('click', () => setToolboxHidden(!toolboxHidden));
  byId<HTMLButtonElement>('show-code-button').addEventListener('click', () => setCodeHidden(false));
  byId<HTMLButtonElement>('show-toolbox-button').addEventListener('click', () => setToolboxHidden(false));
  byId<HTMLButtonElement>('copy-code').addEventListener('click', copyCode);
  for (const tab of Array.from(document.querySelectorAll<HTMLButtonElement>('.inspector-tab'))) {
    tab.addEventListener('click', () => selectInspectorPanel((tab.dataset.panel ?? 'code') as InspectorPanel));
  }
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
  window.addEventListener('resize', () => {
    if (window.matchMedia('(min-width: 981px)').matches) {
      byId<HTMLElement>('main-menu').classList.remove('menu-open');
      updateMenuToggle(false);
    }
    scheduleBlocklyResize();
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
  if (!Number.isNaN(savedCodeWidth) && savedCodeWidth > 0) setCodeWidth(savedCodeWidth);
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
  initCodeResizer();
  initBlockly();
  installCodeEditor();
  initVisualizationPanel(syncBlocklySize);
  initStepperPanel(() => workspace);
  initExamplesMenu(
    () => workspace,
    onExampleLoaded
  );
  restartAutosaveTimer();
}
