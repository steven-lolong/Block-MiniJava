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
  REF_V,
  type Frame,
  type Kont,
  type MachineState,
  type MachineValue
} from '../semantics/minijavaMachine';
import { markPhase, type Address } from '../semantics/reachability';
import { sweep } from '../semantics/gc';
import { mirrorProgramOutput } from './programConsole';
import { bindDockStepKeys } from './dockKeyboard';

const PLAY_INTERVAL_MS = 550;
const MAX_HISTORY = 5000;

/** GC animation pacing — deliberately distinct from PLAY_INTERVAL_MS so a
 * mark-phase pass never looks like it's just another mutator Play run. */
const GC_MARK_INTERVAL_MS = 300;
const GC_SWEEP_FADE_MS = 450;

const GC_AUTO_ENABLED_KEY = 'block-minijava.gc.autoEnabled';
const GC_THRESHOLD_KEY = 'block-minijava.gc.threshold';

type GetWorkspace = () => Blockly.WorkspaceSvg | null;

let getWorkspace: GetWorkspace = () => null;
let current: MachineState | null = null;
let history: MachineState[] = [];
let stale = false;
let playTimer: number | null = null;
let highlightedBlockId: string | null = null;
let listening = false;

/** Whether an allocation-threshold auto-trigger is armed, and the threshold
 * itself — both persisted, both independent of any particular MachineState. */
let autoGcEnabled = false;
let gcThreshold = 50;
/** Non-null for the whole duration of an in-flight mark-then-sweep pass. */
let gcAnimation: { markedSoFar: number } | null = null;
let gcMarkTimer: number | null = null;
/** Drives the GC-specific status text; reset on the next step/back/load. */
let lastTransitionWasGC = false;
let gcSummary: { marked: number; swept: number; heapAfter: number } | null = null;

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
    chip.tabIndex = 0;
    chip.setAttribute('role', 'button');
    chip.addEventListener('click', () => revealHeapBox(value.loc));
    chip.addEventListener('keydown', (event) => {
      if (event.key === 'Enter' || event.key === ' ') {
        event.preventDefault();
        revealHeapBox(value.loc);
      }
    });
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

/** Whether `block` is already visible in the workspace's own scroll surface,
 * by comparing screen rects the same way `visibleRect` does for arrows below
 * — no Blockly viewport-metrics math, just DOM geometry. */
function isBlockOnscreen(block: Blockly.BlockSvg): boolean {
  const container = document.getElementById('blockly-div');
  // Headless (test) blocks have no getSvgRoot; treat "can't tell" as
  // offscreen so callers fall back to the old unconditional-center behavior.
  if (!container || typeof block.getSvgRoot !== 'function') return false;
  const root = block.getSvgRoot();
  if (!root) return false;
  const blockRect = root.getBoundingClientRect();
  if (blockRect.width === 0 && blockRect.height === 0) return false;
  const bounds = container.getBoundingClientRect();
  const margin = 24;
  return (
    blockRect.right > bounds.left + margin &&
    blockRect.left < bounds.right - margin &&
    blockRect.bottom > bounds.top + margin &&
    blockRect.top < bounds.bottom - margin
  );
}

function setHighlight(blockId: string | null): void {
  const workspace = getWorkspace();
  if (!workspace) return;
  if (highlightedBlockId && highlightedBlockId !== blockId) {
    (workspace.getBlockById(highlightedBlockId) as Blockly.BlockSvg | null)?.setHighlighted(false);
  }
  if (blockId) {
    const block = workspace.getBlockById(blockId) as Blockly.BlockSvg | null;
    if (block) {
      block.setHighlighted(true);
      // Pan only when the redex has scrolled out of view (audit U6) — panning
      // on every step regardless fights a student who is manually looking
      // around the program.
      if (!isBlockOnscreen(block)) workspace.centerOnBlock?.(blockId);
    }
  }
  highlightedBlockId = blockId;
}

/* -- Bidirectional linking (audit U4): the machine already highlights the
   redex block it is reducing; these two add the other directions — selecting
   a program block highlights the machine rows that mention it, and hovering
   a Ref chip or heap box emphasizes every element sharing its address. */

let linkedBlockId: string | null = null;

function clearWorkspaceLink(): void {
  if (!linkedBlockId) return;
  for (const el of document.querySelectorAll(`[data-block-id="${CSS.escape(linkedBlockId)}"]`)) {
    el.classList.remove('is-linked-from-block');
  }
  linkedBlockId = null;
}

