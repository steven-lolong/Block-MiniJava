/**
 * The Model A stepper panel (viz-dock "Stepper" tab).
 *
 * Renders the machine state as the design note's coordinated surfaces: the
 * program surface is the main workspace itself (the focus block is
 * highlighted there), plus a call-stack/locals panel, a heap panel, and the
 * output log. Ref values and heap boxes share a per-Loc hue — the poor
 * man's arrow: two chips with one color are two arrows to one box.
 *
 * `step` is pure, so Back is just a history stack.
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

const PLAY_INTERVAL_MS = 550;
const MAX_HISTORY = 5000;

type GetWorkspace = () => Blockly.WorkspaceSvg | null;

let getWorkspace: GetWorkspace = () => null;
let current: MachineState | null = null;
let history: MachineState[] = [];
let stale = false;
let playTimer: number | null = null;
let highlightedBlockId: string | null = null;
let listening = false;

function byId<T extends HTMLElement>(id: string): T {
  const el = document.getElementById(id);
  if (!el) throw new Error(`Missing element #${id}`);
  return el as T;
}

function locHue(loc: number): number {
  return (loc * 67) % 360;
}

function valueChip(value: MachineValue): HTMLElement {
  const chip = document.createElement('span');
  if (value.tag === 'Ref') {
    chip.className = 'stepper-ref';
    chip.style.setProperty('--loc-hue', String(locHue(value.loc)));
    chip.dataset.refLoc = String(value.loc);
    chip.textContent = `#${value.loc}`;
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

function setHighlight(blockId: string | null): void {
  const workspace = getWorkspace();
  if (!workspace) return;
  if (highlightedBlockId && highlightedBlockId !== blockId) {
    (workspace.getBlockById(highlightedBlockId) as Blockly.BlockSvg | null)?.setHighlighted(false);
  }
  if (blockId) {
    (workspace.getBlockById(blockId) as Blockly.BlockSvg | null)?.setHighlighted(true);
  }
  highlightedBlockId = blockId;
}

function stopPlay(): void {
  if (playTimer !== null) {
    window.clearInterval(playTimer);
    playTimer = null;
  }
  byId<HTMLButtonElement>('stepper-play').textContent = '⏵ Play';
}

function markStale(): void {
  if (!current || stale) return;
  stale = true;
  stopPlay();
  setHighlight(null);
  renderAll();
}

function attachWorkspaceListener(): void {
  if (listening) return;
  const workspace = getWorkspace();
  if (!workspace) return;
  listening = true;
  workspace.addChangeListener((event) => {
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

function renderStatus(): void {
  const status = byId<HTMLSpanElement>('stepper-status');
  status.removeAttribute('data-state');
  if (!current) {
    status.textContent = 'Press ⟲ Load to build the machine from the current blocks.';
    return;
  }
  if (stale) {
    status.textContent = 'Program changed — press ⟲ Load to restart.';
    status.dataset.state = 'stale';
    return;
  }
  if (current.status === 'error') {
    status.textContent = `⨯ stuck after ${current.stepCount} step(s): ${current.error}`;
    status.dataset.state = 'error';
    return;
  }
  if (current.status === 'done') {
    status.textContent = `✓ finished in ${current.stepCount} step(s)`;
    status.dataset.state = 'done';
    return;
  }
  status.textContent = `step ${current.stepCount}${current.lastRule ? ` · ${current.lastRule}` : ''}`;
}

function renderButtons(): void {
  const canStep = !!current && !stale && current.status === 'running';
  byId<HTMLButtonElement>('stepper-step').disabled = !canStep;
  byId<HTMLButtonElement>('stepper-play').disabled = !canStep && playTimer === null;
  byId<HTMLButtonElement>('stepper-back').disabled = history.length === 0 || stale;
}

function renderFrames(): void {
  const host = byId<HTMLDivElement>('stepper-frames');
  host.innerHTML = '';
  if (!current) {
    host.appendChild(hint('The call stack will appear here.'));
    return;
  }
  const effect = current.lastEffect;
  const frames = [...current.stack].reverse();
  frames.forEach((frame: Frame, i) => {
    const isTop = i === 0;
    const card = document.createElement('div');
    card.className = `stepper-frame${isTop ? ' is-top' : ''}`;

    const title = document.createElement('div');
    title.className = 'stepper-frame-title';
    const name = document.createElement('span');
    name.textContent = frame.method;
    title.appendChild(name);
    if (frame.self !== null) {
      const self = document.createElement('span');
      self.className = 'stepper-frame-self';
      self.append('this → ', valueChip({ tag: 'Ref', loc: frame.self }));
      title.appendChild(self);
    }
    card.appendChild(title);

    if (frame.locals.size > 0) {
      const table = document.createElement('table');
      table.className = 'stepper-locals';
      for (const [localName, value] of frame.locals) {
        const row = table.insertRow();
        if (isTop && effect?.kind === 'local-write' && effect.name === localName) row.className = 'is-changed';
        row.insertCell().textContent = localName;
        row.insertCell().appendChild(valueChip(value));
      }
      card.appendChild(table);
    }
    host.appendChild(card);
  });
}

function renderHeap(): void {
  const host = byId<HTMLDivElement>('stepper-heap');
  host.innerHTML = '';
  if (!current) {
    host.appendChild(hint('Heap objects will appear here. Only Refs draw arrows; matching colors are the arrows.'));
    return;
  }
  if (current.heap.size === 0) {
    host.appendChild(hint('The heap is empty — nothing has been allocated with new yet.'));
    return;
  }
  const effect = current.lastEffect;
  for (const [loc, obj] of [...current.heap].sort(([a], [b]) => a - b)) {
    const box = document.createElement('div');
    box.className = 'stepper-heap-box';
    box.style.setProperty('--loc-hue', String(locHue(loc)));
    box.dataset.heapLoc = String(loc);
    if (effect?.kind === 'new' && effect.loc === loc) box.classList.add('is-changed');
    if ((effect?.kind === 'field-write' || effect?.kind === 'arr-write') && effect.loc === loc) {
      box.classList.add('is-write-target');
    }

    const title = document.createElement('div');
    title.className = 'stepper-heap-title';
    title.textContent = obj.tag === 'Obj' ? `#${loc} · ${obj.className}` : `#${loc} · int[${obj.elems.length}]`;
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

function renderOutput(): void {
  const pre = byId<HTMLPreElement>('stepper-output');
  if (!current) {
    pre.textContent = '';
    return;
  }
  pre.textContent = current.output.join('\n');
  pre.classList.toggle('is-changed', current.lastEffect?.kind === 'output');
}

function renderAll(): void {
  renderStatus();
  renderButtons();
  renderFrames();
  renderHeap();
  renderOutput();
  if (current && !stale) setHighlight(current.status === 'running' ? current.focusBlockId : null);
  scheduleArrowRedraw(true);
}

/* -- SVG arrows: every Ref chip draws an arrow to its heap box ------------- */

