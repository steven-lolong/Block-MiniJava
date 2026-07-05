#!/usr/bin/env node
/**
 * Round-trip test for the MiniJava text <-> block conversion.
 *
 * For every MiniJava program in the battery below:
 *   1. parse the text into a workspace state (text -> blocks),
 *   2. load it into a headless Blockly workspace and generate MiniJava back
 *      (blocks -> text),
 *   3. parse the generated text again and regenerate: generation must be a
 *      fixed point from the first generated form onwards.
 *
 * The built-in examples run the other direction (blocks -> text -> blocks),
 * where the first regeneration may normalize but must then be stable.
 *
 * Run with: npm run test:roundtrip
 */

const {
  parseMiniJavaTextToWorkspaceState,
  stateToCode,
  findUnregisteredType,
  MINI_JAVA_EXAMPLES
} = require('./dist/roundtrip.bundle.js');

/** Wrap statements in the mandatory main class. */
function inMain(statements) {
  const body = statements
    .split('\n')
    .map((line) => `    ${line}`)
    .join('\n');
  return `class Main {\n  public static void main(String[] args) {\n${body}\n  }\n}`;
}

/** MiniJava programs covering every construct the generator can emit. */
const CASES = [
  // -- values and operators ---------------------------------------------------
  ['print integer', inMain('System.out.println(42);')],
  ['arith precedence', inMain('x = 1 + 2 * 3 - 4;')],
  ['normalized parens stay stable', inMain('x = ((1 + 2));')],
  ['and less chain', inMain('b = x < y && y < z && b;')],
  ['not and parens', inMain('b = !(x < y) && !b;')],
  ['parens around identifier', inMain('x = (y);')],
  ['not under array lookup', inMain('b = (!x)[0];')],
  ['not under array length', inMain('x = (!a).length;')],
  ['not under method call', inMain('x = (!o).run(1);')],
  ['double not', inMain('b = !!b;')],
  ['true false this', inMain('b = true;\nc = false;\nt = this;')],
  ['negative integer literal', inMain('x = -5;\ny = x * -3;')],
  ['big integer', inMain('x = 1000000;')],

  // -- arrays -------------------------------------------------------------------
  ['new int array and assign', inMain('a = new int[10];\na[0] = 1;\na[i + 1] = a[i] * 2;')],
  ['array length', inMain('x = a.length;')],
  ['array lookup chain', inMain('x = a[b[0]] + a[1];')],
  ['length of lookup', inMain('x = a[0].length;')],

  // -- method calls ----------------------------------------------------------------
  ['method call no args', inMain('x = this.compute();')],
  ['method call many args', inMain('x = this.compute(1, y, a[2]);')],
  ['chained calls', inMain('x = this.first().second(this.third(4));')],
  ['call on new object', inMain('System.out.println(new Fac().ComputeFac(10));')],
  ['call named length', inMain('x = a.length(1);')],

  // -- identifiers the tokenizer must not reserve ----------------------------------
  ['contextual keyword names', inMain('main = 1;\nout = 2;\nprintln = 3;\nlength = main + out;\nSystem.out.println(length);')],
  ['assign to variable named System', inMain('System = 5;\nSystem[0] = 6;')],
  [
    'class named String',
    `${inMain('s = new String();')}\nclass String {\n  public int size() {\n    return 0;\n  }\n}`
  ],

  // -- statements --------------------------------------------------------------------
  ['if else braced', inMain('if (x < 1) {\n  y = 1;\n} else {\n  y = 2;\n}')],
  ['if else unbraced normalizes', inMain('if (x < 1) y = 1; else y = 2;')],
  ['if with empty branches', inMain('if (b) {} else {}')],
  ['while', inMain('while (i < 10) {\n  i = i + 1;\n}')],
  ['while empty body', inMain('while (b) {}')],
  ['nested block statement', inMain('{\n  x = 1;\n  {\n    y = 2;\n  }\n}')],
  ['empty main', 'class Main {\n  public static void main(String[] args) {\n  }\n}'],
  ['custom main names', 'class Program {\n  public static void main(String[] argv) {\n    System.out.println(argv);\n  }\n}'],

  // -- classes, fields, methods ---------------------------------------------------------
  [
    'class with fields and methods',
    [
      inMain('System.out.println(new Counter().bump());'),
      'class Counter {',
      '  int value;',
      '  boolean live;',
      '  int[] history;',
      '  Counter next;',
      '',
      '  public int bump() {',
      '    value = value + 1;',
      '    return value;',
      '  }',
      '}'
    ].join('\n')
  ],
  [
    'class extends',
    [
      inMain('System.out.println(0);'),
      'class Base {',
      '  public int id() {',
      '    return 1;',
      '  }',
      '}',
      'class Derived extends Base {',
      '  public int id() {',
      '    return 2;',
      '  }',
      '}'
    ].join('\n')
  ],
  [
    'method params of every type',
    [
      inMain('System.out.println(0);'),
      'class Kitchen {',
      '  public int mix(int a, boolean b, int[] c, Bowl d) {',
      '    return a;',
      '  }',
      '}'
    ].join('\n')
  ],
  [
    'method with vars then statements',
    [
      inMain('System.out.println(0);'),
      'class Machine {',
      '  public int run(int seed) {',
      '    int state;',
      '    boolean done;',
      '    state = seed;',
      '    done = false;',
      '    while (!done) {',
      '      state = state * 2;',
      '      done = 100 < state;',
      '    }',
      '    return state;',
      '  }',
      '}'
    ].join('\n')
  ],
  [
    'return complex expression',
    [
      inMain('System.out.println(0);'),
      'class Math2 {',
      '  public int poly(int x) {',
      '    return x * x + 2 * x + 1;',
      '  }',
      '}'
    ].join('\n')
  ],

  // -- comments ---------------------------------------------------------------------------
  [
    'comments are ignored',
    `// leading comment\n${inMain('x = 1; // trailing\n/* block\ncomment */ y = 2;')}`
  ],

  // -- classic MiniJava programs -------------------------------------------------------------
  [
    'factorial program',
    [
      'class Factorial {',
      '  public static void main(String[] a) {',
      '    System.out.println(new Fac().ComputeFac(10));',
      '  }',
      '}',
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
    ].join('\n')
  ],
  [
    'linked list fragment',
    [
      inMain('System.out.println(new List().init(5));'),
      'class List {',
      '  int head;',
      '  List rest;',
      '  boolean empty;',
      '',
      '  public int init(int value) {',
      '    head = value;',
      '    empty = false;',
      '    return head;',
      '  }',
      '',
      '  public boolean isEmpty() {',
      '    return empty;',
      '  }',
      '}'
    ].join('\n')
  ],

  // -- generator-shaped input (exactly what the code panel prints) ----------------------------
  [
    'generated empty if branches',
    inMain('if ((x < 1)) {\n  {}\n} else {\n  {}\n}')
  ],
  ['generated default program', 'class Main {\n  public static void main(String[] args) {\n    System.out.println(0);\n  }\n}']
];

