# Block-MiniJava command inventory

## Purpose and scope

This is a reachability inventory for the domain-workbench refactor. It records the commands exposed by `src/index.html`, `src/core/ui/app.ts`, every module under `src/core/ui/`, the application keyboard handler, the command palette, and the locally registered Blockly context menus. It is descriptive, not a redesign specification. “Future” locations below apply the target information architecture in `REFRACTORING_CONSTRAINTS.md`; moving a command must preserve its handler, accessibility contract, and at least one explicit route.

Legend: **Yes** in “Duplicated” means the same action is currently exposed through multiple visible or discoverable routes. “Dynamic” means the element is created at runtime. Command-palette IDs are included in parentheses.

## Application, file, and global commands

| Command name | Purpose | Current visible locations | Current element IDs | Keyboard shortcut | Command-palette entry | Primary future location | Secondary permitted location | Duplicated | Migration risk |
|---|---|---|---|---|---|---|---|---|---|
| Open command palette | Search and run registered application commands | Header More menu | `command-palette-trigger`, `command-palette-overlay`, `command-palette-input`, `command-palette-list` | Ctrl/Cmd+Shift+P; F1 | Self, not an entry | More menu | Keyboard shortcut | Yes | High: focus restoration, modal state, and document-level keys |
| Close command palette | Dismiss palette and restore prior focus | Overlay, Escape | Same as above | Escape | No | Palette | Overlay dismissal | Yes | Medium |
| Navigate/run palette result | Select and invoke the filtered command | Palette results (dynamic) | `command-palette-list`; dynamic options use `command-option-{command-id}` and `data-command-id` | Up/Down, Enter | No | Palette | Pointer selection | Yes | Medium |
| New workspace | Replace the current program with a fresh required program skeleton | Header File menu | `new-workspace` | Ctrl/Cmd+N | Yes (`file.new`) | File menu | Command palette | Yes | High: destructive confirmation/required blocks/autosave |
| Open workspace or MiniJava source | Choose `.bml`, JSON, `.java`, or text and import it | Header File menu; hidden file input | `load-workspace`, `load-file-input` | Ctrl/Cmd+O | Yes (`file.open`) | File menu | Command palette | Yes | High: shared workspace/source import path |
| Save workspace | Download serialized workspace as `.bml` | Header File menu; save-name dialog | `save-workspace`, `save-name-modal`, `save-name-input` | Ctrl/Cmd+S | Yes (`file.save`) | File menu | Command palette | Yes | High: dialog return values and filename normalization |
| Export MiniJava source | Download generated/edited source as `.java` | Header File menu; export-name dialog | `export-code`, `export-name-modal`, `export-name-input` | — | Yes (`file.export`) | File menu | Command palette | Yes | High: editor text is authoritative when present |
| Restore autosave | Replace workspace with last stored autosave | Header File menu | `load-autosave` | — | Yes (`file.autosave`) | File menu | Command palette | Yes | High: persisted payload version and replacement behavior |
| Choose example | Open dynamic examples menu and select a sample | Header Examples menu | `examples-button`, `examples-panel`; dynamic menu items | Escape closes | Yes (`file.examples`) | Examples | Command palette opens the same chooser | Yes | High: dynamic menu, outside-click dismissal, and replace/merge decision |
| Replace with example | Replace existing blocks with selected example | Example-load dialog | `example-load-modal`, `example-load-name` | Dialog-native | No | Examples flow | Command palette only with an explicit confirmation flow | No | High: destructive branch |
| Merge example | Add selected example beside current program | Example-load dialog | `example-load-modal`, `example-load-name` | Dialog-native | No | Examples flow | — | No | High: block identity/required-root reconciliation |
| Cancel dialog | Cancel save, export, example, or About flow | Dialog close/action buttons | Buttons have no IDs; owning dialog IDs above plus `about-modal` | Escape/browser dialog behavior | No | Owning dialog | — | Yes | Medium: `value`-based form/dialog routing |
| About | Show concise product and implemented-capability information | Header More menu | `about-button`, `about-modal` | — | Yes (`help.about`) | More menu | Command palette | Yes | Low |
| Toggle theme | Switch dark/light application and Blockly themes | Header View menu | `theme-toggle` | — | Yes (`theme.toggle`) | View | Command palette | Yes | High: reinjects/disposes visualization workspaces and persists theme |
| Toggle compact header menu | Open/close header commands at narrow widths | Header hamburger | `menu-toggle`, `main-menu` | Escape closes | No | Header | — | No | High: responsive-only state and ARIA expansion |

