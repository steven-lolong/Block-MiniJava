# Block Color Classification

## Purpose

Block color communicates only a broad grammatical family. The existing BMJ-Thrasos connector shapes continue to communicate the finer non-terminal and connection constraints, while block labels, field labels, tooltips, and connector geometry keep the interface usable without color.

The seven semantic tokens are `grammar.structure`, `grammar.declaration`, `grammar.type`, `grammar.statement`, `grammar.expression`, `grammar.value`, and `grammar.runtime`. Each token has a restrained light- and dark-theme primary color plus renderer-owned secondary and tertiary tones. Blockly continues to own selection, disabled, insertion-marker, highlight, warning, and error rendering.

## Contrast method

The results below measure WCAG relative luminance contrast between the rendered white Blockly label text (`#ffffff`) and the new primary block fill. All primary fills exceed the 4.5:1 AA threshold for normal text. Editable fields, outlines, icons, warning markers, selection strokes, and execution highlights remain separate shape or state indicators and are verified in browser regression coverage.

| Semantic token | Dark primary | Dark contrast | Light primary | Light contrast |
| --- | --- | ---: | --- | ---: |
| `grammar.structure` | `#80505a` | 6.54:1 — Pass | `#754650` | 7.64:1 — Pass |
| `grammar.declaration` | `#685b7a` | 6.24:1 — Pass | `#5e5074` | 7.30:1 — Pass |
| `grammar.type` | `#3d6d5a` | 5.94:1 — Pass | `#346252` | 6.97:1 — Pass |
| `grammar.statement` | `#80602f` | 5.78:1 — Pass | `#75552a` | 6.80:1 — Pass |
| `grammar.expression` | `#455f7f` | 6.57:1 — Pass | `#3a5878` | 7.38:1 — Pass |
| `grammar.value` | `#5c713e` | 5.40:1 — Pass | `#526638` | 6.33:1 — Pass |
| `grammar.runtime` | `#585e68` | 6.53:1 — Pass | `#515761` | 7.28:1 — Pass |

## Complete block classification

“Old color” records the former dark/light primary fills. “Connector shape” names the external grammar connection; root and label blocks have no external connector. Grammar-shaped inputs remain present on those blocks.

