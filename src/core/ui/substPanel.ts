/**
 * The substitution stepper panel (viz-dock "Rewrite" tab) — §7's single
 * surface: every state is a self-contained block-tree rendered in its own
 * workspace; each step is a literal rewrite and the produced node is
 * highlighted. A live correspondence line checks each salient rule against
 * the Model B machine's trace of the same program.
 */

import * as Blockly from 'blockly';
import { BLOCKLY_RENDERER, createBlocklyTheme } from '../renderer/theme';
import {
  formatTree,
  injectSubstitution,
  stepSubstitution,
  type SubstitutionState
} from '../semantics/minijavaSubstitution';
import { injectMachine, step as machineStep } from '../semantics/minijavaMachine';
import { mirrorProgramOutput } from './programConsole';

const PLAY_INTERVAL_MS = 700;
const MAX_HISTORY = 2000;
const SALIENT = new Set(['add', 'sub', 'mul', 'less', 'not', 'and', 'and-short-circuit', 'new', 'call']);

type GetWorkspace = () => Blockly.WorkspaceSvg | null;

interface Snapshot {
  state: SubstitutionState;
  salientCount: number;
  agreement: string;
}

let getWorkspace: GetWorkspace = () => null;
let workspace: Blockly.WorkspaceSvg | null = null;
let current: SubstitutionState | null = null;
let history: Snapshot[] = [];
let machineSalient: string[] | null = null;
let salientCount = 0;
let agreement = '';
let stale = false;
let playTimer: number | null = null;
let listening = false;

function byId<T extends HTMLElement>(id: string): T {
  const el = document.getElementById(id);
  if (!el) throw new Error(`Missing element #${id}`);
  return el as T;
}

function currentTheme(): 'dark' | 'light' {
  return document.body.dataset.theme === 'light' ? 'light' : 'dark';
}

function ensureWorkspace(): Blockly.WorkspaceSvg {
  if (workspace) return workspace;
  workspace = Blockly.inject(byId<HTMLDivElement>('subst-workspace'), {
    renderer: BLOCKLY_RENDERER,
    theme: createBlocklyTheme(currentTheme()),
    trashcan: false,
    readOnly: true,
    grid: { spacing: 20, length: 3, snap: false },
    // Same wheel behavior as the main workspace: plain wheel scrolls,
    // ctrl+wheel zooms.
    move: { scrollbars: { horizontal: true, vertical: true }, drag: true, wheel: true },
    zoom: { controls: true, wheel: true, startScale: 0.9, maxScale: 2.5, minScale: 0.3, scaleSpeed: 1.2, pinch: true }
  });
  return workspace;
}

/** Theme switches rebuild Blockly workspaces; ours is recreated on demand. */
export function disposeSubstWorkspace(): void {
  if (!workspace) return;
  try {
    workspace.dispose();
  } catch {
    /* Ignore Blockly disposal edge cases during theme switches. */
  }
  workspace = null;
  byId<HTMLDivElement>('subst-workspace').innerHTML = '';
  if (current) renderAll();
}

function stopPlay(): void {
  if (playTimer !== null) {
    window.clearInterval(playTimer);
    playTimer = null;
  }
  byId<HTMLButtonElement>('subst-play').textContent = 'Play';
}

function markStale(): void {
  if (!current || stale) return;
  stale = true;
  stopPlay();
  renderAll();
}

function attachWorkspaceListener(): void {
  if (listening) return;
  const main = getWorkspace();
  if (!main) return;
  listening = true;
  main.addChangeListener((event) => {
    if (!current || stale) return;
    if (
      event.type === Blockly.Events.BLOCK_CREATE ||
      event.type === Blockly.Events.BLOCK_DELETE ||
      event.type === Blockly.Events.BLOCK_CHANGE ||
      event.type === Blockly.Events.BLOCK_FIELD_INTERMEDIATE_CHANGE
    ) {
      markStale();
      return;
    }
    if (event.type === Blockly.Events.BLOCK_MOVE) {
      const move = event as { oldParentId?: string; newParentId?: string; oldInputName?: string; newInputName?: string };
      if (move.oldParentId !== move.newParentId || move.oldInputName !== move.newInputName) markStale();
    }
  });
}

/** Full Model B machine run of the same program, keeping the salient rules. */
function computeMachineSalient(main: Blockly.Workspace): string[] | null {
  const initial = injectMachine(main, 'B');
  if ('injectError' in initial) return null;
  let state = initial;
  const rules: string[] = [];
  while (state.status === 'running' && state.stepCount < 100000) {
    state = machineStep(state);
    if (state.lastRule && SALIENT.has(state.lastRule)) rules.push(state.lastRule);
  }
  return state.status === 'done' ? rules : null;
}

