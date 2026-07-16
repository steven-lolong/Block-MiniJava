/**
 * A small-step machine for block MiniJava, parameterized by value model.
 *
 * Model A — faithful MiniJava (design note §6):
 *  - values are flat (Int/Bool/Null/Ref); objects and arrays live ONLY in the
 *    heap behind Locs, so sharing/aliasing exists at object granularity and
 *    nowhere else;
 *  - frames hold `this` (a Loc) and locals BY COPY; copying a Ref copies the
 *    arrow, not the box — that is Java's model and the point of the stepper;
 *  - field write mutates a heap cell, so every alias observes it.
 *
 * Model B — structure-preserving values (design note §3/§7):
 *  - objects and arrays ARE values, held inline; there is no heap and no Ref;
 *  - binding copies structure (implemented as sharing of immutable values —
 *    Model B code NEVER mutates an Obj/Arr in place);
 *  - a method receives `this` by structure; `f = e` functionally updates the
 *    frame's own copy, so the caller's value never changes (call-by-structure);
 *  - `a[i] = e` rebinds the variable to a NEW array value.
 *
 * Both models share one control flow (statements, expressions, frames,
 * continuations), so two machines step in lockstep on the same program —
 * the §8 side-by-side artifact.
 *
 * `step` is pure: it returns a fresh state (blocks are shared by reference),
 * which makes time-travel (Back) in the UI a plain history stack.
 *
 * Headless-safe: only Blockly.Block structure APIs are used.
 */

import * as Blockly from 'blockly';
import {
  buildClassTable,
  classAndAncestors,
  fieldValue,
  findMethod,
  inputTarget,
  statementChain,
  type ClassTable
} from '../types/classTable';
import type { Ty } from '../types/ty';

export type Loc = number;

export type ValueModel = 'A' | 'B';

export type MachineValue =
  | { tag: 'Int'; n: number }
  | { tag: 'Bool'; b: boolean }
  | { tag: 'Str'; s: string }
  | { tag: 'Null' }
  | { tag: 'Ref'; loc: Loc } // Model A only: the arrow into the heap
  | { tag: 'Obj'; className: string; fields: Map<string, MachineValue> } // Model B only: inline structure
  | { tag: 'Arr'; elems: MachineValue[] }; // Model B only: inline structure

export type ObjValue = Extract<MachineValue, { tag: 'Obj' }>;

export type HeapObj =
  | { tag: 'Obj'; className: string; fields: Map<string, MachineValue>; blockId: string }
  | { tag: 'Arr'; elems: MachineValue[]; blockId: string };

type BinOp = 'add' | 'sub' | 'mul' | 'div' | 'less' | 'leq' | 'gt' | 'geq' | 'and' | 'or' | 'concat';

/** Continuations. One frame's worth of pending work, innermost first. */
export type Kont =
  | { tag: 'KStmtSeq'; next: Blockly.Block | null }
  | { tag: 'KLoop'; block: Blockly.Block }
  | { tag: 'KIf'; block: Blockly.Block }
  | { tag: 'KWhile'; block: Blockly.Block }
  | { tag: 'KPrint' }
  | { tag: 'KAssign'; name: string; block: Blockly.Block }
  | { tag: 'KArrAssignIdx'; name: string; valueBlock: Blockly.Block | null; block: Blockly.Block }
  | { tag: 'KArrAssignVal'; name: string; index: MachineValue; block: Blockly.Block }
  | { tag: 'KNot' }
  | { tag: 'KAnd'; rightBlock: Blockly.Block | null }
  | { tag: 'KOr'; rightBlock: Blockly.Block | null }
  | { tag: 'KBinL'; op: BinOp; rightBlock: Blockly.Block | null }
  | { tag: 'KBinR'; op: BinOp; left: MachineValue }
  | { tag: 'KLookupArr'; indexBlock: Blockly.Block | null }
  | { tag: 'KLookupIdx'; arr: MachineValue }
  | { tag: 'KLength' }
  | { tag: 'KCharAtStr'; indexBlock: Blockly.Block | null }
  | { tag: 'KCharAtIdx'; str: MachineValue }
  | { tag: 'KStrLength' }
  | { tag: 'KNewArr'; block: Blockly.Block }
  | { tag: 'KCallRecv'; block: Blockly.Block }
  | { tag: 'KCallArgs'; block: Blockly.Block; recv: MachineValue; remaining: Array<Blockly.Block | null>; done: MachineValue[] };

export interface Frame {
  /** Display label, e.g. `main` or `Fac.ComputeFac`. */
  method: string;
  /** Model A: `this` — a Loc into the heap; null in main and under Model B. */
  self: Loc | null;
  /** Model B: `this` — an inline structure; functional updates rebind it. */
  selfObj: ObjValue | null;
  /** Params + locals, held by copy. */
  locals: Map<string, MachineValue>;
  kont: Kont[];
  /** Provenance: the method-declaration (or main-class) block. */
  blockId: string;
  /** Provenance: the call expression that pushed this frame. */
  callBlockId: string | null;
  /** The method's RETURN expression; null for main. */
  returnBlock: Blockly.Block | null;
  /** Set once the machine has focused the return expression. */
  returningNow: boolean;
}

