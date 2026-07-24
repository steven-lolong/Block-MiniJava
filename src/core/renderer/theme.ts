import * as Blockly from 'blockly';

export const MINI_JAVA_BLOCK_TYPES = [
  'mj_goal',
  'mj_main_class',
  'mj_class_declaration',
  'mj_var_declaration',
  'mj_method_declaration',
  'mj_formal_parameter',
  'mj_type_int_array',
  'mj_type_boolean',
  'mj_type_int',
  'mj_type_string',
  'mj_type_identifier',
  'mj_statement_block',
  'mj_statement_if',
  'mj_statement_while',
  'mj_statement_print',
  'mj_statement_assign',
  'mj_statement_array_assign',
  'mj_expr_arith',
  'mj_expr_compare',
  'mj_expr_logic',
  'mj_expr_array_lookup',
  'mj_expr_array_length',
  'mj_expr_char_at',
  'mj_expr_concat',
  'mj_expr_str_length',
  'mj_expr_method_call',
  'mj_argument_item',
  'mj_expr_integer',
  'mj_expr_string',
  'mj_expr_boolean',
  'mj_expr_identifier',
  'mj_expr_this',
  'mj_expr_new_int_array',
  'mj_expr_new_object',
  'mj_expr_not',
  'mj_expr_parens',
  'mj_value_object',
  'mj_value_null',
  'mj_viz_description'
] as const;

export type MiniJavaBlockType = typeof MINI_JAVA_BLOCK_TYPES[number];

export const MINI_JAVA_BLOCK_COLOR_CATEGORIES = [
  'structure',
  'declaration',
  'type',
  'statement',
  'expression',
  'value',
  'runtime'
] as const;

export type MiniJavaBlockColorCategory = typeof MINI_JAVA_BLOCK_COLOR_CATEGORIES[number];
export type MiniJavaThemeMode = 'dark' | 'light';

/**
 * The sole block-type-to-color-family mapping. Connector checks and BMJ-Thrasos
 * shapes remain independent, finer-grained grammar signals.
 */
export const MINI_JAVA_BLOCK_COLOR_CATEGORY: Readonly<Record<MiniJavaBlockType, MiniJavaBlockColorCategory>> = {
  mj_goal: 'structure',
  mj_main_class: 'structure',
  mj_class_declaration: 'structure',
  mj_var_declaration: 'declaration',
  mj_method_declaration: 'declaration',
  mj_formal_parameter: 'declaration',
  mj_type_int_array: 'type',
  mj_type_boolean: 'type',
  mj_type_int: 'type',
  mj_type_string: 'type',
  mj_type_identifier: 'type',
  mj_statement_block: 'statement',
  mj_statement_if: 'statement',
  mj_statement_while: 'statement',
  mj_statement_print: 'statement',
  mj_statement_assign: 'statement',
  mj_statement_array_assign: 'statement',
  mj_expr_arith: 'expression',
  mj_expr_compare: 'expression',
  mj_expr_logic: 'expression',
  mj_expr_array_lookup: 'expression',
  mj_expr_array_length: 'expression',
  mj_expr_char_at: 'expression',
  mj_expr_concat: 'expression',
  mj_expr_str_length: 'expression',
  mj_expr_method_call: 'expression',
  mj_argument_item: 'expression',
  mj_expr_integer: 'value',
  mj_expr_string: 'value',
  mj_expr_boolean: 'value',
  mj_expr_identifier: 'value',
  mj_expr_this: 'value',
  mj_expr_new_int_array: 'value',
  mj_expr_new_object: 'value',
  mj_expr_not: 'expression',
  mj_expr_parens: 'expression',
  mj_value_object: 'runtime',
  mj_value_null: 'runtime',
  mj_viz_description: 'runtime'
};

export const MINI_JAVA_BLOCK_STYLE_BY_CATEGORY: Readonly<Record<MiniJavaBlockColorCategory, string>> = {
  structure: 'mj_grammar_structure_blocks',
  declaration: 'mj_grammar_declaration_blocks',
  type: 'mj_grammar_type_blocks',
  statement: 'mj_grammar_statement_blocks',
  expression: 'mj_grammar_expression_blocks',
  value: 'mj_grammar_value_blocks',
  runtime: 'mj_grammar_runtime_blocks'
};

export function miniJavaBlockStyle(type: MiniJavaBlockType): string {
  return MINI_JAVA_BLOCK_STYLE_BY_CATEGORY[MINI_JAVA_BLOCK_COLOR_CATEGORY[type]];
}

export type MiniJavaBlockPaletteEntry = Readonly<{
  semanticToken: `grammar.${MiniJavaBlockColorCategory}`;
  colourPrimary: string;
  colourSecondary: string;
  colourTertiary: string;
}>;

function mixHex(left: string, right: string, rightWeight: number): string {
  const channel = (hex: string, offset: number): number => Number.parseInt(hex.slice(offset, offset + 2), 16);
  const mixed = [1, 3, 5].map((offset) =>
    Math.round(channel(left, offset) * (1 - rightWeight) + channel(right, offset) * rightWeight)
      .toString(16)
      .padStart(2, '0')
  );
  return `#${mixed.join('')}`;
}

