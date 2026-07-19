/**
 * Headless entry for the reachability-closure tests.
 *
 * No Blockly bootstrap needed: `reachableAddresses` only depends on the
 * `MachineValue`/`HeapObj`/`Loc` data types (imported `type`-only in
 * reachability.ts), so this bundle is pure data in, data out.
 */

import { reachableAddresses, markPhase, type Address, type MarkEvent, type MarkSource } from '../src/core/semantics/reachability';
import { REF_V, INT_V, type HeapObj, type MachineValue } from '../src/core/semantics/minijavaMachine';

export { reachableAddresses, markPhase, REF_V, INT_V };
export type { Address, MarkEvent, MarkSource, HeapObj, MachineValue };