export type Control =
  | { tag: 'Stmt'; block: Blockly.Block }
  | { tag: 'Expr'; block: Blockly.Block }
  | { tag: 'Value'; value: MachineValue }
  | { tag: 'Done' };

/** What a step changed — drives the renderer's highlight/flash. */
export type Effect =
  | { kind: 'new'; loc: Loc }
  | { kind: 'field-write'; loc: Loc; field: string }
  | { kind: 'arr-write'; loc: Loc; index: number }
  | { kind: 'local-write'; name: string }
  | { kind: 'self-write'; field: string } // Model B: functional update of this
  | { kind: 'push-frame' }
  | { kind: 'pop-frame' }
  | { kind: 'output' };

export interface MachineState {
  model: ValueModel;
  control: Control;
  stack: Frame[];
  /** Model A only; stays empty under Model B (the "no store" invariant). */
  heap: Map<Loc, HeapObj>;
  output: string[];
  nextLoc: Loc;
  status: 'running' | 'done' | 'error';
  error: string | null;
  table: ClassTable;
  stepCount: number;
  /** Rule applied by the step that produced this state (design-note names). */
  lastRule: string | null;
  lastEffect: Effect | null;
  /** Most recent Stmt/Expr block — the highlight target. */
  focusBlockId: string | null;
}

export const INT_V = (n: number): MachineValue => ({ tag: 'Int', n });
export const BOOL_V = (b: boolean): MachineValue => ({ tag: 'Bool', b });
export const STR_V = (s: string): MachineValue => ({ tag: 'Str', s });
export const NULL_V: MachineValue = { tag: 'Null' };
export const REF_V = (loc: Loc): MachineValue => ({ tag: 'Ref', loc });

export function formatMachineValue(value: MachineValue, depth = 0): string {
  switch (value.tag) {
    case 'Int':
      return String(value.n);
    case 'Bool':
      return String(value.b);
    case 'Str':
      // Raw, as Java's println prints it (matches formatRuntimeValue).
      return value.s;
    case 'Null':
      return 'null';
    case 'Ref':
      return `#${value.loc}`;
    case 'Obj': {
      if (depth > 4) return `${value.className}{…}`;
      const fields = [...value.fields]
        .map(([name, v]) => `${name}: ${formatMachineValue(v, depth + 1)}`)
        .join(', ');
      return `${value.className}{${fields}}`;
    }
    case 'Arr':
      return depth > 4 ? '[…]' : `[${value.elems.map((v) => formatMachineValue(v, depth + 1)).join(', ')}]`;
  }
}

function defaultValueFor(ty: Ty): MachineValue {
  if (ty.tag === 'Prim') {
    return ty.name === 'Int' ? INT_V(0) : ty.name === 'String' ? STR_V('') : BOOL_V(false);
  }
  return NULL_V;
}

function cloneState(state: MachineState): MachineState {
  return {
    ...state,
    stack: state.stack.map((frame) => ({
      ...frame,
      locals: new Map(frame.locals),
      kont: [...frame.kont]
    })),
    heap: new Map(
      [...state.heap].map(([loc, obj]) => [
        loc,
        obj.tag === 'Obj' ? { ...obj, fields: new Map(obj.fields) } : { ...obj, elems: [...obj.elems] }
      ])
    ),
    output: [...state.output],
    lastRule: null,
    lastEffect: null
  };
}

function fail(state: MachineState, message: string): MachineState {
  state.status = 'error';
  state.error = message;
  state.lastRule = 'stuck';
  return state;
}

function top(state: MachineState): Frame {
  return state.stack[state.stack.length - 1];
}

function focusStmt(state: MachineState, block: Blockly.Block): void {
  state.control = { tag: 'Stmt', block };
  state.focusBlockId = block.id;
}

function focusExpr(state: MachineState, block: Blockly.Block | null, holeMessage: string): boolean {
  if (!block) {
    fail(state, `Incomplete program: ${holeMessage}.`);
    return false;
  }
  state.control = { tag: 'Expr', block };
  state.focusBlockId = block.id;
  return true;
}

function produce(state: MachineState, value: MachineValue): void {
  state.control = { tag: 'Value', value };
}

function done(state: MachineState): void {
  state.control = { tag: 'Done' };
}

/** Enters a statement chain: first statement, or Done for an empty chain. */
function enterChain(state: MachineState, first: Blockly.Block | null): void {
  if (!first) {
    done(state);
    return;
  }
  top(state).kont.push({ tag: 'KStmtSeq', next: first.getNextBlock() });
  focusStmt(state, first);
}

function asInt(value: MachineValue): number | null {
  return value.tag === 'Int' ? value.n : null;
}

function asBool(value: MachineValue): boolean | null {
  return value.tag === 'Bool' ? value.b : null;
}