function categoryPalette(
  category: MiniJavaBlockColorCategory,
  colourPrimary: string
): MiniJavaBlockPaletteEntry {
  return {
    semanticToken: `grammar.${category}`,
    colourPrimary,
    colourSecondary: mixHex(colourPrimary, '#ffffff', 0.12),
    colourTertiary: mixHex(colourPrimary, '#000000', 0.24)
  };
}

/**
 * Restrained, theme-specific fills; white Blockly label text remains >= 4.5:1.
 *
 * Canonical source for these seven hexes — Blockly paints block SVGs straight
 * from this object, not from a CSS cascade, so the values must exist as plain
 * data here. The `--grammar-*` custom properties in tokens.css are a mirror
 * consumed by the HTML toolbox category swatches (workbench.css); edit here
 * first and carry the same hex into tokens.css. test/run_block_colors.js
 * parses tokens.css and asserts the two stay identical.
 */
export const MINI_JAVA_BLOCK_PALETTES: Readonly<
  Record<MiniJavaThemeMode, Readonly<Record<MiniJavaBlockColorCategory, MiniJavaBlockPaletteEntry>>>
> = {
  dark: {
    structure: categoryPalette('structure', '#80505a'),
    declaration: categoryPalette('declaration', '#685b7a'),
    type: categoryPalette('type', '#3d6d5a'),
    statement: categoryPalette('statement', '#80602f'),
    expression: categoryPalette('expression', '#455f7f'),
    value: categoryPalette('value', '#5c713e'),
    runtime: categoryPalette('runtime', '#585e68')
  },
  light: {
    structure: categoryPalette('structure', '#754650'),
    declaration: categoryPalette('declaration', '#5e5074'),
    type: categoryPalette('type', '#346252'),
    statement: categoryPalette('statement', '#75552a'),
    expression: categoryPalette('expression', '#3a5878'),
    value: categoryPalette('value', '#526638'),
    runtime: categoryPalette('runtime', '#515761')
  }
};

export const COPPER_AQUAMARINE_DARK = {
  bg: '#171a20',
  panel: '#1a1d24',
  panel2: '#242832',
  text: '#f1f3f5',
  muted: '#a9b0bc',
  copper: '#d08355',
  copperStrong: '#f0a36f',
  aquamarine: '#45d5c0',
  aquamarineStrong: '#79ead7',
  gold: '#deb866',
  blue: '#8ac7ff',
  green: '#7fbf89'
};

export const COPPER_AQUAMARINE_LIGHT = {
  bg: '#f7f8fa',
  panel: '#f3f5f7',
  panel2: '#e9edf2',
  text: '#202631',
  muted: '#606b79',
  copper: '#ad5f37',
  copperStrong: '#8d4526',
  aquamarine: '#158f83',
  aquamarineStrong: '#0b6f66',
  gold: '#b98322',
  blue: '#236c9d',
  green: '#507f4f'
};

function miniJavaBlockStyles(mode: 'dark' | 'light'): Record<string, Blockly.Theme.BlockStyle> {
  const palette = MINI_JAVA_BLOCK_PALETTES[mode];
  return Object.fromEntries(
    MINI_JAVA_BLOCK_COLOR_CATEGORIES.map((category) => [
      MINI_JAVA_BLOCK_STYLE_BY_CATEGORY[category],
      {
        colourPrimary: palette[category].colourPrimary,
        colourSecondary: palette[category].colourSecondary,
        colourTertiary: palette[category].colourTertiary,
        hat: ''
      }
    ])
  ) as Record<string, Blockly.Theme.BlockStyle>;
}

export function createBlocklyTheme(mode: 'dark' | 'light'): Blockly.Theme {
  const p = mode === 'dark' ? COPPER_AQUAMARINE_DARK : COPPER_AQUAMARINE_LIGHT;
  const grammar = MINI_JAVA_BLOCK_PALETTES[mode];
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
      program_category: { colour: grammar.structure.colourPrimary },
      class_category: { colour: grammar.structure.colourPrimary },
      declaration_category: { colour: grammar.declaration.colourPrimary },
      type_category: { colour: grammar.type.colourPrimary },
      statement_category: { colour: grammar.statement.colourPrimary },
      expression_category: { colour: grammar.expression.colourPrimary },
      value_category: { colour: grammar.value.colourPrimary },
      runtime_category: { colour: grammar.runtime.colourPrimary }
    },
    componentStyles: {
      workspaceBackgroundColour: p.bg,
      toolboxBackgroundColour: p.panel,
      toolboxForegroundColour: p.text,
      flyoutBackgroundColour: p.panel2,
      flyoutForegroundColour: p.text,
      flyoutOpacity: 0.98,
      scrollbarColour: mode === 'dark' ? '#414955' : '#b8c0cb',
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
