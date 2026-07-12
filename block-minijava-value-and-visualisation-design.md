# Block-based MiniJava — Value Models & Program Visualisation (Design Note)

> Handoff context for Claude Code. Covers type-annotation structure, the three value
> models (A / B / Mix), which model fits which language variant, and the reduction-state
> records + visualisation design for building a stepper. Data structures are given as
> TypeScript-flavoured pseudocode intended for direct implementation.

> **Implementation status (2026-07-08):** every artifact this note specifies is built.
> §1 type layers → `src/core/types/` (Problems tab). §6 Model A machine →
> `src/core/semantics/minijavaMachine.ts` + the CESK tab (one column per machine
> component: Control · Stack + Environment · Store · Kontinuation). §8 A/B lockstep → the same
> machine parameterized by `ValueModel` + the A vs B tab. §7 substitution + machine
> correspondence → `src/core/semantics/minijavaSubstitution.ts` + the Rewrite tab.
> Executable checks: `npm test` (roundtrip, typecheck, machine, subst suites).
> Remaining ideas live in §9 (paper-side) and Vehicle 2 belongs to the MnL repos.

## 0. The core fork (decide this first)

Two distinct projects share the "block-based MiniJava" label; they need different value models:

- **Vehicle 1 — Faithful MiniJava**: teaches Java's *reference model*. Imperative OOP,
  heap-based, reference semantics. → **Value Model A.**
- **Vehicle 2 — MnL-flavoured functional vehicle**: functional, call-by-structure (CbS),
  closer to MnL. → **Value Model B** (add **Mix** only if controlled state is needed).

`beta reduction` and `function value` are native to Vehicle 2, NOT to vanilla MiniJava
(see §5 accuracy notes).

---

## 1. Type annotation structure (three separable layers)

Keep these independent so the type checker and the visual surface evolve separately.

**Layer 1 — type grammar (abstract syntax):**

```typescript
type Ty =
  | { tag: "Prim";     name: "Int" | "Bool" | "String" | "Float" | "Unit" }
  | { tag: "Class";    name: string; args: Ty[] }   // C, or C<t...> when generic
  | { tag: "Var";      name: string }               // type parameter a
  | { tag: "Arrow";    params: Ty[]; ret: Ty }      // method signature
  | { tag: "Nullable"; inner: Ty }
  | { tag: "Top" } | { tag: "Bottom" }              // Object/Any and Nothing
  | { tag: "Hole";     id: HoleId }                 // unfilled annotation slot

interface TyNode { ty: Ty; blockId: string; resolved?: ClassSym | TyVarSym; }
```

`Hole` is first-class (not `null`) so the checker reports partial info on incomplete
programs (Hazel-style typed holes) and leaves a path to gradual typing.

**Layer 2 — annotation sites:** field `f:t`, method params + return (an `Arrow`),
local `var x:t` (defaults to `Hole`, often inferable), class type-param bound
`class C<a extends B>`, cast `e as t`. Only the first three are checked against a value.

**Layer 3 — block encoding:** each type constructor is its own block with typed sockets;
structured types nest (`List<Map<String,Int>>` = nested blocks). Enforce **kinds** at the
socket level via Blockly connection `check` arrays so malformed annotations are rejected at
connection time. Hybrid: dropdown field for the leaf choice (primitive / in-scope class),
sockets only for type arguments.

Elaboration: annotations start syntactic (name string) → resolution pass fills `resolved`,
checks arity, seeds subtyping from `extends`/`implements` with `Top`/`Bottom` bounds.
Default assumption: **nominal** typing (structural is a larger change to the `Class` variant).

---

## 2. Value Model A — heap references with mutation

Flat values; objects live behind locations. This is the model that produces true aliasing.

