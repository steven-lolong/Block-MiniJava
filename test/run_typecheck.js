#!/usr/bin/env node
/**
 * Type-checker tests.
 *
 * Each case type-checks a MiniJava program (text -> blocks -> diagnostics)
 * and asserts the exact diagnostic set: every expectation must match a
 * distinct diagnostic (severity + message substring) and no unexpected
 * diagnostics may remain. Well-typed programs expect an empty set.
 *
 * Run with: npm run test:typecheck
 */

const { checkSource, checkSourceWithoutTypeOn } = require('./dist/typecheck.bundle.js');

/** Wrap statements in the mandatory main class. */
function inMain(statements) {
  const body = statements
    .split('\n')
    .map((line) => `    ${line}`)
    .join('\n');
  return `class Main {\n  public static void main(String[] args) {\n${body}\n  }\n}`;
}

const err = (fragment) => ({ severity: 'error', fragment });
const warn = (fragment) => ({ severity: 'warning', fragment });

/** [name, source, expected diagnostics] */
const CASES = [
  // -- well-typed programs -----------------------------------------------------
  ['default program', inMain('System.out.println(0);'), []],
  [
    'factorial',
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
    []
  ],
  [
    'fields, params and locals of every type',
    [
      inMain('System.out.println(new Mixed().touch(3, true));'),
      'class Mixed {',
      '  int count;',
      '  boolean live;',
      '  int[] data;',
      '  Mixed next;',
      '',
      '  public int touch(int delta, boolean flag) {',
      '    count = count + delta;',
      '    live = flag;',
      '    data = new int[count];',
      '    data[0] = count;',
      '    next = new Mixed();',
      '    return count;',
      '  }',
      '}'
    ].join('\n'),
    []
  ],
  [
    'inherited fields and methods',
    [
      inMain('System.out.println(new Derived().bump());'),
      'class Base {',
      '  int v;',
      '  public int getV() { return v; }',
      '}',
      'class Derived extends Base {',
      '  public int bump() {',
      '    v = v + 1;',
      '    return this.getV();',
      '  }',
      '}'
    ].join('\n'),
    []
  ],
  [
    'covariant override',
    [
      inMain('System.out.println(0);'),
      'class Base {',
      '  public Base self() { return this; }',
      '}',
      'class Derived extends Base {',
      '  public Derived self() { return this; }',
      '}'
    ].join('\n'),
    []
  ],
  [
    'subtype assignment to field',
    [
      inMain('System.out.println(new Holder().put());'),
      'class Holder {',
      '  Base b;',
      '  public int put() {',
      '    b = new Derived();',
      '    return b.id();',
      '  }',
      '}',
      'class Base { public int id() { return 1; } }',
      'class Derived extends Base { public int go() { return 2; } }'
    ].join('\n'),
    []
  ],
  [
    'arrays, while and boolean logic',
    [
      inMain('System.out.println(new ArrayOps().sum(new int[10]));'),
      'class ArrayOps {',
      '  public int sum(int[] a) {',
      '    int i;',
      '    int total;',
      '    boolean done;',
      '    i = 0;',
      '    total = 0;',
      '    done = false;',
      '    while (i < a.length && !done) {',
      '      total = total + a[i];',
      '      i = i + 1;',
      '      done = a.length < i;',
      '    }',
      '    return total;',
      '  }',
      '}'
    ].join('\n'),
    []
  ],

  // -- expression and statement typing errors -----------------------------------
  ['if condition must be boolean', inMain('if (1) {} else {}'), [err('Expected boolean, found int')]],
  ['plus wants ints', inMain('System.out.println(1 + true);'), [err('Expected int, found boolean')]],
  ['undeclared variable in main', inMain('x = 1;'), [err("Variable 'x' is not declared")]],
  [
    'assignment type mismatch',
    [
      inMain('System.out.println(0);'),
      'class C {',
      '  public int go() {',
      '    boolean b;',
      '    b = 1;',
      '    return 0;',
      '  }',
      '}'
    ].join('\n'),
    [err("Cannot assign int to 'b' (boolean)")]
  ],
  [
    'unknown class in declaration',
    [
      inMain('System.out.println(0);'),
      'class C {',
      '  public int go() {',
      '    Foo f;',
      '    return 0;',
      '  }',
      '}'
    ].join('\n'),
    [err("Class 'Foo' is not declared")]
  ],
  [
    'unknown method',
    [
      inMain('System.out.println(new C().m());'),
      'class C { public int k() { return 0; } }'
    ].join('\n'),
    [err("Method 'm' is not defined in class 'C'")]
  ],
  [
    'wrong arity',
    [
      inMain('System.out.println(new C().m());'),
      'class C { public int m(int a) { return a; } }'
    ].join('\n'),
    [err("Method 'm' expects 1 argument(s), found 0")]
  ],
  [
    'wrong argument type',
    [
      inMain('System.out.println(new C().m(true));'),
      'class C { public int m(int a) { return a; } }'
    ].join('\n'),
    [err("Argument 1 of 'm': expected int, found boolean")]
  ],
  [
    'method call on int',
    [
      inMain('System.out.println(0);'),
      'class C {',
      '  public int go(int x) {',
      '    return x.m();',
      '  }',
      '}'
    ].join('\n'),
    [err('Cannot call a method on int')]
  ],
  [
    'array assignment to non-array',
    [
      inMain('System.out.println(0);'),
      'class C {',
      '  public int go() {',
      '    int x;',
      '    x[0] = 1;',
      '    return 0;',
      '  }',
      '}'
    ].join('\n'),
    [err("'x' is not an int[] (found int)")]
  ],
  ['println of String[] argument', inMain('System.out.println(args);'), [err('Expected int, found String[]')]],
  ["this cannot be used in main", inMain('System.out.println(this);'), [err("'this' cannot be used inside main")]],

  // -- declarations and inheritance ----------------------------------------------
  [
    'duplicate class',
    [
      inMain('System.out.println(0);'),
      'class C { public int a() { return 0; } }',
      'class C { public int b() { return 0; } }'
    ].join('\n'),
    [err("Duplicate class 'C'")]
  ],
  [
    'duplicate field',
    [
      inMain('System.out.println(0);'),
      'class C {',
      '  int f;',
      '  int f;',
      '  public int go() { return f; }',
      '}'
    ].join('\n'),
    [err("Duplicate field 'f' in class 'C'")]
  ],
  [
    'duplicate method',
    [
      inMain('System.out.println(0);'),
      'class C {',
      '  public int m() { return 0; }',
      '  public int m() { return 1; }',
      '}'
    ].join('\n'),
    [err("Duplicate method 'm' in class 'C'")]
  ],
  [
    'duplicate parameter',
    [
      inMain('System.out.println(0);'),
      'class C { public int m(int a, int a) { return a; } }'
    ].join('\n'),
    [err("Duplicate parameter 'a'")]
  ],
  [
    'local clashes with parameter',
    [
      inMain('System.out.println(0);'),
      'class C {',
      '  public int m(int a) {',
      '    int a;',
      '    return a;',
      '  }',
      '}'
    ].join('\n'),
    [err("Variable 'a' is already declared in method 'm'")]
  ],
  [
    'extends unknown class',
    [
      inMain('System.out.println(0);'),
      'class C extends D { public int m() { return 0; } }'
    ].join('\n'),
    [err("Class 'C' extends unknown class 'D'")]
  ],
  [
    'inheritance cycle',
    [
      inMain('System.out.println(0);'),
      'class A extends B { public int m() { return 0; } }',
      'class B extends A { public int n() { return 0; } }'
    ].join('\n'),
    [err("Inheritance cycle: class 'A'"), err("Inheritance cycle: class 'B'")]
  ],
  [
    'main class cannot be instantiated',
    inMain('System.out.println(new Main().go());'),
    [err("The main class 'Main' cannot be instantiated")]
  ],
  [
    'main class cannot be a type',
    [
      inMain('System.out.println(0);'),
      'class C {',
      '  Main m;',
      '  public int go() { return 0; }',
      '}'
    ].join('\n'),
    [err("The main class 'Main' cannot be used as a type")]
  ],
  [
    'return type mismatch',
    [
      inMain('System.out.println(0);'),
      'class C { public boolean m() { return 1; } }'
    ].join('\n'),
    [err("Method 'm' must return boolean, found int")]
  ],
  [
    'override signature mismatch',
    [
      inMain('System.out.println(0);'),
      'class Base { public int m(int a) { return a; } }',
      'class Derived extends Base { public int m(boolean a) { return 0; } }'
    ].join('\n'),
    [err("Override of 'm' must match the signature declared in class 'Base'")]
  ]
];

