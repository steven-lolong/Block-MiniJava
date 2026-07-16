# Adjusted BNF for Block-MiniJava

This is the grammar Block-MiniJava actually implements. It is the classic
MiniJava BNF (see `MiniJava-BNF.md`, from the UW CSE-401 project page) plus
the **String extension**, restated with the operator families the block
editor uses. Productions marked **(adjusted)** differ from the base BNF;
everything else is unchanged.

## NON-TERMINALS

|     |     |     |
| --- | --- | --- |
| Goal | ::= | MainClass ( ClassDeclaration )\* <EOF> |
| MainClass | ::= | "class" Identifier "{" "public" "static" "void" "main" "(" "String" "\[" "\]" Identifier ")" "{" ( Statement )\* "}" "}" |
| ClassDeclaration | ::= | "class" Identifier ( "extends" Identifier )? "{" ( VarDeclaration )\* ( MethodDeclaration )\* "}" |
| VarDeclaration | ::= | Type Identifier ";" |
| MethodDeclaration | ::= | "public" Type Identifier "(" ( Type Identifier ( "," Type Identifier )\* )? ")" "{" ( VarDeclaration )\* ( Statement )\* "return" Expression ";" "}" |
| Type **(adjusted)** | ::= | "int" "\[" "\]" |
|     | \|  | "boolean" |
|     | \|  | "int" |
|     | \|  | "String" |
|     | \|  | Identifier |
| Statement | ::= | "{" ( Statement )\* "}" |
|     | \|  | "if" "(" Expression ")" Statement "else" Statement |
|     | \|  | "while" "(" Expression ")" Statement |
|     | \|  | "System.out.println" "(" Expression ")" ";" |
|     | \|  | Identifier "=" Expression ";" |
|     | \|  | Identifier "\[" Expression "\]" "=" Expression ";" |
| Expression **(adjusted)** | ::= | Expression ArithOp Expression |
|     | \|  | Expression CompareOp Expression |
|     | \|  | Expression LogicOp Expression |
|     | \|  | Expression "\[" Expression "\]" |
|     | \|  | Expression "." "length" |
|     | \|  | Expression "." "length" "(" ")" |
|     | \|  | Expression "." "charAt" "(" Expression ")" |
|     | \|  | Expression "." "concat" "(" Expression ")" |
|     | \|  | Expression "." Identifier "(" ( Expression ( "," Expression )\* )? ")" |
|     | \|  | <INTEGER\_LITERAL> |
|     | \|  | <STRING\_LITERAL> |
|     | \|  | BoolLiteral |
|     | \|  | Identifier |
|     | \|  | "this" |
|     | \|  | "new" "int" "\[" Expression "\]" |
|     | \|  | "new" Identifier "(" ")" |
|     | \|  | "!" Expression |
|     | \|  | "(" Expression ")" |
| ArithOp **(adjusted)** | ::= | "+" \| "-" \| "\*" |
| CompareOp **(adjusted)** | ::= | "<" |
| LogicOp **(adjusted)** | ::= | "&&" |
| BoolLiteral **(adjusted)** | ::= | "true" \| "false" |
| Identifier | ::= | <IDENTIFIER> |

## LEXICAL

