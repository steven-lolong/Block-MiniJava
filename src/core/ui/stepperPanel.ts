/**
 * The Model A machine panel (viz-dock "CESK" tab).
 *
 * Renders the machine state as one column per CESK component, over an explicit
 * activation-frame stack — C·ontrol, E·nvironment (grouped into the call
 * stack's per-frame locals), S·tore (the heap), K·ontinuation (pending work,
 * innermost first) — plus the output log.
 * The program surface is the main workspace itself (the focus block is
 * highlighted there). Ref values and heap boxes share a per-Loc hue — the
 * poor man's arrow: two chips with one color are two arrows to one box.
 *
 * `step` is pure, so Back is just a history stack.
 */

import * as Blockly from 'blockly';
import {
  formatMachineValue,
  injectMachine,
  step,
  type Frame,
  type Kont,
  type MachineState,
  type MachineValue
} from '../semantics/minijavaMachine';
import { mirrorProgramOutput } from './programConsole';

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
    chip.title = `Show heap object #${value.loc}`;
    chip.addEventListener('click', () => revealHeapBox(value.loc));
  } else {
    chip.className = value.tag === 'Null' ? 'stepper-null' : 'stepper-scalar';
    chip.textContent = formatMachineValue(value);
  }
  return chip;
}

/* -- Provenance: every runtime artifact links back to the block that made it. */

/** Selects and centers a program block in the main workspace. */
function locateProvenance(blockId: string | null): void {
  if (!blockId || stale) return;
  const workspace = getWorkspace();
  if (!workspace) return;
  const block = workspace.getBlockById(blockId) as Blockly.BlockSvg | null;
  if (!block) return;
  workspace.centerOnBlock(blockId);
  // setSelected (unlike BlockSvg.select) also clears the previous selection.
  Blockly.common.setSelected(block);
}