let failures = 0;
let passed = 0;

function fail(name, message, detail) {
  failures++;
  console.log(`\nFAIL  ${name}: ${message}`);
  if (detail) console.log(detail.split('\n').map((line) => `      ${line}`).join('\n'));
}

function formatDiags(diags) {
  if (diags.length === 0) return '(no diagnostics)';
  return diags.map((diag) => `[${diag.severity}] ${diag.message}`).join('\n');
}

/** Every expectation matches a distinct diagnostic; nothing extra remains. */
function matchDiagnostics(diags, expected) {
  const remaining = [...diags];
  for (const expectation of expected) {
    const index = remaining.findIndex(
      (diag) => diag.severity === expectation.severity && diag.message.includes(expectation.fragment)
    );
    if (index === -1) return `missing expected ${expectation.severity} containing "${expectation.fragment}"`;
    remaining.splice(index, 1);
  }
  if (remaining.length > 0) return 'unexpected extra diagnostics';
  return null;
}

function runCase(name, expected, produce) {
  try {
    const diags = produce();
    const problem = matchDiagnostics(diags, expected);
    if (problem) {
      fail(name, problem, `--- actual ---\n${formatDiags(diags)}`);
      return;
    }
    passed++;
    console.log(`ok    ${name}`);
  } catch (error) {
    fail(name, error && error.message ? error.message : String(error));
  }
}

for (const [name, source, expected] of CASES) {
  runCase(name, expected, () => checkSource(source));
}

// A hole where an annotation should be is a warning, and holes never cascade:
// the untyped local still assigns and returns without follow-on errors.
const HOLE_SOURCE = [
  inMain('System.out.println(0);'),
  'class C {',
  '  public int go() {',
  '    int x;',
  '    x = 1;',
  '    return x;',
  '  }',
  '}'
].join('\n');
runCase('missing type annotation is a lone warning', [warn('Missing type: connect a Type block')], () =>
  checkSourceWithoutTypeOn(HOLE_SOURCE, 'mj_var_declaration')
);

const total = CASES.length + 1;
console.log(`\n${passed}/${total} type-checker cases passed${failures ? `, ${failures} FAILED` : ''}`);
process.exit(failures ? 1 : 0);
