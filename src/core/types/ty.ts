/**
 * Layer 1 of the MiniJava type system: the type grammar (abstract syntax).
 *
 * `Hole` is first-class (not null/undefined) so the checker can report
 * partial information on incomplete programs instead of cascading errors:
 * an empty Type socket or an unresolvable expression types as Hole, and a
 * Hole is consistent with every type.
 *
 * `Top`/`Bottom` bound the subtype lattice seeded from `extends`.
 * `StringArray` exists only because `main(String[] id)` binds one; it has
 * no operations and is assignable only to itself.
 */

export type Ty =
  | { tag: 'Prim'; name: 'Int' | 'Bool' | 'String' }
  | { tag: 'IntArray' }
  | { tag: 'StringArray' }
  | { tag: 'Class'; name: string }
  | { tag: 'Arrow'; params: Ty[]; ret: Ty }
  | { tag: 'Top' }
  | { tag: 'Bottom' }
  | { tag: 'Hole' };

export const INT: Ty = { tag: 'Prim', name: 'Int' };
export const BOOL: Ty = { tag: 'Prim', name: 'Bool' };
export const STRING: Ty = { tag: 'Prim', name: 'String' };
export const INT_ARRAY: Ty = { tag: 'IntArray' };
export const STRING_ARRAY: Ty = { tag: 'StringArray' };
export const TOP: Ty = { tag: 'Top' };
export const BOTTOM: Ty = { tag: 'Bottom' };
export const HOLE: Ty = { tag: 'Hole' };

export function classTy(name: string): Ty {
  return { tag: 'Class', name };
}

export function tyEquals(a: Ty, b: Ty): boolean {
  if (a.tag !== b.tag) return false;
  switch (a.tag) {
    case 'Prim':
      return a.name === (b as { name: string }).name;
    case 'Class':
      return a.name === (b as { name: string }).name;
    case 'Arrow': {
      const other = b as { params: Ty[]; ret: Ty };
      return (
        a.params.length === other.params.length &&
        a.params.every((param, i) => tyEquals(param, other.params[i])) &&
        tyEquals(a.ret, other.ret)
      );
    }
    default:
      return true;
  }
}

export function formatTy(ty: Ty): string {
  switch (ty.tag) {
    case 'Prim':
      return ty.name === 'Int' ? 'int' : ty.name === 'Bool' ? 'boolean' : 'String';
    case 'IntArray':
      return 'int[]';
    case 'StringArray':
      return 'String[]';
    case 'Class':
      return ty.name;
    case 'Arrow':
      return `(${ty.params.map(formatTy).join(', ')}) -> ${formatTy(ty.ret)}`;
    case 'Top':
      return 'Object';
    case 'Bottom':
      return 'Nothing';
    case 'Hole':
      return '?';
  }
}