const SVG_NS = 'http://www.w3.org/2000/svg';
let arrowRaf: number | null = null;
let arrowPulsePending = false;

/**
 * Redraws are batched per frame. `withPulse` marks redraws caused by a state
 * change: only those replay the write animation, so scroll/resize redraws
 * keep the arrows still.
 */
function scheduleArrowRedraw(withPulse: boolean): void {
  arrowPulsePending = arrowPulsePending || withPulse;
  if (arrowRaf !== null) return;
  arrowRaf = window.requestAnimationFrame(() => {
    arrowRaf = null;
    const pulse = arrowPulsePending;
    arrowPulsePending = false;
    drawArrows(pulse);
  });
}

/** Rect of an element, or null when scrolled out of its panel body. */
function visibleRect(el: Element): DOMRect | null {
  const rect = el.getBoundingClientRect();
  const scroller = el.closest('.stepper-panel-body');
  if (!scroller) return rect;
  const bounds = scroller.getBoundingClientRect();
  if (rect.bottom < bounds.top + 2 || rect.top > bounds.bottom - 2) return null;
  return rect;
}

function drawArrows(pulse: boolean): void {
  const svg = document.getElementById('stepper-arrows');
  if (!(svg instanceof SVGSVGElement)) return;
  svg.replaceChildren();
  if (!current) return;
  const overlay = svg.getBoundingClientRect();
  if (overlay.width === 0) return; // machine tab is hidden

  const effect = current.lastEffect;
  const writeLoc =
    pulse && (effect?.kind === 'field-write' || effect?.kind === 'arr-write') ? effect.loc : null;

  const boxes = new Map<number, HTMLElement>();
  for (const box of document.querySelectorAll<HTMLElement>('#stepper-heap .stepper-heap-box')) {
    boxes.set(Number(box.dataset.heapLoc), box);
  }

  const chips = document.querySelectorAll<HTMLElement>(
    '#stepper-frames [data-ref-loc], #stepper-heap [data-ref-loc]'
  );
  for (const chip of chips) {
    const loc = Number(chip.dataset.refLoc);
    const box = boxes.get(loc);
    if (!box) continue;
    const chipRect = visibleRect(chip);
    const boxRect = visibleRect(box);
    if (!chipRect || !boxRect) continue;

    const fromHeap = !!chip.closest('#stepper-heap');
    const sx = chipRect.right - overlay.left + 2;
    const sy = chipRect.top + chipRect.height / 2 - overlay.top;
    const ty = boxRect.top + Math.min(14, boxRect.height / 2) - overlay.top;
    let tx: number;
    let d: string;
    if (fromHeap) {
      // Box-to-box: leave the chip rightward and hook back into the target's
      // right edge through the gutter.
      tx = boxRect.right - overlay.left + 2;
      const bend = Math.max(sx, tx) + 26;
      d = `M ${sx} ${sy} C ${bend} ${sy}, ${bend} ${ty}, ${tx} ${ty}`;
    } else {
      // Stack-to-heap: flow rightward into the box's left edge.
      tx = boxRect.left - overlay.left - 2;
      const dx = Math.max(36, (tx - sx) * 0.45);
      d = `M ${sx} ${sy} C ${sx + dx} ${sy}, ${tx - dx} ${ty}, ${tx} ${ty}`;
    }

    const hue = String(locHue(loc));
    const isWrite = writeLoc === loc;

    const path = document.createElementNS(SVG_NS, 'path');
    path.setAttribute('d', d);
    path.setAttribute('class', `stepper-arrow${isWrite ? ' is-pulse' : ''}`);
    path.style.setProperty('--loc-hue', hue);
    svg.appendChild(path);

    const side = fromHeap ? 1 : -1;
    const head = document.createElementNS(SVG_NS, 'polygon');
    head.setAttribute('points', `${tx},${ty} ${tx + side * 8},${ty - 4.5} ${tx + side * 8},${ty + 4.5}`);
    head.setAttribute('class', 'stepper-arrowhead');
    head.style.setProperty('--loc-hue', hue);
    svg.appendChild(head);

    // The value travels from the writing frame's chip into the box.
    if (isWrite && chip.closest('.stepper-frame.is-top')) {
      const dot = document.createElementNS(SVG_NS, 'circle');
      dot.setAttribute('r', '4.5');
      dot.setAttribute('class', 'stepper-write-dot');
      dot.style.setProperty('--loc-hue', hue);
      const motion = document.createElementNS(SVG_NS, 'animateMotion');
      motion.setAttribute('dur', '0.4s');
      motion.setAttribute('path', d);
      motion.setAttribute('fill', 'freeze');
      dot.appendChild(motion);
      svg.appendChild(dot);
      window.setTimeout(() => dot.remove(), 650);
    }
  }
}

