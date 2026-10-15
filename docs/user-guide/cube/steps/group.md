---
title: Group by Column
sidebar_position: 3
---

# Group by Column

Makes one row for each combination of the group columns' values, with aggregations of the rows in it.

Here it gives each country's total amount and number of sales. The cube runs on the sample sales (country, product, year, amount and price; the example "Sales by country and year").

[![The Group by Column editor, its inputs numbered](../images/steps/group.png)](../images/steps/group.png)

1. **Group columns**: tick the columns to group by.
2. **None** unticks them all: one row for all the rows.
3. **The column** an aggregation reads.
4. **The aggregation**: Count, Distinct Count, Distinct Value, Sum, Average, Min, Max, or Count Rows. Count Rows reads no column, so it shows under **Every row**.
5. **The new column's name**.
6. **Add aggregation**.

Good to know:

- Count counts the values that aren't empty; Count Rows counts every row.
- With no group column, the result is one row, even when there are no rows.
