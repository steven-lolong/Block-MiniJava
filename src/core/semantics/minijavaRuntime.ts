import * as Blockly from 'blockly';

export type ReductionKind = 'structure' | 'value';

export interface ObjectValue {
  kind: 'object';
  className: string;
  fields: Map<string, RuntimeSlot>;
}

export interface IntArrayValue {
  kind: 'intArray';
  items: RuntimeValue[];
}

export interface UnknownValue {
  kind: 'unknown';
  label: string;
}

interface ThunkValue {
  kind: 'thunk';
  block: Blockly.Block;
  env: RuntimeEnv;
}

type RuntimeSlot = RuntimeValue | ThunkValue;
export type RuntimeValue = number | boolean | null | ObjectValue | IntArrayValue | UnknownValue;

export interface ClassInfo {
  name: string;
  parent: string | null;
  block: Blockly.Block;
  fields: Blockly.Block[];
  methods: Map<string, Blockly.Block>;
}

export interface ProgramIndex {
  classes: Map<string, ClassInfo>;
}

export interface RuntimeEnv {
  program: ProgramIndex;
  vars: Map<string, RuntimeSlot>;
  staticTypes: Map<string, string>;
  currentClass: string | null;
  thisValue: ObjectValue | null;
  output: string[];
  strategy: ReductionKind;
  depth: number;
}

export interface ResolvedMethod {
  method: Blockly.Block;
  owner: ClassInfo;
}

const MAX_CALL_DEPTH = 80;
const MAX_LOOP_STEPS = 1000;

const METHOD_INPUTS = {
  object: 'OBJECT',
  args: 'ARGS',
  params: 'PARAMS',
  body: 'BODY',
  vars: 'VARS',
  return: 'RETURN'
} as const;

const EXPR_TYPES = new Set([
  'mj_expr_and',
  'mj_expr_less',
  'mj_expr_plus',
  'mj_expr_minus',
  'mj_expr_times',
  'mj_expr_array_lookup',
  'mj_expr_array_length',
  'mj_expr_method_call',
  'mj_expr_integer',
  'mj_expr_true',
  'mj_expr_false',
  'mj_expr_identifier',
  'mj_expr_this',
  'mj_expr_new_int_array',
  'mj_expr_new_object',
  'mj_expr_not',
  'mj_expr_parens'
]);

const cloneState = <T>(value: T): T => JSON.parse(JSON.stringify(value)) as T;

function child(block: Blockly.Block, inputName: string): Blockly.Block | null {
  return block.getInputTargetBlock(inputName);
}

function chain(start: Blockly.Block | null): Blockly.Block[] {
  const blocks: Blockly.Block[] = [];
  let current = start;
  while (current) {
    blocks.push(current);
    current = current.getNextBlock();
  }
  return blocks;
}

function field(block: Blockly.Block, name: string, fallback = ''): string {
  const value = block.getFieldValue(name);
  return value === null || value === undefined || value === '' ? fallback : String(value);
}

function numericField(block: Blockly.Block, name: string, fallback = 0): number {
  const value = Number(block.getFieldValue(name));
  return Number.isFinite(value) ? value : fallback;
}

function unknown(label: string): UnknownValue {
  return { kind: 'unknown', label };
}

function isUnknown(value: RuntimeValue): value is UnknownValue {
  return !!value && typeof value === 'object' && (value as UnknownValue).kind === 'unknown';
}

function isThunk(value: RuntimeSlot | undefined): value is ThunkValue {
  return !!value && typeof value === 'object' && (value as ThunkValue).kind === 'thunk';
}

function isArrayValue(value: RuntimeValue): value is IntArrayValue {
  return !!value && typeof value === 'object' && (value as IntArrayValue).kind === 'intArray';
}

function isObjectValue(value: RuntimeValue): value is ObjectValue {
  return !!value && typeof value === 'object' && (value as ObjectValue).kind === 'object';
}

function typeName(typeBlock: Blockly.Block | null): string {
  if (!typeBlock) return 'int';
  switch (typeBlock.type) {
    case 'mj_type_boolean': return 'boolean';
    case 'mj_type_int_array': return 'int[]';
    case 'mj_type_identifier': return field(typeBlock, 'NAME', 'Object');
    case 'mj_type_int':
    default:
      return 'int';
  }
}

