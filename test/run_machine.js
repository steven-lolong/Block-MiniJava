#!/usr/bin/env node
/**
 * Model A machine tests.
 *
 * Each case runs a MiniJava program on the small-step machine (text ->
 * blocks -> initial state -> step*) and asserts on the run report:
 * printed output, final status, error fragments, rules exercised,
 * maximum stack depth, and final heap size.
 *
 * Run with: npm run test:machine
 */

const { runSource, runSourceWithEmptiedInput } = require('./dist/machine.bundle.js');

function inMain(statements) {
  const body = statements
    .split('\n')
    .map((line) => `    ${line}`)
    .join('\n');
  return `class Main {\n  public static void main(String[] args) {\n${body}\n  }\n}`;
}

/**
 * Cases: [name, source, expectations]
 * expectations: { output, status='done', errorIncludes, rulesInclude,
 *                 rulesExclude, maxStackDepth, heapSize }
 */
const CASES = [
  ['print literal', inMain('System.out.println(42);'), { output: ['42'] }],
  ['arithmetic precedence', inMain('System.out.println(1 + 2 * 3 - 4);'), { output: ['3'] }],
  ['division truncates toward zero', inMain('System.out.println(7 / 2);\nSystem.out.println((0 - 7) / 2);'), { output: ['3', '-3'], rulesInclude: ['div'] }],
  [
    'relational operators',
    inMain('if (1 <= 1) {\n  System.out.println(1);\n} else {\n  System.out.println(0);\n}\nif (2 > 3) {\n  System.out.println(1);\n} else {\n  System.out.println(0);\n}\nif (2 >= 2) {\n  System.out.println(1);\n} else {\n  System.out.println(0);\n}'),
    { output: ['1', '0', '1'], rulesInclude: ['leq', 'gt', 'geq'] }
  ],
  [
    'or short-circuits past a division by zero',
    inMain('if (true || 1 / 0 < 1) {\n  System.out.println(1);\n} else {\n  System.out.println(0);\n}'),
    { output: ['1'], rulesInclude: ['or-short-circuit'], rulesExclude: ['div', 'or'] }
  ],
  [
    'or evaluates the right operand when needed',
    inMain('if (false || 1 < 2) {\n  System.out.println(1);\n} else {\n  System.out.println(0);\n}'),
    { output: ['1'], rulesInclude: ['or', 'less'] }
  ],
  [
    'division by zero is a stuck state',
    inMain('System.out.println(1 / 0);'),
    { status: 'error', errorIncludes: 'division by zero', output: [] }
  ],
  [
    'two statements in order',
    inMain('System.out.println(1);\nSystem.out.println(2);'),
    { output: ['1', '2'] }
  ],
  [
    'if else both ways',
    inMain('if (1 < 2) {\n  System.out.println(1);\n} else {\n  System.out.println(2);\n}\nif (2 < 1) {\n  System.out.println(3);\n} else {\n  System.out.println(4);\n}'),
    { output: ['1', '4'], rulesInclude: ['if-true', 'if-false'] }
  ],
  [
    'while sum',
    [
      inMain('System.out.println(new C().sum(5));'),
      'class C {',
      '  public int sum(int n) {',
      '    int i;',
      '    int total;',
      '    i = 0;',
      '    total = 0;',
      '    while (i < n) {',
      '      total = total + i;',
      '      i = i + 1;',
      '    }',
      '    return total;',
      '  }',
      '}'
    ].join('\n'),
    { output: ['10'], rulesInclude: ['while-enter', 'while-exit', 'loop'] }
  ],
  [
    'factorial recursion',
    [
      inMain('System.out.println(new Fac().ComputeFac(10));'),
      'class Fac {',
      '  public int ComputeFac(int num) {',
      '    int num_aux;',
      '    if (num < 1)',
      '      num_aux = 1;',
      '    else',
      '      num_aux = num * (this.ComputeFac(num - 1));',
      '    return num_aux;',
      '  }',
      '}'
    ].join('\n'),
    // main + ComputeFac(10..0) = 1 + 11 frames deep at the recursion bottom.
    { output: ['3628800'], maxStackDepth: 12, rulesInclude: ['call', 'return'] }
  ],
  [
    'aliasing: mutation through one ref is visible through the other',
    [
      inMain('System.out.println(new P().go());'),
      'class P {',
      '  public int go() {',
      '    Cell x;',
      '    Cell y;',
      '    int ignore;',
      '    x = new Cell();',
      '    y = x;',
      '    ignore = y.set(41);',
      '    return x.get() + 1;',
      '  }',
      '}',
      'class Cell {',
      '  int f;',
      '  public int set(int v) {',
      '    f = v;',
      '    return 0;',
      '  }',
      '  public int get() { return f; }',
      '}'
    ].join('\n'),
    // Exactly two heap boxes: the P object and ONE shared Cell.
    { output: ['42'], heapSize: 2, rulesInclude: ['field-write', 'field-read'] }
  ],
  [
    'dynamic dispatch through a base-typed parameter',
    [
      inMain('System.out.println(new T().probe(new D()));'),
      'class T {',
      '  public int probe(Base b) {',
      '    return b.id();',
      '  }',
      '}',
      'class Base { public int id() { return 1; } }',
      'class D extends Base { public int id() { return 2; } }'
    ].join('\n'),
    { output: ['2'] }
  ],
  [
    'inherited field written by subclass method',
    [
      inMain('System.out.println(new D().bump());'),
      'class Base { int v; }',
      'class D extends Base {',
      '  public int bump() {',
      '    v = v + 7;',
      '    return v;',
      '  }',
      '}'
    ].join('\n'),
    { output: ['7'] }
  ],
  [
    'arrays: new, write, read, length',
    [
      inMain('System.out.println(new A().go());'),
      'class A {',
      '  public int go() {',
      '    int[] a;',
      '    a = new int[3];',
      '    a[0] = 5;',
      '    a[1] = a[0] + 2;',
      '    return a[0] * 10 + a[1] + a.length;',
      '  }',
      '}'
    ].join('\n'),
    { output: ['60'], rulesInclude: ['new-array', 'array-write', 'array-read', 'array-length'] }
  ],
  [
    'short-circuit && skips the crashing right side',
    [
      inMain('System.out.println(new S().go());'),
      'class S {',
      '  int[] a;',
      '  public int go() {',
      '    int r;',
      '    a = new int[1];',
      '    if (1 < 1 && a[99] < 1) {',
      '      r = 1;',
      '    } else {',
      '      r = 2;',
      '    }',
      '    return r;',
      '  }',
      '}'
    ].join('\n'),
    { output: ['2'], rulesInclude: ['and-short-circuit'], rulesExclude: ['array-read'] }
  ],
  [
    'locals default to zero values',
    [
      inMain('System.out.println(new Z().go());'),
      'class Z {',
      '  public int go() {',
      '    int x;',
      '    return x;',
      '  }',
      '}'
    ].join('\n'),
    { output: ['0'] }
  ],
  [
    'array index out of bounds is a stuck state',
    [
      inMain('System.out.println(new B().go());'),
      'class B {',
      '  public int go() {',
      '    int[] a;',
      '    a = new int[2];',
      '    return a[5];',
      '  }',
      '}'
    ].join('\n'),
    { status: 'error', errorIncludes: 'out of bounds', output: [] }
  ],
  [
    'null dereference is a stuck state',
    [
      inMain('System.out.println(new N().go());'),
      'class N {',
      '  public int go() {',
      '    Cell c;',
      '    return c.get();',
      '  }',
      '}',
      'class Cell { public int get() { return 0; } }'
    ].join('\n'),
    { status: 'error', errorIncludes: 'null dereference', output: [] }
  ],
  // -- strings -----------------------------------------------------------------
  ['print string literal', inMain('System.out.println("hello");'), { output: ['hello'] }],
  [
    'charAt and concat',
    inMain('System.out.println("mini".concat("java").charAt(4));'),
    { output: ['j'], rulesInclude: ['concat', 'char-at'] }
  ],
  [
    'string fields, params and locals through a method',
    [
      inMain('System.out.println(new Greeter().greet("world"));'),
      'class Greeter {',
      '  String prefix;',
      '',
      '  public String greet(String who) {',
      '    String message;',
      '    prefix = "hello ";',
      '    message = prefix.concat(who);',
      '    return message;',
      '  }',
      '}'
    ].join('\n'),
    { output: ['hello world'], rulesInclude: ['concat', 'field-write', 'field-read'] }
  ],
  [
    'string escapes survive to output',
    inMain('System.out.println("a\\"b");'),
    { output: ['a"b'] }
  ],
  [
    'string length',
    inMain('System.out.println("mini".concat("java").length());'),
    { output: ['8'], rulesInclude: ['concat', 'str-length'] }
  ],
  [
    'string length drives a while loop',
    [
      inMain('System.out.println(new W().reps("abc"));'),
      'class W {',
      '  public String reps(String s) {',
      '    int i;',
      '    String out;',
      '    i = 0;',
      '    out = "";',
      '    while (i < s.length()) {',
      '      out = out.concat(s.charAt(i)).concat(s.charAt(i));',
      '      i = i + 1;',
      '    }',
      '    return out;',
      '  }',
      '}'
    ].join('\n'),
    { output: ['aabbcc'], rulesInclude: ['str-length', 'char-at', 'concat', 'while-enter', 'while-exit'] }
  ],
  [
    'length of an int is a stuck state',
    inMain('System.out.println((1).length());'),
    { status: 'error', errorIncludes: "'.length()' expects a String", output: [] }
  ],
  [
    'charAt out of bounds is a stuck state',
    inMain('System.out.println("ab".charAt(2));'),
    { status: 'error', errorIncludes: 'string index 2 out of bounds for length 2', output: [] }
  ],
  [
    'concat of an int is a stuck state',
    inMain('System.out.println("ab".concat(1));'),
    { status: 'error', errorIncludes: "'concat' expects Strings", output: [] }
  ],
  [
    'charAt of an int is a stuck state',
    inMain('System.out.println((1).charAt(0));'),
    { status: 'error', errorIncludes: "'charAt' expects a String", output: [] }
  ],
  [
    'this in main is a stuck state',
    inMain('System.out.println(this);'),
    { status: 'error', errorIncludes: "'this' cannot be used inside main", output: [] }
  ],
  [
    'undeclared variable is a stuck state',
    inMain('x = 1;'),
    { status: 'error', errorIncludes: "Variable 'x' is not declared", output: [] }
  ]
];

