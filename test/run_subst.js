#!/usr/bin/env node
/**
 * Substitution-stepper tests (design note §7).
 *
 * Two layers:
 *  1. Rewriting: each pure program reduces to the expected value with the
 *     expected rule trace, and the structure-preservation invariant holds
 *     (all block ids unique in every intermediate tree — substituted
 *     occurrences are independent copies).
 *  2. Operational correspondence: for the same program, the substitution
 *     trace and the Model B machine trace agree on the salient rules
 *     (add/sub/mul/less/not/and/and-short-circuit/new/call) and on the
 *     final value — machine env lookup is lazy substitution.
 *
 * Run with: npm run test:subst
 */

const { runSubst } = require('./dist/subst.bundle.js');
const { traceSource } = require('./dist/machine.bundle.js');

function inMain(statements) {
  const body = statements
    .split('\n')
    .map((line) => `    ${line}`)
    .join('\n');
  return `class Main {\n  public static void main(String[] args) {\n${body}\n  }\n}`;
}

const SALIENT = new Set([
  'add', 'sub', 'mul', 'less', 'not', 'and', 'and-short-circuit', 'new', 'call',
  'concat', 'char-at', 'str-length'
]);
const salient = (rules) => rules.filter((rule) => SALIENT.has(rule));

const CELL = [
  'class Cell {',
  '  int f;',
  '  public Cell with(int v) {',
  '    f = v;',
  '    return this;',
  '  }',
  '  public int get() { return f; }',
  '}'
].join('\n');

