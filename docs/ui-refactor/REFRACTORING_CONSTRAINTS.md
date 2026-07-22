# Block-MiniJava UI Refactoring Constraints

Status: normative guardrail for the UI refactor. This document describes behavior and contracts that the refactor must preserve. It is not authorization to change language semantics, Blockly behavior, responsive mechanics, or persistence formats.

## 1. Refactoring goals

The refactor must replace the generic, AI-generated-IDE appearance with a quiet, domain-specific programming workbench for the block-based MiniJava language.

The primary goals are:

1. Preserve all existing Block-MiniJava functionality.
2. Remove excessive visual decoration, duplicated controls, arbitrary icons, unnecessary colors, and imitation of VS Code.
3. Give each command one clear primary location.
4. Express Block-MiniJava's identity through grammar-aware blocks, semantic tools, typing views, editable code view, runtime visualization, and program structure.
5. Keep dark and light themes.
6. Keep perspectives, keyboard shortcuts, responsive drawers, resizers, panel maximization, autosave, and persisted layout.
7. Maintain accessibility and keyboard navigation.

This is an information-architecture and presentation refactor, not a functionality rewrite.

### Target information architecture

- Header: project and file identity, File menu, Examples, Run, View, and an overflow menu.
- Left panel: block search and categorized toolbox.
- Workspace toolbar: Undo, Redo, Zoom, Fit workspace, and the primary Run action.
- Right inspector: Code, Types, and Outline.
- Bottom panel: Problems, Output, and Semantics; existing semantic/runtime tools are leaf views inside Semantics.
- Status bar: block count, problem count, and autosave state.
- View menu: theme, autosave interval, perspectives, and layout controls.
- Command palette: every application command, including less frequently used actions.

The final interface must have one primary product accent. Color is reserved for grammatical category, selection, execution, warning, and error state. Blocks should converge on six or seven coherent semantic color families rather than unrelated colors per block type. Use one SVG icon system; unfamiliar semantic actions need text labels, while icon-only controls are appropriate only for familiar actions such as undo, redo, zoom, close, and search. Normal font weights are 400, 500, 600, and 700. Spacing, borders, and the workspace grid must be restrained.

## 2. Compatibility invariants

The following are non-negotiable.

### Language and Blockly invariants

- Do not change MiniJava parsing, generation, type checking, evaluation, substitution, CESK execution, garbage collection, examples, or serialization semantics as part of the UI refactor.
- Preserve all Blockly block type names, field names, input names, mutation/extra-state data, toolbox membership, required-block behavior, and connection `check` strings.
- Preserve the locked singleton `mj_goal` and `mj_main_class` behavior and their automatic restoration/connection.
- Preserve the bidirectional text-to-blocks behavior, including the 650 ms parse debounce, parse errors, retention of comments/formatting when text is structurally equivalent, and preservation of block IDs/undo history for non-structural text edits.
- Preserve Blockly's built-in keyboard navigation, context menu, comments, collapse/disable controls, trashcan, zoom, pan, scrollbars, wheel behavior, pinch behavior, and workspace serialization.
- Preserve the custom `bmj-thrasos` renderer and its Thrasos field/icon alignment override.
- Preserve the renderer's ten horizontal grammatical connector families: `Goal`, `MainClass`, `ClassDeclaration`, `VarDeclaration`, `MethodDeclaration`, `FormalParameter`, `Type`, `Statement`, `Expression`, and `Identifier`.
- Preserve the six implemented vertical connector families: `ClassDeclaration`, `VarDeclaration`, `MethodDeclaration`, `Statement`, `FormalParameter`, and `ExpressionArg`. Their distinct shapes and grammatical meanings must not be normalized to one generic notch.
- Connection compatibility continues to be enforced by Blockly check metadata; connector geometry is a visual grammar cue, not a substitute for those checks.
- Preserve the renderer-owned seven-family color classification documented in `BLOCK_COLOR_CLASSIFICATION.md`: Structure, Declarations, Types, Statements, Expressions, Values and literals, and Runtime or semantic-only. Every registered MiniJava block must resolve through the explicit mapping in `theme.ts`; no block may receive an arbitrary Blockly fallback.
- Color communicates only the broad family. Labels, tooltips, connection checks, and BMJ-Thrasos connector geometry remain the non-color grammatical indicators.
- Preserve Blockly's selected, disabled, highlighted/executing, warning, error, shadow, and insertion-marker treatments as state layers over the family fill.
- Preserve the main-workspace grid/zoom/move configuration until a dedicated behavior and usability change is approved. The grid may be visually subdued or removed only if snapping and navigation behavior are explicitly retained or intentionally revised under tests.

