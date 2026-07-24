#!/usr/bin/env node

const fs = require('fs');
const path = require('path');

const {
  blockColorContract,
  blockSerializationRoundTrips,
  connectorShapeContract,
  exampleLoadContract,
  miniJavaBlockStyle
} = require('./dist/block-colors.bundle.js');

let failures = 0;
let passed = 0;

function check(name, condition, detail = '') {
  if (condition) {
    passed += 1;
    console.log(`ok    ${name}`);
  } else {
    failures += 1;
    console.log(`FAIL  ${name}${detail ? `\n      ${detail}` : ''}`);
  }
}

function luminance(hex) {
  const channels = [1, 3, 5]
    .map((offset) => Number.parseInt(hex.slice(offset, offset + 2), 16) / 255)
    .map((value) => value <= 0.04045 ? value / 12.92 : ((value + 0.055) / 1.055) ** 2.4);
  return channels[0] * 0.2126 + channels[1] * 0.7152 + channels[2] * 0.0722;
}

function contrast(left, right) {
  const values = [luminance(left), luminance(right)].sort((a, b) => b - a);
  return (values[0] + 0.05) / (values[1] + 0.05);
}

function rgbDistance(left, right) {
  const channel = (hex, offset) => Number.parseInt(hex.slice(offset, offset + 2), 16);
  return Math.hypot(...[1, 3, 5].map((offset) => channel(left, offset) - channel(right, offset)));
}

const contract = blockColorContract();
const categorySet = new Set(contract.categories);
const typeSet = new Set(contract.types);

check('the classification contains every MiniJava block exactly once',
  Object.keys(contract.assignments).length === contract.types.length &&
    Object.keys(contract.assignments).every((type) => typeSet.has(type)));
check('all seven grammatical color families are represented',
  contract.categories.length === 7 && new Set(Object.values(contract.assignments)).size === 7);
check('every assigned category is valid',
  Object.values(contract.assignments).every((category) => categorySet.has(category)));
check('every MiniJava block is registered',
  Object.values(contract.registered).every(Boolean),
  Object.entries(contract.registered).filter(([, value]) => !value).map(([type]) => type).join(', '));
check('every instantiated block uses its explicit category style',
  contract.types.every((type) => contract.instantiatedStyles[type] === miniJavaBlockStyle(type)),
  contract.types.filter((type) => contract.instantiatedStyles[type] !== miniJavaBlockStyle(type)).join(', '));

for (const mode of ['dark', 'light']) {
  const primaryColors = [];
  for (const category of contract.categories) {
    const palette = contract.palettes[mode][category];
    const styleName = contract.styleNames[category];
    const style = contract.themes[mode][styleName];
    check(`${mode} ${category} has a renderer theme style instead of a fallback`,
      Boolean(style) && style.colourPrimary === palette.colourPrimary &&
        style.colourSecondary === palette.colourSecondary && style.colourTertiary === palette.colourTertiary);
    check(`${mode} ${category} uses a valid semantic token`,
      palette.semanticToken === `grammar.${category}`);
    check(`${mode} ${category} label contrast is at least 4.5:1`,
      contrast(palette.colourPrimary, '#ffffff') >= 4.5,
      `${contrast(palette.colourPrimary, '#ffffff').toFixed(2)}:1`);
    primaryColors.push(palette.colourPrimary);
  }
  check(`${mode} categories have distinct primary colors`, new Set(primaryColors).size === contract.categories.length);
  check(`${mode} adjacent category colors are not near-duplicates`,
    primaryColors.every((color, index) => primaryColors.slice(index + 1)
      .every((other) => rgbDistance(color, other) >= 20)));
}

