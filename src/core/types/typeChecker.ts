/**
 * The MiniJava type checker.
 *
 * Checks the program reachable from the goal block and returns diagnostics
 * anchored to block ids. Incomplete programs check with partial information:
 * empty expression sockets and unresolvable subexpressions type as Hole and
 * never cascade into follow-on errors.
 *
 * The same walk also records a typing *derivation* per method (plus main) —
 * named rule instances (T-Var, T-Invk, WF-Assign, M-OK, ...) with their
 * premises — consumed by the inspector's Typing tab via `deriveProgram`.
 * The two consumers (Problems tab, Typing tab) share one implementation, so
 * the derivation can never drift from what the checker actually did.
 *
 * Headless-safe: uses only Blockly.Block structure APIs so the same checker
 * runs in the IDE and in the node test battery.
 */

import * as Blockly from 'blockly';
import {
  buildClassTable,
  checkTypeAnnotation,
  classAndAncestors,
  fieldValue,
  findField,
  findMethod,
  inputTarget,
  isAssignable,
  isSubtype,
  statementChain,
  type ClassSym,
  type ClassTable,
  type TypeDiagnostic
} from './classTable';
import { BOOL, classTy, formatTy, HOLE, INT, INT_ARRAY, STRING, STRING_ARRAY, tyEquals, type Ty } from './ty';
import { generateBlock } from '../generator/minijavaGenerator';

export type { TypeDiagnostic } from './classTable';

/** One rule instance in a typing derivation (premises above, conclusion below). */
export interface Derivation {
  rule: string;
  judgement: string;
  ty: string;
  premises: Derivation[];
  blockId?: string;
  note?: string;
}

/** A method's (or main's) full derivation, one entry per picker option. */
export interface MethodDerivation {
  label: string;
  /** Legend text: `this:C, x:int, ...` — Γ is fixed across a method body. */
  gamma: string;
  /** The M-OK root; its premises are the statement rows plus the return row. */
  deriv: Derivation;
  blockId: string;
}

interface LocalSlot {
  ty: Ty;
  blockId: string;
}

interface CheckContext {
  table: ClassTable;
  diags: TypeDiagnostic[];
  /** null while checking the main method. */
  currentClass: ClassSym | null;
  /** Parameters and locals (and main's String[] argument), by copy semantics. */
  locals: Map<string, LocalSlot>;
}

interface TypedExpr {
  ty: Ty;
  deriv: Derivation;
}

function error(ctx: CheckContext, blockId: string, message: string): void {
  ctx.diags.push({ blockId, severity: 'error', message });
}

function lookupVariable(ctx: CheckContext, name: string): { ty: Ty; origin: 'local' | 'field' } | null {
  const local = ctx.locals.get(name);
  if (local) return { ty: local.ty, origin: 'local' };
  if (ctx.currentClass) {
    const field = findField(ctx.table, ctx.currentClass, name);
    if (field) return { ty: field.ty, origin: 'field' };
  }
  return null;
}

/* ------------------------------------------------------- derivation helpers */

/** MiniJava text of an expression block for judgement strings; `□` when empty.
 * Nested empty sockets inside a non-empty expression render with the
 * generator's defaults (`0`/`true`) — only a top-level hole shows `□`. */
function exprText(block: Blockly.Block | null): string {
  if (!block) return '□';
  return generateBlock(block) || '□';
}

/** Statement headline without the generator's trailing `;`. */
function stmtText(block: Blockly.Block): string {
  const text = generateBlock(block);
  return text.endsWith(';') ? text.slice(0, -1) : text;
}

/** How the variable was resolved, for T-Var/WF-Assign side-condition notes. */
function bindingNote(ctx: CheckContext, name: string, slot: { ty: Ty; origin: 'local' | 'field' }): string {
  return slot.origin === 'local'
    ? `Γ(${name}) = ${formatTy(slot.ty)}`
    : `fields(${ctx.currentClass!.name})(${name}) = ${formatTy(slot.ty)}`;
}

function exprNode(rule: string, block: Blockly.Block, ty: Ty, premises: Derivation[] = [], note?: string): Derivation {
  return {
    rule,
    judgement: `Γ ⊢ ${exprText(block)} : ${formatTy(ty)}`,
    ty: formatTy(ty),
    premises,
    blockId: block.id,
    note
  };
}

/** The derivation of an empty socket: no rule, just the hole. */
function holeDeriv(): Derivation {
  return { rule: '', judgement: '□', ty: '?', premises: [] };
}

