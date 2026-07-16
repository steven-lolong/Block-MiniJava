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
    // The Bubble Sort example: nested loops and in-place swaps.
    'bubble sort',
    [
      inMain('System.out.println(new BBS().Start(10));'),
      'class BBS {',
      '  int[] number;',
      '  int size;',
      '',
      '  public int Start(int sz) {',
      '    int aux;',
      '    size = sz;',
      '    number = new int[sz];',
      '    aux = this.Init();',
      '    aux = this.Print();',
      '    System.out.println(9999);',
      '    aux = this.Sort();',
      '    aux = this.Print();',
      '    return 0;',
      '  }',
      '',
      '  public int Sort() {',
      '    int i;',
      '    int j;',
      '    int t;',
      '    int aux01;',
      '    int aux02;',
      '    int dummy;',
      '    i = size - 1;',
      '    while (0 < i) {',
      '      j = 0;',
      '      while (j < i) {',
      '        aux01 = number[j];',
      '        aux02 = number[j + 1];',
      '        if (aux02 < aux01) {',
      '          t = number[j];',
      '          number[j] = number[j + 1];',
      '          number[j + 1] = t;',
      '        } else {',
      '          dummy = 0;',
      '        }',
      '        j = j + 1;',
      '      }',
      '      i = i - 1;',
      '    }',
      '    return 0;',
      '  }',
      '',
      '  public int Init() {',
      '    number[0] = 20;',
      '    number[1] = 7;',
      '    number[2] = 12;',
      '    number[3] = 18;',
      '    number[4] = 2;',
      '    number[5] = 11;',
      '    number[6] = 6;',
      '    number[7] = 9;',
      '    number[8] = 19;',
      '    number[9] = 5;',
      '    return 0;',
      '  }',
      '',
      '  public int Print() {',
      '    int j;',
      '    j = 0;',
      '    while (j < size) {',
      '      System.out.println(number[j]);',
      '      j = j + 1;',
      '    }',
      '    return 0;',
      '  }',
      '}'
    ].join('\n'),
    ['20', '7', '12', '18', '2', '11', '6', '9', '19', '5', '9999', '2', '5', '6', '7', '9', '11', '12', '18', '19', '20', '0']
  ],
  [
    // The Palindrome example: two pointers, equality via only '<'.
    'palindrome',
    [
      inMain('System.out.println(new PalCheck().Run());'),
      'class PalCheck {',
      '  int[] arr;',
      '  int size;',
      '',
      '  public int Run() {',
      '    int isPal;',
      '    size = 5;',
      '    arr = new int[size];',
      '    arr[0] = 1;',
      '    arr[1] = 2;',
      '    arr[2] = 3;',
      '    arr[3] = 2;',
      '    arr[4] = 1;',
      '    isPal = this.CheckPalindrome();',
      '    System.out.println(isPal);',
      '    arr[3] = 9;',
      '    isPal = this.CheckPalindrome();',
      '    System.out.println(isPal);',
      '    return 0;',
      '  }',
      '',
      '  public int CheckPalindrome() {',
      '    int start;',
      '    int end;',
      '    int result;',
      '    boolean keepGoing;',
      '    start = 0;',
      '    end = size - 1;',
      '    result = 1;',
      '    keepGoing = true;',
      '    while (keepGoing) {',
      '      if (end < start) {',
      '        keepGoing = false;',
      '      } else {',
      '        if (arr[start] < arr[end]) {',
      '          result = 0;',
      '          keepGoing = false;',
      '        } else {',
      '          if (arr[end] < arr[start]) {',
      '            result = 0;',
      '            keepGoing = false;',
      '          } else {',
      '            start = start + 1;',
      '            end = end - 1;',
      '          }',
      '        }',
      '      }',
      '    }',
      '    return result;',
      '  }',
      '}'
    ].join('\n'),
    ['1', '0', '0']
  ],
  [
    // The Binary Search example: arrays, division, nested if/else and a while
    // loop under both strategies. 8 is found (1), 19 is absent (0), Start = 0.
    'binary search',
    [
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
    ].join('\n'),
    ['1', '0', '0']
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
