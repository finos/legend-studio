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

import type { CubeType } from '../types/CubeType.js';
import { TypeFamily } from '../types/TypeFamily.js';
import { assertUnreachable } from '../utils/AssertionUtils.js';

/** The comparison operators of a filter. The values are the names a saved filter stores. */
export enum FilterOperator {
  EQUAL = 'Equal',
  NOT_EQUAL = 'NotEqual',
  GREATER_THAN = 'GreaterThan',
  GREATER_THAN_OR_EQUAL = 'GreaterThanOrEqual',
  LESS_THAN = 'LessThan',
  LESS_THAN_OR_EQUAL = 'LessThanOrEqual',
  STARTS_WITH = 'StartsWith',
  DOES_NOT_START_WITH = 'DoesNotStartWith',
  ENDS_WITH = 'EndsWith',
  DOES_NOT_END_WITH = 'DoesNotEndWith',
  CONTAINS = 'Contains',
  DOES_NOT_CONTAIN = 'DoesNotContain',
  IN = 'In',
  NOT_IN = 'NotIn',
  IS_EMPTY = 'IsEmpty',
  IS_NOT_EMPTY = 'IsNotEmpty',
}

/** Every operator, in the spec's order */
export const FILTER_OPERATORS: readonly FilterOperator[] = Object.freeze(
  Object.values(FilterOperator),
);

export const isFilterOperator = (value: unknown): value is FilterOperator =>
  FILTER_OPERATORS.some((operator) => operator === value);

/** How each operator reads in the editor and in a filter's description */
export const FILTER_OPERATOR_DESCRIPTIONS: Readonly<
  Record<FilterOperator, string>
> = Object.freeze({
  [FilterOperator.EQUAL]: 'is',
  [FilterOperator.NOT_EQUAL]: 'is not',
  [FilterOperator.GREATER_THAN]: 'is greater than',
  [FilterOperator.GREATER_THAN_OR_EQUAL]: 'is greater than or equal',
  [FilterOperator.LESS_THAN]: 'is less than',
  [FilterOperator.LESS_THAN_OR_EQUAL]: 'is less than or equal',
  [FilterOperator.STARTS_WITH]: 'starts with',
  [FilterOperator.DOES_NOT_START_WITH]: 'does not start with',
  [FilterOperator.ENDS_WITH]: 'ends with',
  [FilterOperator.DOES_NOT_END_WITH]: 'does not end with',
  [FilterOperator.CONTAINS]: 'contains',
  [FilterOperator.DOES_NOT_CONTAIN]: 'does not contain',
  [FilterOperator.IN]: 'is in list of',
  [FilterOperator.NOT_IN]: 'is not in list of',
  [FilterOperator.IS_EMPTY]: 'is empty',
  [FilterOperator.IS_NOT_EMPTY]: 'is not empty',
});

const NEGATION_PAIRS: readonly (readonly [FilterOperator, FilterOperator])[] = [
  [FilterOperator.EQUAL, FilterOperator.NOT_EQUAL],
  [FilterOperator.STARTS_WITH, FilterOperator.DOES_NOT_START_WITH],
  [FilterOperator.ENDS_WITH, FilterOperator.DOES_NOT_END_WITH],
  [FilterOperator.CONTAINS, FilterOperator.DOES_NOT_CONTAIN],
  [FilterOperator.IN, FilterOperator.NOT_IN],
  [FilterOperator.IS_EMPTY, FilterOperator.IS_NOT_EMPTY],
];

/**
 * The operator that matches exactly the rows this one doesn't, e.g.
 * `NotEqual` for `Equal` and back, or `undefined` for an operator without one
 * (the ordering operators: `!(x > 5)` also excludes NULLs, so it is not `<=`).
 */
export const getNegatedOperator = (
  operator: FilterOperator,
): FilterOperator | undefined => {
  const pair = NEGATION_PAIRS.find((p) => p.includes(operator));
  return pair ? (pair[0] === operator ? pair[1] : pair[0]) : undefined;
};

/** The negative operators, each the negation of a positive one */
export const NEGATIVE_OPERATORS: readonly FilterOperator[] = Object.freeze(
  NEGATION_PAIRS.map(([, negative]) => negative),
);

/** Operators that take no value */
export const EMPTY_OPERATORS: readonly FilterOperator[] = Object.freeze([
  FilterOperator.IS_EMPTY,
  FilterOperator.IS_NOT_EMPTY,
]);

/** Operators that take a list of values */
export const SET_OPERATORS: readonly FilterOperator[] = Object.freeze([
  FilterOperator.IN,
  FilterOperator.NOT_IN,
]);

