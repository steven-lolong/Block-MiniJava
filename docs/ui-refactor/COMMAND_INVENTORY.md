# Block-MiniJava command inventory

## Purpose and scope

This is a reachability inventory for the domain-workbench refactor. It records the commands exposed by `src/index.html`, `src/core/ui/app.ts`, every module under `src/core/ui/`, the application keyboard handler, the command palette, and the locally registered Blockly context menus. It is descriptive, not a redesign specification. “Future” locations below apply the target information architecture in `REFRACTORING_CONSTRAINTS.md`; moving a command must preserve its handler, accessibility contract, and at least one explicit route.

Legend: **Yes** in “Duplicated” means the same action is currently exposed through multiple visible or discoverable routes. “Dynamic” means the element is created at runtime. Command-palette IDs are included in parentheses.

## Application, file, and global commands

| Command name | Purpose | Current visible locations | Current element IDs | Keyboard shortcut | Command-palette entry | Primary future location | Secondary permitted location | Duplicated | Migration risk |
|---|---|---|---|---|---|---|---|---|---|
| Open command palette | Search and run registered application commands | Header command center | `command-palette-trigger`, `command-palette-overlay`, `command-palette-input`, `command-palette-list` | Ctrl/Cmd+Shift+P; F1 | Self, not an entry | Header | Keyboard shortcut | Yes | High: focus restoration, modal state, and document-level keys |
| Close command palette | Dismiss palette and restore prior focus | Overlay, Escape | Same as above | Escape | No | Palette | Overlay dismissal | Yes | Medium |
| Navigate/run palette result | Select and invoke the filtered command | Palette results (dynamic) | `command-palette-list`; dynamic options use `data-command-id` | Up/Down, Enter | No | Palette | Pointer selection | Yes | Medium |
| New workspace | Replace the current program with a fresh required program skeleton | Header main menu | `new-workspace` | Ctrl/Cmd+N | Yes (`file.new`) | File menu | Command palette | Yes | High: destructive confirmation/required blocks/autosave |
| Open workspace or MiniJava source | Choose `.bml`, JSON, `.java`, or text and import it | Header main menu; hidden file input | `load-workspace`, `load-file-input` | Ctrl/Cmd+O | Yes (`file.open`) | File menu | Command palette | Yes | High: shared workspace/source import path |
| Save workspace | Download serialized workspace as `.bml` | Header main menu; save-name dialog | `save-workspace`, `save-name-modal`, `save-name-input` | Ctrl/Cmd+S | Yes (`file.save`) | File menu | Command palette | Yes | High: dialog return values and filename normalization |
| Export MiniJava source | Download generated/edited source as `.java` | Header main menu; export-name dialog | `export-code`, `export-name-modal`, `export-name-input` | — | Yes (`file.export`) | File menu | Command palette | Yes | High: editor text is authoritative when present |
| Restore autosave | Replace workspace with last stored autosave | Header main menu | `load-autosave` | — | Yes (`file.autosave`) | File menu | Command palette | Yes | High: persisted payload version and replacement behavior |
| Choose example | Open dynamic examples menu and select a sample | Header Examples menu | `examples-button`, `examples-panel`; dynamic menu items | Escape closes | No | Examples | Command palette may add named examples | No | High: dynamic menu, outside-click dismissal, and replace/merge decision |
| Replace with example | Replace existing blocks with selected example | Example-load dialog | `example-load-modal`, `example-load-name` | Dialog-native | No | Examples flow | Command palette only with an explicit confirmation flow | No | High: destructive branch |
| Merge example | Add selected example beside current program | Example-load dialog | `example-load-modal`, `example-load-name` | Dialog-native | No | Examples flow | — | No | High: block identity/required-root reconciliation |
| Cancel dialog | Cancel save, export, example, or About flow | Dialog close/action buttons | Buttons have no IDs; owning dialog IDs above plus `about-modal` | Escape/browser dialog behavior | No | Owning dialog | — | Yes | Medium: `value`-based form/dialog routing |
| About | Show product and renderer information | Header utility/overflow area | `about-button`, `about-modal` | — | No | Overflow menu | Command palette | No | Low |
| Toggle theme | Switch dark/light application and Blockly themes | Header theme switch | `theme-toggle` | — | Yes (`theme.toggle`) | Settings | Command palette | Yes | High: reinjects/disposes visualization workspaces and persists theme |
| Toggle compact header menu | Open/close header commands at narrow widths | Header hamburger | `menu-toggle`, `main-menu` | Escape is not wired; resize closes | No | Header | — | No | High: responsive-only state and ARIA expansion |