function defaultValueForType(typeBlock: Blockly.Block | null): RuntimeValue {
  const name = typeName(typeBlock);
  if (name === 'boolean') return false;
  if (name === 'int[]') return { kind: 'intArray', items: [] };
  if (name === 'int') return 0;
  return null;
}

function makeObject(program: ProgramIndex, className: string): ObjectValue {
  const value: ObjectValue = { kind: 'object', className, fields: new Map() };
  const lineage: ClassInfo[] = [];
  let cursor = program.classes.get(className) ?? null;
  while (cursor) {
    lineage.unshift(cursor);
    cursor = cursor.parent ? program.classes.get(cursor.parent) ?? null : null;
  }
  for (const cls of lineage) {
    for (const f of cls.fields) {
      value.fields.set(field(f, 'NAME', 'field'), defaultValueForType(child(f, 'TYPE')));
    }
  }
  return value;
}

function setRuntimeComment(block: Blockly.Block, value: RuntimeValue | string): void {
  (block as unknown as { runtimeValue?: RuntimeValue | string }).runtimeValue = value;
  try {
    block.setCommentText(`value:\n${formatRuntimeValue(value)}`);
  } catch {
    /* A detached block or non-rendered workspace should not abort evaluation. */
  }
}

export function formatRuntimeValue(value: RuntimeValue | string | undefined): string {
  if (value === undefined) return 'undefined';
  if (typeof value === 'string') return value;
  if (typeof value === 'number' || typeof value === 'boolean') return String(value);
  if (value === null) return 'null';
  if (isUnknown(value)) return `unknown(${value.label})`;
  if (isArrayValue(value)) return `[${value.items.map((v) => formatRuntimeValue(v)).join(', ')}]`;
  if (isObjectValue(value)) return `new ${value.className}()`;
  return String(value);
}

export function buildProgramIndex(workspace: Blockly.Workspace): ProgramIndex {
  const classes = new Map<string, ClassInfo>();
  const classBlocks = workspace.getAllBlocks(false).filter((block) =>
    block.type === 'mj_class_declaration' || block.type === 'mj_class_extends_declaration'
  );

  for (const block of classBlocks) {
    const name = field(block, 'CLASS', 'ClassName');
    const parent = block.type === 'mj_class_extends_declaration' ? field(block, 'PARENT', '') || null : null;
    const methods = new Map<string, Blockly.Block>();
    for (const method of chain(child(block, 'METHODS'))) {
      if (method.type === 'mj_method_declaration') methods.set(field(method, 'NAME', 'method'), method);
    }
    classes.set(name, {
      name,
      parent,
      block,
      fields: chain(child(block, 'VARS')).filter((b) => b.type === 'mj_var_declaration'),
      methods
    });
  }

  return { classes };
}

export function createRuntimeEnv(workspace: Blockly.Workspace, strategy: ReductionKind): RuntimeEnv {
  return {
    program: buildProgramIndex(workspace),
    vars: new Map(),
    staticTypes: new Map(),
    currentClass: null,
    thisValue: null,
    output: [],
    strategy,
    depth: 0
  };
}

function childEnv(parent: RuntimeEnv, owner: ClassInfo, thisValue: ObjectValue | null): RuntimeEnv {
  // Fields stay in thisValue.fields and are reached via lookupName/assignName;
  // copying them into vars would turn field writes into writes on a shadow copy.
  const vars = new Map<string, RuntimeSlot>();
  const staticTypes = new Map<string, string>();
  return {
    program: parent.program,
    vars,
    staticTypes,
    currentClass: owner.name,
    thisValue,
    output: parent.output,
    strategy: parent.strategy,
    depth: parent.depth + 1
  };
}

function readSlot(slot: RuntimeSlot | undefined): RuntimeValue {
  if (slot === undefined) return unknown('unbound identifier');
  if (isThunk(slot)) return evaluateExpression(slot.block, slot.env);
  return slot;
}

/** Locals and params shadow fields, as in Java. */
function lookupName(env: RuntimeEnv, name: string): RuntimeSlot | undefined {
  if (env.vars.has(name)) return env.vars.get(name);
  if (env.thisValue?.fields.has(name)) return env.thisValue.fields.get(name);
  return undefined;
}

function numberValue(value: RuntimeValue): number | UnknownValue {
  if (typeof value === 'number') return value;
  return isUnknown(value) ? value : unknown('expected int');
}

