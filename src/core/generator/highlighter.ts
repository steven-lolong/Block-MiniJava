/**
 * MiniJava syntax highlighter for the code panel and the editable overlay.
 *
 * Single-pass tokenizer + neighbor-aware classification, so contextual
 * words are colored by role rather than by value: `System.out.println`
 * and `.length` read as builtins, `class Fac` / `new Fac()` as type
 * names, while user variables that happen to be called `main` or
 * `length` stay plain identifiers.
 */

// Structurally reserved words (mirrors the text parser).
const KEYWORDS = new Set([
  'class', 'public', 'static', 'void', 'extends', 'return',
  'if', 'else', 'while', 'true', 'false', 'this', 'new'
]);

const TYPES = new Set(['int', 'boolean', 'String']);
const MEMBER_BUILTINS = new Set(['out', 'println', 'length', 'charAt', 'concat']);
const OPERATORS = new Set(['&&', '||', '<', '<=', '>', '>=', '+', '-', '*', '/', '!', '=']);

type RawToken = {
  kind: 'comment' | 'word' | 'number' | 'string' | 'symbol' | 'space' | 'other';
  text: string;
};

const WORD_START = /[A-Za-z_]/;
const WORD_PART = /[A-Za-z0-9_]/;
const DIGIT = /[0-9]/;

function tokenize(code: string): RawToken[] {
  const tokens: RawToken[] = [];
  let index = 0;

  while (index < code.length) {
    const char = code[index];

    if (char === '/' && code[index + 1] === '/') {
      let end = index;
      while (end < code.length && code[end] !== '\n') end += 1;
      tokens.push({ kind: 'comment', text: code.slice(index, end) });
      index = end;
      continue;
    }

    if (char === '/' && code[index + 1] === '*') {
      let end = index + 2;
      while (end < code.length && !(code[end] === '*' && code[end + 1] === '/')) end += 1;
      end = end < code.length ? end + 2 : code.length;
      tokens.push({ kind: 'comment', text: code.slice(index, end) });
      index = end;
      continue;
    }

    if (WORD_START.test(char)) {
      let end = index + 1;
      while (end < code.length && WORD_PART.test(code[end])) end += 1;
      tokens.push({ kind: 'word', text: code.slice(index, end) });
      index = end;
      continue;
    }

    if (DIGIT.test(char)) {
      let end = index + 1;
      while (end < code.length && DIGIT.test(code[end])) end += 1;
      tokens.push({ kind: 'number', text: code.slice(index, end) });
      index = end;
      continue;
    }

    if (char === '"') {
      // String literal: scan to the closing quote, skipping escapes, but
      // never across a newline (an unterminated literal stays on one line).
      let end = index + 1;
      while (end < code.length && code[end] !== '"' && code[end] !== '\n') {
        end += code[end] === '\\' ? 2 : 1;
      }
      if (end < code.length && code[end] === '"') end += 1;
      tokens.push({ kind: 'string', text: code.slice(index, end) });
      index = end;
      continue;
    }

    const twoChar = code.slice(index, index + 2);
    if (twoChar === '&&' || twoChar === '||' || twoChar === '<=' || twoChar === '>=') {
      tokens.push({ kind: 'symbol', text: twoChar });
      index += 2;
      continue;
    }

    // A lone '/' is division (the comment forms were consumed above).
    if ('{}()[].,;=+-*/<>!'.includes(char)) {
      tokens.push({ kind: 'symbol', text: char });
      index += 1;
      continue;
    }

    if (/\s/.test(char)) {
      let end = index + 1;
      while (end < code.length && /\s/.test(code[end])) end += 1;
      tokens.push({ kind: 'space', text: code.slice(index, end) });
      index = end;
      continue;
    }

    tokens.push({ kind: 'other', text: char });
    index += 1;
  }

  return tokens;
}

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}

function span(kind: string, text: string): string {
  return `<span class="tok tok-${kind}">${escapeHtml(text)}</span>`;
}

/** The nearest non-space, non-comment neighbor token. */
function significant(tokens: RawToken[], from: number, step: -1 | 1): RawToken | null {
  for (let i = from + step; i >= 0 && i < tokens.length; i += step) {
    const token = tokens[i];
    if (token.kind !== 'space' && token.kind !== 'comment') return token;
  }
  return null;
}

function classifyWord(tokens: RawToken[], index: number): string {
  const value = tokens[index].text;
  if (TYPES.has(value)) return 'type';
  if (KEYWORDS.has(value)) return 'keyword';

  const previous = significant(tokens, index, -1);
  const next = significant(tokens, index, 1);

  // Class-name positions: class Foo, extends Foo, new Foo().
  if (previous?.kind === 'word' && (previous.text === 'class' || previous.text === 'extends' || previous.text === 'new')) {
    return 'type';
  }

  // Member positions: x.length, System.out, System.out.println(...).
  if (previous?.text === '.') {
    if (next?.text === '(' && !MEMBER_BUILTINS.has(value)) return 'method';
    return MEMBER_BUILTINS.has(value) ? 'builtin' : 'identifier';
  }

  if (value === 'System' && next?.text === '.') return 'builtin';
  if (value === 'main' && next?.text === '(') return 'builtin';

  // Declarations and calls: public int mix(...), foo(...).
  if (next?.text === '(') return 'method';

  return 'identifier';
}

export function highlightMiniJava(code: string): string {
  const tokens = tokenize(code);
  const parts: string[] = [];

  for (let index = 0; index < tokens.length; index += 1) {
    const token = tokens[index];
    switch (token.kind) {
      case 'comment':
        parts.push(span('comment', token.text));
        break;
      case 'word':
        parts.push(span(classifyWord(tokens, index), token.text));
        break;
      case 'number':
        parts.push(span('number', token.text));
        break;
      case 'string':
        parts.push(span('string', token.text));
        break;
      case 'symbol':
        parts.push(span(OPERATORS.has(token.text) ? 'operator' : 'punctuation', token.text));
        break;
      case 'space':
        parts.push(token.text);
        break;
      default:
        parts.push(escapeHtml(token.text));
    }
  }

  return parts.join('');
}