## Activity bar, sidebar, and settings commands

| Command name | Purpose | Current visible locations | Current element IDs | Keyboard shortcut | Command-palette entry | Primary future location | Secondary permitted location | Duplicated | Migration risk |
|---|---|---|---|---|---|---|---|---|---|
| Show Blocks activity | Select categorized toolbox sidebar | Activity bar | `activity-blocks` | — | Yes (`view.blocks`) | Left panel | Command palette | Yes | High: activity, drawer visibility, focus, persistence |
| Search blocks | Select/focus toolbox search | Activity bar; search field | `activity-search`, `toolbox-search` | Ctrl/Cmd+Shift+F | Yes (`view.search`) | Left-panel search | Command palette | Yes | High: activity also opens responsive drawer |
| Show Run and Analysis activity | Show Run and semantic tool launchers | Activity bar | `activity-run` | — | No | Left-panel/activity navigation if retained | Command palette | No | Medium |
| Show Settings activity | Show perspectives, layout, theme interval controls | Activity bar; status perspective button | `activity-settings`, `status-perspective` | — | No | Settings | Status bar may link to Settings | Yes | Medium |
| Hide/show sidebar | Change primary sidebar visibility | Sidebar collapse; workspace reveal; activity-item toggle-on-repeat | `toggle-toolbox`, `show-toolbox-button`; activity buttons | — | Only “Show Blocks Sidebar” (`view.blocks`), not a true toggle | View menu | Settings/layout | Yes | High: `toolbox-hidden` and mobile drawer states differ |
| Close responsive sidebar | Close sidebar drawer via scrim | Responsive scrim | `sidebar-scrim` | — | No | Responsive drawer | — | No | Critical: drawer implementation is frozen pending tests |
| Resize sidebar | Change persisted sidebar width | Divider between sidebar/workspace | `sidebar-resizer` | ArrowLeft/ArrowRight (24 px) | No | Layout control | Drag handle | Yes | Critical: pointer capture via window and persisted CSS variable |
| Filter toolbox | Filter block categories/items | Left panel | `toolbox-search` | Normal text editing | No | Left-panel search | — | No | Medium: dynamic rendering destroys/recreates items |
| Expand/collapse toolbox category | Show/hide category’s block list | Dynamic category headers | Dynamic `.toolbox-category-header`; generated list IDs | Enter/Space via button semantics | No | Categorized toolbox | — | No | Medium: dynamic `aria-expanded`/`aria-controls` |
| Add block from toolbox | Instantiate block in main workspace | Dynamic toolbox block button | Dynamic `.toolbox-block`, `data-block-type` | Enter/Space via button semantics | No | Categorized toolbox | — | No | Critical: required blocks, placement, grammar, autosave |
| Drag block from toolbox | Place a new block at drop coordinates | Toolbox to workspace drag/drop | `blockly-area`; dynamic toolbox button; custom MIME type | — | No | Categorized toolbox | — | No | Critical: behaviorally significant drag data and drop target |
| Run program | Execute Model A and show output | Workspace toolbar; Run sidebar | `run-program`, `sidebar-run-program` | Ctrl/Cmd+F5 | Yes (`run.program`) | Workspace toolbar primary Run | Header Run and command palette | Yes | Critical: three routes must converge on one handler |
| Open CESK machine | Open Machine bottom tab | Run sidebar; bottom Machine tab | `sidebar-open-cesk`; dynamic `bottom-tab-machine` | Bottom tab arrow navigation | Yes (`analysis.machine`) | Bottom Semantics/runtime tools | Command palette | Yes | High |
| Compare models | Open Model A/B comparison | Run sidebar; bottom Compare tab | `sidebar-open-compare`; dynamic `bottom-tab-compare` | Bottom tab arrow navigation | Yes (`analysis.compare`) | Bottom Semantics/runtime tools | Command palette | Yes | High |
| Open rewrite semantics | Open substitution/rewrite tool | Run sidebar; bottom Rewrite tab | `sidebar-open-rewrite`; dynamic `bottom-tab-subst` | Bottom tab arrow navigation | Yes (`analysis.rewrite`) | Bottom Semantics/runtime tools | Command palette | Yes | High |
| Visualize call-by-structure | Visualize selected or first block | Run sidebar; bottom tab; eligible block context menu | `sidebar-open-structure`; dynamic `bottom-tab-structure` | Bottom tab arrow navigation | No | Bottom Semantics/runtime tools | Block context menu | Yes | Critical: selected-block semantics and Blockly rendering |
| Visualize call-by-value | Visualize selected or first block | Run sidebar; bottom tab; eligible block context menu | `sidebar-open-value`; dynamic `bottom-tab-value` | Bottom tab arrow navigation | No | Bottom Semantics/runtime tools | Block context menu | Yes | Critical: selected-block semantics and Blockly rendering |
| Toggle inspector from settings | Show/hide right inspector | Settings sidebar | `settings-toggle-code` | — | Yes (`view.inspector`) | View menu | Settings/layout and palette | Yes | High |
| Toggle bottom tools from settings | Show/hide bottom panel | Settings sidebar | `settings-toggle-bottom` | Ctrl/Cmd+J | Yes (`view.bottom`) | View menu | Settings/layout and palette | Yes | High |
| Set autosave interval | Persist interval from 2–20 minutes | Settings sidebar | `autosave-interval`, `autosave-interval-label` | Range-input keys | No | Settings | — | No | High: timer restart and persistence |
| Switch Edit perspective | Apply editing-oriented saved layout | Header select; Settings cards | `perspective-select`; `.perspective-option[data-perspective="edit"]` | — | Yes (`perspective.edit`) | Settings/Perspectives | Header View selector or palette | Yes | Critical: coordinated multi-panel state |
| Switch Debug perspective | Open Run activity, Outline, Machine | Header select; Settings cards | `perspective-select`; debug perspective option | — | Yes (`perspective.debug`) | Settings/Perspectives | Header View selector or palette | Yes | Critical |
| Switch Type Analysis perspective | Open Outline and Problems and refresh diagnostics | Header select; Settings cards | `perspective-select`; types perspective option | — | Yes (`perspective.types`) | Settings/Perspectives | Header View selector or palette | Yes | Critical |
| Switch Presentation perspective | Hide sidebar, inspector, and bottom panel | Header select; Settings cards | `perspective-select`; presentation perspective option | — | Yes (`perspective.presentation`) | Settings/Perspectives | Header View selector or palette | Yes | Critical |
| Open perspective settings | Navigate status item to Settings activity | Status bar | `status-perspective` | — | No | Status bar | Settings | Yes | Medium |