/** The §8 contrast program: rebind through a mutate-and-return-this method.
 * Model A: x and y alias one heap object -> 41*100+41 = 4141.
 * Model B: with() updates its own copy; y rebinds, x untouched -> 0*100+41 = 41. */
const WITH_PROGRAM = [
  inMain('System.out.println(new P().go());'),
  'class P {',
  '  public int go() {',
  '    Cell x;',
  '    Cell y;',
  '    x = new Cell();',
  '    y = x;',
  '    y = y.with(41);',
  '    return x.get() * 100 + y.get();',
  '  }',
  '}',
  'class Cell {',
  '  int f;',
  '  public Cell with(int v) {',
  '    f = v;',
  '    return this;',
  '  }',
  '  public int get() { return f; }',
  '}'
].join('\n');

/** Array passed to a method and written inside.
 * Model A: the caller's array is mutated -> 9. Model B: only the callee's copy -> 0. */
const POKE_PROGRAM = [
  inMain('System.out.println(new C().go());'),
  'class C {',
  '  public int poke(int[] a) {',
  '    a[0] = 9;',
  '    return a[0];',
  '  }',
  '  public int go() {',
  '    int[] a;',
  '    int ignore;',
  '    a = new int[2];',
  '    ignore = this.poke(a);',
  '    return a[0];',
  '  }',
  '}'
].join('\n');

