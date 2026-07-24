# Block-MiniJava — Identity + Interaction Brief (Stage 2)

**Premise carried from Stage 1:** the visual-slop problem is already solved. This brief
does **not** restyle from scratch. It *names the identity the CSS already implies*,
fills the few semantic gaps (a real "reachable/retired" color pair; a tabular face for
addresses/counters), and specifies the interaction contract the three steppers only
half-implement. Every token, font, size, and animation below either **is** an existing
value in `tokens.css` / `domain.css` or is a named evolution of one, so Stage 3 is an
edit, not a rewrite. **No new runtime dependencies** (no new fonts, no libraries — the
utility face is a *treatment* of the mono family already in the stack).

Location: `docs/ui-refactor/` for the same build-safety reason as the audit
(`webpack.config.js:12` keeps only `ui-refactor/` across `npm run build`).

The self-critique that the task requires — per section, "would I have written this for
any unrelated project?" — is in **§7**, with the revisions it forced.

---

## 1. Token system — colour tied to the machine's own ontology

The base is a **dark navy substrate** (already `--surface-app: #111318`, a blue-black;
raised surfaces climb toward `#22262e`). Against it, colour is never decorative — every
accent below **names a thing the abstract machine can be doing to a value**. That is the
governing rule: *if a colour does not correspond to a state a `MachineValue`,
`Address`, or block can be in, it does not exist in the palette.*

Seven semantic roles. Two of them (block category, address identity) are deliberately
**scales/formulas, not single swatches**, because the language's world demands it — a
program has many block categories and a heap has many addresses, and collapsing either
to one hex would destroy the information the colour carries.

| # | Role (machine ontology) | Hex / formula (dark) | Hex (light) | Where it already lives | Change |
|---|---|---|---|---|---|
| 1 | **Block category** — which grammar non-terminal a block is | scale of 6: structure `#80505a` · declaration `#685b7a` · type `#3d6d5a` · statement `#80602f` · expression `#455f7f` · value `#5c713e` | `#754650`·`#5e5074`·`#346252`·`#75552a`·`#3a5878`·`#526638` | `--grammar-*` (`tokens.css:127-132`) + `theme.ts:154-169` | **Unify** the two sources (S1): `theme.ts` reads the CSS vars, one truth |
| 2 | **Address identity** — *which* heap cell, so two references to one object read as one object | `hsl(loc·67 mod 360, 62%, 34%)` chip / `55% 45%` box border / `60% 52%` arrow | `hsl(h, 52%, 46%)` chip | `locHue` (`stepperPanel.ts:68`), `--loc-hue` throughout `domain.css` | **Keep**, promote to a named role "address hue ring"; document the S/L pairs as tokens |
| 3 | **Focus of reduction** — the current redex / control / next continuation | `#5b8def` (Redex Blue) | `#356dcc` | `--accent-primary`; `is-top`, `is-next`, block highlight | **Keep**, rename intent to "redex/focus" so it is never reused for generic "primary button" chrome |
| 4 | **Mutated-this-step** — a slot whose value the last step overwrote | `#d9a441` (Mutation Gold) | `#9c6b12` | `--state-warning`; `stepper-flash`, `is-changed` (`domain.css:827-838`) | **Keep**; add a *persistent* gutter mark, not only the fading flash (closes Stage-1 U11) |
| 5 | **Reachable** — a cell the mark phase proved live | `#3fb950` (Live Green) | `#25843d` | `--state-success` (exists, **unused by the heap view**) | **Adopt**: tint the mark-phase ring / a "live" dot so reachability is a *positive* signal, not just "didn't get swept" |
| 6 | **Unreachable / retired** — a cell being swept, and the fact that its address is retired forever (never reused) | `#5b636f` (Retired Slate, desaturated) + `grayscale(1)` | `#8a929c` | today only `filter: grayscale` + fade (`domain.css:679-684`) | **Add** the named slate so "dead / address retired" is a deliberate colour, reinforcing the monotonic-allocation invariant |
| 7 | **Collector touch** — the mark wave sweeping the heap (GC is a first-class actor in this fork) | `#d08355` / `#ee9b6c` (Collector Copper) | `#ad5f37` | `--state-execution-strong`; `is-gc-marked` (`domain.css:660-671`) | **Keep**; must stay visibly distinct from Mutation Gold (mutator) and Redex Blue (control) — copper = "the collector, not the program, touched this" |