## Workspace and inspector commands

| Command name | Purpose | Current visible locations | Current element IDs | Keyboard shortcut | Command-palette entry | Primary future location | Secondary permitted location | Duplicated | Migration risk |
|---|---|---|---|---|---|---|---|---|---|
| Undo block change | Blockly undo | Workspace toolbar; Blockly native key handling may also apply | `workspace-undo` | Browser/Blockly Ctrl/Cmd+Z behavior; title advertises Ctrl+Z | Yes (`workspace.undo`) | Workspace toolbar | Command palette | Yes | High: do not replace Blockly undo stack |
| Redo block change | Blockly redo | Workspace toolbar | `workspace-redo` | Title advertises Ctrl+Y; Blockly/browser handling | Yes (`workspace.redo`) | Workspace toolbar | Command palette | Yes | High |
| Zoom out | Decrease Blockly scale around center | Workspace toolbar; Blockly-injected controls/wheel | `workspace-zoom-out` | Ctrl+wheel/pinch through Blockly | No | Workspace toolbar | Blockly native controls | Yes | High: renderer/workspace API |
| Zoom in | Increase Blockly scale around center | Workspace toolbar; Blockly-injected controls/wheel | `workspace-zoom-in` | Ctrl+wheel/pinch through Blockly | No | Workspace toolbar | Blockly native controls | Yes | High |
| Reset zoom | Set scale to 100% and center | Workspace toolbar zoom indicator | `zoom-indicator`, `zoom-size` | — | No | Workspace toolbar | Command palette | No | Medium |
| Fit workspace | Fit blocks in viewport | Workspace toolbar; Blockly-injected zoom controls | `workspace-fit` | — | Yes (`workspace.fit`) | Workspace toolbar | Command palette | Yes | High: must update zoom readout |
| Show inspector | Reveal hidden right inspector | Workspace reveal button | `show-code-button` | — | Palette toggle (`view.inspector`) | View menu | Workspace reveal affordance | Yes | High |
| Hide inspector | Hide right inspector | Inspector header | `toggle-code-column` | — | Palette toggle (`view.inspector`) | View menu | Inspector-local close | Yes | High |
| Close responsive inspector | Close inspector drawer via scrim | Responsive scrim | `code-scrim` | — | No | Responsive drawer | — | No | Critical: drawer implementation is frozen pending tests |
| Resize inspector | Change persisted inspector width | Divider between workspace/inspector | `code-resizer` | ArrowLeft/ArrowRight (24 px) | No | Layout control | Drag handle | Yes | Critical: layout geometry reverses pointer direction |
| Maximize/restore inspector | Toggle inspector maximization | Inspector header | `toggle-code-maximize` | — | No | Inspector | View menu/palette | No | High: body state changes entire grid |
| Select Code inspector | Show editable generated MiniJava | Inspector tabs | `tab-code`, `panel-code` | Left/Right/Home/End | No | Right inspector / Code | Command palette permitted | No | High: editor overlay and ARIA tab relationship |
| Select Types inspector | Show typing derivation | Inspector tabs | `tab-typing`, `panel-typing` | Left/Right/Home/End | No | Right inspector / Types | Command palette permitted | No | High |
| Select Outline inspector | Show program structure and locate blocks | Inspector tabs | `tab-outline`, `panel-outline`, `program-outline` | Left/Right/Home/End | No | Right inspector / Outline | Command palette permitted | No | High |
| Edit MiniJava source | Edit text and debounce import back into blocks | Code inspector | Dynamic `generated-code-editor`; `panel-code`, `generated-code`, `load-file-input` | Standard text keys; Tab inserts two spaces | No | Right inspector / Code | File Open for source files | No | Critical: bidirectional block/text synchronization |
| Copy MiniJava code | Copy current editor/generated text | Inspector header | `copy-code` | — | No | Code inspector | Command palette | No | Medium |
| Print typing derivation | Print active derivation with print-only layout | Inspector header, visible only on Types | `print-typing`, print header IDs | Browser print flow | No | Types inspector | Command palette | No | Critical: DOM detachment and print CSS state |
| Choose typing method | Select derivation target | Types inspector | `typing-method-select` | Select keyboard behavior | No | Types inspector | — | No | Medium |
| Expand/collapse typing row | Reveal a judgement’s proof subtree | Types inspector (dynamic) | Dynamic `.typ-row-toggle` | Button keyboard behavior | No | Types inspector | — | No | Medium |
| Locate typing judgement | Center/select source block | Types inspector (dynamic judgement buttons) | Dynamic `.typ-judgement` | Button keyboard behavior | No | Types inspector | — | No | High: emits shared block-locate behavior |
| Locate outline item | Center/select source block | Outline (dynamic tree items) | `program-outline`; dynamic `.outline-item[data-block-id]` | Button keyboard behavior | No | Outline inspector | — | No | High |

