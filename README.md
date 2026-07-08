# Block MiniJava (B-MJ)

**B-MJ** is **Block-based MiniJava**: a Blockly-based IDE for the full MiniJava language with a
grammar-aware renderer, a bidirectional text↔blocks editor, a static type system, and three
executable-semantics visualizations (a heap machine, an A-vs-B value-model comparison, and a
substitution rewriter with a machine-correspondence check).

The design rationale for the value models and the steppers lives in
`block-minijava-value-and-visualisation-design.md`.

## Structure

```text
src/
  assets/
    images/      logo, favicon, PWA icons
    css/         Ayu Mirage UI theme (dark + light)
    js/          webpack entry: block_minijava.ts -> docs/block_minijava.js
  core/
    blocks/      MiniJava block definitions (grammar non-terminals as connection checks)
    generator/   blocks -> MiniJava source
    parser/      MiniJava source -> blocks (drives the editable code editor)
    examples/    built-in example programs (Examples menu)
    renderer/    custom BMJ-Thrasos renderer + theme
    types/       type system: Ty grammar, class table, checker
    semantics/   small-step machine (Models A/B), substitution rewriter, legacy evaluator
    ui/          IDE bootstrap, inspector tabs, stepper panels
test/            headless node test suites (see Tests)
docs/            build output, served as GitHub Pages
```

## Grammar

The BNF source: https://courses.cs.washington.edu/courses/cse401/22au/project/BNF-for-MiniJava.html

## Grammar-aware renderer

The project uses the custom Blockly renderer `BMJ-Thrasos`. It subclasses Blockly Thrasos and restores the previous grammar-aware connector behavior:

- 10 horizontal connector shapes for MiniJava value/non-terminal inputs: `Goal`, `MainClass`, `ClassDeclaration`, `VarDeclaration`, `MethodDeclaration`, `FormalParameter`, `Type`, `Statement`, `Expression`, and `Identifier`.
- 5 vertical connector families for MiniJava sequence/statement stacks: class declarations, variable declarations, method declarations, statements, and parameter/argument lists.
- Blockly connection `check` metadata still enforces valid grammar connections; the custom shapes make the non-terminal category visible before the user connects blocks.

## Type system

A three-layer static type system checks the workspace on every edit (debounced):

- **`Ty` grammar** (`core/types/ty.ts`) — `int`, `boolean`, `int[]`, `String[]`, class types,
  method arrows, `Top`/`Bottom` bounds, and a first-class **hole type** in the Hazel style:
  a block whose type cannot be determined yet is consistent with everything, so one incomplete
  block never cascades errors across the program.
- **Class table** (`core/types/classTable.ts`) — name/member collection, `extends` resolution
  with cycle detection, nominal subtyping.
- **Checker** (`core/types/typeChecker.ts`) — statement/expression rules, override checking
  (invariant parameters, covariant returns), duplicate detection. Only the program reachable
  from the goal block is checked; detached scratch blocks stay quiet.

Diagnostics surface twice: as warning icons on the offending blocks and in the inspector's
**Problems** tab, where clicking an entry selects and centers the block.

## Running programs

The **▶ Run** button in the workspace title bar executes the program to completion under the
faithful MiniJava semantics and shows the `System.out.println` output on the inspector's
**Output** tab. The Output tab is a console monitor: whichever stepper (or Run) most recently
produced output owns it.

## Semantics & steppers

The visualization dock (◧ button) hosts five tabs; the last three are small-step machines:

- **Stepper** — a pure CESK-style machine over **Value Model A** (objects live on a heap,
  variables hold references, aliasing is real). Four coordinated surfaces: the focus block is
  highlighted in the workspace, plus call-stack, heap, and output panels. SVG arrows connect
  every reference to its heap box; a field write glows the box, pulses the arrows into it, and
  animates the value along its path. Heap-box and frame titles link back to the `new`/call
  block that created them. `step` is pure, so **Back** is exact time travel.
- **A vs B** — the same program stepped in lockstep under Model A and **Value Model B**
  (inline structural values, no heap, functional field update). The two machines share their
  control flow, so they stay step-synchronized until the program observes a value the models
  disagree about. Load the built-in *Aliasing Contrast* example: Model A prints `4141`,
  Model B prints `41`, both in 51 steps.
- **Rewrite** — substitution semantics on the pure fragment: each state is a literal block
  tree, each step rewrites the highlighted redex, and method calls substitute arguments as
  independent copies. A live correspondence line replays the same program on the Model B
  machine and checks that every salient rewrite rule matches the machine's trace — the
  operational-correspondence claim, executed. Load the built-in *Independent Copies* example.

## Commands

```bash
npm install
npm run build      # production bundle -> docs/
npm run serve      # dev server
npm run typecheck
npm test           # all four headless suites
```

The webpack bundle is emitted as:

```text
docs/block_minijava.js
```

## Tests

`npm test` builds node bundles of the real modules (`webpack.test.config.js`) and runs four
suites, no browser required:

- `test/run_roundtrip.js` — text→blocks→text round-trips for the parser/generator pair
- `test/run_typecheck.js` — type-system verdicts, hole behavior, override rules
- `test/run_machine.js` — machine runs under both value models, including A/B contrast programs
- `test/run_subst.js` — substitution runs, structure-preservation invariants, and the
  rewrite↔machine correspondence checks

## Logo

The current logo is the approved B-MJ design: a square-ish MiniJava puzzle-block emblem on the left and `B-MJ` with the `Block-based MiniJava` tag on the right. It is stored in `src/assets/images/logo.png`, with favicon and PWA variants generated from the same visual identity.
