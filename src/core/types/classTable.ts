/**
 * Layer 2 of the MiniJava type system: annotation sites and name resolution.
 *
 * Builds the class symbol table from the block program reachable from the
 * goal block (matching what the generator emits — detached scratch blocks
 * are not part of the program), validates every type annotation site
 * (field, parameter, return), resolves `extends` and detects cycles, and
 * exposes the subtype relation the checker uses.
 */

import * as Blockly from 'blockly';
import { classTy, HOLE, INT, INT_ARRAY, BOOL, tyEquals, type Ty } from './ty';

export interface TypeDiagnostic {
  blockId: string;
  severity: 'error' | 'warning';
  message: string;
}

export interface FieldSym {
  name: string;
  ty: Ty;
  blockId: string;
}

export interface ParamSym {
  name: string;
  ty: Ty;
  blockId: string;
}

export interface MethodSym {
  name: string;
  params: ParamSym[];
  ret: Ty;
  block: Blockly.Block;
}

export interface ClassSym {
  name: string;
  parent: string | null;
  fields: Map<string, FieldSym>;
  methods: Map<string, MethodSym>;
  block: Blockly.Block;
}

export interface ClassTable {
  mainClassName: string;
  classes: Map<string, ClassSym>;
  diagnostics: TypeDiagnostic[];
}

export function fieldValue(block: Blockly.Block, name: string, fallback: string): string {
  const value = block.getFieldValue(name);
  return value === null || value === undefined || value === '' ? fallback : String(value);
}

export function inputTarget(block: Blockly.Block, name: string): Blockly.Block | null {
  return block.getInputTargetBlock(name);
}

export function* statementChain(start: Blockly.Block | null): Generator<Blockly.Block> {
  let current = start;
  while (current) {
    yield current;
    current = current.getNextBlock();
  }
}

/** Syntactic reading of a Type socket; empty sockets are first-class Holes. */
export function tyFromTypeBlock(block: Blockly.Block | null): Ty {
  if (!block) return HOLE;
  switch (block.type) {
    case 'mj_type_int':
      return INT;
    case 'mj_type_boolean':
      return BOOL;
    case 'mj_type_int_array':
      return INT_ARRAY;
    case 'mj_type_identifier':
      return classTy(fieldValue(block, 'NAME', 'ClassName'));
    default:
      return HOLE;
  }
}

/**
 * Reads and validates one annotation site. An empty socket is a warning
 * (hole), a reference to an unknown class or to the main class is an error.
 */
export function checkTypeAnnotation(
  typeBlock: Blockly.Block | null,
  ownerBlockId: string,
  table: ClassTable
): Ty {
  if (!typeBlock) {
    table.diagnostics.push({
      blockId: ownerBlockId,
      severity: 'warning',
      message: 'Missing type: connect a Type block.'
    });
    return HOLE;
  }
  const ty = tyFromTypeBlock(typeBlock);
  if (ty.tag === 'Class') {
    if (ty.name === table.mainClassName) {
      table.diagnostics.push({
        blockId: typeBlock.id,
        severity: 'error',
        message: `The main class '${ty.name}' cannot be used as a type.`
      });
    } else if (!table.classes.has(ty.name)) {
      table.diagnostics.push({
        blockId: typeBlock.id,
        severity: 'error',
        message: `Class '${ty.name}' is not declared.`
      });
    }
  }
  return ty;
}

const CLASS_BLOCK_TYPES = new Set(['mj_class_declaration', 'mj_class_extends_declaration']);