## Bottom panel, runtime, and diagnostics commands

| Command name | Purpose | Current visible locations | Current element IDs | Keyboard shortcut | Command-palette entry | Primary future location | Secondary permitted location | Duplicated | Migration risk |
|---|---|---|---|---|---|---|---|---|---|
| Toggle bottom panel | Open/close bottom tools | Header menu; workspace toolbar; Settings | `top-toggle-bottom-panel`, `toggle-viz-dock`, `settings-toggle-bottom`, `viz-dock` | Ctrl/Cmd+J | Yes (`view.bottom`) | View menu | Workspace toolbar or palette | Yes | Critical: four routes, persisted state, maximization reset |
| Select Problems | Show/refresh type diagnostics | Bottom tab; status bar | dynamic `bottom-tab-problems`, `status-problems-button` | Bottom tab Left/Right/Home/End | Yes (`view.problems`) | Bottom panel / Problems | Status bar and palette | Yes | High |
| Select Output | Show latest run/semantic output | Bottom tab; Run opens it implicitly | dynamic `bottom-tab-output`, `bottom-program-output` | Bottom tab navigation | No | Bottom panel / Output | Run result may focus it | Yes | Medium |
| Select semantic/runtime tab | Switch among Structure, Value, Machine, Compare, Rewrite | Bottom tab strip | dynamic `bottom-tab-{structure,value,machine,compare,subst}` | Left/Right/Home/End | Machine/Compare/Rewrite only | Bottom panel / Semantics and runtime | Command palette | Yes | High: IDs and ARIA are generated at initialization |
| Re-run/reset active tool | Re-render reduction or reset active machine/compare/rewrite | Bottom toolbar | `viz-rerun` | — | No | Bottom semantic tool toolbar | Command palette | No | High: behavior depends on active tab |
| Arrange reduction blocks | Lay out Structure/Value visualization by evaluation order | Bottom toolbar, only workspace visualizations | `viz-arrange` | — | No | Bottom semantic tool toolbar | Workspace context menu permitted | No | High: custom renderer workspace |
| Maximize/restore bottom tools | Toggle bottom panel maximization | Bottom toolbar | `viz-maximize` | — | No | Bottom panel | View menu/palette | No | High: `bottom-maximized` state and resize coordination |
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
| Download screenshot | Serialize non-empty Blockly workspace to PNG | Blockly workspace context menu, including semantic workspaces | Registry ID `miniJavaDownloadScreenshot` | Blockly-owned | No | Workspace context menu | Overflow menu or palette | No | Critical: SVG cloning, styles, renderer geometry |
| Blockly built-in block/workspace actions | Library-owned delete, duplicate, comments, collapse, disable, cleanup/other enabled entries | Blockly context menus | Blockly registry-owned; no application IDs | Blockly-owned | No | Blockly context menu | Command palette only if explicitly bridged | No | Critical: list varies with Blockly/config; do not suppress wholesale |

