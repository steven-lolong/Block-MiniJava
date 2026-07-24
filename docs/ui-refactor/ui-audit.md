# Block-MiniJava — UI Audit (Stage 1)

**Scope:** presentation and interaction only. Evaluation semantics, the store, the
type checker, and Blockly block definitions/connection checks are out of bounds and
were not evaluated for change (only read where they surface strings or drive UI
state).

**Method:** full read of the token/theme layer (`tokens.css`, `theme.ts`),
`index.html`, all `src/core/ui/*.ts`, `stepperPanel.ts` / `comparePanel.ts` /
`substPanel.ts` / `visualizationPanel.ts` / `typeDiagnostics.ts` /
`programConsole.ts`, and targeted greps across CSS/TS for the slop and usability
markers listed in the brief.

**File location note:** the brief asked for `docs/ui-audit.md`. `webpack.config.js:12`
runs `clean: { keep: /ui-refactor\// }`, so a production build deletes everything in
`docs/` **except** `docs/ui-refactor/`. This file therefore lives at
`docs/ui-refactor/ui-audit.md` so `npm run build` will not wipe it. Trivial to move
if you want it elsewhere.

---

## 0. Headline finding — this is not template slop

The premise of the task ("stops reading as generic AI-generated template UI") is
**largely already satisfied at the visual layer.** The evidence, all verifiable:

| Slop marker from the brief | Result | Evidence |
|---|---|---|
| Decorative gradients (indigo→purple→cyan) | **None** | `grep gradient src/assets/css` → 0 hits |
| Glassmorphism / backdrop-blur | **None** | `backdrop-filter: none` set explicitly (`workbench.css:368,874`) |
| Uniform large border-radius | **None** | radius tokens are `--radius-none: 0` / `--radius-control: 4px` (`tokens.css:50-51`); the only literal radii are `50%` on two round dots (`workbench.css:168,703`) and `999px` on data chips (see S2) |
| Default drop shadows | **None** | shadows are tokenized and purposeful (menus/drawers/dialogs only, `tokens.css:53-58`); components set `box-shadow: none` |
| Animated/glowing borders (decorative) | **None** | every animation is semantically justified (§2, S1) |
| Raw Tailwind palette (`gray-800`, `blue-500`…) | **None** | fully tokenized semantic names; themes in `tokens.css:98-192` |
| Emoji in the interface | **None (only math notation)** | `⊢ ▢ ▸ ⏎ Γ ·` are typing-judgement / continuation-hole glyphs (`stepperPanel.ts:288-360`, `typeChecker.ts:119`), not decorative emoji |
| Icon-only buttons w/o label or tooltip | **None** | every icon button carries `aria-label` **and** `title` (`index.html:201-213,229-232,281-284`) |
| Marketing / selling copy | **None** | `grep` for seamless/powered-by/blazing/etc → 0 (the one `!` hit is a parser comment) |
| Hover scale/translate w/o meaning | **None** | no `transform: scale`/`translate` on hover in the stylesheets |
| prefers-reduced-motion ignored | **Handled globally** | `workbench.css:2226-2235` zeroes transitions/animations |

So the identity brief in Stage 2 is **not a rescue from slop** — it is *sharpening an
already-disciplined system and giving it a defensible name*, and closing a set of
**genuine interaction gaps** that are where the real work is. The audit below is
honest about that: the FIX column is dominated by usability, not decoration.

Two small visual judgment calls remain open (S1, S2). Everything else flagged is
interaction.

---

## 1. Surface enumeration

Verdicts: **KEEP** (defensible as-is) · **FIX-SLOP** · **FIX-USABILITY** · **BOTH**.
"U#"/"S#" reference the detailed findings in §2–§3.

### Chrome / shell