### Application behavior invariants

- Preserve existing IDs used by TypeScript. This includes, but is not limited to, `run-program`, `viz-dock`, `toolbox-column`, and `perspective-select`.
- Preserve all behaviorally significant `data-*` attributes and their accepted values.
- Preserve state classes, including `is-active`, `code-hidden`, `toolbox-hidden`, and `bottom-maximized`.
- Preserve event-handler targets and custom events. Moving a command is allowed only when its new control remains connected to the same behavior.
- Preserve all keyboard shortcuts and browser-safe `Ctrl`/`Cmd` handling.
- Preserve ARIA roles, labels, state updates, tab relationships, dialog relationships, live regions, and keyboard focus restoration.
- Do not remove a command unless it remains accessible through an explicit menu or the command palette.
- Every application-level command must be represented in the command palette by the completed refactor. Panel-local step controls may remain local, but must remain keyboard reachable and clearly labeled.
- Preserve toolbox click-to-add and drag-to-workspace behavior, including the custom `application/x-block-minijava-block` MIME type and drop-target feedback.
- Preserve clickable Problems, Typing judgements, Outline entries, and runtime provenance links that center/select the associated block.
- Preserve Output ownership: the most recent Run or semantic stepper owns the shared Output view.
- Preserve the bottom view hierarchy: `problems` and `output` are primary leaf views; `structure`, `value`, `machine`, `compare`, and `subst` are leaf views inside the conceptual Semantics region. The conceptual parent must never replace a leaf kind in state or persistence.
- Preserve exact Back/history behavior for the steppers, Play/Pause behavior, stale-state handling after workspace edits, Model A/B lockstep, rewrite correspondence, and CESK reference/heap visualization.
- Preserve screenshot download through the Blockly workspace context menu.

### Scope invariants

- Do not introduce React, Vue, Angular, another UI framework, or a parallel component/runtime abstraction.
- Do not change the responsive drawer or resize implementation until it is covered by regression tests.
- Do not perform unrelated code cleanup while implementing the visual refactor.
- Production HTML, UI TypeScript, shell CSS, block colors, and renderer code may change only within the explicitly active refactor phase. Renderer geometry, language semantics, and unrelated panels remain out of scope unless separately approved and tested.

## 3. Stable elements and selectors

The tables below record the current behavioral contract. A later refactor may add selectors, wrappers, or presentation classes. It must not rename or remove these contracts without updating every consumer and adding equivalent regression coverage first.

### Static IDs bound to behavior

