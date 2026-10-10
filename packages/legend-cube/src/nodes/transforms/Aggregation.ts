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
  MESSAGE_AGGREGATION_FUNCTION_DISALLOWS_SETTING,
  MESSAGE_AGGREGATION_FUNCTION_EMPTY,
  MESSAGE_AGGREGATION_FUNCTION_INCOMPATIBLE,
  MESSAGE_AGGREGATION_FUNCTION_NEEDS_SORT,
  MESSAGE_AGGREGATION_FUNCTION_SETTING_INVALID,
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
import { isSortableType } from '../../types/TypeCompatibility.js';
import { TypeFamily } from '../../types/TypeFamily.js';

// Aggregations (spec §10, PLAN §5.7, §11.5, §11.6 and §11.8), shared by Group
// and Partition, whose windows also offer the rank and row functions

/** An aggregation function, as saved: a Group's, and a window's but its rank functions */
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
 * A window-only function, as saved (spec §10, PLAN §11.6, §11.8): it ranks
 * each row of its partition by the window's sort, so it takes no column and
 * needs a sort. A Group doesn't know them (PLAN §11.5, Q4).
 */
export enum WindowRankFunction {
  RANK = 'Rank',
  DENSE_RANK = 'DenseRank',
  /** Added by Cube (PLAN §11.6, Q2): one number per row, ties or not */
  ROW_NUMBER = 'RowNumber',
  /** Added in M5b (PLAN §11.8): the bucket, from 1, of `buckets` near-equal ones */
  NTILE = 'NTile',
  /** Added in M5b: (rank - 1) / (rows - 1), from 0 to 1 */
  PERCENT_RANK = 'PercentRank',
  /** Added in M5b: the share of the partition's rows up to this one, ties included */
  CUMULATIVE_DISTRIBUTION = 'CumulativeDistribution',
}

/** The rank functions, in the order an editor offers them */
export const WINDOW_RANK_FUNCTIONS: readonly WindowRankFunction[] =
  Object.freeze(Object.values(WindowRankFunction));

export const isWindowRankFunction = (
  value: string,
): value is WindowRankFunction =>
  (WINDOW_RANK_FUNCTIONS as readonly string[]).includes(value);

/**
 * A window-only function of a column, as saved (PLAN §11.8): a value of
 * another row of the partition, by the window's sort, so it needs a sort, and
 * it has the column's type, nullable. Last is the partition's last row, the
 * same on every row, as First is its first.
 */
export enum WindowRowFunction {
  /** The value `offset` rows before, empty for the first rows */
  LAG = 'Lag',
  /** The value `offset` rows after, empty for the last rows */
  LEAD = 'Lead',
  FIRST = 'First',
  LAST = 'Last',
}

/** The row functions, in the order an editor offers them */
export const WINDOW_ROW_FUNCTIONS: readonly WindowRowFunction[] = Object.freeze(
  Object.values(WindowRowFunction),
);

export const isWindowRowFunction = (
  value: string,
): value is WindowRowFunction =>
  (WINDOW_ROW_FUNCTIONS as readonly string[]).includes(value);

/** A function a window offers: every aggregation function, and the rank and row functions */
export type WindowFunction =
  | AggregationFunction
  | WindowRankFunction
  | WindowRowFunction;

export const isWindowFunction = (value: string): value is WindowFunction =>
  isAggregationFunction(value) ||
  isWindowRankFunction(value) ||
  isWindowRowFunction(value);

/** Whether the function needs the window to sort its rows: the rank and row functions */
export const needsWindowSort = (aggregation: string): boolean =>
  isWindowRankFunction(aggregation) || isWindowRowFunction(aggregation);

/** What a function sets beside its column, if anything: Lag's and Lead's offset, NTile's bucket count */
export enum AggregationSetting {
  OFFSET = 'offset',
  BUCKETS = 'buckets',
}

/** The setting the function takes, if any */
export const getAggregationSetting = (
  aggregation: string,
): AggregationSetting | undefined =>
  aggregation === WindowRowFunction.LAG ||
  aggregation === WindowRowFunction.LEAD
    ? AggregationSetting.OFFSET
    : aggregation === WindowRankFunction.NTILE
      ? AggregationSetting.BUCKETS
      : undefined;

/** A setting's value until the user gives one: one row back or ahead, four buckets (quartiles) */
export const AGGREGATION_SETTING_DEFAULTS: Readonly<
  Record<AggregationSetting, number>
> = Object.freeze({
  [AggregationSetting.OFFSET]: 1,
  [AggregationSetting.BUCKETS]: 4,
});

