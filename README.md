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
    ui/          IDE bootstrap, workbench shell (activity bar, perspectives,
                 command palette), inspector tabs, stepper panels
test/            headless node test suites (see Tests)
docs/            build output, served as GitHub Pages
```

## Workbench

The IDE shell (`src/core/ui/app.ts`, `commandPalette.ts`) is a workbench over
the existing actions — it adds entry points and layout presets, not new language
behavior.

- **Activity bar + primary sidebar**: `Blocks`, `Search blocks`,
  `Run and analysis`, `Settings and layout`.
- **Perspectives**: `Edit` (blocks, code, focused workspace), `Debug` (machine
  and execution tools), `Type Analysis` (diagnostics and constraints),
  `Presentation` (maximized block workspace), plus `Custom` — shown in the
  status bar and the perspective picker. Adjusting panels by hand switches to
  `Custom` rather than misreporting a preset.
- **Command palette** (**Ctrl+Shift+P**): File (new/open/save/export/autosave),
  Run (**Ctrl+F5** run program), Analysis (CESK machine, Model A vs B compare,
  rewrite semantics), and View commands, with keyword matching.
- **Status bar**: perspective, plus the existing autosave/metric indicators.
- **Persisted layout**: namespaced `block-minijava.layout.*` keys hold sidebar
  and code visibility/width, the active activity, and the perspective, beside
  the pre-existing `block-minijava.autosave.v2` / `.theme` keys.
- **Keyboard**: `Ctrl+N` new, `Ctrl+O` open, `Ctrl+S` save, `Ctrl+J` bottom
  tools, `Ctrl+Shift+F` search blocks, `Ctrl+F5` run, `Ctrl+Shift+P` palette.
- Responsive: the shell collapses to tablet and phone layouts, where the bottom
  panel can be maximized.

## Grammar

The BNF source: https://courses.cs.washington.edu/courses/cse401/22au/project/BNF-for-MiniJava.html
(mirrored in `MiniJava-BNF.md`). The grammar the project actually implements —
the base BNF plus the String extension and the block editor's operator
families — is `MiniJava-Adjusted-BNF.md`.

## Grammar-aware renderer

The project uses the custom Blockly renderer `BMJ-Thrasos`. It subclasses Blockly Thrasos and restores the previous grammar-aware connector behavior:

- 10 horizontal connector shapes for MiniJava value/non-terminal inputs: `Goal`, `MainClass`, `ClassDeclaration`, `VarDeclaration`, `MethodDeclaration`, `FormalParameter`, `Type`, `Statement`, `Expression`, and `Identifier`.
- 5 vertical connector families for MiniJava sequence/statement stacks: class declarations, variable declarations, method declarations, statements, and parameter/argument lists.
- Blockly connection `check` metadata still enforces valid grammar connections; the custom shapes make the non-terminal category visible before the user connects blocks.

## Type system

A three-layer static type system checks the workspace on every edit (debounced):

- **`Ty` grammar** (`core/types/ty.ts`) — `int`, `boolean`, `String`, `int[]`, `String[]`, class types,
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

### Strings (extension over the BNF)

Beyond the CSE-401 BNF, the language has a first-class `String` type: a `String` type
block, double-quoted string literals (with `\"` `\\` `\n` `\t` `\r` escapes), and three
operators — `s.charAt(i)`, `s.concat(t)`, and `s.length()`. `charAt` returns a
**1-character `String`** (the language has no `char` type) and gets stuck on an
out-of-bounds index, as Java throws. `concat` is the only string composition — `+` stays
int-only. `length()` returns `int`; the parens disambiguate as in Java: `a.length` (no
parens) is array length, `s.length()` (empty parens) is string length, and
`o.length(args…)` stays an ordinary user method call. `System.out.println` accepts `int`
or `String`. Like `.length`, `charAt`/`concat` are matched by name in postfix position,
so user methods cannot shadow those names (any other identifier — including `charAt` as
a *variable* — stays free). All three semantics carry the type: the CESK machine has a
`Str` value and `concat`/`char-at`/`str-length` rules under both value models, the
substitution rewriter treats string literals as values with the same salient rule names,
and the legacy evaluator prints strings raw, as Java's `println` does.

## Running programs