/** Resolves an array value under either model. `loc` is null under Model B. */
function resolveArray(
  state: MachineState,
  value: MachineValue
): { loc: Loc | null; elems: MachineValue[] } | string {
  if (value.tag === 'Null') return 'null dereference: the array is null';
  if (value.tag === 'Arr') return { loc: null, elems: value.elems };
  if (value.tag !== 'Ref') return `expected an int[], found ${formatMachineValue(value)}`;
  const obj = state.heap.get(value.loc);
  if (!obj || obj.tag !== 'Arr') return 'expected an int[] in the heap';
  return { loc: value.loc, elems: obj.elems };
}

function defaultFields(state: MachineState, className: string): Map<string, MachineValue> | string {
  const classSym = state.table.classes.get(className);
  if (!classSym) return `Class '${className}' is not declared`;
  const fields = new Map<string, MachineValue>();
  // Base-to-derived so a shadowing redeclaration ends up with the subclass's slot.
  for (const sym of [...classAndAncestors(state.table, classSym)].reverse()) {
    for (const field of sym.fields.values()) fields.set(field.name, defaultValueFor(field.ty));
  }
  return fields;
}

function allocateObject(state: MachineState, className: string, blockId: string): MachineValue | string {
  const fields = defaultFields(state, className);
  if (typeof fields === 'string') return fields;
  if (state.model === 'B') {
    // Model B: the object IS the value — no store, no arrow.
    return { tag: 'Obj', className, fields };
  }
  const loc = state.nextLoc++;
  state.heap.set(loc, { tag: 'Obj', className, fields, blockId });
  state.lastEffect = { kind: 'new', loc };
  return REF_V(loc);
}

/** Model B: functional update of the frame's own `this` structure. */
function updateSelfField(frame: Frame, name: string, value: MachineValue): void {
  const fields = new Map(frame.selfObj!.fields);
  fields.set(name, value);
  frame.selfObj = { tag: 'Obj', className: frame.selfObj!.className, fields };
}

function pushFrame(
  state: MachineState,
  callBlock: Blockly.Block,
  recv: MachineValue,
  args: MachineValue[]
): MachineState {
  if (recv.tag === 'Null') return fail(state, 'null dereference: the receiver is null');

  // Dynamic dispatch: lookup starts from the receiver's own class — the heap
  // object's under Model A, the inline structure's under Model B.
  let dynamicClassName: string;
  let selfLoc: Loc | null = null;
  let selfObj: ObjValue | null = null;
  if (state.model === 'B') {
    if (recv.tag !== 'Obj') return fail(state, `cannot call a method on ${formatMachineValue(recv)}`);
    dynamicClassName = recv.className;
    // Call-by-structure: `this` is the value itself, bound by copy (values
    // are immutable, so sharing IS copying).
    selfObj = recv;
  } else {
    if (recv.tag !== 'Ref') return fail(state, `cannot call a method on ${formatMachineValue(recv)}`);
    const heapObj = state.heap.get(recv.loc);
    if (!heapObj || heapObj.tag !== 'Obj') return fail(state, 'cannot call a method on an int[]');
    dynamicClassName = heapObj.className;
    selfLoc = recv.loc;
  }

  const dynamicClass = state.table.classes.get(dynamicClassName);
  if (!dynamicClass) return fail(state, `Class '${dynamicClassName}' is not declared`);
  const methodName = fieldValue(callBlock, 'METHOD', 'method');
  const found = findMethod(state.table, dynamicClass, methodName);
  if (!found) return fail(state, `Method '${methodName}' is not defined in class '${dynamicClassName}'`);
  const { method, owner } = found;
  if (args.length !== method.params.length) {
    return fail(state, `Method '${methodName}' expects ${method.params.length} argument(s), found ${args.length}`);
  }

  const locals = new Map<string, MachineValue>();
  method.params.forEach((param, i) => locals.set(param.name, args[i]));
  for (const varBlock of statementChain(inputTarget(method.block, 'VARS'))) {
    if (varBlock.type !== 'mj_var_declaration') continue;
    locals.set(fieldValue(varBlock, 'NAME', 'x'), defaultValueFor(localVarTy(state.table, varBlock)));
  }

  state.stack.push({
    method: `${owner.name}.${methodName}`,
    self: selfLoc,
    selfObj,
    locals,
    kont: [],
    blockId: method.block.id,
    callBlockId: callBlock.id,
    returnBlock: inputTarget(method.block, 'RETURN'),
    returningNow: false
  });
  state.lastRule = 'call';
  state.lastEffect = { kind: 'push-frame' };
  state.focusBlockId = method.block.id;
  enterChain(state, inputTarget(method.block, 'BODY'));
  return state;
}

