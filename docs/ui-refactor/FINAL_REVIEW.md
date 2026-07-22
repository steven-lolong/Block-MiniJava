# Block-MiniJava domain-workbench final review

Review date: 2026-07-22  
Reviewed branch: `refactor/domain-specific-workbench`  
Merge base: `ff4566035f7b0cf299ad9697118215f18470e58c` (`origin/main`)  
Review scope: the complete branch diff, all files in `docs/ui-refactor`, the rendered workbench at the six required viewports, and the full automated test surface.

The review found no Critical defects. Four evidence-backed High defects were corrected. Two unambiguous, isolated Medium defects and six Low cleanup defects were also corrected. The remaining Medium findings are documented and were deliberately not changed because their corrections require interaction-design or test-infrastructure decisions beyond a conservative final pass.

## Review findings

### Critical

None found. The reviewed branch did not lose program data, block serialization, generated MiniJava, semantic behavior, connector geometry, or access to a primary workflow.

### High

#### H1 — The editable source view trapped the standard keyboard exit path — corrected

- **File and line:** `src/core/ui/codeEditor.ts:203-225`, with the accessible instruction at `src/core/ui/codeEditor.ts:260-266`.
- **User-visible consequence:** A keyboard-only user could not leave the source editor with `Shift+Tab`; every `Tab` was consumed as indentation. This made the right inspector a practical keyboard trap.
- **Technical cause:** The editor's `keydown` handler unconditionally prevented the default action for `Tab`.
- **Recommended correction:** Preserve unmodified `Tab` as two-space indentation, allow `Shift+Tab` and modified Tab chords to traverse normally, and provide an explicit `Escape`, then `Tab`, exit. This correction is implemented and described through `aria-describedby`.
- **Regression risk:** Medium. Text insertion and import debouncing share the same handler. Dedicated browser tests now cover indentation, `Shift+Tab`, and `Escape` then `Tab`.

#### H2 — The command palette declared a modal interaction without containing it — corrected

- **File and line:** `src/core/ui/commandPalette.ts:28-168`; `src/index.html:430-438`.
- **User-visible consequence:** Focus could move behind the visible palette, background controls remained interactive, and assistive technology was not told which listbox option the input controlled and selected.
- **Technical cause:** The palette had `role="dialog"` and `aria-modal="true"`, but did not inert the application, contain Tab focus, expose combobox expansion, or maintain `aria-activedescendant`.
- **Recommended correction:** Apply `inert` to the application while open, retain focus in the palette, model the search as a combobox controlling a listbox, assign stable option IDs, update the active descendant, and restore focus on close. Implemented.
- **Regression risk:** Medium. The palette is a global command surface. Browser tests exercise F1 open, active-option navigation, Tab containment, Escape close, background inertness, command invocation, and focus restoration.

#### H3 — The command palette did not provide the documented fallback route for all commands — corrected

- **File and line:** `src/core/ui/app.ts:1365-1413`.
- **User-visible consequence:** Low-frequency or temporarily hidden commands—including examples, individual inspector and bottom views, zoom reset, screenshot, maximization, copy, print, and About—could become unreachable when their normal chrome was collapsed.
- **Technical cause:** The intermediate refactor registered only 22 commands even though the palette is the required stable access route for commands displaced from panels.
- **Recommended correction:** Register bridges to the existing handlers without adding new behavior. The palette now contains 39 stable command IDs across File, Run, Analysis, View, Code, Types, Workspace, Perspective, Preferences, and Help.
- **Regression risk:** High. A wrong bridge could change workspace or panel state. Tests assert the exact inventory and execute representative file, view, workspace, semantic, maximize, and dialog bridges.

#### H4 — Small secondary text and focus indicators could fall below usable contrast — corrected