The **▶ Run** button in the workspace title bar executes the program to completion under the
faithful MiniJava semantics and shows the `System.out.println` output on the inspector's
**Output** tab. The Output tab is a console monitor: whichever stepper (or Run) most recently
produced output owns it.

## Semantics & steppers

The visualization dock (◧ button) hosts five tabs; the last three are small-step machines:

- **CESK** — a pure CESK-style machine over **Value Model A** (objects live on a heap,
  variables hold references, aliasing is real), organized over an explicit activation-frame
  stack. The panel shows **one column per machine component, in machine order**: **C**·ontrol
  (what the machine evaluates next, plus the rule that just fired), **S**·tack +
  **E**·nvironment (the call stack of activation frames with their locals), **S**·tore (the
  heap — the store `S` that distinguishes this CESK machine from the store-free CEK machines
  in Block-based-MNL / Block-Lambda-Calculus), and **K**·ontinuation (pending work per frame,
  innermost first, ▢ marking the hole the in-flight value fills) — plus the output log; the
  focus block is highlighted in the
  workspace. SVG arrows connect every reference to its heap box; a field write glows the
  box, pulses the arrows into it, and animates the value along its path. Control, frame,
  heap-box, and kontinuation entries all link back to the block that created or awaits
  them. `step` is pure, so **Back** is exact time travel.
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

### Why the step counters differ (or don't) between tabs

These tabs count "steps" in two different ways, and it is worth knowing which is which.

- **A vs B is machine-vs-machine at the *same* granularity.** Each press advances
  *both* machines by exactly one transition (`comparePanel.ts`, `stepBoth`:
  `stateA = step(stateA); stateB = step(stateB)`, and `minijavaMachine.ts`
  bumps `state.stepCount += 1` once per transition). Model A and Model B share
  their control flow, so their `stepCount`s stay **equal** — the two numbers are
  the same by construction. They diverge only when a program *observes* a value
  the models disagree about (aliasing), which is the lesson. On *Aliasing
  Contrast* both finish in **51 steps**, printing `4141` vs `41`.
- **Rewrite-vs-machine is coarse-vs-fine.** The **Rewrite** tab's correspondence
  line replays the program on the Model B machine and matches *salient* rewrite
  rules against the machine's trace. Here the two counters are *not* equal: the
  substitution rewriter counts only salient reductions (the human-visible
  redexes), while the machine's `stepCount` counts *every* transition — call,
  block entry, `if`/`while` dispatch, assignment, field read/write, and the
  bookkeeping in between (`minijavaMachine.ts`, one `step` per transition). One
  salient rewrite corresponds to several machine steps, so the machine's step
  count is the larger number even though both reach the same result.

Rule of thumb: two counters over the **same machine granularity** (A vs B) advance
together, whereas a **substitution/rewrite** counter over a machine (the Rewrite
tab here, and the lockstep views in Block-based-MNL and Block-Lambda-Calculus) is
coarser than the machine's own step count — because the machine also counts the
administrative transitions the rewriter never names.

## Commands

```bash
npm install
npm run build      # production bundle -> docs/
npm run serve      # dev server
npm run typecheck
npm test           # all five headless suites
```

The webpack bundle is emitted as:

```text
docs/block_minijava.js
```

## Tests

`npm test` builds node bundles of the real modules (`webpack.test.config.js`) and runs five
suites, no browser required:

- `test/run_roundtrip.js` — text→blocks→text round-trips for the parser/generator pair
- `test/run_typecheck.js` — type-system verdicts, hole behavior, override rules
- `test/run_machine.js` — machine runs under both value models, including A/B contrast programs
- `test/run_subst.js` — substitution runs, structure-preservation invariants, and the
  rewrite↔machine correspondence checks
- `test/smoke-csesk.entry.ts` — the CESK tab driven end-to-end under jsdom: every machine
  column (Control, Stack+Environment, Store, Kontinuation) must render and the machine must
  finish with the right output

## Logo

The current logo is the approved B-MJ design: a square-ish MiniJava puzzle-block emblem on the left and `B-MJ` with the `Block-based MiniJava` tag on the right. It is stored in `src/assets/images/logo.png`, with favicon and PWA variants generated from the same visual identity.
