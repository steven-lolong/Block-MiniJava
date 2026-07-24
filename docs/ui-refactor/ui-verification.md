# Block-MiniJava — UI Verification (Stage 4)

Verification of the Stage-3 implementation against the Stage-1 audit and the
Stage-2 brief. Location `docs/ui-refactor/` for the same build-safety reason as
the other two files (`webpack.config.js:12` keeps only `ui-refactor/` across
`npm run build`).

Stage-3 commits verified here: `686a2b9` · `9b667de` · `309f792` · `8593803` ·
`a0d4d55` · `f6c90dc` · `62264b1` · `377f983`. All passed `npm run typecheck`
and `npm test` before landing; the CESK interaction changes were additionally
exercised in a live browser (dev server, localhost:8080).

---

## 1. Audit rows — resolution or deferral

### Slop findings

| Row | Status | Evidence |
|---|---|---|
| **S1** duplicated grammar colour source | **Resolved** | `theme.ts` documented as sole author; `tokens.css` `--grammar-*` asserted equal by a new drift guard (`test/run_block_colors.js`, 14 passing checks). `--grammar-runtime` added so all 7 exist in CSS. |
| **S2** pill radius on data chips | **Ratified, kept** | Conscious decision recorded in brief §1: `999px` = "address identity / state token", the only pill shape; everything else stays `--radius-control`. No change. |

### Usability findings

| Row | Status | Evidence |
|---|---|---|
| **U1** no stepper keyboard bindings | **Resolved (all 3 steppers)** | `dockKeyboard.ts` — `→`/`.` Step, `←`/`,` Back, `Space` Play/Pause, `R` Load, `G` Run GC (CESK). Wired in CESK/A-vs-B/Rewrite. Live-verified. |
| **U3** disabled controls give no reason | **Resolved (all 3)** | `stepDisabledReason()`/`gcDisabledReason()` set the button `title`; `find` in the live browser confirmed the disabled Back button's accessible name = "At the start — no earlier step to return to". |
| **U4** highlight not bidirectional | **Resolved (CESK)** | `data-block-id` on every provenance element; `linkFromWorkspaceSelection` (block→rows, off `Blockly.Events.SELECTED`) + delegated hover `emphasizeLoc` (chip/box→all same-address). Live-verified both directions and their clearing. Compare/Rewrite unchanged (single-surface; see note). |
| **U5** stuck state clears highlight | **Resolved (CESK)** | `renderAll` now anchors the highlight on `status==='error'`, not only `'running'`. |
| **U6** canvas pans every step | **Resolved (CESK)** | `isBlockOnscreen` gate — `centerOnBlock` fires only when the redex is off-screen. |
| **U7** cross-stepper chip inconsistency | **Resolved** | A-vs-B Ref chips gained CESK's affordance (click/Enter reveal, `role=button`, `tabindex`, title) + frame/heap provenance click; CESK chips gained Enter/Space. All three now share one chip contract. |
| **U11** change signal is transient/colour-only | **Resolved (CESK)** | Persistent gutter dot (`.stepper-locals tr.is-changed td:first-child::before`) survives after the 700ms flash fades. |
| **U9** `--text-muted` fails 4.5:1 | **Resolved by reframing** | Grep shows `--text-muted` is used **only** for two icon glyphs (`.activity-item` stroke, `.outline-disclosure`), never body text. Icons are non-text → 3:1 threshold, which it meets on every surface (min 3.35:1 on `--surface-control`). No readable text is below 4.5:1 (§3). |
| **U2** no "step n of m" / scrubber | **Deferred** | Reason: a history scrubber needs new range-input markup + wiring across three control bars — a larger UI addition than a token/behaviour fix. Data already exists (`history[]`) so it remains cheap later. "step n" is shown honestly today. |
| **U8** thin/truncatable empty states | **Partially resolved** | Both copy rewrites landed (compare "empty"→trigger sentence; CESK frames placeholder). The right-aligned status-span truncation itself is unchanged — deferred with U2 as part of the same control-bar rework. |
| **U10** card-in-card density | **Deferred** | Reason: the brief classifies this as a decision to ratify (cards group a scope legitimately), not an obvious defect; a column-baseline redesign is out of proportion to the rest of this pass. |
| **U12** focus rings present | **Confirmed, preserved** | Global `:focus-visible` rule intact; new interactive chips are `tabindex`/`role=button` and inherit it. |
| **U13** panels resize/scroll | **Confirmed, preserved** | Unchanged; the 70vh stepper-maximize cap (a0d4d55) strengthens co-visibility. |

