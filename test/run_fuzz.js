#!/usr/bin/env node
/**
 * Differential fuzz over the whole expression language.
 *
 * Generates seeded random `System.out.println(expr);` programs covering every
 * operator family (arith incl. division, relational, logic incl. ||, not,
 * parens, string literal/concat/charAt/length, boolean and negative-int
 * literals, string contents that look like grammar tokens), computes an
 * independent JS oracle during generation, and requires FIVE engines to agree:
 *
 *   Machine A = Machine B = evaluator CbS = evaluator CbV = substitution = oracle
 *
 * Error programs (division by zero, charAt out of bounds) must be errors
 * everywhere: both machines and the rewriter reach a stuck state with the
 * same reason, and the legacy evaluator yields an unknown(...) value.
 *
 * Every program must also round-trip: text -> blocks -> text -> blocks with
 * stable text and identical structure.
 *
 * Run with: npm run test:fuzz            (default 400 programs)
 *           node test/run_fuzz.js <seed> (rerun a single seed verbosely)
 */

const { runSource } = require('./dist/machine.bundle.js');
const { evalSource } = require('./dist/eval.bundle.js');
const { runSubst } = require('./dist/subst.bundle.js');
const { parseMiniJavaTextToWorkspaceState, stateToCode } = require('./dist/roundtrip.bundle.js');

/* -- seeded PRNG (mulberry32) ------------------------------------------------ */

