# Block-MiniJava DOM dependency map

## Classification

| Classification | Meaning for the refactor |
|---|---|
| **Must preserve exactly** | The literal identifier, state value, relationship, or storage key is a compatibility invariant. |
| **May move but must retain identity** | The element can move in the information architecture, but its ID/data contract, role, handler, and accessible relationship remain intact. |
| **May rename after updating references and tests** | Not part of the mandatory compatibility surface, but renaming requires an atomic TypeScript/CSS/test update. This is not authorization to rename during the current refactor. |
| **Presentation-only** | No TypeScript query or behavioral state depends on it today; visual regression coverage is still required before deletion. |

The mandatory constraints take precedence: existing TypeScript-used IDs, behaviorally significant `data-*` attributes, state classes, ARIA relationships, keyboard handlers, responsive drawers, and resizers must remain stable during this refactor.

## IDs queried by TypeScript

All literal IDs below are queried by `getElementById`/`byId`, observed, or supplied to a helper that queries the DOM. Moving the owning element is allowed where shown; removing the identity is not.

| Area | IDs | Classification | Dependency |
|---|---|---|---|
| Mandatory shell/layout anchors | `app`, `toolbox-column`, `blockly-area`, `blockly-div`, `code-column`, `viz-dock`, `perspective-select`, `run-program` | Must preserve exactly | The four explicitly named compatibility IDs plus Blockly injection, layout measurement, observer, perspective, and run anchors. The palette controller queries `app` to synchronize modal `inert` state. |
| Layout observer and geometry | `blockly-area`, `toolbox-column`, `code-column`, `viz-dock` | Must preserve exactly | One `ResizeObserver` watches these four and drives Blockly/editor/visualization resize coordination. |
| File/project identity | `new-workspace`, `load-workspace`, `save-workspace`, `export-code`, `load-autosave`, `load-file-input`, `loaded-file-label`, `save-name-modal`, `save-name-input`, `export-name-modal`, `export-name-input` | May move but must retain identity | Direct event bindings, file routing, dialogs, project-label observer, and download naming. |
| Header/global | `main-menu`, `menu-toggle`, `theme-toggle`, `about-button`, `about-modal` | May move but must retain identity | Compact menu state, theme state, and About dialog. |
| Examples | `examples-button`, `examples-panel`, `example-load-modal`, `example-load-name` | May move but must retain identity | Menu construction/dismissal, outside-pointer boundary, and replace/merge dialog. Pointer-down inside the dynamic panel must not close it before item click. |
| Command palette | `app`, `command-palette-trigger`, `command-palette-overlay`, `command-palette-input`, `command-palette-list` | Must preserve exactly | Modal focus containment, background `inert` state, combobox/filter/results, overlay dismissal, global shortcut, and focus restoration. |
| Sidebar/activity content | `toolbox-content`, `toolbox-search`, `sidebar-title`, `sidebar-title-icon`, `toggle-toolbox`, `show-toolbox-button`, `sidebar-scrim` | Must preserve exactly | Blocks-only toolbox, persisted desktop visibility, and a transient responsive drawer close with focus return. |
| View preferences | `autosave-interval`, `autosave-interval-label` | Must preserve exactly | Moved from the removed Settings sidebar into View; retains timer restart and persistence behavior. |
| Resizers | `sidebar-resizer`, `code-resizer`, `viz-resizer` | Must preserve exactly | Pointer and keyboard resize roots; side handles become untabbable in drawers and the bottom handle becomes untabbable while maximized. |
| Workspace toolbar | `workspace-undo`, `workspace-redo`, `workspace-zoom-out`, `workspace-zoom-in`, `workspace-fit`, `workspace-toggle-bottom-panel`, `run-program`, `show-inspector-button` | Must preserve exactly | Quiet Blockly controls plus contextual bottom visibility, the single visible Run action, and inspector restoration only while the inspector is not visible. |
| Inspector controls | `copy-code`, `print-typing`, `toggle-code-maximize`, `toggle-code-column`, `code-scrim` | May move but must retain identity | Direct handlers, tab-dependent visibility, maximization, and a scrim that sits beneath the active inspector drawer. |
| Inspector content | `panel-code`, `generated-code`, `panel-typing`, `panel-outline`, `typing-method-select`, `typing-gamma`, `typing-tree`, `typing-print-title`, `typing-print-meta`, `program-outline` | Must preserve exactly | Editor installation, code generation fallback, typing render/print, and dynamic outline render. |
| Status | `status-block-count`, `status-problems-button`, `status-problems-count`, `autosave-status` | Must preserve exactly | Live workspace metrics and diagnostics status. |
| Bottom shell/actions | `workspace-toggle-bottom-panel`, `top-toggle-bottom-panel`, `bottom-tab-semantics`, `bottom-panel-semantics`, `viz-dock-info`, `viz-rerun`, `viz-arrange`, `viz-maximize`, `viz-collapse`, `viz-empty` | May move but must retain identity | Both toggle routes share bottom visibility state; bottom navigation, semantic parent state, and active-tool description remain unchanged. |
| Problems/output | `bottom-problems-count`, `bottom-problems-list`, `bottom-program-output` | Must preserve exactly | Diagnostics counters/list and program/stepper console mirroring. These are queried through both literal and array-driven helper calls. |
| Machine controls/content | `stepper-load`, `stepper-back`, `stepper-step`, `stepper-play`, `stepper-gc`, `stepper-gc-auto-enabled`, `stepper-gc-threshold`, `stepper-status`, `stepper-arrows`, `stepper-control`, `stepper-frames`, `stepper-heap`, `stepper-kont`, `stepper-output` | Must preserve exactly | Direct semantic-control bindings and dynamic visualization roots. |
| Compare controls/content | `compare-load`, `compare-back`, `compare-step`, `compare-play`, `compare-status`, `compare-status-a`, `compare-status-b`, `compare-frames-a`, `compare-frames-b`, `compare-heap-a`, `compare-output-a`, `compare-output-b` | Must preserve exactly | Direct bindings plus IDs passed through render helpers. There is intentionally no `compare-heap-b` because Model B is storeless. |
| Rewrite controls/content | `subst-load`, `subst-back`, `subst-step`, `subst-play`, `subst-status`, `subst-correspondence`, `subst-workspace` | Must preserve exactly | Direct semantic-control bindings and Blockly injection host. |
| Dynamically assigned bottom leaf IDs | `bottom-tab-{problems,output,structure,value,machine,compare,subst}` and `bottom-panel-{problems,output,structure,value,machine,compare,subst}` | Must preserve exactly | `initVisualizationPanel` assigns these IDs and wires their reciprocal ARIA relationships. The static Semantics parent does not replace any leaf identity. |
| Editor-generated IDs | `generated-code-editor`, `code-editor-keyboard-help`, `code-editor-status` | May rename after updating references and tests | Created by `codeEditor.ts`; the help ID is the editor's `aria-describedby` target and documents its keyboard exit. Preserve during the current refactor. |

