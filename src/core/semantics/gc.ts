/**
 * Sweep phase + the composed mark-and-sweep GC transition for the
 * heap-reference MiniJava fork (Value Model A).
 *
 * This module is deliberately composed ALONGSIDE `step` (minijavaMachine.ts)
 * rather than folded into it: nothing here imports or calls `step`, and
 * `step` itself is untouched. A caller runs GC as its own transition
 * between eval steps — never interleaved with one.
 *
 * GC runs to completion in a single call: `runGC` drives the Step 3 mark
 * phase (`reachableAddresses`, which itself drains the `markPhase`
 * generator — reachability.ts) all the way to a final reachable set
 * *before* sweeping. There is no partially-marked state a caller can ever
 * observe mid-collection, so there is no write barrier or tri-color
 * bookkeeping to get right — that machinery only matters for a GC that can
 * be paused and resumed while the mutator keeps running, which this one
 * never is.
 */

import type { HeapObj, MachineValue } from './minijavaMachine';
import { reachableAddresses, type Address } from './reachability';

export type Store = Map<Address, HeapObj>;

/**
 * The sweep phase: a fresh store containing exactly the entries of `store`
 * whose address is in `reachable` — everything else is dropped. Read-only
 * on `store` (a new `Map` is returned); surviving entries are the SAME
 * `HeapObj` references, not copies, so an untouched object really is
 * untouched.
 *
 * Addresses that don't survive are simply absent from the result — gone
 * for good. Nothing here renumbers or recycles a key, so a caller's
 * separate allocation counter (`nextLoc` in `MachineState`) stays
 * monotonic and can never collide with a retired address: `sweep` only
 * ever shrinks the domain, never reassigns it.
 */
export function sweep(store: ReadonlyMap<Address, HeapObj>, reachable: ReadonlySet<Address>): Store {
  const swept: Store = new Map();
  for (const [loc, obj] of store) {
    if (reachable.has(loc)) swept.set(loc, obj);
  }
  return swept;
}

/**
 * The single GC entry point: mark (run the Step 3 reachability closure to
 * completion) then sweep. Pure — `store` is read via `ReadonlyMap` and
 * never mutated; the result is a brand-new `Store` with every unreachable
 * address permanently retired.
 */
export function runGC(
  env: MachineValue[],
  store: ReadonlyMap<Address, HeapObj>,
  kont: MachineValue[]
): Store {
  const reachable = reachableAddresses(env, store, kont);
  return sweep(store, reachable);
}
