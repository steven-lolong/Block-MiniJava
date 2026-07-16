/**
 * Vehicle 2 seed: a substitution stepper over block trees (design note §7).
 *
 * Every state IS a self-contained block-tree: reduction is literal rewriting
 * of the syntax, call-by-value order. A method call on an object value
 * substitutes the arguments, the receiver's fields, and `this` into a copy
 * of the method's return expression — each occurrence an INDEPENDENT copy
 * with fresh block ids (the structure-preservation invariant: no shared
 * node ever has two parents). No heap, no environment panel.
 *
 * Scope: MiniJava's PURE fragment — main is a single println; method bodies
 * are simple `target = value` assignments (the functional-update pattern,
 * e.g. `f = v; return this;`) followed by return. Statements that need a
 * store (if/while/println/array writes) make a method impure and the
 * stepper reports it instead of silently changing semantics. Closures are
 * Vehicle 2 / MnL territory and out of scope here (§5).
 *
 * Rule names match the Model B machine's salient rules (add, sub, mul,
 * less, not, and, and-short-circuit, new, call), so a substitution trace
 * and a machine trace can be compared — the operational-correspondence
 * demo: env lookup on the machine is lazy substitution.
 */

import * as Blockly from 'blockly';
import {
  buildClassTable,
  classAndAncestors,
  fieldValue,
  inputTarget,
  statementChain
} from '../types/classTable';

export interface TreeNode {
  type: string;
  id: string;
  fields?: Record<string, string | number | boolean>;
  inputs?: Record<string, { block: TreeNode }>;
  next?: { block: TreeNode };
  extraState?: { className: string; fields: string[] };
}

export interface PureMethodDef {
  name: string;
  owner: string;
  params: string[];
  locals: string[];
  assigns: Array<{ target: string; rhs: TreeNode }>;
  returnTree: TreeNode | null;
  impureReason: string | null;
}

export interface SubstClassDef {
  name: string;
  parent: string | null;
  /** Own + inherited field names, base-first. */
  fieldOrder: string[];
  fieldDefault: Map<string, TreeNode>;
  methods: Map<string, PureMethodDef>;
}

export interface SubstitutionState {
  tree: TreeNode;
  classes: Map<string, SubstClassDef>;
  mainClassName: string;
  status: 'running' | 'done' | 'error';
  error: string | null;
  stepCount: number;
  lastRule: string | null;
  /** Id of the block the last rewrite produced — the highlight target. */
  redexId: string | null;
  nextId: number;
}

type StepOutcome =
  | { kind: 'reduced'; node: TreeNode; rule: string; redexId: string }
  | { kind: 'value' }
  | { kind: 'error'; message: string };

const VALUE_TYPES = new Set([
  'mj_expr_integer',
  'mj_expr_string',
  'mj_expr_boolean',
  'mj_value_null',
  'mj_value_object'
]);

export function isValueNode(node: TreeNode): boolean {
  return VALUE_TYPES.has(node.type);
}

function freshId(state: SubstitutionState): string {
  return `s${state.nextId++}`;
}

/** Deep copy with fresh ids — every substituted occurrence is independent. */
function copyFresh(state: SubstitutionState, node: TreeNode): TreeNode {
  const copy: TreeNode = { type: node.type, id: freshId(state) };
  if (node.fields) copy.fields = { ...node.fields };
  if (node.extraState) copy.extraState = { className: node.extraState.className, fields: [...node.extraState.fields] };
  if (node.inputs) {
    copy.inputs = {};
    for (const [name, input] of Object.entries(node.inputs)) {
      copy.inputs[name] = { block: copyFresh(state, input.block) };
    }
  }
  if (node.next) copy.next = { block: copyFresh(state, node.next.block) };
  return copy;
}

function intLit(state: SubstitutionState, n: number): TreeNode {
  return { type: 'mj_expr_integer', id: freshId(state), fields: { VALUE: n } };
}

function boolLit(state: SubstitutionState, b: boolean): TreeNode {
  return { type: 'mj_expr_boolean', id: freshId(state), fields: { VALUE: b ? 'true' : 'false' } };
}

