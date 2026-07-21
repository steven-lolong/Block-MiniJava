# Block-MiniJava stylesheet map

## Scope

This map covers every application stylesheet imported by the primary browser entry point. It records current cascade ownership and conflicts so the UI can be refactored without accidentally changing layout, Blockly sizing, responsive drawers, printing, editor behavior, semantic visualizations, or state visibility. It does not prescribe a redesign.

## Effective import order

`src/assets/js/block_minijava.ts` imports CSS in this exact order:

| Cascade order | File | Approximate size | Current role |
|---:|---|---:|---|
| 1 | `src/assets/css/styles.css` | 2,501 lines | Legacy/global stylesheet; base reset and tokens, original application shell, toolbox/workspace/inspector, dialogs, icons, typing/print, generated-code highlighting, bottom visualizations, CESK/compare/rewrite semantics, and older responsive layout. |
| 2 | `src/assets/css/codeEditor.css` | 97 lines | Editable-code overlay mechanics: highlight layer, textarea, line numbers, status, focus, and token alignment. |
| 3 | `src/assets/css/workbench.css` | 1,982 lines | Later domain-workbench override: revised tokens/themes, shell/header/activity/sidebar/workspace/inspector/status/palette, code-editor visual overrides, bottom-panel chrome, and the current responsive drawer model. |

Webpack injects the imported styles in module order. Therefore equal-specificity declarations in `workbench.css` override `codeEditor.css` and `styles.css`; this order is part of current behavior.

There is no independent `<link>` stylesheet in `src/index.html`. Moving imports, extracting files, or changing bundler insertion order is a cascade change even if declarations are unchanged.

## Ownership by file

### `styles.css`: legacy plus still-authoritative domain styles

The file is “legacy” only for shell presentation. It remains authoritative for several functional/domain areas:

- `:root` font stacks, compatibility dimensions, legacy theme tokens, code token colors, radii, shadows, and transitions.
- Base reset and original shell/header/menu/panel rules that still provide fallbacks where the override is incomplete.
- Toolbox category and block-list details, grammar/token highlighting, modal/form and examples details.
- Typing derivation layout and the complete print workflow.
- Semantic visualization workspaces, CESK stepper, heap/reference arrows, compare, rewrite, transition/GC states, and output animation.
- Older responsive rules at 1260, 980, and 580 px, plus semantic-layout breakpoints at 1180 and 920 px.

It cannot be deleted after visually replacing the old shell; doing so would remove typing, print, code tokens, semantic/runtime, dialog, and fallback behavior.

### `codeEditor.css`: editor mechanics

This small file owns the layered editor structure:

- `.code-editor-pane`, `.code-editor-scroll`, `.code-editor-highlight`, `.code-editor-input`.
- Synchronized monospace metrics, transparent textarea foreground/caret, line numbers, focus state, and `.code-editor-status`.
- Token/highlight positioning needed for text/block round-tripping.

`workbench.css` later overrides some editor colors, spacing, `white-space`, line-number/status appearance, and selection feedback. The mechanics should remain isolated until editor regression tests cover scroll synchronization, Tab insertion, source import, and resize.

### `workbench.css`: current shell override

This is the visual authority for:

- Neutral dark/light shell tokens and compatibility aliases back to legacy variable names.
- Header/project identity/command center/menu, activity bar, primary sidebar, workspace toolbar, right inspector, bottom dock chrome, status bar, command palette, and current Problems/Output presentation.
- State selectors for hidden/maximized panels and perspectives.
- The 1100 px fixed drawer implementation and scrims, 900 px compact header menu, and 700/480 px phone layout.
- Reduced-motion behavior.

It is not a complete replacement for `styles.css`; it deliberately relies on legacy domain styles and compatibility variables.

## Design tokens already present