/** What an operator takes: no value, one value or a non-empty list of values */
export type FilterValueShape = 'none' | 'single' | 'list';

export const getFilterValueShape = (
  operator: FilterOperator,
): FilterValueShape =>
  EMPTY_OPERATORS.includes(operator)
    ? 'none'
    : SET_OPERATORS.includes(operator)
      ? 'list'
      : 'single';

const BOOLEAN_OPERATORS: readonly FilterOperator[] = Object.freeze([
  FilterOperator.EQUAL,
  FilterOperator.NOT_EQUAL,
  FilterOperator.IS_EMPTY,
  FilterOperator.IS_NOT_EMPTY,
]);

const STRING_OPERATORS: readonly FilterOperator[] = Object.freeze([
  FilterOperator.EQUAL,
  FilterOperator.NOT_EQUAL,
  FilterOperator.STARTS_WITH,
  FilterOperator.DOES_NOT_START_WITH,
  FilterOperator.CONTAINS,
  FilterOperator.DOES_NOT_CONTAIN,
  FilterOperator.ENDS_WITH,
  FilterOperator.DOES_NOT_END_WITH,
  FilterOperator.IS_EMPTY,
  FilterOperator.IS_NOT_EMPTY,
  FilterOperator.IN,
  FilterOperator.NOT_IN,
]);

const ENUM_OPERATORS: readonly FilterOperator[] = Object.freeze([
  FilterOperator.EQUAL,
  FilterOperator.NOT_EQUAL,
  FilterOperator.IS_EMPTY,
  FilterOperator.IS_NOT_EMPTY,
  FilterOperator.IN,
  FilterOperator.NOT_IN,
]);

const ORDERED_OPERATORS: readonly FilterOperator[] = Object.freeze([
  FilterOperator.EQUAL,
  FilterOperator.NOT_EQUAL,
  FilterOperator.GREATER_THAN,
  FilterOperator.GREATER_THAN_OR_EQUAL,
  FilterOperator.LESS_THAN,
  FilterOperator.LESS_THAN_OR_EQUAL,
  FilterOperator.IS_EMPTY,
  FilterOperator.IS_NOT_EMPTY,
  FilterOperator.IN,
  FilterOperator.NOT_IN,
]);

/**
 * The operators a column of the type offers, in the order the editor lists
 * them. They go by type family, so precise types get their base type's list:
 * `Varchar(n)` gets String's, `SmallInt` and `Numeric(p,s)` the numeric one.
 * Types that take no values (StrictTime, Variant and unknown types) only offer
 * the empty checks.
 */
export const getAvailableOperators = (
  type: CubeType,
): readonly FilterOperator[] => {
  switch (type.family) {
    case TypeFamily.BOOLEAN:
      return BOOLEAN_OPERATORS;
    case TypeFamily.STRING:
      return STRING_OPERATORS;
    case TypeFamily.ENUM:
      return ENUM_OPERATORS;
    case TypeFamily.INTEGER:
    case TypeFamily.FLOAT:
    case TypeFamily.DECIMAL:
    case TypeFamily.NUMBER:
    case TypeFamily.STRICT_DATE:
    case TypeFamily.DATETIME:
    case TypeFamily.DATE:
      return ORDERED_OPERATORS;
    case TypeFamily.STRICT_TIME:
    case TypeFamily.VARIANT:
    case TypeFamily.OPAQUE:
      return EMPTY_OPERATORS;
    default:
      return assertUnreachable(type.family);
  }
};

/** The operator a new row on a column of the type starts with: Equal, or the first one offered when Equal is not */
export const getDefaultOperator = (type: CubeType): FilterOperator => {
  const available = getAvailableOperators(type);
  return available.includes(FilterOperator.EQUAL)
    ? FilterOperator.EQUAL
    : (available[0] ?? FilterOperator.EQUAL);
};

export const isOperatorAvailable = (
  operator: FilterOperator,
  type: CubeType,
): boolean => getAvailableOperators(type).includes(operator);

/**
 * Whether the filter compares a floating-point column for exact equality,
 * which may match nothing (e.g. `REAL` 32.38 is not the double 32.38). The
 * editor shows a hint; the filter stays valid.
 */
export const isExactFloatComparison = (
  operator: FilterOperator,
  type: CubeType,
): boolean =>
  type.family === TypeFamily.FLOAT &&
  (operator === FilterOperator.EQUAL ||
    operator === FilterOperator.NOT_EQUAL ||
    operator === FilterOperator.IN ||
    operator === FilterOperator.NOT_IN);