function stmtNode(rule: string, block: Blockly.Block, headline: string, premises: Derivation[], note?: string): Derivation {
  return {
    rule,
    judgement: `Γ ⊢ ${headline} ok`,
    ty: 'ok',
    premises,
    blockId: block.id,
    note
  };
}

/* ----------------------------------------------------------------- checking */

/** Checks the expression in an input against an expected type. Empty sockets
 * are silent holes and contribute no premise. */
function expectExpr(ctx: CheckContext, block: Blockly.Block, input: string, expected: Ty): Derivation | null {
  const child = inputTarget(block, input);
  if (!child) return null;
  const { ty, deriv } = checkExpression(ctx, child);
  if (!isAssignable(ctx.table, ty, expected)) {
    error(ctx, child.id, `Expected ${formatTy(expected)}, found ${formatTy(ty)}.`);
  }
  return deriv;
}

function checkStatements(ctx: CheckContext, start: Blockly.Block | null): Derivation[] {
  const derivs: Derivation[] = [];
  for (const block of statementChain(start)) derivs.push(checkStatement(ctx, block));
  return derivs;
}

function checkStatement(ctx: CheckContext, block: Blockly.Block): Derivation {
  switch (block.type) {
    case 'mj_statement_block':
      return stmtNode('WF-Block', block, '{ … }', checkStatements(ctx, inputTarget(block, 'STATEMENTS')));
    case 'mj_statement_if': {
      const cond = expectExpr(ctx, block, 'COND', BOOL);
      const branches = [
        ...checkStatements(ctx, inputTarget(block, 'THEN')),
        ...checkStatements(ctx, inputTarget(block, 'ELSE'))
      ];
      const headline = `if (${exprText(inputTarget(block, 'COND'))}) … else …`;
      return stmtNode('WF-If', block, headline, cond ? [cond, ...branches] : branches);
    }
    case 'mj_statement_while': {
      const cond = expectExpr(ctx, block, 'COND', BOOL);
      const body = checkStatements(ctx, inputTarget(block, 'BODY'));
      const headline = `while (${exprText(inputTarget(block, 'COND'))}) …`;
      return stmtNode('WF-While', block, headline, cond ? [cond, ...body] : body);
    }
    case 'mj_statement_print': {
      // println prints int (classic MiniJava) or String (this extension).
      const valueBlock = inputTarget(block, 'VALUE');
      const { ty: valueTy, deriv } = checkExpression(ctx, valueBlock);
      if (
        valueBlock &&
        !isAssignable(ctx.table, valueTy, INT) &&
        !isAssignable(ctx.table, valueTy, STRING)
      ) {
        error(ctx, valueBlock.id, `Expected int or String, found ${formatTy(valueTy)}.`);
      }
      return stmtNode('WF-Print', block, stmtText(block), valueBlock ? [deriv] : []);
    }
    case 'mj_statement_assign': {
      const name = fieldValue(block, 'NAME', 'x');
      const slot = lookupVariable(ctx, name);
      const valueBlock = inputTarget(block, 'VALUE');
      const { ty: valueTy, deriv } = checkExpression(ctx, valueBlock);
      const premises = valueBlock ? [deriv] : [];
      if (!slot) {
        error(ctx, block.id, `Variable '${name}' is not declared.`);
        return stmtNode('WF-Assign', block, stmtText(block), premises, `${name} ∉ Γ`);
      }
      if (valueBlock && !isAssignable(ctx.table, valueTy, slot.ty)) {
        error(ctx, valueBlock.id, `Cannot assign ${formatTy(valueTy)} to '${name}' (${formatTy(slot.ty)}).`);
      }
      const note = `${bindingNote(ctx, name, slot)}, ${formatTy(valueTy)} <: ${formatTy(slot.ty)}`;
      return stmtNode('WF-Assign', block, stmtText(block), premises, note);
    }
    case 'mj_statement_array_assign': {
      const name = fieldValue(block, 'NAME', 'array');
      const slot = lookupVariable(ctx, name);
      if (!slot) {
        error(ctx, block.id, `Variable '${name}' is not declared.`);
      } else if (slot.ty.tag !== 'Hole' && !tyEquals(slot.ty, INT_ARRAY)) {
        error(ctx, block.id, `'${name}' is not an int[] (found ${formatTy(slot.ty)}).`);
      }
      const index = expectExpr(ctx, block, 'INDEX', INT);
      const value = expectExpr(ctx, block, 'VALUE', INT);
      const note = slot ? bindingNote(ctx, name, slot) : `${name} ∉ Γ`;
      return stmtNode('WF-ArrAssign', block, stmtText(block), [index, value].filter((d): d is Derivation => d !== null), note);
    }
    default:
      return { rule: '', judgement: '…', ty: 'ok', premises: [], blockId: block.id };
  }
}