function renderStatus(): void {
  const status = byId<HTMLSpanElement>('subst-status');
  const corr = byId<HTMLSpanElement>('subst-correspondence');
  status.removeAttribute('data-state');
  corr.textContent = '';
  if (!current) {
    status.textContent = 'Press Load to rewrite the println expression step by step.';
    return;
  }
  if (stale) {
    status.textContent = 'Program changed — press Load to restart.';
    status.dataset.state = 'stale';
    return;
  }
  if (current.status === 'error') {
    status.textContent = `Stuck after ${current.stepCount} rewrite(s): ${current.error}`;
    status.dataset.state = 'error';
  } else if (current.status === 'done') {
    status.textContent = `Value after ${current.stepCount} rewrite(s): ${formatTree(current.tree)}`;
    status.dataset.state = 'done';
  } else {
    status.textContent = `rewrite ${current.stepCount}${current.lastRule ? ` · ${current.lastRule}` : ''}`;
  }
  corr.textContent = agreement;
}

function renderButtons(): void {
  const canStep = !!current && !stale && current.status === 'running';
  byId<HTMLButtonElement>('subst-step').disabled = !canStep;
  byId<HTMLButtonElement>('subst-play').disabled = !canStep && playTimer === null;
  byId<HTMLButtonElement>('subst-back').disabled = history.length === 0 || stale;
}

function renderTree(): void {
  const host = ensureWorkspace();
  host.clear();
  if (!current) return;
  try {
    const state = JSON.parse(JSON.stringify(current.tree)) as Record<string, unknown>;
    state.x = 24;
    state.y = 24;
    Blockly.serialization.blocks.append(state as never, host);
    if (current.redexId) {
      (host.getBlockById(current.redexId) as Blockly.BlockSvg | null)?.setHighlighted(true);
    }
    Blockly.svgResize(host);
  } catch (error) {
    console.error('[B-MJ] substitution render failed', error);
  }
}

function renderAll(): void {
  renderStatus();
  renderButtons();
  renderTree();
  if (current && !stale) {
    if (current.status === 'done') {
      mirrorProgramOutput('Rewrite · substitution', [formatTree(current.tree)], '— program finished —');
    } else if (current.status === 'error') {
      mirrorProgramOutput('Rewrite · substitution', [], `Error: ${current.error}`);
    } else {
      mirrorProgramOutput('Rewrite · substitution', []);
    }
  }
}

function loadSubstitution(): void {
  stopPlay();
  history = [];
  stale = false;
  salientCount = 0;
  agreement = '';
  const main = getWorkspace();
  if (!main) return;
  attachWorkspaceListener();
  const initial = injectSubstitution(main);
  if ('injectError' in initial) {
    current = null;
    renderAll();
    const status = byId<HTMLSpanElement>('subst-status');
    status.textContent = initial.injectError;
    status.dataset.state = 'error';
    return;
  }
  current = initial;
  machineSalient = computeMachineSalient(main);
  agreement = machineSalient ? `Model B machine: ${machineSalient.length} salient step(s) ahead` : '';
  renderAll();
}

function updateAgreement(rule: string | null): void {
  if (!rule || !SALIENT.has(rule)) return;
  if (!machineSalient) {
    agreement = 'Model B machine unavailable for this program';
    return;
  }
  const expected = machineSalient[salientCount];
  salientCount += 1;
  agreement =
    expected === rule
      ? `machine agrees: ${salientCount}/${machineSalient.length} salient rules`
      : `Warning: diverged from the machine at rule ${salientCount} (machine: ${expected ?? 'none'}, rewrite: ${rule})`;
}

function stepOnce(): void {
  if (!current || stale || current.status !== 'running') {
    stopPlay();
    renderButtons();
    return;
  }
  history.push({ state: current, salientCount, agreement });
  if (history.length > MAX_HISTORY) history.shift();
  current = stepSubstitution(current);
  updateAgreement(current.lastRule);
  if (current.status !== 'running') stopPlay();
  renderAll();
}

function stepBack(): void {
  if (history.length === 0 || stale) return;
  stopPlay();
  const snapshot = history.pop()!;
  current = snapshot.state;
  salientCount = snapshot.salientCount;
  agreement = snapshot.agreement;
  renderAll();
}

function togglePlay(): void {
  if (playTimer !== null) {
    stopPlay();
    renderButtons();
    return;
  }
  if (!current || stale || current.status !== 'running') return;
  byId<HTMLButtonElement>('subst-play').textContent = 'Pause';
  playTimer = window.setInterval(stepOnce, PLAY_INTERVAL_MS);
}

/** Dock "Re-run" button while the rewrite tab is active. */
export function resetSubstFromDock(): void {
  loadSubstitution();
}

/** Called by the viz dock when the rewrite tab is shown/hidden. */
export function setSubstTabVisible(visible: boolean): void {
  if (!visible) {
    stopPlay();
    return;
  }
  if (workspace) window.setTimeout(() => workspace && Blockly.svgResize(workspace), 60);
}

export function initSubstPanel(getter: GetWorkspace): void {
  getWorkspace = getter;
  byId<HTMLButtonElement>('subst-load').addEventListener('click', loadSubstitution);
  byId<HTMLButtonElement>('subst-step').addEventListener('click', stepOnce);
  byId<HTMLButtonElement>('subst-back').addEventListener('click', stepBack);
  byId<HTMLButtonElement>('subst-play').addEventListener('click', togglePlay);
  attachWorkspaceListener();
  renderStatus();
  renderButtons();
}
