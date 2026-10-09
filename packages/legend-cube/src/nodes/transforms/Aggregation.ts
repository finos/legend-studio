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

import { validate } from '../../inference/ValidationUtils.js';
import {
  MESSAGE_AGGREGATION_FUNCTION_DISALLOWS_COLUMN,
  MESSAGE_AGGREGATION_FUNCTION_EMPTY,
  MESSAGE_AGGREGATION_FUNCTION_INCOMPATIBLE,
  MESSAGE_AGGREGATION_FUNCTION_UNKNOWN,
  MESSAGE_AGGREGATION_OUTPUT_NAME_EMPTY,
  MESSAGE_AGGREGATION_OUTPUT_NAME_INVALID,
  MESSAGE_AGGREGATION_OUTPUT_NAME_IS_INPUT_COLUMN,
  MESSAGE_ALREADY_IN_OUTPUT_SCHEMA,
  MESSAGE_DOES_NOT_HAVE_A_NAME,
  MESSAGE_NOT_IN_INPUT_SCHEMA,
} from '../../messages/CubeMessages.js';
import { foldColumnName, isValidColumnName } from '../../schema/ColumnName.js';
import type { Schema } from '../../schema/Schema.js';
import { type CubeType, PrimitiveType } from '../../types/CubeType.js';
import { PRIMITIVE_TYPE_PATH } from '../../types/PrimitiveTypeRegistry.js';
import { TypeFamily } from '../../types/TypeFamily.js';

// Aggregations (spec §10, PLAN §5.7 and §11.5), shared by Group and, from M5,
// Partition's window aggregations

/** An aggregation function, as saved; Rank and DenseRank come with windows (M5) */
export enum AggregationFunction {
  COUNT = 'Count',
  DISTINCT_COUNT = 'DistinctCount',
  DISTINCT_VALUE = 'DistinctValue',
  SUM = 'Sum',
  AVERAGE = 'Average',
  MIN = 'Min',
  MAX = 'Max',
  /** Added by Cube (PLAN §11.5, Q1): every row, null or not, so it takes no column */
  COUNT_ROWS = 'CountRows',
}

const AGGREGATION_FUNCTIONS: readonly string[] =
  Object.values(AggregationFunction);

export const isAggregationFunction = (
  value: string,
): value is AggregationFunction => AGGREGATION_FUNCTIONS.includes(value);

/**
 * One output column of a Group: a function of a column, under a name. The
 * function is kept as saved, so an unknown or empty one is held and reported,
 * never dropped (PLAN §11.5, Q4). `column` is `undefined` for a function that
 * takes none (Count rows) and `''` until picked; `name` is `''` until given.
 */
export interface ColumnAggregation {
  readonly column: string | undefined;
  readonly function: string;
  readonly name: string;
}

const DISPLAY_NAMES = new Map<string, string>([
  [AggregationFunction.DISTINCT_COUNT, 'Distinct Count'],
  [AggregationFunction.DISTINCT_VALUE, 'Distinct Value'],
  [AggregationFunction.COUNT_ROWS, 'Count Rows'],
]);

/**
 * How a function is shown (spec §10): `Distinct Count`, `Distinct Value` and
 * `Count Rows`; every other text as it is, an unknown one included
 */
export const getAggregationDisplayName = (aggregation: string): string =>
  DISPLAY_NAMES.get(aggregation) ?? aggregation;

/** Whether the function aggregates a column: all but Count rows */
export const takesAggregationColumn = (
  aggregation: AggregationFunction,
): boolean => aggregation !== AggregationFunction.COUNT_ROWS;

const COUNTS = [
  AggregationFunction.COUNT,
  AggregationFunction.DISTINCT_COUNT,
] as const;
const DISTINCTS = [...COUNTS, AggregationFunction.DISTINCT_VALUE] as const;
const DATES = [
  ...DISTINCTS,
  AggregationFunction.MIN,
  AggregationFunction.MAX,
] as const;
const NUMBERS = [
  ...DISTINCTS,
  AggregationFunction.SUM,
  AggregationFunction.AVERAGE,
  AggregationFunction.MIN,
  AggregationFunction.MAX,
] as const;

