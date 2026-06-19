import * as Blockly from 'blockly';

export const AYU_MIRAGE_DARK = {
  bg: '#1f2430',
  panel: '#242936',
  panel2: '#2a3141',
  text: '#f3f6fa',
  muted: '#b8c0cc',
  navy: '#0f1f33',
  teal: '#10a7a4',
  gold: '#ffc857',
  orange: '#ff6b35',
  blue: '#73d0ff'
};

export const AYU_MIRAGE_LIGHT = {
  bg: '#fbfcfe',
  panel: '#ffffff',
  panel2: '#eef2f7',
  text: '#152235',
  muted: '#526173',
  navy: '#0f1f33',
  teal: '#007f7a',
  gold: '#b87600',
  orange: '#d94b16',
  blue: '#1f73a8'
};

export function createBlocklyTheme(mode: 'dark' | 'light'): Blockly.Theme {
  const p = mode === 'dark' ? AYU_MIRAGE_DARK : AYU_MIRAGE_LIGHT;
  return Blockly.Theme.defineTheme(`ayu-mirage-${mode}`, {
    name: `ayu-mirage-${mode}`,
    base: Blockly.Themes.Classic,
    blockStyles: {
      logic_blocks: { colourPrimary: p.teal },
      loop_blocks: { colourPrimary: p.orange },
      math_blocks: { colourPrimary: p.gold },
      text_blocks: { colourPrimary: p.blue },
      list_blocks: { colourPrimary: p.teal },
      variable_blocks: { colourPrimary: p.orange },
      procedure_blocks: { colourPrimary: p.gold }
    },
    categoryStyles: {
      program_category: { colour: '#5ccfe6' },
      class_category: { colour: '#73d0ff' },
      declaration_category: { colour: '#ffd580' },
      type_category: { colour: '#bae67e' },
      statement_category: { colour: '#ffae57' },
      expression_category: { colour: '#d4bfff' },
      value_category: { colour: '#f28779' }
    },
    componentStyles: {
      workspaceBackgroundColour: p.bg,
      toolboxBackgroundColour: p.panel,
      toolboxForegroundColour: p.text,
      flyoutBackgroundColour: p.panel2,
      flyoutForegroundColour: p.text,
      flyoutOpacity: 0.98,
      scrollbarColour: mode === 'dark' ? '#4a5367' : '#b8c0cc',
      insertionMarkerColour: p.gold,
      insertionMarkerOpacity: 0.45,
      markerColour: p.orange,
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