/**
 * Where aggregations are: a Group, or a window, which also knows the rank
 * functions, and whether it sorts its rows, which they need
 */
export type AggregationUse =
  | { readonly kind: 'group' }
  | { readonly kind: 'window'; readonly sorted: boolean };

export const GROUP_AGGREGATION_USE: AggregationUse = Object.freeze({
  kind: 'group',
});

/** Whether the use knows the function: a Group its aggregation functions, a window its rank functions too */
export const isAggregationFunctionOf = (
  value: string,
  use: AggregationUse,
): value is WindowFunction =>
  use.kind === 'window'
    ? isWindowFunction(value)
    : isAggregationFunction(value);

/**
 * One output column of a Group or a window: a function of a column, under a
 * name. The function is kept as saved, so an unknown or empty one is held and
 * reported, never dropped (PLAN §11.5, Q4). `column` is `undefined` for a
 * function that takes none (Count rows, the rank functions) and `''` until
 * picked; `name` is `''` until given. `offset` (Lag, Lead) and `buckets`
 * (NTile) are their functions' settings (PLAN §11.8), kept as given for
 * validation to judge, and `undefined` on every other function.
 */
export interface ColumnAggregation {
  readonly column: string | undefined;
  readonly function: string;
  readonly name: string;
  readonly offset?: number | undefined;
  readonly buckets?: number | undefined;
}

/** Whether a value has a `ColumnAggregation`'s shape: texts, the column left out or not, and numbers for the settings */
export const isColumnAggregation = (
  value: unknown,
): value is ColumnAggregation => {
  if (typeof value !== 'object' || value === null) {
    return false;
  }
  const {
    column,
    function: fn,
    name,
    offset,
    buckets,
  } = value as Partial<Record<keyof ColumnAggregation, unknown>>;
  return (
    (column === undefined || typeof column === 'string') &&
    typeof fn === 'string' &&
    typeof name === 'string' &&
    (offset === undefined || typeof offset === 'number') &&
    (buckets === undefined || typeof buckets === 'number')
  );
};

/** A frozen copy of an aggregation, its settings left out when undefined */
export const freezeColumnAggregation = ({
  column,
  function: fn,
  name,
  offset,
  buckets,
}: ColumnAggregation): ColumnAggregation =>
  Object.freeze({
    column,
    function: fn,
    name,
    ...(offset === undefined ? {} : { offset }),
    ...(buckets === undefined ? {} : { buckets }),
  });

const DISPLAY_NAMES = new Map<string, string>([
  [AggregationFunction.DISTINCT_COUNT, 'Distinct Count'],
  [AggregationFunction.DISTINCT_VALUE, 'Distinct Value'],
  [AggregationFunction.COUNT_ROWS, 'Count Rows'],
  [WindowRankFunction.DENSE_RANK, 'Dense Rank'],
  [WindowRankFunction.ROW_NUMBER, 'Row Number'],
  [WindowRankFunction.PERCENT_RANK, 'Percent Rank'],
  [WindowRankFunction.CUMULATIVE_DISTRIBUTION, 'Cumulative Distribution'],
]);

/**
 * How a function is shown (spec §10): `Distinct Count`, `Distinct Value`,
 * `Count Rows`, `Dense Rank`, `Row Number`, `Percent Rank` and `Cumulative
 * Distribution`; every other text as it is, an unknown one included
 */
export const getAggregationDisplayName = (aggregation: string): string =>
  DISPLAY_NAMES.get(aggregation) ?? aggregation;

/** Whether the function takes a column: all but Count rows and the rank functions */
export const takesAggregationColumn = (aggregation: WindowFunction): boolean =>
  aggregation !== AggregationFunction.COUNT_ROWS &&
  !isWindowRankFunction(aggregation);

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

/**
 * Whether a column of the type offers the function: a row function any type
 * a window can partition by (`isSortableType`), never a rank function, which
 * takes no column
 */
const offersAggregation = (
  columnType: CubeType,
  aggregation: WindowFunction,
): boolean =>
  isWindowRowFunction(aggregation)
    ? isSortableType(columnType)
    : (
        getAvailableAggregations(columnType) as readonly WindowFunction[]
      ).includes(aggregation);

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
 * The type of a function's output, as the engine types it (PLAN §5.7,
 * §11.8): Integer for the counts and the rank functions but Percent Rank and
 * Cumulative Distribution, which are Float; the column's own precise type
 * for Distinct Value and the row functions;
 * for Sum, Integer, Float, or else Number; Float for Average; Min and Max as
 * Sum on numbers, StrictDate on a StrictDate, DateTime on a Timestamp or
 * DateTime. `undefined` for a function the column's type doesn't offer, or a
 * column function given no column.
 */