function mulberry32(seed) {
  let a = seed >>> 0;
  return function () {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/* -- typed expression generator with inline oracle --------------------------- */

/** Thrown by the oracle when the program must be a runtime error. */
class OracleError extends Error {}

const STRING_POOL = ['', 'a', 'ab', 'mini', 'true', '!', '(', 'int', 'x y', '<=', '||', 'length'];

function makeGen(rand) {
  const pick = (items) => items[Math.floor(rand() * items.length)];
  const int = (lo, hi) => lo + Math.floor(rand() * (hi - lo + 1));

  /** Returns { text, value } where value is the oracle result (or throws OracleError). */
  function gen(type, depth) {
    const leaf = depth <= 0;
    switch (type) {
      case 'int': {
        const forms = leaf ? ['lit'] : ['lit', 'arith', 'strlen', 'parens'];
        const form = pick(forms);
        if (form === 'lit') {
          const n = int(-9, 9);
          return { text: String(n), value: n };
        }
        if (form === 'strlen') {
          const s = gen('string', depth - 1);
          const value = s.value instanceof OracleError ? s.value : s.value.length;
          return { text: `${headText(s)}.length()`, value };
        }
        if (form === 'parens') {
          const inner = gen('int', depth - 1);
          return { text: `(${inner.text})`, value: inner.value };
        }
        const op = pick(['+', '-', '*', '/']);
        const l = gen('int', depth - 1);
        const r = gen('int', depth - 1);
        const value = combine(l.value, r.value, (a, b) => {
          if (op === '+') return a + b;
          if (op === '-') return a - b;
          if (op === '*') return a * b;
          if (b === 0) throw new OracleError('division by zero');
          return Math.trunc(a / b);
        });
        // Operands are parenthesized so the emitted TEXT re-parses as the
        // oracle's tree regardless of precedence.
        return { text: `(${l.text}) ${op} (${r.text})`, value };
      }
      case 'bool': {
        const forms = leaf ? ['lit'] : ['lit', 'compare', 'logic', 'not', 'parens'];
        const form = pick(forms);
        if (form === 'lit') {
          const b = rand() < 0.5;
          return { text: String(b), value: b };
        }
        if (form === 'not') {
          const inner = gen('bool', depth - 1);
          return { text: `!(${inner.text})`, value: not(inner.value) };
        }
        if (form === 'parens') {
          const inner = gen('bool', depth - 1);
          return { text: `(${inner.text})`, value: inner.value };
        }
        if (form === 'compare') {
          const op = pick(['<', '<=', '>', '>=']);
          const l = gen('int', depth - 1);
          const r = gen('int', depth - 1);
          const value = combine(l.value, r.value, (a, b) =>
            op === '<' ? a < b : op === '<=' ? a <= b : op === '>' ? a > b : a >= b
          );
          return { text: `(${l.text}) ${op} (${r.text})`, value };
        }
        const op = pick(['&&', '||']);
        const l = gen('bool', depth - 1);
        const r = gen('bool', depth - 1);
        // Short-circuit: the right side's error is skipped when the left decides.
        let value;
        if (l.value instanceof OracleError) value = l.value;
        else if (op === '&&') value = l.value === false ? false : r.value;
        else value = l.value === true ? true : r.value;
        return { text: `(${l.text}) ${op} (${r.text})`, value };
      }
      case 'string': {
        const forms = leaf ? ['lit'] : ['lit', 'concat', 'charAt', 'parens'];
        const form = pick(forms);
        if (form === 'lit') {
          const s = pick(STRING_POOL);
          return { text: JSON.stringify(s), value: s };
        }
        if (form === 'parens') {
          const inner = gen('string', depth - 1);
          return { text: `(${inner.text})`, value: inner.value };
        }
        if (form === 'concat') {
          const l = gen('string', depth - 1);
          const r = gen('string', depth - 1);
          return { text: `${headText(l)}.concat(${r.text})`, value: combine(l.value, r.value, (a, b) => a + b) };
        }
        const s = gen('string', depth - 1);
        const i = gen('int', depth - 1);
        const value = combine(s.value, i.value, (str, idx) => {
          if (idx < 0 || idx >= str.length) throw new OracleError(`string index ${idx} out of bounds for length ${str.length}`);
          return str.charAt(idx);
        });
        return { text: `${headText(s)}.charAt(${i.text})`, value };
      }
    }
    throw new Error(`unknown type ${type}`);
  }

  /** The receiver of a postfix operator must not read as a binary expression. */
  function headText(operand) {
    return /[ )]/.test(operand.text) && !operand.text.startsWith('(') ? `(${operand.text})` : operand.text;
  }

  function not(v) {
    return v instanceof OracleError ? v : !v;
  }

  function combine(l, r, fn) {
    if (l instanceof OracleError) return l;
    if (r instanceof OracleError) return r;
    try {
      return fn(l, r);
    } catch (error) {
      if (error instanceof OracleError) return error;
      throw error;
    }
  }

  return { gen, pick };
}

/* -- runners ----------------------------------------------------------------- */

function inMain(statement) {
  return `class Main {\n  public static void main(String[] args) {\n    ${statement}\n  }\n}`;
}

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

/** Oracle value -> the string println would produce (Java-style). */
function oracleOutput(value) {
  return typeof value === 'string' ? value : String(value);
}

function checkProgram(seed, verbose) {
  const rand = mulberry32(seed);
  const { gen, pick } = makeGen(rand);
  const type = pick(['int', 'bool', 'string', 'int', 'bool']);
  const expr = gen(type, 1 + Math.floor(rand() * 3));
  const source = inMain(`System.out.println(${expr.text});`);
  const expectError = expr.value instanceof OracleError;
  const problems = [];

  if (verbose) console.log(`seed ${seed}: ${expr.text}\n  oracle: ${expectError ? `ERROR ${expr.value.message}` : oracleOutput(expr.value)}`);

  // 1. Round-trip stability.
  try {
    const state1 = parseMiniJavaTextToWorkspaceState(source);
    const first = stateToCode(state1).code;
    const state2 = parseMiniJavaTextToWorkspaceState(first);
    const second = stateToCode(state2).code;
    if (second !== first) problems.push('roundtrip: regenerated text is not stable');
    if (JSON.stringify(canonical(state1.blocks.blocks)) !== JSON.stringify(canonical(state2.blocks.blocks))) {
      problems.push('roundtrip: block structure changed');
    }
  } catch (error) {
    problems.push(`roundtrip: ${error.message}`);
  }

  // 2. The five engines.
  const engines = {};
  for (const model of ['A', 'B']) {
    const report = runSource(source, undefined, model);
    engines[`machine${model}`] = report.status === 'done' ? { output: report.output } : { error: report.error ?? '' };
  }
  for (const strategy of ['structure', 'value']) {
    const report = evalSource(source, strategy);
    engines[strategy === 'structure' ? 'CbS' : 'CbV'] = { output: report.output };
  }
  const subst = runSubst(source);
  engines.subst =
    subst.status === 'done'
      ? { output: [subst.result.startsWith('"') ? JSON.parse(subst.result) : subst.result] }
      : { error: subst.error ?? '' };

  if (expectError) {
    const reason = expr.value.message;
    for (const name of ['machineA', 'machineB', 'subst']) {
      if (!('error' in engines[name])) problems.push(`${name}: expected error '${reason}', finished with ${JSON.stringify(engines[name].output)}`);
      else if (!engines[name].error.includes(reason)) problems.push(`${name}: expected error '${reason}', got '${engines[name].error}'`);
    }
    for (const name of ['CbS', 'CbV']) {
      const out = engines[name].output.join('\n');
      if (!out.includes('unknown(')) problems.push(`${name}: expected an unknown(...) value, got ${JSON.stringify(engines[name].output)}`);
    }
  } else {
    const expected = [oracleOutput(expr.value)];
    for (const name of ['machineA', 'machineB', 'CbS', 'CbV', 'subst']) {
      if ('error' in engines[name]) problems.push(`${name}: unexpected error '${engines[name].error}'`);
      else if (JSON.stringify(engines[name].output) !== JSON.stringify(expected)) {
        problems.push(`${name}: expected ${JSON.stringify(expected)}, got ${JSON.stringify(engines[name].output)}`);
      }
    }
  }

  return { source, expr, problems };
}

/* -- main --------------------------------------------------------------------- */

const argSeed = process.argv[2] ? Number(process.argv[2]) : null;
const seeds = argSeed !== null ? [argSeed] : Array.from({ length: 400 }, (_, i) => i + 1);

let failures = 0;
let errorPrograms = 0;
for (const seed of seeds) {
  const { source, expr, problems } = checkProgram(seed, argSeed !== null);
  if (expr.value instanceof OracleError) errorPrograms += 1;
  if (problems.length > 0) {
    failures += 1;
    console.log(`\nFAIL  seed ${seed}: ${expr.text}`);
    for (const problem of problems) console.log(`      ${problem}`);
    console.log(source.split('\n').map((line) => `      | ${line}`).join('\n'));
  }
}

console.log(
  `\n${seeds.length - failures}/${seeds.length} fuzz programs agree across machine A, machine B, CbS, CbV, substitution and the oracle` +
    ` (${errorPrograms} expected-error programs)${failures ? `, ${failures} FAILED` : ''}`
);
process.exit(failures ? 1 : 0);