- **File and line:** `src/assets/css/tokens.css:61-64`; `src/assets/css/workbench.css:518-522, 1316-1319, 1753-1756`; `src/assets/css/codeEditor.css:121-132`.
- **User-visible consequence:** Menu state, outline metadata, editor line numbers, and the focus ring could be difficult to distinguish, particularly in the light theme and on recessed surfaces.
- **Technical cause:** Small text reused a muted token whose measured combinations were below 4.5:1, while the focus outline used a partially transparent accent.
- **Recommended correction:** Use the secondary text token for small informative text and the full focus-ring token for the focus outline. Implemented; both theme paths are covered by computed-contrast and visible-focus checks.
- **Regression risk:** Low. The correction changes presentation tokens only and is protected by both-theme accessibility and visual tests.

### Medium

#### M1 — View settings used menu-item roles in a dialog — corrected

- **File and line:** `src/index.html:98-115`; state synchronization at `src/core/ui/app.ts:671-741`.
- **User-visible consequence:** Screen readers encountered orphan `menuitemcheckbox` semantics without a menu owner, and the mixed settings popup did not match its announced structure.
- **Technical cause:** Menu-item roles were retained after the View surface became a mixed dialog containing buttons, a select, and an input.
- **Recommended correction:** Use native buttons with `aria-pressed` and retain the dialog label. Implemented.
- **Regression risk:** Low. IDs and click handlers are unchanged; an automated ownership check guards against recurrence.

#### M2 — The block-search SVG escaped its input and created decorative empty space — corrected

- **File and line:** `src/index.html:181-185`; `src/assets/css/workbench.css:978-1000`.
- **User-visible consequence:** The search icon rendered below the input instead of inside it, increasing the toolbox search row height at every viewport and weakening the left panel hierarchy.
- **Technical cause:** CSS still targeted `.toolbox-search span` after the markup had moved to the shared SVG sprite.
- **Recommended correction:** Target the direct `.app-icon` child and keep it absolutely centered inside the search field. Implemented, with a geometry assertion in the UI smoke suite.
- **Regression risk:** Low. This is a selector-only correction.

#### M3 — Compact drawers do not contain keyboard focus — deferred

- **File and line:** drawer state and focus return in `src/core/ui/app.ts:136-177, 1461-1524`; compact layout in `src/assets/css/workbench.css:1931-2002`.
- **User-visible consequence:** Although the scrim blocks pointer interaction and Escape closes the drawer, a long keyboard traversal can reach controls visually obscured behind an open drawer.
- **Technical cause:** Drawers are visually modal but do not make the covered workbench inert or cycle focus within the active drawer.
- **Recommended correction:** Define whether these drawers are modal. If modal, inert the covered region and add a scoped focus cycle while retaining current focus return and persisted visibility semantics.
- **Regression risk:** High. Drawer state is shared with desktop visibility, perspectives, and two responsive breakpoints; a focus-scope change needs dedicated cross-panel testing.

#### M4 — The Outline announces a tree without implementing tree keyboard semantics — deferred

- **File and line:** `src/index.html:261-264`; generation at `src/core/ui/app.ts:437-483`.
- **User-visible consequence:** Assistive technology expects Arrow-key tree navigation and expansion behavior, but users currently receive ordinary tabbable buttons.
- **Technical cause:** Generated nodes use `role="treeitem"` and `aria-level`, but there is no roving tabindex or Arrow Up/Down/Left/Right implementation.
- **Recommended correction:** Either implement the complete ARIA tree interaction model or expose the flat navigable outline as a list until hierarchical interaction is supported.
- **Regression risk:** Medium. Selection is coupled to Blockly block highlighting and scrolling.

#### M5 — Semantic Arrange and Re-run remain unfamiliar icon-only actions — deferred

- **File and line:** `src/index.html:287-290`.
- **User-visible consequence:** New and touch users must infer domain-specific operations from icons or wait for a tooltip; these are less universal than undo, redo, or zoom.
- **Technical cause:** The bottom dock uses icon-only controls for all header actions to conserve width.
- **Recommended correction:** Show short `Re-run` and `Arrange` labels at wider widths and move labelled equivalents into an overflow surface on narrow screens.
- **Regression risk:** Medium. Labels affect the already constrained semantic-tab header and require six-viewport visual approval.

#### M6 — The two-item activity rail still borrows a generic editor-shell pattern — deferred