```typescript
type Value =
  | { tag: "Int"; n } | { tag: "Bool"; b } | { tag: "Str"; s }
  | { tag: "Unit" } | { tag: "Null" }
  | { tag: "Ref"; loc: Loc }          // only way to reach an object
  | { tag: "Closure"; clo: Closure }  // (general design; NOT in vanilla MiniJava)
  | { tag: "ClassV"; sym: ClassSym };

type Store = Map<Loc, StorableValue>;
type StorableValue = Value | ObjInst;
type Env = Map<Var, Loc>;
```

Semantics: `new` grows the store; field read derefs; **field write mutates a store cell**
(`S' = S[l_f -> v']`) so every alias observes it; binding a `Ref` creates an alias, not a
copy. `let y=x in { y.f:=1 }; x.f` yields `1`. Equality can be reference identity.

---

## 3. Value Model B — structure-preserving values

Objects ARE values; no store, no `Ref`. Binding copies structure. Functional-record
reading of call-by-structure.

```typescript
type Value =
  | { tag: "Int"; n } | { tag: "Bool"; b } | { tag: "Str"; s }
  | { tag: "Unit" } | { tag: "Null" }
  | { tag: "Obj"; class: ClassName; fields: Map<FieldName, Value> }  // inline
  | { tag: "Closure"; clo: Closure };

type Env = Map<Var, Value>;   // variables denote Values directly, by copy
```

Semantics: `new` builds an `Obj` directly; field read = record projection; **field "write"
is functional update** (builds a new `Obj`, original untouched); binding copies structure.
`let y=x in { y.f:=1 }; x.f` yields the ORIGINAL value. No aliasing; equality is structural
only. `self` in a closure is a `Value` (the object structure), captured by copy.

---

## 4. Value Model Mix — structural default + opt-in cells

The OCaml/Haskell design (immutable data + explicit ref cells). NOT "A and B averaged" —
a distinct third design. Mix = **Model B plus ONE new value constructor** (`Cell`).
Everything from B carries over unchanged (inline structural objects, real closures captured
by copy, structure-preserving substitution); the only addition is that a programmer can
*explicitly* wrap a value in a cell, and cells — and only cells — have heap identity and
mutation. Use only when controlled/localised mutable state is genuinely wanted.

```typescript
type Value =
  | { tag:"Int";n } | { tag:"Bool";b } | { tag:"Str";s }
  | { tag:"Unit" } | { tag:"Null" }
  | { tag:"Obj";     class: ClassName; fields: Map<FieldName, Value> }   // structural, inline (from B)
  | { tag:"Closure"; params: Var[]; body: Block; env: Env; self?: Value } // real closure (from B)
  | { tag:"Cell";    loc: Loc };   // the ONLY value with heap identity

type CellStore = Map<Loc, Value>;  // small store — holds ONLY cell contents
type Env       = Map<Var, Value>;  // variables denote Values by copy

interface State {
  focus: Expr; env: Env;
  cells: CellStore;   // empty until the first `ref`; pure programs never touch it
  kont:  Kont;
}
```

Critical difference from A: A's `Store` holds *every object*; here `CellStore` holds *only*
explicitly-created cells. A program that never writes `ref` has empty `cells` and behaves
exactly like pure B.

### The three new operations (everything else is Model B)

Mix adds exactly three rules; the rest of the semantics is B's.

- **`ref e`** (allocate) — reduce `e` to `v`, allocate fresh `loc`, `cells[loc] = v`,
  return `Cell(loc)`. The ONLY allocation in the language.
- **`!c` / `c.get`** (deref) — reduce to `Cell(loc)`, return `cells[loc]`.
- **`c := v` / `c.set(v)`** (mutate) — reduce to `Cell(loc)` and `v`, `cells[loc] = v`.
  The ONLY mutation in the language.

Plain object update stays B's functional update: `o with f = 1` builds a NEW structure, no
mutation. Two visibly different update ops — `o with f=1` (pure, copies) vs `c := v` (impure,
mutates) — look different because they ARE different.

