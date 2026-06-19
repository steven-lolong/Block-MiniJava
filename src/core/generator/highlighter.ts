const KEYWORDS = new Set([
  'class', 'public', 'static', 'void', 'main', 'String', 'extends', 'return',
  'int', 'boolean', 'if', 'else', 'while', 'true', 'false', 'this', 'new',
  'System', 'out', 'println', 'length'
]);

const TYPES = new Set(['int', 'boolean', 'String']);
const OPERATORS = new Set(['&&', '<', '+', '-', '*', '!', '=', '.', ';', ',', '[', ']', '(', ')', '{', '}']);

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}

function cls(kind: string, text: string): string {
  return `<span class="tok tok-${kind}">${escapeHtml(text)}</span>`;
}

export function highlightMiniJava(code: string): string {
  const tokenPattern = /(\/\/.*$)|([A-Za-z_][A-Za-z0-9_]*)|(\d+)|(&&|[{}()[\].,;=+\-*<!])|(\s+)|(.)/gm;
  return code.replace(tokenPattern, (match, comment, ident, number, operator, whitespace, unknown) => {
    if (comment) return cls('comment', comment);
    if (ident) {
      if (TYPES.has(ident)) return cls('type', ident);
      if (KEYWORDS.has(ident)) return cls('keyword', ident);
      return cls('identifier', ident);
    }
    if (number) return cls('number', number);
    if (operator) {
      const kind = OPERATORS.has(operator) ? 'operator' : 'punctuation';
      return cls(kind, operator);
    }
    if (whitespace) return whitespace;
    return escapeHtml(unknown ?? match);
  });
}