| Surface | file:line | What it does | Verdict |
|---|---|---|---|
| App header + brand (`B-MJ` logo/wordmark) | `index.html:49-55` | Static brand zone, logo left | KEEP |
| Main menu — File / Examples / View / More | `index.html:57-142` | Dropdown menus, full ARIA, `kbd` hints, keyboard nav (`app.ts:1313-1340`) | KEEP |
| Hamburger / responsive menu toggle | `index.html:143-145` | Collapses menu on narrow widths | KEEP |
| Activity bar — Blocks / Search | `index.html:152-161` | Icon rail, `aria-pressed`, `title` | KEEP |
| Primary sidebar (toolbox) + search | `index.html:164-180` | Block palette, search input labelled | KEEP |
| Sidebar / code / bottom resizers | `index.html:182,221,265` | `role=separator`, `tabindex=0`, arrow-key resize (`app.ts:1070,1124`; `visualizationPanel.ts:277`) | KEEP (U12) |
| Workspace header tools — undo/redo, zoom, fit, bottom, **Run** | `index.html:199-214` | Icon buttons w/ label+title; Run has text label | KEEP |
| Blockly workspace | `index.html:216-218` | Main program surface | KEEP |
| Inspector header — copy / print-typing / maximize / hide | `index.html:225-234` | Icon actions, labelled | KEEP |
| Inspector tabs — Code / Types / Outline | `index.html:235-239` | `role=tablist`, arrow-key nav (`app.ts:1428-1433`) | KEEP |
| Code view (generated MiniJava) | `index.html:241-243` | Syntax-highlighted `<pre>`; tokens `--syntax-*` | KEEP |
| Typing panel (Γ ⊢ derivation) | `index.html:244-253` | Derivation tree + Γ + print header | KEEP |
| Outline panel | `index.html:254-257` | `role=tree` program structure | KEEP |
| Status bar — file, block count, problems, autosave | `index.html:411-420` | Live indicators; Problems is a real button | KEEP |
| Command palette | `index.html:424-434` | `role=dialog/combobox/listbox`, Ctrl+Shift+P, `↑↓/Enter/Esc` help | KEEP |
| About modal | `index.html:436-459` | `<dialog>`; body is a mild feature list | KEEP (copy note, §4) |
| Save / Export / Example-load modals | `index.html:461-531` | Native `<dialog>` forms, labelled fields | KEEP |

### Viz dock + steppers (the instrument)

| Surface | file:line | What it does | Verdict |
|---|---|---|---|
| Viz dock shell — tabs Problems/Output/Semantics, rerun/arrange/maximize/collapse | `index.html:264-286` | Tabbed bottom dock, resizable+persisted (`visualizationPanel.ts`) | KEEP |
| Problems list | `index.html:288-290`, `typeDiagnostics.ts:46-74` | Click-to-locate rows + on-block warning icons | KEEP (model to copy for U5) |
| Program output console | `index.html:291-293`, `programConsole.ts` | Mirrors most-recent run/stepper | KEEP |
| Semantics sub-tabs — Structure/Value/CESK/A-vs-B/Rewrite | `index.html:295-311` | Nested tablist, arrow-key nav | KEEP |
| **CESK stepper controls** — Load/Back/Step/Play/Run GC + auto-GC + status | `index.html:315-330`, `stepperPanel.ts:857-876` | Click-only; disabled predicates in `renderButtons` (211-217) | **BOTH** — U1, U2, U3 |
| CESK panels C / S·E / S / K / Output | `index.html:333-352`, `stepperPanel.ts:225-478` | Columnar CESK; tables for slots; SVG heap arrows | FIX-USABILITY — U4, U10, U14 |
| CESK heap arrows overlay | `stepperPanel.ts:492-602`, `domain.css:588-654` | Ref chip → heap box, per-`loc` hue, write pulse | KEEP (strong) |
| CESK program-follow highlight | `stepperPanel.ts:119-133,488` | Highlights + **re-centers** focus block each render | FIX-USABILITY — U5, U6 |
| CESK provenance (row → block) | `stepperPanel.ts:91-100,246-360` | Click a machine row → center+select its block | KEEP; but one-directional — U4 |
| A-vs-B (compare) stepper | `index.html:356-390`, `comparePanel.ts` | Lockstep A/B columns | FIX-USABILITY — U1, U7, U8 |
| Rewrite (subst) stepper | `index.html:391-403`, `substPanel.ts` | Rewrite tree in its own workspace + correspondence line | FIX-USABILITY — U1, U8 |
| `viz-empty` placeholder | `index.html:404`, `workbench.css:259-274` | Centered one-liner for Structure/Value tabs | KEEP (minor, U8) |