## Activity bar, sidebar, and settings commands

| Command name | Purpose | Current visible locations | Current element IDs | Keyboard shortcut | Command-palette entry | Primary future location | Secondary permitted location | Duplicated | Migration risk |
|---|---|---|---|---|---|---|---|---|---|
| Show Blocks activity | Reveal the categorized toolbox sidebar | Activity bar | `activity-blocks` | — | Yes (`view.blocks`) | Left panel | Command palette | Yes | High: drawer visibility and persisted state |
| Search blocks | Focus toolbox search and reveal its drawer when needed | Activity bar; search field | `activity-search`, `toolbox-search` | Ctrl/Cmd+Shift+F | Yes (`view.search`) | Left-panel search | Command palette | Yes | High: activity also opens responsive drawer |
| Hide/show sidebar | Change primary sidebar visibility | View menu; sidebar collapse; workspace reveal; activity-item toggle-on-repeat | `view-toggle-sidebar`, `toggle-toolbox`, `show-toolbox-button`; activity buttons | — | Only “Show Blocks Sidebar” (`view.blocks`), not a true toggle | View menu | Contextual panel controls | Yes | High: `toolbox-hidden` and mobile drawer states differ |
| Close responsive sidebar | Close the transient sidebar drawer without changing its saved visibility | Responsive scrim; Escape; repeated activity action | `sidebar-scrim` | Escape | No | Responsive drawer | Activity bar | No | Critical: restore focus to the opener and retain `sidebar.visible` |
| Resize sidebar | Change persisted sidebar width | Divider between sidebar/workspace | `sidebar-resizer` | ArrowLeft/ArrowRight (24 px) | No | Layout control | Drag handle | Yes | Critical: pointer capture via window and persisted CSS variable |
| Filter toolbox | Filter block categories/items | Left panel | `toolbox-search` | Normal text editing | No | Left-panel search | — | No | Medium: dynamic rendering destroys/recreates items |
| Expand/collapse toolbox category | Show/hide category’s block list | Dynamic category headers | Dynamic `.toolbox-category-header`; generated list IDs | Enter/Space via button semantics | No | Categorized toolbox | — | No | Medium: dynamic `aria-expanded`/`aria-controls` |
| Add block from toolbox | Instantiate block in main workspace | Dynamic toolbox block button | Dynamic `.toolbox-block`, `data-block-type` | Enter/Space via button semantics | No | Categorized toolbox | — | No | Critical: required blocks, placement, grammar, autosave |
| Drag block from toolbox | Place a new block at drop coordinates | Toolbox to workspace drag/drop | `blockly-area`; dynamic toolbox button; custom MIME type | — | No | Categorized toolbox | — | No | Critical: behaviorally significant drag data and drop target |
| Run program | Execute Model A and show output | Workspace toolbar | `run-program` | Ctrl/Cmd+F5 | Yes (`run.program`) | Workspace toolbar | Command palette and shortcut | Yes | Critical: all routes converge on `runProgram` |
| Open CESK machine | Open the CESK leaf view | Semantics → CESK | Dynamic `bottom-tab-machine` | Nested-tab arrow navigation | Yes (`analysis.machine`) | Bottom Semantics | Command palette | Yes | High |
| Compare models | Open Model A/B comparison | Semantics → A vs B | Dynamic `bottom-tab-compare` | Nested-tab arrow navigation | Yes (`analysis.compare`) | Bottom Semantics | Command palette | Yes | High |
| Open rewrite semantics | Open substitution/rewrite tool | Semantics → Rewrite | Dynamic `bottom-tab-subst` | Nested-tab arrow navigation | Yes (`analysis.rewrite`) | Bottom Semantics | Command palette | Yes | High |
| Visualize call-by-structure | Visualize selected or first block | Semantics → Call-by-Structure; eligible block context menu | Dynamic `bottom-tab-structure` | Nested-tab arrow navigation | Yes (`analysis.structure`) | Bottom Semantics | Block context menu and palette | Yes | Critical: selected-block semantics and Blockly rendering |
| Visualize call-by-value | Visualize selected or first block | Semantics → Call-by-Value; eligible block context menu | Dynamic `bottom-tab-value` | Nested-tab arrow navigation | Yes (`analysis.value`) | Bottom Semantics | Block context menu and palette | Yes | Critical: selected-block semantics and Blockly rendering |
| Toggle inspector | Show/hide right inspector | View menu; inspector header; workspace restore when hidden | `view-toggle-inspector`, `toggle-code-column`, `show-inspector-button` | — | Yes (`view.inspector`) | View menu | Contextual workspace restore, inspector-local close, and palette | Yes | High |
| Toggle bottom tools | Show/hide bottom panel | Workspace toolbar; View menu; bottom-panel close | `workspace-toggle-bottom-panel`, `top-toggle-bottom-panel`, `viz-collapse` | Ctrl/Cmd+J | Yes (`view.bottom`) | Workspace toolbar | View menu, bottom panel, and palette | Yes | High |
| Set autosave interval | Persist interval from 2–20 minutes | View menu | `autosave-interval`, `autosave-interval-label` | Range-input keys | No | View menu | — | No | High: timer restart and persistence |
| Switch Edit perspective | Apply editing-oriented saved layout | View menu | `perspective-select` | — | Yes (`perspective.edit`) | View menu | Command palette | Yes | Critical: coordinated multi-panel state |
| Switch Debug perspective | Open Outline and Machine | View menu | `perspective-select` | — | Yes (`perspective.debug`) | View menu | Command palette | Yes | Critical |
| Switch Type Analysis perspective | Open Outline and Problems and refresh diagnostics | View menu | `perspective-select` | — | Yes (`perspective.types`) | View menu | Command palette | Yes | Critical |
| Switch Presentation perspective | Hide sidebar, inspector, and bottom panel | View menu | `perspective-select` | — | Yes (`perspective.presentation`) | View menu | Command palette | Yes | Critical |

