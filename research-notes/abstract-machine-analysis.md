# The abstract machine of Block-MiniJava: a store-bearing stack machine (CESK + call stack), parameterized by value model

*Research note. 2026-07-09.*

## What it is

Block-MiniJava executes programs with a small-step **imperative stack machine** —
`src/core/semantics/minijavaMachine.ts` — plus a small-step **substitution**
rewriter — `src/core/semantics/minijavaSubstitution.ts` (the "Rewrite" tab,
design note §7). Unlike the MnL machine, this one has *two* stateful stores of
work: an explicit **call stack of activation frames** (because MiniJava is
imperative, with method call/return) and, for the faithful model, a **mutable
heap** (because Java objects alias and mutate).

The distinctive move: `step` is **parameterized by `ValueModel` ('A' | 'B')**
(`minijavaMachine.ts:44`), and both models share one control flow, so two
machines step side-by-side on the same program — the §8 A/B lockstep artifact.

## State

```ts
interface MachineState {                    // minijavaMachine.ts:120
  model: ValueModel;                        // 'A' faithful | 'B' structural
  control: Control;                         // Stmt | Expr | Value | Done
  stack: Frame[];                           // call stack — activation records
  heap: Map<Loc, HeapObj>;                  // the STORE (Model A; empty under B)
  output: string[]; nextLoc: Loc; … 
  lastRule; lastEffect;                     // design-note rule name + effect log
}
```

- **Store** (`heap`, `minijavaMachine.ts:125`): `Map<Loc, HeapObj>`. In **Model A**
  it is *essential and mutated* — `new` grows it, field read derefs, **field
  write mutates a cell** so every alias observes it. In **Model B** it "stays
  empty (the no-store invariant)": objects/arrays are inline values.
- **Call stack** (`stack: Frame[]`): each `Frame` (`minijavaMachine.ts:83`) is a
  full activation record — `method`, `this` (`self: Loc` under A, `selfObj:
  ObjValue` under B), its own `locals: Map` (the environment), its own `kont:
  Kont[]`, and the `returnBlock`. Method call pushes a frame; return pops it.
  This is SECD/stack-machine flavour, not the single shared continuation of a CEK
  machine.

## Values — where the models diverge

`MachineValue` (`minijavaMachine.ts:46`): `Int | Bool | Null | Ref(loc) | Obj(className,
fields) | Arr(elems)`.

- **Model A** uses **`Ref(loc)`** — the *only* way to reach an object; objects and
  arrays live behind `Loc`s in the heap, so sharing/aliasing exists at object
  granularity and nowhere else. Binding a `Ref` copies the arrow, not the box.
- **Model B** uses inline **`Obj`/`Arr`** values — no heap, no `Ref`; binding
  copies structure (implemented as sharing of immutable values that are never
  mutated in place); `f = e` functionally updates the frame's own copy, `a[i]=e`
  rebinds to a new array. This is call-by-structure.

## Continuations (per frame)

Statement- and expression-level, reflecting an imperative language
(`minijavaMachine.ts:63`):

| Group | Frames |
|---|---|
| statements | KStmtSeq, KLoop, KWhile, KIf, KPrint, KAssign, KArrAssignIdx, KArrAssignVal |
| expressions | KNot, KAnd (short-circuit `&&`), KBinL → KBinR, KLookupArr → KLookupIdx, KLength, KNewArr |
| method call | KCallRecv → KCallArgs (evaluate receiver, then arguments left-to-right, then push a frame) |

## Effects — the visualization hook

Every step reports a `lastEffect` (`minijavaMachine.ts:110`): `new | field-write |
arr-write | local-write | self-write | push-frame | pop-frame | output`. This is
what makes Model A's heap "boxes-and-arrows" panel flash on mutation, and it is
the observable that distinguishes A's shared-cell writes from B's functional
`self-write`. Model A therefore needs **two visualization surfaces** (program +
heap); Model B needs **one** (the block tree).

## Classification

- **Model A (faithful MiniJava, Vehicle 1):** a **CESK-style machine with an
  essential mutable store**, over an explicit call stack of activation frames.
  This is exactly the configuration where the store `S` earns its keep — remove
  it and you cannot express Java aliasing or `field := e` mutation. Here a
  store-bearing ("CSESK") machine is the *right* fit, **not** over-power.
- **Model B (structure-preserving):** the *same* control flow with the store
  degenerated to empty — a store-free stack machine doing call-by-structure. It is
  the imperative-surface analogue of the MnL/Block-Lambda pure machines.

The single parameterized `step` thus spans **both ends of the store axis**, and
running A and B in lockstep on one program is the point: it shows precisely which
steps *need* the heap (A mutates a shared cell; B rebuilds structure) and which
are identical.

## Contrast with Block-based-MNL

| | Block-MiniJava | Block-based-MNL |
|---|---|---|
| paradigm | imperative OOP (statements, methods) | pure functional (λ, let, closures) |
| work stacks | **call stack of frames** + per-frame kont | single shared kont |
| store `S` | **essential (A)** / empty (B) | **absent** |
| value sharing | `Ref` + heap (A) / inline (B) | inline values only |
| recursion | method call frames | closure self-binding (no store) |
| twin semantics | substitution rewriter (§7) | substitution CbS (lockstep) |
| machine class | CESK + call stack (store-bearing) | CEK / CSEK (store-free) |

## Faithfulness notes worth keeping

- Vanilla MiniJava has **no closures / first-class functions**: "function value"
  is a method invocation (push a frame with `this` bound to the receiver), not an
  inspectable value. The `Closure` machinery of MnL has no place in Model A.
- Only objects and arrays have heap identity; locals and fields cannot be aliased
  individually (assignment is whole-value copy), so per-field `Loc`s are
  unnecessary — sharing is at object granularity, which is Java's model.

See the companion note `research-notes/abstract-machine-analysis.md` in
Block-based-MNL, and `research-notes/csek-fit-block-lambda-calculus.md` in the
Paper-Grammar-Transformation-T2BB repo, for the store-free machines this one
generalizes.
