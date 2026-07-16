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
const MODEL_CASES = [
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
