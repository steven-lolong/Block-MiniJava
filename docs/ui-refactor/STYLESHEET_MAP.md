# Block-MiniJava stylesheet map

Status: current after the conservative workbench cleanup. This document describes the production cascade loaded by `src/assets/js/block_minijava.ts` and the boundaries that later visual work must respect.

## Effective import order

There are no application stylesheet `<link>` elements in `src/index.html`. Webpack injects these imports in source order:

| Order | File | Approximate size | Authoritative responsibility |
|---:|---|---:|---|
| 1 | `src/assets/css/tokens.css` | 217 lines | Design tokens, dark/light theme values, runtime dimension contracts, and the few aliases still consumed by domain views. |
| 2 | `src/assets/css/workbench.css` | 2,231 lines | Global reset/utilities, application shell, header, activity/sidebar, workspace, inspector shell, dialogs, bottom-panel shell, status bar, command palette, and responsive behavior. |
| 3 | `src/assets/css/domain.css` | 918 lines | Typing derivations and print layout, CESK/runtime views, comparison and rewrite views, and domain-state animation. |
| 4 | `src/assets/css/codeEditor.css` | 163 lines | Generated/editable MiniJava text, output text, textarea/highlight alignment, line numbers, editor status, and syntax tokens. |

The order follows dependency rather than override intent: tokens first, shell structure next, specialized domain content next, and exact editor-layer metrics last. No stylesheet is a generic “skin” over another stylesheet.

## Architecture by file

### `tokens.css`: the single token authority

This file defines application-shell theme colors and global scales. The deliberate exception is Blockly block rendering: `src/core/renderer/theme.ts` owns the seven block-family palettes and the complete block-type classification. `tokens.css` mirrors each family primary as `--grammar-*` so the custom HTML toolbox uses the same category accents. `:root` owns theme-independent geometry, typography, spacing, motion, elevation, z-index, and panel-size references. `body[data-theme="dark"]` and `body[data-theme="light"]` own theme values.

The file also preserves three runtime-written variables as compatibility contracts:

- `--ide-primary-sidebar-width`
- `--ide-code-panel-width`
- `--ide-bottom-panel-height`

TypeScript writes those properties during resizing and restores their persisted values. Semantic aliases such as `--panel-sidebar-width`, `--panel-inspector-width`, and `--panel-bottom-height` reference them; the direction must not be reversed.

`--ide-activity-bar-width`, `--ide-status-bar-height`, and `--header-height` also remain available because current layout and responsive rules depend on their established identities.

### `workbench.css`: shell and responsive owner

This file contains all structural and visual rules for the application shell. The former legacy structural declarations were merged into the matching current rules, and declarations already superseded by the workbench were removed. It owns:

- base sizing, focus, hidden-content, and visually-hidden utilities;
- header, command center, menus, theme control, and dialogs;
- activity bar, toolbox/sidebar, workspace chrome, inspector chrome, and resizers;
- Problems and Outline shell presentation;
- bottom-panel tabs/chrome and status bar;
- command palette and overlays;
- all screen-responsive application layout.

Behavior-related selectors remain unchanged, including visibility/maximization classes, `data-open`, `data-active`, drawer classes, resize state, and `[hidden]` handling.

### `domain.css`: language and runtime presentation

This file owns MiniJava-specific semantic views rather than general application chrome:

- Typing toolbar, gamma context, proof trees, expandable judgements, and print-only derivation layout;
- CESK control, stack/environment, store, continuation, heap references, provenance, GC, and execution transitions;
- Call-by-structure/value, Model A/B comparison, and rewrite/substitution views;
- runtime layouts at 1180 and 920 px.

Print rules load after the shell and are scoped by `printing-typing`; they no longer require `!important` to beat later responsive shell declarations.

### `codeEditor.css`: editor and text-view owner

The previous split between editor mechanics and later workbench editor overrides has been removed. One file now owns both mechanics and presentation. The textarea, highlighted preformatted layer, and line numbers share fixed padding, font, and line-height tokens. Changing one layer without the others will desynchronize caret/selection and syntax text.

This file also owns Output text presentation and the `is-console-changed` animation because Code and Output intentionally share the same monospace text system.

## Retired legacy stylesheet

`src/assets/css/styles.css` was removed. Its contents were handled by responsibility:

| Former content | Result |
|---|---|
| Duplicate root/theme tokens | Replaced by `tokens.css`. |
| Base shell and behavior-coupled structure | Merged into `workbench.css`. |
| Rules contradicted by the later workbench skin | Removed after their effective declarations were incorporated. |
| Editable-code and generated-code styles | Consolidated into `codeEditor.css`. |
| Typing, print, CESK, comparison, and rewrite styles | Moved to `domain.css`. |
| Legacy 1260/980/580 shell breakpoints | Removed; they were superseded by the tested current responsive system. |

No legacy stylesheet remains in the import chain, and `workbench.css` no longer redefines theme tokens at its beginning.