/** [name, source, { result, rules?, rulesInclude?, rulesExclude?, errorIncludes? }] */
const CASES = [
  ['arithmetic precedence', inMain('System.out.println(1 + 2 * 3 - 4);'), { result: '3', rules: ['mul', 'add', 'sub'] }],
  [
    'beta on a pure method',
    [
      inMain('System.out.println(new Adder().plus(1, 2));'),
      'class Adder { public int plus(int a, int b) { return a + b; } }'
    ].join('\n'),
    { result: '3', rules: ['new', 'call', 'add'] }
  ],
  [
    'argument reduces before beta, then substitutes twice independently',
    [
      inMain('System.out.println(new D().twice(1 + 2));'),
      'class D { public int twice(int a) { return a + a; } }'
    ].join('\n'),
    { result: '6', rules: ['new', 'add', 'call', 'add'] }
  ],
  [
    'functional update: with-pattern grows a new object value',
    [inMain('System.out.println(new Cell().with(41).get());'), CELL].join('\n'),
    { result: '41', rules: ['new', 'call', 'call'] }
  ],
  [
    'object value as the final result',
    [inMain('System.out.println(new Cell().with(41));'), CELL].join('\n'),
    { result: 'Cell{f: 41}', rules: ['new', 'call'] }
  ],
  [
    'independent copies: update one copy, the other stays put',
    [
      inMain('System.out.println(new P().both(new Cell()));'),
      'class P {',
      '  public int both(Cell c) {',
      '    return c.with(41).get() + c.get();',
      '  }',
      '}',
      CELL
    ].join('\n'),
    { result: '41', rulesInclude: ['call'] }
  ],
  [
    'short-circuit skips the right operand',
    inMain('System.out.println(false && 1 < 2);'),
    { result: 'false', rulesInclude: ['and-short-circuit'], rulesExclude: ['less'] }
  ],
  [
    'boolean chain',
    // The text parser resolves the parentheses structurally, so no parens
    // block (and no 'parens' rule) appears in the tree.
    inMain('System.out.println(!(1 < 2) && true);'),
    { result: 'false', rules: ['less', 'not', 'and-short-circuit'] }
  ],
  [
    'inherited pure method',
    [
      inMain('System.out.println(new D().id() + 1);'),
      'class Base { public int id() { return 41; } }',
      'class D extends Base { }'
    ].join('\n'),
    { result: '42', rules: ['new', 'call', 'add'] }
  ],
  [
    'concat then charAt',
    inMain('System.out.println("mini".concat("java").charAt(4));'),
    { result: '"j"', rules: ['concat', 'char-at'] }
  ],
  [
    'string param and field through a pure method',
    [
      inMain('System.out.println(new G().greet("world"));'),
      'class G {',
      '  String p;',
      '  public String greet(String w) {',
      '    p = "hello ";',
      '    return p.concat(w);',
      '  }',
      '}'
    ].join('\n'),
    { result: '"hello world"', rules: ['new', 'call', 'concat'] }
  ],
  [
    'charAt out of bounds is reported',
    inMain('System.out.println("ab".charAt(5));'),
    { errorIncludes: 'string index 5 out of bounds' }
  ],
  [
    'string length folds to an int',
    inMain('System.out.println("ab".concat("cde").length() + 1);'),
    { result: '6', rules: ['concat', 'str-length', 'add'] }
  ],
  [
    'impure method is reported, not mis-stepped',
    [
      inMain('System.out.println(new Fac().ComputeFac(3));'),
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
    { errorIncludes: 'not in the pure fragment' }
  ]
];

/** Programs where the substitution trace must match the Model B machine. */
const CORRESPONDENCE = [
  ['arithmetic', inMain('System.out.println(1 + 2 * 3 - 4);')],
  ['short-circuit', inMain('System.out.println(false && 1 < 2);')],
  ['boolean chain', inMain('System.out.println(!(1 < 2) && true);')],
  [
    'beta and duplication',
    [
      inMain('System.out.println(new D().twice(1 + 2));'),
      'class D { public int twice(int a) { return a + a; } }'
    ].join('\n')
  ],
  ['functional update', [inMain('System.out.println(new Cell().with(41).get());'), CELL].join('\n')],
  ['object result', [inMain('System.out.println(new Cell().with(41));'), CELL].join('\n')],
  [
    'independent copies',
    [
      inMain('System.out.println(new P().both(new Cell()));'),
      'class P {',
      '  public int both(Cell c) {',
      '    return c.with(41).get() + c.get();',
      '  }',
      '}',
      CELL
    ].join('\n')
  ],
  ['string concat and charAt', inMain('System.out.println("mini".concat("java").charAt(4));')],
  ['string length', inMain('System.out.println("ab".concat("cde").length() + 1);')],
  [
    'string beta and duplication',
    [
      inMain('System.out.println(new D().twice("ab".concat("c")));'),
      'class D { public String twice(String s) { return s.concat(s); } }'
    ].join('\n')
  ]
];

let failures = 0;
let passed = 0;

function fail(name, message, detail) {
  failures++;
  console.log(`\nFAIL  ${name}: ${message}`);
  if (detail) console.log(detail.split('\n').map((line) => `      ${line}`).join('\n'));
}

function ok(name) {
  passed++;
  console.log(`ok    ${name}`);
}

for (const [name, source, expect] of CASES) {
  try {
    const report = runSubst(source);
    if (report.duplicateIds.length > 0) {
      fail(name, `structure-preservation violated: duplicate ids ${report.duplicateIds.join(', ')}`);
      continue;
    }
    if (expect.errorIncludes) {
      if (report.status !== 'error' || !(report.error ?? '').includes(expect.errorIncludes)) {
        fail(name, `expected error containing "${expect.errorIncludes}"`, `status: ${report.status} (${report.error})`);
        continue;
      }
      ok(name);
      continue;
    }
    if (report.status !== 'done') {
      fail(name, `expected done, got ${report.status} (${report.error})`);
      continue;
    }
    if (report.result !== expect.result) {
      fail(name, `expected result '${expect.result}', got '${report.result}'`);
      continue;
    }
    if (expect.rules && JSON.stringify(report.rules) !== JSON.stringify(expect.rules)) {
      fail(name, 'rule trace mismatch', `expected: ${expect.rules.join(' ')}\nactual:   ${report.rules.join(' ')}`);
      continue;
    }
    let ruleProblem = null;
    for (const rule of expect.rulesInclude ?? []) {
      if (!report.rules.includes(rule)) ruleProblem = `expected rule '${rule}' to fire`;
    }
    for (const rule of expect.rulesExclude ?? []) {
      if (report.rules.includes(rule)) ruleProblem = `expected rule '${rule}' NOT to fire`;
    }
    if (ruleProblem) {
      fail(name, ruleProblem, `actual: ${report.rules.join(' ')}`);
      continue;
    }
    ok(name);
  } catch (error) {
    fail(name, error && error.message ? error.message : String(error));
  }
}

console.log('\nOperational correspondence (substitution vs Model B machine):');
for (const [name, source] of CORRESPONDENCE) {
  try {
    const subst = runSubst(source);
    const machine = traceSource(source, 'B');
    if (subst.status !== 'done' || machine.status !== 'done') {
      fail(name, `expected both to finish`, `subst: ${subst.status} (${subst.error}), machine: ${machine.status}`);
      continue;
    }
    const substSalient = salient(subst.rules);
    const machineSalient = salient(machine.rules);
    if (JSON.stringify(substSalient) !== JSON.stringify(machineSalient)) {
      fail(
        name,
        'salient rule traces differ',
        `subst:   ${substSalient.join(' ')}\nmachine: ${machineSalient.join(' ')}`
      );
      continue;
    }
    // The subst result is SYNTAX (a string value prints quoted, `"j"`), while
    // the machine output is what println writes (raw, `j`) — unquote to compare.
    const substValue = subst.result.startsWith('"') ? JSON.parse(subst.result) : subst.result;
    if (substValue !== machine.output[0]) {
      fail(name, 'final values differ', `subst: ${subst.result}, machine printed: ${machine.output[0]}`);
      continue;
    }
    ok(`${name} — ${substSalient.length} salient rule(s) agree, value ${subst.result}`);
  } catch (error) {
    fail(name, error && error.message ? error.message : String(error));
  }
}

const total = CASES.length + CORRESPONDENCE.length;
console.log(`\n${passed}/${total} substitution cases passed${failures ? `, ${failures} FAILED` : ''}`);
process.exit(failures ? 1 : 0);
