import * as Blockly from 'blockly';
import { openVisualization } from './visualizationPanel';
import { downloadScreenshot } from './screenshot';

type BlockScope = { block?: Blockly.BlockSvg };
type WorkspaceScope = { workspace?: Blockly.WorkspaceSvg };

const ScopeType = Blockly.ContextMenuRegistry.ScopeType;
type Item = Blockly.ContextMenuRegistry.RegistryItem;

let registered = false;

function show(when: boolean): 'enabled' | 'hidden' {
  return when ? 'enabled' : 'hidden';
}

export function registerMiniJavaContextMenus(): void {
  if (registered) return;
  registered = true;

  const registry = Blockly.ContextMenuRegistry.registry;
  const items: Item[] = [
    {
      id: 'miniJavaVizStructure',
      scopeType: ScopeType.BLOCK,
      displayText: 'Visualize ▸ Call-by-Structure',
      weight: 100,
      preconditionFn: (scope: BlockScope) => show(scope.block?.type === 'mj_expr_method_call'),
      callback: (scope: BlockScope) => {
        if (scope.block) openVisualization('structure', scope.block);
      }
    },
    {
      id: 'miniJavaVizValue',
      scopeType: ScopeType.BLOCK,
      displayText: 'Visualize ▸ Call-by-Value',
      weight: 101,
      preconditionFn: (scope: BlockScope) => show(scope.block?.type === 'mj_expr_method_call'),
      callback: (scope: BlockScope) => {
        if (scope.block) openVisualization('value', scope.block);
      }
    },
    {
      // Download the workspace's blocks as a PNG. WORKSPACE scope, so it appears on the
      // main program and on any visualization/stepper workspace.
      id: 'miniJavaDownloadScreenshot',
      scopeType: ScopeType.WORKSPACE,
      displayText: 'Download Screenshot',
      weight: 99,
      preconditionFn: (scope: WorkspaceScope) =>
        show(!!(scope.workspace && scope.workspace.getTopBlocks(false).length > 0)),
      callback: (scope: WorkspaceScope) => {
        const ws = scope.workspace ?? (Blockly.getMainWorkspace() as Blockly.WorkspaceSvg);
        if (ws) downloadScreenshot(ws);
      }
    }
  ];

  for (const item of items) {
    if (!registry.getItem(item.id)) registry.register(item);
  }
}