| Area | IDs that must remain stable |
| --- | --- |
| Shell/header/file | `app`, `command-palette-trigger`, `perspective-select`, `main-menu`, `menu-toggle`, `new-workspace`, `load-workspace`, `load-file-input`, `save-workspace`, `export-code`, `load-autosave`, `examples-button`, `examples-panel`, `about-button`, `theme-toggle`, `loaded-file-label` |
| Activity/sidebar | `activity-bar`, `activity-blocks`, `activity-search`, `toolbox-column`, `sidebar-title`, `sidebar-title-icon`, `toolbox-search`, `toolbox-content`, `toggle-toolbox`, `show-toolbox-button`, `sidebar-resizer`, `sidebar-scrim` |
| View preferences | `autosave-interval`, `autosave-interval-label` |
| Workspace | `blockly-area`, `blockly-div`, `workspace-undo`, `workspace-redo`, `workspace-zoom-out`, `workspace-zoom-in`, `workspace-fit`, `run-program` |
| Inspector | `code-column`, `code-resizer`, `code-scrim`, `toggle-code-column`, `toggle-code-maximize`, `copy-code`, `print-typing`, `tab-code`, `tab-typing`, `tab-outline`, `panel-code`, `panel-typing`, `panel-outline`, `generated-code`, `typing-method-select`, `typing-gamma`, `typing-tree`, `typing-print-header`, `typing-print-title`, `typing-print-meta`, `program-outline` |
| Bottom panel shell | `viz-dock`, `viz-resizer`, `top-toggle-bottom-panel`, `bottom-tab-semantics`, `bottom-panel-semantics`, `viz-dock-info`, `viz-rerun`, `viz-arrange`, `viz-maximize`, `viz-collapse`, `viz-empty`, `bottom-problems-count`, `bottom-problems-list`, `bottom-program-output` |
| CESK controls/content | `stepper-load`, `stepper-back`, `stepper-step`, `stepper-play`, `stepper-gc`, `stepper-gc-auto-enabled`, `stepper-gc-threshold`, `stepper-status`, `stepper-arrows`, `stepper-control`, `stepper-frames`, `stepper-heap`, `stepper-kont`, `stepper-output` |
| Model comparison | `compare-load`, `compare-back`, `compare-step`, `compare-play`, `compare-status`, `compare-status-a`, `compare-status-b`, `compare-frames-a`, `compare-frames-b`, `compare-heap-a`, `compare-output-a`, `compare-output-b` |
| Rewrite semantics | `subst-load`, `subst-back`, `subst-step`, `subst-play`, `subst-status`, `subst-correspondence`, `subst-workspace` |
| Status | `status-block-count`, `status-problems-button`, `status-problems-count`, `autosave-status` |
| Command palette | `command-palette-overlay`, `command-palette-title`, `command-palette-input`, `command-palette-list` |
| Dialogs | `about-modal`, `about-title`, `save-name-modal`, `save-name-title`, `save-name-input`, `export-name-modal`, `export-name-title`, `export-name-input`, `example-load-modal`, `example-load-title`, `example-load-name` |

The code editor also creates `generated-code-editor` and `code-editor-status` at runtime. The bottom-panel initializer creates `bottom-tab-{kind}` and `bottom-panel-{kind}` for each bottom kind. The toolbox creates `toolbox-category-{category}` IDs. These dynamic naming schemes are stable contracts.

### Behaviorally significant `data-*` attributes

| Selector/attribute | Accepted values and use |
| --- | --- |
| `body[data-theme]` | `dark`, `light`; drives shell, code, Blockly, and visualization themes. |
| `body[data-activity]` | `blocks`, `search`; identifies the active sidebar activity. |
| `body[data-perspective]` | `edit`, `debug`, `types`, `presentation`, `custom`; records perspective identity. |
| `[data-ide-region]` | `shell`, `application-header`, `command-toolbar`, `workbench`, `activity-bar`, `editor-area`, `primary-sidebar`, `workspace`, `inspector`, `bottom-tools`, `status-bar`; semantic layout hooks. |
| `.activity-item[data-activity]` | `blocks`, `search`; event delegation and active-state synchronization. |
| `.sidebar-view[data-activity-view]` | `blocks search` on the sole toolbox view. |
| `.inspector-tab[data-panel]` | `code`, `typing`, `outline`; maps tabs to `panel-{value}`. |
| `.viz-tab[data-kind]`, `.viz-host[data-kind]` | Leaf values `problems`, `output`, `structure`, `value`, `machine`, `compare`, `subst`; bottom leaf tab/host lookup. The static Semantics parent has its own IDs and intentionally has no leaf `data-kind`. |
| `#viz-dock[data-open]` | String `true`/`false`; authoritative bottom-panel open state. |
| `.viz-host[data-active]` | String `true`/`false`; active bottom host. |
| `.toolbox-category[data-category]` | Category ID from `MINI_JAVA_CATEGORIES`. |
| `.toolbox-block-button[data-block-type]` | Blockly block type used by click and drag insertion. |
| `.outline-item[data-block-id]` | Associated Blockly block ID. |
| `.command-palette-option[data-command-id]` | Stable application command ID. |
| Runtime provenance attributes | `data-ref-loc`, `data-heap-loc`, `data-kind`, and `data-state`; used for heap reference arrows, runtime status, and visual state. |
| Editor status | `#code-editor-status[data-state]` with `ok` or `error` (absent for idle). |

Do not replace these attributes with visual-only equivalents or strip them during markup simplification.

### State classes

The following classes are set/read by TypeScript or are direct CSS state inputs:

- Selection/visibility: `is-active`, `is-selected`, `is-open`, `examples-open`, `menu-open`, `command-palette-open`, `collapsed`.
- Main layout: `toolbox-hidden`, `code-hidden`, `code-maximized`, `bottom-maximized`, `presentation-mode`, `mobile-sidebar-open`, `mobile-code-open`.
- Interaction: `is-resizing-sidebar`, `is-resizing-code`, `is-dragging`, `workspace-drop-target`.
- Diagnostics/runtime: `has-errors`, `is-error`, `is-warning`, `is-changed`, `is-write-target`, `is-gc-marked`, `is-gc-swept`, `is-pulse`, `is-console-changed`, `is-top`, `is-next`, `stepper-provenance`.
- Menu icon state: `icon-menu` and `icon-close` are currently toggled by the menu handler; retain them until the handler and its tests are deliberately migrated to the single SVG icon system.
- Printing: `printing-typing` on both `html` and `body`.

The layout classes are behavioral state, not styling conveniences. Do not rename them as part of a CSS naming cleanup.

### ARIA and focus relationships

- Keep `command-palette-trigger[aria-controls="command-palette-overlay"]`, the palette's `role="dialog"`, `aria-modal="true"`, `aria-labelledby`, listbox/option roles, selected state, focus-on-open, focus restoration, Escape behavior, and keyboard navigation.
- Keep `examples-button[aria-controls="examples-panel"]`, `aria-haspopup`, `aria-expanded`, the menu role, menu-item roles, outside-click close, and Escape close.
- Keep File, More, and Examples as menus. Keep View as a labelled non-modal settings dialog with `aria-haspopup="dialog"`; it contains controls that are not valid menu items.
- Keep the inspector `tablist`; each tab's `aria-controls="panel-*"`; each panel's `aria-labelledby="tab-*"`; roving `tabindex`; `aria-selected`; and Left/Right/Home/End navigation.
- Keep two independent bottom tablists: the primary Problems/Output/Semantics list and the nested Call-by-Structure/Call-by-Value/CESK/A vs B/Rewrite list. Preserve every `bottom-tab-*`/`bottom-panel-*` relationship, roving `tabindex`, `aria-selected`, `aria-hidden`, and Left/Right/Home/End navigation within its own list.
- Keep resizers focusable with `role="separator"`, the correct `aria-orientation`, and arrow-key resizing while usable. A side resizer must be `aria-hidden` and untabbable in a drawer/maximized layout; the bottom resizer must be untabbable while closed or maximized.
- Keep `aria-pressed` synchronized for activity buttons, panel toggles, and maximizers.
- Keep dialogs associated with their title IDs and preserve native dialog close/return-value behavior.
- Keep live regions for file identity, autosave, diagnostics, code-editor status, output, stepper statuses, and rewrite correspondence.
- Keep scrims labeled as close actions. Preserve keyboard reachability of real controls and do not make a decorative replacement the only target.
- Decorative glyphs/icons must remain `aria-hidden`; unfamiliar icon-only actions require an accessible text name and should gain a visible text label in the new information architecture.

## 4. Commands that must remain reachable

The completed refactor must assign each application command one clear primary location and include every application-level command in the command palette. Secondary shortcut or contextual access may remain when it improves workflow, but duplicate prominent toolbar buttons should be removed or demoted.

### Application commands