function localVarTy(table: ClassTable, varBlock: Blockly.Block): Ty {
  const typeBlock = inputTarget(varBlock, 'TYPE');
  switch (typeBlock?.type) {
    case 'mj_type_int':
      return { tag: 'Prim', name: 'Int' };
    case 'mj_type_boolean':
      return { tag: 'Prim', name: 'Bool' };
    case 'mj_type_int_array':
      return { tag: 'IntArray' };
    case 'mj_type_string':
      return { tag: 'Prim', name: 'String' };
    case 'mj_type_identifier':
      return { tag: 'Class', name: fieldValue(typeBlock, 'NAME', 'ClassName') };
    default:
      return { tag: 'Hole' };
  }
}

/** The arith/compare blocks' OP dropdown value -> machine rule. */
const ARITH_OPS: Record<string, BinOp> = {
  '+': 'add',
  '-': 'sub',
  '*': 'mul',
  '/': 'div'
};

const COMPARE_OPS: Record<string, BinOp> = {
  '<': 'less',
  '<=': 'leq',
  '>': 'gt',
  '>=': 'geq'
};

function beginStatement(state: MachineState, block: Blockly.Block): MachineState {
  const frame = top(state);
  switch (block.type) {
    case 'mj_statement_block':
      state.lastRule = 'block';
      enterChain(state, inputTarget(block, 'STATEMENTS'));
      return state;
    case 'mj_statement_if':
      frame.kont.push({ tag: 'KIf', block });
      state.lastRule = 'if';
      focusExpr(state, inputTarget(block, 'COND'), 'the if condition is empty');
      return state;
    case 'mj_statement_while':
      frame.kont.push({ tag: 'KWhile', block });
      state.lastRule = 'while';
      focusExpr(state, inputTarget(block, 'COND'), 'the while condition is empty');
      return state;
    case 'mj_statement_print':
      frame.kont.push({ tag: 'KPrint' });
      state.lastRule = 'println';
      focusExpr(state, inputTarget(block, 'VALUE'), 'System.out.println has no argument');
      return state;
    case 'mj_statement_assign':
      frame.kont.push({ tag: 'KAssign', name: fieldValue(block, 'NAME', 'x'), block });
      state.lastRule = 'assign';
      focusExpr(state, inputTarget(block, 'VALUE'), 'the assignment has no right-hand side');
      return state;
    case 'mj_statement_array_assign':
      frame.kont.push({
        tag: 'KArrAssignIdx',
        name: fieldValue(block, 'NAME', 'array'),
        valueBlock: inputTarget(block, 'VALUE'),
        block
      });
      state.lastRule = 'array-assign';
      focusExpr(state, inputTarget(block, 'INDEX'), 'the array index is empty');
      return state;
    default:
      return fail(state, `Unknown statement block '${block.type}'`);
  }
}

