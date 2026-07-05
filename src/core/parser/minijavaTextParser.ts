type MiniJavaTypeAst =
  | { kind: 'intArray' }
  | { kind: 'boolean' }
  | { kind: 'int' }
  | { kind: 'identifier'; name: string };

type MiniJavaProgramAst = {
  main: MiniJavaMainClassAst;
  classes: MiniJavaClassAst[];
};

type MiniJavaMainClassAst = {
  className: string;
  argumentName: string;
  statements: MiniJavaStatementAst[];
};

type MiniJavaClassAst = {
  className: string;
  parentName?: string;
  vars: MiniJavaVarAst[];
  methods: MiniJavaMethodAst[];
};

type MiniJavaVarAst = {
  type: MiniJavaTypeAst;
  name: string;
};

type MiniJavaMethodAst = {
  returnType: MiniJavaTypeAst;
  name: string;
  params: MiniJavaVarAst[];
  vars: MiniJavaVarAst[];
  statements: MiniJavaStatementAst[];
  returnExpr: MiniJavaExpressionAst;
};

type MiniJavaStatementAst =
  | { kind: 'block'; statements: MiniJavaStatementAst[] }
  | { kind: 'if'; cond: MiniJavaExpressionAst; thenStatements: MiniJavaStatementAst[]; elseStatements: MiniJavaStatementAst[] }
  | { kind: 'while'; cond: MiniJavaExpressionAst; bodyStatements: MiniJavaStatementAst[] }
  | { kind: 'print'; value: MiniJavaExpressionAst }
  | { kind: 'assign'; name: string; value: MiniJavaExpressionAst }
  | { kind: 'arrayAssign'; name: string; index: MiniJavaExpressionAst; value: MiniJavaExpressionAst };

type BinaryOperator = '&&' | '<' | '+' | '-' | '*';

type MiniJavaExpressionAst =
  | { kind: 'binary'; op: BinaryOperator; left: MiniJavaExpressionAst; right: MiniJavaExpressionAst }
  | { kind: 'arrayLookup'; array: MiniJavaExpressionAst; index: MiniJavaExpressionAst }
  | { kind: 'arrayLength'; array: MiniJavaExpressionAst }
  | { kind: 'methodCall'; object: MiniJavaExpressionAst; method: string; args: MiniJavaExpressionAst[] }
  | { kind: 'integer'; value: number }
  | { kind: 'true' }
  | { kind: 'false' }
  | { kind: 'identifier'; name: string }
  | { kind: 'this' }
  | { kind: 'newIntArray'; size: MiniJavaExpressionAst }
  | { kind: 'newObject'; className: string }
  | { kind: 'not'; expr: MiniJavaExpressionAst };

export type MiniJavaBlockState = {
  type: string;
  x?: number;
  y?: number;
  deletable?: boolean;
  movable?: boolean;
  fields?: Record<string, string | number>;
  inputs?: Record<string, { block: MiniJavaBlockState }>;
  next?: { block: MiniJavaBlockState };
};

export type MiniJavaWorkspaceState = {
  blocks: {
    languageVersion: number;
    blocks: MiniJavaBlockState[];
  };
};

type TokenKind = 'identifier' | 'number' | 'keyword' | 'symbol' | 'eof';

type Token = {
  kind: TokenKind;
  value: string;
  index: number;
};

// Structurally reserved words only. `main`, `String`, `System`, `out`,
// `println` and `length` stay ordinary identifiers (they are valid Java
// names and the generator can emit them); the parser matches them by value
// in the few positions where they are meaningful.
const KEYWORDS = new Set([
  'class', 'public', 'static', 'void', 'extends', 'return',
  'int', 'boolean', 'if', 'else', 'while', 'true', 'false', 'this', 'new'
]);

// Words that can never be used as identifiers; block name fields validate
// against this so every block program stays convertible to text and back.
export const MINI_JAVA_RESERVED_WORDS: ReadonlySet<string> = KEYWORDS;

const WHITESPACE_PATTERN = /\s/;
const IDENTIFIER_START_PATTERN = /[A-Za-z_]/;
const IDENTIFIER_PART_PATTERN = /[A-Za-z0-9_]/;
const DIGIT_PATTERN = /\d/;

export class MiniJavaTextParseError extends Error {
  constructor(message: string, readonly index: number) {
    super(message);
    this.name = 'MiniJavaTextParseError';
  }
}

