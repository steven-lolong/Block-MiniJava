/**
 * The Typing tab (inspector column, between Editable Code and Outline).
 *
 * Renders the typing derivation of one method at a time, picked from a
 * dropdown (`main` + every `C.m`), as produced by `deriveProgram` — the same
 * walk that powers the Problems tab, so the two can never disagree. The Γ
 * legend is shown once (Γ is fixed across a MiniJava method body); the M-OK
 * root renders as a vertical list of statement rows (`Γ ⊢ s ok`), each
 * expandable into its classic premises-over-bar proof tree. Every judgement
 * is a button that centers and selects its block in the workspace.
 */

import * as Blockly from 'blockly';
import { deriveProgram, type Derivation, type MethodDerivation } from '../types/typeChecker';
import { locateBlock } from './typeDiagnostics';

type GetWorkspace = () => Blockly.WorkspaceSvg | null;

let getWorkspace: GetWorkspace = () => null;
let renderFrame: number | null = null;
let selectedLabel: string | null = null;
let openRows = new Set<number>();

const byId = <T extends HTMLElement>(id: string): T | null => document.getElementById(id) as T | null;

function locate(blockId: string | undefined): void {
  if (!blockId) return;
  const workspace = getWorkspace();
  if (workspace) locateBlock(workspace, blockId);
}

/** Classic proof-tree node: premises above the bar, conclusion below. */
function renderNode(derivation: Derivation): HTMLElement {
  const node = document.createElement('div');
  node.className = 'typ-node';

  if (derivation.premises.length > 0) {
    const premises = document.createElement('div');
    premises.className = 'typ-premises';
    for (const premise of derivation.premises) premises.appendChild(renderNode(premise));
    node.appendChild(premises);
  }

  const bar = document.createElement('div');
  bar.className = 'typ-bar';
  const rule = document.createElement('span');
  rule.className = 'typ-rule';
  rule.textContent = derivation.rule;
  bar.appendChild(rule);

  const conclusion = document.createElement('button');
  conclusion.type = 'button';
  conclusion.className = 'typ-judgement';
  conclusion.textContent = derivation.judgement;
  if (derivation.note) conclusion.title = derivation.note;
  conclusion.addEventListener('click', () => locate(derivation.blockId));

  node.append(bar, conclusion);
  return node;
}

/** One collapsible row per premise of the M-OK root. */
function renderRow(derivation: Derivation, index: number): HTMLElement {
  const row = document.createElement('div');
  row.className = 'typ-row';
  row.classList.toggle('is-open', openRows.has(index));

  const head = document.createElement('div');
  head.className = 'typ-row-head';

  const toggle = document.createElement('button');
  toggle.type = 'button';
  toggle.className = 'typ-row-toggle';
  toggle.title = 'Show this judgement’s full derivation';
  toggle.setAttribute('aria-expanded', String(openRows.has(index)));
  toggle.addEventListener('click', () => {
    if (openRows.has(index)) openRows.delete(index);
    else openRows.add(index);
    row.classList.toggle('is-open');
    toggle.setAttribute('aria-expanded', String(row.classList.contains('is-open')));
  });

  const rule = document.createElement('span');
  rule.className = 'typ-row-rule';
  rule.textContent = derivation.rule;

  const judgement = document.createElement('button');
  judgement.type = 'button';
  judgement.className = 'typ-judgement typ-row-judgement';
  judgement.textContent = derivation.judgement;
  if (derivation.note) judgement.title = derivation.note;
  judgement.addEventListener('click', () => locate(derivation.blockId));

  head.append(toggle, rule, judgement);
  row.appendChild(head);

  const tree = document.createElement('div');
  tree.className = 'typ-row-tree';
  tree.appendChild(renderNode(derivation));
  row.appendChild(tree);

  return row;
}

function renderMethod(method: MethodDerivation): void {
  const gamma = byId<HTMLDivElement>('typing-gamma');
  if (gamma) gamma.textContent = `Γ = ${method.gamma}`;

  const host = byId<HTMLDivElement>('typing-tree');
  if (!host) return;
  host.replaceChildren();

  if (method.deriv.premises.length === 0) {
    const empty = document.createElement('div');
    empty.className = 'typ-empty';
    empty.textContent = 'This method body has no statements to derive.';
    host.appendChild(empty);
    return;
  }
  method.deriv.premises.forEach((premise, index) => host.appendChild(renderRow(premise, index)));
}

