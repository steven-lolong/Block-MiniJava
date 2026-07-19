#!/usr/bin/env node
/**
 * GC tests for the heap-reference MiniJava fork.
 *
 * Two layers:
 *  (a)/(b) Pure sweep/runGC unit tests on hand-built store fixtures —
 *          reachable objects survive unchanged, unreachable ones are gone.
 *  (c)     Semantic transparency on two representative real programs (one
 *          aliasing + loop-generated garbage, one field-chain reachability
 *          + a rebound local): the observable result (status/output/step
 *          count) is identical whether GC runs between every eval step or
 *          never runs at all, even though the heap's contents differ.
 *
 * Run with: npm run test:gc
 */

const { runGC, sweep, REF_V, INT_V, runWithGCEveryStep, runWithoutGC } = require('./dist/gc.bundle.js');

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

function assertTrue(name, condition, detail) {
  if (!condition) {
    fail(name, detail || 'expected condition to hold');
    return;
  }
  ok(name);
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

function obj(fields, className = 'C') {
  return { tag: 'Obj', className, fields: new Map(Object.entries(fields)), blockId: 'b' };
}

// --- (a)/(b): pure sweep / runGC unit tests -------------------------------

// (a) sweep restricts the store's domain to exactly the reachable set, and
// a surviving entry is the SAME HeapObj reference — untouched, not cloned.
{
  const survivor = obj({ value: INT_V(1) });
  const store = new Map([
    [1, survivor],
    [2, obj({ value: INT_V(2) })]
  ]);
  const swept = sweep(store, new Set([1]));
  assertSetEquals('sweep restricts the domain to the reachable set', [...swept.keys()], [1]);
  assertTrue(
    'sweep keeps a surviving object as the same reference (unchanged)',
    swept.get(1) === survivor,
    'surviving entry is a different object than the original'
  );
}

// (b) runGC (mark via the Step 3 generator, then sweep) removes everything
// not reachable from env/kont roots, including an unreachable A<->B cycle.
{
  const store = new Map([
    [1, obj({ next: REF_V(2) })],
    [2, obj({ value: INT_V(9) })],
    [3, obj({ partner: REF_V(4) }, 'A')],
    [4, obj({ partner: REF_V(3) }, 'B')]
  ]);
  const swept = runGC([REF_V(1)], store, []);
  assertSetEquals('runGC removes unreachable objects, including an unreachable cycle', [...swept.keys()], [1, 2]);
}

// --- (c): semantic transparency on real programs --------------------------

function assertObservablyEqual(name, withGC, withoutGC) {
  const equal =
    withGC.status === withoutGC.status &&
    withGC.error === withoutGC.error &&
    withGC.steps === withoutGC.steps &&
    JSON.stringify(withGC.output) === JSON.stringify(withoutGC.output);
  assertTrue(
    name,
    equal,
    `withGC=${JSON.stringify(withGC)}\n      withoutGC=${JSON.stringify(withoutGC)}`
  );
}

// Program A: an aliased Cell, mutated through both names, with 5 garbage
// Cells generated (and dropped) by a loop that rebinds a local in between.
const ALIAS_PROGRAM = [
  'class Main {',
  '  public static void main(String[] args) {',
  '    System.out.println(new AliasDriver().run());',
  '  }',
  '}',
  'class AliasDriver {',
  '  public int run() {',
  '    Cell a;',
  '    Cell b;',
  '    Cell junk;',
  '    int i;',
  '    int scratch;',
  '    a = new Cell();',
  '    b = a;',
  '    i = 0;',
  '    while (i < 5) {',
  '      junk = new Cell();',
  '      i = i + 1;',
  '    }',
  '    scratch = a.set(1);',
  '    scratch = b.set(41);',
  '    return a.get();',
  '  }',
  '}',
  'class Cell {',
  '  int f;',
  '  public int set(int v) {',
  '    f = v;',
  '    return 0;',
  '  }',
  '  public int get() {',
  '    return f;',
  '  }',
  '}'
].join('\n');

{
  const withGC = runWithGCEveryStep(ALIAS_PROGRAM);
  const withoutGC = runWithoutGC(ALIAS_PROGRAM);

  assertObservablyEqual('aliasing + loop garbage: GC on vs off give an identical result', withGC, withoutGC);
  assertTrue(
    'aliasing + loop garbage: write-through-alias wins (prints 41)',
    JSON.stringify(withGC.output) === JSON.stringify(['41']),
    `got ${JSON.stringify(withGC.output)}`
  );
  assertTrue(
    'aliasing + loop garbage: GC actually shrinks the final heap vs. no GC',
    withGC.finalHeapSize < withoutGC.finalHeapSize,
    `withGC=${withGC.finalHeapSize} withoutGC=${withoutGC.finalHeapSize}`
  );
}

// Program B: a Cell is stashed behind a Wrapper field, then the local that
// used to point at it is rebound — the Cell is now reachable ONLY through
// the field chain. Once run() returns, nothing in Main references any
// object, so the WHOLE graph (driver, wrapper, both cells, loop junk)
// becomes garbage.
const CHAIN_PROGRAM = [
  'class Main {',
  '  public static void main(String[] args) {',
  '    System.out.println(new ChainDriver().run());',
  '  }',
  '}',
  'class ChainDriver {',
  '  public int run() {',
  '    Cell junk;',
  '    Cell inner;',
  '    Wrapper w;',
  '    int i;',
  '    int scratch;',
  '    i = 0;',
  '    while (i < 4) {',
  '      junk = new Cell();',
  '      i = i + 1;',
  '    }',
  '    inner = new Cell();',
  '    scratch = inner.set(7);',
  '    w = new Wrapper();',
  '    scratch = w.setInner(inner);',
  '    inner = new Cell();',
  '    scratch = inner.set(999);',
  '    return w.getInner();',
  '  }',
  '}',
  'class Cell {',
  '  int f;',
  '  public int set(int v) {',
  '    f = v;',
  '    return 0;',
  '  }',
  '  public int get() {',
  '    return f;',
  '  }',
  '}',
  'class Wrapper {',
  '  Cell c;',
  '  public int setInner(Cell x) {',
  '    c = x;',
  '    return 0;',
  '  }',
  '  public int getInner() {',
  '    return c.get();',
  '  }',
  '}'
].join('\n');

{
  const withGC = runWithGCEveryStep(CHAIN_PROGRAM);
  const withoutGC = runWithoutGC(CHAIN_PROGRAM);

  assertObservablyEqual('field-chain + rebind: GC on vs off give an identical result', withGC, withoutGC);
  assertTrue(
    'field-chain + rebind: the field-chained Cell survives the rebind (prints 7)',
    JSON.stringify(withGC.output) === JSON.stringify(['7']),
    `got ${JSON.stringify(withGC.output)}`
  );
  assertTrue(
    'field-chain + rebind: aggressive GC empties the heap once everything has returned',
    withGC.finalHeapSize === 0,
    `withGC finalHeapSize=${withGC.finalHeapSize}`
  );
  assertTrue(
    'field-chain + rebind: the no-GC baseline actually retains the garbage',
    withoutGC.finalHeapSize > 0,
    `withoutGC finalHeapSize=${withoutGC.finalHeapSize}`
  );
}

// GC test: a growable ArrayList whose `Grow` doubles capacity by allocating
// a fresh int[] and copying elements across, dropping the old array. Unlike
// Program A/B (object graphs), this exercises `Arr` heap objects specifically
// — the old int[3] becomes garbage the instant `data = newData` runs, and
// running GC after every step (see `runWithGCEveryStep`) forces that exact
// moment to be collected without disturbing the copy still in progress.
const ARRAY_PROGRAM = [
  'class DynamicArrayDemo {',
  '  public static void main(String[] a) {',
  '    System.out.println(new TestApp().Run());',
  '  }',
  '}',
  'class TestApp {',
  '  public int Run() {',
  '    ArrayList list;',
  '    int aux;',
  '    int i;',
  '    list = new ArrayList();',
  '    aux = list.Init(3);',
  '    aux = list.Add(10);',
  '    aux = list.Add(20);',
  '    aux = list.Add(30);',
  '    aux = list.Add(40);',
  '    aux = list.Add(50);',
  '    aux = list.Add(60);',
  '    i = 0;',
  '    while (i < list.Size()) {',
  '      System.out.println(list.Get(i));',
  '      i = i + 1;',
  '    }',
  '    return 0;',
  '  }',
  '}',
  'class ArrayList {',
  '  int[] data;',
  '  int count;',
  '  int capacity;',
  '  public int Init(int initialCapacity) {',
  '    capacity = initialCapacity;',
  '    data = new int[capacity];',
  '    count = 0;',
  '    return 0;',
  '  }',
  '  public int Add(int value) {',
  '    int aux;',
  '    if (capacity < (count + 1)) {',
  '      aux = this.Grow();',
  '    } else {',
  '      aux = 0;',
  '    }',
  '    data[count] = value;',
  '    count = count + 1;',
  '    return 1;',
  '  }',
  '  public int Grow() {',
  '    int[] newData;',
  '    int i;',
  '    capacity = capacity * 2;',
  '    newData = new int[capacity];',
  '    i = 0;',
  '    while (i < count) {',
  '      newData[i] = data[i];',
  '      i = i + 1;',
  '    }',
  '    data = newData;',
  '    return 0;',
  '  }',
  '  public int Get(int index) {',
  '    int val;',
  '    if (index < 0) {',
  '      System.out.println(9999);',
  '      val = 0 - 1;',
  '    } else {',
  '      if (count < (index + 1)) {',
  '        System.out.println(9999);',
  '        val = 0 - 1;',
  '      } else {',
  '        val = data[index];',
  '      }',
  '    }',
  '    return val;',
  '  }',
  '  public int Size() {',
  '    return count;',
  '  }',
  '}'
].join('\n');

{
  const withGC = runWithGCEveryStep(ARRAY_PROGRAM);
  const withoutGC = runWithoutGC(ARRAY_PROGRAM);

  assertObservablyEqual('array resize (GC test): GC on vs off give an identical result', withGC, withoutGC);
  assertTrue(
    'array resize (GC test): all six elements survive the resize, in order (10..60), then the return value',
    JSON.stringify(withGC.output) === JSON.stringify(['10', '20', '30', '40', '50', '60', '0']),
    `got ${JSON.stringify(withGC.output)}`
  );
  assertTrue(
    'array resize (GC test): aggressive GC empties the heap once everything has returned',
    withGC.finalHeapSize === 0,
    `withGC finalHeapSize=${withGC.finalHeapSize}`
  );
  assertTrue(
    'array resize (GC test): the no-GC baseline actually retains the garbage (old array + both objects)',
    withoutGC.finalHeapSize > 0,
    `withoutGC finalHeapSize=${withoutGC.finalHeapSize}`
  );
}

const total = 14;
console.log(`\n${passed}/${total} GC cases passed${failures ? `, ${failures} FAILED` : ''}`);
process.exit(failures ? 1 : 0);