Static IDs such as `activity-blocks`, `activity-search`, `tab-code`, `tab-typing`, and `tab-outline` are not looked up by their ID in TypeScript, but they are ARIA targets, stable automation hooks, or explicitly part of the current DOM contract. Classify them as **May move but must retain identity**, not presentation-only.

## Classes queried or mutated by TypeScript

### Behavioral state classes

| Class | Owner/meaning | Classification |
|---|---|---|
| `is-active` | Activity button/view and inspector tab/panel selection; typing panel visibility check | Must preserve exactly |
| `code-hidden` | Desktop inspector visibility and grid columns | Must preserve exactly |
| `toolbox-hidden` | Desktop sidebar visibility and grid columns | Must preserve exactly |
| `bottom-maximized` | Bottom-panel maximization | Must preserve exactly |
| `code-maximized` | Inspector maximization | Must preserve exactly |
| `mobile-sidebar-open`, `mobile-code-open` | Responsive drawer visibility | Must preserve exactly |
| `presentation-mode` | Perspective-driven stripped layout | Must preserve exactly |
| `is-resizing-sidebar`, `is-resizing-code` | Pointer-resize feedback/cursor state | Must preserve exactly |
| `workspace-drop-target`, `is-dragging` | Toolbox drag/drop feedback and cleanup | Must preserve exactly |
| `command-palette-open`, `is-selected` | Palette modal/page state and selected result | Must preserve exactly |
| `menu-open`, `examples-open` | Compact main menu and examples menu visibility | Must preserve exactly |
| `collapsed` | Toolbox category state | Must preserve exactly |
| `is-open` | Typing derivation row expansion | Must preserve exactly |
| `printing-typing` | Print-only DOM/layout mode on both `html` and `body` | Must preserve exactly |
| `has-errors` | Problems-count error styling | Must preserve exactly |
| `is-changed`, `is-write-target`, `is-gc-marked`, `is-gc-swept`, `is-console-changed` | Runtime transition, GC, and output feedback | Must preserve exactly |
| `stepper-provenance` | Identifies dynamic runtime rows linked back to source blocks | Must preserve exactly |
| `icon-close`, `icon-menu` | Compact-menu glyph mutation | May rename after updating references and tests |
| `code-editor-highlight` | Generated highlight layer in editable code view | May rename after updating references and tests |