function checkMethodCall(ctx: CheckContext, block: Blockly.Block): TypedExpr {
  const receiverBlock = inputTarget(block, 'OBJECT');
  const receiver = checkExpression(ctx, receiverBlock);
  const argItems = [...statementChain(inputTarget(block, 'ARGS'))].filter(
    (item) => item.type === 'mj_argument_item'
  );
  const argBlocks = argItems.map((item) => inputTarget(item, 'EXPR'));
  const args = argBlocks.map((argBlock) => checkExpression(ctx, argBlock));
  const argTys = args.map((arg) => arg.ty);
  const premises = [receiver.deriv, ...args.map((arg) => arg.deriv)];
  const receiverTy = receiver.ty;

  if (receiverTy.tag === 'Hole') return { ty: HOLE, deriv: exprNode('T-Invk', block, HOLE, premises) };
  if (receiverTy.tag !== 'Class') {
    if (receiverBlock) {
      error(ctx, receiverBlock.id, `Cannot call a method on ${formatTy(receiverTy)}.`);
    }
    return { ty: HOLE, deriv: exprNode('T-Invk', block, HOLE, premises) };
  }
  const classSym = ctx.table.classes.get(receiverTy.name);
  // An unknown receiver class was already reported at its annotation site.
  if (!classSym) return { ty: HOLE, deriv: exprNode('T-Invk', block, HOLE, premises) };

  const methodName = fieldValue(block, 'METHOD', 'method');
  const found = findMethod(ctx.table, classSym, methodName);
  if (!found) {
    error(ctx, block.id, `Method '${methodName}' is not defined in class '${receiverTy.name}'.`);
    return { ty: HOLE, deriv: exprNode('T-Invk', block, HOLE, premises) };
  }
  const { method } = found;
  if (argTys.length !== method.params.length) {
    error(
      ctx,
      block.id,
      `Method '${methodName}' expects ${method.params.length} argument(s), found ${argTys.length}.`
    );
  } else {
    method.params.forEach((param, i) => {
      const argBlock = argBlocks[i];
      if (argBlock && !isAssignable(ctx.table, argTys[i], param.ty)) {
        error(
          ctx,
          argBlock.id,
          `Argument ${i + 1} of '${methodName}': expected ${formatTy(param.ty)}, found ${formatTy(argTys[i])}.`
        );
      }
    });
  }
  const note = `mtype(${methodName}, ${receiverTy.name}) = (${method.params.map((p) => formatTy(p.ty)).join(', ')}) → ${formatTy(method.ret)}`;
  return { ty: method.ret, deriv: exprNode('T-Invk', block, method.ret, premises, note) };
}

