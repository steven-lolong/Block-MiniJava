/**
 * Headless entry for the round-trip tests.
 *
 * Bundled for node (webpack.test.config.js); registers the MiniJava blocks
 * once and exposes the parser, the generator and the built-in examples so
 * test/run_roundtrip.js can convert text -> blocks -> text without a browser.
 */

import * as Blockly from 'blockly';
import { defineMiniJavaBlocks } from '../src/core/blocks/minijavaBlocks';
import { generateBlock } from '../src/core/generator/minijavaGenerator';
import {
  MiniJavaTextParseError,
  parseMiniJavaTextToWorkspaceState,
  type MiniJavaBlockState,
  type MiniJavaWorkspaceState
} from '../src/core/parser/minijavaTextParser';
import { MINI_JAVA_EXAMPLES } from '../src/core/examples';

defineMiniJavaBlocks();

/** Depth-first search for a block type missing from the Blockly registry. */
export function findUnregisteredType(state: MiniJavaWorkspaceState): string | null {
  const stack: MiniJavaBlockState[] = [...state.blocks.blocks];
  while (stack.length > 0) {
    const block = stack.pop()!;
    if (!Blockly.Blocks[block.type]) return block.type;
    for (const input of Object.values(block.inputs ?? {})) stack.push(input.block);
    if (block.next) stack.push(block.next.block);
  }
  return null;
}

/** Load a workspace state headlessly and generate MiniJava from its goal. */
export function stateToCode(state: unknown): { code: string; blockCount: number } {
  const workspace = new Blockly.Workspace();
  try {
    Blockly.serialization.workspaces.load(state as { [key: string]: unknown }, workspace);
    const topBlocks = workspace.getTopBlocks(true);
    const goal = topBlocks.find((block) => block.type === 'mj_goal');
    const code = goal
      ? generateBlock(goal)
      : topBlocks
        .map((block) => generateBlock(block))
        .filter((chunk) => chunk.trim().length > 0)
        .join('\n\n');
    return { code, blockCount: workspace.getAllBlocks(false).length };
  } finally {
    workspace.dispose();
  }
}

export { Blockly, MiniJavaTextParseError, parseMiniJavaTextToWorkspaceState, MINI_JAVA_EXAMPLES };
