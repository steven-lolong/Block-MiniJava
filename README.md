# Block-based MiniJava Programming Language

This repository defines a minimal baseline for a block-based variant of MiniJava.

## Core ideas

- MiniJava-style classes, fields, methods, and statements
- Explicit `{ ... }` blocks for statement grouping and lexical scoping
- Strongly typed primitives (`int`, `boolean`) and object references
- Deterministic control flow (`if/else`, `while`, `return`)

## Example

```minijava
class Main {
  public static void main() {
    int x;
    {
      x = 1;
      if (x < 10) {
        x = x + 1;
      }
    }
  }
}
```