## Design-token structure

| Group | Canonical tokens |
|---|---|
| Surfaces | `--surface-app`, `--surface-raised`, `--surface-recessed`, `--surface-workspace`, `--surface-activity`, `--surface-sidebar`, `--surface-control`, `--surface-hover`, `--surface-code`, overlay/scrim tokens |
| Borders | `--border-default`, `--border-strong` |
| Text | `--text-primary`, `--text-secondary`, `--text-muted`, `--text-emphasis`, `--text-on-state` |
| Product/focus | `--accent-primary`, `--accent-hover`, `--selection`, `--focus-ring`, `--focus-outline`, `--focus-offset` |
| State | `--state-success`, `--state-warning`, `--state-error`, `--state-info`, `--state-execution`, `--state-execution-strong` |
| Syntax | `--syntax-keyword`, `--syntax-type`, `--syntax-number`, `--syntax-string`, `--syntax-identifier`, `--syntax-operator`, `--syntax-comment`, `--syntax-builtin`, `--syntax-method`, `--syntax-punctuation` |
| Grammar/toolbox | Seven family tokens: `--grammar-structure`, `--grammar-declaration`, `--grammar-type`, `--grammar-statement`, `--grammar-expression`, `--grammar-value`, and `--grammar-runtime`; these mirror the renderer-owned primary palette for toolbox accents |
| Typography | `--font-family-ui`, `--font-family-code`, five font sizes, four allowed font weights, and compact/default/relaxed/code line heights |
| Spacing | `--space-1` through `--space-10` for recurring shell spacing |
| Controls/icons | Compact/default/comfortable control heights, shared compact/default padding, and small/medium icon sizes |
| Shape/elevation | Radius, shadow, and motion tokens |
| Panels | Semantic header/activity/sidebar/inspector/bottom/status/toolbar/tab dimensions |
| Layers | Workspace, interaction, header, scrim, drawer, menu, bottom-panel, and modal layers |

### Compatibility aliases

The only aliases retained are `--font-code`, `--radius-panel`, `--ide-border`, `--ide-text`, `--ide-accent`, `--bg`, `--panel`, `--surface`, `--border`, `--text`, `--muted`, `--copper`, and `--aquamarine`. Repository-wide usage shows that specialized domain and print styles still consume them. New shell and editor work uses canonical tokens; remove an alias only while migrating each remaining consumer.

## Duplicate selectors and removed conflicts

A selector-string scan now finds no exact functional selector shared by two ownership files. The only cross-file scanner results are:

- `:root`, because `tokens.css` has the root scale while `workbench.css` changes only the activity width inside the 700 px media query;
- `from` and `to`, which are keyframe nodes rather than DOM selectors.

Within-file repeated selector strings remain where a state or media query intentionally revisits a base selector. Current approximate counts are 55 in `workbench.css`, 6 in `domain.css`, and 3 in `codeEditor.css` when comma-separated selectors and media contexts are counted without context. These are not legacy-versus-override duplicates.

The consolidation removed these conflict families:

- duplicate dark/light token blocks;
- legacy/current shell declarations for the same components;
- legacy 980/580 stacked layouts competing with the 1100 px drawer system;
- editor declarations split between three files;
- bottom-panel shell declarations split between legacy and workbench files;
- nonstandard font weights such as 520, 560, 620, 720, 780, 820, 860, 900, and 920.

## Specificity and state coupling

Specificity is now used for state, not stylesheet ownership:

| Selector family | Why it is coupled |
|---|---|
| `body.toolbox-hidden`, `body.code-hidden`, and their combination | Defines dock grid columns and visibility. |
| `body.code-maximized` and `body.bottom-maximized` | Replaces shell tracks and hides non-maximized regions. |
| `body.mobile-sidebar-open` / `body.mobile-code-open` | Controls fixed drawers and scrims at 1100 px and below. |
| `.is-active`, `[aria-selected="true"]`, `[data-active="true"]`, `[data-open="true"]` | Required tab/panel/open state contracts. |
| Resize classes and handles | Required hover/drag feedback for unchanged TypeScript resizing. |
| Runtime state/provenance selectors | Communicate execution, write, GC, stale/error/done, reference, and selection state. |
| `body.printing-typing` | Isolates print-only expansion and chrome removal. |

The global focus rule covers buttons, inputs, selects, and focusable separators. `.theme-switch:focus-within` retains its label-level focus treatment because the checkbox itself is visually hidden.

## `!important` declarations

There are 14 remaining declarations, all in `workbench.css`:

- nine declarations in the standard `.visually-hidden` utility;
- one global `[hidden] { display: none !important; }` rule so component display declarations cannot expose hidden controls;
- four reduced-motion declarations that must beat component animation and transition rules.

`tokens.css`, `domain.css`, and `codeEditor.css` contain no `!important` declarations.

## Hard-coded colors

