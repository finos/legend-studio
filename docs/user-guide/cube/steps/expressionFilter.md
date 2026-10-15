---
title: Filter by Expression
sidebar_position: 6
---

# Filter by Expression

Keeps the rows for which a Pure expression is true, for conditions Filter by Column can't express, such as arithmetic across columns.

Here it keeps the sales whose amount times price is over 300. The cube runs on the sample sales (country, product, year, amount and price; the example "Sales by country and year").

[![The Filter by Expression editor, its inputs numbered](../images/steps/expressionFilter.png)](../images/steps/expressionFilter.png)

1. **The condition**, a lambda of one row, as in Query's text mode: `x | $x.amount->toOne() * $x.price->toOne() > 300`.
2. **Show more lines** of the condition.
3. **Validate** (F10) checks the condition with the engine and plans it for the cube's database. Apply needs it.
4. **Input columns**: click one to write it at the end of the condition.

Good to know:

- An optional column needs `->toOne()` before arithmetic.
- Put each comparison in parentheses when you combine them: `($x.A > 1) && ($x.B > 3)`.
- A JSON (Variant) column's `{}` opens its fields; a field clicked is written into the condition. See [JSON columns](../json.md).