**Brief items with no matching audit row, also landed:** §1 roles 5–6 (reachable
`is-gc-survived` green pulse + retired slate tint); §2 utility face (`tabular-nums`
on addresses, status counters, locals tables); §3 layout law 1 (70vh cap); §4
motion policy (per-animation reduced-motion degrade); §6 all three copy rewrites.

---

## 2. Keyboard-only walkthrough (full program run)

Program: **Stack (Push/Pop)** example, CESK tab. No pointer used after initial
description; each row is a keystroke and the observed result.

| # | Key | Result |
|---|---|---|
| 1 | `Tab` ×N → Examples, `Enter`, arrows, `Enter` | Example loads (existing menu keyboard nav, unchanged). |
| 2 | `Ctrl+J` | Bottom tools open (existing global shortcut). |
| 3 | `Tab` to the CESK **Load** button | Focus enters `#viz-dock` — the precondition for the dock-scoped keys. |
| 4 | `R` | Machine builds; status "step 0". |
| 5 | `.` / `→` | One step each; Control/Store/frames advance; status counter ticks (tabular, no width jitter). |
| 6 | hold `→` | Steps to completion; at `done`, Step/Play auto-disable, their `title` reads "Finished — nothing left to step". |
| 7 | `G` | (If heap non-empty) mark-and-sweep runs; survivors flash green, swept box greys toward retired then leaves. When heap is empty the button is disabled with title "Heap is empty — nothing to collect". |
| 8 | `←` / `,` | Steps back through history; at step 0 Back disables, title "At the start — no earlier step to return to". |
| 9 | `R` | Resets to a fresh machine. Loop closes. |

**Dead ends found:** none in the run itself. **One friction point, by design:**
the step keys are dock-scoped, so they do nothing until focus is inside
`#viz-dock` (step 3). This is deliberate — it prevents the stepper from
swallowing `→`/`Space` while the user is typing in a block field or the toolbox
search — but a keyboard user must know to `Tab` to a stepper control first.
Focus is never trapped and every control is reachable by `Tab`; the auto-GC
threshold `<input>` correctly does **not** intercept step keys (guarded by
`isEditableTarget`).

---

## 3. Contrast check (computed, WCAG 2.1 ratios)

Method: sRGB relative luminance from token hexes; the same formula the existing
`test/run_block_colors.js` uses. Threshold: 4.5:1 for normal text, 3:1 for
large/bold and for non-text (icons, borders).

**Dark theme — body/UI text on every surface:** all pass 4.5:1.
- `--text-primary`: 13.6–16.7:1. `--text-emphasis`: 10.6–13.0:1.
  `--text-secondary`: 6.95–8.5:1.
- State text (used for status lines/badges) on raised/control: success 5.97–6.42,
  warning 6.74–7.25, error **4.65–4.99**, info 6.00–6.45, execution 6.89–7.41,
  accent 4.69–5.05 — all ≥ 4.5:1.

**Dark theme — `--text-muted` (3.35–4.10:1):** below 4.5:1, but used **only**
for two icon strokes (`.activity-item`, `.outline-disclosure`), never text. As
non-text it needs 3:1; it meets that everywhere (worst case 3.35:1 on
`--surface-control`). **Pass** for its actual use.

**Light theme (spot check):** primary 15.2:1, secondary 5.42:1, error 4.98:1 —
pass. `--text-muted` 3.47–3.79:1, again icon-only → passes the 3:1 rule.