**Binding subtlety:** binding still copies the `Value`, but copying a `Cell` copies its `loc`
→ an ALIAS to the same cell. So aliasing exists in Mix, but *exclusively* for values the
programmer explicitly wrapped in a cell. Substitution `[v/x]` stays structure-preserving for
the whole pure fragment; the single exception is substituting a cell handle (shares the cell),
and that exception is always marked on-screen by a `Cell` block the programmer drew.

### The three targets under Mix

- **beta reduction** — still literal substitution as in B. Wrinkle: if the argument IS a
  `Cell`, its handle is copied into each occurrence → both point at the same cell. The one
  place a substitution step produces sharing rather than independent copies, and it is legible
  because a `Cell` block was the thing substituted.
- **object value** — structural/inline as in B. New possibility: a field may HOLD a `Cell`,
  making that field mutable-through-the-cell while the rest of the object stays purely
  structural. Mutability is per-field opt-in, not a blanket property of all objects.
- **function value** — where Mix earns its existence. Closures are real (from B) and can now
  CAPTURE a cell → genuine shared mutable state, the canonical thing pure B cannot express:

```
makeCounter = λ_. let c = ref 0 in
                  λ_. (c := !c + 1; !c)
```

Each `makeCounter()` call does its own `ref 0` → independent counters that don't interfere.
Two closures over the SAME `c` share state. The point of Mix: state exists, but only where a
`ref` was explicitly written.

### Visualisation — one surface + "heap-lite" panel

Keeps B's single self-contained block-tree as the primary surface; adds a small cell panel
that is the ONLY source of boxes-and-arrows, hidden until the first cell exists. Renderer
invariants (parallel to A and B):

- Plain objects never draw an arrow — inline like B.
- Cells are the only box type and only arrow source; a `Cell` handle draws an arrow to its
  cell-box.
- A cell handle copied into N places draws N arrows to ONE box (visible, localised aliasing).
- `c := v` animates as the cell-box contents changing while all handles stay pointed at it —
  structurally identical to A's field-write animation, restricted to cells.
- A closure capturing a cell shows a `Cell` handle in its env table arrowing to the box; two
  closures over the same cell both arrow to it → shared state visible as converging arrows.

Net: B's clean substitution theatre for the entire pure fragment, and A's boxes-and-arrows
microscope appearing EXACTLY and ONLY around cells — every on-screen arrow corresponds to a
`Cell` block the programmer deliberately drew (vs A, where every object is an arrow whether
you wanted one or not). `self`: captured as structure by copy, except when it's a cell.

### Model comparison (visualisation-oriented)

| aspect | A (heap refs) | B (structural) | Mix |
|---|---|---|---|
| object representation | heap box + arrow | inline block | inline block; only `Cell`s in store |
| field update | mutate shared cell | functional update (new structure) | functional for objects; mutate for cells |
| aliasing | pervasive, invisible in source | none | none except where a `Cell` is drawn |
| equality | reference identity available | structural only | structural for objects; identity for cells |
| beta reduction | not literal (machine over store) | literal `[v/x]` substitution | literal; cells substitute by handle |
| function values | general model only | real closures, captured by copy | real closures; may capture a cell |
| machine `S` | essential, mutated | absent / name-supply | small — cell contents only |
| **visualisation surfaces** | **two** (program + heap) | **one** (block-tree) | **one + heap-lite around cells** |
| native fit | faithful MiniJava / Java | MnL / pure functional | ML/Haskell; teaching-the-contrast |

**Decisions:** Vehicle 1 (faithful MiniJava) → **A**; Mix would misrepresent Java (every
object is a reference — that uniformity is the lesson), so Mix is ruled out there.
Vehicle 2 (MnL) → **B**; add **Mix** only if MnL must support controlled state. Mix is the
*best* choice only for a tool whose explicit goal is teaching the A-vs-B distinction itself.

---

## 5. MiniJava faithfulness accuracy notes (important)

- **Vanilla MiniJava has NO closures / first-class functions.** So "function value" is not
  an inspectable value; it is a **method invocation** = push an activation `Frame` with
  `this` bound to the receiver `Ref`. Do not build closure machinery for Vehicle 1.