function sanitizeIdentifier(value: string, fallback = 'id'): string {
  const clean = value.trim().replace(/[^A-Za-z0-9_]/g, '');
  if (!clean) return fallback;
  return /^[0-9]/.test(clean) ? `${fallback}${clean}` : clean;
}

function tokenize(source: string): Token[] {
  const tokens: Token[] = [];
  let index = 0;

  while (index < source.length) {
    const char = source[index];

    if (WHITESPACE_PATTERN.test(char)) {
      index += 1;
      continue;
    }

    if (char === '/' && source[index + 1] === '/') {
      index += 2;
      while (index < source.length && source[index] !== '\n') index += 1;
      continue;
    }

    if (char === '/' && source[index + 1] === '*') {
      const start = index;
      index += 2;
      while (index < source.length && !(source[index] === '*' && source[index + 1] === '/')) index += 1;
      if (index >= source.length) throw new MiniJavaTextParseError('Unterminated block comment.', start);
      index += 2;
      continue;
    }

    if (IDENTIFIER_START_PATTERN.test(char)) {
      const start = index;
      index += 1;
      while (index < source.length && IDENTIFIER_PART_PATTERN.test(source[index])) index += 1;
      const value = source.slice(start, index);
      tokens.push({ kind: KEYWORDS.has(value) ? 'keyword' : 'identifier', value, index: start });
      continue;
    }

    if (DIGIT_PATTERN.test(char)) {
      const start = index;
      index += 1;
      while (index < source.length && DIGIT_PATTERN.test(source[index])) index += 1;
      tokens.push({ kind: 'number', value: source.slice(start, index), index: start });
      continue;
    }

    if (source.slice(index, index + 2) === '&&') {
      tokens.push({ kind: 'symbol', value: '&&', index });
      index += 2;
      continue;
    }

    if ('{}()[].,;=+-*<!'.includes(char)) {
      tokens.push({ kind: 'symbol', value: char, index });
      index += 1;
      continue;
    }

    throw new MiniJavaTextParseError(`Unexpected character "${char}".`, index);
  }

  tokens.push({ kind: 'eof', value: '', index: source.length });
  return tokens;
}

class Parser {
  private position = 0;

  constructor(private readonly tokens: Token[]) {}

  parseGoal(): MiniJavaProgramAst {
    const main = this.parseMainClass();
    const classes: MiniJavaClassAst[] = [];

    while (this.current().kind !== 'eof') {
      classes.push(this.parseClassDeclaration());
    }

    this.expectKind('eof', 'Expected end of MiniJava program.');
    return { main, classes };
  }

  private current(): Token {
    return this.tokens[this.position];
  }

  private peek(offset = 1): Token {
    return this.tokens[this.position + offset] ?? this.tokens[this.tokens.length - 1];
  }

  private advance(): Token {
    const token = this.current();
    this.position = Math.min(this.position + 1, this.tokens.length - 1);
    return token;
  }

  private matches(value: string): boolean {
    return this.current().value === value;
  }

  private consume(value: string): boolean {
    if (!this.matches(value)) return false;
    this.advance();
    return true;
  }

  private expectValue(value: string, message: string): Token {
    if (!this.matches(value)) throw new MiniJavaTextParseError(message, this.current().index);
    return this.advance();
  }

  private expectKind(kind: TokenKind, message: string): Token {
    if (this.current().kind !== kind) throw new MiniJavaTextParseError(message, this.current().index);
    return this.advance();
  }

  private expectIdentifier(message = 'Expected an identifier.'): string {
    const token = this.expectKind('identifier', message);
    return sanitizeIdentifier(token.value);
  }

  private parseMainClass(): MiniJavaMainClassAst {
    this.expectValue('class', 'Expected MiniJava program to start with a main class.');
    const className = this.expectIdentifier('Expected the main class name after "class".');
    this.expectValue('{', 'Expected "{" after main class name.');
    this.expectValue('public', 'Expected "public static void main" in the main class.');
    this.expectValue('static', 'Expected "static" in the main method.');
    this.expectValue('void', 'Expected "void" in the main method.');
    this.expectValue('main', 'Expected "main" method.');
    this.expectValue('(', 'Expected "(" after main.');
    this.expectValue('String', 'Expected "String[]" main argument type.');
    this.expectValue('[', 'Expected "[" in String[] main argument type.');
    this.expectValue(']', 'Expected "]" in String[] main argument type.');
    const argumentName = this.expectIdentifier('Expected main argument name.');
    this.expectValue(')', 'Expected ")" after main argument.');
    this.expectValue('{', 'Expected "{" before main body.');

    const statements: MiniJavaStatementAst[] = [];
    while (!this.matches('}')) {
      statements.push(this.parseStatement());
    }

    this.expectValue('}', 'Expected "}" after main body.');
    this.expectValue('}', 'Expected "}" after main class.');
    return { className, argumentName, statements };
  }

