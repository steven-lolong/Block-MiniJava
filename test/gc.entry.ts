/**
 * Headless entry for the GC tests: sweep-phase unit checks plus the
 * semantic-transparency property (a program's result is identical whether
 * GC runs between eval steps or not).
 *
 * The env/kont root-flattening (`rootsOf` below) is TEST-HARNESS glue, not
 * part of the library surface: `src/core/semantics/gc.ts` exposes exactly
 * one entry point, `runGC(env, store, kont)`, per the constraint that GC
 * stay a small transition composed from outside `step`, not baked into it.
 * A later pass that wires GC into the live stepper/visualizer will decide
 * *when* to trigger it — "after every step" here is deliberately the most
 * aggressive policy, chosen to stress-test correctness, not a claim about
 * what a real trigger policy should be — and can reuse or reshape this glue.
 */

import * as Blockly from 'blockly';
import { defineMiniJavaBlocks } from '../src/core/blocks/minijavaBlocks';
import { parseMiniJavaTextToWorkspaceState } from '../src/core/parser/minijavaTextParser';
import {
  injectMachine,
  step,
  REF_V,
  INT_V,
  type Frame,
  type Kont,
  type MachineState,
  type MachineValue
} from '../src/core/semantics/minijavaMachine';
import { runGC, sweep, type Store } from '../src/core/semantics/gc';
import { reachableAddresses, markPhase, type Address } from '../src/core/semantics/reachability';

defineMiniJavaBlocks();

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
  if (frame.self !== null) env.push(REF_V(frame.self)); // `this`, Model A only
  return { env, kont: kontRoots(frame.kont) };
}

/**
 * Flattens EVERY live frame (not just the top of the call stack) plus the
 * in-flight control value into (env, kont) roots.
 *
 * The in-flight value matters for correctness: right after `new` allocates,
 * the fresh `Ref` sits ONLY in `state.control` for exactly one step, before
 * the pending assign/call-arg continuation consumes it. Miss it here and a
 * GC composed immediately after that step would collect an object that's
 * about to be used — this is exactly the case the "aliasing + garbage"
 * integration tests below would catch if this line were dropped.
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

/** The GC transition, composed AFTER a `step()` call by the loops below —
 * never inside `step` itself. Sweeps `state.heap` via the one library
 * entry point (`runGC`); everything else (control, stack, nextLoc,
 * output, ...) is carried over unchanged. */
function collectGarbage(state: MachineState): MachineState {
  const { env, kont } = rootsOf(state);
  const heap = runGC(env, state.heap, kont);
  return { ...state, heap };
}

function withWorkspace<T>(source: string, runFn: (workspace: Blockly.Workspace) => T): T {
  const wsState = parseMiniJavaTextToWorkspaceState(source);
  const workspace = new Blockly.Workspace();
  try {
    Blockly.serialization.workspaces.load(wsState as unknown as { [key: string]: unknown }, workspace);
    return runFn(workspace);
  } finally {
    workspace.dispose();
  }
}

export interface GCRunReport {
  status: string;
  error: string | null;
  output: string[];
  steps: number;
  finalHeapSize: number;
}

function report(state: MachineState): GCRunReport {
  return {
    status: state.status,
    error: state.error,
    output: state.output,
    steps: state.stepCount,
    finalHeapSize: state.heap.size
  };
}

/** Runs to completion, composing `collectGarbage` after EVERY step. */
export function runWithGCEveryStep(source: string, maxSteps = 100000): GCRunReport {
  return withWorkspace(source, (workspace) => {
    const initial = injectMachine(workspace, 'A');
    if ('injectError' in initial) throw new Error(initial.injectError);
    let state = initial;
    while (state.status === 'running' && state.stepCount < maxSteps) {
      state = step(state);
      state = collectGarbage(state);
    }
    return report(state);
  });
}

/** Runs to completion with GC never invoked — the comparison baseline. */
export function runWithoutGC(source: string, maxSteps = 100000): GCRunReport {
  return withWorkspace(source, (workspace) => {
    const initial = injectMachine(workspace, 'A');
    if ('injectError' in initial) throw new Error(initial.injectError);
    let state = initial;
    while (state.status === 'running' && state.stepCount < maxSteps) {
      state = step(state);
    }
    return report(state);
  });
}

export { runGC, sweep, reachableAddresses, markPhase, REF_V, INT_V };
export type { Store, Address };