function render(): void {
  const select = byId<HTMLSelectElement>('typing-method-select');
  const host = byId<HTMLDivElement>('typing-tree');
  if (!select || !host) return;

  const workspace = getWorkspace();
  if (!workspace) return;

  const derivations = deriveProgram(workspace);
  if (derivations.length === 0) {
    select.replaceChildren();
    const gamma = byId<HTMLDivElement>('typing-gamma');
    if (gamma) gamma.textContent = '';
    host.replaceChildren();
    const empty = document.createElement('div');
    empty.className = 'typ-empty';
    empty.textContent = 'No program to type: the workspace has no goal block.';
    host.appendChild(empty);
    return;
  }

  // Rebuild the picker, keeping the current selection when it still exists.
  const labels = derivations.map((d) => d.label);
  select.replaceChildren();
  for (const label of labels) {
    const option = document.createElement('option');
    option.value = label;
    option.textContent = label;
    select.appendChild(option);
  }
  if (selectedLabel === null || !labels.includes(selectedLabel)) {
    selectedLabel = labels[0];
    openRows = new Set();
  }
  select.value = selectedLabel;

  renderMethod(derivations.find((d) => d.label === selectedLabel)!);
}

/** rAF-debounced re-render; no-ops unless the Typing tab is active. */
export function scheduleTypingRender(): void {
  const panel = byId<HTMLElement>('panel-typing');
  if (!panel || !panel.classList.contains('is-active')) return;
  if (renderFrame !== null) window.cancelAnimationFrame(renderFrame);
  renderFrame = window.requestAnimationFrame(() => {
    renderFrame = null;
    render();
  });
}

export function initTypingPanel(getter: GetWorkspace): void {
  getWorkspace = getter;
  byId<HTMLSelectElement>('typing-method-select')?.addEventListener('change', (event) => {
    selectedLabel = (event.currentTarget as HTMLSelectElement).value;
    openRows = new Set();
    render();
  });
}

/** A classic proof tree is `white-space: nowrap` end to end (breaking a
 * judgement mid-line would be unreadable), so a deep or wide derivation is
 * routinely 2000px+ across. Chromium's print/PDF pipeline, when a laid-out
 * box's own width exceeds the page's printable width, doesn't clip or
 * paginate it horizontally — it silently omits it from the printed output
 * (confirmed empirically: identical content prints fine on an oversized page
 * and renders nothing on a standard Letter page). Scaling the tree down with
 * a `transform` — a paint-time operation, not a layout one — keeps its
 * *painted* bounds inside the printable area without touching the nowrap
 * layout that makes it readable in the first place.
 *
 * The target itself is a *node's own* width, not the page's: landscape
 * Letter/A4 at 12mm `@page` margins (styles.css) leaves roughly 965px of
 * printable width at 96dpi, but a node sits behind `.typ-tree`'s 14px+14px
 * print padding and `.typ-row-tree`'s 36px+14px padding before and after it
 * (styles.css) — about 78px of fixed overhead the node's own
 * `getBoundingClientRect().width` never includes. Leaving that unaccounted
 * for budgeted the scale so tight that the widest row's right edge still
 * missed the page by a few px and silently vanished (same failure mode as
 * an unscaled tree, just smaller) — 880 bakes in the overhead plus a margin
 * of safety instead of chasing the exact figure. */
const PRINT_SAFE_WIDTH_PX = 880;

/** Must match `.typ-rule`/`.typ-row-rule` and `.typ-judgement`/
 * `.typ-row-judgement`'s font-size under `body.printing-typing` in
 * styles.css. `@media print` doesn't activate outside a real print pass, so
 * measuring at the screen font sizes (9.5px/12px, smaller than print's
 * 11px/13.5px) would compute a scale that's too generous — the tree still
 * fits on screen-sized text but overflows once print's larger, pretty-print
 * type kicks in. Bumping the fonts inline for the measurement (below) reads
 * the width printing will actually produce, at the cost of these two
 * numbers needing to travel with the CSS if it changes. */