function checkExpression(ctx: CheckContext, block: Blockly.Block | null): TypedExpr {
  if (!block) return { ty: HOLE, deriv: holeDeriv() };
  switch (block.type) {
    case 'mj_expr_integer':
      return { ty: INT, deriv: exprNode('T-Int', block, INT) };
    case 'mj_expr_string':
      return { ty: STRING, deriv: exprNode('T-Str', block, STRING) };
    case 'mj_expr_boolean':
      return { ty: BOOL, deriv: exprNode('T-Bool', block, BOOL) };
    case 'mj_expr_logic': {
      const rule = block.getFieldValue('OP') === '||' ? 'T-Or' : 'T-And';
      const premises = [expectExpr(ctx, block, 'LEFT', BOOL), expectExpr(ctx, block, 'RIGHT', BOOL)];
      return { ty: BOOL, deriv: exprNode(rule, block, BOOL, premises.filter((d): d is Derivation => d !== null)) };
    }
    case 'mj_expr_compare': {
      const premises = [expectExpr(ctx, block, 'LEFT', INT), expectExpr(ctx, block, 'RIGHT', INT)];
      return { ty: BOOL, deriv: exprNode('T-Cmp', block, BOOL, premises.filter((d): d is Derivation => d !== null)) };
    }
    case 'mj_expr_arith': {
      const premises = [expectExpr(ctx, block, 'LEFT', INT), expectExpr(ctx, block, 'RIGHT', INT)];
      return { ty: INT, deriv: exprNode('T-Arith', block, INT, premises.filter((d): d is Derivation => d !== null)) };
    }
    case 'mj_expr_not': {
      const premise = expectExpr(ctx, block, 'EXPR', BOOL);
      return { ty: BOOL, deriv: exprNode('T-Not', block, BOOL, premise ? [premise] : []) };
    }
    // Parens are typing-transparent: reuse the child's derivation, no extra node.
    case 'mj_expr_parens':
      return checkExpression(ctx, inputTarget(block, 'EXPR'));
    case 'mj_expr_array_lookup': {
      const premises = [expectExpr(ctx, block, 'ARRAY', INT_ARRAY), expectExpr(ctx, block, 'INDEX', INT)];
      return { ty: INT, deriv: exprNode('T-Lookup', block, INT, premises.filter((d): d is Derivation => d !== null)) };
    }
    case 'mj_expr_array_length': {
      const premise = expectExpr(ctx, block, 'ARRAY', INT_ARRAY);
      return { ty: INT, deriv: exprNode('T-Length', block, INT, premise ? [premise] : []) };
    }
    // charAt yields a 1-character String: the language has no char type.
    case 'mj_expr_char_at': {
      const premises = [expectExpr(ctx, block, 'STR', STRING), expectExpr(ctx, block, 'INDEX', INT)];
      return { ty: STRING, deriv: exprNode('T-CharAt', block, STRING, premises.filter((d): d is Derivation => d !== null)) };
    }
    case 'mj_expr_concat': {
      const premises = [expectExpr(ctx, block, 'LEFT', STRING), expectExpr(ctx, block, 'RIGHT', STRING)];
      return { ty: STRING, deriv: exprNode('T-Concat', block, STRING, premises.filter((d): d is Derivation => d !== null)) };
    }
    case 'mj_expr_str_length': {
      const premise = expectExpr(ctx, block, 'STR', STRING);
      return { ty: INT, deriv: exprNode('T-StrLen', block, INT, premise ? [premise] : []) };
    }
    case 'mj_expr_new_int_array': {
      const premise = expectExpr(ctx, block, 'SIZE', INT);
      return { ty: INT_ARRAY, deriv: exprNode('T-NewArr', block, INT_ARRAY, premise ? [premise] : []) };
    }
    case 'mj_expr_new_object': {
      const name = fieldValue(block, 'CLASS', 'ClassName');
      if (name === ctx.table.mainClassName) {
        error(ctx, block.id, `The main class '${name}' cannot be instantiated.`);
        return { ty: HOLE, deriv: exprNode('T-New', block, HOLE) };
      }
      if (!ctx.table.classes.has(name)) {
        error(ctx, block.id, `Class '${name}' is not declared.`);
        return { ty: HOLE, deriv: exprNode('T-New', block, HOLE) };
      }
      const ty = classTy(name);
      return { ty, deriv: exprNode('T-New', block, ty, [], `${name} declared`) };
    }
    case 'mj_expr_this': {
      if (!ctx.currentClass) {
        error(ctx, block.id, `'this' cannot be used inside main.`);
        return { ty: HOLE, deriv: exprNode('T-This', block, HOLE) };
      }
      const ty = classTy(ctx.currentClass.name);
      return { ty, deriv: exprNode('T-This', block, ty) };
    }
    case 'mj_expr_identifier': {
      const name = fieldValue(block, 'NAME', 'x');
      const slot = lookupVariable(ctx, name);
      if (!slot) {
        error(ctx, block.id, `Variable '${name}' is not declared.`);
        return { ty: HOLE, deriv: exprNode('T-Var', block, HOLE, [], `${name} ∉ Γ`) };
      }
      return { ty: slot.ty, deriv: exprNode('T-Var', block, slot.ty, [], bindingNote(ctx, name, slot)) };
    }
    case 'mj_expr_method_call':
      return checkMethodCall(ctx, block);
    default:
      return { ty: HOLE, deriv: { rule: '', judgement: exprText(block), ty: '?', premises: [], blockId: block.id } };
  }
}

/** Legend text for the method's fixed context: `this:C` first, then params
 * and locals in declaration order (they share `ctx.locals`). */
function gammaLegend(ctx: CheckContext): string {
  const parts: string[] = [];
  if (ctx.currentClass) parts.push(`this:${ctx.currentClass.name}`);
  for (const [name, slot] of ctx.locals) parts.push(`${name}:${formatTy(slot.ty)}`);
  return parts.length ? parts.join(', ') : '∅';
}