function booleanValue(value: RuntimeValue): boolean | UnknownValue {
  if (typeof value === 'boolean') return value;
  return isUnknown(value) ? value : unknown('expected boolean');
}

function valueClass(value: RuntimeValue): string | null {
  return isObjectValue(value) ? value.className : null;
}

function staticClassForExpression(expr: Blockly.Block | null, env: RuntimeEnv): string | null {
  if (!expr) return null;
  switch (expr.type) {
    case 'mj_expr_new_object':
      return field(expr, 'CLASS', 'ClassName');
    case 'mj_expr_this':
      return env.currentClass;
    case 'mj_expr_identifier':
      return env.staticTypes.get(field(expr, 'NAME', 'x')) ?? null;
    case 'mj_expr_parens':
      return staticClassForExpression(child(expr, 'EXPR'), env);
    default:
      return null;
  }
}

function findMethodInClass(program: ProgramIndex, className: string, methodName: string): ResolvedMethod | null {
  let cursor = program.classes.get(className) ?? null;
  while (cursor) {
    const method = cursor.methods.get(methodName);
    if (method) return { method, owner: cursor };
    cursor = cursor.parent ? program.classes.get(cursor.parent) ?? null : null;
  }
  return null;
}

export function resolveMethodCall(callBlock: Blockly.Block, env: RuntimeEnv): ResolvedMethod | null {
  const methodName = field(callBlock, 'METHOD', 'method');
  const objectBlock = child(callBlock, METHOD_INPUTS.object);
  const objectValue = objectBlock ? evaluateExpression(objectBlock, env) : unknown('missing receiver');
  const receiverClass = valueClass(objectValue) ?? staticClassForExpression(objectBlock, env);
  if (receiverClass) {
    const resolved = findMethodInClass(env.program, receiverClass, methodName);
    if (resolved) return resolved;
  }

  let only: ResolvedMethod | null = null;
  for (const cls of env.program.classes.values()) {
    const method = cls.methods.get(methodName);
    if (!method) continue;
    if (only) return null;
    only = { method, owner: cls };
  }
  return only;
}

export function methodParameters(method: Blockly.Block): Blockly.Block[] {
  return chain(child(method, METHOD_INPUTS.params)).filter((b) => b.type === 'mj_formal_parameter');
}

export function methodArguments(callBlock: Blockly.Block): Blockly.Block[] {
  return chain(child(callBlock, METHOD_INPUTS.args))
    .filter((b) => b.type === 'mj_argument_item')
    .map((arg) => child(arg, 'EXPR'))
    .filter((b): b is Blockly.Block => !!b);
}

function bindMethodLocals(callBlock: Blockly.Block, resolved: ResolvedMethod, env: RuntimeEnv): RuntimeEnv {
  const objectBlock = child(callBlock, METHOD_INPUTS.object);
  const objectValue = objectBlock ? evaluateExpression(objectBlock, env) : null;
  const thisValue = isObjectValue(objectValue) ? objectValue : makeObject(env.program, resolved.owner.name);
  const next = childEnv(env, resolved.owner, thisValue);

  for (const local of chain(child(resolved.method, METHOD_INPUTS.vars))) {
    if (local.type !== 'mj_var_declaration') continue;
    const name = field(local, 'NAME', 'local');
    const type = child(local, 'TYPE');
    next.vars.set(name, defaultValueForType(type));
    next.staticTypes.set(name, typeName(type));
  }

  const params = methodParameters(resolved.method);
  const args = methodArguments(callBlock);
  params.forEach((param, index) => {
    const name = field(param, 'NAME', `p${index}`);
    const type = child(param, 'TYPE');
    next.staticTypes.set(name, typeName(type));
    const arg = args[index];
    if (!arg) {
      next.vars.set(name, defaultValueForType(type));
    } else if (env.strategy === 'value') {
      next.vars.set(name, evaluateExpression(arg, env));
    } else {
      next.vars.set(name, { kind: 'thunk', block: arg, env });
    }
  });

  return next;
}

function assignName(env: RuntimeEnv, name: string, value: RuntimeValue): void {
  if (env.vars.has(name)) {
    env.vars.set(name, value);
    return;
  }
  if (env.thisValue?.fields.has(name)) {
    env.thisValue.fields.set(name, value);
    return;
  }
  env.vars.set(name, value);
}