function strLit(state: SubstitutionState, s: string): TreeNode {
  return { type: 'mj_expr_string', id: freshId(state), fields: { TEXT: s } };
}

function asIntLit(node: TreeNode): number | null {
  return node.type === 'mj_expr_integer' ? Number(node.fields?.VALUE ?? 0) : null;
}

function asBoolLit(node: TreeNode): boolean | null {
  if (node.type !== 'mj_expr_boolean') return null;
  return node.fields?.VALUE === 'true';
}

function asStrLit(node: TreeNode): string | null {
  return node.type === 'mj_expr_string' ? String(node.fields?.TEXT ?? '') : null;
}

function child(node: TreeNode, input: string): TreeNode | null {
  return node.inputs?.[input]?.block ?? null;
}

function withInput(node: TreeNode, input: string, block: TreeNode): TreeNode {
  return { ...node, inputs: { ...(node.inputs ?? {}), [input]: { block } } };
}

export function formatTree(node: TreeNode): string {
  switch (node.type) {
    case 'mj_expr_integer':
      return String(node.fields?.VALUE ?? 0);
    case 'mj_expr_string':
      // Quoted: formatTree prints syntax, and a string VALUE is a literal.
      return JSON.stringify(String(node.fields?.TEXT ?? ''));
    case 'mj_expr_boolean':
      return node.fields?.VALUE === 'true' ? 'true' : 'false';
    case 'mj_value_null':
      return 'null';
    case 'mj_value_object': {
      const extra = node.extraState!;
      const fields = extra.fields.map((f) => {
        const value = child(node, `F_${f}`);
        return `${f}: ${value ? formatTree(value) : '?'}`;
      });
      return `${extra.className}{${fields.join(', ')}}`;
    }
    case 'mj_expr_arith':
      return `(${fmtChild(node, 'LEFT')} ${node.fields?.OP ?? '+'} ${fmtChild(node, 'RIGHT')})`;
    case 'mj_expr_compare':
      return `(${fmtChild(node, 'LEFT')} < ${fmtChild(node, 'RIGHT')})`;
    case 'mj_expr_logic':
      return `(${fmtChild(node, 'LEFT')} && ${fmtChild(node, 'RIGHT')})`;
    case 'mj_expr_not':
      return `!${fmtChild(node, 'EXPR')}`;
    case 'mj_expr_char_at':
      return `${fmtChild(node, 'STR')}.charAt(${fmtChild(node, 'INDEX')})`;
    case 'mj_expr_concat':
      return `${fmtChild(node, 'LEFT')}.concat(${fmtChild(node, 'RIGHT')})`;
    case 'mj_expr_str_length':
      return `${fmtChild(node, 'STR')}.length()`;
    case 'mj_expr_parens':
      return `(${fmtChild(node, 'EXPR')})`;
    case 'mj_expr_new_object':
      return `new ${node.fields?.CLASS ?? 'C'}()`;
    case 'mj_expr_identifier':
      return String(node.fields?.NAME ?? 'x');
    case 'mj_expr_this':
      return 'this';
    case 'mj_expr_method_call': {
      const args: string[] = [];
      let item = child(node, 'ARGS');
      while (item) {
        const expr = child(item, 'EXPR');
        args.push(expr ? formatTree(expr) : '?');
        item = item.next?.block ?? null;
      }
      return `${fmtChild(node, 'OBJECT')}.${node.fields?.METHOD ?? 'm'}(${args.join(', ')})`;
    }
    default:
      return `<${node.type}>`;
  }
}

function fmtChild(node: TreeNode, input: string): string {
  const c = child(node, input);
  return c ? formatTree(c) : '?';
}

/* -- loading ---------------------------------------------------------------- */

