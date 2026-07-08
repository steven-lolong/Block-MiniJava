/**
 * The MiniJava type checker.
 *
 * Checks the program reachable from the goal block and returns diagnostics
 * anchored to block ids. Incomplete programs check with partial information:
 * empty expression sockets and unresolvable subexpressions type as Hole and
 * never cascade into follow-on errors.
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
import { BOOL, classTy, formatTy, HOLE, INT, INT_ARRAY, STRING_ARRAY, tyEquals, type Ty } from './ty';

export type { TypeDiagnostic } from './classTable';

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

function error(ctx: CheckContext, blockId: string, message: string): void {
  ctx.diags.push({ blockId, severity: 'error', message });
}

function lookupVariable(ctx: CheckContext, name: string): { ty: Ty } | null {
  const local = ctx.locals.get(name);
  if (local) return local;
  if (ctx.currentClass) {
    const field = findField(ctx.table, ctx.currentClass, name);
    if (field) return field;
  }
  return null;
}

/** Checks the expression in an input against an expected type. Empty sockets are silent holes. */
function expectExpr(ctx: CheckContext, block: Blockly.Block, input: string, expected: Ty): void {
  const child = inputTarget(block, input);
  const ty = checkExpression(ctx, child);
  if (!child) return;
  if (!isAssignable(ctx.table, ty, expected)) {
    error(ctx, child.id, `Expected ${formatTy(expected)}, found ${formatTy(ty)}.`);
  }
}

function checkStatements(ctx: CheckContext, start: Blockly.Block | null): void {
  for (const block of statementChain(start)) checkStatement(ctx, block);
}

function checkStatement(ctx: CheckContext, block: Blockly.Block): void {
  switch (block.type) {
    case 'mj_statement_block':
      checkStatements(ctx, inputTarget(block, 'STATEMENTS'));
      return;
    case 'mj_statement_if':
      expectExpr(ctx, block, 'COND', BOOL);
      checkStatements(ctx, inputTarget(block, 'THEN'));
      checkStatements(ctx, inputTarget(block, 'ELSE'));
      return;
    case 'mj_statement_while':
      expectExpr(ctx, block, 'COND', BOOL);
      checkStatements(ctx, inputTarget(block, 'BODY'));
      return;
    case 'mj_statement_print':
      expectExpr(ctx, block, 'VALUE', INT);
      return;
    case 'mj_statement_assign': {
      const name = fieldValue(block, 'NAME', 'x');
      const slot = lookupVariable(ctx, name);
      const valueBlock = inputTarget(block, 'VALUE');
      const valueTy = checkExpression(ctx, valueBlock);
      if (!slot) {
        error(ctx, block.id, `Variable '${name}' is not declared.`);
        return;
      }
      if (valueBlock && !isAssignable(ctx.table, valueTy, slot.ty)) {
        error(ctx, valueBlock.id, `Cannot assign ${formatTy(valueTy)} to '${name}' (${formatTy(slot.ty)}).`);
      }
      return;
    }
    case 'mj_statement_array_assign': {
      const name = fieldValue(block, 'NAME', 'array');
      const slot = lookupVariable(ctx, name);
      if (!slot) {
        error(ctx, block.id, `Variable '${name}' is not declared.`);
      } else if (slot.ty.tag !== 'Hole' && !tyEquals(slot.ty, INT_ARRAY)) {
        error(ctx, block.id, `'${name}' is not an int[] (found ${formatTy(slot.ty)}).`);
      }
      expectExpr(ctx, block, 'INDEX', INT);
      expectExpr(ctx, block, 'VALUE', INT);
      return;
    }
    default:
      return;
  }
}