export function executeStatement(block: Blockly.Block | null, env: RuntimeEnv): void {
  let current = block;
  while (current) {
    switch (current.type) {
      case 'mj_statement_block':
        executeStatement(child(current, 'STATEMENTS'), env);
        setRuntimeComment(current, 'block complete');
        break;
      case 'mj_statement_print': {
        const value = evaluateExpression(child(current, 'VALUE'), env);
        env.output.push(formatRuntimeValue(value));
        setRuntimeComment(current, value);
        break;
      }
      case 'mj_statement_assign': {
        const value = evaluateExpression(child(current, 'VALUE'), env);
        assignName(env, field(current, 'NAME', 'x'), value);
        setRuntimeComment(current, value);
        break;
      }
      case 'mj_statement_array_assign': {
        const array = readSlot(lookupName(env, field(current, 'NAME', 'array')));
        const index = numberValue(evaluateExpression(child(current, 'INDEX'), env));
        const value = evaluateExpression(child(current, 'VALUE'), env);
        if (isArrayValue(array) && typeof index === 'number' && index >= 0) array.items[Math.floor(index)] = value;
        setRuntimeComment(current, value);
        break;
      }
      case 'mj_statement_if': {
        const cond = booleanValue(evaluateExpression(child(current, 'COND'), env));
        if (cond === true) executeStatement(child(current, 'THEN'), env);
        else if (cond === false) executeStatement(child(current, 'ELSE'), env);
        setRuntimeComment(current, typeof cond === 'boolean' ? cond : cond);
        break;
      }
      case 'mj_statement_while': {
        let iterations = 0;
        while (iterations < MAX_LOOP_STEPS) {
          const cond = booleanValue(evaluateExpression(child(current, 'COND'), env));
          if (cond !== true) break;
          executeStatement(child(current, 'BODY'), env);
          iterations += 1;
        }
        setRuntimeComment(current, `loop iterations: ${iterations}`);
        break;
      }
      default:
        break;
    }
    current = current.getNextBlock();
  }
}

export function evaluateMethodCall(callBlock: Blockly.Block, env: RuntimeEnv): RuntimeValue {
  if (env.depth > MAX_CALL_DEPTH) return unknown('call depth limit');
  const resolved = resolveMethodCall(callBlock, env);
  if (!resolved) return unknown(`method ${field(callBlock, 'METHOD', 'method')} not resolved`);
  const methodEnv = bindMethodLocals(callBlock, resolved, env);
  executeStatement(child(resolved.method, METHOD_INPUTS.body), methodEnv);
  return evaluateExpression(child(resolved.method, METHOD_INPUTS.return), methodEnv);
}

export function evaluateExpression(block: Blockly.Block | null, env: RuntimeEnv): RuntimeValue {
  if (!block) return unknown('missing expression');

  let result: RuntimeValue;
  switch (block.type) {
    case 'mj_expr_integer':
      result = numericField(block, 'VALUE');
      break;
    case 'mj_expr_true':
      result = true;
      break;
    case 'mj_expr_false':
      result = false;
      break;
    case 'mj_expr_identifier':
      result = readSlot(lookupName(env, field(block, 'NAME', 'x')));
      break;
    case 'mj_expr_this':
      result = env.thisValue ?? (env.currentClass ? makeObject(env.program, env.currentClass) : unknown('this outside class'));
      break;
    case 'mj_expr_new_object':
      result = makeObject(env.program, field(block, 'CLASS', 'ClassName'));
      break;
    case 'mj_expr_new_int_array': {
      const size = numberValue(evaluateExpression(child(block, 'SIZE'), env));
      result = typeof size === 'number'
        ? { kind: 'intArray', items: Array.from({ length: Math.max(0, Math.floor(size)) }, () => 0) }
        : size;
      break;
    }
    case 'mj_expr_parens':
      result = evaluateExpression(child(block, 'EXPR'), env);
      break;
    case 'mj_expr_not': {
      const value = booleanValue(evaluateExpression(child(block, 'EXPR'), env));
      result = typeof value === 'boolean' ? !value : value;
      break;
    }
    case 'mj_expr_and': {
      const left = booleanValue(evaluateExpression(child(block, 'LEFT'), env));
      if (left === false) result = false;
      else if (left === true) {
        const right = booleanValue(evaluateExpression(child(block, 'RIGHT'), env));
        result = typeof right === 'boolean' ? right : right;
      } else {
        result = left;
      }
      break;
    }
    case 'mj_expr_less': {
      const left = numberValue(evaluateExpression(child(block, 'LEFT'), env));
      const right = numberValue(evaluateExpression(child(block, 'RIGHT'), env));
      result = typeof left === 'number' && typeof right === 'number' ? left < right : unknown('invalid comparison');
      break;
    }
    case 'mj_expr_plus':
    case 'mj_expr_minus':
    case 'mj_expr_times': {
      const left = numberValue(evaluateExpression(child(block, 'LEFT'), env));
      const right = numberValue(evaluateExpression(child(block, 'RIGHT'), env));
      if (typeof left !== 'number' || typeof right !== 'number') result = unknown('invalid arithmetic');
      else if (block.type === 'mj_expr_plus') result = left + right;
      else if (block.type === 'mj_expr_minus') result = left - right;
      else result = left * right;
      break;
    }
    case 'mj_expr_array_lookup': {
      const array = evaluateExpression(child(block, 'ARRAY'), env);
      const index = numberValue(evaluateExpression(child(block, 'INDEX'), env));
      result = isArrayValue(array) && typeof index === 'number'
        ? array.items[Math.floor(index)] ?? 0
        : unknown('invalid array lookup');
      break;
    }
    case 'mj_expr_array_length': {
      const array = evaluateExpression(child(block, 'ARRAY'), env);
      result = isArrayValue(array) ? array.items.length : unknown('invalid array length');
      break;
    }
    case 'mj_expr_method_call':
      result = evaluateMethodCall(block, env);
      break;
    default:
      result = unknown(`unsupported ${block.type}`);
      break;
  }

  setRuntimeComment(block, result);
  return result;
}