## Workspace and inspector commands

| Command name | Purpose | Current visible locations | Current element IDs | Keyboard shortcut | Command-palette entry | Primary future location | Secondary permitted location | Duplicated | Migration risk |
|---|---|---|---|---|---|---|---|---|---|
| Undo block change | Blockly undo | Workspace toolbar; Blockly native key handling may also apply | `workspace-undo` | Browser/Blockly Ctrl/Cmd+Z behavior; title advertises Ctrl+Z | Yes (`workspace.undo`) | Workspace toolbar | Command palette | Yes | High: do not replace Blockly undo stack |
| Redo block change | Blockly redo | Workspace toolbar | `workspace-redo` | Title advertises Ctrl+Y; Blockly/browser handling | Yes (`workspace.redo`) | Workspace toolbar | Command palette | Yes | High |
| Zoom out | Decrease Blockly scale around center | Workspace toolbar; Blockly-injected controls/wheel | `workspace-zoom-out` | Ctrl+wheel/pinch through Blockly | Yes (`workspace.zoomOut`) | Workspace toolbar | Blockly native controls and palette | Yes | High: renderer/workspace API |
| Zoom in | Increase Blockly scale around center | Workspace toolbar; Blockly-injected controls/wheel | `workspace-zoom-in` | Ctrl+wheel/pinch through Blockly | Yes (`workspace.zoomIn`) | Workspace toolbar | Blockly native controls and palette | Yes | High |
| Reset zoom | Set Blockly scale to 100% and center the workspace | Command palette | No static control | — | Yes (`workspace.zoomReset`) | Command palette | — | No | High: renderer/workspace API |
| Fit workspace | Fit blocks in viewport | Workspace toolbar; Blockly-injected zoom controls | `workspace-fit` | — | Yes (`workspace.fit`) | Workspace toolbar | Command palette | Yes | High |
| Hide inspector | Hide right inspector | Inspector header | `toggle-code-column` | — | Palette toggle (`view.inspector`) | View menu | Inspector-local close | Yes | High |
| Close responsive inspector | Close the transient inspector drawer without changing its saved visibility | Responsive scrim; Escape | `code-scrim` | Escape | No | Responsive drawer | View trigger | No | Critical: inspector remains above its scrim and focus returns to the opener |
| Resize inspector | Change persisted inspector width | Divider between workspace/inspector | `code-resizer` | ArrowLeft/ArrowRight (24 px) | No | Layout control | Drag handle | Yes | Critical: layout geometry reverses pointer direction |
| Maximize/restore inspector | Toggle inspector maximization | Inspector header | `toggle-code-maximize` | — | Yes (`view.inspectorMaximize`) | Inspector | Command palette | Yes | High: body state changes entire grid |
| Select Code inspector | Show editable generated MiniJava and persist the intended inspector tab | Inspector tabs | `tab-code`, `panel-code` | Left/Right/Home/End | Yes (`view.code`) | Right inspector / Code | Command palette | Yes | High: editor overlay, ARIA tab relationship, and `layout.inspector.panel` |
| Select Types inspector | Show typing derivation and persist the intended inspector tab | Inspector tabs | `tab-typing`, `panel-typing` | Left/Right/Home/End | Yes (`view.types`) | Right inspector / Types | Command palette | Yes | High |
| Select Outline inspector | Show program structure, locate blocks, and persist the intended inspector tab | Inspector tabs | `tab-outline`, `panel-outline`, `program-outline` | Left/Right/Home/End | Yes (`view.outline`) | Right inspector / Outline | Command palette | Yes | High |
| Edit MiniJava source | Edit text and debounce import back into blocks | Code inspector | Dynamic `generated-code-editor`; `panel-code`, `generated-code`, `load-file-input` | Plain Tab inserts two spaces; Shift+Tab or Escape then Tab exits | No | Right inspector / Code | File Open for source files | No | Critical: bidirectional block/text synchronization |
| Copy MiniJava code | Copy current editor/generated text | Inspector header | `copy-code` | — | Yes (`editor.copy`) | Code inspector | Command palette | Yes | Medium |
| Print typing derivation | Print active derivation with print-only layout | Inspector header, visible only on Types | `print-typing`, print header IDs | Browser print flow | Yes (`types.print`) | Types inspector | Command palette | Yes | Critical: DOM detachment and print CSS state |
| Choose typing method | Select derivation target | Types inspector | `typing-method-select` | Select keyboard behavior | No | Types inspector | — | No | Medium |
| Expand/collapse typing row | Reveal a judgement’s proof subtree | Types inspector (dynamic) | Dynamic `.typ-row-toggle` | Button keyboard behavior | No | Types inspector | — | No | Medium |
| Locate typing judgement | Center/select source block | Types inspector (dynamic judgement buttons) | Dynamic `.typ-judgement` | Button keyboard behavior | No | Types inspector | — | No | High: emits shared block-locate behavior |
| Locate outline item | Center/select source block | Outline (dynamic tree items) | `program-outline`; dynamic `.outline-item[data-block-id]` | Button keyboard behavior | No | Outline inspector | — | No | High |