| Token family | Defined in | Notes |
|---|---|---|
| Fonts | `styles.css`: `--font-ui`, `--font-code` | UI uses Inter with system fallbacks; code uses JetBrains Mono/SFMono/Consolas/Liberation Mono/Menlo. No webfont is imported here. |
| Shell dimensions | Both: `--ide-activity-bar-width`, `--ide-primary-sidebar-width`, `--ide-code-panel-width`, `--ide-bottom-panel-height`, `--ide-status-bar-height`; header variables | `workbench.css` values win. TypeScript mutates sidebar/code/bottom variables at runtime. |
| Compatibility dimensions | `styles.css`: `--toolbox-width`, `--code-width`, `--viz-height` | Aliases to the `--ide-*` dimensions; retain while legacy rules remain. |
| Neutral semantic shell | `workbench.css`: `--ide-shell-bg`, `--ide-activity-bg`, `--ide-sidebar-bg`, `--ide-panel-bg`, `--ide-surface-raised`, `--ide-workspace-bg`, `--ide-toolbar-bg`, `--ide-header-bg`, borders, text/muted/disabled | Separate dark and `body[data-theme="light"]` values. |
| Product/status colors | `workbench.css`: `--ide-accent`, `--ide-accent-hover`, `--ide-success`, `--ide-warning`, `--ide-error`, `--ide-info` | Intended primary accent and semantic status families. |
| Legacy palette aliases | Both: `--bg`, `--bg-strong`, `--panel`, `--panel-soft`, `--panel-elevated`, `--border`, `--border-strong`, `--text`, `--muted`, `--aquamarine`, `--aquamarine-strong`, `--gold`, `--danger` | `workbench.css` maps these to new semantic variables so old domain selectors inherit the new theme. |
| Code syntax | Both: `--token-keyword`, `--token-type`, `--token-number`, `--token-identifier`, `--token-operator`, `--token-comment`, `--token-builtin`, `--token-method`, `--token-punctuation`; `styles.css` also defines `--token-string` | Important gap: `workbench.css` does not redefine `--token-string`; the legacy dark/light value continues to win by inheritance. |
| Geometry/effects | Both: radius and shadow variables, transition duration/easing; workspace grid variables in the override | Current use is mixed with many hard-coded values. |
| Runtime-generated | TypeScript: `--outline-depth`, `--loc-hue` | Used for outline indentation and heap/reference color identity. These are behavioral style inputs. |

Token redefinition at the start of `workbench.css` is intentional cascade compatibility. Removing legacy tokens before every consumer is migrated will create undefined values or theme drift.

## Duplicate selectors

A selector-level scan finds approximately **139 selector strings present in more than one stylesheet**. There are also repeated selectors within individual files—approximately 53 in `styles.css`, 2 in `codeEditor.css`, and 60 in `workbench.css`—primarily because base declarations are revisited inside media queries or state sections. Counts include comma-split selectors and are an inventory signal, not a semantic duplicate-removal count.

### Cross-file duplicate families

| Selector/family | Files | Conflict/ownership |
|---|---|---|
| `:root`, `body`, `body[data-theme="light"]` | `styles.css`, `workbench.css` | Workbench dimensions and theme tokens win; legacy-only variables still inherit. |
| `.app-shell`, `.app-header`, `.brand-banner`, `.brand-banner img`, `.main-menu`, `.menu-button`, `.theme-switch`, `.project-status`, `.loaded-file-label` | Legacy and workbench | Workbench owns current shell; unoverridden legacy decoration can leak through. |
| `.ide-workbench`, `.ide-layout`, `.activity-bar`, `.toolbox-column`, `.workspace-column`, `.code-column` | Legacy and workbench | Workbench grid/flex rules win; these are layout-critical, not safe mechanical duplicates. |
| `body.code-hidden .ide-layout`, `body.toolbox-hidden .ide-layout`, their combined state, and hidden-column/resizer selectors | Legacy and workbench | Later grid templates are authoritative; both embody behavior. |
| `.column-header`, `.column-title`, `.workspace-header`, `.workspace-title-row`, `.workspace-tools`, `.workspace-footer` | Legacy and workbench | Workbench current chrome; typing print still queries `.workspace-footer`. |
| `.icon-button`, `.visibility-toggle`, `.workspace-reveal-button`, `.run-button`, `.zoom-pill` | Legacy and workbench | Equal/higher specificity rules combine; state visibility must be tested before consolidation. |
| `.inspector-tabs`, `.inspector-tab`, `.inspector-tab.is-active`, `.inspector-panel`, `.inspector-panel.is-active` | Legacy and workbench | Workbench owns appearance; active display semantics are shared and functional. |
| `.viz-dock`, `.viz-dock[data-open="true"]`, `.viz-resizer`, `.viz-dock-header`, `.viz-tabs`, `.viz-tab`, `.viz-host`, `.viz-dock-tools` | Legacy and workbench | Workbench owns panel chrome, legacy owns much domain content. Open/active selectors must survive. |
| `.console-view`, Problems list/count/item families | Legacy and workbench | Workbench presentation wins while legacy provides some base/animation behavior. |
| `.examples-panel`, `.examples-panel.examples-open`, example item families | Legacy and workbench | Visibility and placement combine with later responsive header rules. |
| `.about-modal`, `.about-card`, `.about-header/body/actions`, save-name controls | Legacy and workbench | Workbench restyles but relies on native `<dialog>` and legacy structure. |
| `.code-view`, `.grammar-highlight`, token classes | Legacy, editor, and/or workbench | The editor install expects the legacy host; token colors/weights remain split. |
| `.code-editor-pane`, `.code-editor-input`, `.code-editor-input:focus`, `.code-editor-status` | `codeEditor.css`, `workbench.css` (with some legacy code-view rules) | Mechanics start in editor file; workbench later changes display metrics and colors. Consolidate only with editor tests. |
| `.panel-scrim`, sidebar/code scrims and resizers | Legacy/workbench responsive sections | Workbench 1100 px drawer implementation wins. Explicitly frozen pending regression tests. |