**Palette laws (Stage 3 must hold these):**

- Gold, Green, Copper, Blue each mean **exactly one** machine event. A button hover, a
  selected tab, a focus ring may use Redex Blue *as chrome accent* only where it does not
  sit next to machine state; inside a stepper panel, Blue = focus of reduction, full stop.
- Address hue (role 2) is the **only** colour allowed to vary continuously. Nothing else
  in the app is generated from a hue formula. This keeps "a rainbow" readable as "these
  are addresses."
- Reachable-green and retired-slate are a **pair**: any view that can show one must be
  able to show the other, so reachability is never encoded by presence/absence alone.

---

## 2. Typography — three roles, no new fonts

Built on the two families already declared (`tokens.css:13-14`): **Inter** (chrome) and
**JetBrains Mono** (code). The third role is *synthesised* from the mono family with
OpenType features — no font file added.

| Role | Family | Treatment | Used for |
|---|---|---|---|
| **Chrome / sans** | `--font-family-ui` (Inter → system-ui) | normal | menus, tabs, buttons, headings, prose, empty-state guidance |
| **Code / machine-state mono** | `--font-family-code` (JetBrains Mono → Consolas) | normal, `line-height` code | generated MiniJava, stepper slots, kont entries, output, tree nodes |
| **Utility — address & counter face** (NEW) | `--font-family-code` | `font-variant-numeric: tabular-nums`; small-caps for word-labels; `letter-spacing: .04em` | address chips (`#3`), step/rewrite counters, CSESK column letters, "STORE / STACK / CONTROL" headers, GC tallies |

Why the utility face is Block-MiniJava-specific, not generic polish: during **Play**,
counters and addresses update on a timer. Proportional digits make `#3 → #10 → #128`
and `step 9 → step 10` **jump width** on every tick — the panel jitters exactly when the
student is trying to watch it. `tabular-nums` freezes column width so only the *values*
change, not the layout. Addresses also need to right-align and compare at a glance
(`#3` vs `#128` reading down the Store), which tabular figures give for free. This is a
legibility requirement of a live stepper, not a typographic flourish.

**Type scale** (reconciles the existing `--font-size-*`; adds weight/role intent):

| Token | Size | Weight | Role |
|---|---|---|---|
| `--font-size-lg` | 16px | 600 | panel/dialog titles, brand |
| `--font-size-base` | 14px | 400 | body prose, menu items |
| `--font-size-md` | 13px | 400 / 700 | code view, stepper slot values (700 for scalars) |
| `--font-size-sm` | 12px | 500 / 700 | control labels, kont entries, status |
| `--font-size-xs` | 11px | 700 + tracked | **utility face**: column headers (CONTROL/STORE…), counters, address-chip caps |

CSESK column letters (`C S·E S K`) and address chips are the two places the utility face
is mandatory; everywhere else the mono family is used plain.

---

## 3. Layout — the two-surface contract