## Bottom panel, runtime, and diagnostics commands

| Command name | Purpose | Current visible locations | Current element IDs | Keyboard shortcut | Command-palette entry | Primary future location | Secondary permitted location | Duplicated | Migration risk |
|---|---|---|---|---|---|---|---|---|---|
| Toggle bottom panel | Open/close bottom tools | Workspace toolbar; View menu; bottom-panel close | `workspace-toggle-bottom-panel`, `top-toggle-bottom-panel`, `viz-collapse`, `viz-dock` | Ctrl/Cmd+J | Yes (`view.bottom`) | Workspace toolbar | View menu, bottom panel, or palette | Yes | Critical: persisted state and maximization reset |
| Select Problems | Show/refresh type diagnostics | Bottom tab; status bar | dynamic `bottom-tab-problems`, `status-problems-button` | Bottom tab Left/Right/Home/End | Yes (`view.problems`) | Bottom panel / Problems | Status bar and palette | Yes | High |
| Select Output | Show latest run/semantic output | Bottom tab; Run opens it implicitly | dynamic `bottom-tab-output`, `bottom-program-output` | Bottom tab navigation | Yes (`view.output`) | Bottom panel / Output | Run result and palette | Yes | Medium |
| Select Semantics | Reveal the semantic/runtime region and restore its last selected leaf view | Bottom primary tab strip | `bottom-tab-semantics`, `bottom-panel-semantics` | Primary-tab Left/Right/Home/End | Yes (`view.semantics`) | Bottom panel / Semantics | Command palette | Yes | High: parent selection is derived from the active leaf kind and must not replace it in persistence |
| Select semantic/runtime view | Switch among Call-by-Structure, Call-by-Value, CESK, A vs B, and Rewrite | Secondary tab row inside Semantics | dynamic `bottom-tab-{structure,value,machine,compare,subst}` | Secondary-tab Left/Right/Home/End | Yes (`analysis.structure`, `analysis.value`, `analysis.machine`, `analysis.compare`, `analysis.rewrite`) | Bottom panel / Semantics | Command palette and block context menu where applicable | Yes | High: leaf IDs, ARIA, component lifecycle, and persisted kind remain unchanged |
| Re-run/reset active tool | Re-render reduction or reset active machine/compare/rewrite | Bottom toolbar | `viz-rerun` | — | No | Bottom semantic tool toolbar | Command palette | No | High: behavior depends on active tab |
| Arrange reduction blocks | Lay out Structure/Value visualization by evaluation order | Bottom toolbar, only workspace visualizations | `viz-arrange` | — | No | Bottom semantic tool toolbar | Workspace context menu permitted | No | High: custom renderer workspace |
| Maximize/restore bottom tools | Toggle bottom panel maximization | Bottom toolbar | `viz-maximize` | — | Yes (`view.bottomMaximize`) | Bottom panel | Command palette | Yes | High: `bottom-maximized` state and resize coordination |
| Hide bottom tools | Close panel | Bottom toolbar | `viz-collapse` | Ctrl/Cmd+J also toggles | Palette toggle (`view.bottom`) | Bottom-panel close | View menu/palette | Yes | High |
| Resize bottom tools | Persist bottom-panel height | Top edge of bottom panel | `viz-resizer` | ArrowUp/ArrowDown (24 px) | No | Layout control | Drag handle | Yes | Critical: pointer/window listeners and mobile sizing |
| Locate problem | Center/select the diagnostic’s block | Problems list (dynamic) | `bottom-problems-list`; dynamic `.problem-item` | Button keyboard behavior | No | Problems | — | No | High: warning ownership and responsive-drawer event |
| Machine: load/reset | Inject current blocks into CESK Model A | Machine toolbar | `stepper-load` | — | Palette opens tool, not action | Machine tool | Command palette permitted | No | Critical: semantic state reset |
| Machine: back | Undo one machine step | Machine toolbar | `stepper-back` | — | No | Machine tool | — | No | High |
| Machine: step | Execute one machine transition | Machine toolbar | `stepper-step` | — | No | Machine tool | — | No | Critical: semantics |
| Machine: play/pause | Automatically step/stop | Machine toolbar | `stepper-play` | — | No | Machine tool | — | No | Critical: timer lifecycle |
| Machine: run GC | Animate mark-and-sweep | Machine toolbar | `stepper-gc` | — | No | Machine tool | — | No | Critical: runtime state and animation |
| Machine: toggle automatic GC | Enable persisted automatic collection | Machine toolbar | `stepper-gc-auto-enabled` | Checkbox keyboard behavior | No | Machine tool/settings | — | No | High |
| Machine: set GC threshold | Persist allocation threshold | Machine toolbar | `stepper-gc-threshold` | Number-input behavior | No | Machine tool/settings | — | No | High |
| Machine: follow reference/provenance | Reveal heap object or locate originating block | Dynamic machine values, frames, heap, control | Dynamic `data-ref-loc`, provenance classes | Button/click behavior | No | Machine visualization | — | No | High |
| Compare: load/reset | Inject current blocks into both models | Compare toolbar | `compare-load` | — | Palette opens tool, not action | Compare tool | Command palette permitted | No | Critical |
| Compare: back | Undo one lockstep transition | Compare toolbar | `compare-back` | — | No | Compare tool | — | No | High |
| Compare: step | Step both models once | Compare toolbar | `compare-step` | — | No | Compare tool | — | No | Critical: comparative semantics |
| Compare: play/pause | Automatically step/stop both models | Compare toolbar | `compare-play` | — | No | Compare tool | — | No | Critical: timer lifecycle |
| Rewrite: load/reset | Build rewrite tree from current blocks | Rewrite toolbar | `subst-load` | — | Palette opens tool, not action | Rewrite tool | Command palette permitted | No | Critical |
| Rewrite: back | Undo one rewrite | Rewrite toolbar | `subst-back` | — | No | Rewrite tool | — | No | High |
| Rewrite: step | Execute one rewrite | Rewrite toolbar | `subst-step` | — | No | Rewrite tool | — | No | Critical: substitution semantics |
| Rewrite: play/pause | Automatically rewrite/stop | Rewrite toolbar | `subst-play` | — | No | Rewrite tool | — | No | Critical: timer lifecycle |