- **File and line:** `src/index.html:160-170`; `src/assets/css/workbench.css:789-849`.
- **User-visible consequence:** The shell can read as an imitation of a general-purpose code editor before the grammar-aware blocks establish Block-MiniJava's identity.
- **Technical cause:** Blocks and block search are represented through a narrow vertical activity rail with an active edge marker, despite both belonging to one domain toolbox.
- **Recommended correction:** In a later interaction-design pass, evaluate integrating search into the Blocks panel header while preserving the same drawer triggers, persistence, and keyboard routes.
- **Regression risk:** High. The rail currently owns compact-drawer triggers and focus restoration, so this is not safe cleanup work.

#### M7 — Accessibility automation is intentionally lightweight and Chromium-only — deferred

- **File and line:** `test/ui/accessibility.ts:8-12`; `playwright.config.ts:23-39`.
- **User-visible consequence:** Computed-name edge cases, broader ARIA rules, and engine-specific focus behavior may escape automated detection.
- **Technical cause:** The suite uses a repository-local, dependency-free contract and one Chromium project rather than a standards rule engine and multiple browser engines.
- **Recommended correction:** Add an axe-core pass and optional Firefox/WebKit accessibility smoke jobs while retaining the targeted workbench assertions.
- **Regression risk:** Low to production; Medium to CI stability and baseline maintenance.

#### M8 — Typing-derivation print behavior lacks a browser print test — deferred

- **File and line:** `src/core/ui/typingPanel.ts:226-316`.
- **User-visible consequence:** DOM detachment, print scaling, or cleanup could regress without failing the current suite.
- **Technical cause:** Tests exercise Types rendering and command reachability but do not run print media or PDF generation.
- **Recommended correction:** Add a headless print-to-PDF smoke test that verifies cleanup and a non-empty derivation.
- **Regression risk:** Low; test-only, but browser print behavior can be timing-sensitive.

#### M9 — The production payload exceeds webpack's recommended size budget — deferred

- **File and line:** single entry and copied images in `webpack.config.js:5-44`; `src/assets/images/logo.png`; `src/assets/images/only-logo.png`.
- **User-visible consequence:** The 1020 KiB main script and 628/270 KiB logo images increase first-load cost, especially on mobile.
- **Technical cause:** Blockly and all semantic tools ship in one entry, and the raster identity assets are not optimized for their rendered size.
- **Recommended correction:** Optimize the two PNG assets first, then profile safe split points before considering lazy loading of semantic panels.
- **Regression risk:** Medium for image optimization; High for module splitting because semantic panels share Blockly registration and state.

### Low

#### L1 — The functional Blockly grid was visually too prominent — corrected

- **File and line:** theme tokens at `src/assets/css/tokens.css:109,158`; scoped rendering at `src/assets/css/workbench.css:1228-1236`.
- **User-visible consequence:** Repeated grid marks competed with the blocks and read as decorative texture.
- **Technical cause:** Blockly's functional snap grid retained its default stroke instead of the workbench's low-contrast grid token.
- **Recommended correction:** Keep grid spacing and snapping intact while reducing only the rendered stroke contrast. Implemented.
- **Regression risk:** Low. Blockly configuration and metrics are unchanged.

#### L2 — About content exposed an internal renderer name and stale product claims — corrected

- **File and line:** `src/index.html:442-462`.
- **User-visible consequence:** Users saw an implementation codename and an inaccurate version/feature description instead of the actual product and implemented garbage collector.
- **Technical cause:** About copy predated the semantic and UI refactors.
- **Recommended correction:** Describe Block-MiniJava, its existing static/runtime tools, mark-and-sweep collection, and supported file formats in concise product language. Implemented without marketing copy.
- **Regression risk:** Low; copy only.

#### L3 — The About backdrop used decorative blur — corrected

- **File and line:** `src/assets/css/workbench.css:188-196`.
- **User-visible consequence:** The dialog introduced a soft, fashionable effect inconsistent with the otherwise restrained workbench.
- **Technical cause:** A backdrop blur survived from the superseded interface styling.
- **Recommended correction:** Retain only the modal scrim color. Implemented.
- **Regression risk:** Low.