### Token / theme layer

| Surface | file:line | What it does | Verdict |
|---|---|---|---|
| Design tokens (type, space, controls, motion, layering) | `tokens.css:9-96` | Single source of truth; runtime-owned `--ide-*` size vars | KEEP |
| Dark theme palette | `tokens.css:98-145` | Surfaces, borders, text, states, grammar, syntax | KEEP (U9 on `--text-muted`) |
| Light theme palette | `tokens.css:147-192` | Mirror of dark | KEEP |
| Blockly renderer theme + domain palette | `theme.ts:139-195` | Category colors + copper/aquamarine/gold semantic palette | KEEP (S1 — duplicated hexes) |
| `workbench.css` (shell) | 2235 lines | Shell layout, chrome, responsive, reduced-motion | KEEP |
| `domain.css` (steppers) | 918 lines | Stepper visuals + the semantic animations | KEEP (S2) |
| `codeEditor.css` | 163 lines | Inspector code surface | KEEP |

---

## 2. Slop findings (with evidence)

True slop is essentially absent (§0). Two conscious visual decisions are worth
ratifying in the Stage-2 brief rather than "fixing" blind:

**S1 — Grammar/domain colors are declared twice (two sources of truth).**
`theme.ts:154-169` hardcodes the grammar category hexes (`structure '#80505a'`, …)
and the semantic palette `copper/aquamarine/gold` (`theme.ts:179-195`); the *same*
grammar hexes also live as `--grammar-*` tokens in `tokens.css:127-132,175-180`, and
the copper/aquamarine/gold roles reappear as `--state-execution-strong`, the
`is-write-target`/`is-gc-marked` animation colors (`domain.css:643-671`), etc.
Not a visual defect, but a drift hazard: a color can be changed in one place and not
the other. *Verdict: FIX (low priority) — the Stage-2 token system should name these
roles once and have `theme.ts` read them, or at minimum cross-reference them.*