| Command | Current behavior/reachability that must survive | Required primary location |
| --- | --- | --- |
| New workspace | Header, palette `file.new`, `Ctrl/Cmd+N` | File menu |
| Open workspace or MiniJava source | Header/file input, palette `file.open`, `Ctrl/Cmd+O` | File menu |
| Save `.bml` workspace | Header, palette `file.save`, `Ctrl/Cmd+S`, filename dialog | File menu |
| Export MiniJava `.java` | Header, palette `file.export`, filename dialog | File menu |
| Restore autosave | Header, palette `file.autosave` | File menu or overflow |
| Load example, replace/merge/cancel | Examples menu and confirmation dialog | Examples |
| Run program | Header Run, workspace Run, palette `run.program`, `Ctrl/Cmd+F5`; opens Output | Header Run and workspace primary Run are the two intentionally retained contextual entries |
| Search blocks | Activity/sidebar and palette `view.search`, `Ctrl/Cmd+Shift+F` | Left panel search |
| Show blocks/sidebar | Activity/reveal controls and palette `view.blocks` | View menu plus contextual drawer control |
| Toggle inspector | Inspector/reveal/settings controls and palette `view.inspector` | View menu plus contextual drawer control |
| Toggle bottom panel | Header/workspace/settings controls and palette `view.bottom`, `Ctrl/Cmd+J` | View menu plus contextual panel control |
| Show Problems | Status item and palette `view.problems` | Bottom Problems tab/status count |
| Code, Types, Outline | Inspector tabs with keyboard navigation; stable internal `typing` IDs continue to back the visible Types view | Right inspector |
| Copy MiniJava code | Inspector action | Code inspector and palette |
| Print typing derivation | Typing inspector action | Types inspector and palette |
| Undo/Redo block change | Workspace toolbar and palette `workspace.undo`/`workspace.redo`; Blockly shortcuts continue to work | Workspace toolbar |
| Zoom in/out, fit | Workspace toolbar; Fit is palette `workspace.fit` today | Workspace toolbar and palette |
| Edit/Debug/Type Analysis/Presentation perspectives | View picker and palette `perspective.*`; Custom is automatic identity | View and palette |
| Theme toggle | View behavior and palette `theme.toggle` | View and palette |
| Autosave interval | View range, persisted timer restart | View |
| Maximize/restore inspector | Inspector action | Inspector contextual action and palette |
| Maximize/restore bottom tools | Bottom-panel action | Bottom contextual action and palette |
| About | Header today | Overflow menu and palette |
| Download workspace screenshot | Blockly workspace context menu | Context menu and palette |

The present palette has 22 commands: `file.new`, `file.open`, `file.save`, `file.export`, `file.autosave`, `run.program`, `analysis.machine`, `analysis.compare`, `analysis.rewrite`, `view.blocks`, `view.search`, `view.problems`, `view.inspector`, `view.bottom`, `workspace.undo`, `workspace.redo`, `workspace.fit`, four `perspective.*` commands, and `theme.toggle`. The completed refactor must retain these IDs and add missing application commands such as the other semantic views, zoom/reset, copy, print, maximization, About, and screenshot rather than making them unreachable when duplicate controls are removed.

### Semantic and runtime commands

- Open Call-by-Structure and Call-by-Value for a selected method-call block; keep both the explicit semantics surface and block context-menu access.
- Open/load/re-run the Model A CESK machine.
- Open/load/re-run Model A vs Model B comparison.
- Open/load/re-run Rewrite semantics and correspondence view.
- Primary bottom selection for Problems, Output, and Semantics, plus independent nested selection for Call-by-Structure, Call-by-Value, CESK, A vs B, and Rewrite.
- Visualization Arrange, Re-run, Collapse, Maximize, and Restore.
- CESK Load, Back, Step, Play/Pause, Run GC, Auto GC enable/disable, and GC threshold.
- A vs B Load, Back, Step, and Play/Pause.
- Rewrite Load, Back, Step, and Play/Pause.
- Click-to-locate from Problems, Typing, Outline, CESK control/frames/store/kontinuation, and heap references.

Panel-local transport controls must remain near the state they operate on. Semantic operations such as Call-by-Structure, GC, Model A/B comparison, and Rewrite must use visible text labels; a novel glyph alone is not sufficient.

### Keyboard contracts

- `Ctrl/Cmd+N`: new workspace.
- `Ctrl/Cmd+O`: open workspace/source.
- `Ctrl/Cmd+S`: save workspace.
- `Ctrl/Cmd+J`: toggle bottom tools.
- `Ctrl/Cmd+Shift+F`: search blocks.
- `Ctrl/Cmd+F5`: run program.
- `Ctrl/Cmd+Shift+P` and `F1`: open command palette.
- `Escape`: close command palette and Examples menu where applicable.
- Arrow Up/Down and Enter: navigate/run palette commands.
- Left/Right/Home/End: inspector tabs, primary bottom tabs, and nested Semantics tabs; each tablist navigates independently.
- Left/Right: resize side panels in 24 px steps.
- Up/Down: resize bottom panel in 24 px steps.
- `Tab` in the editable code view inserts two spaces and schedules import; it is intentionally editor behavior.
- Blockly's own undo/redo and keyboard navigation must continue to work; the refactor must not intercept those keystrokes globally.