  private parseClassDeclaration(): MiniJavaClassAst {
    this.expectValue('class', 'Expected class declaration.');
    const className = this.expectIdentifier('Expected class name.');
    const parentName = this.consume('extends') ? this.expectIdentifier('Expected superclass name after "extends".') : undefined;
    const vars: MiniJavaVarAst[] = [];
    const methods: MiniJavaMethodAst[] = [];

    this.expectValue('{', 'Expected "{" after class header.');
    while (!this.matches('}')) {
      if (this.matches('public')) {
        methods.push(this.parseMethodDeclaration());
      } else {
        vars.push(this.parseVarDeclaration());
      }
    }
    this.expectValue('}', 'Expected "}" after class declaration.');

    return { className, parentName, vars, methods };
  }

  private parseMethodDeclaration(): MiniJavaMethodAst {
    this.expectValue('public', 'Expected public method declaration.');
    const returnType = this.parseType();
    const name = this.expectIdentifier('Expected method name.');
    const params: MiniJavaVarAst[] = [];
    const vars: MiniJavaVarAst[] = [];
    const statements: MiniJavaStatementAst[] = [];

    this.expectValue('(', 'Expected "(" after method name.');
    if (!this.matches(')')) {
      params.push(this.parseFormalParameter());
      while (this.consume(',')) params.push(this.parseFormalParameter());
    }
    this.expectValue(')', 'Expected ")" after method parameters.');
    this.expectValue('{', 'Expected "{" before method body.');

    while (this.startsVarDeclaration()) {
      vars.push(this.parseVarDeclaration());
    }

    while (!this.matches('return')) {
      if (this.matches('}')) {
        throw new MiniJavaTextParseError('Expected return statement before method end.', this.current().index);
      }
      statements.push(this.parseStatement());
    }

    this.expectValue('return', 'Expected return statement.');
    const returnExpr = this.parseExpression();
    this.expectValue(';', 'Expected ";" after return expression.');
    this.expectValue('}', 'Expected "}" after method declaration.');

    return { returnType, name, params, vars, statements, returnExpr };
  }

  private parseVarDeclaration(): MiniJavaVarAst {
    const type = this.parseType();
    const name = this.expectIdentifier('Expected variable name.');
    this.expectValue(';', 'Expected ";" after variable declaration.');
    return { type, name };
  }

  private parseFormalParameter(): MiniJavaVarAst {
    const type = this.parseType();
    const name = this.expectIdentifier('Expected parameter name.');
    return { type, name };
  }

  private startsVarDeclaration(): boolean {
    const token = this.current();
    if (token.value === 'int') {
      if (this.peek().value === '[') return this.peek(2).value === ']' && this.peek(3).kind === 'identifier';
      return this.peek().kind === 'identifier';
    }
    if (token.value === 'boolean') return this.peek().kind === 'identifier';
    return token.kind === 'identifier' && this.peek().kind === 'identifier';
  }

  private parseType(): MiniJavaTypeAst {
    if (this.consume('int')) {
      if (this.consume('[')) {
        this.expectValue(']', 'Expected "]" after int[.');
        return { kind: 'intArray' };
      }
      return { kind: 'int' };
    }
    if (this.consume('boolean')) return { kind: 'boolean' };
    return { kind: 'identifier', name: this.expectIdentifier('Expected type.') };
  }