/** Scrolls the heap panel to a box and flashes it. */
function revealHeapBox(loc: number): void {
  const box = document.querySelector<HTMLElement>(`#stepper-heap .stepper-heap-box[data-heap-loc="${loc}"]`);
  if (!box) return;
  box.scrollIntoView({ block: 'nearest', behavior: 'smooth' });
  box.classList.remove('is-changed');
  void box.offsetWidth; // restart the flash animation
  box.classList.add('is-changed');
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

/** Short readable text for a program block, for the Control card. */
function blockText(block: Blockly.Block): string {
  const text = block.toString().replace(/\s+/g, ' ').trim();
  return text.length > 90 ? text.slice(0, 87) + '…' : text;
}

function renderControl(): void {
  const host = byId<HTMLDivElement>('stepper-control');
  host.innerHTML = '';
  if (!current) {
    host.appendChild(hint('What the machine evaluates next — a statement, an expression, or a computed value.'));
    return;
  }
  const control = current.control;
  const card = document.createElement('div');
  card.className = 'stepper-control-card';

  const kind = document.createElement('span');
  kind.className = 'stepper-control-kind';
  kind.dataset.kind = control.tag.toLowerCase();
  kind.textContent =
    control.tag === 'Stmt' ? 'statement' :
    control.tag === 'Expr' ? 'expression' :
    control.tag === 'Value' ? 'value' : 'done';
  card.appendChild(kind);

  if (control.tag === 'Stmt' || control.tag === 'Expr') {
    const text = document.createElement('div');
    text.className = 'stepper-control-text stepper-provenance';
    text.textContent = blockText(control.block);
    text.title = 'Show this block in the program';
    text.addEventListener('click', () => locateProvenance(control.block.id));
    card.appendChild(text);
  } else if (control.tag === 'Value') {
    const value = document.createElement('div');
    value.className = 'stepper-control-text';
    value.appendChild(valueChip(control.value));
    card.appendChild(value);
  } else {
    const done = document.createElement('div');
    done.className = 'stepper-control-text';
    done.textContent = '✓ program finished';
    card.appendChild(done);
  }
  host.appendChild(card);

  if (current.lastRule) {
    const rule = document.createElement('div');
    rule.className = 'stepper-control-rule';
    rule.textContent = `rule · ${current.lastRule}`;
    host.appendChild(rule);
  }
}

const BIN_SYMBOL: Record<string, string> = { add: '+', sub: '-', mul: '*', less: '<', and: '&&', concat: '.concat' };

/**
 * One kontinuation frame's label: the pending work with ▢ marking the hole
 * the in-flight value will fill. Embedded already-computed values render as
 * chips (Refs keep their heap arrows).
 */
function kontEntry(k: Kont): { parts: (string | MachineValue)[]; blockId: string | null } {
  switch (k.tag) {
    case 'KStmtSeq': return { parts: ['▢ ; then next statement'], blockId: k.next?.id ?? null };
    case 'KLoop': return { parts: ['loop ▸ repeat the body'], blockId: k.block.id };
    case 'KIf': return { parts: ['if ▢ ▸ pick a branch'], blockId: k.block.id };
    case 'KWhile': return { parts: ['while ▢ ▸ body or exit'], blockId: k.block.id };
    case 'KPrint': return { parts: ['println ( ▢ )'], blockId: null };
    case 'KAssign': return { parts: [`${k.name} = ▢`], blockId: k.block.id };
    case 'KArrAssignIdx': return { parts: [`${k.name}[ ▢ ] = …`], blockId: k.block.id };
    case 'KArrAssignVal': return { parts: [`${k.name}[`, k.index, '] = ▢'], blockId: k.block.id };
    case 'KNot': return { parts: ['! ▢'], blockId: null };
    case 'KAnd': return { parts: ['▢ && …'], blockId: k.rightBlock?.id ? k.rightBlock.id : null };
    case 'KBinL': return { parts: [`▢ ${BIN_SYMBOL[k.op] ?? k.op} …`], blockId: k.rightBlock?.id ?? null };
    case 'KBinR': return { parts: [k.left, ` ${BIN_SYMBOL[k.op] ?? k.op} ▢`], blockId: null };
    case 'KLookupArr': return { parts: ['▢ [ … ] ▸ evaluate the array'], blockId: k.indexBlock?.id ?? null };
    case 'KLookupIdx': return { parts: [k.arr, ' [ ▢ ]'], blockId: null };
    case 'KLength': return { parts: ['▢ .length'], blockId: null };
    case 'KCharAtStr': return { parts: ['▢ .charAt( … )'], blockId: k.indexBlock?.id ?? null };
    case 'KCharAtIdx': return { parts: [k.str, ' .charAt( ▢ )'], blockId: null };
    case 'KStrLength': return { parts: ['▢ .length()'], blockId: null };
    case 'KNewArr': return { parts: ['new int [ ▢ ]'], blockId: k.block.id };
    case 'KCallRecv': return { parts: ['▢ .method(…) ▸ evaluate the receiver'], blockId: k.block.id };
    case 'KCallArgs':
      return {
        parts: [k.recv, ` ▸ argument ${k.done.length + 1} of ${k.done.length + 1 + k.remaining.length}`],
        blockId: k.block.id
      };
  }
}

function renderKont(): void {
  const host = byId<HTMLDivElement>('stepper-kont');
  host.innerHTML = '';
  if (!current) {
    host.appendChild(hint('Pending work, innermost first. Each call frame keeps its own kontinuation stack; ▢ is the hole the in-flight value fills.'));
    return;
  }
  const frames = [...current.stack].reverse();
  frames.forEach((frame: Frame, frameIndex) => {
    const isTopFrame = frameIndex === 0;
    const section = document.createElement('div');
    section.className = `stepper-kont-frame${isTopFrame ? ' is-top' : ''}`;

    const title = document.createElement('div');
    title.className = 'stepper-kont-frame-title stepper-provenance';
    title.textContent = frame.method;
    title.title = 'Show this frame’s method';
    title.addEventListener('click', () => locateProvenance(frame.callBlockId ?? frame.blockId));
    section.appendChild(title);

    const konts = [...frame.kont].reverse(); // innermost (next to fire) first
    if (konts.length === 0 && !frame.returnBlock) {
      const empty = document.createElement('div');
      empty.className = 'stepper-kont-empty';
      empty.textContent = '(no pending work)';
      section.appendChild(empty);
    }
    konts.forEach((k, i) => {
      const { parts, blockId } = kontEntry(k);
      const row = document.createElement('div');
      row.className = `stepper-kont-entry${isTopFrame && i === 0 ? ' is-next' : ''}`;
      for (const part of parts) {
        if (typeof part === 'string') row.append(part);
        else row.appendChild(valueChip(part));
      }
      if (blockId) {
        row.classList.add('stepper-provenance');
        row.title = 'Show the block waiting on this value';
        row.addEventListener('click', () => locateProvenance(blockId));
      }
      section.appendChild(row);
    });
    if (frame.returnBlock) {
      const ret = document.createElement('div');
      ret.className = 'stepper-kont-entry stepper-kont-return';
      ret.textContent = `⏎ return ▢ to the caller`;
      section.appendChild(ret);
    }
    host.appendChild(section);
  });
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
    name.className = 'stepper-provenance';
    name.textContent = frame.method;
    name.title = frame.callBlockId ? 'Show the call that pushed this frame' : 'Show the main class block';
    const provenanceId = frame.callBlockId ?? frame.blockId;
    name.addEventListener('click', () => locateProvenance(provenanceId));
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

function renderOutput(): void {
  const pre = byId<HTMLPreElement>('stepper-output');
  if (!current) {
    pre.textContent = '';
    return;
  }
  pre.textContent = current.output.join('\n');
  pre.classList.toggle('is-changed', current.lastEffect?.kind === 'output');
  const note = current.status === 'done'
    ? '— program finished —'
    : current.status === 'error'
      ? `⨯ ${current.error}`
      : undefined;
  mirrorProgramOutput(`CESK · Model ${current.model}`, current.output, note);
}

function renderAll(): void {
  renderStatus();
  renderButtons();
  renderControl();
  renderFrames();
  renderHeap();
  renderKont();
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
    '#stepper-control [data-ref-loc], #stepper-frames [data-ref-loc], #stepper-heap [data-ref-loc], #stepper-kont [data-ref-loc]'
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