## 5. Existing responsive and persistence behavior

### Responsive behavior

The stylesheet chain is now separated by responsibility: `tokens.css`, `workbench.css`, `domain.css`, then `codeEditor.css`. Cascade order remains part of behavior, especially for print and editable-code metrics.

- Above 1260 px: sidebar, workspace, and inspector are docked with pointer and keyboard resizers.
- At 1480 px and below: header labels compact to avoid collision.
- At 1260 px and below: docked sidebar/inspector widths are capped and the workspace icon is hidden.
- At 1100 px and below: the left sidebar and right inspector become absolute-positioned drawers over the workspace. Side resizers are disabled and removed from keyboard navigation. `mobile-sidebar-open` and `mobile-code-open` control drawer display; `sidebar-scrim`, `code-scrim`, and Escape close only those transient states and restore focus to the opener. Persistent visibility (`toolbox-hidden`/`code-hidden`) remains distinct from transient drawer-open state. The inspector drawer must remain above its own scrim.
- When a Problem is located at drawer widths, the sidebar closes so the selected block is visible.
- At 900 px and below: the perspective picker and project context are hidden, the command center becomes icon-only, and header actions move into the `main-menu.menu-open` hamburger surface.
- At 700 px and below: workspace controls compact into 44 px minimum touch targets, the bottom panel becomes a fixed drawer above the status bar, both bottom tab rows retain their visible domain labels and scroll horizontally when needed, status content reduces, and the initial workspace zooms to fit after startup.
- At 480 px and below: header/status/zoom controls compact further and the menu becomes one column.
- At 920 px and below, stepper and comparison columns stack to one column.
- `prefers-reduced-motion: reduce` nearly eliminates transitions/animations and disables smooth scrolling.
- Bottom tools can be maximized on all layouts. On phones the maximized dock fills the space between header and status bar.
- The main layout listens to window resize and fullscreen changes and uses `ResizeObserver` plus animation-frame and 60/180 ms settling passes to resize Blockly, the code editor, and active visualization workspace.
- The CESK arrow overlay observes and redraws on stepper scroll/resize. Code highlighting also observes editor resizes.

Do not rewrite breakpoints, drawer classes, scrim behavior, z-index ordering, pointer handling, resize coordination, or mobile maximization until browser-level regression tests cover docked, tablet, and phone layouts.

### Resizer behavior

- Sidebar width is clamped to 220 px through `min(420 px, 45% of viewport)` and persisted after pointer or keyboard resizing.
- Inspector width is clamped to 300 px through `min(900 px, 68% of viewport)` and persisted.
- Bottom height is clamped to 160 px through 70% of viewport height and persisted.
- Side resizers use Pointer Events and pointer capture, add/remove `is-resizing-*`, and force a final synchronized layout resize; their keyboard handlers no-op while drawers or maximized inspector layout are active.
- Bottom resizing temporarily disables text selection and resizes the active Blockly visualization.

### Persistence keys and restoration

| Key | Value/behavior |
| --- | --- |
| `block-minijava.autosave.v2` | JSON containing ISO `savedAt` plus Blockly workspace serialization. |
| `block-minijava.theme` | `dark` or `light`. |
| `block-minijava.autosave.interval` | Minutes, restored/clamped to 2–20; changing it restarts the interval timer. |
| `block-minijava.code.width` | Inspector width in pixels. |
| `block-minijava.layout.code.visible` | Boolean string. |
| `block-minijava.layout.sidebar.width` | Sidebar width in pixels. |
| `block-minijava.layout.sidebar.visible` | Boolean string. |
| `block-minijava.layout.activity` | `blocks` or `search`; legacy `run`/`settings` values restore as `blocks`. |
| `block-minijava.layout.perspective` | `edit`, `debug`, `types`, `presentation`, or `custom`. |
| `block-minijava.layout.inspector.panel` | `code`, `typing`, or `outline`; invalid/legacy values restore as `code`. |
| `block-minijava.layout.bottom.open` | Boolean string. |
| `block-minijava.layout.bottom.height` | Bottom-panel height in pixels. |
| `block-minijava.layout.bottom.tab` | Active leaf kind: `problems`, `output`, `structure`, `value`, `machine`, `compare`, or `subst`. Never persist the conceptual `semantics` parent. |
| `block-minijava.gc.autoEnabled` | Boolean string for automatic GC. |
| `block-minijava.gc.threshold` | Positive integer heap threshold. |

