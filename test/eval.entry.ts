/**
 * Headless entry for the legacy-evaluator (CbS / CbV) tests.
 *
 * Bundled for node (webpack.test.config.js); parses MiniJava text into a
 * headless workspace and drives the strategy-parameterized evaluator that
 * backs the Structure / Value visualization tabs, so test/run_eval.js can
 * compare call-by-structure against call-by-value without a browser.
 */

import * as Blockly from 'blockly';
import { defineMiniJavaBlocks } from '../src/core/blocks/minijavaBlocks';
import { parseMiniJavaTextToWorkspaceState } from '../src/core/parser/minijavaTextParser';
import {
  createRuntimeEnv,
  evaluateExpression,
  executeStatement,
  formatRuntimeValue,
  type ReductionKind
} from '../src/core/semantics/minijavaRuntime';
import { renderMiniJavaReduction } from '../src/core/semantics/minijavaReduction';

defineMiniJavaBlocks();

export interface EvalReport {
  /** println output collected by the evaluator. */
  output: string[];
}

function loadWorkspace(source: string): Blockly.Workspace {
  const workspace = new Blockly.Workspace();
  Blockly.serialization.workspaces.load(
    parseMiniJavaTextToWorkspaceState(source) as unknown as { [key: string]: unknown },
    workspace
  );
  return workspace;
}

/** Runs main's statement chain under the given strategy; returns the output. */
export function evalSource(source: string, strategy: ReductionKind): EvalReport {
  const workspace = loadWorkspace(source);
  try {
    const goal = workspace.getTopBlocks(false).find((block) => block.type === 'mj_goal');
    const main = goal?.getInputTargetBlock('MAIN');
    if (!main) throw new Error('no main class');
    const env = createRuntimeEnv(workspace, strategy);
    executeStatement(main.getInputTargetBlock('STATEMENT'), env);
    return { output: [...env.output] };
  } finally {
    workspace.dispose();
  }
}

/**
 * Renders the Structure/Value reduction view headlessly for the first method
 * call in main's println and reports the substituted view's own evaluation.
 */
export function renderReduction(source: string, strategy: ReductionKind): { blockCount: number; value: string } {
  const workspace = loadWorkspace(source);
  const target = new Blockly.Workspace();
  try {
    const call = workspace.getAllBlocks(false).find((block) => block.type === 'mj_expr_method_call');
    if (!call) throw new Error('no method call in the program');
    renderMiniJavaReduction(call, target as Blockly.WorkspaceSvg, strategy);
    const env = createRuntimeEnv(workspace, strategy);
    const value = formatRuntimeValue(evaluateExpression(call, env));
    return { blockCount: target.getAllBlocks(false).length, value };
  } finally {
    target.dispose();
    workspace.dispose();
  }
}