- **Only objects and arrays have heap identity.** Locals and fields cannot be aliased
  individually — assignment is whole-value copy. So a variable slot and a field each hold a
  `Value` (which may BE a `Ref`) directly. **Per-field `Loc`s are unnecessary** for faithful
  MiniJava; sharing happens at object granularity (this is Java's model, and simpler).
- MiniJava field mutation surfaces as `f = e` inside a method (implicitly `this.f = e`);
  assignment targets are identifiers / `id[e]`. There is no arbitrary `obj.f = e` LHS.

---

## 6. Reduction-state record — Vehicle 1 (faithful MiniJava, Model A)

Small-step machine with an explicit call stack (imperative → frames matter).

```typescript
interface State {
  focus:  Stmt | Expr;        // control — highlighted block in the program surface
  stack:  Frame[];            // activation records; top = current method
  heap:   Map<Loc, HeapObj>;  // the ONLY thing with identity/sharing
  output: string[];           // println log
}
interface Frame {
  method: MethodName; self: Loc | null;  // self = `this`, a Ref into the heap
  locals: Map<Var, Value>;               // params + locals, held by copy
  blockId: string; ret: Cont;
}
type Value = {tag:"Int";n} | {tag:"Bool";b} | {tag:"Null"} | {tag:"Ref";loc:Loc};
type HeapObj =
  | { tag:"Obj"; class: ClassName; fields: Map<FieldName, Value>; blockId: string }
  | { tag:"Arr"; elems: Value[]; blockId: string };
```

Note: no field-cell `Store`, no `Closure`.

### Visualisation — TWO coordinated surfaces (Python-Tutor / Java-Visualizer style)

Four regions rendered from one `State`:
1. **Program surface** — block AST, `focus` highlighted (where reduction happens).
2. **Frame / locals table** — top frame's locals as value chips; a `Ref` chip sprouts an arrow.
3. **Heap panel** — one box per `HeapObj`, boxes-and-arrows. Arrows from local chips and object fields.
4. **Output + call-stack strip** — println log and the frame stack.

`blockId` provenance lets you highlight the `new` block that made a box / the call block that pushed a frame.

**Field-write step = the money animation.** `f = e` → reduce `e` to `v`, then
`heap[self].fields[f] = v`. Renderer invariants:
- Arrows **never move**; only the box's contents change (asserts "same object").
- Changed slot gets a transient highlight.
- If two chips share the box, both now read the new value — payoff: `x.f` yields the new
  value though `x` was never touched.
- Other shared-box steps to animate the same way: `x = y` (copy Ref → two chips one box)
  and `m(y)` (arg copies Ref into callee frame slot → chip arrows to existing box, not a new one).

**Method invocation ("function value"):** reduce receiver to `Ref l`, args to values, push a
`Frame` with `self=l` and params bound to copied args. Render: frame slides onto the stack
strip; `this`-chip arrows to box `l`; a mutating method reuses the field-write animation
originating from the callee frame. Unifying idea: identity, aliasing, params, and `this` are
all one mechanism (a `Ref` → an arrow to a box).

---

## 7. Reduction-state record — Vehicle 2 (MnL-flavoured, Model B)

CbS = call-by-value evaluation order + structure-preserving substitution. No heap, no `Ref`,
no `Store`. Closures return (real first-class functions).

```typescript
type Value =
  | { tag:"Int";n } | { tag:"Bool";b } | { tag:"Unit" }
  | { tag:"Obj"; class: ClassName; fields: Map<FieldName, Value> }          // inline structure
  | { tag:"Closure"; params: Var[]; body: Block; env: Env; self?: Value };  // captured by copy
type Env = Map<Var, Value>;
```

### Visualisation — ONE surface (every state is a self-contained block-tree)

Two rendering modes, and building BOTH (shown to agree) is the high-value research artifact:
- **Substitution view (pedagogical):** render `(λx.e) v -> e[v/x]` as literal rewriting —
  deep-copy `v`'s block-tree into every `x`-hole, discard the redex. Structure-preservation
  invariant: the copy is a deep CLOSED subtree; two occurrences must be INDEPENDENT copies
  (no shared node with two parents — that would secretly be Model A). No environment panel needed.
- **Machine view (under the hood):** render the CESK configuration (control / environment /
  closures / continuation stack); occurrences of `x` are looked up in the environment rather
  than physically substituted.

Target renders:
- **beta reduction** — the substitution animation above (marquee; literal under B).
- **object value** — nested block inline; **functional update** `o with f=1` grows a NEW
  block-tree beside the untouched original.
- **function value (closure)** — body block + captured-env table of value-blocks; `self` is a
  value-block, not an arrow. Env table is a SNAPSHOT (capture-by-copy) — "what you see is what
  it captured", no post-capture spooky action.

**Research payoff:** step substitution semantics and the CESK machine in lockstep and show
each machine step realises the corresponding substitution (env lookup = lazy substitution).
A steppable operational-correspondence demo strengthens the Hazel/Hazelnut comparison by
making CbS behaviour legible at a glance.

---

## 8. Suggested build order / next artifacts

1. **Highest-leverage:** one stepper running A and B side by side on the SAME program
   (`let y=x in { y.f:=1 }; x.f`) — watch `x` change under A, stay put under B, stepping in
   lockstep. Teaches the whole A-vs-B distinction on one screen; doubles as a skeleton for
   either implementation.
2. Otherwise pick the committed vehicle and build its `step(State): State` over the core
   rules — Vehicle 1: `new`, field-read, field-write, assign, call, return, println (four
   panels). Vehicle 2: substitution stepper + optional CESK machine view (single surface).

## Open theory items (from MnL work, may interact) — ALL RESOLVED 2026-07-09
- ~~Machine type-soundness proof.~~ **DONE**: mechanized in Coq as
  `Paper-Live-Types…/artifact/proofs/Machine.v` — a CESK-style Coq model (no store,
  hence CEK) of MNL's machine (`csekMachine/machine.ts`, frames matched one-to-one: FAppL~KArg,
  FAppR~KApply, FLet~KBind), with `preservation` + `progress` + `machine_soundness`
  (never stuck; final answers typed), axiom-free/admit-free, total step function so
  determinism is definitional. Paper: Thm. "Machine type soundness" in
  `programming-with-live-types.tex` §Metatheory (thm:machine-sound).