### Structural classes used as query selectors

| Selector/class | Use | Classification |
|---|---|---|
| `.activity-item[data-activity]` | Bind/select activity controls | Must preserve exactly |
| `.sidebar-view[data-activity-view]` | Blocks/search toolbox host | Must preserve exactly |
| `.inspector-tab`, `.inspector-panel` | Bind tabs, manage roving focus, activate panel | Must preserve exactly |
| `.ide-layout` | Measure available layout during inspector resize | Must preserve exactly |
| `#status-file-name` | Mirror loaded filename into the status bar | Must preserve ID, accessible name, and project-label observer updates |
| `.toolbar-glyph` | Change maximize/restore glyph | May rename after updating references and tests |
| `.icon`, `.menu-label` | Change compact-menu icon/label when present | May rename after updating references and tests |
| `.code-view` | Code editor installation host | Must preserve exactly |
| `.workspace-footer` | Temporarily detach/restore status bar for printing | Must preserve exactly |
| `.command-palette-option` | Palette roving selection | Must preserve exactly |
| `.examples-item-label` | Fill dynamic example label | May rename after updating references and tests |
| `.viz-tab[data-kind]`, `.viz-host[data-kind]` | Resolve active bottom leaf tab/panel across the primary and nested tablists | Must preserve exactly |
| `.stepper-panel-body`, `.stepper-panels` | Scroll preservation and resize observation | Must preserve exactly |
| `.stepper-heap-box`, `.stepper-frame.is-top` | Reference lookup and current-frame animation | Must preserve exactly |
| `.typ-row:not(.is-open) .typ-row-tree`, `.typ-rule`, `.typ-row-rule`, `.typ-judgement`, `.typ-row-judgement`, `.typ-row-tree > .typ-node` | Measure and prepare printable derivation | Must preserve exactly |

Classes not read or mutated by TypeScript and used only to apply appearance—such as most `*-icon`, card, spacing, header-copy, and decorative wrapper classes—are **Presentation-only**. They may still participate in high-specificity CSS selectors; consult `STYLESHEET_MAP.md` before removing them.

## Behaviorally significant `data-*` attributes

| HTML attribute | Values/owner | Classification | Dependency |
|---|---|---|---|
| `data-activity` | `blocks`, `search` on activity buttons | Must preserve exactly | Selection, drawer visibility, and search-focus routing. |
| `data-activity-view` | `blocks search` on the toolbox host | Must preserve exactly | Documents the sole Blocks/Search sidebar view. |
| `data-perspective` | `edit`, `debug`, `types`, `presentation` | Must preserve exactly | Perspective click routing and selected styling. |
| `data-panel` | `code`, `typing`, `outline` | Must preserve exactly | Inspector tab-to-panel mapping. |
| `data-kind` | Bottom kinds on `.viz-tab`/`.viz-host`; runtime control kind on generated nodes | Must preserve exactly | Bottom resolution and semantic rendering. |
| `data-open` | `true`/`false` on `#viz-dock` | Must preserve exactly | Source of truth for bottom visibility and CSS. |
| `data-active` | `true`/`false` on bottom hosts | Must preserve exactly | Active host styling/state. |
| `data-theme` | `dark`/`light` on `body` | Must preserve exactly | Theme CSS and semantic workspace reinjection. |
| `data-activity`, `data-perspective` on `body` | Current UI identities | Must preserve exactly | CSS/state/debug identity and persistence synchronization. |
| `data-state` | `ok`, `error`, `stale`, `gc`, `done` as applicable | Must preserve exactly | Code editor and semantic status styling. |
| `data-block-id` | Blockly block ID on dynamic outline items | Must preserve exactly | Locate action. |
| `data-block-type` | Grammar block type on dynamic toolbox buttons | Must preserve exactly | Click insertion and drag payload. |
| `data-category` | Category ID on dynamic toolbox group | May rename after updating references and tests | Currently written for identity/styling; category logic closes over the model. |
| `data-command-id` | Palette command ID on dynamic result | Must preserve exactly | Stable command identity/automation even though click closes over command. |
| `data-ref-loc`, `data-heap-loc` | Runtime heap locations | Must preserve exactly | Reference arrows, reveal, GC, and heap lookup. |
| `data-ide-region` | Shell landmark names | May move but must retain identity | CSS/automation/documented application-region contract; not queried by current TS. |