export const getAggregationResultType = (
  aggregation: WindowFunction,
  columnType: CubeType | undefined,
): CubeType | undefined => {
  if (!takesAggregationColumn(aggregation)) {
    return aggregation === WindowRankFunction.PERCENT_RANK ||
      aggregation === WindowRankFunction.CUMULATIVE_DISTRIBUTION
      ? primitive(PRIMITIVE_TYPE_PATH.FLOAT)
      : primitive(PRIMITIVE_TYPE_PATH.INTEGER);
  }
  if (!columnType || !offersAggregation(columnType, aggregation)) {
    return undefined;
  }
  if (isWindowRowFunction(aggregation)) {
    return columnType;
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
 * Whether a function's output can be null: all but the counts and the rank
 * functions, though the engine types Sum and Average as never null (PLAN
 * §5.7, D4); a row function's is empty when there is no such row (PLAN §11.8). It decides rows: a negated filter guards with `isEmpty` only on a
 * nullable column.
 */
export const isAggregationNullable = (aggregation: WindowFunction): boolean =>
  aggregation !== AggregationFunction.COUNT &&
  aggregation !== AggregationFunction.DISTINCT_COUNT &&
  aggregation !== AggregationFunction.COUNT_ROWS &&
  !isWindowRankFunction(aggregation);

/**
 * The name the editor gives an aggregation until the user types one (spec
 * §10.3): `<column> <shown as>`, e.g. `ORDER_ID Count`, or for a function
 * with no column how it is shown, e.g. `Count Rows` or `Dense Rank`;
 * `undefined` for a function the use doesn't know, or a column function with
 * no column
 */
export const getAggregationAutoName = (
  aggregation: string,
  column: string | undefined,
  use: AggregationUse = GROUP_AGGREGATION_USE,
): string | undefined => {
  if (!isAggregationFunctionOf(aggregation, use)) {
    return undefined;
  }
  if (!takesAggregationColumn(aggregation)) {
    return getAggregationDisplayName(aggregation);
  }
  return column
    ? `${column} ${getAggregationDisplayName(aggregation)}`
    : undefined;
};

/**
 * Checks one aggregation against the input schema, stopping at its first
 * problem (spec §10.3, then Cube's checks, PLAN §11.5, §11.6 and §11.8): the
 * function is given and the use knows it; Count rows and the rank functions
 * have no column, any other function a column of the input whose type offers
 * it; a rank or row function's window sorts its rows (with none, the
 * database fails with no location); Lag's and Lead's offset and NTile's bucket
 * count are whole numbers of at least 1, and no other function has one; the
 * output name is given, is a valid column name
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
  use: AggregationUse = GROUP_AGGREGATION_USE,
): boolean => {
  const aggregation = aggregations[index];
  if (!aggregation) {
    throw new Error(`An aggregation list has no aggregation ${index}`);
  }
  const { column, function: fn, name } = aggregation;
  if (!validate(fn !== '', MESSAGE_AGGREGATION_FUNCTION_EMPTY, errors)) {
    return false;
  }
  if (!isAggregationFunctionOf(fn, use)) {
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
        columnType !== undefined && offersAggregation(columnType, fn),
        MESSAGE_AGGREGATION_FUNCTION_INCOMPATIBLE(fn, column ?? ''),
        errors,
      )
    : validate(
        column === undefined,
        MESSAGE_AGGREGATION_FUNCTION_DISALLOWS_COLUMN(fn),
        errors,
      );
  // after the column and the sort, stopping at the first setting that fails
  const settingValid = (): boolean => {
    const setting = getAggregationSetting(fn);
    return Object.values(AggregationSetting).every((key) => {
      const value = aggregation[key];
      return key === setting
        ? validate(
            value !== undefined && Number.isSafeInteger(value) && value >= 1,
            MESSAGE_AGGREGATION_FUNCTION_SETTING_INVALID(fn, key),
            errors,
          )
        : validate(
            value === undefined,
            MESSAGE_AGGREGATION_FUNCTION_DISALLOWS_SETTING(fn, key),
            errors,
          );
    });
  };
  return (
    columnValid &&
    validate(
      !needsWindowSort(fn) || (use.kind === 'window' && use.sorted),
      MESSAGE_AGGREGATION_FUNCTION_NEEDS_SORT(fn),
      errors,
    ) &&
    settingValid() &&
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