/** Selecting a block in the main workspace highlights every machine-panel
 * element whose provenance is that block (its control card, frame title,
 * kont entry, or heap allocation site). */
function linkFromWorkspaceSelection(blockId: string | null): void {
  clearWorkspaceLink();
  if (!blockId) return;
  const matches = document.querySelectorAll<HTMLElement>(
    `#stepper-control [data-block-id="${CSS.escape(blockId)}"], ` +
      `#stepper-frames [data-block-id="${CSS.escape(blockId)}"], ` +
      `#stepper-kont [data-block-id="${CSS.escape(blockId)}"], ` +
      `#stepper-heap [data-block-id="${CSS.escape(blockId)}"]`
  );
  if (matches.length === 0) return;
  linkedBlockId = blockId;
  matches.forEach((el, index) => {
    el.classList.add('is-linked-from-block');
    if (index === 0) el.scrollIntoView({ block: 'nearest', behavior: 'smooth' });
  });
}

let emphasizedLoc: number | null = null;

function locElementsFor(loc: number): NodeListOf<HTMLElement> {
  return document.querySelectorAll<HTMLElement>(
    `.stepper-panels [data-ref-loc="${loc}"], .stepper-panels [data-heap-loc="${loc}"]`
  );
}

/** Hovering a Ref chip or a heap box emphasizes every element sharing that
 * address, everywhere in the machine — one hue, but the highlight makes "same
 * object" legible beyond color alone. */
function emphasizeLoc(loc: number | null): void {
  if (loc === emphasizedLoc) return;
  if (emphasizedLoc !== null) {
    for (const el of locElementsFor(emphasizedLoc)) el.classList.remove('is-loc-emphasized');
  }
  emphasizedLoc = loc;
  if (loc !== null) {
    for (const el of locElementsFor(loc)) el.classList.add('is-loc-emphasized');
  }
}

function locFromEventTarget(target: EventTarget | null): number | null {
  if (!(target instanceof HTMLElement)) return null;
  const el = target.closest<HTMLElement>('[data-ref-loc],[data-heap-loc]');
  if (!el) return null;
  const raw = el.dataset.refLoc ?? el.dataset.heapLoc;
  return raw !== undefined ? Number(raw) : null;
}

function stopPlay(): void {
  if (playTimer !== null) {
    window.clearInterval(playTimer);
    playTimer = null;
  }
  byId<HTMLButtonElement>('stepper-play').textContent = 'Play';
}

function markStale(): void {
  if (!current || stale) return;
  stale = true;
  stopPlay();
  stopGCAnimation();
  setHighlight(null);
  clearWorkspaceLink();
  renderAll();
}

