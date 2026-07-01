import * as Blockly from 'blockly';
import {
  createRuntimeEnv,
  evaluateBlockTree,
  evaluateExpression,
  methodArguments,
  methodParameters,
  resolveMethodCall,
  valueToBlockState,
  type ReductionKind,
  type RuntimeEnv
} from './minijavaRuntime';

export interface BlockOrder {
  order: number;
  map: Record<number, string>;
}

export const newOrder = (): BlockOrder => ({ order: 0, map: {} });

const FULL_BLOCK = { addInputBlocks: true, addNextBlocks: false } as any;
const isRendered = (workspace: Blockly.WorkspaceSvg): boolean => !!workspace.rendered;
const cloneState = <T>(value: T): T => JSON.parse(JSON.stringify(value)) as T;

function save(block: Blockly.Block): any {
  return Blockly.serialization.blocks.save(block, FULL_BLOCK);
}

function append(state: any, workspace: Blockly.WorkspaceSvg): Blockly.BlockSvg {
  return Blockly.serialization.blocks.append(cloneState(state), workspace) as Blockly.BlockSvg;
}

function field(block: Blockly.Block, name: string, fallback = ''): string {
  const value = block.getFieldValue(name);
  return value === null || value === undefined || value === '' ? fallback : String(value);
}

function descriptionBlock(workspace: Blockly.WorkspaceSvg, text: string): Blockly.BlockSvg {
  const block = workspace.newBlock('mj_viz_description') as Blockly.BlockSvg;
  block.setFieldValue(text, 'TEXT');
  if (isRendered(workspace)) {
    block.initSvg();
    block.render();
  }
  return block;
}

export function setBlockPositionInWorkSpace(block: Blockly.Block | null, order: BlockOrder): void {
  if (!block) return;
  order.map[order.order] = block.id;
  order.order += 1;
}

export function arrangeTopBlocks(workspace: Blockly.WorkspaceSvg, vspace = 32): void {
  const order = newOrder();
  for (const block of workspace.getTopBlocks(false)) setBlockPositionInWorkSpace(block, order);
  arrangeBlocksVertically(workspace, order, vspace);
}

export function arrangeBlocksVertically(workspace: Blockly.WorkspaceSvg, order: BlockOrder, vspace = 32): void {
  if (!isRendered(workspace)) return;
  Blockly.Events.disable();
  try {
    let cursorY = 0;
    for (let i = 0; i <= order.order; i++) {
      const block = workspace.getBlockById(order.map[i]) as Blockly.BlockSvg | null;
      if (!block || !block.isMovable()) continue;
      const xy = block.getRelativeToSurfaceXY();
      block.moveBy(-xy.x, cursorY - xy.y);
      block.snapToGrid?.();
      cursorY = block.getRelativeToSurfaceXY().y + block.getHeightWidth().height + vspace;
    }
  } finally {
    Blockly.Events.enable();
  }
}

function replaceBlock(target: Blockly.Block, replacement: Blockly.Block): void {
  const parent = target.getParent();
  if (!parent) return;
  const input = (parent as any).getInputWithBlock?.(target);
  if (!input?.connection || !replacement.outputConnection) return;
  input.connection.disconnect();
  input.connection.connect(replacement.outputConnection);
  target.dispose(false);
}

function substituteIdentifiers(root: Blockly.Block, workspace: Blockly.WorkspaceSvg, replacements: Map<string, any>): void {
  const descendants = root.getDescendants(false).slice().reverse();
  for (const block of descendants) {
    if (block.type !== 'mj_expr_identifier') continue;
    const replacementState = replacements.get(field(block, 'NAME', 'x'));
    if (!replacementState) continue;
    replaceBlock(block, append(replacementState, workspace));
  }
}

function renderArgumentSubstitutions(
  callBlock: Blockly.Block,
  workspace: Blockly.WorkspaceSvg,
  env: RuntimeEnv,
  order: BlockOrder,
  kind: ReductionKind
): Map<string, any> {
  const params = methodParameters(resolveMethodCall(callBlock, env)!.method);
  const args = methodArguments(callBlock);
  const replacements = new Map<string, any>();

  params.forEach((param, index) => {
    const arg = args[index];
    if (!arg) return;
    const paramName = field(param, 'NAME', `p${index}`);
    const argState = save(arg);
    const desc = descriptionBlock(workspace, kind === 'value' ? `Value for ${paramName}` : `Structure for ${paramName}`);
    setBlockPositionInWorkSpace(desc, order);

    let replacementState = argState;
    if (kind === 'value') {
      const value = evaluateExpression(arg, env);
      replacementState = valueToBlockState(value, argState) ?? argState;
    }

    const displayed = append(replacementState, workspace);
    evaluateBlockTree(displayed, env);
    setBlockPositionInWorkSpace(displayed, order);
    replacements.set(paramName, replacementState);
  });

  return replacements;
}

export function renderMiniJavaReduction(
  callBlock: Blockly.Block,
  workspace: Blockly.WorkspaceSvg,
  kind: ReductionKind
): BlockOrder | null {
  const env = createRuntimeEnv(callBlock.workspace, kind);
  const resolved = resolveMethodCall(callBlock, env);
  const order = newOrder();

  if (!resolved) {
    const root = append(save(callBlock), workspace);
    evaluateBlockTree(root, env);
    setBlockPositionInWorkSpace(root, order);
    arrangeBlocksVertically(workspace, order, 32);
    return order;
  }

  const replacements = renderArgumentSubstitutions(callBlock, workspace, env, order, kind);
  const label = kind === 'value' ? 'Method body of CbV' : 'Method body of CbS';
  setBlockPositionInWorkSpace(descriptionBlock(workspace, label), order);

  const methodRoot = append(save(resolved.method), workspace);
  substituteIdentifiers(methodRoot, workspace, replacements);

  const methodEnv = createRuntimeEnv(callBlock.workspace, kind);
  methodEnv.currentClass = resolved.owner.name;
  methodEnv.thisValue = null;
  evaluateBlockTree(methodRoot, methodEnv);
  setBlockPositionInWorkSpace(methodRoot, order);
  arrangeBlocksVertically(workspace, order, 32);
  return order;
}

export function renderCopiedReductionRoot(
  block: Blockly.Block,
  workspace: Blockly.WorkspaceSvg,
  kind: ReductionKind
): BlockOrder {
  const env = createRuntimeEnv(block.workspace, kind);
  const order = newOrder();
  const root = append(save(block), workspace);
  evaluateBlockTree(root, env);
  setBlockPositionInWorkSpace(root, order);
  arrangeBlocksVertically(workspace, order, 32);
  return order;
}