The toolbox drag MIME value `application/x-block-minijava-block` is not a DOM attribute, but it is a behaviorally significant data-transfer key and is **Must preserve exactly**.

## ARIA relationships and keyboard structures

| Relationship | Current mapping | Classification |
|---|---|---|
| Header menu controller | `menu-toggle[aria-controls="main-menu"]`; `aria-expanded` mirrors `.menu-open` | Must preserve exactly |
| Examples controller | `examples-button[aria-controls="examples-panel"]`; `aria-expanded` mirrors `.examples-open` | Must preserve exactly |
| Palette controller/dialog | Trigger controls `command-palette-overlay`; dialog is labelled by `command-palette-title`; the input is a combobox controlling `command-palette-list`, with `aria-activedescendant` pointing to the selected option; opening makes `app` inert and closing restores prior focus | Must preserve exactly |
| Inspector tabs | `tab-code` → `panel-code`, `tab-typing` → `panel-typing`, `tab-outline` → `panel-outline`; panels point back with `aria-labelledby` | Must preserve exactly |
| Bottom primary tabs | `bottom-tab-problems` → `bottom-panel-problems`, `bottom-tab-output` → `bottom-panel-output`, and `bottom-tab-semantics` → `bottom-panel-semantics` | Must preserve exactly |
| Bottom semantic tabs | Runtime-generated `bottom-tab-{structure,value,machine,compare,subst}[aria-controls="bottom-panel-{kind}"]`; each nested panel points back via `aria-labelledby` | Must preserve exactly |
| Toolbox categories | Dynamic header `aria-controls` generated list ID and updates `aria-expanded` | Must preserve exactly |
| Typing rows | Dynamic toggle updates `aria-expanded` | Must preserve exactly |
| Activity/sidebar | Activity buttons update `aria-pressed`; sidebar views update `aria-hidden` | Must preserve exactly |
| View/panel toggles | View is a settings dialog containing ordinary buttons, selects, and inputs—not menu items; sidebar, inspector, bottom, and maximize buttons update `aria-pressed`; hide/show labels update with state | Must preserve exactly |
| Resizers | Three separators retain role, orientation, label, and `tabindex="0"` | Must preserve exactly |
| Dialog labels | `about-modal`, save/export/example dialogs point to their title IDs | Must preserve exactly |
| Live regions | Loaded file, autosave, bottom info/problems/output, stepper/compare/rewrite status/correspondence retain `aria-live` behavior | May move but must retain identity |

Roving keyboard focus is implemented independently for inspector tabs, the three primary bottom tabs, and the five nested Semantics tabs with Left/Right/Home/End. Palette results use Up/Down/Enter/Escape while DOM focus stays on the combobox; Tab is contained until the modal closes. In the editable code view, plain Tab inserts two spaces, while Shift+Tab or Escape followed by Tab exits. The two bottom tablists must not be flattened into one focus sequence.

## Event roots and delegated/dynamic behavior

| Root | Events | Classification | Notes |
|---|---|---|---|
| `document` | Global application shortcuts; command-palette shortcuts/Escape; examples outside-click/Escape; fullscreen change is on `document` | Must preserve exactly | Do not install competing handlers without ordering tests. |
| `window` | Resize, custom `bmj:problem-located`, resizer pointermove/pointerup, `afterprint`/timers | Must preserve exactly | `bmj:problem-located` closes the compact sidebar after navigation. |
| Main Blockly workspace | Blockly change events and built-in input/context behavior | Must preserve exactly | Drives required-block enforcement, code generation, autosave, typing, outline, diagnostics, and semantic stale state. |
| `blockly-area` | `dragenter`, `dragover`, `dragleave`, `drop` | Must preserve exactly | Custom toolbox insertion coordinate path. |
| `command-palette-overlay` | Background `pointerdown` closes; `keydown` contains Tab focus | May move but must retain identity | Must distinguish backdrop from dialog children and keep focus inside while open. |
| `examples-button` plus `document` | Menu open, selection, outside dismissal | May move but must retain identity | Dynamic example items have individual click handlers. |
| Dynamic render roots | `toolbox-content`, `program-outline`, problems lists, typing tree, runtime hosts | Must preserve exactly | Items are recreated and bind handlers during render; replacing with static delegation would be a behavior change. |