## Blockly and context-menu commands

| Command name | Purpose | Current visible locations | Current element IDs | Keyboard shortcut | Command-palette entry | Primary future location | Secondary permitted location | Duplicated | Migration risk |
|---|---|---|---|---|---|---|---|---|---|
| Visualize Call-by-Structure for method call | Open reduction from the clicked `mj_expr_method_call` | Blockly block context menu | Registry ID `miniJavaVizStructure` | Context-menu keyboard behavior is Blockly-owned | No | Block context menu | Bottom semantic tools | Yes | Critical: block-type precondition and connector semantics |
| Visualize Call-by-Value for method call | Open value reduction from clicked method call | Blockly block context menu | Registry ID `miniJavaVizValue` | Blockly-owned | No | Block context menu | Bottom semantic tools | Yes | Critical |
| Download screenshot | Serialize non-empty Blockly workspace to PNG | Blockly workspace context menu, including semantic workspaces | Registry ID `miniJavaDownloadScreenshot` | Blockly-owned | Yes (`workspace.screenshot`) | Workspace context menu | Command palette | Yes | Critical: SVG cloning, styles, renderer geometry |
| Blockly built-in block/workspace actions | Library-owned delete, duplicate, comments, collapse, disable, cleanup/other enabled entries | Blockly context menus | Blockly registry-owned; no application IDs | Blockly-owned | No | Blockly context menu | Command palette only if explicitly bridged | No | Critical: list varies with Blockly/config; do not suppress wholesale |

