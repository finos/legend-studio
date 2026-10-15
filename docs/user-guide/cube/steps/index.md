---
title: Steps
sidebar_position: 1
---

# Steps

Each step works on the rows of the step before it; Join, Concatenate and Compare work on two. Add one from the palette, or from **Add Items**, after the selected step. Click a step on the graph to edit it: every editor has the parts shown on [The editor](../editor-overview.md#a-steps-editor), and **Apply** stores the changes as one step to undo.

## Rows

- [Filter by Column](./filter.md): Keeps the rows that match conditions on their columns.
- [Filter by Expression](./expressionFilter.md): Keeps the rows for which a Pure expression is true, for conditions Filter by Column can't express, such as arithmetic across columns.
- [Distinct Values](./distinct.md): Keeps one row of each set of identical rows.
- [Drop first rows](./drop.md): Leaves out the first rows.
- [Take first rows](./limit.md): Keeps the first rows.
- [Take a range of rows](./slice.md): Keeps the rows from a start row up to, but not including, a stop row, counting from 0.

## Columns

- [Restrict Columns](./restrict.md): Keeps only the columns ticked.
- [Rename Columns](./rename.md): Gives columns new names.
- [Extend Columns](./extend.md): Adds columns computed from each row by Pure expressions.

## Order

- [Sort by Column](./sort.md): Reorders the rows by one or more columns, each ascending or descending.

## Aggregations

- [Group by Column](./group.md): Makes one row for each combination of the group columns' values, with aggregations of the rows in it.
- [Pivot by Column](./pivot.md): Turns the values of one column into columns.
- [Apply Window Functions](./partition.md): Adds columns computed over windows of rows, such as a rank or a running total, keeping every row.

## Two inputs

- [Join Another Input](./join.md): Joins two inputs on pairs of columns.
- [Concatenate Another Input](./concat.md): Gives the rows of two inputs, keeping duplicates, in no particular order.
- [Compare Column Values](./difference.md): Matches the rows of two inputs on join columns and, for each difference column, gives both values and their difference.

## JSON

- [Explode Array](./explode.md): Makes a row for each element of an array in a JSON (Variant) column, keeping the other columns and adding the element as a new column.