/** Strips a Blockly saved state down to the pure tree shape. */
function sanitize(raw: Record<string, unknown>): Omit<TreeNode, 'id'> & { id?: string } {
  const node: Omit<TreeNode, 'id'> & { id?: string } = { type: String(raw.type) };
  if (raw.fields) node.fields = { ...(raw.fields as Record<string, string | number | boolean>) };
  if (raw.extraState) node.extraState = raw.extraState as TreeNode['extraState'];
  const inputs = raw.inputs as Record<string, { block?: Record<string, unknown> }> | undefined;
  if (inputs) {
    const clean: TreeNode['inputs'] = {};
    for (const [name, input] of Object.entries(inputs)) {
      if (input?.block) clean[name] = { block: sanitize(input.block) as TreeNode };
    }
    if (Object.keys(clean).length > 0) node.inputs = clean;
  }
  const next = raw.next as { block?: Record<string, unknown> } | undefined;
  if (next?.block) node.next = { block: sanitize(next.block) as TreeNode };
  return node;
}

function saveTree(state: SubstitutionState, block: Blockly.Block): TreeNode {
  const raw = Blockly.serialization.blocks.save(block, {
    addCoordinates: false,
    addInputBlocks: true,
    addNextBlocks: true
  } as never) as unknown as Record<string, unknown>;
  const tree = sanitize(raw) as TreeNode;
  assignFreshIds(state, tree);
  return tree;
}

function assignFreshIds(state: SubstitutionState, node: TreeNode): void {
  node.id = freshId(state);
  for (const input of Object.values(node.inputs ?? {})) assignFreshIds(state, input.block);
  if (node.next) assignFreshIds(state, node.next.block);
}

function analyzeMethod(state: SubstitutionState, owner: string, name: string, block: Blockly.Block): PureMethodDef {
  const def: PureMethodDef = { name, owner, params: [], locals: [], assigns: [], returnTree: null, impureReason: null };
  for (const param of statementChain(inputTarget(block, 'PARAMS'))) {
    if (param.type === 'mj_formal_parameter') def.params.push(fieldValue(param, 'NAME', 'p'));
  }
  for (const varBlock of statementChain(inputTarget(block, 'VARS'))) {
    if (varBlock.type === 'mj_var_declaration') def.locals.push(fieldValue(varBlock, 'NAME', 'x'));
  }
  for (const stmt of statementChain(inputTarget(block, 'BODY'))) {
    if (stmt.type !== 'mj_statement_assign') {
      def.impureReason = `it contains a '${stmt.type.replace('mj_statement_', '')}' statement`;
      return def;
    }
    const rhsBlock = inputTarget(stmt, 'VALUE');
    if (!rhsBlock) {
      def.impureReason = 'an assignment has an empty right-hand side';
      return def;
    }
    def.assigns.push({ target: fieldValue(stmt, 'NAME', 'x'), rhs: saveTree(state, rhsBlock) });
  }
  const returnBlock = inputTarget(block, 'RETURN');
  if (!returnBlock) {
    def.impureReason = 'it has no return expression';
    return def;
  }
  def.returnTree = saveTree(state, returnBlock);
  return def;
}

