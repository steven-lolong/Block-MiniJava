/**
 * Headless entry for the type-checker tests.
 *
 * Bundled for node (webpack.test.config.js); registers the MiniJava blocks
 * once and exposes `checkSource` so test/run_typecheck.js can type-check
 * MiniJava source (text -> blocks -> diagnostics) without a browser.
 */

import * as Blockly from 'blockly';
import { defineMiniJavaBlocks } from '../src/core/blocks/minijavaBlocks';
import { parseMiniJavaTextToWorkspaceState } from '../src/core/parser/minijavaTextParser';
import { checkWorkspace } from '../src/core/types/typeChecker';

defineMiniJavaBlocks();

export interface ReportedDiagnostic {
  severity: 'error' | 'warning';
  message: string;
}

function withWorkspace<T>(source: string, run: (workspace: Blockly.Workspace) => T): T {
  const state = parseMiniJavaTextToWorkspaceState(source);
  const workspace = new Blockly.Workspace();
  try {
    Blockly.serialization.workspaces.load(state as unknown as { [key: string]: unknown }, workspace);
    return run(workspace);
  } finally {
    workspace.dispose();
  }
}

function report(workspace: Blockly.Workspace): ReportedDiagnostic[] {
  return checkWorkspace(workspace).map((diag) => ({ severity: diag.severity, message: diag.message }));
}

export function checkSource(source: string): ReportedDiagnostic[] {
  return withWorkspace(source, report);
}

/**
 * Type-checks the source after deleting the Type block connected to the
 * first block of `ownerBlockType`, to exercise first-class annotation holes
 * (the text parser cannot produce an empty Type socket).
 */
export function checkSourceWithoutTypeOn(source: string, ownerBlockType: string): ReportedDiagnostic[] {
  return withWorkspace(source, (workspace) => {
    const owner = workspace.getAllBlocks(false).find((block) => block.type === ownerBlockType);
    const typeBlock = owner?.getInputTargetBlock('TYPE') ?? null;
    if (!typeBlock) throw new Error(`No connected Type block found on '${ownerBlockType}'`);
    typeBlock.dispose(false);
    return report(workspace);
  });
}

export { Blockly, checkWorkspace, parseMiniJavaTextToWorkspaceState };