/** [name, source, model, expectations] */
/** The Binary Search example: init writes fields through `this`, then searches. */
const BINARY_SEARCH = [
  inMain('System.out.println(new BS().Start(20));'),
  'class BS {',
  '  int[] number;',
  '  int size;',
  '',
  '  public int Start(int sz) {',
  '    int aux;',
  '    int searchResult;',
  '    aux = this.Init(sz);',
  '    searchResult = this.Search(8);',
  '    System.out.println(searchResult);',
  '    searchResult = this.Search(19);',
  '    System.out.println(searchResult);',
  '    return 0;',
  '  }',
  '',
  '  public int Search(int num) {',
  '    int l;',
  '    int h;',
  '    int mid;',
  '    int found;',
  '    int var_test;',
  '    boolean keep_looking;',
  '    l = 0;',
  '    h = size - 1;',
  '    found = 0;',
  '    keep_looking = true;',
  '    while (keep_looking) {',
  '      if (h < l) {',
  '        keep_looking = false;',
  '      } else {',
  '        mid = (l + h) / 2;',
  '        var_test = number[mid];',
  '        if (num < var_test) {',
  '          h = mid - 1;',
  '        } else {',
  '          if (var_test < num) {',
  '            l = mid + 1;',
  '          } else {',
  '            found = 1;',
  '            keep_looking = false;',
  '          }',
  '        }',
  '      }',
  '    }',
  '    return found;',
  '  }',
  '',
  '  public int Init(int sz) {',
  '    int i;',
  '    size = sz;',
  '    number = new int[sz];',
  '    i = 0;',
  '    while (i < size) {',
  '      number[i] = i * 2;',
  '      i = i + 1;',
  '    }',
  '    return 0;',
  '  }',
  '}'
].join('\n');