Restoration order matters: stored theme/interval/widths/activity/visibility/perspective are applied before or during component initialization, followed by Blockly theme/workspace initialization and bottom-panel restoration. Compact layouts clear transient drawer-open classes during restoration; this must not overwrite the user's persistent visibility preference.

Autosave runs on the configured repeating interval and also after New, workspace/example loads, and successful code imports. Loading an autosave restores the serialized workspace, enforces required blocks, updates the file identity, code, zoom/status, and diagnostics. Preserve the `block-minijava.autosave.v2` data format unless a versioned migration is implemented.

Inspector maximization, bottom maximization, transient drawer-open state, stepper execution history, and collapsed toolbox categories are not persisted. The active inspector tab is deliberately persisted through `block-minijava.layout.inspector.panel`; invalid values restore safely to Code.

### Perspective behavior

- Edit: Blocks activity, sidebar and inspector visible, Code selected, bottom closed.
- Debug: Blocks activity, sidebar and inspector visible, Outline selected, Semantics opened on CESK.
- Type Analysis: Blocks activity, sidebar and inspector visible, Outline selected, Problems opened and refreshed.
- Presentation: sidebar, inspector, and bottom hidden so the block workspace is emphasized.
- Custom: identity used after manual visibility/layout changes rather than falsely claiming a preset.

Perspective application closes transient drawers at compact widths and coordinates layout resizing. Keep this atomic behavior.

## 6. Visual patterns not to introduce

Do not introduce:

- decorative gradients;
- glassmorphism, translucency used as decoration, or backdrop blur;
- large or theatrical shadows;
- excessive rounded cards, nested card containers, or card-per-section layouts;
- floating pills or pill-shaped controls used indiscriminately;
- glowing controls, neon edges, bloom, or decorative animation;
- dashboard-style KPI cards;
- arbitrary icons or mixed icon families;
- color used merely to make every control or block different;
- multiple competing product accents;
- imitation VS Code activity bars, command-center chrome, status chrome, or panel styling as a product identity;
- duplicate primary commands in several equally prominent locations;
- unlabeled icon-only controls for domain-specific semantic actions;
- decorative workspace watermarks or branding that competes with the program;
- heavy borders, excessive separators, or excessive whitespace that fragments the workbench;
- font weights outside the normal 400/500/600/700 scale, including 760, 820, and 900;
- a conspicuous workspace grid when the grid does not provide functional value;
- new framework/runtime dependencies for presentation work.

The desired shell is neutral and quiet. The grammar-aware blocks, editable MiniJava, typing derivations, Problems, Outline, semantics, and runtime state are the visual hierarchy.

## 7. Acceptance criteria

The completed refactor is accepted only when all of the following are true.

### Information architecture and visual design

- The header, left panel, workspace toolbar, right inspector, bottom panel, status bar, View preferences, and command palette match the target information architecture.
- Every command has one clear primary location; secondary entries are justified by context or shortcut use.
- Generic IDE imitation, excess decoration, arbitrary icons/colors, and duplicate prominent controls are removed.
- Dark and light themes are complete and usable, with a neutral shell, one product accent, and accessible semantic/status colors.
- Blocks use six or seven coherent grammatical/semantic color families without weakening category recognition or contrast.
- One SVG icon system is used. Domain-specific semantic actions retain visible text.
- Typography uses normal weights (400/500/600/700), restrained spacing/borders, and no prohibited visual patterns.

### Functional compatibility

- New/Open/Save/Export/Restore Autosave/Examples and editable code-to-block import work with the same formats and outcomes.
- Toolbox search, category collapse, click insertion, drag/drop insertion, required Goal/MainClass enforcement, Blockly editing, undo/redo, zoom/pan/fit, and serialization work unchanged.
- Run produces the same Output; type checking produces the same Problems and block warnings; Problems, Typing, Outline, and runtime provenance still locate blocks.
- Code, Types, and Outline remain the only inspector views. Problems, Output, and Semantics remain the only primary bottom views; Call-by-Structure, Call-by-Value, CESK, A vs B, and Rewrite remain available and functional as Semantics leaf views.
- CESK, comparison, rewrite, GC, arrangement, re-run, Back, Step, Play/Pause, stale-state, output mirroring, and panel maximization behaviors are preserved.
- Screenshot download remains available.
- `bmj-thrasos`, all block structures/checks, connector shapes, renderer alignment, parser/generator/type/semantic behavior, and serialized workspace compatibility remain unchanged unless separately approved and tested. The approved block-color phase may change only renderer theme styles and the explicit block-to-color-family mapping.