|     |     |     |
| --- | --- | --- |
| <INTEGER\_LITERAL> | ::= | \["0"-"9"\]+ (a leading "-" is accepted where the base BNF's generated text carries a negative integer-literal block) |
| <STRING\_LITERAL> | ::= | '"' ( any character except '"', '\\\\', newline \| EscapeSequence )\* '"' |
| EscapeSequence | ::= | "\\\\\\"" \| "\\\\\\\\" \| "\\\\n" \| "\\\\t" \| "\\\\r" |
| <IDENTIFIER> | ::= | \["a"-"z","A"-"Z","\_"\] \["a"-"z","A"-"Z","0"-"9","\_"\]\* |

Comments (`//` line and `/* … */` block) are whitespace.

## ADJUSTMENTS OVER THE BASE BNF

### 1. The String extension

- **`String` is a primitive type** usable at every annotation site (field,
  local, parameter, return). Its default value is the empty string. `String[]`
  still exists only as main's argument type and has no operations.
- **String literals** are double-quoted with the escape sequences above. A
  literal's *content* is never confused with grammar tokens: `"true"`, `"!"`,
  `"("` are ordinary one-value strings.
- **Three String operators**, all matched *by name* in postfix position (the
  same mechanism the base grammar uses for array `.length`, so user methods
  cannot shadow these spellings):
  - `Expression . charAt ( Expression )` — `String × int → String`. Returns a
    **1-character String** (the language has no `char` type). An out-of-bounds
    index is a runtime error (stuck state), as Java throws.
  - `Expression . concat ( Expression )` — `String × String → String`. The
    only string composition: `+` remains int-only.
  - `Expression . length ( )` — `String → int`. The parens disambiguate as in
    Java: `a.length` (no parens) is **array** length, `s.length()` (empty
    parens) is **String** length, and `o.length(args…)` with one or more
    arguments is an ordinary user method call.
- **`System.out.println`** accepts `int` **or** `String` (base MiniJava:
  `int` only). Strings print raw (unquoted), as Java's `println` writes them.

### 2. Operator families (block-editor form)

The base BNF's flat alternation `( "&&" | "<" | "+" | "-" | "*" )` is split
into three families because the editor represents each family as **one block
with an operator dropdown**; the dropdown's value is the operator text:

| Family | Block | Operators | Typing |
| --- | --- | --- | --- |
| ArithOp | `mj_expr_arith` | `+` `-` `*` | `int × int → int` |
| CompareOp | `mj_expr_compare` | `<` | `int × int → boolean` |
| LogicOp | `mj_expr_logic` | `&&` | `boolean × boolean → boolean` (short-circuit) |

Precedence (loosest to tightest): `&&` < `<` < `+ -` < `*` < unary `!` <
postfix (`[ ]`, `.length`, `.length()`, `.charAt`, `.concat`, method call).
All binary operators associate to the left. Parentheses group; the block
structure carries grouping, so redundant parens normalize away on import.

### 3. Literals and class declarations (block-editor form)

- `BoolLiteral` is **one block** (`mj_expr_boolean`) with a true/false
  dropdown, replacing separate true/false blocks. The text form is unchanged.
- `ClassDeclaration`'s optional `( "extends" Identifier )?` is **one block**
  (`mj_class_declaration`) with a **checkbox**: checked shows the
  `extends ParentName` field pair and emits the extends clause; unchecked
  hides it. The text form is unchanged.

### 4. Contextual keywords

Reserved words: `class public static void extends return int boolean if else
while true false this new`. The words `main`, `String`, `System`, `out`,
`println`, `length`, `charAt`, `concat` remain ordinary identifiers, matched
by value only where they are meaningful — so `charAt = 1;` (a variable named
`charAt`) and a user method `length` *called with arguments* both stay legal.

## BLOCK ↔ GRAMMAR MAP

| Production / token | Block type |
| --- | --- |
| Goal | `mj_goal` |
| MainClass | `mj_main_class` |
| ClassDeclaration (both forms) | `mj_class_declaration` (`HAS_EXTENDS` checkbox) |
| VarDeclaration | `mj_var_declaration` |
| MethodDeclaration | `mj_method_declaration` (params: `mj_formal_parameter`) |
| Type: `int[]` / `boolean` / `int` / `String` / Identifier | `mj_type_int_array` / `mj_type_boolean` / `mj_type_int` / `mj_type_string` / `mj_type_identifier` |
| Statement forms | `mj_statement_block` / `mj_statement_if` / `mj_statement_while` / `mj_statement_print` / `mj_statement_assign` / `mj_statement_array_assign` |
| Expression ArithOp / CompareOp / LogicOp | `mj_expr_arith` / `mj_expr_compare` / `mj_expr_logic` (`OP` dropdown) |
| `e[e]` / `e.length` / `e.length()` / `e.charAt(e)` / `e.concat(e)` | `mj_expr_array_lookup` / `mj_expr_array_length` / `mj_expr_str_length` / `mj_expr_char_at` / `mj_expr_concat` |
| Method call / argument | `mj_expr_method_call` / `mj_argument_item` |
| <INTEGER_LITERAL> / <STRING_LITERAL> / BoolLiteral | `mj_expr_integer` / `mj_expr_string` / `mj_expr_boolean` (`VALUE` dropdown) |
| Identifier / `this` / `new int[e]` / `new Id()` / `!e` / `(e)` | `mj_expr_identifier` / `mj_expr_this` / `mj_expr_new_int_array` / `mj_expr_new_object` / `mj_expr_not` / `mj_expr_parens` |
| display-only values (steppers) | `mj_value_object`, `mj_value_null`, `mj_viz_description` |