## Implemented header and status reachability audit

The global-header and status-bar phase establishes these primary routes while
retaining every prior shortcut and contextual route:

| Surface | Commands now reachable | Preserved secondary routes |
|---|---|---|
| File | New, Open, Save, Export MiniJava, Restore autosave | `file.*` palette entries; Ctrl/Cmd+N, O, S; dialogs and hidden file input |
| Examples | Open example list, replace, merge, cancel | Native dialog cancellation and Escape dismissal |
| Workspace | Run program; toggle bottom tools; restore hidden toolbox/inspector | Workspace toolbar, `run.program`, `view.bottom`, `view.blocks`, `view.inspector`, Ctrl/Cmd+F5, Ctrl/Cmd+J |
| View | Sidebar, inspector, bottom tools, perspective, theme, autosave interval | Contextual panel controls, `view.*`, `perspective.*`, `theme.toggle`, Ctrl/Cmd+J |
| More | Command palette, About | Ctrl/Cmd+Shift+P and F1 for the palette |
| Status | Show Problems | Problems bottom tab and `view.problems` |
| Workspace/inspector/bottom panels | Undo, Redo, zoom/Fit, Copy, Print, panel maximize/close, Problems/Output/Semantics navigation, and semantic/runtime controls | Existing palette entries, shortcuts, nested semantic tabs, and Blockly context menus recorded above |

