import * as Blockly from 'blockly';
import { MINI_JAVA_RESERVED_WORDS } from '../parser/minijavaTextParser';
import { miniJavaBlockStyle } from '../renderer/theme';

export {
  MINI_JAVA_BLOCK_TYPES,
  MINI_JAVA_BLOCK_COLOR_CATEGORY,
  miniJavaBlockStyle
} from '../renderer/theme';
export type { MiniJavaBlockType, MiniJavaBlockColorCategory } from '../renderer/theme';

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

export const MINI_JAVA_CATEGORIES: ToolboxCategory[] = [
  {
    id: 'program',
    label: 'Program',
    icon: 'P',
    blocks: [
      { type: 'mj_class_declaration', label: 'Class Declaration', icon: 'cls' }
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
      { type: 'mj_type_string', label: 'String', icon: 'str' },
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
      { type: 'mj_expr_arith', label: 'Arithmetic (+ − × ÷)', icon: '+' },
      { type: 'mj_expr_compare', label: 'Compare (< ≤ > ≥)', icon: '<' },
      { type: 'mj_expr_logic', label: 'Logic (&& ||)', icon: '&&' },
      { type: 'mj_expr_array_lookup', label: 'Array Lookup', icon: '[]' },
      { type: 'mj_expr_array_length', label: 'Array Length', icon: 'len' },
      { type: 'mj_expr_char_at', label: 'charAt', icon: '@' },
      { type: 'mj_expr_concat', label: 'concat', icon: '++' },
      { type: 'mj_expr_str_length', label: 'String Length', icon: '#' },
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
      { type: 'mj_expr_string', label: 'String Literal', icon: '"a"' },
      { type: 'mj_expr_boolean', label: 'Boolean', icon: 'T/F' },
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
      message0: 'Goal %1 Class%2',
      args0: [
        { type: 'input_value', name: 'MAIN', check: 'MainClass' },
        { type: 'input_statement', name: 'CLASSES', check: 'ClassDeclaration' }
      ],
      inputsInline: false,
      style: miniJavaBlockStyle('mj_goal'),
      tooltip: 'Goal ::= MainClass Class Declaration* EOF',
      helpUrl: ''
    },
    {
      type: 'mj_main_class',
      message0: 'class %1 %2 public static void main ( String [] %3 ) %4 %5',
      args0: [
        { type: 'field_input', name: 'CLASS', text: 'MainClassName' },
        { type: 'input_dummy' },
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
      type: 'mj_var_declaration',
      message0: 'type %1 name %2',
      args0: [
        { type: 'input_value', name: 'TYPE', check: 'Type' },
        { type: 'field_input', name: 'NAME', text: 'variable' }
      ],
      previousStatement: 'VarDeclaration',
      nextStatement: 'VarDeclaration',
      style: miniJavaBlockStyle('mj_var_declaration'),
      tooltip: 'VarDeclaration ::= Type Identifier ;',
      helpUrl: ''
    },
    {
      type: 'mj_method_declaration',
      message0: 'public type %1 name %2 %3 parameters %4 %5 variables %6 body %7 return value %8',
      args0: [
        { type: 'input_value', name: 'TYPE', check: 'Type' },
        { type: 'field_input', name: 'NAME', text: 'method' },
        { type: 'input_dummy'},
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
      message0: 'type %1 name %2',
      args0: [
        { type: 'input_value', name: 'TYPE', check: 'Type' },
        { type: 'field_input', name: 'NAME', text: 'parameter' }
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
      type: 'mj_type_string',
      message0: 'String',
      output: 'Type',
      style: miniJavaBlockStyle('mj_type_string'),
      tooltip: 'Type ::= String',
      helpUrl: ''
    },
    {
      type: 'mj_type_identifier',
      message0: 'type name %1',
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
      message0: 'while %1 do %2',
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
      message0: 'assign %1 = %2',
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
      message0: 'assign array %1 name %2 %3 index %4 = %5',
      args0: [
        { type: 'input_dummy'},
        { type: 'field_input', name: 'NAME', text: 'array' },
        { type: 'input_dummy' },
        { type: 'input_value', name: 'INDEX', check: 'Expression', align: 'RIGHT' },
        { type: 'input_value', name: 'VALUE', check: 'Expression', align: 'RIGHT' }
      ],
      previousStatement: 'Statement',
      nextStatement: 'Statement',
      style: miniJavaBlockStyle('mj_statement_array_assign'),
      tooltip: 'Statement ::= Identifier [ Expression ] = Expression ;',
      helpUrl: ''
    },
    {
      // One block for all int arithmetic; the operator is a dropdown whose
      // value IS the MiniJava operator text.
      type: 'mj_expr_arith',
      message0: 'arithmetic %1 %2 %3',
      args0: [
        { type: 'input_value', name: 'LEFT', check: 'Expression' },
        { type: 'field_dropdown', name: 'OP', options: [['+', '+'], ['-', '-'], ['*', '*'], ['/', '/']] },
        { type: 'input_value', name: 'RIGHT', check: 'Expression' }
      ],
      inputsInline: true,
      output: 'Expression',
      style: miniJavaBlockStyle('mj_expr_arith'),
      tooltip: 'Expression ::= Expression ( + | - | * ) Expression',
      helpUrl: ''
    },
    {
      // MiniJava's only comparison is <; the dropdown keeps the shape uniform
      // with the arithmetic/logic blocks and leaves room for extensions.
      type: 'mj_expr_compare',
      message0: 'compare %1 %2 %3',
      args0: [
        { type: 'input_value', name: 'LEFT', check: 'Expression' },
        { type: 'field_dropdown', name: 'OP', options: [['<', '<'], ['<=', '<='], ['>', '>'], ['>=', '>=']] },
        { type: 'input_value', name: 'RIGHT', check: 'Expression' }
      ],
      inputsInline: true,
      output: 'Expression',
      style: miniJavaBlockStyle('mj_expr_compare'),
      tooltip: 'Expression ::= Expression < Expression',
      helpUrl: ''
    },
    {
      // MiniJava's only boolean connective is &&.
      type: 'mj_expr_logic',
      message0: 'logic %1 %2 %3',
      args0: [
        { type: 'input_value', name: 'LEFT', check: 'Expression' },
        { type: 'field_dropdown', name: 'OP', options: [['&&', '&&'], ['||', '||']] },
        { type: 'input_value', name: 'RIGHT', check: 'Expression' }
      ],
      inputsInline: true,
      output: 'Expression',
      style: miniJavaBlockStyle('mj_expr_logic'),
      tooltip: 'Expression ::= Expression && Expression',
      helpUrl: ''
    },
    {
      type: 'mj_expr_array_lookup',
      message0: 'lookup array %1 index %2',
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
      message0: 'array length %1',
      args0: [{ type: 'input_value', name: 'ARRAY', check: 'Expression' }],
      output: 'Expression',
      style: miniJavaBlockStyle('mj_expr_array_length'),
      tooltip: 'Expression ::= Expression . length',
      helpUrl: ''
    },
    {
      // charAt yields a 1-character String: the language has no char type.
      type: 'mj_expr_char_at',
      message0: 'string %1 char at index %2',
      args0: [
        { type: 'input_value', name: 'STR', check: 'Expression' },
        { type: 'input_value', name: 'INDEX', check: 'Expression' }
      ],
      inputsInline: true,
      output: 'Expression',
      style: miniJavaBlockStyle('mj_expr_char_at'),
      tooltip: 'Expression ::= Expression . charAt ( Expression )',
      helpUrl: ''
    },
    {
      type: 'mj_expr_concat',
      message0: 'string %1 concat %2 )',
      args0: [
        { type: 'input_value', name: 'LEFT', check: 'Expression' },
        { type: 'input_value', name: 'RIGHT', check: 'Expression' }
      ],
      inputsInline: true,
      output: 'Expression',
      style: miniJavaBlockStyle('mj_expr_concat'),
      tooltip: 'Expression ::= Expression . concat ( Expression )',
      helpUrl: ''
    },
    {
      // String length is `s.length()` WITH parens (as in Java), while array
      // length is `a.length` without — the text forms stay distinguishable.
      type: 'mj_expr_str_length',
      message0: 'string length %1',
      args0: [{ type: 'input_value', name: 'STR', check: 'Expression' }],
      inputsInline: true,
      output: 'Expression',
      style: miniJavaBlockStyle('mj_expr_str_length'),
      tooltip: 'Expression ::= Expression . length ( )',
      helpUrl: ''
    },
    {
      type: 'mj_expr_method_call',
      message0: 'call method %1 %2 in object %3  arguments %4',
      args0: [
        { type: 'field_input', name: 'METHOD', text: 'name' },
        { type: 'input_dummy' },
        { type: 'input_value', name: 'OBJECT', check: 'Expression', align: 'RIGHT' },
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
      message0: 'int %1',
      args0: [{ type: 'field_number', name: 'VALUE', value: 0, precision: 1 }],
      output: 'Expression',
      style: miniJavaBlockStyle('mj_expr_integer'),
      tooltip: 'Expression ::= IntegerLiteral',
      helpUrl: ''
    },
    {
      // The TEXT field is free-form (not identifier-validated): any characters
      // are allowed; the generator escapes them into a MiniJava string literal.
      type: 'mj_expr_string',
      message0: 'string " %1 "',
      args0: [{ type: 'field_input', name: 'TEXT', text: '' }],
      output: 'Expression',
      style: miniJavaBlockStyle('mj_expr_string'),
      tooltip: 'Expression ::= StringLiteral',
      helpUrl: ''
    },
    {
      // One boolean literal; true/false is a dropdown selection.
      type: 'mj_expr_boolean',
      message0: 'boolean %1',
      args0: [{ type: 'field_dropdown', name: 'VALUE', options: [['true', 'true'], ['false', 'false']] }],
      output: 'Expression',
      style: miniJavaBlockStyle('mj_expr_boolean'),
      tooltip: 'Expression ::= true | false',
      helpUrl: ''
    },
    {
      type: 'mj_expr_identifier',
      message0: 'id %1',
      args0: [{ type: 'field_input', name: 'NAME', text: 'identifier' }],
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
      message0: 'new object %1',
      args0: [{ type: 'field_input', name: 'CLASS', text: 'ClassName' }],
      output: 'Expression',
      style: miniJavaBlockStyle('mj_expr_new_object'),
      tooltip: 'Expression ::= new Identifier ( )',
      helpUrl: ''
    },
    {
      type: 'mj_expr_not',
      message0: 'not %1',
      args0: [{ type: 'input_value', name: 'EXPR', check: 'Expression' }],
      output: 'Expression',
      style: miniJavaBlockStyle('mj_expr_not'),
      tooltip: 'Expression ::= ! Expression',
      helpUrl: ''
    },
    {
      type: 'mj_expr_parens',
      message0: 'parentheses  %1',
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

  // Class declaration: ONE block for both plain and extends forms. The
  // HAS_EXTENDS checkbox shows/hides the `extends ParentName` field pair;
  // defined imperatively because field visibility needs a validator hook.
  Blockly.Blocks['mj_class_declaration'] = {
    init(this: Blockly.Block) {
      const extendsLabel = new Blockly.FieldLabel('extends');
      const parentField = new Blockly.FieldTextInput('ParentName');
      this.appendDummyInput('HEAD')
        .appendField('class')
        .appendField(new Blockly.FieldTextInput('ClassName'), 'CLASS')
        .appendField(new Blockly.FieldCheckbox('FALSE'), 'HAS_EXTENDS')
        .appendField(extendsLabel, 'EXTENDS_LABEL')
        .appendField(parentField, 'PARENT');
      this.appendStatementInput('VARS').setCheck('VarDeclaration').appendField('fields');
      this.appendStatementInput('METHODS').setCheck('MethodDeclaration').appendField('methods');
      this.setPreviousStatement(true, 'ClassDeclaration');
      this.setNextStatement(true, 'ClassDeclaration');
      this.setStyle(miniJavaBlockStyle('mj_class_declaration'));
      this.setTooltip('ClassDeclaration ::= class Identifier ( extends Identifier )? { VarDeclaration* MethodDeclaration* }');
      const applyExtendsVisibility = (checked: boolean): void => {
        extendsLabel.setVisible(checked);
        parentField.setVisible(checked);
        const svg = this as Blockly.Block & { rendered?: boolean; queueRender?: () => void };
        if (svg.rendered) svg.queueRender?.();
      };
      this.getField('HAS_EXTENDS')!.setValidator((value: string) => {
        applyExtendsVisibility(value === 'TRUE');
        return value;
      });
      applyExtendsVisibility(false);
    }
  };

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