export function injectSubstitution(workspace: Blockly.Workspace): SubstitutionState | { injectError: string } {
  const goal = workspace.getTopBlocks(false).find((block) => block.type === 'mj_goal');
  if (!goal) return { injectError: 'No program: the Program block is missing.' };
  const mainBlock = inputTarget(goal, 'MAIN');
  if (!mainBlock || mainBlock.type !== 'mj_main_class') {
    return { injectError: 'No program: the Main Class block is missing.' };
  }
  const statements = [...statementChain(inputTarget(mainBlock, 'STATEMENT'))];
  if (statements.length !== 1 || statements[0].type !== 'mj_statement_print') {
    return { injectError: 'The substitution stepper needs a main with exactly one System.out.println statement.' };
  }
  const exprBlock = inputTarget(statements[0], 'VALUE');
  if (!exprBlock) return { injectError: 'System.out.println has no argument.' };

  const table = buildClassTable(goal);
  const state: SubstitutionState = {
    tree: { type: 'mj_expr_integer', id: 's0' }, // placeholder, replaced below
    classes: new Map(),
    mainClassName: table.mainClassName,
    status: 'running',
    error: null,
    stepCount: 0,
    lastRule: null,
    redexId: null,
    nextId: 0
  };

  for (const sym of table.classes.values()) {
    const def: SubstClassDef = {
      name: sym.name,
      parent: sym.parent,
      fieldOrder: [],
      fieldDefault: new Map(),
      methods: new Map()
    };
    // Base-first so a shadowing redeclaration ends up with the subclass's slot.
    for (const ancestor of [...classAndAncestors(table, sym)].reverse()) {
      for (const field of ancestor.fields.values()) {
        if (!def.fieldDefault.has(field.name)) def.fieldOrder.push(field.name);
        const ty = field.ty;
        def.fieldDefault.set(
          field.name,
          ty.tag === 'Prim' && ty.name === 'Int'
            ? { type: 'mj_expr_integer', id: '', fields: { VALUE: 0 } }
            : ty.tag === 'Prim' && ty.name === 'String'
              ? { type: 'mj_expr_string', id: '', fields: { TEXT: '' } }
              : ty.tag === 'Prim'
                ? { type: 'mj_expr_boolean', id: '', fields: { VALUE: 'false' } }
                : { type: 'mj_value_null', id: '' }
        );
      }
      for (const method of ancestor.methods.values()) {
        if (!def.methods.has(method.name)) {
          def.methods.set(method.name, analyzeMethod(state, ancestor.name, method.name, method.block));
        }
      }
    }
    state.classes.set(sym.name, def);
  }

  state.tree = saveTree(state, exprBlock);
  return state;
}

/* -- reduction ---------------------------------------------------------------- */

function buildObjectValue(state: SubstitutionState, classDef: SubstClassDef, fieldTrees: Map<string, TreeNode>): TreeNode {
  const node: TreeNode = {
    type: 'mj_value_object',
    id: freshId(state),
    extraState: { className: classDef.name, fields: [...classDef.fieldOrder] },
    inputs: {}
  };
  for (const field of classDef.fieldOrder) {
    const source = fieldTrees.get(field) ?? classDef.fieldDefault.get(field)!;
    node.inputs![`F_${field}`] = { block: copyFresh(state, source) };
  }
  return node;
}

/** Literal substitution: params/locals, receiver fields, and `this`. */
function substitute(
  state: SubstitutionState,
  node: TreeNode,
  env: Map<string, TreeNode>,
  fieldEnv: Map<string, TreeNode>,
  classDef: SubstClassDef
): TreeNode {
  if (node.type === 'mj_expr_identifier') {
    const name = String(node.fields?.NAME ?? 'x');
    const bound = env.get(name) ?? fieldEnv.get(name);
    if (bound) return copyFresh(state, bound);
    return node;
  }
  if (node.type === 'mj_expr_this') {
    return buildObjectValue(state, classDef, fieldEnv);
  }
  const out: TreeNode = { ...node };
  if (node.inputs) {
    out.inputs = {};
    for (const [name, input] of Object.entries(node.inputs)) {
      out.inputs[name] = { block: substitute(state, input.block, env, fieldEnv, classDef) };
    }
  }
  if (node.next) out.next = { block: substitute(state, node.next.block, env, fieldEnv, classDef) };
  return out;
}

function findMethodDef(state: SubstitutionState, className: string, methodName: string): PureMethodDef | null {
  let cursor = state.classes.get(className) ?? null;
  const seen = new Set<string>();
  while (cursor && !seen.has(cursor.name)) {
    seen.add(cursor.name);
    const method = cursor.methods.get(methodName);
    if (method) return method;
    cursor = cursor.parent ? state.classes.get(cursor.parent) ?? null : null;
  }
  return null;
}