## Resize handles and responsive drawers

| Dependency | Current behavior | Classification |
|---|---|---|
| `#sidebar-resizer` | Pointer drag sets `--ide-primary-sidebar-width`; keyboard arrows change 24 px; persists sidebar width; toggles `is-resizing-sidebar`; is `aria-hidden`/untabbable in drawer or maximized layouts | Must preserve exactly |
| `#code-resizer` | Pointer drag/keys set `--ide-code-panel-width` using `.ide-layout`/column geometry; persists width; toggles `is-resizing-code`; is `aria-hidden`/untabbable in drawer or maximized layouts | Must preserve exactly |
| `#viz-resizer` | Pointer drag/keys set `--ide-bottom-panel-height`, clamped to 160 px–70vh; persists height; is untabbable while the bottom panel is closed or maximized | Must preserve exactly |
| Compact threshold | JS `matchMedia('(max-width: 1100px)')` matches workbench drawer breakpoint | Must preserve exactly |
| Sidebar drawer | `toolbox-hidden` plus `mobile-sidebar-open`; Escape/scrim/activity close only the transient open class and return focus to the activity/reveal trigger; problem-location and perspective handling close it without persisting a visibility change | Must preserve exactly |
| Inspector drawer | `code-hidden` plus `mobile-code-open`; Escape/scrim close only the transient open class and return focus to View or the hamburger trigger; the inspector must remain above its scrim | Must preserve exactly |
| Narrow menu | CSS at 900 px; JS closes `.menu-open` at `min-width: 901px` | Must preserve exactly |
| Phone bottom panel | CSS changes bottom tools at 700 px; Blockly initial fit also checks `max-width: 700px` | Must preserve exactly |

The responsive drawer and resize implementations are explicitly frozen until regression tests cover them.

## Perspective-dependent elements

| Perspective | Activity/sidebar | Inspector | Bottom | Classification |
|---|---|---|---|---|
| `edit` | Blocks, visible | Visible, Code, not maximized | Closed | Must preserve exactly |
| `debug` | Blocks, visible | Visible, Outline, not maximized | Open on Semantics → CESK (`machine`) | Must preserve exactly |
| `types` | Blocks, visible | Visible, Outline, not maximized | Open on Problems; diagnostics refreshed | Must preserve exactly |
| `presentation` | Sidebar hidden | Hidden, maximization cleared | Closed | Must preserve exactly |
| `custom` | Records manual visibility/layout divergence | Existing current arrangement | Existing current arrangement | Must preserve exactly |

Perspective identity is reflected by `body[data-perspective]`, `body.presentation-mode`, `#perspective-select`, and local storage. Manual inspector/sidebar/bottom visibility changes mark `custom`; raw resizing currently does not.

## Persisted UI-state keys

| Key | Value | Owner | Classification |
|---|---|---|---|
| `block-minijava.autosave.v2` | Versioned serialized workspace plus timestamp | `app.ts` | Must preserve exactly |
| `block-minijava.theme` | `dark` or `light` | `app.ts` | Must preserve exactly |
| `block-minijava.autosave.interval` | Minutes, clamped 2–20 | `app.ts` | Must preserve exactly |
| `block-minijava.code.width` | Inspector width in px | `app.ts` | Must preserve exactly |
| `block-minijava.layout.code.visible` | Boolean string | `app.ts` | Must preserve exactly |
| `block-minijava.layout.sidebar.width` | Sidebar width in px | `app.ts` | Must preserve exactly |
| `block-minijava.layout.sidebar.visible` | Boolean string | `app.ts` | Must preserve exactly |
| `block-minijava.layout.activity` | `blocks` or `search` | `app.ts` | Must preserve exactly; legacy `run`/`settings` values restore as `blocks`. |
| `block-minijava.layout.perspective` | Named perspective or `custom` | `app.ts` | Must preserve exactly |
| `block-minijava.layout.bottom.open` | Boolean string | `visualizationPanel.ts` | Must preserve exactly |
| `block-minijava.layout.bottom.height` | Bottom height in px | `visualizationPanel.ts` | Must preserve exactly |
| `block-minijava.layout.bottom.tab` | Active leaf kind: `problems`, `output`, `structure`, `value`, `machine`, `compare`, or `subst` | `visualizationPanel.ts` | Must preserve exactly; never store the conceptual `semantics` parent. The selected Semantics leaf is restored from this value. |
| `block-minijava.gc.autoEnabled` | Boolean string | `stepperPanel.ts` | Must preserve exactly |
| `block-minijava.gc.threshold` | Positive allocation count | `stepperPanel.ts` | Must preserve exactly |