  private parseStatement(): MiniJavaStatementAst {
    if (this.matches('{')) return { kind: 'block', statements: this.parseBracedStatements('Expected "}" after block statement.') };

    if (this.consume('if')) {
      this.expectValue('(', 'Expected "(" after if.');
      const cond = this.parseExpression();
      this.expectValue(')', 'Expected ")" after if condition.');
      const thenStatements = this.parseBranchStatements();
      this.expectValue('else', 'Expected else branch.');
      const elseStatements = this.parseBranchStatements();
      return { kind: 'if', cond, thenStatements, elseStatements };
    }

    if (this.consume('while')) {
      this.expectValue('(', 'Expected "(" after while.');
      const cond = this.parseExpression();
      this.expectValue(')', 'Expected ")" after while condition.');
      return { kind: 'while', cond, bodyStatements: this.parseBranchStatements() };
    }

    if (this.matches('System') && this.peek().value === '.') {
      this.advance();
      this.expectValue('.', 'Expected "." after System.');
      this.expectValue('out', 'Expected "out" in System.out.println.');
      this.expectValue('.', 'Expected "." after System.out.');
      this.expectValue('println', 'Expected "println" in System.out.println.');
      this.expectValue('(', 'Expected "(" before println expression.');
      const value = this.parseExpression();
      this.expectValue(')', 'Expected ")" after println expression.');
      this.expectValue(';', 'Expected ";" after println statement.');
      return { kind: 'print', value };
    }

    const name = this.expectIdentifier('Expected statement.');
    if (this.consume('[')) {
      const index = this.parseExpression();
      this.expectValue(']', 'Expected "]" after array assignment index.');
      this.expectValue('=', 'Expected "=" in array assignment.');
      const value = this.parseExpression();
      this.expectValue(';', 'Expected ";" after array assignment.');
      return { kind: 'arrayAssign', name, index, value };
    }

    this.expectValue('=', 'Expected "=" in assignment.');
    const value = this.parseExpression();
    this.expectValue(';', 'Expected ";" after assignment.');
    return { kind: 'assign', name, value };
  }

  private parseBracedStatements(closeMessage: string): MiniJavaStatementAst[] {
    this.expectValue('{', 'Expected "{" before statement block.');
    const statements: MiniJavaStatementAst[] = [];
    while (!this.matches('}')) statements.push(this.parseStatement());
    this.expectValue('}', closeMessage);
    return statements;
  }

  private parseBranchStatements(): MiniJavaStatementAst[] {
    if (this.matches('{')) return this.parseBracedStatements('Expected "}" after branch body.');
    return [this.parseStatement()];
  }

  private parseExpression(): MiniJavaExpressionAst {
    return this.parseAnd();
  }

  private parseAnd(): MiniJavaExpressionAst {
    let left = this.parseLessThan();
    while (this.consume('&&')) {
      left = { kind: 'binary', op: '&&', left, right: this.parseLessThan() };
    }
    return left;
  }

  private parseLessThan(): MiniJavaExpressionAst {
    let left = this.parseAdditive();
    while (this.consume('<')) {
      left = { kind: 'binary', op: '<', left, right: this.parseAdditive() };
    }
    return left;
  }

  private parseAdditive(): MiniJavaExpressionAst {
    let left = this.parseMultiplicative();
    while (this.matches('+') || this.matches('-')) {
      const op = this.advance().value as '+' | '-';
      left = { kind: 'binary', op, left, right: this.parseMultiplicative() };
    }
    return left;
  }

  private parseMultiplicative(): MiniJavaExpressionAst {
    let left = this.parseUnary();
    while (this.consume('*')) {
      left = { kind: 'binary', op: '*', left, right: this.parseUnary() };
    }
    return left;
  }

  private parseUnary(): MiniJavaExpressionAst {
    if (this.consume('!')) return { kind: 'not', expr: this.parseUnary() };
    return this.parsePostfix();
  }

  private parsePostfix(): MiniJavaExpressionAst {
    let expression = this.parsePrimary();

    while (true) {
      if (this.consume('[')) {
        const index = this.parseExpression();
        this.expectValue(']', 'Expected "]" after array lookup index.');
        expression = { kind: 'arrayLookup', array: expression, index };
        continue;
      }

      if (this.consume('.')) {
        // `.length` is array length unless it is called like a method.
        if (this.matches('length') && this.peek().value !== '(') {
          this.advance();
          expression = { kind: 'arrayLength', array: expression };
          continue;
        }

        const method = this.expectIdentifier('Expected method name after ".".');
        this.expectValue('(', 'Expected "(" after method name.');
        const args: MiniJavaExpressionAst[] = [];
        if (!this.matches(')')) {
          args.push(this.parseExpression());
          while (this.consume(',')) args.push(this.parseExpression());
        }
        this.expectValue(')', 'Expected ")" after method arguments.');
        expression = { kind: 'methodCall', object: expression, method, args };
        continue;
      }

      return expression;
    }
  }