Python-Tutor lineage: a **program surface** (the Blockly workspace) and a **machine-state
surface** (the bottom dock's steppers) that must be **legible at the same time** while
stepping. The existing three-column shell + bottom dock is kept; the brief pins the rules
that make the two surfaces co-visible.

```
┌───────────────────────────────────────────────────────────────────────────────┐
│  ▚ B-MJ    File  Examples  View  More                                    header │  46px
├──┬───────────────┬──────────────────────────────────┬─────────────────────────┤
│▚ │ BLOCKS        │  Block Workspace        ↶ ↷  ⤢ ▶ │ MiniJava Inspector   ⧉ │
│▚ │ ┌───────────┐ │                                  │ [Code][Types][Outline]  │
│A │ │ search    │ │      ●─────●   ← program         │  class Project {         │
│c │ └───────────┘ │      │     │     surface         │    public static …      │
│t │  ▸ structure  │      ●──●  ●     (redex block     │    …                     │
│i │  ▸ statement  │         │        highlighted)     │                          │
│v │  ▸ expression │      ●──●                         │                          │
│50│  ≥220 (270)   │      ≥360  (flex, never hidden)   │  ≥320 (430)              │
├──┴───────────────┴──────────────────────────────────┴─────────────────────────┤
│ ═══ resize ═══                                    machine-state surface (dock)  │
│ [Problems][Output][Semantics ▸ Structure Value ·CESK· A/B Rewrite]      ⟳ ⤢ ⌄ │
│ ┌ CONTROL ─┐┌ STACK+ENV ─┐┌ STORE ─────┐┌ KONT ────┐┌ OUTPUT ┐  step 12 · new  │
│ │ expr     ││ main        ││ #3 Node    ││ ▢;then…  ││ 5      │                 │
│ │ x.next   ││  x → #3 ────╫─╫→#3 ·······││ x=▢      ││        │   ≥160 (276)    │
│ └──────────┘└─────────────┘└────────────┘└──────────┘└────────┘   ≤70vh         │
├───────────────────────────────────────────────────────────────────────────────┤
│ Project.java   ▨ 14 blocks   ⚠ 0 Problems                       Autosave ready  │  24px
└───────────────────────────────────────────────────────────────────────────────┘
```

**Min widths / resize / persistence** (all keys already exist under
`block-minijava.layout.*`):

| Region | Min | Default | Resize | Persist key |
|---|---|---|---|---|
| Activity bar | 50px | 50px | fixed | — |
| Primary sidebar | **220px** | 270px | drag `#sidebar-resizer`, ← → arrows | `…sidebar.width` / `.visible` |
| Workspace | **360px** | flex (fills) | — (absorbs slack) | — |
| Inspector | 320px | 430px | drag `#code-resizer`, ← → arrows | `…code.width` / `.visible` |
| Machine surface (dock) | 160px | 276px | drag `#viz-resizer`, ↑ ↓ arrows; max 70vh | `…bottom.height` / `.open` / `.tab` |

**Layout laws specific to the two-surface model:**

1. **The workspace is never fully occluded while a stepper is running.** "Maximize dock"
   (`bottom-maximized`) is allowed *only* when the active tab is Problems/Output; when a
   *stepper* tab is active it caps at 70vh so the highlighted redex block stays visible.
   Rationale: bidirectional highlight (Stage-1 U4) is meaningless if you can't see both
   ends at once.
2. **No layout shift when the heap grows.** Addresses are monotonic, so new Store boxes
   append at the bottom of an ascending-sorted list (`stepperPanel.ts:425`) — existing
   boxes never reorder. Stage 3 must preserve the sort and must not animate the container
   height in a way that scroll-jumps (arrows already redraw without pulse on scroll/resize,
   `scheduleArrowRedraw(false)`).
3. **Independent scroll per column.** Each `.stepper-panel-body` keeps `overflow:auto`
   (`domain.css:708`); the CSESK grid may collapse 5→2 columns under 1180px
   (`domain.css:581`) but never clips.
4. **Perspective presets stay honest.** `Debug` opens the dock on a stepper; `Presentation`
   maximizes the workspace and hides the dock. Manual panel changes fall to `Custom`
   (already implemented) — keep that; never mislabel a hand-tuned layout as a preset.

---

## 4. Motion policy — allowlist, each animation = one machine transition

**Rule: an animation exists only if it depicts a state transition of the abstract
machine.** Everything not in this table is removed. Durations match `domain.css` /
`stepperPanel.ts` constants (a CSS/JS mismatch on GC would desync the commit — see the
`GC_SWEEP_FADE_MS` note at `stepperPanel.ts:673`).

| Animation | Depicts | Trigger | Duration | `domain.css` | Reduced-motion **degrades to** |
|---|---|---|---|---|---|
| **Pointer pulse** — arrow thickens in place, never moves | "same object, new value" — a field write does **not** re-point the reference | `is-pulse` on write | 700ms | `stepper-arrow-pulse` | instant final stroke; arrow still drawn (state stays legible) |
| **Write-dot travel** — a dot rides the arrow into the box | the written value flowing from the writing frame into the heap cell | top-frame write | 400ms | `animateMotion` (`stepperPanel.ts:593`) | omitted; box still flashes |
| **Mutation flash + gutter mark** | which slot the last step overwrote | `is-changed` | 700ms flash **+ persistent mark** | `stepper-flash` | skip flash, **keep the persistent gutter mark** (this is why U11 adds a non-transient marker) |
| **Frame push / pop** (NEW, minimal) | a call pushing / a return popping an activation frame | stack depth change | ≤180ms fade/height | new | instant add/remove |
| **Mark wave** — copper ring, one box at a time | the collector proving reachability, paced distinct from mutator Play | GC mark phase | 300ms/box | `stepper-gc-mark-glow` | rings applied instantly in sequence, still one-by-one so the *order* reads |
| **Sweep retirement** — grayscale + fade + slight scale-down, then removal | the cell dying and its address retiring forever | GC sweep | 450ms | `is-gc-swept` | instant grey→remove |
| **Redex focus move** — highlight shifts to the new control block | the machine advancing to the next redex | each step | Blockly highlight | instant highlight swap |
| **Console flash** | new output line arrived | new stdout | 450ms | `console-flash` | none |

**Two policy changes vs today:**
- Reduced-motion currently *nukes everything* globally (`workbench.css:2226`). That erases
  the lesson (you can't see the mark *order* or *what changed*). Replace the blanket kill
  with **per-animation degrade-to states** (last column) so the semantic signal survives
  even when the motion doesn't.
- The follow-focus **pan** (`centerOnBlock` every step, Stage-1 U6) is **not** an
  animation to keep — it is reclassified as behaviour, and constrained: pan only when the
  redex block is off-screen, and offer a persistent "follow redex" toggle.

Anything else — hover scale, decorative fades, easing on chrome — is disallowed.

---

## 5. Interaction contract — the stepper

Bindings are **scoped to the dock** (active when focus is within `#viz-dock` or its
controls), so they never clobber global editing or the existing Ctrl-shortcuts. Every
control gets a keyboard binding, an explicit enabled predicate, and — closing Stage-1 U3
— **text shown when it is disabled** (as a `title`/`aria-description` swap, not silence).

| Control | Key (dock-scoped) | Enabled when | Disabled text (the *reason*) |
|---|---|---|---|
| **Load / Reload** | `R` | always (rebuilds from current blocks) | — (never disabled) |
| **Step** | `→` , `.` , `Space` | `state.status === 'running' && !stale && !gcAnimation` | running→ n/a; if `done`: "Program finished — nothing left to step"; if `error`: "Machine is stuck — press Back or Reload"; if `stale`: "Program changed — press Reload" |
| **Back** | `←` , `,` | `history.length > 0 && !stale && !gcAnimation` | "At the start — no earlier step to return to" |
| **Play / Pause** | `Space` when stopped toggles; `Esc` pauses | same as Step (Play), or `playing` (Pause) | inherits Step's reason |
| **Run GC** | `G` | `state && !stale && heap.size > 0 && !gcAnimation` | if empty heap: "Heap is empty — nothing to collect"; if collecting: "Collection in progress" |
| **Auto-GC toggle / threshold** | — (pointer) | always | — |
| **Jump to start / end** (NEW, uses existing history) | `Home` / `End` | `history.length > 0` | "No history yet — press Step" |
| **Reveal address** (chip → box) | click / `Enter` on focused chip | ref chip present | — |
| **Locate block** (row → program) | click / `Enter` on focused row | row has provenance block id | — |

**Contract rules:**

- **Bidirectional highlight (U4).** Hovering/selecting a program block highlights its
  machine row(s) and any heap cell it names; hovering a Store box emphasises every chip
  (and arrow) that references it. The machine→program direction already exists
  (`locateProvenance`); Stage 3 adds program→machine and cell↔row emphasis. All three
  corners of *redex block ↔ machine row ↔ heap cell* must light together.
- **Stuck state anchors on the block (U5).** On `status === 'error'`, do **not** clear
  the highlight (today `stepperPanel.ts:488` sets it null). Pin the highlight to the stuck
  block and show the plain-language reason *at the block*, mirroring the type-checker's
  on-block warning pattern (`typeDiagnostics.ts:23-34`). Errors are anchored, never
  transient.
- **Position read-out (U2).** Replace bare "step n" with `step n` + a **history
  scrubber** (a range over `history[]`, which already holds every prior pure snapshot) so
  a student can scrub back and forth. "of m" appears only once the run reaches `done`/`error`
  and m is known; while running it reads "step n" honestly.
- **Consistency across the three steppers (U7).** CESK, A/B, and Rewrite share one chip
  contract: a Ref chip is *always* focusable, clickable, and address-hued; a row with a
  provenance block is *always* locate-on-click. No tab may render an inert chip that looks
  interactive.
- Focus rings (`:focus-visible`, `workbench.css:304`) and `aria-*` wiring are preserved on
  every new interactive element; new bindings are announced via the existing
  `aria-live` status region.

---

## 6. Copy rules + three rewrites from the codebase

**Rules.** (1) *Instruct, don't sell* — no exclamation marks, no feature adjectives, no
"powered by." (2) *Use the machine's own nouns* — frame, store, address, reference, redex,
reachable, retire, mark, sweep — so the copy teaches the vocabulary the visualisation
shows. (3) *Empty states say what to do next*, naming the trigger (`new`, `Load`, a
method call). (4) *Errors state the reason and the recovery*, anchored where the problem
is. (5) *Counters and states are stated flatly* — "step 12", "Heap is empty" — never
dressed up.

**Rewrite 1 — vague empty state → names the trigger.**
`comparePanel.ts:186`
- Before: `hint('empty')`
- After: `hint('No heap yet — Model A allocates a cell on the first new.')`
- Why: "empty" tells a student nothing; the rewrite says *what* fills it and *when*, and
  names the Model-A/heap distinction that is the whole point of the A-vs-B tab.

**Rewrite 2 — passive placeholder → active, machine-noun.**
`stepperPanel.ts:371`
- Before: `hint('The call stack will appear here.')`
- After: `hint('Each method call pushes a frame here; the top frame is the one running now.')`
- Why: "will appear here" is generic scaffolding; the rewrite states the *rule* (call ⇒
  push frame) and the reading key (top = current) that the panel then demonstrates.

**Rewrite 3 — feature list that sells → instrument framing.**
`index.html:449-450` (About body)
- Before: "B-MJ combines grammar-aware blocks with editable MiniJava source, type
  information, program structure, diagnostics, and output."
- After: "B-MJ is a laboratory for Java's reference model. Build a MiniJava program as
  blocks, then step it on a heap machine to watch references, frames, and garbage
  collection as they happen."
- Why: the before is a comma-list of features (marketing shape). The after states what the
  instrument is *for* and what the student will *do and see* — reference model, stepping,
  heap, frames, GC — which is the artifact's actual thesis.

---

## 7. Self-critique — "would I have written this for any project?"

Required by the task. For each section I wrote a generic draft first, asked the question,
and revised where the answer was "yes." Here is what changed and why.

**§1 Tokens — *generic answer, then revised.*** A generic brief would list "primary,
success, warning, danger, neutral + a dark navy base" — which is essentially what a
Bootstrap/Tailwind theme is, and I *could* have shipped that (Redex Blue≈primary,
Gold≈warning, Green≈success, Copper≈danger). **Revised:** I re-derived every colour from a
*machine event* (`reachable` = mark proved it live; `retired` = address gone forever;
`collector touch` ≠ `mutator write`) and made block-category and address-identity
**scales/formulas** rather than swatches, because a heap has many addresses and a grammar
has many categories — a single hex would have been the generic tell. The reachable/retired
*pair* law and the "only address hue may vary continuously" law are things no generic
project would ever state.

**§2 Typography — *revised the justification, not just the fonts.*** Generic version:
"sans for UI, mono for code, and a tabular utility face" — true of any IDE, and I nearly
left it there. **Revised:** I tied the utility face to a *failure that only a live stepper
has* — counters and addresses mutating on a Play timer cause width-jitter exactly when the
student is watching — and made `tabular-nums` a legibility requirement of stepping, plus
the down-the-Store address alignment. Without that, the section was project-agnostic.

**§3 Layout — *added laws a generic IDE brief lacks.*** A generic "three-panel IDE +
bottom panel, resizable, persisted" wireframe is exactly what I first drew, and most of it
is fine to keep because the shell *is* a generic-good IDE shell. **Revised:** I added the
two rules that come only from the two-surface teaching model — *the workspace may never be
fully occluded while a stepper runs* (70vh cap on maximize) and *no reorder/scroll-jump on
heap growth because addresses are monotonic*. Those are Block-MiniJava laws; the rest is
honestly generic and I left it, saying so.

**§4 Motion — *this section was already forced specific.*** Hard to make generic: every
row names a machine transition. The place I caught myself being generic was
reduced-motion — the easy answer is "we honour `prefers-reduced-motion`" (blanket off,
which is what exists). **Revised:** I replaced the blanket kill with per-animation
*degrade-to* states, because for this artifact the motion *carries the lesson* (mark order,
what changed) and turning it fully off is an accessibility answer that destroys pedagogy —
a tension a generic project never faces.

**§5 Interaction — *generic on bindings, specific on the contract.*** Arrow-keys to
step/back and Space to play are conventional (a media player has them) — I kept them
because convention is a feature here, but that part *is* generic and I won't pretend
otherwise. **Revised/kept-specific:** the disabled-reason strings, the *bidirectional
redex↔row↔cell* rule, and *stuck-anchors-on-the-block* are derived from this machine's
provenance data and are the substance of the section; the keybinding table is the generic
scaffolding around them.

**§6 Copy — *specific by construction.*** The rules ("use the machine's own nouns:
frame/store/address/redex/reachable/retire") can't transfer to a project that has no such
nouns, and all three rewrites are pulled from real lines. The one generic rule is "no
exclamation marks / no selling," which is universal good copy — I kept it as table stakes
and didn't dress it up as an insight.

**Net:** the sections most at risk of being generic were §2 and §3; both were revised to
lead with a Block-MiniJava-specific *reason* rather than a best-practice assertion. §1 was
re-derived from machine events. §4/§5/§6 were specific by their nature, with the generic
scaffolding (keybinding conventions, "honour reduced motion," "no exclamation marks")
labelled as such instead of inflated.

---

## Ready-for-Stage-3 checklist (not yet actioned)

- Unify grammar colour source (S1); add `--reachable`, `--retired` tokens (roles 5–6).
- Add the utility type role (tabular-nums + small-caps treatment of the mono family).
- Enforce the two layout laws (70vh stepper cap; preserve monotonic Store order).
- Swap blanket reduced-motion for per-animation degrade-to states; add frame push/pop.
- Implement the keyboard contract + disabled-reason strings + history scrubber.
- Add program→machine highlight and cell↔row emphasis (bidirectional); anchor stuck state.
- Land the three copy rewrites and apply the copy rules to the other empty/error strings.