const PRINT_RULE_FONT_PX = 11;
const PRINT_JUDGEMENT_FONT_PX = 13.5;

/** Print the selected method's derivation. The `printing-typing` class (see
 * `@media print` in styles.css) hides the rest of the IDE chrome and forces
 * every collapsed `.typ-row-tree` open, so the printed page is complete
 * regardless of what the user currently has expanded on screen. */
export function printTyping(): void {
  const tree = byId<HTMLDivElement>('typing-tree');
  if (!tree) return;

  // Screen-only chrome (the dropdown picker) has nothing to say on a printed
  // page; a proper title in its place is what makes this look like a
  // document rather than a screenshot of the app. `document.title` doubles
  // as the suggested filename and, if the user has Chrome's own "Headers
  // and footers" print option on, the running header/footer text — this is
  // the one piece of "pretty print" the CSS itself can't reach.
  const select = byId<HTMLSelectElement>('typing-method-select');
  const label = select?.value ?? '';
  const titleEl = byId<HTMLDivElement>('typing-print-title');
  const metaEl = byId<HTMLDivElement>('typing-print-meta');
  if (titleEl) titleEl.textContent = label;
  if (metaEl) {
    metaEl.textContent = new Date().toLocaleString(undefined, {
      dateStyle: 'medium',
      timeStyle: 'short'
    });
  }
  const previousTitle = document.title;
  document.title = label ? `Block MiniJava — Typing Derivation — ${label}` : document.title;

  // `#typing-tree` itself is flex-stretched to fill the panel, so its own
  // `scrollWidth` just reports that stretched (container) width whenever the
  // real content is narrower — telling us nothing about the derivation's
  // actual width. Each row's root `.typ-node` is `display: inline-flex`
  // (shrink-wrapped to its own content regardless of any stretched
  // ancestor), so measure those directly instead. `.typ-row-tree` is
  // `display: none` (not just clipped) while its row is closed, so a closed
  // row's node isn't measurable — force every row temporarily visible
  // (matching what print shows) without touching the real `is-open`/
  // `openRows` state the user sees on screen.
  const closedTrees = Array.from(tree.querySelectorAll<HTMLElement>('.typ-row:not(.is-open) .typ-row-tree'));
  for (const el of closedTrees) el.style.display = 'block';
  const ruleEls = Array.from(tree.querySelectorAll<HTMLElement>('.typ-rule, .typ-row-rule'));
  const judgementEls = Array.from(tree.querySelectorAll<HTMLElement>('.typ-judgement, .typ-row-judgement'));
  for (const el of ruleEls) el.style.fontSize = `${PRINT_RULE_FONT_PX}px`;
  for (const el of judgementEls) el.style.fontSize = `${PRINT_JUDGEMENT_FONT_PX}px`;
  let naturalWidth = 0;
  for (const node of tree.querySelectorAll<HTMLElement>('.typ-row-tree > .typ-node')) {
    naturalWidth = Math.max(naturalWidth, node.getBoundingClientRect().width);
  }
  for (const el of ruleEls) el.style.fontSize = '';
  for (const el of judgementEls) el.style.fontSize = '';
  for (const el of closedTrees) el.style.display = '';

  const scale = naturalWidth > PRINT_SAFE_WIDTH_PX ? PRINT_SAFE_WIDTH_PX / naturalWidth : 1;

  let cleaned = false;
  const cleanup = (): void => {
    if (cleaned) return;
    cleaned = true;
    window.removeEventListener('afterprint', cleanup);
    document.documentElement.classList.remove('printing-typing');
    document.body.classList.remove('printing-typing');
    tree.style.removeProperty('transform');
    tree.style.removeProperty('transform-origin');
    document.title = previousTitle;
  };
  if (scale < 1) {
    tree.style.transform = `scale(${scale})`;
    tree.style.transformOrigin = 'top left';
  }
  document.documentElement.classList.add('printing-typing');
  document.body.classList.add('printing-typing');
  window.addEventListener('afterprint', cleanup, { once: true });
  window.print();
  // `print()` blocks in interactive browsers; this fallback covers cancelled
  // and headless print calls where `afterprint` may not fire.
  window.setTimeout(cleanup, 0);
}