### Compatibility and accessibility

- All stable IDs, data attributes, state classes, dynamic ID schemes, command IDs, and custom events in this document remain valid.
- No behaviorally significant event handler is lost during DOM movement.
- All ARIA tab/dialog/menu/listbox/separator/live-region relationships remain valid and states update correctly.
- Full application use is possible by keyboard; visible focus is never clipped or removed.
- All documented shortcuts pass on Windows/Linux (`Ctrl`) and macOS-style modifier handling (`Cmd`) where the current code supports it.
- Reduced-motion behavior remains effective.

### Responsive and persistence regression gates

- Before changing the current drawer or resize implementation, add browser-level regression tests for at least wide desktop, <=1100 px drawer layout, <=900 px header menu, <=700 px phone bottom drawer, and <=480 px compact controls.
- Tests cover 1920×1080, 1440×900, 1280×800, 1024×768, 768×1024, and 390×844; opening/closing both responsive drawers, scrims, Escape focus return, persistent hidden state versus transient open state, pointer and keyboard resizers, bottom/inspector maximization, and tablet code editing.
- Tests cover every persistence key above, valid restoration, invalid-value clamping/fallbacks, perspective presets/Custom identity, autosave restoration, and theme restoration.
- The refactor does not introduce horizontal page scrolling, unreachable controls, overlapping drawers, hidden focused elements, or unmeasurable Blockly workspaces at supported breakpoints.

### Verification

- `npm run typecheck` passes.
- `npm test` passes, including parser/generator round trip, type checker, machines, substitution, evaluator/fuzz, reachability/GC, and CESK smoke coverage.
- New browser/UI regression tests pass in both themes and the responsive sizes above.
- A production build succeeds and the generated app preserves the same behavior as the development build.
- A production build must not silently delete this constraints document. `webpack.config.js` currently targets `docs/` with `output.clean: true`; the implementation phase must preserve or recopy `docs/ui-refactor/REFRACTORING_CONSTRAINTS.md` before relying on `npm run build`.
- The final change set contains only refactor-related files and intentional test/documentation updates.

## 8. Architectural notes and known risks

- `src/core/ui/app.ts` owns shell state, commands, workspace lifecycle, activities, perspectives, side resizers, autosave, and most event wiring. Markup changes have a high blast radius because `byId` treats missing elements as fatal.
- `src/core/ui/visualizationPanel.ts` independently owns bottom-tab state, runtime-generated ARIA IDs, bottom resizing/maximization, and three more persistence keys.
- `src/core/ui/visualizationPanel.ts` also owns a derived conceptual selection: any semantic/runtime leaf selects the static Semantics parent. Primary and nested roving-focus tablists are separate, and `block-minijava.layout.bottom.tab` continues to store the leaf kind so reopening Semantics restores the exact tool and its in-memory state.
- The right “Code” panel is not generated code only: `codeEditor.ts` replaces it with an editable, highlighted textarea and runtime-created status DOM. Refactoring it as a passive preview would remove a primary language feature.
- Type diagnostics and derivations come from the same checker walk. Their shared block-location behavior must remain synchronized.
- The bottom panel is both passive output/diagnostics and active semantics/runtime tooling; treating every tab as equivalent static content will break component lifecycle and resize needs.
- Responsive shell rules now have one owner in `workbench.css`; the 1100, 900/901, and 700 px CSS/TypeScript thresholds remain coupled and must change together.
- UI regression tests now cover the shell, responsive drawers, resizers, command palette, keyboard-only flows, lightweight accessibility contracts, perspectives, layout persistence, themes, and visual baselines. Print layout and the full editable-code scroll/import interaction remain higher-risk browser surfaces.
- Webpack's clean configuration preserves `docs/ui-refactor/`; future output changes must keep that protection.
