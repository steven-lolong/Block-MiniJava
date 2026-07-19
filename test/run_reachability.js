#!/usr/bin/env node
/**
 * Reachability-closure tests for the heap-reference MiniJava fork.
 *
 * `reachableAddresses(env, store, kont)` is pure data in/data out (see
 * src/core/semantics/reachability.ts), so these fixtures build `MachineValue`
 * / heap maps by hand rather than running programs through the parser.
 *
 * Run with: npm run test:reachability
 */

const { reachableAddresses, markPhase, REF_V, INT_V } = require('./dist/reachability.bundle.js');

let failures = 0;
let passed = 0;

function fail(name, message) {
  failures += 1;
  console.log(`FAIL  ${name}\n      ${message}`);
}

function ok(name) {
  passed += 1;
  console.log(`ok    ${name}`);
}

function deepEqual(a, b) {
  if (a === b) return true;
  if (typeof a !== 'object' || typeof b !== 'object' || a === null || b === null) return false;
  const ak = Object.keys(a);
  const bk = Object.keys(b);
  if (ak.length !== bk.length) return false;
  return ak.every((k) => deepEqual(a[k], b[k]));
}

function assertSetEquals(name, actual, expected) {
  const a = [...actual].sort((x, y) => x - y);
  const e = [...expected].sort((x, y) => x - y);
  const match = a.length === e.length && a.every((v, i) => v === e[i]);
  if (!match) {
    fail(name, `expected {${e.join(', ')}}, got {${a.join(', ')}}`);
    return;
  }
  ok(name);
}

function assertEvent(name, actual, expected) {
  if (!deepEqual(actual, expected)) {
    fail(name, `expected ${JSON.stringify(expected)}, got ${JSON.stringify(actual)}`);
    return;
  }
  ok(name);
}

function obj(fields, className = 'C') {
  return { tag: 'Obj', className, fields: new Map(Object.entries(fields)), blockId: 'b' };
}

function arr(elems) {
  return { tag: 'Arr', elems, blockId: 'b' };
}

// 1. Field-chain reachability: loc 2 is reachable only through loc 1's field.
{
  const store = new Map([
    [1, obj({ next: REF_V(2) })],
    [2, obj({ value: INT_V(42) })]
  ]);
  const reachable = reachableAddresses([REF_V(1)], store, []);
  assertSetEquals('object reachable only via a field of another object', reachable, [1, 2]);
}

// 2. A frame that has since returned contributes no roots: its object is garbage.
{
  const store = new Map([[1, obj({ value: INT_V(0) })]]);
  // The (popped) frame that once held REF_V(1) is simply absent from env/kont.
  const reachable = reachableAddresses([], store, []);
  assertSetEquals('object referenced only by a returned frame is unreachable', reachable, []);
}

// 2b. A value pinned only in a pending continuation (kont) is still a root.
{
  const store = new Map([[1, obj({ value: INT_V(7) })]]);
  const reachable = reachableAddresses([], store, [REF_V(1)]);
  assertSetEquals('object referenced only by a pending continuation is reachable', reachable, [1]);
}

// 3. Cyclic reference, unreachable from roots: must still be treated as garbage.
{
  const store = new Map([
    [1, obj({ partner: REF_V(2) }, 'A')],
    [2, obj({ partner: REF_V(1) }, 'B')]
  ]);
  const reachable = reachableAddresses([], store, []);
  assertSetEquals('unreachable A<->B cycle collects nothing', reachable, []);
}

// 3b. Cyclic reference reachable from roots: must terminate and collect both
// (this is the case that actually exercises the visited-set cycle guard —
// 3. above never even enters the traversal loop since no root points in).
{
  const store = new Map([
    [1, obj({ partner: REF_V(2) }, 'A')],
    [2, obj({ partner: REF_V(1) }, 'B')]
  ]);
  const reachable = reachableAddresses([REF_V(1)], store, []);
  assertSetEquals('reachable A<->B cycle terminates and collects both', reachable, [1, 2]);
}