### Important within-file repeats

- Shell and panel selectors in `styles.css` are declared once for desktop and again at 1260/980/580 px. They describe the superseded stacked layout but still leak properties not reset by `workbench.css`.
- Workbench layout/state selectors repeat at 1260, 1100, 900, 700, and 480 px. These are responsive overrides rather than deletable duplicates.
- Bottom panel selectors repeat in base and 700 px fixed/mobile layouts.
- Code editor focus/status selectors repeat between base editor mechanics and workbench visual rules.

A future consolidation must compare complete computed declarations at each breakpoint; selector-name equality alone is insufficient.

## Specificity and cascade conflicts

| Conflict | Current winner | Risk |
|---|---|---|
| Equal-specificity shell rules in legacy and workbench | Later `workbench.css` | Reordering imports restores decorated legacy shell. |
| Legacy `@media (max-width: 980px)` stacked layout vs workbench `@media (max-width: 1100px)` fixed drawers | Workbench where it redeclares a property; legacy elsewhere | Very high: partial deletion can create a hybrid stacked/drawer layout. |
| Legacy and workbench 1260 px grid widths | Workbench | High: min/max constraints differ and state grids have separate selectors. |
| Legacy 580 px rules vs workbench 700/480 px rules | Later workbench only for properties it covers | High: old mobile spacing/sizing can survive unexpectedly. |
| `codeEditor.css` layered text metrics vs workbench editor declarations | Workbench | Critical: a small line-height/white-space/padding difference desynchronizes text and highlight layers. |
| Legacy syntax token colors vs workbench theme tokens | Workbench for redefined variables; legacy for `--token-string` | Medium/high: removing legacy theme block loses string color. |
| Native `[hidden]` behavior vs class selectors with display declarations | Depends on specificity/order | High: workbench explicitly restores `display:none !important` for selected hidden controls; `.activity-bar, .activity-bar[hidden] { display:flex; }` would override native hiding if `hidden` were used there. |
| Print stylesheet in legacy vs later workbench compact/mobile layout | Legacy print rules use `!important` | Critical: without those declarations the typing derivation can disappear in print. |
| Runtime state class selectors vs general card/table styles | State selectors or later rules depending on combination | High: transitions/writes/GC become invisible if specificity is reduced. |

## `!important` declarations

`!important` is concentrated in purposeful compatibility/accessibility areas:

