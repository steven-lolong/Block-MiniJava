/**
 * Reachability closure for the heap-reference MiniJava fork (Value Model A).
 *
 * Pure, standalone, and store-agnostic beyond reading it: no mutation, no
 * dependency on Blockly or on `MachineState`/`Frame`. This is deliberate so
 * it can be unit-tested with hand-built fixtures and reused later from the
 * step loop without dragging the whole machine module along.
 *
 * Roots are split into the two places live values are pinned outside the
 * heap:
 *  - `env`   — every value directly held by a live frame's bindings (locals
 *              AND `this`, already coerced to a `Ref` by the caller).
 *  - `kont`  — every value directly held by a live frame's pending
 *              continuations (e.g. `KBinR.left`, `KCallArgs.done`).
 *
 * IMPORTANT for the eventual caller: a MiniJava call stack can hold several
 * frames at once, and EVERY live frame is a root source, not just the top
 * one. Flatten `locals.values()` / `kont` values across the WHOLE
 * `state.stack`, not just `top(state)`, or a live parent frame's bindings
 * will look like garbage mid-call.
 *
 * `markPhase` is the traversal core — a generator that yields one
 * `MarkEvent` per object newly marked reachable, in visitation order, so a
 * stepper UI can drive it one `.next()` at a time and animate each mark.
 * `reachableAddresses` (batch, used by tests and any non-visual caller)
 * just drains that same generator into a `Set` — there is exactly one
 * traversal implementation, not two.
 */

import type { HeapObj, Loc, MachineValue } from './minijavaMachine';

export type Address = Loc;

/** Where the mark traversal reached a newly-marked address from. */
export type MarkSource =
  | { tag: 'root'; origin: 'env' | 'kont' }
  | { tag: 'address'; from: Address };

/** One "object visited" event: the address just marked, and its source. */
export interface MarkEvent {
  address: Address;
  from: MarkSource;
}

interface WorklistItem {
  loc: Address;
  from: MarkSource;
}

/**
 * Steppable mark phase. Each `.next()` call resumes the traversal until the
 * next object is newly marked reachable (or the traversal is exhausted),
 * yielding exactly one `MarkEvent` per call — so a caller can drive it
 * one visited-object at a time (e.g. for a visualizer's step button) or
 * drain it in a `for...of` for the batch case.
 *
 * Never mutates `store` (read via `ReadonlyMap`) and terminates on cyclic
 * heaps: an address is expanded into its own field/element values at most
 * once (`marked` guards re-entry), no matter how many times it's discovered.
 */
export function* markPhase(
  env: MachineValue[],
  store: ReadonlyMap<Address, HeapObj>,
  kont: MachineValue[]
): Generator<MarkEvent, void, void> {
  const worklist: WorklistItem[] = [];

  const envAddrs = new Set<Address>();
  for (const value of env) collectAddresses(value, envAddrs);
  for (const loc of envAddrs) worklist.push({ loc, from: { tag: 'root', origin: 'env' } });

  const kontAddrs = new Set<Address>();
  for (const value of kont) collectAddresses(value, kontAddrs);
  for (const loc of kontAddrs) worklist.push({ loc, from: { tag: 'root', origin: 'kont' } });

  const marked = new Set<Address>();
  while (worklist.length > 0) {
    const item = worklist.pop()!;
    if (marked.has(item.loc)) continue; // already visited — breaks cycles
    marked.add(item.loc);
    yield { address: item.loc, from: item.from };

    const obj = store.get(item.loc);
    if (!obj) continue; // dangling ref: nothing further to close over

    const nested = new Set<Address>();
    if (obj.tag === 'Obj') {
      for (const value of obj.fields.values()) collectAddresses(value, nested);
    } else {
      for (const value of obj.elems) collectAddresses(value, nested);
    }
    for (const nestedLoc of nested) {
      if (!marked.has(nestedLoc)) worklist.push({ loc: nestedLoc, from: { tag: 'address', from: item.loc } });
    }
  }
}

/**
 * The set of addresses reachable from `env` and `kont` roots — the batch
 * form of `markPhase`, for callers (tests, non-visual code) that just want
 * the final result and don't care about the visitation sequence.
 */
export function reachableAddresses(
  env: MachineValue[],
  store: ReadonlyMap<Address, HeapObj>,
  kont: MachineValue[]
): Set<Address> {
  const reachable = new Set<Address>();
  for (const event of markPhase(env, store, kont)) reachable.add(event.address);
  return reachable;
}

/** Collects every `Loc` a value points to, recursing into inline structure. */
function collectAddresses(value: MachineValue, out: Set<Address>): void {
  switch (value.tag) {
    case 'Ref':
      out.add(value.loc);
      return;
    case 'Obj':
      // Model A never nests Obj/Arr inline (they live behind a Ref), but a
      // mixed or future value never breaks the closure if it does.
      for (const field of value.fields.values()) collectAddresses(field, out);
      return;
    case 'Arr':
      for (const elem of value.elems) collectAddresses(elem, out);
      return;
    default:
      return;
  }
}
