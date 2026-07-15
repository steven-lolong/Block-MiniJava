import * as Blockly from 'blockly';
import { MINI_JAVA_RESERVED_WORDS } from '../parser/minijavaTextParser';

export type ToolboxBlock = {
  type: string;
  label: string;
  icon: string;
};

export type ToolboxCategory = {
  id: string;
  label: string;
  icon: string;
  blocks: ToolboxBlock[];
};

export const MINI_JAVA_REQUIRED_BLOCK_TYPES = ['mj_goal', 'mj_main_class'] as const;

export const MINI_JAVA_BLOCK_TYPES = [
  'mj_goal',
  'mj_main_class',
  'mj_class_declaration',
  'mj_class_extends_declaration',
  'mj_var_declaration',
  'mj_method_declaration',
  'mj_formal_parameter',
  'mj_type_int_array',
  'mj_type_boolean',
  'mj_type_int',
  'mj_type_identifier',
  'mj_statement_block',
  'mj_statement_if',
  'mj_statement_while',
  'mj_statement_print',
  'mj_statement_assign',
  'mj_statement_array_assign',
  'mj_expr_and',
  'mj_expr_less',
  'mj_expr_plus',
  'mj_expr_minus',
  'mj_expr_times',
  'mj_expr_array_lookup',
  'mj_expr_array_length',
  'mj_expr_method_call',
  'mj_argument_item',
  'mj_expr_integer',
  'mj_expr_true',
  'mj_expr_false',
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

export function miniJavaBlockStyle(type: MiniJavaBlockType): string {
  return `${type}_blocks`;
}

export const MINI_JAVA_CATEGORIES: ToolboxCategory[] = [
  {
    id: 'program',
    label: 'Program',
    icon: 'P',
    blocks: [
      { type: 'mj_class_declaration', label: 'Class Declaration', icon: 'cls' },
      { type: 'mj_class_extends_declaration', label: 'Class Extends Declaration', icon: 'ext' }
    ]
  },
  {
    id: 'declarations',
    label: 'Declarations',
    icon: 'D',
    blocks: [
      { type: 'mj_var_declaration', label: 'Variable Declaration', icon: 'var' },
      { type: 'mj_method_declaration', label: 'Method Declaration', icon: 'fn' },
      { type: 'mj_formal_parameter', label: 'Formal Parameter', icon: 'arg' }
    ]
  },
  {
    id: 'types',
    label: 'Types',
    icon: 'T',
    blocks: [
      { type: 'mj_type_int_array', label: 'int[]', icon: '[]' },
      { type: 'mj_type_boolean', label: 'boolean', icon: 'bool' },
      { type: 'mj_type_int', label: 'int', icon: 'int' },
      { type: 'mj_type_identifier', label: 'Identifier Type', icon: 'id' }
    ]
  },
  {
    id: 'statements',
    label: 'Statements',
    icon: 'S',
    blocks: [
      { type: 'mj_statement_block', label: 'Block Statement', icon: '▣' },
      { type: 'mj_statement_if', label: 'if / else', icon: 'if' },
      { type: 'mj_statement_while', label: 'while', icon: 'loop' },
      { type: 'mj_statement_print', label: 'System.out.println', icon: 'out' },
      { type: 'mj_statement_assign', label: 'Assignment', icon: '=' },
      { type: 'mj_statement_array_assign', label: 'Array Assignment', icon: '[]=' }
    ]
  },
  {
    id: 'expressions',
    label: 'Expressions',
    icon: 'E',
    blocks: [
      { type: 'mj_expr_and', label: '&&', icon: '&&' },
      { type: 'mj_expr_less', label: '<', icon: '<' },
      { type: 'mj_expr_plus', label: '+', icon: '+' },
      { type: 'mj_expr_minus', label: '-', icon: '-' },
      { type: 'mj_expr_times', label: '*', icon: '*' },
      { type: 'mj_expr_array_lookup', label: 'Array Lookup', icon: '[]' },
      { type: 'mj_expr_array_length', label: 'Array Length', icon: 'len' },
      { type: 'mj_expr_method_call', label: 'Method Call', icon: 'call' },
      { type: 'mj_argument_item', label: 'Argument Item', icon: 'arg' },
      { type: 'mj_expr_not', label: 'Not', icon: '!' },
      { type: 'mj_expr_parens', label: 'Parenthesized', icon: '( )' }
    ]
  },
  {
    id: 'values',
    label: 'Values',
    icon: 'V',
    blocks: [
      { type: 'mj_expr_integer', label: 'Integer', icon: '123' },
      { type: 'mj_expr_true', label: 'true', icon: 'T' },
      { type: 'mj_expr_false', label: 'false', icon: 'F' },
      { type: 'mj_expr_identifier', label: 'Identifier', icon: 'id' },
      { type: 'mj_expr_this', label: 'this', icon: 'this' },
      { type: 'mj_expr_new_int_array', label: 'new int[]', icon: 'new[]' },
      { type: 'mj_expr_new_object', label: 'new Object', icon: 'obj' }
    ]
  }
];

const textValidator = (fallback: string) => (value: string | null): string => {
  const clean = (value ?? '').trim().replace(/[^A-Za-z0-9_]/g, '');
  if (!clean) return fallback;
  if (/^[0-9]/.test(clean)) return `${fallback}${clean}`;
  // Reserved words would make the generated MiniJava unparseable.
  if (MINI_JAVA_RESERVED_WORDS.has(clean)) return fallback;
  return clean;
};

export function defineMiniJavaBlocks(): void {
  Blockly.common.defineBlocksWithJsonArray([
    {
      type: 'mj_goal',
      message0: 'Program %1 Main Class %2 Class %3',
      args0: [
        { type: 'input_dummy' },
        { type: 'input_value', name: 'MAIN', check: 'MainClass' },
        { type: 'input_statement', name: 'CLASSES', check: 'ClassDeclaration' }
      ],
      style: miniJavaBlockStyle('mj_goal'),
      tooltip: 'Goal ::= MainClass Class Declaration* EOF',
      helpUrl: ''
    },
    {
      type: 'mj_main_class',
      message0: 'class name %1, method main, argument %2 %3 %4',
      args0: [
        { type: 'field_input', name: 'CLASS', text: 'Main' },
        { type: 'field_input', name: 'ARG', text: 'args' },
        { type: 'input_dummy' },
        { type: 'input_statement', name: 'STATEMENT', check: 'Statement' }
      ],
      output: 'MainClass',
      style: miniJavaBlockStyle('mj_main_class'),
      tooltip: 'MainClass ::= class Identifier { public static void main ( String [] Identifier ) { Statement } }',
      helpUrl: ''
    },
    {
      type: 'mj_class_declaration',
      message0: 'class %1 %2 fields %3 methods %4',
      args0: [
        { type: 'field_input', name: 'CLASS', text: 'ClassName' },
        { type: 'input_dummy' },
        { type: 'input_statement', name: 'VARS', check: 'VarDeclaration' },
        { type: 'input_statement', name: 'METHODS', check: 'MethodDeclaration' }
      ],
      previousStatement: 'ClassDeclaration',
      nextStatement: 'ClassDeclaration',
      style: miniJavaBlockStyle('mj_class_declaration'),
      tooltip: 'ClassDeclaration ::= class Identifier { VarDeclaration* MethodDeclaration* }',
      helpUrl: ''
    },
    {
      type: 'mj_class_extends_declaration',
      message0: 'class %1 extends %2 %3 fields %4 methods %5',
      args0: [
        { type: 'field_input', name: 'CLASS', text: 'ClassName' },
        { type: 'field_input', name: 'PARENT', text: 'ParentName' },
        { type: 'input_dummy' },
        { type: 'input_statement', name: 'VARS', check: 'VarDeclaration' },
        { type: 'input_statement', name: 'METHODS', check: 'MethodDeclaration' }
      ],
      previousStatement: 'ClassDeclaration',
      nextStatement: 'ClassDeclaration',
      style: miniJavaBlockStyle('mj_class_extends_declaration'),
      tooltip: 'ClassDeclaration ::= class Identifier extends Identifier { VarDeclaration* MethodDeclaration* }',
      helpUrl: ''
    },
    {
      type: 'mj_var_declaration',
      message0: 'var %1 %2',
      args0: [
        { type: 'input_value', name: 'TYPE', check: 'Type' },
        { type: 'field_input', name: 'NAME', text: 'x' }
      ],
      previousStatement: 'VarDeclaration',
      nextStatement: 'VarDeclaration',
      style: miniJavaBlockStyle('mj_var_declaration'),
      tooltip: 'VarDeclaration ::= Type Identifier ;',
      helpUrl: ''
    },
    {
      type: 'mj_method_declaration',
      message0: 'public %1 %2 params %3 %4 vars %5 body %6 return %7',
      args0: [
        { type: 'input_value', name: 'TYPE', check: 'Type' },
        { type: 'field_input', name: 'NAME', text: 'method' },
        { type: 'input_statement', name: 'PARAMS', check: 'FormalParameter' },
        { type: 'input_dummy' },
        { type: 'input_statement', name: 'VARS', check: 'VarDeclaration' },
        { type: 'input_statement', name: 'BODY', check: 'Statement' },
        { type: 'input_value', name: 'RETURN', check: 'Expression' }
      ],
      previousStatement: 'MethodDeclaration',
      nextStatement: 'MethodDeclaration',
      style: miniJavaBlockStyle('mj_method_declaration'),
      tooltip: 'MethodDeclaration ::= public Type Identifier ( parameters ) { VarDeclaration* Statement* return Expression ; }',
      helpUrl: ''
    },
    {
      type: 'mj_formal_parameter',
      message0: '%1 %2',
      args0: [
        { type: 'input_value', name: 'TYPE', check: 'Type' },
        { type: 'field_input', name: 'NAME', text: 'p' }
      ],
      previousStatement: 'FormalParameter',
      nextStatement: 'FormalParameter',
      style: miniJavaBlockStyle('mj_formal_parameter'),
      tooltip: 'Formal parameter ::= Type Identifier',
      helpUrl: ''
    },
    {
      type: 'mj_type_int_array',
      message0: 'int [ ]',
      output: 'Type',
      style: miniJavaBlockStyle('mj_type_int_array'),
      tooltip: 'Type ::= int[]',
      helpUrl: ''
    },
    {
      type: 'mj_type_boolean',
      message0: 'boolean',
      output: 'Type',
      style: miniJavaBlockStyle('mj_type_boolean'),
      tooltip: 'Type ::= boolean',
      helpUrl: ''
    },
    {
      type: 'mj_type_int',
      message0: 'int',
      output: 'Type',
      style: miniJavaBlockStyle('mj_type_int'),
      tooltip: 'Type ::= int',
      helpUrl: ''
    },
    {
      type: 'mj_type_identifier',
      message0: 'type %1',
      args0: [{ type: 'field_input', name: 'NAME', text: 'ClassName' }],
      output: 'Type',
      style: miniJavaBlockStyle('mj_type_identifier'),
      tooltip: 'Type ::= Identifier',
      helpUrl: ''
    },
    {
      type: 'mj_statement_block',
      message0: 'Statements %1',
      args0: [{ type: 'input_statement', name: 'STATEMENTS', check: 'Statement' }],
      previousStatement: 'Statement',
      nextStatement: 'Statement',
      style: miniJavaBlockStyle('mj_statement_block'),
      tooltip: 'Statement ::= { Statement* }',
      helpUrl: ''
    },
    {
      type: 'mj_statement_if',
      message0: 'if %1 then %2 else %3',
      args0: [
        { type: 'input_value', name: 'COND', check: 'Expression' },
        { type: 'input_statement', name: 'THEN', check: 'Statement' },
        { type: 'input_statement', name: 'ELSE', check: 'Statement' }
      ],
      previousStatement: 'Statement',
      nextStatement: 'Statement',
      style: miniJavaBlockStyle('mj_statement_if'),
      tooltip: 'Statement ::= if ( Expression ) Statement else Statement',
      helpUrl: ''
    },
    {
      type: 'mj_statement_while',
      message0: 'while %1 %2',
      args0: [
        { type: 'input_value', name: 'COND', check: 'Expression' },
        { type: 'input_statement', name: 'BODY', check: 'Statement' }
      ],
      previousStatement: 'Statement',
      nextStatement: 'Statement',
      style: miniJavaBlockStyle('mj_statement_while'),
      tooltip: 'Statement ::= while ( Expression ) Statement',
      helpUrl: ''
    },
    {
      type: 'mj_statement_print',
      message0: 'System.out.println %1',
      args0: [{ type: 'input_value', name: 'VALUE', check: 'Expression' }],
      previousStatement: 'Statement',
      nextStatement: 'Statement',
      style: miniJavaBlockStyle('mj_statement_print'),
      tooltip: 'Statement ::= System.out.println ( Expression ) ;',
      helpUrl: ''
    },
    {
      type: 'mj_statement_assign',
      message0: '%1 = %2',
      args0: [
        { type: 'field_input', name: 'NAME', text: 'x' },
        { type: 'input_value', name: 'VALUE', check: 'Expression' }
      ],
      previousStatement: 'Statement',
      nextStatement: 'Statement',
      style: miniJavaBlockStyle('mj_statement_assign'),
      tooltip: 'Statement ::= Identifier = Expression ;',
      helpUrl: ''
    },
    {
      type: 'mj_statement_array_assign',
      message0: '%1 %2 = %3',
      args0: [
        { type: 'field_input', name: 'NAME', text: 'array' },
        { type: 'input_value', name: 'INDEX', check: 'Expression' },
        { type: 'input_value', name: 'VALUE', check: 'Expression' }
      ],
      previousStatement: 'Statement',
      nextStatement: 'Statement',
      style: miniJavaBlockStyle('mj_statement_array_assign'),
      tooltip: 'Statement ::= Identifier [ Expression ] = Expression ;',
      helpUrl: ''
    },
    {
      type: 'mj_expr_and',
      message0: '%1 && %2',
      args0: [
        { type: 'input_value', name: 'LEFT', check: 'Expression' },
        { type: 'input_value', name: 'RIGHT', check: 'Expression' }
      ],
      inputsInline: true,
      output: 'Expression',
      style: miniJavaBlockStyle('mj_expr_and'),
      tooltip: 'Expression ::= Expression && Expression',
      helpUrl: ''
    },
    {
      type: 'mj_expr_less',
      message0: '%1 < %2',
      args0: [
        { type: 'input_value', name: 'LEFT', check: 'Expression' },
        { type: 'input_value', name: 'RIGHT', check: 'Expression' }
      ],
      inputsInline: true,
      output: 'Expression',
      style: miniJavaBlockStyle('mj_expr_less'),
      tooltip: 'Expression ::= Expression < Expression',
      helpUrl: ''
    },
    {
      type: 'mj_expr_plus',
      message0: '%1 + %2',
      args0: [
        { type: 'input_value', name: 'LEFT', check: 'Expression' },
        { type: 'input_value', name: 'RIGHT', check: 'Expression' }
      ],
      inputsInline: true,
      output: 'Expression',
      style: miniJavaBlockStyle('mj_expr_plus'),
      tooltip: 'Expression ::= Expression + Expression',
      helpUrl: ''
    },
    {
      type: 'mj_expr_minus',
      message0: '%1 - %2',
      args0: [
        { type: 'input_value', name: 'LEFT', check: 'Expression' },
        { type: 'input_value', name: 'RIGHT', check: 'Expression' }
      ],
      inputsInline: true,
      output: 'Expression',
      style: miniJavaBlockStyle('mj_expr_minus'),
      tooltip: 'Expression ::= Expression - Expression',
      helpUrl: ''
    },
    {
      type: 'mj_expr_times',
      message0: '%1 * %2',
      args0: [
        { type: 'input_value', name: 'LEFT', check: 'Expression' },
        { type: 'input_value', name: 'RIGHT', check: 'Expression' }
      ],
      inputsInline: true,
      output: 'Expression',
      style: miniJavaBlockStyle('mj_expr_times'),
      tooltip: 'Expression ::= Expression * Expression',
      helpUrl: ''
    },
    {
      type: 'mj_expr_array_lookup',
      message0: '%1 [ %2 ]',
      args0: [
        { type: 'input_value', name: 'ARRAY', check: 'Expression' },
        { type: 'input_value', name: 'INDEX', check: 'Expression' }
      ],
      inputsInline: true,
      output: 'Expression',
      style: miniJavaBlockStyle('mj_expr_array_lookup'),
      tooltip: 'Expression ::= Expression [ Expression ]',
      helpUrl: ''
    },
    {
      type: 'mj_expr_array_length',
      message0: '%1 . length',
      args0: [{ type: 'input_value', name: 'ARRAY', check: 'Expression' }],
      output: 'Expression',
      style: miniJavaBlockStyle('mj_expr_array_length'),
      tooltip: 'Expression ::= Expression . length',
      helpUrl: ''
    },
    {
      type: 'mj_expr_method_call',
      message0: '%1 . %2 ( args %3 )',
      args0: [
        { type: 'input_value', name: 'OBJECT', check: 'Expression' },
        { type: 'field_input', name: 'METHOD', text: 'method' },
        { type: 'input_statement', name: 'ARGS', check: 'ExpressionArg' }
      ],
      output: 'Expression',
      style: miniJavaBlockStyle('mj_expr_method_call'),
      tooltip: 'Expression ::= Expression . Identifier ( Expression (, Expression)* )',
      helpUrl: ''
    },
    {
      type: 'mj_argument_item',
      message0: 'arg %1',
      args0: [{ type: 'input_value', name: 'EXPR', check: 'Expression' }],
      previousStatement: 'ExpressionArg',
      nextStatement: 'ExpressionArg',
      style: miniJavaBlockStyle('mj_argument_item'),
      tooltip: 'Expression argument item',
      helpUrl: ''
    },
    {
      type: 'mj_expr_integer',
      message0: 'int literal %1',
      args0: [{ type: 'field_number', name: 'VALUE', value: 0, precision: 1 }],
      output: 'Expression',
      style: miniJavaBlockStyle('mj_expr_integer'),
      tooltip: 'Expression ::= IntegerLiteral',
      helpUrl: ''
    },
    {
      type: 'mj_expr_true',
      message0: 'true',
      output: 'Expression',
      style: miniJavaBlockStyle('mj_expr_true'),
      tooltip: 'Expression ::= true',
      helpUrl: ''
    },
    {
      type: 'mj_expr_false',
      message0: 'false',
      output: 'Expression',
      style: miniJavaBlockStyle('mj_expr_false'),
      tooltip: 'Expression ::= false',
      helpUrl: ''
    },
    {
      type: 'mj_expr_identifier',
      message0: 'identifier %1',
      args0: [{ type: 'field_input', name: 'NAME', text: 'x' }],
      output: 'Expression',
      style: miniJavaBlockStyle('mj_expr_identifier'),
      tooltip: 'Expression ::= Identifier',
      helpUrl: ''
    },
    {
      type: 'mj_expr_this',
      message0: 'this',
      output: 'Expression',
      style: miniJavaBlockStyle('mj_expr_this'),
      tooltip: 'Expression ::= this',
      helpUrl: ''
    },
    {
      type: 'mj_expr_new_int_array',
      message0: 'new int [ %1 ]',
      args0: [{ type: 'input_value', name: 'SIZE', check: 'Expression' }],
      output: 'Expression',
      style: miniJavaBlockStyle('mj_expr_new_int_array'),
      tooltip: 'Expression ::= new int [ Expression ]',
      helpUrl: ''
    },
    {
      type: 'mj_expr_new_object',
      message0: 'new %1 ( )',
      args0: [{ type: 'field_input', name: 'CLASS', text: 'ClassName' }],
      output: 'Expression',
      style: miniJavaBlockStyle('mj_expr_new_object'),
      tooltip: 'Expression ::= new Identifier ( )',
      helpUrl: ''
    },
    {
      type: 'mj_expr_not',
      message0: '! %1',
      args0: [{ type: 'input_value', name: 'EXPR', check: 'Expression' }],
      output: 'Expression',
      style: miniJavaBlockStyle('mj_expr_not'),
      tooltip: 'Expression ::= ! Expression',
      helpUrl: ''
    },
    {
      type: 'mj_expr_parens',
      message0: '( %1 )',
      args0: [{ type: 'input_value', name: 'EXPR', check: 'Expression' }],
      output: 'Expression',
      style: miniJavaBlockStyle('mj_expr_parens'),
      tooltip: 'Expression ::= ( Expression )',
      helpUrl: ''
    },
    {
      type: 'mj_value_null',
      message0: 'null',
      output: 'Expression',
      style: miniJavaBlockStyle('mj_value_null'),
      tooltip: 'Structural null value (display only)',
      helpUrl: ''
    },
    {
      type: 'mj_viz_description',
      message0: '%1',
      args0: [{ type: 'field_input', name: 'TEXT', text: 'Reduction step' }],
      style: miniJavaBlockStyle('mj_viz_description'),
      tooltip: 'Reduction visualization label',
      helpUrl: ''
    }
  ]);

  // Structural object value (Model B display block): `C { f: [v] ... }`.
  // Its field inputs depend on the class, so it is defined imperatively and
  // shaped by extraState — it never appears in the toolbox or in programs.
  Blockly.Blocks['mj_value_object'] = {
    init(this: Blockly.Block & { fieldNames?: string[]; classNameValue?: string }) {
      this.setOutput(true, 'Expression');
      this.setStyle(miniJavaBlockStyle('mj_value_object'));
      this.setInputsInline(true);
      this.setTooltip('Structural object value (Model B, display only)');
      this.appendDummyInput('HEAD').appendField('Object', 'CLASS').appendField('{');
      this.fieldNames = [];
      this.classNameValue = 'Object';
    },
    saveExtraState(this: Blockly.Block & { fieldNames?: string[]; classNameValue?: string }) {
      return { className: this.classNameValue ?? 'Object', fields: this.fieldNames ?? [] };
    },
    loadExtraState(
      this: Blockly.Block & { fieldNames?: string[]; classNameValue?: string },
      state: { className: string; fields: string[] }
    ) {
      this.classNameValue = state.className;
      this.fieldNames = state.fields;
      this.setFieldValue(state.className, 'CLASS');
      for (const fieldName of state.fields) {
        if (!this.getInput(`F_${fieldName}`)) {
          this.appendValueInput(`F_${fieldName}`).setCheck('Expression').appendField(`${fieldName}:`);
        }
      }
      if (!this.getInput('TAIL')) this.appendDummyInput('TAIL').appendField('}');
    }
  };

  // Validators must be attached after JSON definition.
  const blockTypesWithIdentifierFields = [
    'mj_main_class',
    'mj_class_declaration',
    'mj_class_extends_declaration',
    'mj_var_declaration',
    'mj_method_declaration',
    'mj_formal_parameter',
    'mj_type_identifier',
    'mj_statement_assign',
    'mj_statement_array_assign',
    'mj_expr_method_call',
    'mj_expr_identifier',
    'mj_expr_new_object'
  ];

  for (const blockType of blockTypesWithIdentifierFields) {
    const blockDefinition = Blockly.Blocks[blockType];
    const oldInit = blockDefinition.init;
    blockDefinition.init = function patchedInit(this: Blockly.BlockSvg): void {
      oldInit.call(this);
      for (const name of ['CLASS', 'PARENT', 'ARG', 'NAME', 'METHOD']) {
        const field = this.getField(name);
        if (field instanceof Blockly.FieldTextInput) {
          field.setValidator(textValidator(field.getText() || 'id'));
        }
      }
    };
  }
}

export function createBlockXml(type: string): Element {
  const xmlText = `<xml xmlns="https://developers.google.com/blockly/xml"><block type="${type}"></block></xml>`;
  const dom = Blockly.utils.xml.textToDom(xmlText);
  const block = dom.querySelector('block');
  if (!block) throw new Error(`Could not create block XML for ${type}`);
  return block;
}
