/**
 * Surfaces type-checker diagnostics in the IDE: a warning icon on each
 * offending block and the Problems views with click-to-locate.
 */

import * as Blockly from 'blockly';
import { checkWorkspace, type TypeDiagnostic } from '../types/typeChecker';

const WARNING_OWNER_ID = 'bmj-type-checker';

let markedBlockIds = new Set<string>();

function groupByBlock(diags: TypeDiagnostic[]): Map<string, string[]> {
  const grouped = new Map<string, string[]>();
  for (const diag of diags) {
    const messages = grouped.get(diag.blockId) ?? [];
    messages.push(diag.message);
    grouped.set(diag.blockId, messages);
  }
  return grouped;
}

function applyBlockWarnings(workspace: Blockly.WorkspaceSvg, diags: TypeDiagnostic[]): void {
  const grouped = groupByBlock(diags);
  for (const staleId of markedBlockIds) {
    if (!grouped.has(staleId)) {
      workspace.getBlockById(staleId)?.setWarningText(null, WARNING_OWNER_ID);
    }
  }
  for (const [blockId, messages] of grouped) {
    workspace.getBlockById(blockId)?.setWarningText(messages.join('\n'), WARNING_OWNER_ID);
  }
  markedBlockIds = new Set(grouped.keys());
}

function locateBlock(workspace: Blockly.WorkspaceSvg, blockId: string): void {
  const block = workspace.getBlockById(blockId) as Blockly.BlockSvg | null;
  if (!block) return;
  workspace.centerOnBlock(blockId);
  // setSelected (unlike BlockSvg.select) also clears the previous selection.
  Blockly.common.setSelected(block);
  window.dispatchEvent(new CustomEvent('bmj:problem-located'));
}

function renderProblemList(list: HTMLElement, workspace: Blockly.WorkspaceSvg, diags: TypeDiagnostic[]): void {
  list.innerHTML = '';
  if (diags.length === 0) {
    const empty = document.createElement('div');
    empty.className = 'problems-empty';
    empty.textContent = 'No problems: the program type-checks.';
    list.appendChild(empty);
    return;
  }

  const ordered = [...diags].sort((a, b) =>
    a.severity === b.severity ? 0 : a.severity === 'error' ? -1 : 1
  );
  for (const diag of ordered) {
    const row = document.createElement('button');
    row.type = 'button';
    row.className = `problem-item is-${diag.severity}`;
    row.title = 'Show this block in the workspace';
    const dot = document.createElement('span');
    dot.className = 'problem-dot';
    dot.setAttribute('aria-hidden', 'true');
    const text = document.createElement('span');
    text.className = 'problem-message';
    text.textContent = diag.message;
    row.append(dot, text);
    row.addEventListener('click', () => locateBlock(workspace, diag.blockId));
    list.appendChild(row);
  }
}

function renderProblemsPanel(workspace: Blockly.WorkspaceSvg, diags: TypeDiagnostic[]): void {
  const errorCount = diags.filter((diag) => diag.severity === 'error').length;
  for (const id of ['problems-count', 'bottom-problems-count']) {
    const badge = document.getElementById(id);
    if (!badge) continue;
    badge.textContent = String(diags.length);
    badge.hidden = diags.length === 0;
    badge.classList.toggle('has-errors', errorCount > 0);
  }

  const statusCount = document.getElementById('status-problems-count');
  if (statusCount) {
    statusCount.textContent = `${diags.length} Problem${diags.length === 1 ? '' : 's'}`;
    statusCount.classList.toggle('has-errors', errorCount > 0);
  }

  for (const id of ['problems-list', 'bottom-problems-list']) {
    const list = document.getElementById(id);
    if (list) renderProblemList(list, workspace, diags);
  }
}

/** Runs the checker and refreshes both surfaces. Returns the diagnostics. */
export function refreshTypeDiagnostics(workspace: Blockly.WorkspaceSvg): TypeDiagnostic[] {
  const diags = checkWorkspace(workspace);
  applyBlockWarnings(workspace, diags);
  renderProblemsPanel(workspace, diags);
  return diags;
}