function attachWorkspaceListener(): void {
  if (listening) return;
  const workspace = getWorkspace();
  if (!workspace) return;
  listening = true;
  workspace.addChangeListener((event) => {
    if (event.type === Blockly.Events.SELECTED) {
      const selected = event as unknown as { newElementId?: string | null };
      if (current && !stale) linkFromWorkspaceSelection(selected.newElementId ?? null);
      return;
    }
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
    status.textContent = 'Press Load to build the machine from the current blocks.';
    return;
  }
  if (stale) {
    status.textContent = 'Program changed — press Load to restart.';
    status.dataset.state = 'stale';
    return;
  }
  if (gcAnimation) {
    status.textContent = `GC marking (${gcAnimation.markedSoFar} so far)`;
    status.dataset.state = 'gc';
    return;
  }
  if (lastTransitionWasGC && gcSummary) {
    status.textContent = `GC complete — marked ${gcSummary.marked}, swept ${gcSummary.swept} (heap now ${gcSummary.heapAfter})`;
    status.dataset.state = 'gc';
    return;
  }
  if (current.status === 'error') {
    status.textContent = `Stuck after ${current.stepCount} step(s): ${current.error}`;
    status.dataset.state = 'error';
    return;
  }
  if (current.status === 'done') {
    status.textContent = `Finished in ${current.stepCount} step(s)`;
    status.dataset.state = 'done';
    return;
  }
  status.textContent = `step ${current.stepCount}${current.lastRule ? ` · ${current.lastRule}` : ''}`;
}

const STEP_TITLE = 'One machine step (→ / .)';
const PLAY_TITLE = 'Step automatically (Space)';
const BACK_TITLE = 'Undo one machine step (← / ,)';
const GC_TITLE = 'Mark and sweep the heap now (G)';

/** Why Step/Play can't fire right now (interaction contract, brief §5). */
function stepDisabledReason(): string {
  if (!current) return 'Press Load to build the machine first';
  if (stale) return 'Program changed — press Load to restart';
  if (gcAnimation) return 'Collection in progress';
  if (current.status === 'error') return 'Stuck — press Back or Load';
  if (current.status === 'done') return 'Finished — nothing left to step';
  return STEP_TITLE;
}

function gcDisabledReason(): string {
  if (!current) return 'Press Load first';
  if (stale) return 'Program changed — press Load to restart';
  if (gcAnimation) return 'Collection in progress';
  if (current.heap.size === 0) return 'Heap is empty — nothing to collect';
  return GC_TITLE;
}

function renderButtons(): void {
  const canStep = !!current && !stale && current.status === 'running' && !gcAnimation;
  const canGC = !!current && !stale && current.heap.size > 0 && !gcAnimation;

  const stepButton = byId<HTMLButtonElement>('stepper-step');
  const playButton = byId<HTMLButtonElement>('stepper-play');
  const backButton = byId<HTMLButtonElement>('stepper-back');
  const gcButton = byId<HTMLButtonElement>('stepper-gc');

  stepButton.disabled = !canStep;
  stepButton.title = canStep ? STEP_TITLE : stepDisabledReason();

  const canPlay = canStep || playTimer !== null;
  playButton.disabled = !canPlay;
  playButton.title = canPlay ? PLAY_TITLE : stepDisabledReason();

  const canBack = history.length > 0 && !stale && !gcAnimation;
  backButton.disabled = !canBack;
  backButton.title = canBack
    ? BACK_TITLE
    : gcAnimation
      ? 'Collection in progress'
      : 'At the start — no earlier step to return to';

  gcButton.disabled = !canGC;
  gcButton.title = canGC ? GC_TITLE : gcDisabledReason();
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
    text.dataset.blockId = control.block.id;
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
    done.textContent = 'Program finished';
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

const BIN_SYMBOL: Record<string, string> = {
  add: '+', sub: '-', mul: '*', div: '/',
  less: '<', leq: '<=', gt: '>', geq: '>=',
  and: '&&', or: '||', concat: '.concat'
};

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
    case 'KOr': return { parts: ['▢ || …'], blockId: k.rightBlock?.id ? k.rightBlock.id : null };
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
    title.dataset.blockId = frame.callBlockId ?? frame.blockId;
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
        row.dataset.blockId = blockId;
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
    host.appendChild(hint('Each method call pushes a frame here; the top frame is the one running now.'));
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
    const provenanceId = frame.callBlockId ?? frame.blockId;
    name.dataset.blockId = provenanceId;
    name.textContent = frame.method;
    name.title = frame.callBlockId ? 'Show the call that pushed this frame' : 'Show the main class block';
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
    title.dataset.blockId = obj.blockId;
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
      ? `Error: ${current.error}`
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
  // A stuck machine stays anchored on the offending block (audit U5) — only a
  // clean finish has nothing left to point at. Mirrors how the type-checker
  // pins its own warnings to a block instead of clearing the selection.
  if (current && !stale) {
    const shouldAnchor = current.status === 'running' || current.status === 'error';
    setHighlight(shouldAnchor ? current.focusBlockId : null);
  }
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

    // The value travels from the writing frame's chip into the box — motion
    // that exists only to depict the same signal the box's own glow already
    // gives, so reduced motion omits the dot and keeps the glow (brief §4).
    const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    if (isWrite && !reduceMotion && chip.closest('.stepper-frame.is-top')) {
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

/* -- Garbage collection: animated mark phase + single sweep step ---------- */

/** Every `Kont` tag that pins a `MachineValue` (the rest carry only
 * Blockly.Block/string/null control-flow bookkeeping — nothing to root). */
function kontRoots(kont: Kont[]): MachineValue[] {
  const values: MachineValue[] = [];
  for (const k of kont) {
    switch (k.tag) {
      case 'KArrAssignVal':
        values.push(k.index);
        break;
      case 'KBinR':
        values.push(k.left);
        break;
      case 'KLookupIdx':
        values.push(k.arr);
        break;
      case 'KCharAtIdx':
        values.push(k.str);
        break;
      case 'KCallArgs':
        values.push(k.recv, ...k.done);
        break;
      default:
        break;
    }
  }
  return values;
}

function frameRoots(frame: Frame): { env: MachineValue[]; kont: MachineValue[] } {
  const env: MachineValue[] = [...frame.locals.values()];
  if (frame.self !== null) env.push(REF_V(frame.self)); // `this`, Model A
  return { env, kont: kontRoots(frame.kont) };
}

/**
 * Flattens EVERY live frame (not just the top of the call stack) plus the
 * in-flight control value into (env, kont) roots for `markPhase`.
 *
 * The in-flight value matters for correctness: right after `new` allocates,
 * the fresh `Ref` sits ONLY in `state.control` for exactly one step, before
 * the pending assign/call-arg continuation consumes it. Miss it here and a
 * GC pass triggered in that window would collect an object about to be used.
 */
function rootsOf(state: MachineState): { env: MachineValue[]; kont: MachineValue[] } {
  const env: MachineValue[] = [];
  const kont: MachineValue[] = [];
  for (const frame of state.stack) {
    const roots = frameRoots(frame);
    env.push(...roots.env);
    kont.push(...roots.kont);
  }
  if (state.control.tag === 'Value') env.push(state.control.value);
  return { env, kont };
}

/** Flashes a persistent heap box as newly marked — same remove/reflow/re-add
 * idiom as `revealHeapBox`, since this happens mid-animation, outside a full
 * `renderAll()`. */
function flashMarkedBox(loc: Address): void {
  const box = document.querySelector<HTMLElement>(`#stepper-heap .stepper-heap-box[data-heap-loc="${loc}"]`);
  if (!box) return;
  box.classList.remove('is-gc-marked');
  void box.offsetWidth; // restart the animation
  box.classList.add('is-gc-marked');
}

/** The sweep step: grey out every unmarked box, then — after the fade —
 * commit the swept heap as a single new `MachineState`. Never interleaved
 * with mutator steps; `stepOnce`'s own `gcAnimation` guard and the disabled
 * toolbar buttons keep it that way. */
function finishSweep(marked: Set<Address>): void {
  const sweptAway = [...current!.heap.keys()].filter((loc) => !marked.has(loc));
  for (const loc of sweptAway) {
    document.querySelector<HTMLElement>(`#stepper-heap .stepper-heap-box[data-heap-loc="${loc}"]`)?.classList.add('is-gc-swept');
  }
  // The mark-phase glow (copper, is-gc-marked) said "the collector touched
  // this"; a surviving object gets a second, distinct signal here — "proven
  // reachable" (green) — so retired and reachable read as the stated pair
  // (design brief §1 roles 5-6), not just "didn't get swept."
  for (const loc of marked) {
    document.querySelector<HTMLElement>(`#stepper-heap .stepper-heap-box[data-heap-loc="${loc}"]`)?.classList.add('is-gc-survived');
  }
  window.setTimeout(() => {
    history.push(current!);
    if (history.length > MAX_HISTORY) history.shift();
    const newHeap = sweep(current!.heap, marked);
    // lastEffect/lastRule are explicitly cleared, not carried over from
    // whatever mutator step last ran — otherwise a surviving box could
    // re-flash as "just allocated/written" (renderHeap/renderFrames/
    // drawArrows all key off current.lastEffect) even though GC didn't
    // touch it. A GC-committed state should render as visually neutral
    // except for the GC status text below.
    current = { ...current!, heap: newHeap, lastEffect: null, lastRule: null };
    lastTransitionWasGC = true;
    gcSummary = { marked: marked.size, swept: sweptAway.length, heapAfter: newHeap.size };
    gcAnimation = null;
    renderAll();
  }, GC_SWEEP_FADE_MS);
}

/** Entry point for both the manual "Run GC" button and the allocation
 * threshold auto-trigger. Drives `markPhase` (reachability.ts) one event per
 * timer tick, then a single sweep — the same two building blocks `runGC`
 * (gc.ts) composes synchronously, just paced for animation here. */
function startGCAnimation(): void {
  if (!current || stale || gcAnimation || current.heap.size === 0) return;
  stopPlay(); // GC runs to completion; never interleaved with mutator stepping
  const { env, kont } = rootsOf(current);
  const gen = markPhase(env, current.heap, kont);
  const marked = new Set<Address>();
  gcAnimation = { markedSoFar: 0 };
  renderButtons();
  renderStatus();
  gcMarkTimer = window.setInterval(() => {
    const next = gen.next();
    if (next.done) {
      window.clearInterval(gcMarkTimer!);
      gcMarkTimer = null;
      finishSweep(marked);
      return;
    }
    marked.add(next.value.address);
    gcAnimation!.markedSoFar = marked.size;
    flashMarkedBox(next.value.address);
    renderStatus();
  }, GC_MARK_INTERVAL_MS);
}

/** Headless/test environments (and a full or blocked store) have no
 * `localStorage` — persistence is a nice-to-have, not load-bearing, so it
 * degrades to "use the in-memory default" rather than crashing panel init. */
function readPersisted(key: string): string | null {
  try {
    return typeof localStorage === 'undefined' ? null : localStorage.getItem(key);
  } catch {
    return null;
  }
}

function writePersisted(key: string, value: string): void {
  try {
    if (typeof localStorage !== 'undefined') localStorage.setItem(key, value);
  } catch {
    /* ignore */
  }
}

function loadGcSettings(): void {
  autoGcEnabled = readPersisted(GC_AUTO_ENABLED_KEY) === 'true';
  const storedThreshold = Number(readPersisted(GC_THRESHOLD_KEY));
  if (Number.isFinite(storedThreshold) && storedThreshold >= 1) gcThreshold = storedThreshold;
  byId<HTMLInputElement>('stepper-gc-auto-enabled').checked = autoGcEnabled;
  byId<HTMLInputElement>('stepper-gc-threshold').value = String(gcThreshold);
}

function updateAutoGcEnabled(): void {
  autoGcEnabled = byId<HTMLInputElement>('stepper-gc-auto-enabled').checked;
  writePersisted(GC_AUTO_ENABLED_KEY, String(autoGcEnabled));
}

function updateGcThreshold(): void {
  const input = byId<HTMLInputElement>('stepper-gc-threshold');
  const value = Math.max(1, Math.floor(Number(input.value) || 1));
  gcThreshold = value;
  input.value = String(value);
  writePersisted(GC_THRESHOLD_KEY, String(value));
}

function stopGCAnimation(): void {
  if (gcMarkTimer !== null) {
    window.clearInterval(gcMarkTimer);
    gcMarkTimer = null;
  }
  gcAnimation = null;
}

function loadMachine(): void {
  stopPlay();
  stopGCAnimation();
  setHighlight(null);
  history = [];
  stale = false;
  lastTransitionWasGC = false;
  gcSummary = null;
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
  if (gcAnimation) return; // GC runs to completion; never interleaved with a mutator step
  if (!current || stale || current.status !== 'running') {
    stopPlay();
    renderButtons();
    return;
  }
  history.push(current);
  if (history.length > MAX_HISTORY) history.shift();
  current = step(current);
  lastTransitionWasGC = false;
  if (current.status !== 'running') stopPlay();
  renderAll();
  if (
    autoGcEnabled &&
    current.status === 'running' &&
    current.lastEffect?.kind === 'new' &&
    current.heap.size > gcThreshold
  ) {
    startGCAnimation();
  }
}

function stepBack(): void {
  if (history.length === 0 || stale || gcAnimation) return;
  stopPlay();
  current = history.pop()!;
  lastTransitionWasGC = false;
  renderAll();
}

function togglePlay(): void {
  if (playTimer !== null) {
    stopPlay();
    renderButtons();
    return;
  }
  if (!current || stale || current.status !== 'running' || gcAnimation) return;
  byId<HTMLButtonElement>('stepper-play').textContent = 'Pause';
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
  byId<HTMLButtonElement>('stepper-gc').addEventListener('click', startGCAnimation);
  byId<HTMLInputElement>('stepper-gc-auto-enabled').addEventListener('change', updateAutoGcEnabled);
  byId<HTMLInputElement>('stepper-gc-threshold').addEventListener('change', updateGcThreshold);
  bindDockStepKeys(byId<HTMLElement>('viz-dock'), 'machine', {
    load: loadMachine,
    step: stepOnce,
    back: stepBack,
    togglePlay,
    extra: { g: startGCAnimation }
  });
  loadGcSettings();
  for (const body of Array.from(document.querySelectorAll('.stepper-panel-body'))) {
    body.addEventListener('scroll', () => scheduleArrowRedraw(false), { passive: true });
  }
  const panels = document.querySelector<HTMLElement>('.stepper-panels');
  if (panels) {
    if ('ResizeObserver' in window) new ResizeObserver(() => scheduleArrowRedraw(false)).observe(panels);
    panels.addEventListener('pointerover', (event) => emphasizeLoc(locFromEventTarget(event.target)));
    panels.addEventListener('pointerout', (event) => {
      const related = event.relatedTarget;
      if (related instanceof Node && panels.contains(related)) return;
      emphasizeLoc(null);
    });
  }
  attachWorkspaceListener();
  renderAll();
}