/** The Shapes example: inheritance, an override, and dynamic dispatch. */
const SHAPES = [
  inMain('System.out.println(new Setup().Run());'),
  'class Setup {',
  '  public int Run() {',
  '    Shape s1;',
  '    Shape s2;',
  '    Rectangle r;',
  '    int aux;',
  '    s1 = new Shape();',
  '    s2 = new Rectangle();',
  '    r = new Rectangle();',
  '    aux = s1.Init(5, 10);',
  '    System.out.println(s1.GetArea());',
  '    aux = s2.Init(5, 10);',
  '    System.out.println(s2.GetArea());',
  '    aux = r.Init(10, 20);',
  '    aux = r.SetBorder(2);',
  '    System.out.println(r.GetAreaWithBorder());',
  '    return 0;',
  '  }',
  '}',
  'class Shape {',
  '  int width;',
  '  int height;',
  '',
  '  public int Init(int w, int h) {',
  '    width = w;',
  '    height = h;',
  '    return 0;',
  '  }',
  '  public int GetArea() {',
  '    return 0;',
  '  }',
  '}',
  'class Rectangle extends Shape {',
  '  int borderWidth;',
  '',
  '  public int GetArea() {',
  '    return width * height;',
  '  }',
  '  public int SetBorder(int b) {',
  '    borderWidth = b;',
  '    return 0;',
  '  }',
  '  public int GetAreaWithBorder() {',
  '    int totalWidth;',
  '    int totalHeight;',
  '    totalWidth = width + (borderWidth * 2);',
  '    totalHeight = height + (borderWidth * 2);',
  '    return totalWidth * totalHeight;',
  '  }',
  '}'
].join('\n');

const MODEL_CASES = [
  [
    // The dispatch proof: s1 is a real Shape (GetArea -> 0), s2 is a Rectangle
    // held in a Shape variable, so lookup starts at the RECEIVER's class and
    // finds the override (5 * 10 = 50). Then the bordered area of the 10x20
    // rectangle with border 2: (10+4) * (20+4) = 336. Run itself returns 0.
    'shapes under Model A: dynamic dispatch reaches the override',
    SHAPES,
    'A',
    { output: ['0', '50', '336', '0'], rulesInclude: ['field-write', 'field-read', 'call', 'return'] }
  ],
  [
    // Model B: the same call-by-structure contrast as binary search — every
    // Init/SetBorder writes only its own copy of `this`, so width/height/
    // borderWidth stay 0 for the caller and every area is 0.
    'shapes under Model B: the init writes stay in the callee',
    SHAPES,
    'B',
    { output: ['0', '0', '0', '0'], heapSize: 0, rulesExclude: ['field-write'] }
  ],
  [
    // Model A: Init's field writes mutate the shared heap object, so Start's
    // search runs against the initialized array — 8 is found, 19 is not.
    'binary search under Model A: the init writes reach the caller',
    BINARY_SEARCH,
    'A',
    { output: ['1', '0', '0'], rulesInclude: ['div', 'field-write', 'field-read', 'array-read'] }
  ],
  [
    // Model B: `this` is bound by structure, so Init functionally updates its
    // OWN copy and the caller never sees the array — size stays 0, h = -1 < l,
    // every search reports not-found. The mutate-through-this init idiom does
    // not survive call-by-structure; that contrast is the point of the tab.
    'binary search under Model B: the init writes stay in Init',
    BINARY_SEARCH,
    'B',
    { output: ['0', '0', '0'], heapSize: 0, rulesExclude: ['field-write'] }
  ],
  [
    'strings behave identically under Model B',
    inMain('System.out.println("mini".concat("java").charAt(4));'),
    'B',
    { output: ['j'], heapSize: 0, rulesInclude: ['concat', 'char-at'] }
  ],
  ['contrast program under Model A: aliases observe the write', WITH_PROGRAM, 'A', { output: ['4141'], rulesInclude: ['field-write'] }],
  [
    'contrast program under Model B: rebind changes y, x stays put',
    WITH_PROGRAM,
    'B',
    { output: ['41'], heapSize: 0, rulesInclude: ['field-update'], rulesExclude: ['field-write'] }
  ],
  ['array argument under Model A: callee write reaches the caller', POKE_PROGRAM, 'A', { output: ['9'] }],
  [
    'array argument under Model B: callee writes only its copy',
    POKE_PROGRAM,
    'B',
    { output: ['0'], heapSize: 0, rulesInclude: ['array-update'], rulesExclude: ['array-write'] }
  ],
  [
    'method mutation is invisible to the caller under Model B',
    [
      inMain('System.out.println(new P().go());'),
      'class P {',
      '  public int go() {',
      '    Cell x;',
      '    Cell y;',
      '    int ignore;',
      '    x = new Cell();',
      '    y = x;',
      '    ignore = y.set(41);',
      '    return x.get() + y.get() + 1;',
      '  }',
      '}',
      'class Cell {',
      '  int f;',
      '  public int set(int v) {',
      '    f = v;',
      '    return 0;',
      '  }',
      '  public int get() { return f; }',
      '}'
    ].join('\n'),
    'B',
    { output: ['1'], heapSize: 0 }
  ],
  [
    'local array writes stay visible through the same variable under Model B',
    [
      inMain('System.out.println(new A().go());'),
      'class A {',
      '  public int go() {',
      '    int[] a;',
      '    a = new int[3];',
      '    a[0] = 5;',
      '    a[1] = a[0] + 2;',
      '    return a[0] * 10 + a[1] + a.length;',
      '  }',
      '}'
    ].join('\n'),
    'B',
    { output: ['60'], heapSize: 0 }
  ],
  ['pure programs agree: factorial under Model B', [
    inMain('System.out.println(new Fac().ComputeFac(10));'),
    'class Fac {',
    '  public int ComputeFac(int num) {',
    '    int num_aux;',
    '    if (num < 1)',
    '      num_aux = 1;',
    '    else',
    '      num_aux = num * (this.ComputeFac(num - 1));',
    '    return num_aux;',
    '  }',
    '}'
  ].join('\n'), 'B', { output: ['3628800'], heapSize: 0, maxStackDepth: 12 }]
];

