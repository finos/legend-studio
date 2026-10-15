---
title: Extend Columns
sidebar_position: 17
---

# Extend Columns

Adds columns computed from each row by Pure expressions.

Here it adds revenue, amount times price. The cube runs on the sample sales (country, product, year, amount and price; the example "Sales by country and year").

[![The Extend Columns editor, its inputs numbered](../images/steps/extend.png)](../images/steps/extend.png)

1. **The new column's name**.
2. **Its expression**, a lambda of one row: `x | $x.amount->toOne() * $x.price->toOne()`. Its type shows below it once validated.
3. **Move** a column **up** or **down**: a column can use the ones above it.
4. **Add column**, and **Validate** (F10), which checks the expressions with the engine and types them. Apply needs it.
5. **Input columns**: click one to write it in the expression last used.

Good to know:

- An optional column needs `->toOne()` before arithmetic; every new column is optional.
- A JSON (Variant) column's `{}` opens its fields: a field clicked is written into the expression, and **+ column** adds it as a new column. See [JSON columns](../json.md).
