# Final UI visual comparison package

This package records the final Block-MiniJava workbench after the domain-workbench refactor. Each state is captured in both themes from a clean application load. The images are viewport screenshots, not cropped mockups.

Capture source: `test/ui/final-comparison.spec.ts`  
Image directory: [`screenshots/final/`](screenshots/final/)

## Capture manifest

| Screenshot | Viewport | Theme | Active perspective | Visible panels | Feature being verified | Expected design principle |
|---|---:|---|---|---|---|---|
| [01 dark](screenshots/final/01-default-edit-dark-1440x900.png) | 1440 × 900 | Dark | Edit | Blocks toolbox, workspace, Code inspector; bottom closed | Default editing layout and primary commands | Quiet three-region workbench; the workspace dominates and Run remains labelled. |
| [01 light](screenshots/final/01-default-edit-light-1440x900.png) | 1440 × 900 | Light | Edit | Blocks toolbox, workspace, Code inspector; bottom closed | Default editing layout and primary commands | Quiet three-region workbench; the workspace dominates and Run remains labelled. |
| [02 dark](screenshots/final/02-toolbox-search-dark-1920x1080.png) | 1920 × 1080 | Dark | Edit | Blocks search, filtered toolbox, workspace, Code inspector | Active block search for `integer` | Search stays inside the Blocks panel and filters grammatical categories without adding command controls. |
| [02 light](screenshots/final/02-toolbox-search-light-1920x1080.png) | 1920 × 1080 | Light | Edit | Blocks search, filtered toolbox, workspace, Code inspector | Active block search for `integer` | Search stays inside the Blocks panel and filters grammatical categories without adding command controls. |
| [03 dark](screenshots/final/03-code-inspector-dark-1440x900.png) | 1440 × 900 | Dark | Edit | Blocks toolbox, workspace, Code inspector | Editable generated MiniJava source | Static source lives in the right inspector, with an explicit active tab and no competing bottom output. |
| [03 light](screenshots/final/03-code-inspector-light-1440x900.png) | 1440 × 900 | Light | Edit | Blocks toolbox, workspace, Code inspector | Editable generated MiniJava source | Static source lives in the right inspector, with an explicit active tab and no competing bottom output. |
| [04 dark](screenshots/final/04-types-inspector-dark-1440x900.png) | 1440 × 900 | Dark | Edit | Blocks toolbox, workspace, Types inspector | Typing derivation display | Static type information belongs with Code and Outline in the inspector, not in a floating tool card. |
| [04 light](screenshots/final/04-types-inspector-light-1440x900.png) | 1440 × 900 | Light | Edit | Blocks toolbox, workspace, Types inspector | Typing derivation display | Static type information belongs with Code and Outline in the inspector, not in a floating tool card. |
| [05 dark](screenshots/final/05-problems-panel-dark-1024x768.png) | 1024 × 768 | Dark | Edit | Workspace and Problems bottom panel; side panels are drawer-capable | Diagnostics view in compact layout | Diagnostics are a bottom result, while compact side panels do not steal workspace width. |
| [05 light](screenshots/final/05-problems-panel-light-1024x768.png) | 1024 × 768 | Light | Edit | Workspace and Problems bottom panel; side panels are drawer-capable | Diagnostics view in compact layout | Diagnostics are a bottom result, while compact side panels do not steal workspace width. |
| [06 dark](screenshots/final/06-output-panel-dark-1024x768.png) | 1024 × 768 | Dark | Edit | Workspace and Output bottom panel; side panels are drawer-capable | Program Run opens Output | Execution results stay separate from static inspector information. |
| [06 light](screenshots/final/06-output-panel-light-1024x768.png) | 1024 × 768 | Light | Edit | Workspace and Output bottom panel; side panels are drawer-capable | Program Run opens Output | Execution results stay separate from static inspector information. |
| [07 dark](screenshots/final/07-semantics-panel-dark-1024x768.png) | 1024 × 768 | Dark | Edit | Workspace and Semantics bottom panel; secondary semantic tabs visible | Semantic/runtime navigation | One clear Semantics region contains the supported runtime models without duplicating visible panels. |
| [07 light](screenshots/final/07-semantics-panel-light-1024x768.png) | 1024 × 768 | Light | Edit | Workspace and Semantics bottom panel; secondary semantic tabs visible | Semantic/runtime navigation | One clear Semantics region contains the supported runtime models without duplicating visible panels. |
| [08 dark](screenshots/final/08-bottom-maximized-dark-768x1024.png) | 768 × 1024 | Dark | Edit | Maximized Output bottom panel and workspace chrome | Bottom-panel maximize | Runtime/result inspection can expand without losing a visible restore action. |
| [08 light](screenshots/final/08-bottom-maximized-light-768x1024.png) | 768 × 1024 | Light | Edit | Maximized Output bottom panel and workspace chrome | Bottom-panel maximize | Runtime/result inspection can expand without losing a visible restore action. |
| [09 dark](screenshots/final/09-toolbox-hidden-dark-1440x900.png) | 1440 × 900 | Dark | Edit | Workspace and Code inspector; Blocks toolbox hidden | Toolbox visibility persistence path | Hiding a panel increases useful editing area without removing restoration access. |
| [09 light](screenshots/final/09-toolbox-hidden-light-1440x900.png) | 1440 × 900 | Light | Edit | Workspace and Code inspector; Blocks toolbox hidden | Toolbox visibility persistence path | Hiding a panel increases useful editing area without removing restoration access. |
| [10 dark](screenshots/final/10-inspector-hidden-dark-1440x900.png) | 1440 × 900 | Dark | Edit | Blocks toolbox and workspace; inspector hidden | Inspector visibility persistence path | Block editing can take the full workspace while source remains restorable. |
| [10 light](screenshots/final/10-inspector-hidden-light-1440x900.png) | 1440 × 900 | Light | Edit | Blocks toolbox and workspace; inspector hidden | Inspector visibility persistence path | Block editing can take the full workspace while source remains restorable. |
| [11 dark](screenshots/final/11-mobile-drawer-open-dark-390x844.png) | 390 × 844 | Dark | Edit | Open Blocks/Search drawer, workspace, compact header | Mobile drawer open state | A touch-sized drawer keeps search and categories reachable while the canvas remains identifiable. |
| [11 light](screenshots/final/11-mobile-drawer-open-light-390x844.png) | 390 × 844 | Light | Edit | Open Blocks/Search drawer, workspace, compact header | Mobile drawer open state | A touch-sized drawer keeps search and categories reachable while the canvas remains identifiable. |
| [12 dark](screenshots/final/12-minijava-program-loaded-dark-1920x1080.png) | 1920 × 1080 | Dark | Edit | Blocks toolbox, workspace with Simple Sum, Code inspector | Representative MiniJava program | Broad grammatical color families and connector silhouettes support program reading without visual noise. |
| [12 light](screenshots/final/12-minijava-program-loaded-light-1920x1080.png) | 1920 × 1080 | Light | Edit | Blocks toolbox, workspace with Simple Sum, Code inspector | Representative MiniJava program | Broad grammatical color families and connector silhouettes support program reading without visual noise. |
| [13 dark](screenshots/final/13-runtime-visualization-dark-768x1024.png) | 768 × 1024 | Dark | Edit | Workspace and active Call-by-Value semantic visualization | Runtime visualization from a loaded program | Runtime tools are contained in the bottom Semantics region and remain reachable on a tablet viewport. |
| [13 light](screenshots/final/13-runtime-visualization-light-768x1024.png) | 768 × 1024 | Light | Edit | Workspace and active Call-by-Value semantic visualization | Runtime visualization from a loaded program | Runtime tools are contained in the bottom Semantics region and remain reachable on a tablet viewport. |