/**
 * The functions offered on a column of the type, in the spec's order
 * (§10.1): enumerations get Count only, as do VARIANT and a type Cube doesn't
 * know; dates add Min and Max to the distinct ones; numbers, DECIMAL included,
 * get all seven; any other type the distinct ones. Count rows takes no column,
 * so it is never in the list.
 */
export const getAvailableAggregations = (
  type: CubeType,
): readonly AggregationFunction[] => {
  switch (type.family) {
    case TypeFamily.DATE:
    case TypeFamily.STRICT_DATE:
    case TypeFamily.DATETIME:
      return DATES;
    case TypeFamily.INTEGER:
    case TypeFamily.FLOAT:
    case TypeFamily.DECIMAL:
    case TypeFamily.NUMBER:
      return NUMBERS;
    case TypeFamily.BOOLEAN:
    case TypeFamily.STRING:
    case TypeFamily.STRICT_TIME:
      return DISTINCTS;
    // enumerations, VARIANT, and a type Cube doesn't know
    default:
      return [AggregationFunction.COUNT];
  }
};

const primitive = (path: PRIMITIVE_TYPE_PATH): PrimitiveType =>
  PrimitiveType.get(path);

/** Sum's type, and Min's and Max's on a number (PLAN §5.7) */
const numericResultType = (family: TypeFamily): PrimitiveType => {
  switch (family) {
    case TypeFamily.INTEGER:
      return primitive(PRIMITIVE_TYPE_PATH.INTEGER);
    case TypeFamily.FLOAT:
      return primitive(PRIMITIVE_TYPE_PATH.FLOAT);
    default:
      return primitive(PRIMITIVE_TYPE_PATH.NUMBER);
  }
};

/** Min's and Max's type on a date (PLAN §5.7; `Date` gives `Date` ✅, M4.3's check) */
const dateResultType = (family: TypeFamily): PrimitiveType => {
  switch (family) {
    case TypeFamily.STRICT_DATE:
      return primitive(PRIMITIVE_TYPE_PATH.STRICT_DATE);
    case TypeFamily.DATETIME:
      return primitive(PRIMITIVE_TYPE_PATH.DATE_TIME);
    default:
      return primitive(PRIMITIVE_TYPE_PATH.DATE);
  }
};

/**
 * The type of a function's output, as the engine types it (PLAN §5.7):
 * Integer for the counts; the column's own precise type for Distinct Value;
 * for Sum, Integer, Float, or else Number; Float for Average; Min and Max as
 * Sum on numbers, StrictDate on a StrictDate, DateTime on a Timestamp or
 * DateTime. `undefined` for a function the column's type doesn't offer, or a
 * column function given no column.
 */
export const getAggregationResultType = (
  aggregation: AggregationFunction,
  columnType: CubeType | undefined,
): CubeType | undefined => {
  if (aggregation === AggregationFunction.COUNT_ROWS) {
    return primitive(PRIMITIVE_TYPE_PATH.INTEGER);
  }
  if (
    !columnType ||
    !getAvailableAggregations(columnType).includes(aggregation)
  ) {
    return undefined;
  }
  switch (aggregation) {
    case AggregationFunction.COUNT:
    case AggregationFunction.DISTINCT_COUNT:
      return primitive(PRIMITIVE_TYPE_PATH.INTEGER);
    case AggregationFunction.DISTINCT_VALUE:
      return columnType;
    case AggregationFunction.SUM:
      return numericResultType(columnType.family);
    case AggregationFunction.AVERAGE:
      return primitive(PRIMITIVE_TYPE_PATH.FLOAT);
    case AggregationFunction.MIN:
    case AggregationFunction.MAX:
      return getAvailableAggregations(columnType).includes(
        AggregationFunction.SUM,
      )
        ? numericResultType(columnType.family)
        : dateResultType(columnType.family);
    default:
      return undefined;
  }
};