## CSS selectors coupled to application state

Removal or weakening of these selector families changes behavior, not merely appearance:

| Selector family | Functional effect | Classification |
|---|---|---|
| `body.code-hidden ...`, `body.toolbox-hidden ...`, and their combined `.ide-layout` rules | Removes panel columns/resizers and exposes recovery buttons | Must preserve exactly |
| `body.code-maximized ...`, `body.bottom-maximized ...`, `body.presentation-mode ...` | Replaces major grid regions and hides competing surfaces | Must preserve exactly |
| `body.mobile-sidebar-open ...`, `body.mobile-code-open ...`, `.panel-scrim` rules under 1100 px | Responsive drawers and scrims | Must preserve exactly |
| `#viz-dock[data-open="true"]`, `#bottom-panel-semantics`, `.viz-host[data-active="true"]`, `.viz-tab[aria-selected="true"]` | Opens the dock, selects one conceptual region, and displays exactly one leaf tool | Must preserve exactly |
| `.sidebar-view.is-active`, `.inspector-panel.is-active`, `.inspector-tab.is-active`, `.activity-item.is-active` | Shows the blocks/search activity and inspector selection | Must preserve exactly |
| `.command-palette-overlay[hidden]`, `body.command-palette-open`, `.command-palette-option.is-selected` | Palette visibility, page scroll/state, selected result | Must preserve exactly |
| `.examples-panel.examples-open`, `.main-menu.menu-open` | Menu visibility at their responsive contexts | Must preserve exactly |
| `.toolbox-category.collapsed ...`, `.typ-row.is-open ...` | Dynamic disclosure content | Must preserve exactly |
| `.code-editor-status[data-state]`, `.stepper-status[data-state]`, `.compare-model-status[data-state]` | Success/error/stale/GC/done feedback | Must preserve exactly |
| `.problem-item.is-error`, `.problem-item.is-warning`, `.problems-count.has-errors` | Diagnostic severity | Must preserve exactly |
| Runtime `is-*` classes and `[data-ref-loc]`/`[data-heap-loc]` selectors | Transition, reference, write, and garbage-collection visualization | Must preserve exactly |
| `html.printing-typing`, `body.printing-typing`, `@media print` derivation selectors | Makes the typing derivation printable and restores it afterward | Must preserve exactly |

## Selectors whose removal would break functionality

The highest-confidence breakages are:

1. `#blockly-div`, `.blockly-area`, and the sizing rules for their ancestors: Blockly injection or `svgResize` would render into a missing/zero-sized host.
2. Body state selectors for `code-hidden`, `toolbox-hidden`, `code-maximized`, `bottom-maximized`, `mobile-sidebar-open`, `mobile-code-open`, and `presentation-mode`.
3. `#viz-dock[data-open="true"]`, `.viz-host[data-kind]`, `.viz-tab[data-kind]`, and active/hidden tab-panel rules.
4. `.inspector-tab`/`.inspector-panel` with `is-active`, and `.sidebar-view[data-activity-view]` with `is-active`.
5. All three resizer IDs/classes and their responsive suppression rules.
6. `.code-view` and code-editor overlay selectors (`.code-editor-highlight`, `.code-editor-input`, line numbers/status).
7. Runtime location/state selectors: `[data-ref-loc]`, `[data-heap-loc]`, `.stepper-heap-box`, and the transition/GC classes.
8. Print-state selectors on `printing-typing` and the typing tree.

Presentation-only wrapper selectors can be consolidated later, but only after verifying that they are not an ancestor in one of the stateful compound selectors above.

## Cleanup boundary

The cleanup removed no static ID, behaviorally significant `data-*` attribute,
ARIA relationship, test hook, command-palette command, or dynamic render root.
Repository-wide source searches established that the removed activity badge,
bottom activity-group wrapper, quiet-button selector, disabled panel-card
accent pseudo-element, and seven unused SVG symbols had no non-stylesheet or
dynamic consumer. Empty runtime, toolbox, diagnostics, and code hosts remain:
they are populated by the render roots listed above and are not decorative
containers.

The inline SVG sprite contains only symbols referenced by static markup or by
the explicit `iconMarkup`/`setIconUse` call sites. The math turnstile in the
typing toolbar is retained as MiniJava derivation notation, not as an
application-control glyph.