function beginExpression(state: MachineState, block: Blockly.Block): MachineState {
  const frame = top(state);
  switch (block.type) {
    case 'mj_expr_integer': {
      state.lastRule = 'lit';
      produce(state, INT_V(Number(block.getFieldValue('VALUE') ?? 0)));
      return state;
    }
    case 'mj_expr_string':
      state.lastRule = 'lit';
      produce(state, STR_V(String(block.getFieldValue('TEXT') ?? '')));
      return state;
    case 'mj_expr_boolean':
      state.lastRule = 'lit';
      produce(state, BOOL_V(block.getFieldValue('VALUE') === 'true'));
      return state;
    case 'mj_expr_this': {
      if (state.model === 'B') {
        if (!frame.selfObj) return fail(state, `'this' cannot be used inside main`);
        state.lastRule = 'this';
        produce(state, frame.selfObj);
        return state;
      }
      const self = frame.self;
      if (self === null) return fail(state, `'this' cannot be used inside main`);
      state.lastRule = 'this';
      produce(state, REF_V(self));
      return state;
    }
    case 'mj_expr_identifier': {
      const name = fieldValue(block, 'NAME', 'x');
      const local = frame.locals.get(name);
      if (local !== undefined) {
        state.lastRule = 'var';
        produce(state, local);
        return state;
      }
      if (frame.selfObj?.fields.has(name)) {
        state.lastRule = 'field-read';
        produce(state, frame.selfObj.fields.get(name)!);
        return state;
      }
      if (frame.self !== null) {
        const heapObj = state.heap.get(frame.self);
        if (heapObj?.tag === 'Obj' && heapObj.fields.has(name)) {
          state.lastRule = 'field-read';
          produce(state, heapObj.fields.get(name)!);
          return state;
        }
      }
      return fail(state, `Variable '${name}' is not declared`);
    }
    case 'mj_expr_parens':
      state.lastRule = 'parens';
      focusExpr(state, inputTarget(block, 'EXPR'), 'the parentheses are empty');
      return state;
    case 'mj_expr_not':
      frame.kont.push({ tag: 'KNot' });
      state.lastRule = 'not-operand';
      focusExpr(state, inputTarget(block, 'EXPR'), `'!' has no operand`);
      return state;
    case 'mj_expr_logic': {
      // Both connectives short-circuit, each with its own kontinuation.
      if (block.getFieldValue('OP') === '||') {
        frame.kont.push({ tag: 'KOr', rightBlock: inputTarget(block, 'RIGHT') });
        state.lastRule = 'or-left';
        focusExpr(state, inputTarget(block, 'LEFT'), `'||' has no left operand`);
        return state;
      }
      frame.kont.push({ tag: 'KAnd', rightBlock: inputTarget(block, 'RIGHT') });
      state.lastRule = 'and-left';
      focusExpr(state, inputTarget(block, 'LEFT'), `'&&' has no left operand`);
      return state;
    }
    case 'mj_expr_arith':
    case 'mj_expr_compare':
    case 'mj_expr_concat': {
      const op: BinOp =
        block.type === 'mj_expr_compare'
          ? COMPARE_OPS[block.getFieldValue('OP') ?? '<'] ?? 'less'
          : block.type === 'mj_expr_concat'
            ? 'concat'
            : ARITH_OPS[block.getFieldValue('OP') ?? '+'] ?? 'add';
      frame.kont.push({ tag: 'KBinL', op, rightBlock: inputTarget(block, 'RIGHT') });
      state.lastRule = 'binop';
      focusExpr(state, inputTarget(block, 'LEFT'), 'the operator has no left operand');
      return state;
    }
    case 'mj_expr_char_at':
      frame.kont.push({ tag: 'KCharAtStr', indexBlock: inputTarget(block, 'INDEX') });
      // Administrative: the salient 'char-at' fires only when the fold happens.
      state.lastRule = 'char-at-str';
      focusExpr(state, inputTarget(block, 'STR'), `'charAt' has no string`);
      return state;
    case 'mj_expr_str_length':
      frame.kont.push({ tag: 'KStrLength' });
      // Administrative: the salient 'str-length' fires only at the fold.
      state.lastRule = 'str-length-str';
      focusExpr(state, inputTarget(block, 'STR'), `'.length()' has no string`);
      return state;
    case 'mj_expr_array_lookup':
      frame.kont.push({ tag: 'KLookupArr', indexBlock: inputTarget(block, 'INDEX') });
      state.lastRule = 'array-lookup';
      focusExpr(state, inputTarget(block, 'ARRAY'), 'the array lookup has no array');
      return state;
    case 'mj_expr_array_length':
      frame.kont.push({ tag: 'KLength' });
      state.lastRule = 'array-length';
      focusExpr(state, inputTarget(block, 'ARRAY'), `'.length' has no array`);
      return state;
    case 'mj_expr_new_int_array':
      frame.kont.push({ tag: 'KNewArr', block });
      // Administrative: the salient 'new-array' fires when the array is
      // actually allocated, so a rule trace counts one per allocation.
      state.lastRule = 'new-array-size';
      focusExpr(state, inputTarget(block, 'SIZE'), 'the array size is empty');
      return state;
    case 'mj_expr_new_object': {
      const className = fieldValue(block, 'CLASS', 'ClassName');
      if (className === state.table.mainClassName) {
        return fail(state, `The main class '${className}' cannot be instantiated`);
      }
      const result = allocateObject(state, className, block.id);
      if (typeof result === 'string') return fail(state, result);
      state.lastRule = 'new';
      produce(state, result);
      return state;
    }
    case 'mj_expr_method_call':
      frame.kont.push({ tag: 'KCallRecv', block });
      state.lastRule = 'call-receiver';
      focusExpr(state, inputTarget(block, 'OBJECT'), 'the method call has no receiver');
      return state;
    default:
      return fail(state, `Unknown expression block '${block.type}'`);
  }
}

function applyBinOp(state: MachineState, op: BinOp, left: MachineValue, right: MachineValue): MachineState {
  if (op === 'concat') {
    if (left.tag !== 'Str' || right.tag !== 'Str') {
      return fail(state, `'concat' expects Strings, found ${formatMachineValue(left.tag !== 'Str' ? left : right)}`);
    }
    state.lastRule = 'concat';
    produce(state, STR_V(left.s + right.s));
    return state;
  }
  if (op === 'and' || op === 'or') {
    const l = asBool(left);
    const r = asBool(right);
    if (l === null || r === null) return fail(state, `'${op === 'and' ? '&&' : '||'}' expects booleans`);
    state.lastRule = op;
    produce(state, BOOL_V(op === 'and' ? l && r : l || r));
    return state;
  }
  const l = asInt(left);
  const r = asInt(right);
  if (l === null || r === null) {
    return fail(state, `arithmetic expects ints, found ${formatMachineValue(l === null ? left : right)}`);
  }
  switch (op) {
    case 'add':
      state.lastRule = 'add';
      produce(state, INT_V(l + r));
      return state;
    case 'sub':
      state.lastRule = 'sub';
      produce(state, INT_V(l - r));
      return state;
    case 'mul':
      state.lastRule = 'mul';
      produce(state, INT_V(l * r));
      return state;
    case 'div':
      // Java int division truncates toward zero; /0 throws.
      if (r === 0) return fail(state, 'division by zero');
      state.lastRule = 'div';
      produce(state, INT_V(Math.trunc(l / r)));
      return state;
    case 'less':
      state.lastRule = 'less';
      produce(state, BOOL_V(l < r));
      return state;
    case 'leq':
      state.lastRule = 'leq';
      produce(state, BOOL_V(l <= r));
      return state;
    case 'gt':
      state.lastRule = 'gt';
      produce(state, BOOL_V(l > r));
      return state;
    case 'geq':
      state.lastRule = 'geq';
      produce(state, BOOL_V(l >= r));
      return state;
  }
}

