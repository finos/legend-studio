/**
 * Copyright (c) 2026-present, Goldman Sachs
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *     http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */

import type { Schema } from '../schema/Schema.js';
import { parseValue } from '../values/ValueEntry.js';
import type { CubeType } from '../types/CubeType.js';
import { TypeFamily } from '../types/TypeFamily.js';
import {
  FilterOperator,
  getDefaultOperator,
  getFilterValueShape,
  getNegatedOperator,
  isOperatorAvailable,
} from './FilterOperator.js';
import {
  ColumnComparisonFilter,
  CompositeFilter,
  CompositeFilterOperator,
  type FilterRule,
  type FilterValue,
  type FilterValueItem,
  isFilterValueList,
  NotFilter,
} from './FilterTree.js';

/**
 * The filter as the editor holds it: always an And/Or group to add rows to.
 * No filter becomes a group with one blank row; a single rule becomes a group
 * of that rule.
 */
export const normalizeFilter = (filter?: FilterRule): CompositeFilter => {
  if (!filter) {
    return new CompositeFilter(CompositeFilterOperator.AND, [
      new ColumnComparisonFilter(''),
    ]);
  }
  return filter.kind === 'composite'
    ? (filter as CompositeFilter)
    : new CompositeFilter(CompositeFilterOperator.AND, [filter]);
};

/**
 * The filter as stored: a top-level group with exactly one rule becomes that
 * rule, so the stored filter stays minimal. Groups below the top are kept.
 */
export const unwrapFilter = (filter: FilterRule): FilterRule => {
  if (filter.kind !== 'composite') {
    return filter;
  }
  const { rules } = filter as CompositeFilter;
  const [only] = rules;
  return rules.length === 1 && only ? only : filter;
};

/**
 * Whether a value entered for one type still means the same for the other:
 * types of the same family do (`Varchar(5)` and `Varchar(40)`), except two
 * different enumerations.
 */
const takeSameValues = (from: CubeType, to: CubeType): boolean =>
  from.family === to.family &&
  (from.family !== TypeFamily.ENUM || from.equals(to));

// text that was not a value of the old type may be one of the new type, e.g.
// 300 is out of range for TinyInt but fine for SmallInt
const readInvalidAgain = (
  item: FilterValueItem,
  type: CubeType,
): FilterValueItem => {
  if (item.kind !== 'invalid') {
    return item;
  }
  const value = parseValue(item.text, type);
  // text that is still invalid stays the same item
  return value === undefined || value.kind === 'invalid' ? item : value;
};

const readValueAgain = (
  value: FilterValue | undefined,
  type: CubeType,
): FilterValue | undefined => {
  if (value === undefined) {
    return undefined;
  }
  return isFilterValueList(value)
    ? value.map((item) => readInvalidAgain(item, type))
    : readInvalidAgain(value, type);
};

const isSameValue = (
  before: FilterValue | undefined,
  after: FilterValue | undefined,
): boolean =>
  before === after ||
  (isFilterValueList(before) &&
    isFilterValueList(after) &&
    before.length === after.length &&
    before.every((item, index) => item === after[index]));

/**
 * The rule with every value that was invalid text read again against the
 * column types of `schema`, e.g. after a source's table was typed again:
 * '300' becomes a SmallInt once the column is one. Text that still isn't a
 * value stays as it is, and so do rules on columns `schema` doesn't have.
 * The rule itself comes back when nothing was read again.
 */
export const rereadFilterValues = (
  rule: FilterRule,
  schema: Schema,
): FilterRule => {
  if (rule instanceof ColumnComparisonFilter) {
    const type = schema.type(rule.columnName);
    const value = type ? readValueAgain(rule.value, type) : rule.value;
    return isSameValue(rule.value, value) ? rule : rule.withValue(value);
  }
  if (rule instanceof CompositeFilter) {
    const rules = rule.rules.map((child) => rereadFilterValues(child, schema));
    return rules.every((child, index) => child === rule.rules[index])
      ? rule
      : rule.withRules(rules);
  }
  if (rule instanceof NotFilter) {
    const inner = rereadFilterValues(rule.rule, schema);
    return inner === rule.rule ? rule : rule.withRule(inner);
  }
  return rule;
};

/**
 * The comparison on another column. If the new column takes different values
 * (another type family, another enumeration, or no known type), the operator
 * goes back to Equal (or, for a type without Equal, its first operator) and
 * the value is cleared; otherwise both are kept, and text that was invalid is
 * read again as a value of the new column's type.
 */
export const changeFilterColumn = (
  rule: ColumnComparisonFilter,
  columnName: string,
  schema: Schema,
): ColumnComparisonFilter => {
  const from = schema.type(rule.columnName);
  const to = schema.type(columnName);
  return from && to && takeSameValues(from, to)
    ? new ColumnComparisonFilter(
        columnName,
        rule.operator,
        readValueAgain(rule.value, to),
        rule.key,
      )
    : new ColumnComparisonFilter(
        columnName,
        to ? getDefaultOperator(to) : FilterOperator.EQUAL,
        undefined,
        rule.key,
      );
};

/**
 * The comparison with another operator. The value is kept if the new
 * operator takes the same shape of value (none, one, or a list), and cleared
 * otherwise.
 */
export const changeFilterOperator = (
  rule: ColumnComparisonFilter,
  operator: FilterOperator,
): ColumnComparisonFilter =>
  getFilterValueShape(operator) === getFilterValueShape(rule.operator)
    ? rule.withOperator(operator)
    : new ColumnComparisonFilter(
        rule.columnName,
        operator,
        undefined,
        rule.key,
      );

/**
 * The negation of a rule, as simple as possible: a comparison with a
 * negated operator takes it (Equal and NotEqual, In and NotIn, …), a negation
 * gives back its rule, and anything else is wrapped in a Not.
 */
export const negateFilter = (rule: FilterRule): FilterRule => {
  if (rule.kind === 'not') {
    return (rule as NotFilter).rule;
  }
  if (rule.kind === 'comparison') {
    const comparison = rule as ColumnComparisonFilter;
    const negated = getNegatedOperator(comparison.operator);
    if (negated) {
      return comparison.withOperator(negated);
    }
  }
  return new NotFilter(rule);
};

/**
 * The filter of the grid's "Filter by" quick action (spec §12.4, §8.5): Equal
 * on the clicked cell's value, read as a value of the column's type, or Is
 * Empty on a null cell. `undefined` when the type has no Equal (StrictTime,
 * Variant and types Cube doesn't know) or the value doesn't read as one of
 * the type. The cell is a JSON scalar as the engine returned it: a string is
 * taken exactly (an integer or decimal stays exact text, a string isn't
 * trimmed), a number through `String()`, and a timestamp loses its `+0000`.
 */
export const buildQuickFilterRule = (
  column: string,
  type: CubeType,
  cell: string | number | boolean | null,
): ColumnComparisonFilter | undefined => {
  if (cell === null) {
    return new ColumnComparisonFilter(column, FilterOperator.IS_EMPTY);
  }
  if (!isOperatorAvailable(FilterOperator.EQUAL, type)) {
    return undefined;
  }
  const value = parseValue(String(cell), type);
  return value === undefined || value.kind === 'invalid'
    ? undefined
    : new ColumnComparisonFilter(column, FilterOperator.EQUAL, value);
};
