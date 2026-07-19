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

const { checkSource, checkSourceWithoutTypeOn, deriveSource } = require('./dist/typecheck.bundle.js');

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
    // The Shapes example: a subclass override, polymorphic assignment
    // (Rectangle into a Shape variable), and a subclass reading inherited
    // fields must all check clean.
    'shapes: inheritance, override and polymorphic assignment',
    [
      inMain('System.out.println(new Setup().Run());'),
      'class Setup {',
      '  public int Run() {',
      '    Shape s2;',
      '    Rectangle r;',
      '    int aux;',
      '    s2 = new Rectangle();',
      '    r = new Rectangle();',
      '    aux = s2.Init(5, 10);',
      '    System.out.println(s2.GetArea());',
      '    aux = r.SetBorder(2);',
      '    System.out.println(r.GetAreaWithBorder());',
      '    return 0;',
      '  }',
      '}',
      'class Shape {',
      '  int width;',
      '  int height;',
      '  public int Init(int w, int h) { width = w; height = h; return 0; }',
      '  public int GetArea() { return 0; }',
      '}',
      'class Rectangle extends Shape {',
      '  int borderWidth;',
      '  public int GetArea() { return width * height; }',
      '  public int SetBorder(int b) { borderWidth = b; return 0; }',
      '  public int GetAreaWithBorder() {',
      '    int totalWidth;',
      '    totalWidth = width + (borderWidth * 2);',
      '    return totalWidth * (height + (borderWidth * 2));',
      '  }',
      '}'
    ].join('\n'),
    []
  ],
  [
    // A Shape variable holding a Rectangle exposes only Shape's interface:
    // the subclass-only method is a static error even though dispatch would
    // find it at runtime.
    'subclass-only method is not visible through the base type',
    [
      inMain('System.out.println(new Setup().Run());'),
      'class Setup {',
      '  public int Run() {',
      '    Shape s;',
      '    int aux;',
      '    s = new Rectangle();',
      '    aux = s.SetBorder(2);',
      '    return 0;',
      '  }',
      '}',
      'class Shape { public int GetArea() { return 0; } }',
      'class Rectangle extends Shape {',
      '  int borderWidth;',
      '  public int SetBorder(int b) { borderWidth = b; return 0; }',
      '}'
    ].join('\n'),
    [err("Method 'SetBorder' is not defined in class 'Shape'")]
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

  // -- strings --------------------------------------------------------------------
  ['println accepts a String', inMain('System.out.println("hello");'), []],
  ['println accepts concat and charAt', inMain('System.out.println("ab".concat("cd").charAt(2));'), []],
  [
    'string fields, params, locals and returns',
    [
      inMain('System.out.println(new Greeter().greet("world"));'),
      'class Greeter {',
      '  String prefix;',
      '',
      '  public String greet(String who) {',
      '    String message;',
      '    message = prefix.concat(who);',
      '    return message;',
      '  }',
      '}'
    ].join('\n'),
    []
  ],
  ['println rejects boolean still', inMain('System.out.println(true);'), [err('Expected int or String, found boolean')]],
  ['string length returns int', inMain('System.out.println("abc".length());'), []],
  ['string length receiver must be String', inMain('System.out.println((1).length());'), [err('Expected String, found int')]],
  ['charAt receiver must be String', inMain('System.out.println((1).charAt(0));'), [err('Expected String, found int')]],
  ['charAt index must be int', inMain('System.out.println("ab".charAt(true));'), [err('Expected int, found boolean')]],
  ['concat wants Strings', inMain('System.out.println("ab".concat(1));'), [err('Expected String, found int')]],
  ['plus rejects strings', inMain('System.out.println("a" + "b");'), [err('Expected int, found String'), err('Expected int, found String')]],
  [
    'cannot assign String to int',
    [
      inMain('System.out.println(0);'),
      'class C {',
      '  public int go() {',
      '    int x;',
      '    x = "oops";',
      '    return x;',
      '  }',
      '}'
    ].join('\n'),
    [err("Cannot assign String to 'x' (int)")]
  ],

  // -- expression and statement typing errors -----------------------------------
  ['if condition must be boolean', inMain('if (1) {} else {}'), [err('Expected boolean, found int')]],
  ['plus wants ints', inMain('System.out.println(1 + true);'), [err('Expected int, found boolean')]],
  ['division and relational operators are well-typed', inMain('if (10 / 2 >= 5 || 1 <= 0) {} else {}'), []],
  ['or wants booleans', inMain('if (1 || true) {} else {}'), [err('Expected boolean, found int')]],
  ['relational wants ints', inMain('if (1 >= true) {} else {}'), [err('Expected int, found boolean')]],
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
  ['println of String[] argument', inMain('System.out.println(args);'), [err('Expected int or String, found String[]')]],
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

// --- typing derivations (Typing tab) ---------------------------------------

/** A boolean-assertion case: passes when produce() returns true. */
function derivCase(name, produce) {
  try {
    const result = produce();
    if (result === true) {
      passed++;
      console.log(`ok    ${name}`);
    } else {
      fail(name, typeof result === 'string' ? result : 'assertion returned false');
    }
  } catch (error) {
    fail(name, error && error.message ? error.message : String(error));
  }
}

const DERIV_SOURCE = [
  inMain('System.out.println(new Cell().set(41));'),
  'class Cell {',
  '  int f;',
  '  public int set(int v) {',
  '    int i;',
  '    f = v;',
  '    i = 0;',
  '    while (i < 3) {',
  '      i = i + 1;',
  '    }',
  '    return f;',
  '  }',
  '}'
].join('\n');

derivCase('derivations: main first, then C.m, each rooted at M-OK', () => {
  const derivs = deriveSource(DERIV_SOURCE);
  const labels = derivs.map((d) => d.label);
  if (JSON.stringify(labels) !== JSON.stringify(['main', 'Cell.set'])) {
    return `labels were ${JSON.stringify(labels)}`;
  }
  return derivs.every((d) => d.deriv.rule === 'M-OK') || 'a root rule was not M-OK';
});

derivCase('derivations: Γ legend lists this, params and locals in order', () => {
  const setDeriv = deriveSource(DERIV_SOURCE).find((d) => d.label === 'Cell.set');
  return setDeriv.gamma === 'this:Cell, v:int, i:int' || `gamma was '${setDeriv.gamma}'`;
});

derivCase('derivations: WF-Assign row over a T-Var premise, with the Γ(x) side condition', () => {
  const setDeriv = deriveSource(DERIV_SOURCE).find((d) => d.label === 'Cell.set');
  const assign = setDeriv.deriv.premises.find((p) => p.rule === 'WF-Assign' && p.judgement.includes('f = '));
  if (!assign) return 'no WF-Assign row for the field write';
  if (assign.premises.length !== 1 || assign.premises[0].rule !== 'T-Var') {
    return `premises were ${JSON.stringify(assign.premises.map((p) => p.rule))}`;
  }
  // The field write resolves through fields(C), not the local context.
  return assign.note.includes('fields(Cell)(f) = int') || `note was '${assign.note}'`;
});

derivCase('derivations: WF-While with T-Cmp condition premise then body rows', () => {
  const setDeriv = deriveSource(DERIV_SOURCE).find((d) => d.label === 'Cell.set');
  const loop = setDeriv.deriv.premises.find((p) => p.rule === 'WF-While');
  if (!loop) return 'no WF-While row';
  if (loop.judgement !== 'Γ ⊢ while ((i < 3)) … ok') return `judgement was '${loop.judgement}'`;
  const rules = loop.premises.map((p) => p.rule);
  return JSON.stringify(rules) === JSON.stringify(['T-Cmp', 'WF-Assign']) || `premises were ${JSON.stringify(rules)}`;
});

derivCase('derivations: T-Invk carries the mtype note, receiver premise first', () => {
  const mainDeriv = deriveSource(DERIV_SOURCE).find((d) => d.label === 'main');
  const print = mainDeriv.deriv.premises.find((p) => p.rule === 'WF-Print');
  if (!print) return 'no WF-Print row in main';
  const invk = print.premises[0];
  if (invk.rule !== 'T-Invk') return `print premise was ${invk.rule}`;
  if (!invk.note.includes('mtype(set, Cell) = (int) → int')) return `note was '${invk.note}'`;
  const rules = invk.premises.map((p) => p.rule);
  return JSON.stringify(rules) === JSON.stringify(['T-New', 'T-Int']) || `premises were ${JSON.stringify(rules)}`;
});

derivCase('derivations: WF-Return row states the subtype side condition', () => {
  const setDeriv = deriveSource(DERIV_SOURCE).find((d) => d.label === 'Cell.set');
  const ret = setDeriv.deriv.premises[setDeriv.deriv.premises.length - 1];
  if (ret.rule !== 'WF-Return') return `last row was ${ret.rule}`;
  if (!ret.judgement.includes('return f : int')) return `judgement was '${ret.judgement}'`;
  return ret.note === 'int <: int' || `note was '${ret.note}'`;
});

derivCase('derivations: judgements read Γ ⊢ <MiniJava text> : <type>', () => {
  const mainDeriv = deriveSource(DERIV_SOURCE).find((d) => d.label === 'main');
  const print = mainDeriv.deriv.premises.find((p) => p.rule === 'WF-Print');
  const invk = print.premises[0];
  return (
    invk.judgement === 'Γ ⊢ new Cell().set(41) : int' || `judgement was '${invk.judgement}'`
  );
});

derivCase('derivations: an ill-typed program still derives, with holes at the failure', () => {
  // 'junk' is undeclared: the assign row survives with a '∉ Γ' note and the
  // program still produces both derivations without throwing.
  const derivs = deriveSource(
    [
      inMain('System.out.println(0);'),
      'class C {',
      '  public int go() {',
      '    junk = 1;',
      '    return 0;',
      '  }',
      '}'
    ].join('\n')
  );
  const go = derivs.find((d) => d.label === 'C.go');
  const assign = go.deriv.premises.find((p) => p.rule === 'WF-Assign');
  if (!assign) return 'no WF-Assign row';
  return assign.note === 'junk ∉ Γ' || `note was '${assign.note}'`;
});

derivCase('derivations: deriving does not change the diagnostic set', () => {
  const source = [
    inMain('System.out.println(new C().go());'),
    'class C {',
    '  public int go() {',
    '    boolean b;',
    '    b = 5;',
    '    return 0;',
    '  }',
    '}'
  ].join('\n');
  const before = checkSource(source);
  deriveSource(source);
  const after = checkSource(source);
  if (before.length !== 1) return `expected exactly 1 diagnostic, got ${before.length}`;
  return JSON.stringify(before) === JSON.stringify(after) || 'diagnostics changed';
});

const total = CASES.length + 1 + 9;
console.log(`\n${passed}/${total} type-checker cases passed${failures ? `, ${failures} FAILED` : ''}`);
process.exit(failures ? 1 : 0);