  private parsePrimary(): MiniJavaExpressionAst {
    const token = this.current();

    if (token.kind === 'number') {
      this.advance();
      return { kind: 'integer', value: Number(token.value) };
    }

    // The integer-literal block accepts negative values, so the generated
    // text can contain them even though MiniJava has no unary minus.
    if (token.value === '-' && this.peek().kind === 'number') {
      this.advance();
      return { kind: 'integer', value: -Number(this.advance().value) };
    }

    if (this.consume('true')) return { kind: 'true' };
    if (this.consume('false')) return { kind: 'false' };
    if (this.consume('this')) return { kind: 'this' };

    if (this.consume('new')) {
      if (this.consume('int')) {
        this.expectValue('[', 'Expected "[" after new int.');
        const size = this.parseExpression();
        this.expectValue(']', 'Expected "]" after new int array size.');
        return { kind: 'newIntArray', size };
      }

      const className = this.expectIdentifier('Expected class name after new.');
      this.expectValue('(', 'Expected "(" after new object class name.');
      this.expectValue(')', 'Expected ")" after new object class name.');
      return { kind: 'newObject', className };
    }

    if (this.consume('(')) {
      // Parentheses are purely syntactic: the block structure carries the
      // grouping, so redundant parens (including the generator's own
      // parenthesization) always normalize away on import.
      const expr = this.parseExpression();
      this.expectValue(')', 'Expected ")" after parenthesized expression.');
      return expr;
    }

    if (token.kind === 'identifier') {
      return { kind: 'identifier', name: this.expectIdentifier() };
    }

    throw new MiniJavaTextParseError(`Expected MiniJava expression, found "${token.value || 'end of file'}".`, token.index);
  }
}

function sequence(states: MiniJavaBlockState[]): MiniJavaBlockState | undefined {
  if (states.length === 0) return undefined;
  for (const state of states) delete state.next;
  for (let index = 0; index < states.length - 1; index += 1) {
    states[index].next = { block: states[index + 1] };
  }
  return states[0];
}

function setInput(state: MiniJavaBlockState, name: string, child: MiniJavaBlockState | undefined): void {
  if (!child) return;
  if (!state.inputs) state.inputs = {};
  state.inputs[name] = { block: child };
}

function typeState(type: MiniJavaTypeAst): MiniJavaBlockState {
  switch (type.kind) {
    case 'intArray':
      return { type: 'mj_type_int_array' };
    case 'boolean':
      return { type: 'mj_type_boolean' };
    case 'int':
      return { type: 'mj_type_int' };
    case 'identifier':
      return { type: 'mj_type_identifier', fields: { NAME: type.name } };
  }
}

function varState(variable: MiniJavaVarAst): MiniJavaBlockState {
  const state: MiniJavaBlockState = { type: 'mj_var_declaration', fields: { NAME: variable.name } };
  setInput(state, 'TYPE', typeState(variable.type));
  return state;
}

function formalState(variable: MiniJavaVarAst): MiniJavaBlockState {
  const state: MiniJavaBlockState = { type: 'mj_formal_parameter', fields: { NAME: variable.name } };
  setInput(state, 'TYPE', typeState(variable.type));
  return state;
}

function methodState(method: MiniJavaMethodAst): MiniJavaBlockState {
  const state: MiniJavaBlockState = { type: 'mj_method_declaration', fields: { NAME: method.name } };
  setInput(state, 'TYPE', typeState(method.returnType));
  setInput(state, 'PARAMS', sequence(method.params.map(formalState)));
  setInput(state, 'VARS', sequence(method.vars.map(varState)));
  setInput(state, 'BODY', sequence(method.statements.map(statementState)));
  setInput(state, 'RETURN', expressionState(method.returnExpr));
  return state;
}

function classState(classDeclaration: MiniJavaClassAst): MiniJavaBlockState {
  const state: MiniJavaBlockState = classDeclaration.parentName
    ? {
      type: 'mj_class_extends_declaration',
      fields: { CLASS: classDeclaration.className, PARENT: classDeclaration.parentName }
    }
    : { type: 'mj_class_declaration', fields: { CLASS: classDeclaration.className } };

  setInput(state, 'VARS', sequence(classDeclaration.vars.map(varState)));
  setInput(state, 'METHODS', sequence(classDeclaration.methods.map(methodState)));
  return state;
}

