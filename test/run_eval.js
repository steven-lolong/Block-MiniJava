#!/usr/bin/env node
/**
 * Legacy-evaluator tests: call-by-structure vs call-by-value.
 *
 * The strategy-parameterized evaluator (core/semantics/minijavaRuntime.ts)
 * backs the Structure / Value visualization tabs: CbS binds method arguments
 * as thunks over the block tree, CbV evaluates them eagerly. On MiniJava's
 * pure expression fragment the two must agree — every case below runs under
 * BOTH strategies and asserts identical println output. The reduction-view
 * renderer is exercised headlessly for both kinds as well.
 *
 * Run with: npm run test:eval
 */

const { evalSource, renderReduction } = require('./dist/eval.bundle.js');

function inMain(statements) {
  const body = statements
    .split('\n')
    .map((line) => `    ${line}`)
    .join('\n');
  return `class Main {\n  public static void main(String[] args) {\n${body}\n  }\n}`;
}

/** [name, source, expected output lines] */
const CASES = [
  ['print literal', inMain('System.out.println(42);'), ['42']],
  ['arithmetic dropdown ops', inMain('System.out.println(1 + 2 * 3 - 4);'), ['3']],
  ['compare and logic', inMain('System.out.println(1 < 2 && !(3 < 2));'), ['true']],
  ['division truncates toward zero', inMain('System.out.println(7 / 2);\nSystem.out.println((0 - 7) / 2);'), ['3', '-3']],
  ['relational operators', inMain('System.out.println(1 <= 1 && 2 >= 2 && 3 > 2 && !(2 > 3));'), ['true']],
  ['or short-circuits past a division by zero', inMain('System.out.println(true || 1 / 0 < 1);'), ['true']],
  ['or evaluates the right operand when needed', inMain('System.out.println(false || 2 > 1);'), ['true']],
  ['boolean literal', inMain('System.out.println(false);'), ['false']],
  ['string literal', inMain('System.out.println("hello");'), ['hello']],
  ['string operators', inMain('System.out.println("mini".concat("java").charAt(4).concat("!"));'), ['j!']],
  ['string length', inMain('System.out.println("mini".concat("java").length());'), ['8']],
  [
    'method call with computed argument',
    [
      inMain('System.out.println(new D().twice(1 + 2));'),
      'class D { public int twice(int a) { return a + a; } }'
    ].join('\n'),
    ['6']
  ],
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
    ['3628800']
  ],
  [
    'string fields and params through a method',
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
    ['hello world']
  ],
  [
    'extends with inherited method',
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
    ['1']
  ],
  [
    'while over a string',
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
    ['aabbcc']
  ]
];

/** Programs whose reduction views must render and agree with the evaluator. */
const REDUCTION_CASES = [
  [
    'twice reduction view',
    [
      inMain('System.out.println(new D().twice(1 + 2));'),
      'class D { public int twice(int a) { return a + a; } }'
    ].join('\n'),
    '6'
  ],
  [
    'string reduction view',
    [
      inMain('System.out.println(new G().greet("world"));'),
      'class G { public String greet(String who) { return "hello ".concat(who); } }'
    ].join('\n'),
    'hello world'
  ]
];

let failures = 0;
let passed = 0;

function fail(name, message, detail) {
  failures++;
  console.log(`\nFAIL  ${name}: ${message}`);
  if (detail) console.log(detail.split('\n').map((line) => `      ${line}`).join('\n'));
}

for (const [name, source, expected] of CASES) {
  try {
    const cbs = evalSource(source, 'structure');
    const cbv = evalSource(source, 'value');
    if (JSON.stringify(cbs.output) !== JSON.stringify(expected)) {
      fail(name, 'CbS output mismatch', `expected: ${expected.join(' | ')}\nactual:   ${cbs.output.join(' | ')}`);
      continue;
    }
    if (JSON.stringify(cbv.output) !== JSON.stringify(expected)) {
      fail(name, 'CbV output mismatch', `expected: ${expected.join(' | ')}\nactual:   ${cbv.output.join(' | ')}`);
      continue;
    }
    passed++;
    console.log(`ok    ${name} — CbS = CbV = ${expected.join(' | ')}`);
  } catch (error) {
    fail(name, error && error.message ? error.message : String(error));
  }
}

console.log('\nReduction views (Structure / Value tabs, headless):');
for (const [name, source, expected] of REDUCTION_CASES) {
  for (const strategy of ['structure', 'value']) {
    const label = `${name} (${strategy === 'structure' ? 'CbS' : 'CbV'})`;
    try {
      const report = renderReduction(source, strategy);
      if (report.blockCount === 0) {
        fail(label, 'the reduction view rendered no blocks');
        continue;
      }
      if (report.value !== expected) {
        fail(label, `expected value '${expected}', got '${report.value}'`);
        continue;
      }
      passed++;
      console.log(`ok    ${label} — ${report.blockCount} view block(s), value ${report.value}`);
    } catch (error) {
      fail(label, error && error.message ? error.message : String(error));
    }
  }
}

const total = CASES.length + REDUCTION_CASES.length * 2;
console.log(`\n${passed}/${total} evaluator cases passed${failures ? `, ${failures} FAILED` : ''}`);
process.exit(failures ? 1 : 0);