| Block type identifier | Grammar or AST role | Connector shape | Old color (dark / light) | New category | New semantic color token | Justification | Light-theme contrast result | Dark-theme contrast result |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| `mj_goal` | `Goal ::= MainClass ClassDeclaration* EOF`; program root | Root; no external connector | `#ff7a45` / `#b8431d` | Structure | `grammar.structure` | Top-level program scaffold rather than an executable declaration. | 7.64:1 — Pass | 6.54:1 — Pass |
| `mj_main_class` | Main-class and `main` entry scaffold | Horizontal `MainClass` | `#ffb000` / `#b86e00` | Structure | `grammar.structure` | Defines the required outer entry structure. | 7.64:1 — Pass | 6.54:1 — Pass |
| `mj_class_declaration` | Class AST node, including optional `extends` | Vertical `ClassDeclaration` | `#d785ff` / `#7c3aed` | Structure | `grammar.structure` | Classes organize the program and contain declaration lists. | 7.64:1 — Pass | 6.54:1 — Pass |
| `mj_var_declaration` | `VarDeclaration ::= Type Identifier ;` | Vertical `VarDeclaration` | `#42e6b8` / `#087f5b` | Declarations | `grammar.declaration` | Introduces a named storage slot with a declared type. | 7.30:1 — Pass | 6.24:1 — Pass |
| `mj_method_declaration` | Method AST node with parameters, locals, body, and return | Vertical `MethodDeclaration` | `#36c9ff` / `#0369a1` | Declarations | `grammar.declaration` | Introduces a named callable member. | 7.30:1 — Pass | 6.24:1 — Pass |
| `mj_formal_parameter` | Formal parameter declaration | Vertical `FormalParameter` | `#82f56b` / `#2f7d32` | Declarations | `grammar.declaration` | Introduces a typed name in a method signature. | 7.30:1 — Pass | 6.24:1 — Pass |
| `mj_type_int_array` | Type AST: `int[]` | Horizontal `Type` | `#5ee0ff` / `#007a9a` | Types | `grammar.type` | Type annotation terminal. | 6.97:1 — Pass | 5.94:1 — Pass |
| `mj_type_boolean` | Type AST: `boolean` | Horizontal `Type` | `#52f27f` / `#15803d` | Types | `grammar.type` | Type annotation terminal. | 6.97:1 — Pass | 5.94:1 — Pass |
| `mj_type_int` | Type AST: `int` | Horizontal `Type` | `#ffd166` / `#a16207` | Types | `grammar.type` | Type annotation terminal. | 6.97:1 — Pass | 5.94:1 — Pass |
| `mj_type_string` | Type AST: `String` | Horizontal `Type` | `#f9a8d4` / `#be185d` | Types | `grammar.type` | Type annotation terminal. | 6.97:1 — Pass | 5.94:1 — Pass |
| `mj_type_identifier` | Type AST: class identifier | Horizontal `Type` | `#a2f5c8` / `#0f766e` | Types | `grammar.type` | User-defined type annotation. | 6.97:1 — Pass | 5.94:1 — Pass |
| `mj_statement_block` | Statement AST: nested statement sequence | Vertical `Statement` | `#ff8a65` / `#c2410c` | Statements | `grammar.statement` | Controls statement sequencing and scope. | 6.80:1 — Pass | 5.78:1 — Pass |
| `mj_statement_if` | Statement AST: conditional branches | Vertical `Statement` | `#ff5c8a` / `#be123c` | Statements | `grammar.statement` | Executable control-flow statement. | 6.80:1 — Pass | 5.78:1 — Pass |
| `mj_statement_while` | Statement AST: loop | Vertical `Statement` | `#f59e0b` / `#b45309` | Statements | `grammar.statement` | Executable control-flow statement. | 6.80:1 — Pass | 5.78:1 — Pass |
| `mj_statement_print` | Statement AST: `System.out.println` | Vertical `Statement` | `#4dd0e1` / `#0e7490` | Statements | `grammar.statement` | Executable output statement. | 6.80:1 — Pass | 5.78:1 — Pass |
| `mj_statement_assign` | Statement AST: scalar assignment | Vertical `Statement` | `#f97316` / `#ea580c` | Statements | `grammar.statement` | Executable mutation statement. | 6.80:1 — Pass | 5.78:1 — Pass |
| `mj_statement_array_assign` | Statement AST: indexed assignment | Vertical `Statement` | `#eab308` / `#a16207` | Statements | `grammar.statement` | Executable mutation statement. | 6.80:1 — Pass | 5.78:1 — Pass |
| `mj_expr_arith` | Expression AST: arithmetic binary operator | Horizontal `Expression` | `#22d3ee` / `#0891b2` | Expressions | `grammar.expression` | Composes operand expressions into a new expression. | 7.38:1 — Pass | 6.57:1 — Pass |
| `mj_expr_compare` | Expression AST: relational binary operator | Horizontal `Expression` | `#60a5fa` / `#2563eb` | Expressions | `grammar.expression` | Composes operand expressions into a boolean expression. | 7.38:1 — Pass | 6.57:1 — Pass |
| `mj_expr_logic` | Expression AST: boolean binary operator | Horizontal `Expression` | `#34d399` / `#047857` | Expressions | `grammar.expression` | Composes operand expressions with logical control. | 7.38:1 — Pass | 6.57:1 — Pass |
| `mj_expr_array_lookup` | Expression AST: indexed lookup | Horizontal `Expression` | `#2dd4bf` / `#0d9488` | Expressions | `grammar.expression` | Composes array and index expressions. | 7.38:1 — Pass | 6.57:1 — Pass |
| `mj_expr_array_length` | Expression AST: array length projection | Horizontal `Expression` | `#38bdf8` / `#0284c7` | Expressions | `grammar.expression` | Derives a result from an operand expression. | 7.38:1 — Pass | 6.57:1 — Pass |
| `mj_expr_char_at` | Expression AST: string character projection | Horizontal `Expression` | `#fb923c` / `#c2410c` | Expressions | `grammar.expression` | Composes string and index expressions. | 7.38:1 — Pass | 6.57:1 — Pass |
| `mj_expr_concat` | Expression AST: string concatenation | Horizontal `Expression` | `#e879f9` / `#a21caf` | Expressions | `grammar.expression` | Composes two string expressions. | 7.38:1 — Pass | 6.57:1 — Pass |
| `mj_expr_str_length` | Expression AST: string length projection | Horizontal `Expression` | `#fbbf24` / `#b45309` | Expressions | `grammar.expression` | Derives a result from an operand expression. | 7.38:1 — Pass | 6.57:1 — Pass |
| `mj_expr_method_call` | Expression AST: receiver call with arguments | Horizontal `Expression` | `#c084fc` / `#9333ea` | Expressions | `grammar.expression` | Composes receiver and argument expressions through invocation. | 7.38:1 — Pass | 6.57:1 — Pass |
| `mj_argument_item` | Expression argument-list adapter | Vertical `ExpressionArg` | `#facc15` / `#a16207` | Expressions | `grammar.expression` | Structural list item whose payload is an expression. | 7.38:1 — Pass | 6.57:1 — Pass |
| `mj_expr_integer` | Expression AST: integer literal | Horizontal `Expression` | `#fde047` / `#854d0e` | Values and literals | `grammar.value` | Leaf literal that directly denotes a value. | 6.33:1 — Pass | 5.40:1 — Pass |
| `mj_expr_string` | Expression AST: string literal | Horizontal `Expression` | `#fda4af` / `#be123c` | Values and literals | `grammar.value` | Leaf literal that directly denotes a value. | 6.33:1 — Pass | 5.40:1 — Pass |
| `mj_expr_boolean` | Expression AST: boolean literal | Horizontal `Expression` | `#4ade80` / `#16a34a` | Values and literals | `grammar.value` | Leaf literal that directly denotes a value. | 6.33:1 — Pass | 5.40:1 — Pass |
| `mj_expr_identifier` | Expression AST: identifier reference | Horizontal `Expression` | `#5eead4` / `#0f766e` | Values and literals | `grammar.value` | Leaf reference whose evaluation retrieves a value. | 6.33:1 — Pass | 5.40:1 — Pass |
| `mj_expr_this` | Expression AST: current receiver | Horizontal `Expression` | `#93c5fd` / `#1d4ed8` | Values and literals | `grammar.value` | Leaf reference to the current object value. | 6.33:1 — Pass | 5.40:1 — Pass |
| `mj_expr_new_int_array` | Expression AST: array allocation | Horizontal `Expression` | `#6ee7b7` / `#059669` | Values and literals | `grammar.value` | Value-producing constructor form; shape still identifies it as an expression. | 6.33:1 — Pass | 5.40:1 — Pass |
| `mj_expr_new_object` | Expression AST: object allocation | Horizontal `Expression` | `#f0abfc` / `#a21caf` | Values and literals | `grammar.value` | Value-producing constructor form; shape still identifies it as an expression. | 6.33:1 — Pass | 5.40:1 — Pass |
| `mj_expr_not` | Expression AST: unary negation | Horizontal `Expression` | `#f43f5e` / `#be123c` | Expressions | `grammar.expression` | Unary operator that composes an operand expression. | 7.38:1 — Pass | 6.57:1 — Pass |
| `mj_expr_parens` | Expression AST: explicit grouping | Horizontal `Expression` | `#cbd5e1` / `#475569` | Expressions | `grammar.expression` | Structural expression wrapper rather than a value terminal. | 7.38:1 — Pass | 6.57:1 — Pass |
| `mj_value_object` | Model B structural object value, display only | Horizontal `Expression` | `#79ead7` / `#0b6f66` | Runtime or semantic-only | `grammar.runtime` | Runtime visualization artifact; never appears in source programs or toolbox. | 7.28:1 — Pass | 6.53:1 — Pass |
| `mj_value_null` | Structural null value, display only | Horizontal `Expression` | `#94a3b8` / `#64748b` | Runtime or semantic-only | `grammar.runtime` | Runtime visualization artifact rather than a MiniJava source literal. | 7.28:1 — Pass | 6.53:1 — Pass |
| `mj_viz_description` | Reduction-step annotation, display only | None | `#64748b` / `#64748b` | Runtime or semantic-only | `grammar.runtime` | Semantic visualization label with no program connection. | 7.28:1 — Pass | 6.53:1 — Pass |

## Invariants

- Every identifier in `MINI_JAVA_BLOCK_TYPES` has exactly one explicit semantic category.
- A MiniJava block style is derived from that category; no MiniJava block may fall back to a Classic/Blockly default style.
- `src/core/renderer/theme.ts` is authoritative for the block-type mapping, seven style names, and Blockly palettes. The matching `--grammar-*` primary values in `tokens.css` exist only to align the custom HTML toolbox accents and must change with the renderer palette.
- Category colors never change connection checks, connector geometry, block fields, inputs, serialization, generation, type checking, or runtime semantics.
- `mj_value_object`, `mj_value_null`, and `mj_viz_description` remain display-only and absent from the source-program toolbox.
- Selected, disabled, highlighted/executing, warning, error, and insertion-marker states remain Blockly or application states layered over the category fill.
