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
  hasUnescapedPatternCharacter,
  NEGATIVE_OPERATORS,
} from '../../filter/FilterOperator.js';
import {
  type ColumnComparisonFilter,
  type CompositeFilter,
  CompositeFilterOperator,
  type FilterRule,
  type FilterValueItem,
  isFilterValueList,
  type NotFilter,
} from '../../filter/FilterTree.js';
import type { Filter } from '../../nodes/transforms/Filter.js';
import type { Schema } from '../../schema/Schema.js';
import type { CubeType } from '../../types/CubeType.js';
import { assertUnreachable } from '../../utils/AssertionUtils.js';
import { getLiteralKinds } from '../../values/LiteralValue.js';
import {
  collection,
  columnAccess,
  EmitRole,
  enumValue,
  func,
  type IR,
  lambda,
  literal,
  type RelationExpr,
} from '../CubeIR.js';
import { type EmitContext, originOf } from '../EmitContext.js';

/** The variable of the filter lambda; columns are always properties of it, so names never collide */
const ROW = 'row';

/** The engine function of each positive operator */
const OPERATOR_FUNCTIONS: Readonly<Partial<Record<FilterOperator, string>>> =
  Object.freeze({
    [FilterOperator.EQUAL]: 'equal',
    [FilterOperator.GREATER_THAN]: 'greaterThan',
    [FilterOperator.GREATER_THAN_OR_EQUAL]: 'greaterThanEqual',
    [FilterOperator.LESS_THAN]: 'lessThan',
    [FilterOperator.LESS_THAN_OR_EQUAL]: 'lessThanEqual',
    [FilterOperator.STARTS_WITH]: 'startsWith',
    [FilterOperator.ENDS_WITH]: 'endsWith',
    [FilterOperator.CONTAINS]: 'contains',
    [FilterOperator.IN]: 'in',
    [FilterOperator.IS_EMPTY]: 'isEmpty',
  });

/**
 * Emits a filter as `->filter({row | <predicate>})` (PLAN §8.4):
 * - a negative operator is `not` over its positive one (`!($row.c == 'x')`);
 * - a Not over a group is pushed down to the leaves (De Morgan), because the
 *   engine's `NOT (… OR …)` would drop NULL rows; a double negation cancels;
 * - a Not over a comparison takes its negated operator, or is `not(…)` for
 *   one without (`!($row.c > 5)`; `<=` would drop NULL rows);
 * - a negation keeps NULL rows (D4): on a column the input schema marks
 *   nullable it is `$row.c->isEmpty() || !(…)`, because the engine keeps them
 *   only for columns it types [0..1] itself, and it does not after an outer
 *   join (PLAN Appendix B). IsNotEmpty is the one negation that drops them;
 * - And and Or are binary, folded left; a group of one rule is that rule;
 * - values are typed literals of the column's type; enumeration values are
 *   written `EnumPath.VALUE`.
 *
 * The filter must be valid for its input schema.
 */
export const emitFilter = (
  node: Filter,
  inputs: readonly RelationExpr[],
  context: EmitContext,
): RelationExpr => {
  const [input] = inputs;
  const [schema] = context.inputSchemas;
  if (!input || !schema || !node.filter) {
    throw new Error(
      `Filter "${node.id}" needs an input and a filter to be emitted`,
    );
  }
  const origin = (role: EmitRole): ReturnType<typeof originOf> =>
    originOf(node.id, role);

  const emitValue = (item: FilterValueItem, type: CubeType): IR => {
    if (item.kind === 'invalid' || !getLiteralKinds(type).includes(item.kind)) {
      throw new Error(
        `Filter "${node.id}" has a value that is not a ${type.displayName}`,
      );
    }
    // an enumeration value's kind is only taken by enumeration columns
    return item.kind === 'enum'
      ? enumValue(type.path, item.value, origin(EmitRole.VALUE))
      : literal(item, origin(EmitRole.VALUE));
  };

  const emitComparison = (
    rule: ColumnComparisonFilter,
    operator: FilterOperator,
    columnSchema: Schema,
  ): IR => {
    const type = columnSchema.type(rule.columnName);
    if (!type) {
      throw new Error(
        `Filter "${node.id}" refers to a missing column "${rule.columnName}"`,
      );
    }
    const name = OPERATOR_FUNCTIONS[operator];
    if (!name) {
      throw new Error(`Filter operator "${operator}" has no engine function`);
    }
    const column = columnAccess(ROW, rule.columnName, origin(EmitRole.COLUMN));
    const { value } = rule;
    switch (operator) {
      case FilterOperator.IS_EMPTY:
        return func(name, [column], origin(EmitRole.PREDICATE));
      case FilterOperator.IN: {
        if (!isFilterValueList(value)) {
          throw new Error(`Filter "${node.id}" has an In without a list`);
        }
        return func(
          name,
          [column, collection(value.map((item) => emitValue(item, type)))],
          origin(EmitRole.PREDICATE),
        );
      }
      default: {
        if (value === undefined || isFilterValueList(value)) {
          throw new Error(
            `Filter "${node.id}" has a comparison without a value`,
          );
        }
        if (
          value.kind === 'string' &&
          hasUnescapedPatternCharacter(operator, value.value)
        ) {
          throw new Error(
            `Filter "${node.id}" has a backslash in a pattern, which the engine would misread`,
          );
        }
        return func(
          name,
          [column, emitValue(value, type)],
          origin(EmitRole.PREDICATE),
        );
      }
    }
  };

  const not = (predicate: IR): IR =>
    func('not', [predicate], origin(EmitRole.PREDICATE));

  // `negated`: whether an odd number of Nots is above the rule
  const emitRule = (rule: FilterRule, negated: boolean): IR => {
    switch (rule.kind) {
      case 'not':
        return emitRule((rule as NotFilter).rule, !negated);
      case 'composite': {
        const group = rule as CompositeFilter;
        const [first, ...others] = group.rules.map((child) =>
          emitRule(child, negated),
        );
        if (!first) {
          throw new Error(`Filter "${node.id}" has an empty group`);
        }
        const isAnd =
          (group.operator === CompositeFilterOperator.AND) !== negated;
        return others.reduce(
          (folded, predicate) =>
            func(
              isAnd ? 'and' : 'or',
              [folded, predicate],
              origin(EmitRole.PREDICATE),
            ),
          first,
        );
      }
      case 'comparison': {
        const comparison = rule as ColumnComparisonFilter;
        // undefined: a negated operator without a negated one, e.g. Not(>)
        const operator = negated
          ? getNegatedOperator(comparison.operator)
          : comparison.operator;
        const positive =
          operator === undefined
            ? comparison.operator
            : NEGATIVE_OPERATORS.includes(operator)
              ? (getNegatedOperator(operator) as FilterOperator)
              : operator;
        const predicate = emitComparison(comparison, positive, schema);
        if (positive === operator) {
          return predicate;
        }
        const negation = not(predicate);
        return positive === FilterOperator.IS_EMPTY ||
          !schema.lookup(comparison.columnName)?.nullable
          ? negation
          : func(
              'or',
              [
                emitComparison(comparison, FilterOperator.IS_EMPTY, schema),
                negation,
              ],
              origin(EmitRole.PREDICATE),
            );
      }
      case 'unsupported':
        throw new Error(
          `Filter "${node.id}" has a rule this version can't read`,
        );
      default:
        return assertUnreachable(rule.kind);
    }
  };

  return func(
    'filter',
    [input, lambda([ROW], [emitRule(node.filter, false)])],
    origin(EmitRole.FILTER),
  );
};