export function evaluateBlockTree(root: Blockly.Block, env: RuntimeEnv): RuntimeValue | string {
  if (EXPR_TYPES.has(root.type)) return evaluateExpression(root, env);
  switch (root.type) {
    case 'mj_method_declaration': {
      const owner = [...env.program.classes.values()].find((cls) => [...cls.methods.values()].includes(root));
      const ownerInfo = owner ?? { name: env.currentClass ?? 'Object', parent: null, block: root, fields: [], methods: new Map() };
      const thisValue = env.thisValue ?? makeObject(env.program, ownerInfo.name);
      const methodEnv = childEnv(env, ownerInfo, thisValue);
      for (const local of chain(child(root, METHOD_INPUTS.vars))) {
        if (local.type !== 'mj_var_declaration') continue;
        const name = field(local, 'NAME', 'local');
        const type = child(local, 'TYPE');
        methodEnv.vars.set(name, defaultValueForType(type));
        methodEnv.staticTypes.set(name, typeName(type));
      }
      for (const param of methodParameters(root)) {
        const name = field(param, 'NAME', 'param');
        const type = child(param, 'TYPE');
        if (!methodEnv.vars.has(name)) methodEnv.vars.set(name, defaultValueForType(type));
        methodEnv.staticTypes.set(name, typeName(type));
      }
      executeStatement(child(root, METHOD_INPUTS.body), methodEnv);
      const value = evaluateExpression(child(root, METHOD_INPUTS.return), methodEnv);
      setRuntimeComment(root, value);
      return value;
    }
    case 'mj_statement_block':
    case 'mj_statement_print':
    case 'mj_statement_assign':
    case 'mj_statement_array_assign':
    case 'mj_statement_if':
    case 'mj_statement_while':
      executeStatement(root, env);
      return 'statement complete';
    default:
      for (const descendant of root.getDescendants(false)) {
        if (EXPR_TYPES.has(descendant.type)) evaluateExpression(descendant, env);
      }
      return 'complete';
  }
}

export function valueToBlockState(value: RuntimeValue, fallbackState?: unknown): unknown | null {
  if (typeof value === 'number') return { type: 'mj_expr_integer', fields: { VALUE: value } };
  if (typeof value === 'boolean') return { type: value ? 'mj_expr_true' : 'mj_expr_false' };
  if (isObjectValue(value)) return { type: 'mj_expr_new_object', fields: { CLASS: value.className } };
  if (isArrayValue(value)) {
    return {
      type: 'mj_expr_new_int_array',
      inputs: { SIZE: { block: { type: 'mj_expr_integer', fields: { VALUE: value.items.length } } } }
    };
  }
  if (fallbackState) return cloneState(fallbackState);
  return null;
}