**Non-text / decorative:** `--state-retired` (2.69:1 on raised) is used only as
the border tint of a box that is simultaneously at `opacity:0.15` + grayscale +
scaling out — a transient "dying" cue carrying no text or essential standalone
meaning, so the text/icon thresholds don't apply.

**Verdict:** no readable text pair is below 4.5:1; no icon/border below 3:1.

---

## 4. prefers-reduced-motion

**Honoured, and improved over the pre-existing blanket rule.**

- The global kill switch (`workbench.css` `@media (prefers-reduced-motion: reduce)`,
  transitions/animations → ~0ms) is still present as the floor.
- Stage 3 added a **per-animation degrade** block (`domain.css`): each glow
  keyframe (`is-write-target`, `is-gc-marked`, `is-gc-survived`) is given its
  *held end state* under reduced motion, because a `@keyframes` animation with
  default fill-mode reverts to base when collapsed to ~0ms — i.e. the blanket
  rule alone would make these signals **invisible**, not instant. The swept-cell
  fade (a plain `transition`) already degrades correctly to its held end state.
- The SVG write-dot travel (`stepperPanel.ts`) is skipped when
  `matchMedia('(prefers-reduced-motion: reduce)')` matches — it only re-depicts
  the box glow, which remains.

Net: under reduced motion the machine's semantic signals (what changed, what the
collector marked, what survived, what retired) all remain legible as static
state; only the movement is removed.

---

## 5. Slop reintroduced during Stage 3

**None.** `git diff f3e1071..HEAD -- src/` shows, for the added (`+`) lines:

- gradients / `backdrop-filter` / `blur()`: none.
- raw Tailwind palette (`gray-800`, `blue-500`, …): none.
- large uniform `border-radius` (8–24px): none.
- new hardcoded hex in component CSS/TS (`src/core/ui`, `domain.css`,
  `workbench.css`): **none** — every new colour is a `var(--…)` token or an
  `hsl(var(--loc-hue) …)` derivation.
- emoji: none (the notation glyphs `→ ← ▢` in titles are keys/holes, not decor).
- hover scale/translate: none. The single added `transform: translateY(-50%)`
  is static vertical centering of the persistent change-marker dot, not a
  transition.

New animations added (`is-gc-survived`, the gutter dot) are on the brief's §4
allowlist (reachable signal) or are static (dot). No decorative motion introduced.

---

## 6. Would a name-stripped screenshot read as a machine-semantics teaching tool?

Yes — and not by branding. What identifies it:

1. **A CESK column layout labelled `C · Control`, `S·E · Stack + Environment`,
   `S · Store`, `K · Kontinuation`.** That is abstract-machine vocabulary. No
   generic web app has a "Kontinuation" column with a `▢` hole marker showing
   pending work.

2. **A heap of address-tagged boxes (`#1 · StackTest`, `#2 · Stack`) wired to
   `#1`/`#2` reference chips by colour-matched arrows.** Two chips, one colour,
   one box = aliasing made visible. This is the Python-Tutor-lineage reference
   model, not a data table.

3. **Two surfaces in lockstep** — a block program with one block highlighted as
   the current redex, and a machine state that changed in the last step — with a
   `step N · <rule>` counter. A product shows *outcomes*; this shows *a small-step
   reduction in progress*.

4. **Garbage-collection state as first-class colour:** copper "collector touched
   this", green "proven reachable", slate "retired — address never reused". A
   generic app has no reason to distinguish reachable from retired.

5. **Flat, semantic, laboratory palette on dark navy** — no gradient hero, no
   glass cards, no marketing copy; every colour maps to a machine event. The
   restraint itself reads as "instrument", not "landing page".

Put plainly: the screenshot is legible as *a program being executed on a heap
machine, one step at a time, with references and garbage collection drawn
explicitly* — which is exactly what the tool is, and what no generic template
would ever show.