## Comparison checklist

- [x] No ambiguous icon row at 1440px: Undo, Redo, Zoom out, Zoom in, and Fit use recognizable icon-only controls; Run remains labelled and primary.
- [x] No duplicated primary command surfaces: command routes are contextual rather than a repeated toolbox command strip. The intentional header/workspace Run affordances point to the same primary action.
- [x] No mixed application icon family: application chrome uses the shared SVG sprite; Blockly-native canvas controls remain library-owned editing controls.
- [x] No excessive decorative cards: panels are structural regions with restrained borders and radii, rather than nested marketing-style containers.
- [x] No internal renderer terminology in the status bar: status text uses user-facing MiniJava and workspace language.
- [x] Restrained block color categories: seven grammatical families replace saturated per-block coloring in both themes.
- [x] Grammar connector shapes remain visible: category color is broad; connector silhouettes and checks retain fine-grained grammar information.
- [x] Clear separation between inspector and runtime output: Code, Types, and Outline stay in the right inspector; Problems, Output, and Semantics stay below the workspace.
- [x] Responsive controls remain reachable: desktop panels resize, compact panels become drawers, the compact header exposes menus, and mobile captures retain a labelled Run control and drawer access.

The capture test completed successfully in Chromium with 26 images: 13 representative states × 2 themes. It is intentionally separate from the approved visual-regression baseline suite so this documentation package can be regenerated without redefining baseline assertions.
