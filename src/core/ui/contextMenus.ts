import * as Blockly from 'blockly';
import { openVisualization } from './visualizationPanel';

type BlockScope = { block?: Blockly.BlockSvg };

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
    }
  ];

  for (const item of items) {
    if (!registry.getItem(item.id)) registry.register(item);
  }
}