function writeVariable(state: MachineState, name: string, value: MachineValue, block: Blockly.Block): MachineState {
  const frame = top(state);
  if (frame.locals.has(name)) {
    frame.locals.set(name, value);
    state.lastRule = 'assign';
    state.lastEffect = { kind: 'local-write', name };
    state.focusBlockId = block.id;
    done(state);
    return state;
  }
  if (frame.selfObj?.fields.has(name)) {
    // Model B: functional update — the frame's OWN structure is rebuilt;
    // whatever the caller holds never changes.
    updateSelfField(frame, name, value);
    state.lastRule = 'field-update';
    state.lastEffect = { kind: 'self-write', field: name };
    state.focusBlockId = block.id;
    done(state);
    return state;
  }
  if (frame.self !== null) {
    const heapObj = state.heap.get(frame.self);
    if (heapObj?.tag === 'Obj' && heapObj.fields.has(name)) {
      heapObj.fields.set(name, value);
      state.lastRule = 'field-write';
      state.lastEffect = { kind: 'field-write', loc: frame.self, field: name };
      state.focusBlockId = block.id;
      done(state);
      return state;
    }
  }
  return fail(state, `Variable '${name}' is not declared`);
}

function applyKont(state: MachineState, value: MachineValue | null): MachineState {
  const frame = top(state);
  const kont = frame.kont.pop();

  // Frame exhausted: main finishes on Done; a method moves to its return
  // expression on Done, and delivers its value to the caller on Value.
  if (!kont) {
    if (value === null) {
      if (frame.returnBlock && !frame.returningNow) {
        frame.returningNow = true;
        state.lastRule = 'return-focus';
        focusExpr(state, frame.returnBlock, 'the method has no return expression');
        return state;
      }
      if (state.stack.length === 1) {
        state.status = 'done';
        state.lastRule = 'halt';
        return state;
      }
      return fail(state, 'method ended without a return value');
    }
    if (state.stack.length === 1) return fail(state, 'unexpected value at top level');
    state.stack.pop();
    state.lastRule = 'return';
    state.lastEffect = { kind: 'pop-frame' };
    produce(state, value);
    return state;
  }

  switch (kont.tag) {
    case 'KStmtSeq': {
      if (value !== null) return fail(state, 'a statement produced a value');
      if (kont.next) {
        frame.kont.push({ tag: 'KStmtSeq', next: kont.next.getNextBlock() });
        state.lastRule = 'seq';
        focusStmt(state, kont.next);
        return state;
      }
      state.lastRule = 'seq-end';
      done(state);
      return state;
    }
    case 'KLoop': {
      if (value !== null) return fail(state, 'a loop body produced a value');
      state.lastRule = 'loop';
      focusStmt(state, kont.block);
      return state;
    }
    case 'KIf': {
      const cond = value === null ? null : asBool(value);
      if (cond === null) return fail(state, 'the if condition must be a boolean');
      state.lastRule = cond ? 'if-true' : 'if-false';
      enterChain(state, inputTarget(kont.block, cond ? 'THEN' : 'ELSE'));
      return state;
    }
    case 'KWhile': {
      const cond = value === null ? null : asBool(value);
      if (cond === null) return fail(state, 'the while condition must be a boolean');
      if (!cond) {
        state.lastRule = 'while-exit';
        done(state);
        return state;
      }
      frame.kont.push({ tag: 'KLoop', block: kont.block });
      state.lastRule = 'while-enter';
      enterChain(state, inputTarget(kont.block, 'BODY'));
      return state;
    }
    case 'KPrint': {
      if (value === null) return fail(state, 'println needs a value');
      state.output.push(formatMachineValue(value));
      state.lastRule = 'println';
      state.lastEffect = { kind: 'output' };
      done(state);
      return state;
    }
    case 'KAssign': {
      if (value === null) return fail(state, 'assignment needs a value');
      return writeVariable(state, kont.name, value, kont.block);
    }
    case 'KArrAssignIdx': {
      if (value === null) return fail(state, 'the array index must be an int');
      frame.kont.push({ tag: 'KArrAssignVal', name: kont.name, index: value, block: kont.block });
      state.lastRule = 'array-assign-index';
      focusExpr(state, kont.valueBlock, 'the array assignment has no right-hand side');
      return state;
    }
    case 'KArrAssignVal': {
      if (value === null) return fail(state, 'the array assignment needs a value');
      const isLocal = frame.locals.has(kont.name);
      const isSelfField = !isLocal && !!frame.selfObj?.fields.has(kont.name);
      let arrValue = isLocal ? frame.locals.get(kont.name) : undefined;
      if (arrValue === undefined && isSelfField) arrValue = frame.selfObj!.fields.get(kont.name);
      if (arrValue === undefined && frame.self !== null) {
        const heapObj = state.heap.get(frame.self);
        if (heapObj?.tag === 'Obj') arrValue = heapObj.fields.get(kont.name);
      }
      if (arrValue === undefined) return fail(state, `Variable '${kont.name}' is not declared`);
      const target = resolveArray(state, arrValue);
      if (typeof target === 'string') return fail(state, target);
      const index = asInt(kont.index);
      if (index === null) return fail(state, 'the array index must be an int');
      if (index < 0 || index >= target.elems.length) {
        return fail(state, `array index ${index} out of bounds for length ${target.elems.length}`);
      }
      if (target.loc === null) {
        // Model B: build a NEW array and rebind the variable; other copies of
        // the old array are untouched.
        const elems = [...target.elems];
        elems[index] = value;
        const updated: MachineValue = { tag: 'Arr', elems };
        if (isLocal) {
          frame.locals.set(kont.name, updated);
          state.lastEffect = { kind: 'local-write', name: kont.name };
        } else {
          updateSelfField(frame, kont.name, updated);
          state.lastEffect = { kind: 'self-write', field: kont.name };
        }
        state.lastRule = 'array-update';
        done(state);
        return state;
      }
      target.elems[index] = value;
      state.lastRule = 'array-write';
      state.lastEffect = { kind: 'arr-write', loc: target.loc, index };
      done(state);
      return state;
    }
    case 'KNot': {
      const operand = value === null ? null : asBool(value);
      if (operand === null) return fail(state, `'!' expects a boolean`);
      state.lastRule = 'not';
      produce(state, BOOL_V(!operand));
      return state;
    }
    case 'KAnd': {
      const left = value === null ? null : asBool(value);
      if (left === null) return fail(state, `'&&' expects booleans`);
      if (!left) {
        state.lastRule = 'and-short-circuit';
        produce(state, BOOL_V(false));
        return state;
      }
      frame.kont.push({ tag: 'KBinR', op: 'and', left: BOOL_V(true) });
      state.lastRule = 'and-right';
      focusExpr(state, kont.rightBlock, `'&&' has no right operand`);
      return state;
    }
    case 'KOr': {
      const left = value === null ? null : asBool(value);
      if (left === null) return fail(state, `'||' expects booleans`);
      if (left) {
        state.lastRule = 'or-short-circuit';
        produce(state, BOOL_V(true));
        return state;
      }
      frame.kont.push({ tag: 'KBinR', op: 'or', left: BOOL_V(false) });
      state.lastRule = 'or-right';
      focusExpr(state, kont.rightBlock, `'||' has no right operand`);
      return state;
    }
    case 'KBinL': {
      if (value === null) return fail(state, 'the operator needs a left value');
      frame.kont.push({ tag: 'KBinR', op: kont.op, left: value });
      state.lastRule = 'binop-right';
      focusExpr(state, kont.rightBlock, 'the operator has no right operand');
      return state;
    }
    case 'KBinR': {
      if (value === null) return fail(state, 'the operator needs a right value');
      return applyBinOp(state, kont.op, kont.left, value);
    }
    case 'KLookupArr': {
      if (value === null) return fail(state, 'the array lookup needs an array');
      frame.kont.push({ tag: 'KLookupIdx', arr: value });
      state.lastRule = 'array-lookup-index';
      focusExpr(state, kont.indexBlock, 'the array lookup has no index');
      return state;
    }
    case 'KLookupIdx': {
      if (value === null) return fail(state, 'the array index must be an int');
      const target = resolveArray(state, kont.arr);
      if (typeof target === 'string') return fail(state, target);
      const index = asInt(value);
      if (index === null) return fail(state, 'the array index must be an int');
      if (index < 0 || index >= target.elems.length) {
        return fail(state, `array index ${index} out of bounds for length ${target.elems.length}`);
      }
      state.lastRule = 'array-read';
      produce(state, target.elems[index]);
      return state;
    }
    case 'KLength': {
      if (value === null) return fail(state, `'.length' needs an array`);
      const target = resolveArray(state, value);
      if (typeof target === 'string') return fail(state, target);
      state.lastRule = 'array-length';
      produce(state, INT_V(target.elems.length));
      return state;
    }
    case 'KCharAtStr': {
      if (value === null) return fail(state, `'charAt' needs a String`);
      if (value.tag !== 'Str') return fail(state, `'charAt' expects a String, found ${formatMachineValue(value)}`);
      frame.kont.push({ tag: 'KCharAtIdx', str: value });
      state.lastRule = 'char-at-index';
      focusExpr(state, kont.indexBlock, `'charAt' has no index`);
      return state;
    }
    case 'KStrLength': {
      if (value === null) return fail(state, `'.length()' needs a String`);
      if (value.tag !== 'Str') return fail(state, `'.length()' expects a String, found ${formatMachineValue(value)}`);
      state.lastRule = 'str-length';
      produce(state, INT_V(value.s.length));
      return state;
    }
    case 'KCharAtIdx': {
      const index = value === null ? null : asInt(value);
      if (index === null) return fail(state, `the 'charAt' index must be an int`);
      if (kont.str.tag !== 'Str') return fail(state, `'charAt' expects a String`);
      const str = kont.str.s;
      if (index < 0 || index >= str.length) {
        return fail(state, `string index ${index} out of bounds for length ${str.length}`);
      }
      // charAt yields a 1-character String: the language has no char type.
      state.lastRule = 'char-at';
      produce(state, STR_V(str.charAt(index)));
      return state;
    }
    case 'KNewArr': {
      const size = value === null ? null : asInt(value);
      if (size === null) return fail(state, 'the array size must be an int');
      if (size < 0) return fail(state, `negative array size ${size}`);
      const elems = Array.from({ length: size }, () => INT_V(0));
      if (state.model === 'B') {
        state.lastRule = 'new-array';
        produce(state, { tag: 'Arr', elems });
        return state;
      }
      const loc = state.nextLoc++;
      state.heap.set(loc, { tag: 'Arr', elems, blockId: kont.block.id });
      state.lastRule = 'new-array';
      state.lastEffect = { kind: 'new', loc };
      produce(state, REF_V(loc));
      return state;
    }
    case 'KCallRecv': {
      if (value === null) return fail(state, 'the method call needs a receiver');
      const argBlocks = [...statementChain(inputTarget(kont.block, 'ARGS'))]
        .filter((item) => item.type === 'mj_argument_item')
        .map((item) => inputTarget(item, 'EXPR'));
      if (argBlocks.length === 0) return pushFrame(state, kont.block, value, []);
      frame.kont.push({ tag: 'KCallArgs', block: kont.block, recv: value, remaining: argBlocks.slice(1), done: [] });
      state.lastRule = 'call-arg';
      focusExpr(state, argBlocks[0], 'an argument socket is empty');
      return state;
    }
    case 'KCallArgs': {
      if (value === null) return fail(state, 'the method call needs an argument value');
      const doneVals = [...kont.done, value];
      if (kont.remaining.length === 0) return pushFrame(state, kont.block, kont.recv, doneVals);
      frame.kont.push({ tag: 'KCallArgs', block: kont.block, recv: kont.recv, remaining: kont.remaining.slice(1), done: doneVals });
      state.lastRule = 'call-arg';
      focusExpr(state, kont.remaining[0], 'an argument socket is empty');
      return state;
    }
  }
}

