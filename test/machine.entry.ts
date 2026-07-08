/**
 * Headless entry for the Model A machine tests.
 *
 * Bundled for node (webpack.test.config.js); registers the MiniJava blocks
 * once and exposes `runSource`, which parses MiniJava text to blocks, builds
 * the initial machine state and steps it to completion, reporting the trace
 * facts the tests assert on (output, status, rules seen, stack depth, heap).
 */

import * as Blockly from 'blockly';
import { defineMiniJavaBlocks } from '../src/core/blocks/minijavaBlocks';
import { parseMiniJavaTextToWorkspaceState } from '../src/core/parser/minijavaTextParser';
import { injectMachine, step, type MachineState, type ValueModel } from '../src/core/semantics/minijavaMachine';

defineMiniJavaBlocks();

export interface RunReport {
  status: 'done' | 'error';
  error: string | null;
  output: string[];
  steps: number;
  rules: string[];
  maxStackDepth: number;
  heapSize: number;
}

function runToEnd(state: MachineState, maxSteps: number): RunReport {
  const rules = new Set<string>();
  let maxStackDepth = state.stack.length;
  while (state.status === 'running' && state.stepCount < maxSteps) {
    state = step(state);
    if (state.lastRule) rules.add(state.lastRule);
    maxStackDepth = Math.max(maxStackDepth, state.stack.length);
  }
  if (state.status === 'running') {
    return {
      status: 'error',
      error: `did not finish within ${maxSteps} steps`,
      output: state.output,
      steps: state.stepCount,
      rules: [...rules],
      maxStackDepth,
      heapSize: state.heap.size
    };
  }
  return {
    status: state.status,
    error: state.error,
    output: state.output,
    steps: state.stepCount,
    rules: [...rules],
    maxStackDepth,
    heapSize: state.heap.size
  };
}

function withWorkspace<T>(source: string, runFn: (workspace: Blockly.Workspace) => T): T {
  const state = parseMiniJavaTextToWorkspaceState(source);
  const workspace = new Blockly.Workspace();
  try {
    Blockly.serialization.workspaces.load(state as unknown as { [key: string]: unknown }, workspace);
    return runFn(workspace);
  } finally {
    workspace.dispose();
  }
}

export function runSource(source: string, maxSteps = 100000, model: ValueModel = 'A'): RunReport {
  return withWorkspace(source, (workspace) => {
    const initial = injectMachine(workspace, model);
    if ('injectError' in initial) throw new Error(initial.injectError);
    return runToEnd(initial, maxSteps);
  });
}

/** Ordered rule trace of a full run — for operational-correspondence checks. */
export function traceSource(source: string, model: ValueModel = 'A', maxSteps = 100000): { rules: string[]; output: string[]; status: string } {
  return withWorkspace(source, (workspace) => {
    const initial = injectMachine(workspace, model);
    if ('injectError' in initial) throw new Error(initial.injectError);
    let state = initial;
    const rules: string[] = [];
    while (state.status === 'running' && state.stepCount < maxSteps) {
      state = step(state);
      if (state.lastRule) rules.push(state.lastRule);
    }
    return { rules, output: state.output, status: state.status };
  });
}

/** Runs after emptying one input socket, to exercise incomplete programs. */
export function runSourceWithEmptiedInput(
  source: string,
  ownerBlockType: string,
  inputName: string,
  maxSteps = 100000
): RunReport {
  return withWorkspace(source, (workspace) => {
    const owner = workspace.getAllBlocks(false).find((block) => block.type === ownerBlockType);
    const child = owner?.getInputTargetBlock(inputName) ?? null;
    if (!child) throw new Error(`No connected block on ${ownerBlockType}.${inputName}`);
    child.dispose(false);
    const initial = injectMachine(workspace);
    if ('injectError' in initial) throw new Error(initial.injectError);
    return runToEnd(initial, maxSteps);
  });
}

export { Blockly, parseMiniJavaTextToWorkspaceState };
