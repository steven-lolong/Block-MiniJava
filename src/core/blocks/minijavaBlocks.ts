import * as Blockly from 'blockly';

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

const C = {
  program: 220,
  class: 205,
  declaration: 190,
  type: 165,
  statement: 24,
  expression: 42,
  literal: 55,
  identifier: 285,
  helper: 250
};

export const MINI_JAVA_CATEGORIES: ToolboxCategory[] = [
  {
    id: 'program',
    label: 'Program',
    icon: '🏁',
    blocks: [
      { type: 'mj_goal', label: 'Goal', icon: '🏁' },
      { type: 'mj_main_class', label: 'Main Class', icon: '🏠' },
      { type: 'mj_class_declaration', label: 'Class Declaration', icon: '🧱' },
      { type: 'mj_class_extends_declaration', label: 'Class Extends Declaration', icon: '🧬' }
    ]
  },
  {
    id: 'declarations',
    label: 'Declarations',
    icon: '📦',
    blocks: [
      { type: 'mj_var_declaration', label: 'Variable Declaration', icon: '📌' },
      { type: 'mj_method_declaration', label: 'Method Declaration', icon: '⚙️' },
      { type: 'mj_formal_parameter', label: 'Formal Parameter', icon: '🔖' }
    ]
  },
  {
    id: 'types',
    label: 'Types',
    icon: '🏷️',
    blocks: [
      { type: 'mj_type_int_array', label: 'int[]', icon: '🔢' },
      { type: 'mj_type_boolean', label: 'boolean', icon: '☑️' },
      { type: 'mj_type_int', label: 'int', icon: '🔢' },
      { type: 'mj_type_identifier', label: 'Identifier Type', icon: '🏷️' }
    ]
  },
  {
    id: 'statements',
    label: 'Statements',
    icon: '🧾',
    blocks: [
      { type: 'mj_statement_block', label: 'Block Statement', icon: '▣' },
      { type: 'mj_statement_if', label: 'if / else', icon: '🔀' },
      { type: 'mj_statement_while', label: 'while', icon: '🔁' },
      { type: 'mj_statement_print', label: 'System.out.println', icon: '🖨️' },
      { type: 'mj_statement_assign', label: 'Assignment', icon: '✍️' },
      { type: 'mj_statement_array_assign', label: 'Array Assignment', icon: '📚' }
    ]
  },
  {
    id: 'expressions',
    label: 'Expressions',
    icon: '🧮',
    blocks: [
      { type: 'mj_expr_and', label: '&&', icon: '∧' },
      { type: 'mj_expr_less', label: '<', icon: '<' },
      { type: 'mj_expr_plus', label: '+', icon: '+' },
      { type: 'mj_expr_minus', label: '-', icon: '−' },
      { type: 'mj_expr_times', label: '*', icon: '×' },
      { type: 'mj_expr_array_lookup', label: 'Array Lookup', icon: '[]' },
      { type: 'mj_expr_array_length', label: 'Array Length', icon: '↔' },
      { type: 'mj_expr_method_call', label: 'Method Call', icon: '☎' },
      { type: 'mj_argument_item', label: 'Argument Item', icon: '•' },
      { type: 'mj_expr_not', label: 'Not', icon: '!' },
      { type: 'mj_expr_parens', label: 'Parenthesized', icon: '( )' }
    ]
  },
  {
    id: 'values',
    label: 'Values',
    icon: '💎',
    blocks: [
      { type: 'mj_expr_integer', label: 'Integer', icon: '123' },
      { type: 'mj_expr_true', label: 'true', icon: 'T' },
      { type: 'mj_expr_false', label: 'false', icon: 'F' },
      { type: 'mj_expr_identifier', label: 'Identifier', icon: 'id' },
      { type: 'mj_expr_this', label: 'this', icon: '◎' },
      { type: 'mj_expr_new_int_array', label: 'new int[]', icon: 'new[]' },
      { type: 'mj_expr_new_object', label: 'new Object', icon: 'obj' }
    ]
  }
];