The renderer name and internal implementation details are no longer present in
user-facing status or About copy. Perspective selection and the autosave interval live in
View; the Blocks sidebar contains only block-location tools.

The command palette now contains 39 application commands. It retains all 22
original IDs and adds the example chooser, both remaining semantic views,
Output/Semantics and inspector-tab navigation, code copy, typing print, zoom
in/out/reset, both maximizers, About, and workspace screenshot. Panel-local
transport, arrangement, disclosure, resize, and dialog-choice controls remain
beside the state they operate on.

All File, More, and Examples menus support Arrow Up/Down, Home/End, and
Escape with focus restoration. View is a labelled settings popup (rather than
a menu, because it contains form controls) and preserves the same Escape and
focus-restoration behavior. The responsive `menu-toggle`/`main-menu`
relationship remains the mobile container for the same commands.

## Duplication findings for later migration

The following duplication can be reduced later without deleting reachability, after handlers are centralized and regression coverage exists:

- The labelled workspace `run-program` button is the single visible Run action; the palette and Ctrl/Cmd+F5 retain nonvisual access.
- The workspace owns the contextual bottom-panel toggle; View, the panel close action, the palette, and Ctrl/Cmd+J remain secondary routes.
- View owns the general inspector preference; `show-inspector-button` appears in the workspace only while the inspector is not visible.
- Perspectives and the autosave interval remain in View and the command palette retains perspective/theme commands.
- CESK, A vs B, Rewrite, Call-by-Structure, and Call-by-Value remain reachable through the Semantics secondary tabs, context menus where applicable, and the command palette.
- Fit, zoom, undo, and redo keep their Blockly-backed behavior while the toolbar removes the nonessential zoom-reset readout.

No duplicate is authorized for removal by this inventory. Any future removal must first prove keyboard, responsive, and command-palette reachability.

## View location mapping after inspector and bottom-panel organization

| Previous visible view | New conceptual location | Preserved identity |
|---|---|---|
| Editable Code | Right inspector → Code | `tab-code`, `panel-code`, `generated-code`, runtime-created editor IDs |
| Typing | Right inspector → Types | `tab-typing`, `panel-typing`, typing and print IDs |
| Outline | Right inspector → Outline | `tab-outline`, `panel-outline`, `program-outline` |
| Problems | Bottom panel → Problems | `bottom-tab-problems`, `bottom-panel-problems`, diagnostics IDs |
| Output | Bottom panel → Output | `bottom-tab-output`, `bottom-panel-output`, `bottom-program-output` |
| Call-by-Structure | Bottom panel → Semantics → Call-by-Structure | `bottom-tab-structure`, `bottom-panel-structure` |
| Call-by-Value | Bottom panel → Semantics → Call-by-Value | `bottom-tab-value`, `bottom-panel-value` |
| CESK | Bottom panel → Semantics → CESK | `bottom-tab-machine`, `bottom-panel-machine`, all `stepper-*` IDs |
| A vs B | Bottom panel → Semantics → A vs B | `bottom-tab-compare`, `bottom-panel-compare`, all `compare-*` IDs |
| Rewrite | Bottom panel → Semantics → Rewrite | `bottom-tab-subst`, `bottom-panel-subst`, all `subst-*` IDs |
