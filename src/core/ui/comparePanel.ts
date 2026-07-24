/**
 * The A vs B lockstep stepper (viz-dock "A vs B" tab) — the design note's
 * §8 artifact: one program stepped under Value Model A (heap references)
 * and Value Model B (inline structures) side by side, one Step driving
 * both machines. On the contrast program the A side's aliases both change
 * on a field write while the B side's original value stays put.
 *
 * Both machines share the control flow, so they stay in step-sync until a
 * program branches on a value the models disagree about — and that moment
 * of divergence is itself the lesson.
 */

import * as Blockly from 'blockly';
import {
  formatMachineValue,
  injectMachine,
  step,
  type Frame,
  type MachineState,
  type MachineValue
} from '../semantics/minijavaMachine';
import { mirrorProgramOutput } from './programConsole';
import { bindDockStepKeys } from './dockKeyboard';

const PLAY_INTERVAL_MS = 600;
const MAX_HISTORY = 5000;

type GetWorkspace = () => Blockly.WorkspaceSvg | null;

let getWorkspace: GetWorkspace = () => null;
let stateA: MachineState | null = null;
let stateB: MachineState | null = null;
let history: Array<[MachineState, MachineState]> = [];
let stale = false;
let playTimer: number | null = null;
let highlightedIds: string[] = [];
let listening = false;

function byId<T extends HTMLElement>(id: string): T {
  const el = document.getElementById(id);
  if (!el) throw new Error(`Missing element #${id}`);
  return el as T;
}

function locHue(loc: number): number {
  return (loc * 67) % 360;
}

/** Scrolls Model A's heap panel to a box and flashes it — the same affordance
 * the CESK tab gives its Ref chips (audit U7: a chip must mean the same thing
 * in every stepper). */
function revealHeapBox(loc: number): void {
  const box = document.querySelector<HTMLElement>(`#compare-heap-a .stepper-heap-box[data-heap-loc="${loc}"]`);
  if (!box) return;
  box.scrollIntoView({ block: 'nearest', behavior: 'smooth' });
  box.classList.remove('is-changed');
  void box.offsetWidth; // restart the flash animation
  box.classList.add('is-changed');
}

/** Selects and centers a program block in the main workspace — mirrors
 * stepperPanel's locateProvenance so a frame/heap row means the same thing
 * in both tabs. */
function locateProvenance(blockId: string | null): void {
  if (!blockId || stale) return;
  const ws = getWorkspace();
  if (!ws) return;
  const block = ws.getBlockById(blockId) as Blockly.BlockSvg | null;
  if (!block) return;
  ws.centerOnBlock(blockId);
  Blockly.common.setSelected(block);
}

function valueChip(value: MachineValue): HTMLElement {
  const chip = document.createElement('span');
  if (value.tag === 'Ref') {
    chip.className = 'stepper-ref';
    chip.style.setProperty('--loc-hue', String(locHue(value.loc)));
    chip.dataset.refLoc = String(value.loc);
    chip.textContent = `#${value.loc}`;
    chip.title = 'Show heap object #' + value.loc;
    chip.tabIndex = 0;
    chip.setAttribute('role', 'button');
    chip.addEventListener('click', () => revealHeapBox(value.loc));
    chip.addEventListener('keydown', (event) => {
      if (event.key === 'Enter' || event.key === ' ') {
        event.preventDefault();
        revealHeapBox(value.loc);
      }
    });
  } else if (value.tag === 'Obj' || value.tag === 'Arr') {
    chip.className = 'stepper-struct';
    chip.textContent = formatMachineValue(value);
  } else {
    chip.className = value.tag === 'Null' ? 'stepper-null' : 'stepper-scalar';
    chip.textContent = formatMachineValue(value);
  }
  return chip;
}

function hint(text: string): HTMLElement {
  const el = document.createElement('div');
  el.className = 'stepper-hint';
  el.textContent = text;
  return el;
}