function loadMachine(): void {
  stopPlay();
  setHighlight(null);
  history = [];
  stale = false;
  const workspace = getWorkspace();
  if (!workspace) return;
  attachWorkspaceListener();
  const initial = injectMachine(workspace);
  if ('injectError' in initial) {
    current = null;
    renderAll();
    const status = byId<HTMLSpanElement>('stepper-status');
    status.textContent = initial.injectError;
    status.dataset.state = 'error';
    return;
  }
  current = initial;
  renderAll();
}

function stepOnce(): void {
  if (!current || stale || current.status !== 'running') {
    stopPlay();
    renderButtons();
    return;
  }
  history.push(current);
  if (history.length > MAX_HISTORY) history.shift();
  current = step(current);
  if (current.status !== 'running') stopPlay();
  renderAll();
}

function stepBack(): void {
  if (history.length === 0 || stale) return;
  stopPlay();
  current = history.pop()!;
  renderAll();
}

function togglePlay(): void {
  if (playTimer !== null) {
    stopPlay();
    renderButtons();
    return;
  }
  if (!current || stale || current.status !== 'running') return;
  byId<HTMLButtonElement>('stepper-play').textContent = '⏸ Pause';
  playTimer = window.setInterval(stepOnce, PLAY_INTERVAL_MS);
}

/** Dock "Re-run" button while the machine tab is active. */
export function resetStepperFromDock(): void {
  loadMachine();
}

/** Called by the viz dock when the machine tab is shown/hidden. */
export function setStepperTabVisible(visible: boolean): void {
  if (!visible) {
    stopPlay();
    return;
  }
  // The overlay was unmeasurable while hidden; redraw once it has a size.
  scheduleArrowRedraw(false);
  window.setTimeout(() => scheduleArrowRedraw(false), 60);
}

export function initStepperPanel(getter: GetWorkspace): void {
  getWorkspace = getter;
  byId<HTMLButtonElement>('stepper-load').addEventListener('click', loadMachine);
  byId<HTMLButtonElement>('stepper-step').addEventListener('click', stepOnce);
  byId<HTMLButtonElement>('stepper-back').addEventListener('click', stepBack);
  byId<HTMLButtonElement>('stepper-play').addEventListener('click', togglePlay);
  for (const body of Array.from(document.querySelectorAll('.stepper-panel-body'))) {
    body.addEventListener('scroll', () => scheduleArrowRedraw(false), { passive: true });
  }
  if ('ResizeObserver' in window) {
    const panels = document.querySelector('.stepper-panels');
    if (panels) new ResizeObserver(() => scheduleArrowRedraw(false)).observe(panels);
  }
  attachWorkspaceListener();
  renderAll();
}