function checkMethodCall(ctx: CheckContext, block: Blockly.Block): Ty {
  const receiverBlock = inputTarget(block, 'OBJECT');
  const receiverTy = checkExpression(ctx, receiverBlock);
  const argItems = [...statementChain(inputTarget(block, 'ARGS'))].filter(
    (item) => item.type === 'mj_argument_item'
  );
  const argBlocks = argItems.map((item) => inputTarget(item, 'EXPR'));
  const argTys = argBlocks.map((argBlock) => checkExpression(ctx, argBlock));

  if (receiverTy.tag === 'Hole') return HOLE;
  if (receiverTy.tag !== 'Class') {
    if (receiverBlock) {
      error(ctx, receiverBlock.id, `Cannot call a method on ${formatTy(receiverTy)}.`);
    }
    return HOLE;
  }
  const classSym = ctx.table.classes.get(receiverTy.name);
  // An unknown receiver class was already reported at its annotation site.
  if (!classSym) return HOLE;

  const methodName = fieldValue(block, 'METHOD', 'method');
  const found = findMethod(ctx.table, classSym, methodName);
  if (!found) {
    error(ctx, block.id, `Method '${methodName}' is not defined in class '${receiverTy.name}'.`);
    return HOLE;
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
  return method.ret;
}

function checkExpression(ctx: CheckContext, block: Blockly.Block | null): Ty {
  if (!block) return HOLE;
  switch (block.type) {
    case 'mj_expr_integer':
      return INT;
    case 'mj_expr_true':
    case 'mj_expr_false':
      return BOOL;
    case 'mj_expr_and':
      expectExpr(ctx, block, 'LEFT', BOOL);
      expectExpr(ctx, block, 'RIGHT', BOOL);
      return BOOL;
    case 'mj_expr_less':
      expectExpr(ctx, block, 'LEFT', INT);
      expectExpr(ctx, block, 'RIGHT', INT);
      return BOOL;
    case 'mj_expr_plus':
    case 'mj_expr_minus':
    case 'mj_expr_times':
      expectExpr(ctx, block, 'LEFT', INT);
      expectExpr(ctx, block, 'RIGHT', INT);
      return INT;
    case 'mj_expr_not':
      expectExpr(ctx, block, 'EXPR', BOOL);
      return BOOL;
    case 'mj_expr_parens':
      return checkExpression(ctx, inputTarget(block, 'EXPR'));
    case 'mj_expr_array_lookup':
      expectExpr(ctx, block, 'ARRAY', INT_ARRAY);
      expectExpr(ctx, block, 'INDEX', INT);
      return INT;
    case 'mj_expr_array_length':
      expectExpr(ctx, block, 'ARRAY', INT_ARRAY);
      return INT;
    case 'mj_expr_new_int_array':
      expectExpr(ctx, block, 'SIZE', INT);
      return INT_ARRAY;
    case 'mj_expr_new_object': {
      const name = fieldValue(block, 'CLASS', 'ClassName');
      if (name === ctx.table.mainClassName) {
        error(ctx, block.id, `The main class '${name}' cannot be instantiated.`);
        return HOLE;
      }
      if (!ctx.table.classes.has(name)) {
        error(ctx, block.id, `Class '${name}' is not declared.`);
        return HOLE;
      }
      return classTy(name);
    }
    case 'mj_expr_this':
      if (!ctx.currentClass) {
        error(ctx, block.id, `'this' cannot be used inside main.`);
        return HOLE;
      }
      return classTy(ctx.currentClass.name);
    case 'mj_expr_identifier': {
      const name = fieldValue(block, 'NAME', 'x');
      const slot = lookupVariable(ctx, name);
      if (!slot) {
        error(ctx, block.id, `Variable '${name}' is not declared.`);
        return HOLE;
      }
      return slot.ty;
    }
    case 'mj_expr_method_call':
      return checkMethodCall(ctx, block);
    default:
      return HOLE;
  }
}

function checkMethod(table: ClassTable, diags: TypeDiagnostic[], owner: ClassSym, methodName: string): void {
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

  checkStatements(ctx, inputTarget(method.block, 'BODY'));

  const returnBlock = inputTarget(method.block, 'RETURN');
  const returnTy = checkExpression(ctx, returnBlock);
  if (returnBlock && !isAssignable(table, returnTy, method.ret)) {
    error(
      ctx,
      returnBlock.id,
      `Method '${methodName}' must return ${formatTy(method.ret)}, found ${formatTy(returnTy)}.`
    );
  }

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
}

export function checkWorkspace(workspace: Blockly.Workspace): TypeDiagnostic[] {
  const goal = workspace.getTopBlocks(false).find((block) => block.type === 'mj_goal');
  if (!goal) return [];

  const table = buildClassTable(goal);
  const diags = table.diagnostics;

  const mainBlock = inputTarget(goal, 'MAIN');
  if (mainBlock && mainBlock.type === 'mj_main_class') {
    const ctx: CheckContext = {
      table,
      diags,
      currentClass: null,
      locals: new Map([[fieldValue(mainBlock, 'ARG', 'args'), { ty: STRING_ARRAY, blockId: mainBlock.id }]])
    };
    checkStatements(ctx, inputTarget(mainBlock, 'STATEMENT'));
  }

  for (const sym of table.classes.values()) {
    for (const methodName of sym.methods.keys()) {
      checkMethod(table, diags, sym, methodName);
    }
  }

  return diags;
}