function setHighlights(blockIds: string[]): void {
  const workspace = getWorkspace();
  if (!workspace) return;
  for (const id of highlightedIds) {
    if (!blockIds.includes(id)) {
      (workspace.getBlockById(id) as Blockly.BlockSvg | null)?.setHighlighted(false);
    }
  }
  for (const id of blockIds) {
    (workspace.getBlockById(id) as Blockly.BlockSvg | null)?.setHighlighted(true);
  }
  highlightedIds = blockIds;
}

function stopPlay(): void {
  if (playTimer !== null) {
    window.clearInterval(playTimer);
    playTimer = null;
  }
  byId<HTMLButtonElement>('compare-play').textContent = 'Play';
}

function markStale(): void {
  if ((!stateA && !stateB) || stale) return;
  stale = true;
  stopPlay();
  setHighlights([]);
  renderAll();
}

function attachWorkspaceListener(): void {
  if (listening) return;
  const workspace = getWorkspace();
  if (!workspace) return;
  listening = true;
  workspace.addChangeListener((event) => {
    if ((!stateA && !stateB) || stale) return;
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

function modelStatusText(state: MachineState): { text: string; state?: string } {
  if (state.status === 'error') return { text: `Stuck: ${state.error}`, state: 'error' };
  if (state.status === 'done') return { text: `Finished in ${state.stepCount} step(s)`, state: 'done' };
  return { text: `step ${state.stepCount}${state.lastRule ? ` · ${state.lastRule}` : ''}` };
}

function renderModelStatus(id: string, state: MachineState | null): void {
  const el = byId<HTMLDivElement>(id);
  el.removeAttribute('data-state');
  if (!state) {
    el.textContent = '';
    return;
  }
  const { text, state: dataState } = modelStatusText(state);
  el.textContent = text;
  if (dataState) el.dataset.state = dataState;
}

function renderFrames(hostId: string, state: MachineState | null): void {
  const host = byId<HTMLDivElement>(hostId);
  host.innerHTML = '';
  if (!state) {
    host.appendChild(hint('Press Load to build both machines.'));
    return;
  }
  const effect = state.lastEffect;
  [...state.stack].reverse().forEach((frame: Frame, i) => {
    const isTop = i === 0;
    const card = document.createElement('div');
    card.className = `stepper-frame${isTop ? ' is-top' : ''}`;

    const title = document.createElement('div');
    title.className = 'stepper-frame-title';
    const name = document.createElement('span');
    name.className = 'stepper-provenance';
    name.textContent = frame.method;
    name.title = frame.callBlockId ? 'Show the call that pushed this frame' : 'Show the main class block';
    const provenanceId = frame.callBlockId ?? frame.blockId;
    name.addEventListener('click', () => locateProvenance(provenanceId));
    title.appendChild(name);
    card.appendChild(title);

    const table = document.createElement('table');
    table.className = 'stepper-locals';
    if (frame.self !== null || frame.selfObj) {
      const row = table.insertRow();
      if (isTop && effect?.kind === 'self-write') row.className = 'is-changed';
      row.insertCell().textContent = 'this';
      row.insertCell().appendChild(valueChip(frame.selfObj ?? { tag: 'Ref', loc: frame.self! }));
    }
    for (const [localName, value] of frame.locals) {
      const row = table.insertRow();
      if (isTop && effect?.kind === 'local-write' && effect.name === localName) row.className = 'is-changed';
      row.insertCell().textContent = localName;
      row.insertCell().appendChild(valueChip(value));
    }
    if (table.rows.length > 0) card.appendChild(table);
    host.appendChild(card);
  });
}

function renderHeap(state: MachineState | null): void {
  const host = byId<HTMLDivElement>('compare-heap-a');
  host.innerHTML = '';
  if (!state) return;
  if (state.heap.size === 0) {
    host.appendChild(hint('No heap yet — Model A allocates a cell on the first new.'));
    return;
  }
  const effect = state.lastEffect;
  for (const [loc, obj] of [...state.heap].sort(([a], [b]) => a - b)) {
    const box = document.createElement('div');
    box.className = 'stepper-heap-box';
    box.style.setProperty('--loc-hue', String(locHue(loc)));
    box.dataset.heapLoc = String(loc);
    if (effect?.kind === 'new' && effect.loc === loc) box.classList.add('is-changed');
    if ((effect?.kind === 'field-write' || effect?.kind === 'arr-write') && effect.loc === loc) {
      box.classList.add('is-write-target');
    }

    const title = document.createElement('div');
    title.className = 'stepper-heap-title stepper-provenance';
    title.textContent = obj.tag === 'Obj' ? `#${loc} · ${obj.className}` : `#${loc} · int[${obj.elems.length}]`;
    title.title = 'Show the new block that allocated this object';
    title.addEventListener('click', () => locateProvenance(obj.blockId));
    box.appendChild(title);

    const table = document.createElement('table');
    table.className = 'stepper-locals';
    if (obj.tag === 'Obj') {
      for (const [field, value] of obj.fields) {
        const row = table.insertRow();
        if (effect?.kind === 'field-write' && effect.loc === loc && effect.field === field) row.className = 'is-changed';
        row.insertCell().textContent = field;
        row.insertCell().appendChild(valueChip(value));
      }
    } else {
      obj.elems.forEach((value, index) => {
        const row = table.insertRow();
        if (effect?.kind === 'arr-write' && effect.loc === loc && effect.index === index) row.className = 'is-changed';
        row.insertCell().textContent = `[${index}]`;
        row.insertCell().appendChild(valueChip(value));
      });
    }
    if (table.rows.length > 0) box.appendChild(table);
    host.appendChild(box);
  }
}

function renderOutput(id: string, state: MachineState | null): void {
  const pre = byId<HTMLPreElement>(id);
  pre.textContent = state ? state.output.join('\n') : '';
  pre.classList.toggle('is-changed', state?.lastEffect?.kind === 'output');
}

function renderStatus(): void {
  const status = byId<HTMLSpanElement>('compare-status');
  status.removeAttribute('data-state');
  if (!stateA || !stateB) {
    status.textContent = 'Press Load to run the program under both value models.';
    return;
  }
  if (stale) {
    status.textContent = 'Program changed — press Load to restart.';
    status.dataset.state = 'stale';
    return;
  }
  if (stateA.status !== 'running' && stateB.status !== 'running') {
    const agree = stateA.output.join('\n') === stateB.output.join('\n');
    status.textContent = agree ? 'Both finished — same output' : 'Both finished — different output';
    status.dataset.state = agree ? 'done' : 'stale';
    return;
  }
  status.textContent = `lockstep · ${history.length} step(s)`;
}

const STEP_TITLE = 'One step on both machines (→ / .)';
const PLAY_TITLE = 'Step both automatically (Space)';
const BACK_TITLE = 'Undo one lockstep step (← / ,)';

/** Why Step/Play can't fire right now (interaction contract, brief §5). */
function stepDisabledReason(): string {
  if (!stateA || !stateB) return 'Press Load to build both machines first';
  if (stale) return 'Program changed — press Reload';
  if (stateA.status !== 'running' && stateB.status !== 'running') return 'Both finished — nothing left to step';
  return STEP_TITLE;
}

function renderButtons(): void {
  const canStep = !stale && !!stateA && !!stateB && (stateA.status === 'running' || stateB.status === 'running');
  const stepButton = byId<HTMLButtonElement>('compare-step');
  const playButton = byId<HTMLButtonElement>('compare-play');
  const backButton = byId<HTMLButtonElement>('compare-back');

  stepButton.disabled = !canStep;
  stepButton.title = canStep ? STEP_TITLE : stepDisabledReason();

  const canPlay = canStep || playTimer !== null;
  playButton.disabled = !canPlay;
  playButton.title = canPlay ? PLAY_TITLE : stepDisabledReason();

  const canBack = history.length > 0 && !stale;
  backButton.disabled = !canBack;
  backButton.title = canBack ? BACK_TITLE : 'At the start — no earlier step to return to';
}

function renderAll(): void {
  renderStatus();
  renderButtons();
  renderModelStatus('compare-status-a', stateA);
  renderModelStatus('compare-status-b', stateB);
  renderFrames('compare-frames-a', stateA);
  renderFrames('compare-frames-b', stateB);
  renderHeap(stateA);
  renderOutput('compare-output-a', stateA);
  renderOutput('compare-output-b', stateB);
  if (stateA && stateB) {
    const finished = stateA.status !== 'running' && stateB.status !== 'running';
    const agree = stateA.output.join('\n') === stateB.output.join('\n');
    mirrorProgramOutput(
      'A vs B · lockstep',
      ['— Model A —', ...stateA.output, '— Model B —', ...stateB.output],
      finished ? (agree ? '— same output —' : '— DIFFERENT output —') : undefined
    );
  }

  if (stale) return;
  const focusIds: string[] = [];
  for (const state of [stateA, stateB]) {
    if (state?.status === 'running' && state.focusBlockId && !focusIds.includes(state.focusBlockId)) {
      focusIds.push(state.focusBlockId);
    }
  }
  setHighlights(focusIds);
}

function loadBoth(): void {
  stopPlay();
  setHighlights([]);
  history = [];
  stale = false;
  const workspace = getWorkspace();
  if (!workspace) return;
  attachWorkspaceListener();
  const a = injectMachine(workspace, 'A');
  const b = injectMachine(workspace, 'B');
  if ('injectError' in a || 'injectError' in b) {
    stateA = null;
    stateB = null;
    renderAll();
    const status = byId<HTMLSpanElement>('compare-status');
    status.textContent = 'injectError' in a ? a.injectError : (b as { injectError: string }).injectError;
    status.dataset.state = 'error';
    return;
  }
  stateA = a;
  stateB = b;
  renderAll();
}

function stepBoth(): void {
  if (!stateA || !stateB || stale || (stateA.status !== 'running' && stateB.status !== 'running')) {
    stopPlay();
    renderButtons();
    return;
  }
  history.push([stateA, stateB]);
  if (history.length > MAX_HISTORY) history.shift();
  stateA = step(stateA);
  stateB = step(stateB);
  if (stateA.status !== 'running' && stateB.status !== 'running') stopPlay();
  renderAll();
}

function stepBack(): void {
  if (history.length === 0 || stale) return;
  stopPlay();
  [stateA, stateB] = history.pop()!;
  renderAll();
}

function togglePlay(): void {
  if (playTimer !== null) {
    stopPlay();
    renderButtons();
    return;
  }
  if (!stateA || !stateB || stale) return;
  byId<HTMLButtonElement>('compare-play').textContent = 'Pause';
  playTimer = window.setInterval(stepBoth, PLAY_INTERVAL_MS);
}

/** Dock "Re-run" button while the compare tab is active. */
export function resetCompareFromDock(): void {
  loadBoth();
}

/** Called by the viz dock when the compare tab is shown/hidden. */
export function setCompareTabVisible(visible: boolean): void {
  if (!visible) stopPlay();
}

export function initComparePanel(getter: GetWorkspace): void {
  getWorkspace = getter;
  byId<HTMLButtonElement>('compare-load').addEventListener('click', loadBoth);
  byId<HTMLButtonElement>('compare-step').addEventListener('click', stepBoth);
  byId<HTMLButtonElement>('compare-back').addEventListener('click', stepBack);
  byId<HTMLButtonElement>('compare-play').addEventListener('click', togglePlay);
  bindDockStepKeys(byId<HTMLElement>('viz-dock'), 'compare', {
    load: loadBoth,
    step: stepBoth,
    back: stepBack,
    togglePlay
  });
  attachWorkspaceListener();
  renderAll();
}