## Duplication findings for later migration

The following duplication can be reduced later without deleting reachability, after handlers are centralized and regression coverage exists:

- Keep `run-program` as the workspace primary action and Header Run as the second explicit route; the Run-sidebar copy can be removed once its activity still exposes analysis tools and the palette retains `run.program`.
- Keep one View-menu bottom-panel toggle plus `Ctrl/Cmd+J`; the header `top-toggle-bottom-panel`, workspace `toggle-viz-dock`, and Settings `settings-toggle-bottom` do not all need to remain visible.
- Keep one View-menu inspector toggle plus inspector-local hide/show affordances needed for recovery; the Settings duplicate can later be removed.
- Keep perspectives in Settings and the command palette; either the header selector or the status-bar launcher can become a single compact secondary route.
- Machine, Compare, and Rewrite should remain primary bottom-panel tabs with palette entries; sidebar launch buttons are redundant once the bottom tab strip is reachable when closed.
- Structure and Value should remain bottom tools and method-call context actions; generic sidebar copies are optional.
- Fit, zoom, and undo/redo currently overlap with Blockly-owned controls/keyboard behavior. Remove only a visibly duplicated control, never the underlying Blockly capability.

No duplicate is authorized for removal by this inventory. Any future removal must first prove keyboard, responsive, and command-palette reachability.