#### L4 — Dead aliases, tokens, and zoom-indicator code obscured the final CSS/DOM contract — corrected

- **File and line:** authoritative token surface in `src/assets/css/tokens.css:1-198`; stylesheet contract in `docs/ui-refactor/STYLESHEET_MAP.md`; command implementation in `src/core/ui/app.ts:1365-1413`.
- **User-visible consequence:** There was little immediate visual impact, but future changes could accidentally revive inconsistent legacy styling or a removed zoom pill.
- **Technical cause:** Compatibility aliases, unused state tokens, selectors, and the indicator updater remained after their consumers were removed.
- **Recommended correction:** Remove only items proven unused by repository-wide search and retain zoom reset through the palette. Implemented: 11 aliases, 3 unused tokens, dead `.zoom-pill` selectors, and the unused updater were removed.
- **Regression risk:** Low. Search, type checking, browser tests, and production build found no consumers.

#### L5 — Runtime status used improvised Unicode warning/error marks — corrected

- **File and line:** `src/core/ui/app.ts:397-409`; `src/core/ui/substPanel.ts:229-235`.
- **User-visible consequence:** The glyphs mixed icon systems and could be announced inconsistently by assistive technology.
- **Technical cause:** Runtime strings embedded cross and warning glyphs instead of expressing status in text.
- **Recommended correction:** Prefix messages with `Error:` and `Warning:`. Implemented; evaluator and semantic behavior are unchanged.
- **Regression risk:** Low. Only presentation strings changed, and the complete semantic suite passes.

#### L6 — The semantic dock exposed raw Blockly type identifiers — corrected

- **File and line:** `src/core/ui/visualizationPanel.ts:125-132`.
- **User-visible consequence:** Labels such as `mj_expr_method_call` exposed internal implementation vocabulary and added noisy, truncation-prone chrome.
- **Technical cause:** The selected block's serialization type was appended to the human-readable semantic-view title.
- **Recommended correction:** Keep the supported view name and omit the raw block type. Implemented.
- **Regression risk:** Low. Workspace selection and semantic state are untouched.

## Structured review coverage

| Area | Result | Evidence and disposition |
|---|---|---|
| 1. Functionality preservation | Pass | Complete unit, semantic, UI, responsive, and visual suites pass; no domain model or serialization behavior was changed in this review. |
| 2. Command reachability | Pass after H3 | Header, toolbar, menus, settings, shortcuts, panels, and 39-command palette form complementary routes. |
| 3. DOM and TypeScript coupling | Pass | Required IDs/data attributes were retained; static and runtime duplicate-ID checks pass; dependency documents were updated. |
| 4. Responsive behavior | Pass with M3 | All six viewports pass reachability, drawer, resizer, maximize, and resize tests. Drawer focus containment remains future work. |
| 5. Accessibility | Pass with M3/M4/M7 | Landmarks, headings, names, contrast, focus, tabs, menus, modal palette, and reduced motion pass the local contract. |
| 6. Keyboard navigation | Pass with M4 | Required end-to-end keyboard routes pass. Code-editor exit and command-palette focus defects were corrected. |
| 7. Layout persistence | Pass | Theme, perspective, visibility, dimensions, tabs, autosave interval, and invalid-value fallback are exercised. |
| 8. Light and dark themes | Pass | Both themes pass contrast checks and approved visual baselines; the same semantic hierarchy is retained. |
| 9. Perspective behavior | Pass | Edit, Debug, Type Analysis, Presentation, and Custom behavior remains coordinated and persisted. |
| 10. Blockly behavior | Pass | Search, category expansion, drag/drop, click-to-add, undo/redo, zoom, fit, Run, hide/restore, and resize behavior pass. |
| 11. Grammar-aware connector shapes | Pass | Horizontal, vertical, and block-to-shape mappings pass unchanged-contract tests. |
| 12. Block category colors | Pass | Every registered block maps explicitly to one of seven grammatical families; no arbitrary fallback or per-block palette remains. |
| 13. Code editing | Pass after H1 | Editing, highlighting, scrolling, indentation, practical tablet sizing, focus exit, and import errors are covered. |
| 14. Bidirectional synchronization | Pass | Block-to-code, code-to-block, debounce, diagnostics, serialization, and example round trips pass. |
| 15. Semantic/runtime panels | Pass | Problems, Output, Call-by-Structure, Call-by-Value, CESK, A vs B, Rewrite, execution state, and GC behavior remain reachable and stateful. |
| 16. Test quality | Strong with M7/M8 | Functional coverage is broad and state-oriented; standards-engine, cross-browser, and print coverage are the main gaps. |
| 17. Dead CSS | Pass after L4 | Proven-unused aliases, tokens, selectors, and updater code were removed; retained selectors have documented consumers. |
| 18. Visual consistency | Pass with M5 | Flat surfaces, restrained radii, consistent spacing, one SVG icon sprite, quiet toolbar, and primary Run are retained. |
| 19. Product identity | Pass with M6 | MiniJava grammar, connector silhouettes, grammatical colors, type derivation, and semantic models establish a domain identity; the generic activity rail remains. |
| 20. Remaining “AI slop” patterns | Substantially resolved | No gradients, decorative illustrations, badges, hero headings, decorative glow, or per-block arbitrary colors remain. Shadows are limited to elevation/drawers or semantic state rings. Remaining concerns are M5 and M6. |