// 4. Traversal into array elements, and store is never mutated.
{
  const store = new Map([
    [1, arr([REF_V(2), INT_V(0)])],
    [2, obj({ value: INT_V(9) })]
  ]);
  const before = new Map(store);
  const reachable = reachableAddresses([REF_V(1)], store, []);
  assertSetEquals('object reachable only via an array element', reachable, [1, 2]);
  const unmutated = store.size === before.size && [...store.keys()].every((k) => before.has(k));
  if (!unmutated) fail('store is not mutated by reachableAddresses', 'store contents changed');
  else {
    passed += 1;
    console.log('ok    store is not mutated by reachableAddresses');
  }
}

// 5. Empty roots close over nothing, even with a non-empty store.
{
  const store = new Map([[1, obj({ value: INT_V(1) })]]);
  const reachable = reachableAddresses([], store, []);
  assertSetEquals('empty env/kont roots reach nothing', reachable, []);
}

// --- markPhase: the same traversal, driven one .next() call at a time ---

// 6. One event per .next() call, in field-chain visitation order, each
// carrying the address just marked and where it was reached from.
{
  const store = new Map([
    [1, obj({ next: REF_V(2) })],
    [2, obj({ value: INT_V(42) })]
  ]);
  const it = markPhase([REF_V(1)], store, []);
  const r1 = it.next();
  assertEvent('markPhase: first .next() marks the env root', r1, {
    done: false,
    value: { address: 1, from: { tag: 'root', origin: 'env' } }
  });
  const r2 = it.next();
  assertEvent('markPhase: second .next() marks via the field that pointed to it', r2, {
    done: false,
    value: { address: 2, from: { tag: 'address', from: 1 } }
  });
  const r3 = it.next();
  assertEvent('markPhase: third .next() reports done with no more objects', r3, { done: true, value: undefined });
}

// 6b. A kont-pinned root reports its origin as 'kont', not 'env'.
{
  const store = new Map([[1, obj({ value: INT_V(7) })]]);
  const it = markPhase([], store, [REF_V(1)]);
  const r1 = it.next();
  assertEvent('markPhase: kont-pinned root reports origin kont', r1, {
    done: false,
    value: { address: 1, from: { tag: 'root', origin: 'kont' } }
  });
}

// 7. Draining markPhase fully agrees with the batch reachableAddresses,
// including on a heap with an unreachable A<->B cycle sitting alongside it.
{
  const store = new Map([
    [1, obj({ next: REF_V(2) })],
    [2, obj({ value: INT_V(1) })],
    [3, obj({ partner: REF_V(4) }, 'A')],
    [4, obj({ partner: REF_V(3) }, 'B')]
  ]);
  const viaBatch = reachableAddresses([REF_V(1)], store, []);
  const viaGenerator = new Set([...markPhase([REF_V(1)], store, [])].map((event) => event.address));
  assertSetEquals('markPhase drained matches reachableAddresses (batch)', viaGenerator, [...viaBatch]);
}

// 8. A reachable A<->B cycle, driven step by step: exactly two marks, then
// done — proves the generator terminates under stepwise `.next()` calls
// and doesn't just happen to terminate when drained all at once.
{
  const store = new Map([
    [1, obj({ partner: REF_V(2) }, 'A')],
    [2, obj({ partner: REF_V(1) }, 'B')]
  ]);
  const it = markPhase([REF_V(1)], store, []);
  const seen = [];
  let r = it.next();
  while (!r.done) {
    seen.push(r.value.address);
    r = it.next();
  }
  assertSetEquals('markPhase: reachable A<->B cycle marks exactly twice then stops', new Set(seen), [1, 2]);
}

const total = 14;
console.log(`\n${passed}/${total} reachability cases passed${failures ? `, ${failures} FAILED` : ''}`);
process.exit(failures ? 1 : 0);