function statementState(statement: MiniJavaStatementAst): MiniJavaBlockState {
  switch (statement.kind) {
    case 'block': {
      const state: MiniJavaBlockState = { type: 'mj_statement_block' };
      setInput(state, 'STATEMENTS', sequence(statement.statements.map(statementState)));
      return state;
    }
    case 'if': {
      const state: MiniJavaBlockState = { type: 'mj_statement_if' };
      setInput(state, 'COND', expressionState(statement.cond));
      setInput(state, 'THEN', sequence(statement.thenStatements.map(statementState)));
      setInput(state, 'ELSE', sequence(statement.elseStatements.map(statementState)));
      return state;
    }
    case 'while': {
      const state: MiniJavaBlockState = { type: 'mj_statement_while' };
      setInput(state, 'COND', expressionState(statement.cond));
      setInput(state, 'BODY', sequence(statement.bodyStatements.map(statementState)));
      return state;
    }
    case 'print': {
      const state: MiniJavaBlockState = { type: 'mj_statement_print' };
      setInput(state, 'VALUE', expressionState(statement.value));
      return state;
    }
    case 'assign': {
      const state: MiniJavaBlockState = { type: 'mj_statement_assign', fields: { NAME: statement.name } };
      setInput(state, 'VALUE', expressionState(statement.value));
      return state;
    }
    case 'arrayAssign': {
      const state: MiniJavaBlockState = { type: 'mj_statement_array_assign', fields: { NAME: statement.name } };
      setInput(state, 'INDEX', expressionState(statement.index));
      setInput(state, 'VALUE', expressionState(statement.value));
      return state;
    }
  }
}

function argumentState(expression: MiniJavaExpressionAst): MiniJavaBlockState {
  const state: MiniJavaBlockState = { type: 'mj_argument_item' };
  setInput(state, 'EXPR', expressionState(expression));
  return state;
}

function expressionState(expression: MiniJavaExpressionAst): MiniJavaBlockState {
  switch (expression.kind) {
    case 'binary': {
      const typeByOperator: Record<BinaryOperator, string> = {
        '&&': 'mj_expr_and',
        '<': 'mj_expr_less',
        '+': 'mj_expr_plus',
        '-': 'mj_expr_minus',
        '*': 'mj_expr_times'
      };
      const state: MiniJavaBlockState = { type: typeByOperator[expression.op] };
      setInput(state, 'LEFT', expressionState(expression.left));
      setInput(state, 'RIGHT', expressionState(expression.right));
      return state;
    }
    case 'arrayLookup': {
      const state: MiniJavaBlockState = { type: 'mj_expr_array_lookup' };
      setInput(state, 'ARRAY', expressionState(expression.array));
      setInput(state, 'INDEX', expressionState(expression.index));
      return state;
    }
    case 'arrayLength': {
      const state: MiniJavaBlockState = { type: 'mj_expr_array_length' };
      setInput(state, 'ARRAY', expressionState(expression.array));
      return state;
    }
    case 'methodCall': {
      const state: MiniJavaBlockState = { type: 'mj_expr_method_call', fields: { METHOD: expression.method } };
      setInput(state, 'OBJECT', expressionState(expression.object));
      setInput(state, 'ARGS', sequence(expression.args.map(argumentState)));
      return state;
    }
    case 'integer':
      return { type: 'mj_expr_integer', fields: { VALUE: expression.value } };
    case 'true':
      return { type: 'mj_expr_true' };
    case 'false':
      return { type: 'mj_expr_false' };
    case 'identifier':
      return { type: 'mj_expr_identifier', fields: { NAME: expression.name } };
    case 'this':
      return { type: 'mj_expr_this' };
    case 'newIntArray': {
      const state: MiniJavaBlockState = { type: 'mj_expr_new_int_array' };
      setInput(state, 'SIZE', expressionState(expression.size));
      return state;
    }
    case 'newObject':
      return { type: 'mj_expr_new_object', fields: { CLASS: expression.className } };
    case 'not': {
      const state: MiniJavaBlockState = { type: 'mj_expr_not' };
      setInput(state, 'EXPR', expressionState(expression.expr));
      return state;
    }
  }
}

function goalState(program: MiniJavaProgramAst): MiniJavaBlockState {
  const main: MiniJavaBlockState = {
    type: 'mj_main_class',
    fields: { CLASS: program.main.className, ARG: program.main.argumentName }
  };
  setInput(main, 'STATEMENT', sequence(program.main.statements.map(statementState)));

  const goal: MiniJavaBlockState = {
    type: 'mj_goal',
    x: 48,
    y: 48,
    deletable: false,
    movable: false
  };
  setInput(goal, 'MAIN', main);
  setInput(goal, 'CLASSES', sequence(program.classes.map(classState)));
  return goal;
}

export function parseMiniJavaTextToWorkspaceState(text: string): MiniJavaWorkspaceState {
  const source = text.trim();
  if (!source) throw new MiniJavaTextParseError('Enter a MiniJava program.', 0);

  return {
    blocks: {
      languageVersion: 0,
      blocks: [goalState(new Parser(tokenize(source)).parseGoal())]
    }
  };
}