export function buildClassTable(goal: Blockly.Block): ClassTable {
  const mainBlock = inputTarget(goal, 'MAIN');
  const table: ClassTable = {
    mainClassName: mainBlock ? fieldValue(mainBlock, 'CLASS', 'Main') : 'Main',
    classes: new Map(),
    diagnostics: []
  };

  // Pass 1: collect class names so later-declared classes resolve everywhere.
  const classBlocks = [...statementChain(inputTarget(goal, 'CLASSES'))].filter((block) =>
    CLASS_BLOCK_TYPES.has(block.type)
  );
  for (const block of classBlocks) {
    const name = fieldValue(block, 'CLASS', 'ClassName');
    if (name === table.mainClassName) {
      table.diagnostics.push({
        blockId: block.id,
        severity: 'error',
        message: `Class name '${name}' is already used by the main class.`
      });
      continue;
    }
    if (table.classes.has(name)) {
      table.diagnostics.push({
        blockId: block.id,
        severity: 'error',
        message: `Duplicate class '${name}'.`
      });
      continue;
    }
    const parent =
      block.type === 'mj_class_extends_declaration' ? fieldValue(block, 'PARENT', '') || null : null;
    table.classes.set(name, { name, parent, fields: new Map(), methods: new Map(), block });
  }

  // Pass 2: members, with every annotation site validated against pass 1.
  for (const sym of table.classes.values()) {
    for (const varBlock of statementChain(inputTarget(sym.block, 'VARS'))) {
      if (varBlock.type !== 'mj_var_declaration') continue;
      const name = fieldValue(varBlock, 'NAME', 'x');
      const ty = checkTypeAnnotation(inputTarget(varBlock, 'TYPE'), varBlock.id, table);
      if (sym.fields.has(name)) {
        table.diagnostics.push({
          blockId: varBlock.id,
          severity: 'error',
          message: `Duplicate field '${name}' in class '${sym.name}'.`
        });
        continue;
      }
      sym.fields.set(name, { name, ty, blockId: varBlock.id });
    }

    for (const methodBlock of statementChain(inputTarget(sym.block, 'METHODS'))) {
      if (methodBlock.type !== 'mj_method_declaration') continue;
      const name = fieldValue(methodBlock, 'NAME', 'method');
      const ret = checkTypeAnnotation(inputTarget(methodBlock, 'TYPE'), methodBlock.id, table);
      const params: ParamSym[] = [];
      for (const paramBlock of statementChain(inputTarget(methodBlock, 'PARAMS'))) {
        if (paramBlock.type !== 'mj_formal_parameter') continue;
        const paramName = fieldValue(paramBlock, 'NAME', 'p');
        const paramTy = checkTypeAnnotation(inputTarget(paramBlock, 'TYPE'), paramBlock.id, table);
        if (params.some((existing) => existing.name === paramName)) {
          table.diagnostics.push({
            blockId: paramBlock.id,
            severity: 'error',
            message: `Duplicate parameter '${paramName}'.`
          });
          continue;
        }
        params.push({ name: paramName, ty: paramTy, blockId: paramBlock.id });
      }
      if (sym.methods.has(name)) {
        table.diagnostics.push({
          blockId: methodBlock.id,
          severity: 'error',
          message: `Duplicate method '${name}' in class '${sym.name}'. MiniJava has no overloading.`
        });
        continue;
      }
      sym.methods.set(name, { name, params, ret, block: methodBlock });
    }
  }

  // Pass 3: resolve extends and reject unknown parents and cycles.
  for (const sym of table.classes.values()) {
    if (!sym.parent) continue;
    if (sym.parent === table.mainClassName) {
      table.diagnostics.push({
        blockId: sym.block.id,
        severity: 'error',
        message: `Class '${sym.name}' cannot extend the main class.`
      });
      sym.parent = null;
      continue;
    }
    if (!table.classes.has(sym.parent)) {
      table.diagnostics.push({
        blockId: sym.block.id,
        severity: 'error',
        message: `Class '${sym.name}' extends unknown class '${sym.parent}'.`
      });
      sym.parent = null;
    }
  }
  for (const sym of table.classes.values()) {
    const visited = new Set<string>([sym.name]);
    let cursor = sym.parent ? table.classes.get(sym.parent) ?? null : null;
    while (cursor) {
      if (visited.has(cursor.name)) {
        table.diagnostics.push({
          blockId: sym.block.id,
          severity: 'error',
          message: `Inheritance cycle: class '${sym.name}' extends itself through its parents.`
        });
        break;
      }
      visited.add(cursor.name);
      cursor = cursor.parent ? table.classes.get(cursor.parent) ?? null : null;
    }
  }

  return table;
}

/** Walks a class and its ancestors, safely even if the table has a cycle. */
export function* classAndAncestors(table: ClassTable, start: ClassSym): Generator<ClassSym> {
  const visited = new Set<string>();
  let cursor: ClassSym | null = start;
  while (cursor && !visited.has(cursor.name)) {
    visited.add(cursor.name);
    yield cursor;
    cursor = cursor.parent ? table.classes.get(cursor.parent) ?? null : null;
  }
}

export function findField(table: ClassTable, start: ClassSym, name: string): FieldSym | null {
  for (const sym of classAndAncestors(table, start)) {
    const field = sym.fields.get(name);
    if (field) return field;
  }
  return null;
}

export interface FoundMethod {
  method: MethodSym;
  owner: ClassSym;
}

export function findMethod(table: ClassTable, start: ClassSym, name: string): FoundMethod | null {
  for (const sym of classAndAncestors(table, start)) {
    const method = sym.methods.get(name);
    if (method) return { method, owner: sym };
  }
  return null;
}

/** Nominal subtyping: reflexivity, Bottom/Top bounds, and the extends chain. */
export function isSubtype(table: ClassTable, a: Ty, b: Ty): boolean {
  if (a.tag === 'Bottom' || b.tag === 'Top') return true;
  if (tyEquals(a, b)) return true;
  if (a.tag === 'Class' && b.tag === 'Class') {
    const start = table.classes.get(a.name);
    if (!start) return false;
    for (const sym of classAndAncestors(table, start)) {
      if (sym.name === b.name) return true;
    }
  }
  return false;
}

/** Assignability = subtyping plus Hazel-style hole consistency. */
export function isAssignable(table: ClassTable, from: Ty, to: Ty): boolean {
  if (from.tag === 'Hole' || to.tag === 'Hole') return true;
  return isSubtype(table, from, to);
}