// theme.ts (MINI_JAVA_BLOCK_PALETTES) is the authored source for the seven
// grammar hexes; tokens.css's --grammar-* custom properties are a hand-kept
// mirror consumed by the HTML toolbox swatches. Parse the CSS text and assert
// the two never drift apart, rather than trusting a second copy by hand.
const tokensCssPath = path.resolve(__dirname, '../src/assets/css/tokens.css');
const tokensCssText = fs.readFileSync(tokensCssPath, 'utf8');
const themeBlockPattern = /body\[data-theme="(dark|light)"\]\s*{([^}]*)}/g;
const cssGrammarByMode = {};
let themeBlockMatch;
while ((themeBlockMatch = themeBlockPattern.exec(tokensCssText)) !== null) {
  const [, mode, body] = themeBlockMatch;
  const grammar = {};
  const grammarLinePattern = /--grammar-([a-z]+):\s*(#[0-9a-fA-F]{6});/g;
  let grammarLineMatch;
  while ((grammarLineMatch = grammarLinePattern.exec(body)) !== null) {
    grammar[grammarLineMatch[1]] = grammarLineMatch[2];
  }
  cssGrammarByMode[mode] = grammar;
}
for (const mode of ['dark', 'light']) {
  for (const category of contract.categories) {
    check(`tokens.css --grammar-${category} (${mode}) matches theme.ts`,
      cssGrammarByMode[mode]?.[category] === contract.palettes[mode][category].colourPrimary,
      `css=${cssGrammarByMode[mode]?.[category]} theme.ts=${contract.palettes[mode][category].colourPrimary}`);
  }
}

const expectedHorizontal = [
  'Goal', 'MainClass', 'ClassDeclaration', 'VarDeclaration', 'MethodDeclaration',
  'FormalParameter', 'Type', 'Statement', 'Expression', 'Identifier'
];
const expectedVertical = [
  'ClassDeclaration', 'VarDeclaration', 'MethodDeclaration', 'Statement',
  'FormalParameter', 'ExpressionArg'
];
const expectedConnectorByBlock = {
  mj_goal: 'Goal',
  mj_main_class: 'MainClass',
  mj_class_declaration: 'ClassDeclaration',
  mj_var_declaration: 'VarDeclaration',
  mj_method_declaration: 'MethodDeclaration',
  mj_formal_parameter: 'FormalParameter',
  mj_type_int_array: 'Type',
  mj_type_boolean: 'Type',
  mj_type_int: 'Type',
  mj_type_string: 'Type',
  mj_type_identifier: 'Type',
  mj_statement_block: 'Statement',
  mj_statement_if: 'Statement',
  mj_statement_while: 'Statement',
  mj_statement_print: 'Statement',
  mj_statement_assign: 'Statement',
  mj_statement_array_assign: 'Statement',
  mj_expr_arith: 'Expression',
  mj_expr_compare: 'Expression',
  mj_expr_logic: 'Expression',
  mj_expr_array_lookup: 'Expression',
  mj_expr_array_length: 'Expression',
  mj_expr_char_at: 'Expression',
  mj_expr_concat: 'Expression',
  mj_expr_str_length: 'Expression',
  mj_expr_method_call: 'Expression',
  mj_argument_item: 'ExpressionArg',
  mj_expr_integer: 'Expression',
  mj_expr_string: 'Expression',
  mj_expr_boolean: 'Expression',
  mj_expr_identifier: 'Expression',
  mj_expr_this: 'Expression',
  mj_expr_new_int_array: 'Expression',
  mj_expr_new_object: 'Expression',
  mj_expr_not: 'Expression',
  mj_expr_parens: 'Expression'
};
const connectors = connectorShapeContract();
check('horizontal grammar connector shapes are unchanged',
  JSON.stringify(connectors.horizontal) === JSON.stringify(expectedHorizontal));
check('vertical grammar connector shapes are unchanged',
  JSON.stringify(connectors.vertical) === JSON.stringify(expectedVertical));
check('block-to-connector shape mappings are unchanged',
  JSON.stringify(connectors.byBlock) === JSON.stringify(expectedConnectorByBlock));

const roundTrips = blockSerializationRoundTrips();
check('every block serializes and deserializes without structural change',
  Object.values(roundTrips).every(Boolean),
  Object.entries(roundTrips).filter(([, value]) => !value).map(([type]) => type).join(', '));

const examples = exampleLoadContract();
check('every built-in example loads with registered blocks',
  Object.values(examples).every((result) => result.loaded && result.blockCount > 0),
  Object.entries(examples).filter(([, result]) => !result.loaded).map(([id]) => id).join(', '));

console.log(`\n${passed} block-color contracts passed${failures ? `, ${failures} FAILED` : ''}`);
process.exit(failures ? 1 : 0);
