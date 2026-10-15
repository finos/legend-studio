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

import {
  FilterOperator,
  getNegatedOperator,
} from '../../filter/FilterOperator.js';
import {
  ColumnComparisonFilter,
  CompositeFilter,
  CompositeFilterOperator,
  type FilterRule,
  type FilterValue,
  type FilterValueItem,
  NotFilter,
} from '../../filter/FilterTree.js';
import type { IR } from '../CubeIR.js';
import { getCubeFunctionName } from './CubeIRComparison.js';

// A Filter's condition read back into its rules (Import Pure, PLAN §11.18):
// the inverse of `emitFilter` (PLAN §8.4). Cube pushes a negated group down to
// its rules, so `!(a && b)` comes back as `!a || !b`, the same rows; a
// negation that keeps the empty rows, `$row.c->isEmpty() || !(…)`, comes back
// as the one rule it was written for.

/** The function of each positive operator Cube writes, as `emitFilter` does */
const COMPARISONS: ReadonlyMap<string, FilterOperator> = new Map([
  ['equal', FilterOperator.EQUAL],
  ['greaterThan', FilterOperator.GREATER_THAN],
  ['greaterThanEqual', FilterOperator.GREATER_THAN_OR_EQUAL],
  ['lessThan', FilterOperator.LESS_THAN],
  ['lessThanEqual', FilterOperator.LESS_THAN_OR_EQUAL],
  ['startsWith', FilterOperator.STARTS_WITH],
  ['endsWith', FilterOperator.ENDS_WITH],
  ['contains', FilterOperator.CONTAINS],
  ['in', FilterOperator.IN],
  ['isEmpty', FilterOperator.IS_EMPTY],
]);

export interface FilterReading {
  readonly rule: FilterRule;
  /**
   * Whether a negation is written plainly, `!(…)`, other than `IsNotEmpty`'s:
   * Cube writes one so only on a column that can't be empty, and keeps the
   * empty rows on one that can, so the rule reads the same rows only when the
   * column can't be empty
   */
  readonly hasPlainNegation: boolean;
}

interface Comparison {
  readonly column: string;
  readonly operator: FilterOperator;
  readonly value: FilterValue | undefined;
}

const call = (
  ir: IR,
  name: string,
  arity: number,
): readonly IR[] | undefined =>
  ir.k === 'func' &&
  getCubeFunctionName(ir.name) === name &&
  ir.params.length === arity
    ? ir.params
    : undefined;

/** A value Cube writes in a comparison: a literal, or an enumeration's value */
const readValue = (ir: IR): FilterValueItem | undefined =>
  ir.k === 'literal'
    ? ir.value
    : ir.k === 'enumValue'
      ? { kind: 'enum', value: ir.value }
      : undefined;

/** `$<row>.<column>` */
const readColumn = (ir: IR | undefined, row: string): string | undefined =>
  ir?.k === 'property' && ir.receiver.k === 'var' && ir.receiver.name === row
    ? ir.name
    : undefined;

const readComparison = (ir: IR, row: string): Comparison | undefined => {
  if (ir.k !== 'func') {
    return undefined;
  }
  const operator = COMPARISONS.get(getCubeFunctionName(ir.name));
  const [columnIr, valueIr, ...rest] = ir.params;
  const column = readColumn(columnIr, row);
  if (operator === undefined || column === undefined || rest.length) {
    return undefined;
  }
  if (operator === FilterOperator.IS_EMPTY) {
    return valueIr === undefined
      ? { column, operator, value: undefined }
      : undefined;
  }
  if (valueIr === undefined) {
    return undefined;
  }
  if (operator === FilterOperator.IN) {
    if (valueIr.k !== 'collection') {
      return undefined;
    }
    const values = valueIr.values.map(readValue);
    return values.every((value) => value !== undefined)
      ? { column, operator, value: values }
      : undefined;
  }
  const value = readValue(valueIr);
  return value === undefined ? undefined : { column, operator, value };
};