function beta(state: SubstitutionState, callNode: TreeNode, recv: TreeNode, argTrees: TreeNode[]): StepOutcome {
  const className = recv.extraState!.className;
  const classDef = state.classes.get(className);
  if (!classDef) return { kind: 'error', message: `Class '${className}' is not declared` };
  const methodName = String(callNode.fields?.METHOD ?? 'm');
  const method = findMethodDef(state, className, methodName);
  if (!method) return { kind: 'error', message: `Method '${methodName}' is not defined in class '${className}'` };
  if (method.impureReason) {
    return { kind: 'error', message: `Method '${methodName}' is not in the pure fragment: ${method.impureReason}` };
  }
  if (argTrees.length !== method.params.length) {
    return {
      kind: 'error',
      message: `Method '${methodName}' expects ${method.params.length} argument(s), found ${argTrees.length}`
    };
  }

  const env = new Map<string, TreeNode>();
  method.params.forEach((param, i) => env.set(param, argTrees[i]));
  const fieldEnv = new Map<string, TreeNode>();
  for (const field of recv.extraState!.fields) {
    const value = child(recv, `F_${field}`);
    if (value) fieldEnv.set(field, value);
  }

  // Simple assignments: each right-hand side must substitute to a VALUE, so
  // no computation is duplicated (call-by-structure, not call-by-name).
  for (const assign of method.assigns) {
    const rhs = substitute(state, copyFresh(state, assign.rhs), env, fieldEnv, classDef);
    if (!isValueNode(rhs)) {
      return {
        kind: 'error',
        message: `In '${methodName}', the assignment to '${assign.target}' is not a simple value — outside the pure fragment`
      };
    }
    if (method.params.includes(assign.target) || method.locals.includes(assign.target)) {
      env.set(assign.target, rhs);
    } else if (fieldEnv.has(assign.target) || classDef.fieldDefault.has(assign.target)) {
      fieldEnv.set(assign.target, rhs);
    } else {
      return { kind: 'error', message: `Variable '${assign.target}' is not declared` };
    }
  }

  const result = substitute(state, copyFresh(state, method.returnTree!), env, fieldEnv, classDef);
  return { kind: 'reduced', node: result, rule: 'call', redexId: result.id };
}

function stepBinOp(state: SubstitutionState, node: TreeNode, fold: (l: TreeNode, r: TreeNode) => StepOutcome): StepOutcome {
  const left = child(node, 'LEFT');
  if (!left) return { kind: 'error', message: 'Incomplete program: the operator has no left operand' };
  const leftStep = stepNode(state, left);
  if (leftStep.kind === 'reduced') return { ...leftStep, node: withInput(node, 'LEFT', leftStep.node) };
  if (leftStep.kind === 'error') return leftStep;
  const right = child(node, 'RIGHT');
  if (!right) return { kind: 'error', message: 'Incomplete program: the operator has no right operand' };
  const rightStep = stepNode(state, right);
  if (rightStep.kind === 'reduced') return { ...rightStep, node: withInput(node, 'RIGHT', rightStep.node) };
  if (rightStep.kind === 'error') return rightStep;
  return fold(left, right);
}

function foldArith(
  state: SubstitutionState,
  left: TreeNode,
  right: TreeNode,
  rule: 'add' | 'sub' | 'mul' | 'less'
): StepOutcome {
  const l = asIntLit(left);
  const r = asIntLit(right);
  if (l === null || r === null) return { kind: 'error', message: 'arithmetic expects ints' };
  const result =
    rule === 'add'
      ? intLit(state, l + r)
      : rule === 'sub'
        ? intLit(state, l - r)
        : rule === 'mul'
          ? intLit(state, l * r)
          : boolLit(state, l < r);
  return { kind: 'reduced', node: result, rule, redexId: result.id };
}