/** One small step. Pure: returns a fresh state; no-op once done or stuck. */
export function step(previous: MachineState): MachineState {
  if (previous.status !== 'running') return previous;
  const state = cloneState(previous);
  state.stepCount += 1;

  switch (state.control.tag) {
    case 'Stmt':
      return beginStatement(state, state.control.block);
    case 'Expr':
      return beginExpression(state, state.control.block);
    case 'Value':
      return applyKont(state, state.control.value);
    case 'Done':
      return applyKont(state, null);
  }
}

/** Builds the initial state from the program under the workspace's goal block. */
export function injectMachine(
  workspace: Blockly.Workspace,
  model: ValueModel = 'A'
): MachineState | { injectError: string } {
  const goal = workspace.getTopBlocks(false).find((block) => block.type === 'mj_goal');
  if (!goal) return { injectError: 'No program: the Program block is missing.' };
  const mainBlock = inputTarget(goal, 'MAIN');
  if (!mainBlock || mainBlock.type !== 'mj_main_class') {
    return { injectError: 'No program: the Main Class block is missing.' };
  }

  const table = buildClassTable(goal);
  const state: MachineState = {
    model,
    control: { tag: 'Done' },
    stack: [
      {
        method: 'main',
        self: null,
        selfObj: null,
        locals: new Map(),
        kont: [],
        blockId: mainBlock.id,
        callBlockId: null,
        returnBlock: null,
        returningNow: false
      }
    ],
    heap: new Map(),
    output: [],
    nextLoc: 1,
    status: 'running',
    error: null,
    table,
    stepCount: 0,
    lastRule: null,
    lastEffect: null,
    focusBlockId: mainBlock.id
  };

  const first = inputTarget(mainBlock, 'STATEMENT');
  if (first) {
    state.stack[0].kont.push({ tag: 'KStmtSeq', next: first.getNextBlock() });
    state.control = { tag: 'Stmt', block: first };
    state.focusBlockId = first.id;
  } else {
    state.status = 'done';
  }
  return state;
}

/** Steps to completion (bounded); returns the final state. */
export function run(initial: MachineState, maxSteps = 100000): MachineState {
  let state = initial;
  while (state.status === 'running' && state.stepCount < maxSteps) state = step(state);
  if (state.status === 'running') {
    state = { ...state, status: 'error', error: `did not finish within ${maxSteps} steps` };
  }
  return state;
}