## 1. Completed changes

- Corrected code-editor keyboard exit behavior while preserving two-space Tab indentation.
- Made the command palette a coherent modal combobox/listbox interaction with focus restoration.
- Expanded the command inventory from 22 to 39 existing-handler commands.
- Corrected View settings semantics, focus contrast, and small-text contrast.
- Repaired the block-search icon layout and added a geometry regression check.
- Subdued only the visual stroke of the functional Blockly snap grid.
- Removed the About blur and replaced stale/internal About copy with accurate product content.
- Removed proven-dead CSS aliases, tokens, zoom-pill selectors, and zoom-indicator code.
- Replaced improvised status glyphs with text and removed raw Blockly type identifiers from visible dock copy.
- Updated `BLOCK_COLOR_CLASSIFICATION.md`, `COMMAND_INVENTORY.md`, `DOM_DEPENDENCY_MAP.md`, `REFRACTORING_CONSTRAINTS.md`, and `STYLESHEET_MAP.md` to match the final implementation.
- Updated affected visual baselines after inspecting the resulting desktop, tablet, mobile, light, dark, perspective, and grammatical-family states.

No block definition, block structure, connection check, output/input type, serializer, parser, generator, runtime transition, or semantic model was changed.

## 2. Preserved functionality

The following branch behavior remains intact:

- **Left panel:** Blocks title, search, categorized toolbox, expansion, drag/drop, click-to-add, persistent visibility, responsive drawer, scrim, Escape close, focus return, and desktop resizer.
- **Workspace toolbar:** undo, redo, zoom out, zoom in, fit, bottom-tools toggle, labelled primary Run, and contextual restoration of hidden side panels; reset zoom and screenshot remain in the command palette.
- **Right inspector:** Code, Types, and Outline with independent active-tab persistence, maximization, resizing, and compact drawer behavior.
- **Bottom panel:** Problems, Output, and Semantics, with nested Call-by-Structure, Call-by-Value, CESK, A vs B, and Rewrite views, maximization, resizing, and active-view persistence.
- **Blockly:** custom `bmj-thrasos` renderer, grammar-aware connector shapes, comments/collapse/disable behavior, grid snapping, theme updates, metrics, SVG resize, selection, serialization, and examples.
- **MiniJava:** editable source, generated source, two-way synchronization, type diagnostics and derivations, outline navigation, execution output, both value models, substitution/rewrite semantics, execution state, and mark-and-sweep garbage collection.

## 3. Command reachability summary

The palette is a fallback, not a duplicate toolbar. Frequent commands remain where users expect them; less-frequent commands stay reachable without crowding the toolbox or workspace toolbar.