| File/area | Use | Keep until |
|---|---|---|
| `styles.css` `@media print` | Forces shell/panel/tree dimensions, overflow, visibility, and exclusions so typing prints despite later workbench mobile rules | Print layout has a single later-owned stylesheet and browser regression coverage. |
| `workbench.css` global `:focus-visible` | Ensures the accent focus outline wins component rules | Focus styles are normalized with equivalent or stronger accessible behavior. |
| `workbench.css` `.visually-hidden` | Standard off-screen accessible text recipe | Replaced by a tested shared utility. |
| `workbench.css` hidden problem/tool controls | Guarantees `[hidden]` beats component display rules | All conflicting display declarations are removed. |
| `workbench.css` palette input | Removes the nested input outline because the containing search control owns focus appearance | Palette focus treatment is reworked accessibly. |
| `workbench.css` at 1100 px | Hides desktop resizers in drawer mode | Responsive resize implementation is test-covered and consolidated. |
| `workbench.css` reduced-motion query | Minimizes animation/transition and smooth scrolling | Must remain an accessibility invariant. |

Do not remove these declarations in a general “no `!important`” cleanup.

## Hard-coded colors

An automated value scan finds roughly 72 distinct color literals/functions in `styles.css`, none in `codeEditor.css`, and roughly 75 in `workbench.css`. Most workbench literals are legitimate dark/light token definitions, but many component declarations still bypass semantic tokens.

| Hard-coded area | Examples/type | Assessment |
|---|---|---|
| Theme token definitions | Dark/light hex values in both large files | Expected, but duplicated theme sources should eventually become one authority. |
| Print | `#000`, `#fff`, neutral grays | Appropriate paper/ink override; keep explicit. |
| Grammar/toolbox category details | Direct green/blue category values such as `#6fae72`, `#688dc8` | Candidate for the six/seven semantic grammar-family token set, but not in this documentation step. |
| Runtime references/arrows | HSL generated from `--loc-hue` | Functional color identity; preserve contrast and non-color cues. |
| Overlays/scrims/modals | `rgba(...)`, transparent mixes, shadow colors | Candidate for overlay/shadow tokens. |
| White foreground/strokes | Direct `#fff` in selected/primary/runtime states | Audit against light/dark semantic foreground tokens. |
| Workspace grid | Theme-specific grid hex values also passed directly from `app.ts` to Blockly | Crosses CSS/TypeScript boundary; changing only CSS will not change Blockly grid. |

Color literals that encode diagnostic severity, execution state, grammatical category, or heap identity are not decorative and cannot be normalized to one accent.

## Hard-coded spacing and geometry

The files contain many literal pixel values in addition to the main dimension variables: approximately 76 distinct pixel values in `styles.css`, 6 in `codeEditor.css`, and 72 in `workbench.css`. Common values are 1 px borders, 4/6/8/10/12 px gaps/padding, 14 px text/controls, and 24/30 px control or keyboard-resize increments.

| Category | Current literals | Risk/notes |
|---|---|---|
| Shell regions | Header/status/activity heights, sidebar/code/bottom widths, 4/10 px resizer tracks | Some are tokenized; TypeScript and CSS clamping must agree. |
| Controls | Many 24–34 px heights, 4–12 px gaps/padding, very large radii such as `999px` | Candidates for future spacing/control tokens; not safe as a blind replacement. |
| Blockly workspace | 24 px main grid; 20 px semantic grid; zoom ranges/speeds in TypeScript | Functional geometry outside CSS. |
| Resizing | 24 px keyboard steps; sidebar/code clamps; bottom 160 px minimum and 70vh maximum in TypeScript | Behavioral constants; stylesheet consolidation alone cannot change them. |
| Runtime/typing | Dense table/tree padding, arrow marker sizes, print point/pixel sizes | Domain visualization readability; keep separate from shell spacing. |
| Responsive drawers | 48 px viewport remainder, fixed offsets, scrim bounds | Frozen pending regression tests. |

There is no complete spacing scale today. Introducing one belongs to a later implementation step and must preserve computed geometry at responsive thresholds.

## Typography definitions