/**
 * Whether a function's output can be null: all but the counts, though the
 * engine types Sum and Average as never null (PLAN §5.7, D4). It decides rows:
 * a negated filter guards with `isEmpty` only on a nullable column.
 */
export const isAggregationNullable = (
  aggregation: AggregationFunction,
): boolean =>
  aggregation !== AggregationFunction.COUNT &&
  aggregation !== AggregationFunction.DISTINCT_COUNT &&
  aggregation !== AggregationFunction.COUNT_ROWS;

/**
 * The name the editor gives an aggregation until the user types one (spec
 * §10.3): `<column> <shown as>`, e.g. `ORDER_ID Count`, or `Count Rows`;
 * `undefined` for an unknown function, or a column function with no column
 */
export const getAggregationAutoName = (
  aggregation: string,
  column: string | undefined,
): string | undefined => {
  if (aggregation === AggregationFunction.COUNT_ROWS) {
    return getAggregationDisplayName(aggregation);
  }
  return isAggregationFunction(aggregation) && column
    ? `${column} ${getAggregationDisplayName(aggregation)}`
    : undefined;
};

/**
 * Checks one aggregation against the input schema, stopping at its first
 * problem (spec §10.3, then Cube's checks, PLAN §11.5): the function is given
 * and known; Count rows has no column, any other function a column of the
 * input whose type offers it; the output name is given, is a valid column name
 * (`isValidColumnName`), is no input column's name, keys included, in any case
 * (`foldColumnName`), and no other aggregation's, in any case either: the
 * engine fails on a duplicate name with no location. Exported so an editor can
 * mark each row.
 */
export const validateColumnAggregation = (
  aggregations: readonly ColumnAggregation[],
  index: number,
  schema: Schema,
  errors?: string[],
): boolean => {
  const aggregation = aggregations[index];
  if (!aggregation) {
    throw new Error(`An aggregation list has no aggregation ${index}`);
  }
  const { column, function: fn, name } = aggregation;
  if (!validate(fn !== '', MESSAGE_AGGREGATION_FUNCTION_EMPTY, errors)) {
    return false;
  }
  if (!isAggregationFunction(fn)) {
    return validate(false, MESSAGE_AGGREGATION_FUNCTION_UNKNOWN(fn), errors);
  }
  const columnType = column ? schema.lookup(column)?.type : undefined;
  const columnValid = takesAggregationColumn(fn)
    ? validate(
        Boolean(column),
        MESSAGE_DOES_NOT_HAVE_A_NAME('Aggregation column'),
        errors,
      ) &&
      validate(
        columnType !== undefined,
        MESSAGE_NOT_IN_INPUT_SCHEMA('Aggregation column', column ?? ''),
        errors,
      ) &&
      validate(
        columnType !== undefined &&
          getAvailableAggregations(columnType).includes(fn),
        MESSAGE_AGGREGATION_FUNCTION_INCOMPATIBLE(fn, column ?? ''),
        errors,
      )
    : validate(
        column === undefined,
        MESSAGE_AGGREGATION_FUNCTION_DISALLOWS_COLUMN(fn),
        errors,
      );
  return (
    columnValid &&
    validate(name !== '', MESSAGE_AGGREGATION_OUTPUT_NAME_EMPTY, errors) &&
    validate(
      isValidColumnName(name),
      MESSAGE_AGGREGATION_OUTPUT_NAME_INVALID,
      errors,
    ) &&
    validate(
      !schema
        .names()
        .some((input) => foldColumnName(input) === foldColumnName(name)),
      MESSAGE_AGGREGATION_OUTPUT_NAME_IS_INPUT_COLUMN(name),
      errors,
    ) &&
    validate(
      aggregations.every(
        (other, otherIndex) =>
          otherIndex === index ||
          foldColumnName(other.name) !== foldColumnName(name),
      ),
      MESSAGE_ALREADY_IN_OUTPUT_SCHEMA('Aggregation output name', name),
      errors,
    )
  );
};