| Command group | Palette count | Primary visible routes |
|---|---:|---|
| File | 6 | File menu, Examples button, keyboard shortcuts |
| Run | 1 | Workspace Run, `Ctrl+F5` |
| Analysis | 5 | Semantics secondary tabs and command palette |
| View | 12 | View settings, inspector/bottom tabs, activity controls, `Ctrl+J` |
| Code and Types | 2 | Inspector actions and command palette |
| Workspace | 7 | Quiet workspace toolbar plus reset/screenshot in palette |
| Perspective | 4 | View settings selector and command palette |
| Preferences and Help | 2 | View settings and More/About |
| **Total** | **39** | F1 or `Ctrl+Shift+P` always opens the palette |

The workspace toolbar is the single visible Run surface. Panel views retain contextual tab plus palette access, and global keyboard shortcuts retain their existing actions.

## 4. Responsive verification matrix

| Viewport | Panel mode | Verification result |
|---|---|---|
| 1920 × 1080 | Docked toolbox and inspector; active resizers | Pass: complete header labels, primary Run, panel sizing, bottom maximize/restore, workspace metrics, visual baseline. |
| 1440 × 900 | Docked toolbox and inspector; active resizers | Pass: primary commands remain labelled and do not collapse into an ambiguous icon strip; menus and all perspectives remain reachable. |
| 1280 × 800 | Narrow docked panels; active resizers | Pass: workspace remains practical, toolbar remains quiet, and blocks stay dominant. |
| 1024 × 768 | Toolbox and inspector drawers; inactive side resizers | Pass: drawer/scrim/Escape/focus return, bottom maximize, code editing, header menus, and workspace resize. |
| 768 × 1024 | Tablet drawers and compact header | Pass: menu toggle exposes all header commands, touch targets remain usable, source editing remains practical, and no panel is stranded. |
| 390 × 844 | Mobile drawers and compact header | Pass: workspace, Run, menus, search drawer, inspector drawer, scrims, Escape, focus return, and bottom tools remain reachable. |

All six sizes are exercised by `test/ui/responsive.spec.ts`; all six also have an approved visual state across `test/ui/visual.spec.ts` (the mobile baseline intentionally captures the open Blocks/Search drawer).

## 5. Accessibility verification

- One logical H1 and ordered section headings are present.
- Header, navigation, main workbench, asides, bottom tools, status, dialogs, and labelled tablists use explicit landmarks or accessible region names.
- Visible controls have accessible names; icon-only controls retain `aria-label` and tooltips.
- Inspector, bottom, and Semantics tab rows expose selected state, controlled panels, and roving keyboard navigation.
- Header menus support Arrow navigation, Home/End where applicable, Escape close, and trigger focus restoration.
- The command palette now exposes dialog, combobox, listbox, option, active-descendant, inert-background, and focus-return behavior coherently.
- The code editor now documents indentation and keyboard exit behavior.
- Both themes pass the local text/control contrast checks; focus indicators are visible and no essential grammatical information depends on color alone.
- Reduced-motion media behavior passes.
- Static and live-DOM duplicate-ID checks pass.

This is not a claim of full WCAG conformance. M3, M4, and M7 identify the remaining accessibility work precisely.

## 6. Theme verification

- Light and dark theme choice persists and invalid stored values fall back safely.
- Shell surfaces, borders, text, controls, focus, diagnostics, and semantic states remain token-driven.
- Every block receives an explicit category style in both themes. Each of Structure, Declarations, Types, Statements, Expressions, Values, and Runtime meets the tested 4.5:1 label-contrast floor.
- Adjacent grammatical families remain distinguishable without returning to a saturated per-block rainbow.
- Selected, disabled, highlighted, executing, warning, error, reference, and garbage-collection states remain separate from category color.
- Connector geometry, labels, checks, and block silhouettes continue to carry fine grammatical meaning when color is unavailable.
- There are no gradients. Remaining zero-spread rings/glows in `domain.css` communicate execution, locations, references, or GC state and are disabled or reduced under reduced motion; they are not decorative effects.

