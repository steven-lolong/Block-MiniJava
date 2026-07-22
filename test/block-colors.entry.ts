/** Headless contracts for the renderer-owned MiniJava block color system. */

import * as Blockly from 'blockly';
import { defineMiniJavaBlocks } from '../src/core/blocks/minijavaBlocks';
import { MINI_JAVA_EXAMPLES } from '../src/core/examples';
import {
  MINI_JAVA_BLOCK_COLOR_CATEGORIES,
  MINI_JAVA_BLOCK_COLOR_CATEGORY,
  MINI_JAVA_BLOCK_PALETTES,
  MINI_JAVA_BLOCK_STYLE_BY_CATEGORY,
  MINI_JAVA_BLOCK_TYPES,
  createBlocklyTheme,
  miniJavaBlockStyle,
  type MiniJavaBlockType
} from '../src/core/renderer/theme';
import {
  MINI_JAVA_BLOCK_CONNECTOR_SHAPE,
  MINI_JAVA_HORIZONTAL_CONNECTOR_SHAPES,
  MINI_JAVA_VERTICAL_CONNECTOR_SHAPES
} from '../src/core/renderer/minijavaRenderer';

defineMiniJavaBlocks();

function canonical(value: unknown): unknown {
  if (Array.isArray(value)) return value.map(canonical);
  if (value && typeof value === 'object') {
    return Object.fromEntries(
      Object.entries(value as Record<string, unknown>)
        .filter(([key]) => key !== 'x' && key !== 'y')
        .sort(([left], [right]) => left.localeCompare(right))
        .map(([key, entry]) => [key, canonical(entry)])
    );
  }
  return value;
}

function saveWorkspace(workspace: Blockly.Workspace): string {
  return JSON.stringify(canonical(Blockly.serialization.workspaces.save(workspace)));
}

export function blockColorContract(): {
  types: readonly string[];
  categories: readonly string[];
  assignments: Record<string, string>;
  styleNames: Record<string, string>;
  registered: Record<string, boolean>;
  instantiatedStyles: Record<string, string>;
  themes: Record<string, Record<string, Blockly.Theme.BlockStyle>>;
  palettes: typeof MINI_JAVA_BLOCK_PALETTES;
} {
  const registered: Record<string, boolean> = {};
  const instantiatedStyles: Record<string, string> = {};
  const workspace = new Blockly.Workspace();
  try {
    for (const type of MINI_JAVA_BLOCK_TYPES) {
      registered[type] = Boolean(Blockly.Blocks[type]);
      instantiatedStyles[type] = workspace.newBlock(type).getStyleName();
    }
  } finally {
    workspace.dispose();
  }

  return {
    types: MINI_JAVA_BLOCK_TYPES,
    categories: MINI_JAVA_BLOCK_COLOR_CATEGORIES,
    assignments: MINI_JAVA_BLOCK_COLOR_CATEGORY,
    styleNames: MINI_JAVA_BLOCK_STYLE_BY_CATEGORY,
    registered,
    instantiatedStyles,
    themes: {
      dark: createBlocklyTheme('dark').blockStyles,
      light: createBlocklyTheme('light').blockStyles
    },
    palettes: MINI_JAVA_BLOCK_PALETTES
  };
}

export function connectorShapeContract(): {
  horizontal: readonly string[];
  vertical: readonly string[];
  byBlock: Readonly<Record<string, string>>;
} {
  return {
    horizontal: MINI_JAVA_HORIZONTAL_CONNECTOR_SHAPES,
    vertical: MINI_JAVA_VERTICAL_CONNECTOR_SHAPES,
    byBlock: MINI_JAVA_BLOCK_CONNECTOR_SHAPE
  };
}

export function blockSerializationRoundTrips(): Record<string, boolean> {
  return Object.fromEntries(MINI_JAVA_BLOCK_TYPES.map((type: MiniJavaBlockType) => {
    const before = new Blockly.Workspace();
    const after = new Blockly.Workspace();
    try {
      const block = before.newBlock(type);
      if (type === 'mj_value_object') {
        (block as Blockly.Block & { loadExtraState(state: { className: string; fields: string[] }): void })
          .loadExtraState({ className: 'Pair', fields: ['left', 'right'] });
      }
      const state = Blockly.serialization.workspaces.save(before);
      Blockly.serialization.workspaces.load(state, after);
      return [type, saveWorkspace(before) === saveWorkspace(after)];
    } finally {
      before.dispose();
      after.dispose();
    }
  }));
}

export function exampleLoadContract(): Record<string, { loaded: boolean; blockCount: number }> {
  return Object.fromEntries(MINI_JAVA_EXAMPLES.map((example) => {
    const workspace = new Blockly.Workspace();
    try {
      Blockly.serialization.workspaces.load(example.state, workspace);
      const blocks = workspace.getAllBlocks(false);
      return [example.id, {
        loaded: blocks.length > 0 && blocks.every((block) => Boolean(Blockly.Blocks[block.type])),
        blockCount: blocks.length
      }];
    } finally {
      workspace.dispose();
    }
  }));
}

export { miniJavaBlockStyle };