const textValidator = (fallback: string) => (value: string | null): string => {
  const clean = (value ?? '').trim().replace(/[^A-Za-z0-9_]/g, '');
  if (!clean) return fallback;
  if (/^[0-9]/.test(clean)) return `${fallback}${clean}`;
  return clean;
};

export function defineMiniJavaBlocks(): void {
  Blockly.common.defineBlocksWithJsonArray([
    {
      type: 'mj_goal',
      message0: 'Goal %1 MainClass %2 ClassDeclaration* %3',
      args0: [
        { type: 'input_dummy' },
        { type: 'input_value', name: 'MAIN', check: 'MainClass' },
        { type: 'input_statement', name: 'CLASSES', check: 'ClassDeclaration' }
      ],
      colour: C.program,
      tooltip: 'Goal ::= MainClass ClassDeclaration* EOF',
      helpUrl: ''
    },
    {
      type: 'mj_main_class',
      message0: 'class %1 main argument %2 %3 %4',
      args0: [
        { type: 'field_input', name: 'CLASS', text: 'Main' },
        { type: 'field_input', name: 'ARG', text: 'args' },
        { type: 'input_dummy' },
        { type: 'input_statement', name: 'STATEMENT', check: 'Statement' }
      ],
      output: 'MainClass',
      colour: C.class,
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
      colour: C.class,
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
      colour: C.class,
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
      colour: C.declaration,
      tooltip: 'VarDeclaration ::= Type Identifier ;',
      helpUrl: ''
    },
    {
      type: 'mj_method_declaration',
      message0: 'public %1 %2 ( params %3 ) %4 vars %5 body %6 return %7',
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
      colour: C.declaration,
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
      colour: C.helper,
      tooltip: 'Formal parameter ::= Type Identifier',
      helpUrl: ''
    },
    {
      type: 'mj_type_int_array',
      message0: 'int [ ]',
      output: 'Type',
      colour: C.type,
      tooltip: 'Type ::= int[]',
      helpUrl: ''
    },
    {
      type: 'mj_type_boolean',
      message0: 'boolean',
      output: 'Type',
      colour: C.type,
      tooltip: 'Type ::= boolean',
      helpUrl: ''
    },
    {
      type: 'mj_type_int',
      message0: 'int',
      output: 'Type',
      colour: C.type,
      tooltip: 'Type ::= int',
      helpUrl: ''
    },
    {
      type: 'mj_type_identifier',
      message0: 'type %1',
      args0: [{ type: 'field_input', name: 'NAME', text: 'ClassName' }],
      output: 'Type',
      colour: C.type,
      tooltip: 'Type ::= Identifier',
      helpUrl: ''
    },
    {
      type: 'mj_statement_block',
      message0: '{ statements %1 }',
      args0: [{ type: 'input_statement', name: 'STATEMENTS', check: 'Statement' }],
      previousStatement: 'Statement',
      nextStatement: 'Statement',
      colour: C.statement,
      tooltip: 'Statement ::= { Statement* }',
      helpUrl: ''
    },
    {
      type: 'mj_statement_if',
      message0: 'if ( %1 ) then %2 else %3',
      args0: [
        { type: 'input_value', name: 'COND', check: 'Expression' },
        { type: 'input_statement', name: 'THEN', check: 'Statement' },
        { type: 'input_statement', name: 'ELSE', check: 'Statement' }
      ],
      previousStatement: 'Statement',
      nextStatement: 'Statement',
      colour: C.statement,
      tooltip: 'Statement ::= if ( Expression ) Statement else Statement',
      helpUrl: ''
    },
    {
      type: 'mj_statement_while',
      message0: 'while ( %1 ) %2',
      args0: [
        { type: 'input_value', name: 'COND', check: 'Expression' },
        { type: 'input_statement', name: 'BODY', check: 'Statement' }
      ],
      previousStatement: 'Statement',
      nextStatement: 'Statement',
      colour: C.statement,
      tooltip: 'Statement ::= while ( Expression ) Statement',
      helpUrl: ''
    },
    {
      type: 'mj_statement_print',
      message0: 'System.out.println ( %1 )',
      args0: [{ type: 'input_value', name: 'VALUE', check: 'Expression' }],
      previousStatement: 'Statement',
      nextStatement: 'Statement',
      colour: C.statement,
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
      colour: C.statement,
      tooltip: 'Statement ::= Identifier = Expression ;',
      helpUrl: ''
    },
    {
      type: 'mj_statement_array_assign',
      message0: '%1 [ %2 ] = %3',
      args0: [
        { type: 'field_input', name: 'NAME', text: 'array' },
        { type: 'input_value', name: 'INDEX', check: 'Expression' },
        { type: 'input_value', name: 'VALUE', check: 'Expression' }
      ],
      previousStatement: 'Statement',
      nextStatement: 'Statement',
      colour: C.statement,
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
      colour: C.expression,
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
      colour: C.expression,
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
      colour: C.expression,
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
      colour: C.expression,
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
      colour: C.expression,
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
      colour: C.expression,
      tooltip: 'Expression ::= Expression [ Expression ]',
      helpUrl: ''
    },
    {
      type: 'mj_expr_array_length',
      message0: '%1 . length',
      args0: [{ type: 'input_value', name: 'ARRAY', check: 'Expression' }],
      output: 'Expression',
      colour: C.expression,
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
      colour: C.expression,
      tooltip: 'Expression ::= Expression . Identifier ( Expression (, Expression)* )',
      helpUrl: ''
    },
    {
      type: 'mj_argument_item',
      message0: 'arg %1',
      args0: [{ type: 'input_value', name: 'EXPR', check: 'Expression' }],
      previousStatement: 'ExpressionArg',
      nextStatement: 'ExpressionArg',
      colour: C.helper,
      tooltip: 'Expression argument item',
      helpUrl: ''
    },
    {
      type: 'mj_expr_integer',
      message0: 'int literal %1',
      args0: [{ type: 'field_number', name: 'VALUE', value: 0, precision: 1 }],
      output: 'Expression',
      colour: C.literal,
      tooltip: 'Expression ::= IntegerLiteral',
      helpUrl: ''
    },
    {
      type: 'mj_expr_true',
      message0: 'true',
      output: 'Expression',
      colour: C.literal,
      tooltip: 'Expression ::= true',
      helpUrl: ''
    },
    {
      type: 'mj_expr_false',
      message0: 'false',
      output: 'Expression',
      colour: C.literal,
      tooltip: 'Expression ::= false',
      helpUrl: ''
    },
    {
      type: 'mj_expr_identifier',
      message0: 'identifier %1',
      args0: [{ type: 'field_input', name: 'NAME', text: 'x' }],
      output: 'Expression',
      colour: C.identifier,
      tooltip: 'Expression ::= Identifier',
      helpUrl: ''
    },
    {
      type: 'mj_expr_this',
      message0: 'this',
      output: 'Expression',
      colour: C.identifier,
      tooltip: 'Expression ::= this',
      helpUrl: ''
    },
    {
      type: 'mj_expr_new_int_array',
      message0: 'new int [ %1 ]',
      args0: [{ type: 'input_value', name: 'SIZE', check: 'Expression' }],
      output: 'Expression',
      colour: C.expression,
      tooltip: 'Expression ::= new int [ Expression ]',
      helpUrl: ''
    },
    {
      type: 'mj_expr_new_object',
      message0: 'new %1 ( )',
      args0: [{ type: 'field_input', name: 'CLASS', text: 'ClassName' }],
      output: 'Expression',
      colour: C.expression,
      tooltip: 'Expression ::= new Identifier ( )',
      helpUrl: ''
    },
    {
      type: 'mj_expr_not',
      message0: '! %1',
      args0: [{ type: 'input_value', name: 'EXPR', check: 'Expression' }],
      output: 'Expression',
      colour: C.expression,
      tooltip: 'Expression ::= ! Expression',
      helpUrl: ''
    },
    {
      type: 'mj_expr_parens',
      message0: '( %1 )',
      args0: [{ type: 'input_value', name: 'EXPR', check: 'Expression' }],
      output: 'Expression',
      colour: C.expression,
      tooltip: 'Expression ::= ( Expression )',
      helpUrl: ''
    }
  ]);

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