function checkMethod(table: ClassTable, diags: TypeDiagnostic[], owner: ClassSym, methodName: string): MethodDerivation {
  const method = owner.methods.get(methodName)!;
  const ctx: CheckContext = { table, diags, currentClass: owner, locals: new Map() };

  for (const param of method.params) {
    ctx.locals.set(param.name, { ty: param.ty, blockId: param.blockId });
  }

  // Method locals: params and locals share one scope, so clashes are errors.
  for (const varBlock of statementChain(inputTarget(method.block, 'VARS'))) {
    if (varBlock.type !== 'mj_var_declaration') continue;
    const name = fieldValue(varBlock, 'NAME', 'x');
    const ty = checkTypeAnnotation(inputTarget(varBlock, 'TYPE'), varBlock.id, table);
    if (ctx.locals.has(name)) {
      error(ctx, varBlock.id, `Variable '${name}' is already declared in method '${methodName}'.`);
      continue;
    }
    ctx.locals.set(name, { ty, blockId: varBlock.id });
  }

  const bodyDerivs = checkStatements(ctx, inputTarget(method.block, 'BODY'));

  const returnBlock = inputTarget(method.block, 'RETURN');
  const { ty: returnTy, deriv: returnDeriv } = checkExpression(ctx, returnBlock);
  if (returnBlock && !isAssignable(table, returnTy, method.ret)) {
    error(
      ctx,
      returnBlock.id,
      `Method '${methodName}' must return ${formatTy(method.ret)}, found ${formatTy(returnTy)}.`
    );
  }
  // Presentational row for what is formally a premise of M-OK itself.
  const returnRow: Derivation = {
    rule: 'WF-Return',
    judgement: `Γ ⊢ return ${exprText(returnBlock)} : ${formatTy(returnTy)}`,
    ty: formatTy(returnTy),
    premises: returnBlock ? [returnDeriv] : [],
    blockId: returnBlock?.id ?? method.block.id,
    note: `${formatTy(returnTy)} <: ${formatTy(method.ret)}`
  };

  // Overriding: identical parameter types, covariant return (no overloading).
  for (const ancestor of classAndAncestors(table, owner)) {
    if (ancestor.name === owner.name) continue;
    const overridden = ancestor.methods.get(methodName);
    if (!overridden) continue;
    const paramsMatch =
      overridden.params.length === method.params.length &&
      method.params.every((param, i) => tyEquals(param.ty, overridden.params[i].ty));
    if (!paramsMatch || !isSubtype(table, method.ret, overridden.ret)) {
      error(
        ctx,
        method.block.id,
        `Override of '${methodName}' must match the signature declared in class '${ancestor.name}'.`
      );
    }
    break;
  }

  return {
    label: `${owner.name}.${methodName}`,
    gamma: gammaLegend(ctx),
    deriv: {
      rule: 'M-OK',
      judgement: `method ${owner.name}.${methodName} ok`,
      ty: 'ok',
      premises: [...bodyDerivs, returnRow],
      blockId: method.block.id
    },
    blockId: method.block.id
  };
}

/** One walk, two products: the Problems tab's diagnostics and the Typing
 * tab's derivations come from the same rule applications. */
function checkProgram(workspace: Blockly.Workspace): { diags: TypeDiagnostic[]; derivations: MethodDerivation[] } {
  const goal = workspace.getTopBlocks(false).find((block) => block.type === 'mj_goal');
  if (!goal) return { diags: [], derivations: [] };

  const table = buildClassTable(goal);
  const diags = table.diagnostics;
  const derivations: MethodDerivation[] = [];

  const mainBlock = inputTarget(goal, 'MAIN');
  if (mainBlock && mainBlock.type === 'mj_main_class') {
    const ctx: CheckContext = {
      table,
      diags,
      currentClass: null,
      locals: new Map([[fieldValue(mainBlock, 'ARG', 'args'), { ty: STRING_ARRAY, blockId: mainBlock.id }]])
    };
    const bodyDerivs = checkStatements(ctx, inputTarget(mainBlock, 'STATEMENT'));
    derivations.push({
      label: 'main',
      gamma: gammaLegend(ctx),
      deriv: { rule: 'M-OK', judgement: 'method main ok', ty: 'ok', premises: bodyDerivs, blockId: mainBlock.id },
      blockId: mainBlock.id
    });
  }

  for (const sym of table.classes.values()) {
    for (const methodName of sym.methods.keys()) {
      derivations.push(checkMethod(table, diags, sym, methodName));
    }
  }

  return { diags, derivations };
}

export function checkWorkspace(workspace: Blockly.Workspace): TypeDiagnostic[] {
  return checkProgram(workspace).diags;
}

/** The typing derivations for the Typing tab: main first, then every C.m. */
export function deriveProgram(workspace: Blockly.Workspace): MethodDerivation[] {
  return checkProgram(workspace).derivations;
}