| Area | Current definition | Finding |
|---|---|---|
| UI family | `--font-ui`: Inter followed by system sans-serif stack | Used globally and in controls/status. |
| Code family | `--font-code`: JetBrains Mono followed by platform monospace stack | Used by generated/editable code, palette keys, semantic values, and runtime tables. |
| Base shell | Workbench `body` uses `13px/1.4 var(--font-ui)` | Later than legacy body font declarations. |
| Editor | Approximately `0.9rem/1.5rem` in legacy/editor; workbench later uses fixed 12 px/20 px layers | Exact matching across textarea/highlight/line numbers is functional. |
| Typing/semantic/print | Mixed rem, px, and print-specific point-like pixel sizes | Separate compact domain typography; not solely shell chrome. |
| Weight range | Standard 400/500/600/700 plus nonstandard 520, 560, 620, 650, 690, 720, 730, 760, 780, 800, 820, 860, 900, 920 | Conflicts with target visual rule. Normalize later with visual tests; weights in token highlighting and state emphasis may affect alignment/readability. |

No production font-weight changes are made here. The future refactor should restrict normal weights to 400/500/600/700 while checking editor overlay alignment and print output.

## Responsive breakpoints

| Breakpoint/query | File | Current behavior | Coupled JavaScript |
|---|---|---|---|
| `@media print` | `styles.css` | Typing-only printable derivation, hides shell controls, expands overflow | `printing-typing` classes and `window.print()`/`afterprint` |
| 1180 px max | `styles.css` | CESK/semantic panel grid compaction | No exact JS query |
| 920 px max | `styles.css` | Stepper/compare semantic layouts collapse to one column | No exact JS query |
| 1260 px max | Both | Legacy shell narrowing and workbench panel width caps | No exact JS query |
| 980 px max | `styles.css` | Legacy stacked/mobile shell | Superseded in part by workbench 1100 px drawers |
| 580 px max | `styles.css` | Legacy narrow-phone adjustments | Overlaps workbench phone rules |
| 1480 px max | `workbench.css` | Header/command compaction | No exact JS query |
| 1100 px max | `workbench.css` | Fixed sidebar/inspector drawers, scrims, hidden resizers | `matchMedia('(max-width: 1100px)')` throughout `app.ts` |
| 900 px max | `workbench.css` | Hamburger/main-menu layout | JS closes menu at `matchMedia('(min-width: 901px)')` |
| 700 px max | `workbench.css` | Phone shell/status/bottom-panel behavior | Main Blockly performs delayed `zoomToFit()` at `max-width: 700px` |
| 480 px max | `workbench.css` | Smallest-width control/label reductions | No exact JS query |
| `prefers-reduced-motion: reduce` | `workbench.css` | Removes effective animations/transitions/smooth scroll | Accessibility invariant |

The 1100, 900/901, and 700 px CSS/JavaScript pairs must remain numerically synchronized. Consolidating the old 980/580 rules is a candidate only after responsive regression tests exist.

## Candidate files/areas for later consolidation

These are candidates, not changes authorized by this document:

1. Establish one token/theme owner, retaining compatibility aliases until every legacy consumer is migrated. Include the currently legacy-only `--token-string`.
2. Move the current shell/header/activity/sidebar/workspace/inspector/status declarations out of `styles.css` ownership, then delete only legacy shell declarations proven fully overridden by `workbench.css`.
3. Consolidate `codeEditor.css` and the editor-specific section of `workbench.css` into one editor owner after overlay, input, scroll, import, focus, and resize tests exist.
4. Split still-authoritative domain CSS from legacy shell CSS: typing/print, grammar/code highlighting, semantic runtime/stepper/compare/rewrite, and dialogs/examples can have explicit ownership.
5. Reconcile the responsive system around the current workbench breakpoints, but leave the drawer/resize implementation unchanged until regression tests cover it.
6. Replace component-level hard-coded shell colors/spacing with existing semantic tokens and a tested spacing scale; retain grammar, severity, and runtime color semantics.

## Removal hazards

Do not remove any of the following merely because a later stylesheet appears to duplicate it:

- Legacy syntax token definitions, especially `--token-string`.
- Typing derivation and `@media print` rules.
- Semantic/runtime/stepper/compare/rewrite classes and state selectors.
- Editor mechanics from `codeEditor.css`.
- State grid rules and responsive drawer/scrim/resizer rules from `workbench.css`.
- Compatibility variable aliases used by legacy selectors.
- Reduced-motion and focus-visible rules.

The safest consolidation unit is a complete feature with computed-style and interaction regression coverage, not a selector copied in isolation.
