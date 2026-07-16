import * as Blockly from 'blockly';

export const MINI_JAVA_RENDERER_NAME = 'bmj-thrasos';

type PuzzleTab = Blockly.blockRendering.PuzzleTab;
type Notch = Blockly.blockRendering.Notch;
type Shape = Blockly.blockRendering.PuzzleTab | Blockly.blockRendering.Notch | Blockly.blockRendering.DynamicShape | Blockly.blockRendering.BaseShape;

type Point = readonly [number, number];

const HORIZONTAL_NON_TERMINALS = [
  'Goal',
  'MainClass',
  'ClassDeclaration',
  'VarDeclaration',
  'MethodDeclaration',
  'FormalParameter',
  'Type',
  'Statement',
  'Expression',
  'Identifier'
] as const;

const VERTICAL_NON_TERMINALS = [
  'ClassDeclaration',
  'VarDeclaration',
  'MethodDeclaration',
  'Statement',
  'FormalParameter',
  'ExpressionArg'
] as const;

const BLOCK_NON_TERMINAL: Record<string, string> = {
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

function line(points: readonly Point[]): string {
  return points.map(([x, y]) => ` l ${x},${y} `).join('');
}

function mirrorVertical(points: readonly Point[]): Point[] {
  return points.map(([x, y]) => [x, -y] as const);
}

function mirrorHorizontal(points: readonly Point[]): Point[] {
  return points.map(([x, y]) => [-x, y] as const);
}

function puzzle(type: number, width: number, height: number, down: string, up: string): PuzzleTab {
  return { type, width, height, pathDown: down, pathUp: up };
}

function puzzleFromPoints(type: number, width: number, height: number, downPoints: readonly Point[]): PuzzleTab {
  return puzzle(type, width, height, line(downPoints), line(mirrorVertical(downPoints)));
}

function notch(type: number, width: number, height: number, left: string, right: string): Notch {
  return { type, width, height, pathLeft: left, pathRight: right };
}

function notchFromPoints(type: number, width: number, height: number, leftPoints: readonly Point[]): Notch {
  return notch(type, width, height, line(leftPoints), line(mirrorHorizontal(leftPoints)));
}

function primaryCheck(connection: Blockly.RenderedConnection): string | null {
  const checks = connection.getCheck() ?? connection.targetConnection?.getCheck() ?? null;
  if (checks?.length) return checks[0];
  const sourceBlock = connection.getSourceBlock();
  return BLOCK_NON_TERMINAL[sourceBlock.type] ?? null;
}

/**
 * B-MJ constants extend Thrasos/Common rendering with grammar-aware connection
 * geometry.  Blockly still enforces compatibility by check strings; the custom
 * shapes add a visual grammar cue before the user tries to connect blocks.
 */
class MiniJavaConstantProvider extends Blockly.blockRendering.ConstantProvider {
  private horizontalShapes: Record<string, PuzzleTab> = {};
  private verticalShapes: Record<string, Notch> = {};

  override init(): void {
    super.init();
    this.horizontalShapes = this.makeHorizontalShapes();
    this.verticalShapes = this.makeVerticalShapes();
  }

  private makeHorizontalShapes(): Record<string, PuzzleTab> {
    const type = this.SHAPES.PUZZLE;
    const shapes: PuzzleTab[] = [
      // 1. Goal: broad angled tab.
      puzzleFromPoints(type, 11, 18, [
        [-8, 4],
        [-3, 5],
        [3, 5],
        [8, 4]
      ]),
      // 2. MainClass: soft wave tab.
      puzzle(
        type,
        10,
        18,
        ' q -10,0 -10,9 q 0,9 10,9 ',
        ' q -10,0 -10,-9 q 0,-9 10,-9 '
      ),
      // 3. ClassDeclaration: stepped square tab.
      puzzleFromPoints(type, 11, 18, [
        [-11, 0],
        [0, 18],
        [11, 0]
      ]),
      // 4. VarDeclaration: diamond tab.
      puzzleFromPoints(type, 10, 18, [
        [-6, 4],
        [-4, 5],
        [4, 5],
        [6, 4]
      ]),
      // 5. MethodDeclaration: tall chevron tab.
      puzzleFromPoints(type, 11, 18, [
        [-10, 4],
        [5, 5],
        [-5, 5],
        [10, 4]
      ]),
      // 6. FormalParameter: shallow trapezoid tab.
      puzzleFromPoints(type, 9, 18, [
        [-9, 5],
        [0, 8],
        [9, 5]
      ]),
      // 7. Type: rounded compact tab.
      puzzle(
        type,
        8,
        18,
        ' c 0,7 -8,-6 -8,9 s 8,2 8,9 ',
        ' c 0,-7 -8,6 -8,-9 s 8,-2 8,-9 '
      ),
      // 8. Statement: angular notch-like horizontal tab.
      puzzleFromPoints(type, 11, 18, [
        [-5, 3],
        [-6, 6],
        [6, 6],
        [5, 3]
      ]),
      // 9. Expression: Blockly-like classic curve, slightly larger than default.
      puzzle(
        type,
        10,
        18,
        ' c 0,11 -10,-9 -10,9 s 10,-2 10,9 ',
        ' c 0,-11 -10,9 -10,-9 s 10,2 10,-9 '
      ),
      // 10. Identifier: narrow socket cue.
      puzzleFromPoints(type, 7, 18, [
        [-7, 3],
        [2, 6],
        [-2, 6],
        [7, 3]
      ])
    ];

    return Object.fromEntries(HORIZONTAL_NON_TERMINALS.map((name, index) => [name, shapes[index]]));
  }

  private makeVerticalShapes(): Record<string, Notch> {
    const type = this.SHAPES.NOTCH;
    const statementShape = notchFromPoints(type, 18, 5, [
      [7, 5],
      [4, 0],
      [7, -5]
    ]);

    return {
      ClassDeclaration: notchFromPoints(type, 18, 5, [
        [4, 0],
        [0, 5],
        [10, 0],
        [0, -5],
        [4, 0]
      ]),
      VarDeclaration: notchFromPoints(type, 18, 5, [
        [5, 5],
        [4, -5],
        [4, 5],
        [5, -5]
      ]),
      MethodDeclaration: notchFromPoints(type, 20, 6, [
        [6, 6],
        [8, 0],
        [6, -6]
      ]),
      Statement: statementShape,
      // The smooth arch is deliberately from a different visual family than
      // ClassDeclaration's box and VarDeclaration's angular zigzag.  The
      // cubic reaches about 4.5px deep and retains the common 18px spacing.
      FormalParameter: notch(
        type,
        18,
        5,
        ' l 3,0 c 0,6 12,6 12,0 l 3,0 ',
        ' l -3,0 c 0,6 -12,6 -12,0 l -3,0 '
      ),
      // ExpressionArg reuses the formal/list-item notch family.  The Blockly
      // connection check still prevents arguments and formal parameters from
      // connecting to each other.
      ExpressionArg: notchFromPoints(type, 18, 5, [
        [6, 0],
        [3, 5],
        [3, -5],
        [6, 0]
      ])
    };
  }

  override shapeFor(connection: Blockly.RenderedConnection): Shape {
    const nonTerminal = primaryCheck(connection);

    switch (connection.type) {
      case Blockly.ConnectionType.INPUT_VALUE:
      case Blockly.ConnectionType.OUTPUT_VALUE:
        return (nonTerminal && this.horizontalShapes[nonTerminal]) || this.PUZZLE_TAB;
      case Blockly.ConnectionType.PREVIOUS_STATEMENT:
      case Blockly.ConnectionType.NEXT_STATEMENT:
        return (nonTerminal && this.verticalShapes[nonTerminal]) || this.NOTCH;
      default:
        return super.shapeFor(connection);
    }
  }
}

class MiniJavaRenderer extends Blockly.thrasos.Renderer {
  override makeConstants_(): Blockly.blockRendering.ConstantProvider {
    return new MiniJavaConstantProvider();
  }
}

export function registerMiniJavaRenderer(): void {
  if (!Blockly.registry.hasItem(Blockly.registry.Type.RENDERER, MINI_JAVA_RENDERER_NAME)) {
    Blockly.blockRendering.register(MINI_JAVA_RENDERER_NAME, MiniJavaRenderer);
  }
}