**S2 — Pill radius (`999px`) on data chips.** `.stepper-ref` (`domain.css:781`),
`.stepper-control-kind` (`domain.css:505`). This is the only "uniform pill" styling
in the app. It is defensible — an address chip (`#3`) and a kind tag (`value`) read
as *tokens/labels*, and the pill differentiates them from the rectangular machine
cells — but it is exactly the shape the brief is suspicious of, so it should be an
explicit, named decision in Stage 2 (e.g. "address identity = pill, everything else =
`--radius-control`"), not an accident. *Verdict: KEEP-with-rationale.*

---

## 3. Usability findings (with evidence)

Ordered roughly by teaching impact.

**U1 — Stepper controls have no keyboard bindings. [High]**
The global key handler binds Ctrl+S/O/N/J, Ctrl+Shift+F, Ctrl+F5 and Esc
(`app.ts:1527-1556`) — nothing for stepping. `initStepperPanel` wires *click* only
(`stepperPanel.ts:859-863`); ditto compare (`comparePanel.ts:358-361`) and subst
(`substPanel.ts:288-291`). There is no Space/→/← to Step/Back, no key to Play/Pause
or Load. For an instrument whose entire job is "advance one step and look," this is
the single biggest interaction gap. A stepper should be drivable without the mouse.

**U2 — No "step n of m" / no scrub affordance. [Med]**
Status reads `step {stepCount}` (`stepperPanel.ts:207`), `step {stepCount}`
(`comparePanel.ts:127`), `rewrite {stepCount}` (`substPanel.ts:154`). Total *m* is
genuinely unknowable mid-run (it is a live machine), so "of m" cannot be shown while
running — *that part is defensible*. But: (a) after `done`/`error` the final count is
known and could frame a scrubbable timeline; (b) `history[]` already holds every
prior state (`stepperPanel.ts:45,806`), so a back-scrubber is essentially free and
would turn "step n" into a navigable position. Recommend a step counter + history
scrubber rather than only Back.

**U3 — Disabled controls state no reason. [Med]**
`renderButtons` toggles `.disabled` on Step/Play/Back/GC (`stepperPanel.ts:211-217`)
but the button `title`s are static ("Undo one machine step", `index.html:319`; "Mark
and sweep the heap now", 322). When **Back** is disabled (empty history), **Run GC**
is disabled (empty heap), or **Step** is disabled (done/stuck), nothing on or near the
button explains why. The shared status line covers *done/stuck/stale* only
(`renderStatus` 175-208) and never Back/GC. A disabled control should say why (title
swap or an adjacent reason), per the brief.

**U4 — Highlight linking is one-directional; the core "block ↔ row ↔ cell" triangle
is incomplete. [High — this is the teaching thesis]**
Working today: machine row → program block (center+select, `stepperPanel.ts:91-100`,
wired on control/frame/kont/heap rows); current redex → highlighted block
(`setHighlight` 119-133,488); Ref chip → heap box via shared hue + click + SVG arrow
(`72-86,524-602`). **Missing:** clicking/hovering a *program block* does not
highlight its machine row or heap cell (no listener from workspace → panel); and
hovering a heap cell does not light up the rows that reference it (the arrows exist
but there is no hover-to-emphasize). The brief explicitly wants
`reducing block ↔ machine row ↔ heap cell` bidirectional. Today it is a one-way street
from machine to program.

**U5 — Stuck/error state clears the highlight instead of anchoring on the offending
block. [Med]**
On non-running status, `renderAll` sets the highlight to `null`
(`stepperPanel.ts:488`) and the error surfaces only as panel text
"Stuck after N step(s): …" (`renderStatus:197-201`). So at the exact moment a student
most needs to see *where* the machine got stuck, the program highlight goes away. The
type-checker already does this right — it pins a warning on the block itself
(`typeDiagnostics.ts:23-34`, `setWarningText`) and offers click-to-locate. The runtime
stuck-state should adopt the same "anchored at the block, plain-language reason"
pattern instead of dropping the highlight.

**U6 — The canvas re-centers on every step (uninterruptible pan). [Med]**
`setHighlight` calls `workspace.centerOnBlock(blockId)` on *every* render
(`stepperPanel.ts:129`), and `locateProvenance` also centers (97). Each Step pans the
Blockly canvas to the focus block. It is semantically motivated ("follow the redex")
but it fights manual panning, has no toggle, and is precisely the "canvas pan when a
step is taken" the brief flags. Recommend: pan only when the focus block is *off
screen*, and/or make follow-focus a toggle that persists.

**U7 — The three steppers disagree on what a chip affords. [Med]**
CESK Ref chips are interactive: hover state, click-to-reveal, heap arrows
(`stepperPanel.ts:72-86`; `domain.css:788-800`). Compare Ref chips are inert colored
pills — no click, no arrow (`comparePanel.ts:48-62`). Compare frames/heap also lack
the provenance click that CESK rows have (`comparePanel.ts:155-160` vs
`stepperPanel.ts:382-395`). Addresses themselves *are* consistent — `#{loc}`
everywhere, heap always `sort(([a],[b]) => a-b)` ascending
(`stepperPanel.ts:425`, `comparePanel.ts:190`) — good — but the same visual chip means
"interactive" in one tab and "static" in the next, which teaches the wrong thing about
what is clickable.

**U8 — Pre-load / empty states are thin, truncatable, and inconsistent. [Med]**
The dominant call-to-action for each stepper is "Press Load to build the machine…"
placed in a small, right-aligned, `nowrap`, `text-overflow: ellipsis` status span
(`domain.css:420-428`) that can be clipped. CESK panel bodies do carry good inline
hints ("What the machine evaluates next…", `stepperPanel.ts:229,319,417`), but compare
shows a bare "empty" for its heap (`comparePanel.ts:186`) and subst shows only the
status line. `viz-empty` ("Choose a method call to inspect its evaluation.",
`index.html:404`) is fine but applies only to Structure/Value. Empty states should be a
consistent, non-truncatable "here is how to start" in the panel body.

**U9 — `--text-muted` fails 4.5:1 on raised surfaces. [Low-Med, verify]**
`--text-muted: #6f7782` (`tokens.css:115`) on `--surface-raised: #1d2027`
(`tokens.css:100`) computes to ≈ **3.6:1** — passes AA for large text (≥3:1), fails for
body text. `--text-secondary` (#a9b0bc) is fine (≈7.5:1). Action: audit each
`--text-muted` usage; where it labels body-size text on a raised surface, darken the
surface or lighten the token.

**U10 — Machine state is card-in-card; columns don't share a monospace baseline.
[Low]**
Slots themselves already use aligned monospace tables (`.stepper-locals`,
`domain.css:754-767`) — good. But each frame is a `.stepper-frame` card wrapping a
table (`stepperPanel.ts:376-410`), each heap object a `.stepper-heap-box` card
(`806-813`), and the Kontinuation column is a stack of opacity-dimmed `div`s
(`domain.css:534-579`) rather than an aligned ledger. Because the five C/S·E/S/K/Output
columns are independent grids, an address in the Store column and the same address in a
frame's locals do not line up on a shared baseline, so the eye cannot scan a row across
the machine. The per-scope framing is a legitimate call (it groups a frame/object) —
worth a deliberate decision in Stage 2 on "cards for grouping vs one aligned ledger."

**U11 — "What changed this step" is color-only and transient. [Low-Med]**
`is-changed` is a 700ms gold background flash with no persistent marker
(`domain.css:827-838`; applied per changed row/box in
`stepperPanel.ts:403,430-431,447,454`). After the flash there is no indication of which
local/field/element changed on the last step — a student who glances away loses it, and
the signal is carried by color alone. Recommend a persistent per-step change marker
(e.g. a gutter •) alongside the flash, so "changed-this-step" survives the animation and
is not color-only.

---

## 4. Cross-cutting notes

- **Accessibility baseline is good, don't regress it.** Global `:focus-visible` ring
  on button/input/select/`[tabindex]` (`workbench.css:304-310`); resizers are keyboard
  operable; menus/tabs have arrow-key navigation; ARIA roles are thorough. Any Stage-3
  restyle must preserve the focus ring and the `aria-*` wiring.
- **Reduced motion is handled** (`workbench.css:2226-2235`) — but it is a blanket
  "kill all animation." The semantic animations (pointer pulse, mark wave, sweep
  retirement) *are the lesson*; under reduced-motion they vanish entirely rather than
  degrading to an instantaneous but still legible state change. Stage-2 motion policy
  should say what each animation degrades **to**, not just that it turns off.
- **Copy is instructional, not sell-y** — the one soft spot is the About body, a mild
  feature list ("combines … source, type information, program structure, diagnostics,
  and output", `index.html:449-450`). Candidate for an instrument-framed rewrite in
  Stage 2's copy section, not a defect.
- **Addresses are rendered consistently and in a stable order** everywhere checked
  (`#{loc}`, ascending sort) — this is a strength to preserve, and the Stage-2 token
  system should give "address identity" a named role so it stays consistent.

## 5. Semantics-adjacent — flagged, NOT to be changed here

None of the findings require a semantics change. Two are worth stating so Stage 3
does not accidentally reach across the line:

- **U2's history scrubber** must read the *existing* `history[]` snapshots
  (`stepperPanel.ts:45`); it must not alter `step`, the store, or address allocation.
  Back already replays snapshots purely — a scrubber is the same mechanism, UI-only.
- **U5's stuck-block anchoring** needs the offending block id. The machine already
  exposes `focusBlockId` / provenance block ids on control and frames
  (`stepperPanel.ts:387,488`); anchoring the error uses data that already exists — no
  new semantic output required. If it turns out the stuck block id is *not* available
  from current machine state, that is a semantics-touching change and must be brought
  back to you rather than done here.

---

## Verdict summary

- **FIX-SLOP:** ~0 true items; 2 visual decisions to ratify (S1 duplicated color
  source; S2 pill radius).
- **FIX-USABILITY:** U1 keyboard (High), U4 bidirectional highlight (High), U2 scrub,
  U3 disabled reasons, U5 stuck-block anchor, U6 pan-on-step, U7 cross-stepper
  consistency, U8 empty states, U9 contrast, U10 table density, U11 persistent change
  marker.
- **KEEP:** the entire chrome/shell, the token architecture, the heap-arrow system,
  the on-block diagnostics model, the accessibility baseline.

The honest one-line framing for Stage 2: *the visual slop problem is already solved;
the work is to name the identity that the CSS already implies, and to finish the
interaction contract the steppers only half-implement.*
