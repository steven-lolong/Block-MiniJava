import * as Blockly from 'blockly';

const INDENT = '  ';

type GenFn = (block: Blockly.Block) => string;

function safeIdentifier(value: string | null | undefined, fallback = 'id'): string {
  const clean = (value ?? '').trim().replace(/[^A-Za-z0-9_]/g, '');
  if (!clean) return fallback;
  if (/^[0-9]/.test(clean)) return `${fallback}${clean}`;
  return clean;
}

function field(block: Blockly.Block, name: string, fallback = 'id'): string {
  return safeIdentifier(block.getFieldValue(name), fallback);
}

function numField(block: Blockly.Block, name: string, fallback = '0'): string {
  const raw = block.getFieldValue(name);
  return raw === null || raw === undefined || raw === '' ? fallback : String(raw);
}

/** Emits a MiniJava string literal; the parser's unescape is the inverse. */
function escapeStringLiteral(raw: string): string {
  return raw
    .replace(/\\/g, '\\\\')
    .replace(/"/g, '\\"')
    .replace(/\n/g, '\\n')
    .replace(/\t/g, '\\t')
    .replace(/\r/g, '\\r');
}

function target(block: Blockly.Block, inputName: string): Blockly.Block | null {
  return block.getInputTargetBlock(inputName);
}

function expr(block: Blockly.Block, inputName: string, fallback = '0'): string {
  const child = target(block, inputName);
  return child ? generateBlock(child) : fallback;
}

// The head of a postfix expression (`x[i]`, `x.length`, `x.m()`). A bare `!`
// child must be parenthesized or the text re-parses with `!` outermost:
// `!x[0]` means `!(x[0])`, not `(!x)[0]`.
function postfixHead(block: Blockly.Block, inputName: string, fallback: string): string {
  const child = target(block, inputName);
  if (!child) return fallback;
  const code = generateBlock(child);
  return child.type === 'mj_expr_not' ? `(${code})` : code;
}

function typeCode(block: Blockly.Block, inputName: string, fallback = 'int'): string {
  const child = target(block, inputName);
  return child ? generateBlock(child) : fallback;
}

function indent(text: string, levels = 1): string {
  const prefix = INDENT.repeat(levels);
  return text
    .split('\n')
    .filter((line) => line.length > 0)
    .map((line) => `${prefix}${line}`)
    .join('\n');
}

function chain(start: Blockly.Block | null, levels = 0): string {
  const chunks: string[] = [];
  let current = start;
  while (current) {
    const code = generateBlock(current);
    if (code.trim()) chunks.push(levels > 0 ? indent(code, levels) : code);
    current = current.getNextBlock();
  }
  return chunks.join('\n');
}

function stack(block: Blockly.Block, inputName: string, levels = 1): string {
  return chain(target(block, inputName), levels);
}

function params(start: Blockly.Block | null): string {
  const parts: string[] = [];
  let current = start;
  while (current) {
    parts.push(`${typeCode(current, 'TYPE')} ${field(current, 'NAME', 'p')}`);
    current = current.getNextBlock();
  }
  return parts.join(', ');
}

function args(start: Blockly.Block | null): string {
  const parts: string[] = [];
  let current = start;
  while (current) {
    parts.push(expr(current, 'EXPR', '0'));
    current = current.getNextBlock();
  }
  return parts.join(', ');
}

const GEN: Record<string, GenFn> = {
  mj_goal(block) {
    const main = target(block, 'MAIN');
    const classes = stack(block, 'CLASSES', 0);
    const mainCode = main ? generateBlock(main) : 'class Main {\n  public static void main(String[] args) {\n  }\n}';
    return [mainCode, classes].filter(Boolean).join('\n\n');
  },

  mj_main_class(block) {
    const className = field(block, 'CLASS', 'Main');
    const argName = field(block, 'ARG', 'args');
    const statementCode = stack(block, 'STATEMENT', 2);
    return `class ${className} {\n${INDENT}public static void main(String[] ${argName}) {${statementCode ? `\n${statementCode}` : ''}\n${INDENT}}\n}`;
  },

  mj_class_declaration(block) {
    const className = field(block, 'CLASS', 'ClassName');
    const hasExtends = block.getFieldValue('HAS_EXTENDS') === 'TRUE';
    const extendsCode = hasExtends ? ` extends ${field(block, 'PARENT', 'ParentName')}` : '';
    const vars = stack(block, 'VARS', 1);
    const methods = stack(block, 'METHODS', 1);
    const body = [vars, methods].filter(Boolean).join('\n\n');
    return `class ${className}${extendsCode} {${body ? `\n${body}\n` : '\n'}}`;
  },

  mj_var_declaration(block) {
    return `${typeCode(block, 'TYPE')} ${field(block, 'NAME', 'x')};`;
  },

  mj_method_declaration(block) {
    const returnType = typeCode(block, 'TYPE');
    const name = field(block, 'NAME', 'method');
    const parameterCode = params(target(block, 'PARAMS'));
    const vars = stack(block, 'VARS', 1);
    const body = stack(block, 'BODY', 1);
    const ret = expr(block, 'RETURN', '0');
    const lines = [`public ${returnType} ${name}(${parameterCode}) {`];
    if (vars) lines.push(vars);
    if (body) lines.push(body);
    lines.push(`${INDENT}return ${ret};`);
    lines.push('}');
    return lines.join('\n');
  },

  mj_formal_parameter(block) {
    return `${typeCode(block, 'TYPE')} ${field(block, 'NAME', 'p')}`;
  },

  mj_type_int_array() {
    return 'int[]';
  },
  mj_type_boolean() {
    return 'boolean';
  },
  mj_type_int() {
    return 'int';
  },
  mj_type_string() {
    return 'String';
  },
  mj_type_identifier(block) {
    return field(block, 'NAME', 'ClassName');
  },

  mj_statement_block(block) {
    const body = stack(block, 'STATEMENTS', 1);
    return `{${body ? `\n${body}\n` : ''}}`;
  },
  mj_statement_if(block) {
    const cond = expr(block, 'COND', 'true');
    const thenCode = stack(block, 'THEN', 1);
    const elseCode = stack(block, 'ELSE', 1);
    return `if (${cond}) {${thenCode ? `\n${thenCode}\n` : '\n'}} else {${elseCode ? `\n${elseCode}\n` : '\n'}}`;
  },
  mj_statement_while(block) {
    const cond = expr(block, 'COND', 'true');
    const body = stack(block, 'BODY', 1);
    return `while (${cond}) {${body ? `\n${body}\n` : '\n'}}`;
  },
  mj_statement_print(block) {
    return `System.out.println(${expr(block, 'VALUE', '0')});`;
  },
  mj_statement_assign(block) {
    return `${field(block, 'NAME', 'x')} = ${expr(block, 'VALUE', '0')};`;
  },
  mj_statement_array_assign(block) {
    return `${field(block, 'NAME', 'array')}[${expr(block, 'INDEX', '0')}] = ${expr(block, 'VALUE', '0')};`;
  },

  mj_expr_arith(block) {
    const op = ['+', '-', '*'].includes(block.getFieldValue('OP')) ? block.getFieldValue('OP') : '+';
    return `(${expr(block, 'LEFT', '0')} ${op} ${expr(block, 'RIGHT', '0')})`;
  },
  mj_expr_compare(block) {
    return `(${expr(block, 'LEFT', '0')} < ${expr(block, 'RIGHT', '0')})`;
  },
  mj_expr_logic(block) {
    return `(${expr(block, 'LEFT', 'true')} && ${expr(block, 'RIGHT', 'true')})`;
  },
  mj_expr_array_lookup(block) {
    return `${postfixHead(block, 'ARRAY', 'array')}[${expr(block, 'INDEX', '0')}]`;
  },
  mj_expr_array_length(block) {
    return `${postfixHead(block, 'ARRAY', 'array')}.length`;
  },
  mj_expr_char_at(block) {
    return `${postfixHead(block, 'STR', '""')}.charAt(${expr(block, 'INDEX', '0')})`;
  },
  mj_expr_concat(block) {
    return `${postfixHead(block, 'LEFT', '""')}.concat(${expr(block, 'RIGHT', '""')})`;
  },
  mj_expr_str_length(block) {
    return `${postfixHead(block, 'STR', '""')}.length()`;
  },
  mj_expr_method_call(block) {
    return `${postfixHead(block, 'OBJECT', 'this')}.${field(block, 'METHOD', 'method')}(${args(target(block, 'ARGS'))})`;
  },
  mj_argument_item(block) {
    return expr(block, 'EXPR', '0');
  },
  mj_expr_integer(block) {
    return numField(block, 'VALUE');
  },
  mj_expr_string(block) {
    return `"${escapeStringLiteral(String(block.getFieldValue('TEXT') ?? ''))}"`;
  },
  mj_expr_boolean(block) {
    return block.getFieldValue('VALUE') === 'true' ? 'true' : 'false';
  },
  mj_expr_identifier(block) {
    return field(block, 'NAME', 'x');
  },
  mj_expr_this() {
    return 'this';
  },
  mj_expr_new_int_array(block) {
    return `new int[${expr(block, 'SIZE', '0')}]`;
  },
  mj_expr_new_object(block) {
    return `new ${field(block, 'CLASS', 'ClassName')}()`;
  },
  mj_expr_not(block) {
    return `!${expr(block, 'EXPR', 'true')}`;
  },
  mj_expr_parens(block) {
    return `(${expr(block, 'EXPR', '0')})`;
  }
};

export function generateBlock(block: Blockly.Block): string {
  const fn = GEN[block.type];
  if (!fn) return '';
  return fn(block);
}

export function generateMiniJava(workspace: Blockly.WorkspaceSvg): string {
  const topBlocks = workspace.getTopBlocks(true);
  const goal = topBlocks.find((block) => block.type === 'mj_goal');
  if (goal) return generateBlock(goal);
  const generated = topBlocks
    .map((block) => generateBlock(block))
    .filter((code) => code.trim().length > 0)
    .join('\n\n');
  return generated || sampleMiniJava();
}

export function sampleMiniJava(): string {
  return `class Main {\n  public static void main(String[] args) {\n    System.out.println(0);\n  }\n}`;
}
