# Block MiniJava (B-MJ)

**B-MJ** is **Block-based MiniJava**.

## Structure

```text
src/
  assets/
    images/      logo, favicon, PWA icons
    css/         Ayu Mirage UI theme
    js/          webpack entry: block_minijava.ts -> dist/block_minijava.js
  core/
    blocks/      MiniJava block module area
    generator/   MiniJava code-generation module area
    renderer/    Blockly renderer/theme module area
    ui/          current IDE bootstrap and integrated prototype logic
```

## Grammar

The BNF source: https://courses.cs.washington.edu/courses/cse401/22au/project/BNF-for-MiniJava.html

## Grammar-aware renderer

The project uses the custom Blockly renderer `BMJ-Thrasos`. It subclasses Blockly Thrasos and restores the previous grammar-aware connector behavior:

- 10 horizontal connector shapes for MiniJava value/non-terminal inputs: `Goal`, `MainClass`, `ClassDeclaration`, `VarDeclaration`, `MethodDeclaration`, `FormalParameter`, `Type`, `Statement`, `Expression`, and `Identifier`.
- 5 vertical connector families for MiniJava sequence/statement stacks: class declarations, variable declarations, method declarations, statements, and parameter/argument lists.
- Blockly connection `check` metadata still enforces valid grammar connections; the custom shapes make the non-terminal category visible before the user connects blocks.

## Commands

```bash
npm install
npm run build
npm run serve
```

The webpack bundle is emitted as:

```text
dist/block_minijava.js
```

## Logo

The current logo is the approved B-MJ design: a square-ish MiniJava puzzle-block emblem on the left and `B-MJ` with the `Block-based MiniJava` tag on the right. It is stored in `src/assets/images/logo.png`, with favicon and PWA variants generated from the same visual identity.