- ~~let-generalization question.~~ **ANSWERED**: machine value typing is stable under
  every type substitution (`vty_tsub` — values are type-erased and the language is
  pure, so there is no store and no value restriction is needed); hence a let-bound
  machine value inhabits EVERY instance of its generalized scheme
  (`let_gen_inhabits`, arbitrary Γ and instantiation). Generalization has no runtime
  content — `machine_poly_id` runs the poly_id program on the machine by computation
  (one closure, two type instantiations, answer (0,1)). Paper: thm:machine-letgen.
  Machine soundness against the polymorphic judgment `has_type` directly is NOT
  claimed — its closure rule needs the arbitrary-substitution typing lemma
  (proofs/ROADMAP.md Obl. 3–4), which stays on the Damas–Milner-completeness path.
- ~~Hazel/Hazelnut comparison subsection.~~ **UPDATED**: rem:hazel / rem:vs-hazel /
  Related Work in `programming-with-live-types.tex` now carry a dynamics leg —
  Hazelnut Live evaluates *around* holes (hole closures, fill-and-resume; conceded,
  no counterpart here); MnL adds a mechanically type-sound environment machine, a
  no-value-restriction polymorphism story, and the §7 substitution⇄environment
  correspondence as an *executable editor artifact* (Lockstep tab + per-example trace
  and value agreement + the corpus-wide three-way differential audit).