## 7. Perspective verification

| Perspective | Preserved behavior |
|---|---|
| Edit | Opens Blocks and Code; restores ordinary panel sizing; closes bottom tools. |
| Debug | Opens Blocks and Outline; opens CESK in Semantics. |
| Type Analysis | Opens Blocks and Outline; opens Problems and refreshes diagnostics. |
| Presentation | Hides toolbox, inspector, and bottom tools so the workspace dominates. |
| Custom | Represents user-driven panel/layout changes without corrupting the named perspective presets. |

Perspective selection persists. Invalid legacy values fall back to Edit. Applying a perspective closes transient compact drawers and requests Blockly/editor/semantic workspace resize. Manual panel changes continue to mark the layout Custom where intended.

## 8. Test results

| Verification | Result |
|---|---|
| `npm run typecheck` | Pass |
| `npm run lint` | Pass — source lint clean |
| `npm test` | Pass — 60 text round trips, 12 example round trips, 56 type-checker cases, 57 machine cases, 35 substitution cases, 27 evaluator cases, 400 fuzz cases, 14 reachability cases, 14 GC cases, 56 block-color/shape/serialization contracts, CESK panel smoke clean |
| UI smoke + responsive | Pass — 31/31 Chromium tests |
| Visual regression | Pass — 13/13 approved Chromium snapshots |
| Accessibility | Pass — 4/4 Chromium tests in both theme/reduced-motion paths |
| `npm run build` | Pass — production webpack build completes |
| `git diff --check` | Pass |
| Duplicate static IDs | None |
| Stale garbage-collection/About claims | None in product UI/docs |
| Removed stylesheet references | No live import references; historical removal remains documented in `STYLESHEET_MAP.md` |
| Improvised status glyphs | None in application status/output strings |

Expected non-failing warnings remain: the test bundle reports optional `ws` accelerators (`bufferutil`, `utf-8-validate`) as absent, and the production build reports the payload sizes described in M9.

## 9. Known limitations

- Compact drawers do not yet establish a keyboard focus scope (M3).
- Outline tree semantics and keyboard behavior are not fully aligned (M4).
- Re-run and Arrange are still unfamiliar icon-only actions (M5).
- The activity rail retains a generic editor-shell visual convention (M6).
- Accessibility automation is Chromium-only and does not yet include a broad standards rule engine (M7).
- Typing derivation print behavior lacks a headless print/PDF smoke test (M8).
- Production bundle and logo assets exceed webpack's recommended size budget (M9).

No known Critical or High limitation remains from this review.

## 10. Recommended future work

1. Define and implement a modal focus contract for compact drawers, then test simultaneous drawer/bottom-panel states at 1024, 768, and 390 widths.
2. Choose either a complete ARIA tree model for Outline or simpler list semantics that match current interaction.
3. Give Re-run and Arrange visible text at roomy widths and labelled overflow access on mobile.
4. Reconsider the activity rail only as a focused interaction-design task, preserving all state, persistence, and drawer invariants.
5. Add axe-core, optional Firefox/WebKit smoke coverage, and a typing-print test.
6. Optimize the two logo PNGs, then profile the main bundle before introducing any code splitting.

These are refinements to existing functionality; none require inventing a new semantic feature.

## 11. Direction confirmation

The interface now follows a quiet, domain-specific programming-workbench direction. The Blocks toolbox is focused on finding grammar elements; the workspace toolbar is limited to editing, viewport, and primary Run actions; static program views live in the right inspector; diagnostics, output, and semantic/runtime tools live in the bottom panel; and broad grammatical color families work with connector shapes instead of replacing them.

The reviewed UI has no gradients, hero treatment, decorative badges, marketing copy, arbitrary per-block rainbow, or ornamental illustration. Flat structural surfaces, restrained borders/radii, one SVG icon family, explicit MiniJava vocabulary, grammar-aware connectors, and formal semantic views make Block-MiniJava—not a generic IDE imitation—the dominant product identity. The remaining activity-rail and icon-label concerns are bounded Medium findings rather than evidence of a new visual direction.
