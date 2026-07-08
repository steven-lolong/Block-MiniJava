/**
 * Surfaces type-checker diagnostics in the IDE: a warning icon on each
 * offending block and a Problems tab in the inspector with click-to-locate.
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
}

function renderProblemsPanel(workspace: Blockly.WorkspaceSvg, diags: TypeDiagnostic[]): void {
  const list = document.getElementById('problems-list');
  const badge = document.getElementById('problems-count');
  if (!list || !badge) return;

  const errorCount = diags.filter((diag) => diag.severity === 'error').length;
  badge.textContent = String(diags.length);
  badge.hidden = diags.length === 0;
  badge.classList.toggle('has-errors', errorCount > 0);

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

/** Runs the checker and refreshes both surfaces. Returns the diagnostics. */
export function refreshTypeDiagnostics(workspace: Blockly.WorkspaceSvg): TypeDiagnostic[] {
  const diags = checkWorkspace(workspace);
  applyBlockWarnings(workspace, diags);
  renderProblemsPanel(workspace, diags);
  return diags;
}