let failures = 0;
let passed = 0;

function fail(name, message, detail) {
  failures++;
  console.log(`\nFAIL  ${name}: ${message}`);
  if (detail) console.log(detail.split('\n').map((line) => `      ${line}`).join('\n'));
}

function describe(report) {
  return [
    `status: ${report.status}${report.error ? ` (${report.error})` : ''}`,
    `output: [${report.output.join(', ')}]`,
    `steps: ${report.steps}, maxStackDepth: ${report.maxStackDepth}, heapSize: ${report.heapSize}`,
    `rules: ${report.rules.sort().join(' ')}`
  ].join('\n');
}

function checkReport(report, expect) {
  const status = expect.status ?? 'done';
  if (report.status !== status) return `expected status '${status}', got '${report.status}'`;
  if (expect.errorIncludes && !(report.error ?? '').includes(expect.errorIncludes)) {
    return `expected error containing "${expect.errorIncludes}"`;
  }
  if (expect.output && JSON.stringify(report.output) !== JSON.stringify(expect.output)) {
    return `expected output [${expect.output.join(', ')}]`;
  }
  for (const rule of expect.rulesInclude ?? []) {
    if (!report.rules.includes(rule)) return `expected rule '${rule}' to fire`;
  }
  for (const rule of expect.rulesExclude ?? []) {
    if (report.rules.includes(rule)) return `expected rule '${rule}' NOT to fire`;
  }
  if (expect.maxStackDepth !== undefined && report.maxStackDepth !== expect.maxStackDepth) {
    return `expected maxStackDepth ${expect.maxStackDepth}, got ${report.maxStackDepth}`;
  }
  if (expect.heapSize !== undefined && report.heapSize !== expect.heapSize) {
    return `expected heapSize ${expect.heapSize}, got ${report.heapSize}`;
  }
  return null;
}

function runCase(name, expect, produce) {
  try {
    const report = produce();
    const problem = checkReport(report, expect);
    if (problem) {
      fail(name, problem, `--- actual ---\n${describe(report)}`);
      return;
    }
    passed++;
    console.log(`ok    ${name}`);
  } catch (error) {
    fail(name, error && error.message ? error.message : String(error));
  }
}

for (const [name, source, expect] of CASES) {
  runCase(name, expect, () => runSource(source));
}

console.log('\nModel A vs Model B:');
for (const [name, source, model, expect] of MODEL_CASES) {
  runCase(name, expect, () => runSource(source, undefined, model));
}

// Incomplete programs get stuck politely instead of crashing the machine.
runCase(
  'empty println socket is a stuck state',
  { status: 'error', errorIncludes: 'Incomplete program', output: [] },
  () => runSourceWithEmptiedInput(inMain('System.out.println(42);'), 'mj_statement_print', 'VALUE')
);

const total = CASES.length + MODEL_CASES.length + 1;
console.log(`\n${passed}/${total} machine cases passed${failures ? `, ${failures} FAILED` : ''}`);
process.exit(failures ? 1 : 0);
