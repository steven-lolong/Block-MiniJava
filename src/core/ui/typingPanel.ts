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