const comparisonRule = (
  { column, operator, value }: Comparison,
  negated = false,
): FilterRule => {
  if (!negated) {
    return new ColumnComparisonFilter(column, operator, value);
  }
  const negatedOperator = getNegatedOperator(operator);
  return negatedOperator === undefined
    ? new NotFilter(new ColumnComparisonFilter(column, operator, value))
    : new ColumnComparisonFilter(column, negatedOperator, value);
};

/**
 * `$row.c->isEmpty() || !(<comparison of c>)`: the negation Cube writes on a
 * column that can be empty, which keeps the empty rows (D4)
 */
const readEmptyKeepingNegation = (
  ir: IR,
  row: string,
): Comparison | undefined => {
  const params = call(ir, 'or', 2);
  if (!params) {
    return undefined;
  }
  const [empty, negation] = params as [IR, IR];
  const isEmpty = readComparison(empty, row);
  const negated = call(negation, 'not', 1);
  const comparison = negated && readComparison(negated[0] as IR, row);
  return isEmpty?.operator === FilterOperator.IS_EMPTY &&
    comparison &&
    comparison.operator !== FilterOperator.IS_EMPTY &&
    comparison.column === isEmpty.column
    ? comparison
    : undefined;
};

class FilterRuleReader {
  hasPlainNegation = false;

  constructor(private readonly row: string) {}

  /** The rules of a left-folded chain of `and` or `or`, each a whole rule, as `emitFilter` folds a group */
  private readChain(ir: IR, name: 'and' | 'or'): FilterRule[] | undefined {
    const params = call(ir, name, 2);
    if (!params || (name === 'or' && readEmptyKeepingNegation(ir, this.row))) {
      const rule = this.read(ir);
      return rule ? [rule] : undefined;
    }
    const [left, right] = params as [IR, IR];
    const before = this.readChain(left, name);
    const last = this.read(right);
    return before && last ? [...before, last] : undefined;
  }

  read(ir: IR): FilterRule | undefined {
    const kept = readEmptyKeepingNegation(ir, this.row);
    if (kept) {
      return comparisonRule(kept, true);
    }
    for (const [name, operator] of [
      ['and', CompositeFilterOperator.AND],
      ['or', CompositeFilterOperator.OR],
    ] as const) {
      if (call(ir, name, 2)) {
        const rules = this.readChain(ir, name);
        return rules ? new CompositeFilter(operator, rules) : undefined;
      }
    }
    const negated = call(ir, 'not', 1);
    if (negated) {
      const [inner] = negated as [IR];
      const comparison = readComparison(inner, this.row);
      if (comparison) {
        if (comparison.operator !== FilterOperator.IS_EMPTY) {
          this.hasPlainNegation = true;
        }
        return comparisonRule(comparison, true);
      }
      // a negated group: Cube writes the negation pushed down to its rules
      const rule = this.read(inner);
      this.hasPlainNegation = true;
      return rule ? new NotFilter(rule) : undefined;
    }
    const comparison = readComparison(ir, this.row);
    return comparison ? comparisonRule(comparison) : undefined;
  }
}

/**
 * The rules of a Filter's condition, `{<row> | <predicate>}`, or none when it
 * isn't one Cube's Filter writes: a comparison of two columns, a function of a
 * column, a value Cube has no literal for
 */
export const readFilterCondition = (
  condition: IR,
): FilterReading | undefined => {
  if (condition.k !== 'lambda' || condition.params.length !== 1) {
    return undefined;
  }
  const [row] = condition.params as [string];
  const [predicate, ...rest] = condition.body;
  if (predicate === undefined || rest.length) {
    return undefined;
  }
  const reader = new FilterRuleReader(row);
  const rule = reader.read(predicate);
  return rule ? { rule, hasPlainNegation: reader.hasPlainNegation } : undefined;
};