- All screen-theme color literals are in `tokens.css`.
- `workbench.css` and `codeEditor.css` contain no hard-coded color literals.
- `domain.css` keeps seven explicit black/white/neutral literals inside `@media print`; paper/ink output is intentionally independent of the active screen theme.
- Runtime heap/reference hues continue to use `hsl(var(--loc-hue) ...)`. `--loc-hue` is generated per runtime location and is a semantic identity mechanism, not decoration.
- Blockly block colors use seven renderer-owned grammatical families. The complete mapping and contrast record is `BLOCK_COLOR_CLASSIFICATION.md`; connector shapes and connection checks remain unchanged.

## Spacing and geometry

Recurring shell padding, margin, and gap values use the shared spacing scale. Panel/header/status dimensions and common controls use semantic dimension tokens. Literal geometry remains where it expresses a real component contract, including:

- 4 px desktop resizer tracks and their larger pointer hit areas;
- 40 px editor line-number gutter;
- workspace grid and Blockly geometry;
- runtime tree/table/arrow layout;
- print dimensions;
- responsive drawer viewport remainders and panel clamps.

These values should not be globally replaced with a spacing token merely because the numbers match.

## Typography

- UI family: `--font-family-ui` (Inter, then platform sans-serif fallbacks).
- Code family: `--font-family-code` (JetBrains Mono, then platform monospace fallbacks).
- Base shell: 14 px with the default 1.45 line height.
- Editable code/output: 13 px on an exact 21 px line height shared by every overlay layer.
- Permitted weights: 400, 500, 600, and 700 through semantic weight tokens.
- Print typography remains locally sized for paper readability.

There are no numeric font-weight declarations outside the four token definitions.

## Icon and control system

`src/index.html` contains the small inline `icon-sprite` used by the shell and
dynamic UI. Each symbol has a `16 × 16` view box and is rendered through the
shared `.app-icon` rule with `currentColor` stroke semantics. This replaces
the former character-based `.icon-*::before` rules without adding a runtime
dependency. The existing `.icon`, `icon-menu`, and `icon-close` classes remain
on the compact-menu SVG because `app.ts` still synchronizes those state classes.

Controls use primary, secondary, and destructive treatments; familiar
icon-only controls remain quiet. The existing Run and stepper primary actions
use the primary treatment, while regular stepper actions use secondary.
All icon-only controls keep their `aria-label` and `title`; semantic stepper
actions use visible text labels.

## Responsive breakpoints

| Query | Owner | Behavior | Coupled code |
|---|---|---|---|
| `@media print` | `domain.css` | Typing-only landscape derivation output | `printing-typing`, `window.print()`, and `afterprint` in `typingPanel.ts` |
| 1480 px max | `workbench.css` | Header command labels compact | None |
| 1260 px max | `workbench.css` | Docked sidebar/inspector widths cap | None |
| 1180 px max | `domain.css` | CESK panels compact to two columns | None |
| 1100 px max | `workbench.css` | Sidebar/inspector become fixed drawers; side resizers hide | `matchMedia('(max-width: 1100px)')` in `app.ts` |
| 920 px max | `domain.css` | Runtime/compare panels stack | None |
| 900 px max | `workbench.css` | Header menu becomes the hamburger surface | `matchMedia('(min-width: 901px)')` in `app.ts` |
| 700 px max | `workbench.css` | Mobile status/bottom-panel/workspace compaction; both bottom tab rows retain labels and scroll horizontally | `matchMedia('(max-width: 700px)')` zoom handling in `app.ts` |
| 480 px max | `workbench.css` | Phone label/control reductions | None |
| reduced motion | `workbench.css` | Effectively disables motion | Accessibility invariant |

The retired 980 and 580 px legacy shell queries no longer exist.

## Candidate consolidation and follow-up work

1. Migrate the remaining domain-view consumers before removing their compatibility aliases.
2. Split `workbench.css` into shell submodules only if import order remains explicit and selector ownership stays non-overlapping; line count alone is not a reason to split it.
3. Add a browser print regression before simplifying `printing-typing` rules further.
4. Tokenize remaining component geometry selectively when a later visual change actually needs it.
5. Extend the local SVG sprite only when a new familiar action needs an icon;
   do not add a large icon dependency or reintroduce character-glyph icons.
6. Keep editor metrics together; any font, line-height, gutter, wrapping, or padding change needs editable-code overlay tests and visual comparison.

## Consolidation verification

- Production build parses and bundles all four stylesheets.
- UI smoke tests cover themes, perspectives, drawers, visibility, resizers, persistence, bottom-panel behavior, shortcuts, command palette, views, and duplicate IDs.
- Stored visual baselines cover 1920 × 1080, 1440 × 900, 1280 × 800, 1024 × 768, 768 × 1024, and 390 × 844 across the intended themes and perspectives.
- The cleanup is checked against the approved visual baselines; it does not add a visual direction or a stylesheet override layer.