let failures = 0;
let passed = 0;

function fail(name, message, detail) {
  failures++;
  console.log(`\nFAIL  ${name}: ${message}`);
  if (detail) console.log(detail.split('\n').map((line) => `      ${line}`).join('\n'));
}

/**
 * Canonical form for structural comparison: sorted keys, positions dropped.
 * Both states come from the parser, so identical programs must be identical
 * structures — this catches bugs where the regenerated text is string-stable
 * but reshapes the blocks (e.g. `!x[0]` flipping lookup(not(x)) to not(lookup(x))).
 */
function canonical(value) {
  if (Array.isArray(value)) return value.map(canonical);
  if (value && typeof value === 'object') {
    const out = {};
    for (const key of Object.keys(value).sort()) {
      if (key === 'x' || key === 'y') continue;
      out[key] = canonical(value[key]);
    }
    return out;
  }
  return value;
}

function structure(state) {
  return JSON.stringify(canonical(state.blocks.blocks));
}

/** Run fn while capturing Blockly's console warnings; they signal bad states. */
function withCapturedWarnings(fn) {
  const warnings = [];
  const originalWarn = console.warn;
  const originalError = console.error;
  console.warn = (...args) => warnings.push(args.join(' '));
  console.error = (...args) => warnings.push(args.join(' '));
  try {
    const result = fn();
    return { result, warnings };
  } finally {
    console.warn = originalWarn;
    console.error = originalError;
  }
}

for (const [name, source] of CASES) {
  try {
    const { result, warnings } = withCapturedWarnings(() => {
      const state1 = parseMiniJavaTextToWorkspaceState(source);
      const unregistered = findUnregisteredType(state1);
      if (unregistered) throw new Error(`parser produced unregistered block type '${unregistered}'`);
      const first = stateToCode(state1);
      const state2 = parseMiniJavaTextToWorkspaceState(first.code);
      const second = stateToCode(state2);
      return { first, second, state1, state2 };
    });

    if (warnings.length > 0) {
      fail(name, 'Blockly reported problems while loading', warnings.join('\n'));
      continue;
    }
    if (result.second.code !== result.first.code) {
      fail(
        name,
        'regenerated MiniJava is not stable',
        `--- first ---\n${result.first.code}\n--- second ---\n${result.second.code}`
      );
      continue;
    }
    if (structure(result.state2) !== structure(result.state1)) {
      fail(
        name,
        'text -> blocks -> text -> blocks changed the block structure',
        `--- generated ---\n${result.first.code}`
      );
      continue;
    }
    passed++;
    console.log(`ok    ${name}`);
  } catch (error) {
    fail(name, error && error.message ? error.message : String(error));
  }
}

// -- blocks-first round-trips: the built-in examples -----------------------------
// These states are hand-built, so they exercise block shapes the text parser
// must accept. The first regeneration may normalize; then it must be stable.
console.log('\nExamples (blocks -> text -> blocks):');
let examplesPassed = 0;
for (const example of MINI_JAVA_EXAMPLES) {
  try {
    const { result, warnings } = withCapturedWarnings(() => {
      const first = stateToCode(example.state);
      const second = stateToCode(parseMiniJavaTextToWorkspaceState(first.code));
      const third = stateToCode(parseMiniJavaTextToWorkspaceState(second.code));
      return { first, second, third };
    });

    if (warnings.length > 0) {
      fail(example.id, 'Blockly reported problems while loading', warnings.join('\n'));
      continue;
    }
    if (result.third.code !== result.second.code) {
      fail(
        example.id,
        'regenerated MiniJava is not stable',
        `--- second ---\n${result.second.code}\n--- third ---\n${result.third.code}`
      );
      continue;
    }
    if (result.second.code !== result.first.code) {
      console.log(`note  ${example.id}: first regeneration normalized the code`);
    }
    examplesPassed++;
    console.log(`ok    ${example.id}`);
  } catch (error) {
    fail(example.id, error && error.message ? error.message : String(error));
  }
}

console.log(
  `\n${passed}/${CASES.length} text round-trips passed, ` +
  `${examplesPassed}/${MINI_JAVA_EXAMPLES.length} example round-trips passed` +
  (failures ? `, ${failures} FAILED` : '')
);
process.exit(failures ? 1 : 0);
