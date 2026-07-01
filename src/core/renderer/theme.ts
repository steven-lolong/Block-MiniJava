import * as Blockly from 'blockly';
import { MINI_JAVA_BLOCK_TYPES, MiniJavaBlockType, miniJavaBlockStyle } from '../blocks/minijavaBlocks';

export const COPPER_AQUAMARINE_DARK = {
  bg: '#0d1312',
  panel: '#172220',
  panel2: '#263733',
  text: '#f1ece5',
  muted: '#b8aaa0',
  copper: '#d08355',
  copperStrong: '#f0a36f',
  aquamarine: '#45d5c0',
  aquamarineStrong: '#79ead7',
  gold: '#deb866',
  blue: '#8ac7ff',
  green: '#7fbf89'
};

export const COPPER_AQUAMARINE_LIGHT = {
  bg: '#fffaf4',
  panel: '#f4efe8',
  panel2: '#e7ddd1',
  text: '#26211d',
  muted: '#71635a',
  copper: '#ad5f37',
  copperStrong: '#8d4526',
  aquamarine: '#158f83',
  aquamarineStrong: '#0b6f66',
  gold: '#b98322',
  blue: '#236c9d',
  green: '#507f4f'
};

const DARK_BLOCK_COLOURS: Record<MiniJavaBlockType, string> = {
  mj_goal: '#ff7a45',
  mj_main_class: '#ffb000',
  mj_class_declaration: '#d785ff',
  mj_class_extends_declaration: '#b96dff',
  mj_var_declaration: '#42e6b8',
  mj_method_declaration: '#36c9ff',
  mj_formal_parameter: '#82f56b',
  mj_type_int_array: '#5ee0ff',
  mj_type_boolean: '#52f27f',
  mj_type_int: '#ffd166',
  mj_type_identifier: '#a2f5c8',
  mj_statement_block: '#ff8a65',
  mj_statement_if: '#ff5c8a',
  mj_statement_while: '#f59e0b',
  mj_statement_print: '#4dd0e1',
  mj_statement_assign: '#f97316',
  mj_statement_array_assign: '#eab308',
  mj_expr_and: '#34d399',
  mj_expr_less: '#60a5fa',
  mj_expr_plus: '#22d3ee',
  mj_expr_minus: '#a78bfa',
  mj_expr_times: '#f472b6',
  mj_expr_array_lookup: '#2dd4bf',
  mj_expr_array_length: '#38bdf8',
  mj_expr_method_call: '#c084fc',
  mj_argument_item: '#facc15',
  mj_expr_integer: '#fde047',
  mj_expr_true: '#4ade80',
  mj_expr_false: '#fb7185',
  mj_expr_identifier: '#5eead4',
  mj_expr_this: '#93c5fd',
  mj_expr_new_int_array: '#6ee7b7',
  mj_expr_new_object: '#f0abfc',
  mj_expr_not: '#f43f5e',
  mj_expr_parens: '#cbd5e1',
  mj_viz_description: '#64748b'
};

const LIGHT_BLOCK_COLOURS: Record<MiniJavaBlockType, string> = {
  mj_goal: '#b8431d',
  mj_main_class: '#b86e00',
  mj_class_declaration: '#7c3aed',
  mj_class_extends_declaration: '#9333ea',
  mj_var_declaration: '#087f5b',
  mj_method_declaration: '#0369a1',
  mj_formal_parameter: '#2f7d32',
  mj_type_int_array: '#007a9a',
  mj_type_boolean: '#15803d',
  mj_type_int: '#a16207',
  mj_type_identifier: '#0f766e',
  mj_statement_block: '#c2410c',
  mj_statement_if: '#be123c',
  mj_statement_while: '#b45309',
  mj_statement_print: '#0e7490',
  mj_statement_assign: '#ea580c',
  mj_statement_array_assign: '#a16207',
  mj_expr_and: '#047857',
  mj_expr_less: '#2563eb',
  mj_expr_plus: '#0891b2',
  mj_expr_minus: '#7c3aed',
  mj_expr_times: '#be185d',
  mj_expr_array_lookup: '#0d9488',
  mj_expr_array_length: '#0284c7',
  mj_expr_method_call: '#9333ea',
  mj_argument_item: '#a16207',
  mj_expr_integer: '#854d0e',
  mj_expr_true: '#16a34a',
  mj_expr_false: '#e11d48',
  mj_expr_identifier: '#0f766e',
  mj_expr_this: '#1d4ed8',
  mj_expr_new_int_array: '#059669',
  mj_expr_new_object: '#a21caf',
  mj_expr_not: '#be123c',
  mj_expr_parens: '#475569',
  mj_viz_description: '#64748b'
};

function miniJavaBlockStyles(mode: 'dark' | 'light'): Record<string, Blockly.Theme.BlockStyle> {
  const colours = mode === 'dark' ? DARK_BLOCK_COLOURS : LIGHT_BLOCK_COLOURS;
  return Object.fromEntries(
    MINI_JAVA_BLOCK_TYPES.map((type) => [
      miniJavaBlockStyle(type),
      {
        colourPrimary: colours[type],
        colourSecondary: colours[type],
        colourTertiary: colours[type],
        hat: ''
      }
    ])
  ) as Record<string, Blockly.Theme.BlockStyle>;
}

export function createBlocklyTheme(mode: 'dark' | 'light'): Blockly.Theme {
  const p = mode === 'dark' ? COPPER_AQUAMARINE_DARK : COPPER_AQUAMARINE_LIGHT;
  return Blockly.Theme.defineTheme(`copper-aquamarine-${mode}`, {
    name: `copper-aquamarine-${mode}`,
    base: Blockly.Themes.Classic,
    blockStyles: {
      ...miniJavaBlockStyles(mode),
      logic_blocks: { colourPrimary: p.aquamarine },
      loop_blocks: { colourPrimary: p.copper },
      math_blocks: { colourPrimary: p.gold },
      text_blocks: { colourPrimary: p.blue },
      list_blocks: { colourPrimary: p.aquamarineStrong },
      variable_blocks: { colourPrimary: p.aquamarine },
      procedure_blocks: { colourPrimary: p.gold }
    },
    categoryStyles: {
      program_category: { colour: p.copper },
      class_category: { colour: p.copperStrong },
      declaration_category: { colour: p.gold },
      type_category: { colour: p.green },
      statement_category: { colour: p.copper },
      expression_category: { colour: p.aquamarine },
      value_category: { colour: p.aquamarineStrong }
    },
    componentStyles: {
      workspaceBackgroundColour: p.bg,
      toolboxBackgroundColour: p.panel,
      toolboxForegroundColour: p.text,
      flyoutBackgroundColour: p.panel2,
      flyoutForegroundColour: p.text,
      flyoutOpacity: 0.98,
      scrollbarColour: mode === 'dark' ? '#48635e' : '#b9aa9b',
      insertionMarkerColour: p.gold,
      insertionMarkerOpacity: 0.45,
      markerColour: p.copper,
      cursorColour: p.blue
    },
    fontStyle: {
      family: 'Inter, ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif',
      weight: '600',
      size: 12
    },
    startHats: false
  });
}

// Use the grammar-aware B-MJ renderer. It subclasses Blockly Thrasos and
// assigns connector geometry from MiniJava non-terminal checks.
export const BLOCKLY_RENDERER = 'bmj-thrasos';
