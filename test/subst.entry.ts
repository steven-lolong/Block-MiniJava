/**
 * Headless entry for the substitution-stepper tests.
 *
 * Bundled for node (webpack.test.config.js); exposes `runSubst`, which
 * parses MiniJava text to blocks, builds the substitution state, and
 * rewrites to a value, reporting the trace, the formatted result, and the
 * structure-preservation invariant (all block ids unique at every step).
 */

import * as Blockly from 'blockly';
import { defineMiniJavaBlocks } from '../src/core/blocks/minijavaBlocks';
import { parseMiniJavaTextToWorkspaceState } from '../src/core/parser/minijavaTextParser';
import {
  collectTreeIds,
  formatTree,
  injectSubstitution,
  stepSubstitution,
  type SubstitutionState
} from '../src/core/semantics/minijavaSubstitution';

defineMiniJavaBlocks();

export interface SubstReport {
  status: 'done' | 'error';
  error: string | null;
  result: string | null;
  steps: number;
  rules: string[];
  /** ids seen more than once in any intermediate tree — must stay empty. */
  duplicateIds: string[];
}

export function runSubst(source: string, maxSteps = 10000): SubstReport {
  const workspaceState = parseMiniJavaTextToWorkspaceState(source);
  const workspace = new Blockly.Workspace();
  try {
    Blockly.serialization.workspaces.load(workspaceState as unknown as { [key: string]: unknown }, workspace);
    const initial = injectSubstitution(workspace);
    if ('injectError' in initial) throw new Error(initial.injectError);

    let state: SubstitutionState = initial;
    const rules: string[] = [];
    const duplicateIds = new Set<string>();
    const checkIds = (s: SubstitutionState): void => {
      const ids = collectTreeIds(s.tree);
      const seen = new Set<string>();
      for (const id of ids) {
        if (seen.has(id)) duplicateIds.add(id);
        seen.add(id);
      }
    };
    checkIds(state);
    while (state.status === 'running' && state.stepCount < maxSteps) {
      state = stepSubstitution(state);
      if (state.status === 'running' || state.status === 'done') checkIds(state);
      if (state.lastRule && state.lastRule !== 'halt' && state.lastRule !== 'stuck') rules.push(state.lastRule);
    }
    if (state.status === 'running') throw new Error(`did not finish within ${maxSteps} steps`);
    return {
      status: state.status,
      error: state.error,
      result: state.status === 'done' ? formatTree(state.tree) : null,
      steps: state.stepCount,
      rules,
      duplicateIds: [...duplicateIds]
    };
  } finally {
    workspace.dispose();
  }
}

export { Blockly, parseMiniJavaTextToWorkspaceState };