function stepNode(state: SubstitutionState, node: TreeNode): StepOutcome {
  if (isValueNode(node)) return { kind: 'value' };
  switch (node.type) {
    case 'mj_expr_arith': {
      const op = node.fields?.OP;
      const rule = op === '-' ? 'sub' : op === '*' ? 'mul' : 'add';
      return stepBinOp(state, node, (l, r) => foldArith(state, l, r, rule));
    }
    case 'mj_expr_compare':
      return stepBinOp(state, node, (l, r) => foldArith(state, l, r, 'less'));
    case 'mj_expr_logic': {
      const left = child(node, 'LEFT');
      if (!left) return { kind: 'error', message: `Incomplete program: '&&' has no left operand` };
      const leftStep = stepNode(state, left);
      if (leftStep.kind === 'reduced') return { ...leftStep, node: withInput(node, 'LEFT', leftStep.node) };
      if (leftStep.kind === 'error') return leftStep;
      const l = asBoolLit(left);
      if (l === null) return { kind: 'error', message: `'&&' expects booleans` };
      if (!l) {
        const result = boolLit(state, false);
        return { kind: 'reduced', node: result, rule: 'and-short-circuit', redexId: result.id };
      }
      const right = child(node, 'RIGHT');
      if (!right) return { kind: 'error', message: `Incomplete program: '&&' has no right operand` };
      const rightStep = stepNode(state, right);
      if (rightStep.kind === 'reduced') return { ...rightStep, node: withInput(node, 'RIGHT', rightStep.node) };
      if (rightStep.kind === 'error') return rightStep;
      const r = asBoolLit(right);
      if (r === null) return { kind: 'error', message: `'&&' expects booleans` };
      const result = boolLit(state, r);
      return { kind: 'reduced', node: result, rule: 'and', redexId: result.id };
    }
    case 'mj_expr_concat':
      return stepBinOp(state, node, (l, r) => {
        const ls = asStrLit(l);
        const rs = asStrLit(r);
        if (ls === null || rs === null) return { kind: 'error', message: `'concat' expects Strings` };
        const result = strLit(state, ls + rs);
        return { kind: 'reduced', node: result, rule: 'concat', redexId: result.id };
      });
    case 'mj_expr_char_at': {
      const str = child(node, 'STR');
      if (!str) return { kind: 'error', message: `Incomplete program: 'charAt' has no string` };
      const strStep = stepNode(state, str);
      if (strStep.kind === 'reduced') return { ...strStep, node: withInput(node, 'STR', strStep.node) };
      if (strStep.kind === 'error') return strStep;
      const index = child(node, 'INDEX');
      if (!index) return { kind: 'error', message: `Incomplete program: 'charAt' has no index` };
      const indexStep = stepNode(state, index);
      if (indexStep.kind === 'reduced') return { ...indexStep, node: withInput(node, 'INDEX', indexStep.node) };
      if (indexStep.kind === 'error') return indexStep;
      const s = asStrLit(str);
      const i = asIntLit(index);
      if (s === null || i === null) return { kind: 'error', message: `'charAt' expects a String and an int` };
      if (i < 0 || i >= s.length) {
        return { kind: 'error', message: `string index ${i} out of bounds for length ${s.length}` };
      }
      // charAt yields a 1-character String: the language has no char type.
      const result = strLit(state, s.charAt(i));
      return { kind: 'reduced', node: result, rule: 'char-at', redexId: result.id };
    }
    case 'mj_expr_str_length': {
      const str = child(node, 'STR');
      if (!str) return { kind: 'error', message: `Incomplete program: '.length()' has no string` };
      const strStep = stepNode(state, str);
      if (strStep.kind === 'reduced') return { ...strStep, node: withInput(node, 'STR', strStep.node) };
      if (strStep.kind === 'error') return strStep;
      const s = asStrLit(str);
      if (s === null) return { kind: 'error', message: `'.length()' expects a String` };
      const result = intLit(state, s.length);
      return { kind: 'reduced', node: result, rule: 'str-length', redexId: result.id };
    }
    case 'mj_expr_not': {
      const inner = child(node, 'EXPR');
      if (!inner) return { kind: 'error', message: `Incomplete program: '!' has no operand` };
      const innerStep = stepNode(state, inner);
      if (innerStep.kind === 'reduced') return { ...innerStep, node: withInput(node, 'EXPR', innerStep.node) };
      if (innerStep.kind === 'error') return innerStep;
      const b = asBoolLit(inner);
      if (b === null) return { kind: 'error', message: `'!' expects a boolean` };
      const result = boolLit(state, !b);
      return { kind: 'reduced', node: result, rule: 'not', redexId: result.id };
    }
    case 'mj_expr_parens': {
      const inner = child(node, 'EXPR');
      if (!inner) return { kind: 'error', message: 'Incomplete program: the parentheses are empty' };
      const innerStep = stepNode(state, inner);
      if (innerStep.kind === 'reduced') return { ...innerStep, node: withInput(node, 'EXPR', innerStep.node) };
      if (innerStep.kind === 'error') return innerStep;
      return { kind: 'reduced', node: inner, rule: 'parens', redexId: inner.id };
    }
    case 'mj_expr_new_object': {
      const className = String(node.fields?.CLASS ?? 'C');
      if (className === state.mainClassName) {
        return { kind: 'error', message: `The main class '${className}' cannot be instantiated` };
      }
      const classDef = state.classes.get(className);
      if (!classDef) return { kind: 'error', message: `Class '${className}' is not declared` };
      const result = buildObjectValue(state, classDef, new Map());
      return { kind: 'reduced', node: result, rule: 'new', redexId: result.id };
    }
    case 'mj_expr_method_call': {
      const recv = child(node, 'OBJECT');
      if (!recv) return { kind: 'error', message: 'Incomplete program: the method call has no receiver' };
      const recvStep = stepNode(state, recv);
      if (recvStep.kind === 'reduced') return { ...recvStep, node: withInput(node, 'OBJECT', recvStep.node) };
      if (recvStep.kind === 'error') return recvStep;
      if (recv.type !== 'mj_value_object') {
        return { kind: 'error', message: `cannot call a method on ${formatTree(recv)}` };
      }
      // Argument chain: reduce the leftmost non-value argument.
      const items: TreeNode[] = [];
      let item = child(node, 'ARGS');
      while (item) {
        items.push(item);
        item = item.next?.block ?? null;
      }
      const argTrees: TreeNode[] = [];
      for (let i = 0; i < items.length; i++) {
        const expr = child(items[i], 'EXPR');
        if (!expr) return { kind: 'error', message: 'Incomplete program: an argument socket is empty' };
        const argStep = stepNode(state, expr);
        if (argStep.kind === 'error') return argStep;
        if (argStep.kind === 'reduced') {
          // Rebuild the argument chain with item i replaced.
          let rebuilt: TreeNode | null = null;
          for (let j = items.length - 1; j >= 0; j--) {
            const base: TreeNode =
              j === i ? withInput(items[j], 'EXPR', argStep.node) : { ...items[j] };
            if (rebuilt) base.next = { block: rebuilt };
            else if (!items[j].next) delete base.next;
            rebuilt = base;
          }
          return { ...argStep, node: withInput(node, 'ARGS', rebuilt!) };
        }
        argTrees.push(expr);
      }
      return beta(state, node, recv, argTrees);
    }
    case 'mj_expr_identifier':
      return { kind: 'error', message: `unbound identifier '${node.fields?.NAME ?? 'x'}' — outside the pure fragment` };
    case 'mj_expr_this':
      return { kind: 'error', message: `'this' outside a method — outside the pure fragment` };
    default:
      return { kind: 'error', message: `'${node.type}' is not supported by the substitution stepper` };
  }
}

/** One rewrite step. Pure: returns a fresh state; no-op once done or stuck. */
export function stepSubstitution(previous: SubstitutionState): SubstitutionState {
  if (previous.status !== 'running') return previous;
  const state: SubstitutionState = { ...previous, lastRule: null, redexId: null };
  const outcome = stepNode(state, state.tree);
  state.stepCount += 1;
  if (outcome.kind === 'value') {
    state.status = 'done';
    state.stepCount -= 1; // recognizing a value is not a rewrite
    state.lastRule = 'halt';
    return state;
  }
  if (outcome.kind === 'error') {
    state.status = 'error';
    state.error = outcome.message;
    state.lastRule = 'stuck';
    return state;
  }
  state.tree = outcome.node;
  state.lastRule = outcome.rule;
  state.redexId = outcome.redexId;
  return state;
}

/** All ids in the tree — the independence invariant requires them unique. */
export function collectTreeIds(node: TreeNode, into: string[] = []): string[] {
  into.push(node.id);
  for (const input of Object.values(node.inputs ?? {})) collectTreeIds(input.block, into);
  if (node.next) collectTreeIds(node.next.block, into);
  return into;
}
