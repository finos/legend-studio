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

import { UnaryNode } from '../../graph/QueryNode.js';
import {
  ensureSchemas,
  validate,
  validateAllItems,
} from '../../inference/ValidationUtils.js';
import {
  BLANK_PLACEHOLDER,
  MESSAGE_CANNOT_BE_EMPTY,
  MESSAGE_CANNOT_HAVE_DUPLICATES,
  MESSAGE_DOES_NOT_HAVE_A_NAME,
  MESSAGE_NOT_IN_INPUT_SCHEMA,
  MESSAGE_PIVOT_AGGREGATION_COLUMN_TAKEN,
  MESSAGE_PIVOT_AGGREGATION_UNSUPPORTED,
  MESSAGE_PIVOT_COLUMN_IS_ROW_COLUMN,
  MESSAGE_PIVOT_COLUMN_NOT_PIVOTABLE,
  MESSAGE_PIVOT_ROW_COLUMN_NOT_GROUPABLE,
  MESSAGE_PIVOT_VALUE_INVALID,
  MESSAGE_PIVOT_VALUE_NOT_A_COLUMN_NAME,
  MESSAGE_PIVOT_VALUES_DIFFER_ONLY_IN_CASE,
  MESSAGE_PIVOT_VALUES_TOO_MANY,
} from '../../messages/CubeMessages.js';
import { foldColumnName, isValidColumnName } from '../../schema/ColumnName.js';
import { Schema, SchemaColumn } from '../../schema/Schema.js';
import type { CubeType } from '../../types/CubeType.js';
import { TypeFamily } from '../../types/TypeFamily.js';
import { isSortableType } from '../../types/TypeCompatibility.js';
import { isStringList } from '../../utils/AssertionUtils.js';
import type { JsonObject } from '../../utils/Json.js';
import {
  getLiteralText,
  isLiteralValue,
  type LiteralValue,
} from '../../values/LiteralValue.js';
import { checkValue } from '../../values/ValueEntry.js';
import {
  AggregationFunction,
  getAggregationResultType,
  isAggregationFunction,
  isAggregationNullable,
  validateAggregationFunctionAndColumn,
} from './Aggregation.js';

/** The most values a Pivot takes: each makes a column (PLAN §11.12) */
export const PIVOT_MAX_VALUES = 100;

/**
 * A Pivot's aggregation: a Group's (§11.5) with no name, since each value's
 * column is named by the value. `column` is `undefined` for Count rows and
 * `''` until picked; the function is kept as saved, so an unknown one is
 * held and reported.
 */
export interface PivotAggregation {
  readonly function: string;
  readonly column: string | undefined;
}

const isPivotAggregation = (value: unknown): value is PivotAggregation => {
  if (typeof value !== 'object' || value === null) {
    return false;
  }
  const { function: fn, column } = value as Record<string, unknown>;
  return (
    typeof fn === 'string' &&
    (column === undefined || typeof column === 'string')
  );
};

/** What a new Pivot counts: every row, so it needs no column (PLAN §11.12) */
export const DEFAULT_PIVOT_AGGREGATION: PivotAggregation = Object.freeze({
  function: AggregationFunction.COUNT_ROWS,
  column: undefined,
});

/**
 * The functions a Pivot takes, in a Group's order (PLAN §11.12, §11.27): not
 * Distinct Value, whose pivot DuckDB refuses, nor the functions of §11.27,
 * as Snowflake's pivot takes only COUNT, SUM, AVG, MIN and MAX
 */
export const PIVOT_AGGREGATION_FUNCTIONS: readonly AggregationFunction[] =
  Object.freeze([
    AggregationFunction.COUNT,
    AggregationFunction.DISTINCT_COUNT,
    AggregationFunction.SUM,
    AggregationFunction.AVERAGE,
    AggregationFunction.MIN,
    AggregationFunction.MAX,
    AggregationFunction.COUNT_ROWS,
  ]);

/**
 * Whether a column of the type can be pivoted (PLAN §11.12): a String, an
 * integer, a StrictDate or a Boolean, whose values the engine's static pivot
 * takes and names its columns by. A float matches its values inexactly;
 * DateTime, Decimal and enumerations aren't probed yet.
 */
export const isPivotableType = (type: CubeType): boolean =>
  type.family === TypeFamily.STRING ||
  type.family === TypeFamily.INTEGER ||
  type.family === TypeFamily.STRICT_DATE ||
  type.family === TypeFamily.BOOLEAN;

/**
 * The output column of each value, in order: the value's text, else with
 * `_2`, `_3`, … until no row column and no earlier value's column has it in
 * any case (`foldColumnName`, as Cube's other generated names)
 */
export const getPivotColumnNames = (
  rows: readonly string[],
  values: readonly LiteralValue[],
): string[] => {
  const taken = new Set(rows.map(foldColumnName));
  return values.map((value) => {
    const base = getLiteralText(value);
    let name = base;
    for (let suffix = 2; taken.has(foldColumnName(name)); suffix += 1) {
      name = `${base}_${suffix}`;
    }
    taken.add(foldColumnName(name));
    return name;
  });
};

/** How many values the description names */
const DESCRIBED_VALUES = 3;

const sameValue = (a: LiteralValue, b: LiteralValue): boolean =>
  a.kind === b.kind && a.value === b.value;

/**
 * Turns the values of a column into columns (PLAN §11.12): one row per
 * combination of the row columns that has a listed value, and one column per
 * listed value, holding the aggregation of that combination's rows with that
 * value. Written with the engine's static `pivot()`, which first keeps only
 * the rows with a listed value, so values not listed, and combinations holding
 * only them, are left out. No row order is kept, as in a Group.
 */
export class Pivot extends UnaryNode {
  static readonly TYPE = 'pivot';

  /** The row columns, as listed, which make the rows: none gives one row */
  readonly rows: readonly string[];
  /** The pivot column, `''` until picked */
  readonly column: string;
  /** The values that become columns, in the order listed */
  readonly values: readonly LiteralValue[];
  readonly aggregation: PivotAggregation;

  /** By default, nothing picked yet, counting rows */
  constructor(
    id: string,
    rows: readonly string[] = [],
    column = '',
    values: readonly LiteralValue[] = [],
    aggregation: PivotAggregation = DEFAULT_PIVOT_AGGREGATION,
    rest?: JsonObject,
  ) {
    super(id, rest);
    if (!isStringList(rows)) {
      throw new Error(`A pivot's rows must be a list of column names`);
    }
    if (typeof column !== 'string') {
      throw new Error(`A pivot's column must be a column name`);
    }
    const list: unknown = values;
    if (
      !Array.isArray(list) ||
      !Array.from(list as unknown[]).every(isLiteralValue)
    ) {
      throw new Error(`A pivot's values must be a list of literals`);
    }
    if (!isPivotAggregation(aggregation)) {
      throw new Error(
        `A pivot's aggregation must be {function, column}, the column left out for Count rows`,
      );
    }
    this.rows = Object.freeze([...rows]);
    this.column = column;
    this.values = Object.freeze(
      values.map((value) => Object.freeze({ ...value })),
    );
    this.aggregation = Object.freeze({
      function: aggregation.function,
      column: aggregation.column,
    });
  }

  get type(): string {
    return Pivot.TYPE;
  }

  withRows(rows: readonly string[]): Pivot {
    return new Pivot(
      this.id,
      rows,
      this.column,
      this.values,
      this.aggregation,
      this.rest,
    );
  }

  /** A new pivot with this column; its values, of the column before, are dropped */
  withColumn(column: string): Pivot {
    return new Pivot(
      this.id,
      this.rows,
      column,
      column === this.column ? this.values : [],
      this.aggregation,
      this.rest,
    );
  }

  withValues(values: readonly LiteralValue[]): Pivot {
    return new Pivot(
      this.id,
      this.rows,
      this.column,
      values,
      this.aggregation,
      this.rest,
    );
  }

  withAggregation(aggregation: PivotAggregation): Pivot {
    return new Pivot(
      this.id,
      this.rows,
      this.column,
      this.values,
      aggregation,
      this.rest,
    );
  }

  /** The output column of each value, in order (`getPivotColumnNames`) */
  get columnNames(): string[] {
    return getPivotColumnNames(this.rows, this.values);
  }

  /**
   * In order, stopping at the first part that fails, every problem of that
   * part reported: the row columns, none twice, each named, in the input and
   * groupable; the pivot column, picked, in the input, pivotable and no row
   * column; its values, one to `PIVOT_MAX_VALUES`, each of its type, none
   * twice, no two differing only in case (`foldColumnName`: DuckDB, for one,
   * gives both the first one's column), each naming a column; then the aggregation, its function and column
   * as a Group's, a known function one a Pivot takes
   * (`PIVOT_AGGREGATION_FUNCTIONS`), the column neither a row column nor the
   * pivot column.
   */
  validate(inputSchemas: readonly Schema[], errors?: string[]): boolean {
    // `ensureSchemas` has checked there is one schema per port
    const [schema] = ensureSchemas(inputSchemas, this.ports) as [Schema];
    return (
      this.validateRows(schema, errors) &&
      this.validateColumn(schema, errors) &&
      this.validateValues(schema, errors) &&
      this.validateAggregation(schema, errors)
    );
  }

  private validateRows(schema: Schema, errors?: string[]): boolean {
    return (
      validate(
        new Set(this.rows).size === this.rows.length,
        MESSAGE_CANNOT_HAVE_DUPLICATES('Row columns'),
        errors,
      ) &&
      validateAllItems(this.rows, (name) => {
        const type = name ? schema.type(name) : undefined;
        return (
          validate(
            name !== '',
            MESSAGE_DOES_NOT_HAVE_A_NAME('Row column'),
            errors,
          ) &&
          validate(
            type !== undefined,
            MESSAGE_NOT_IN_INPUT_SCHEMA('Row column', name),
            errors,
          ) &&
          (type === undefined ||
            validate(
              isSortableType(type),
              MESSAGE_PIVOT_ROW_COLUMN_NOT_GROUPABLE(name, type.displayName),
              errors,
            ))
        );
      })
    );
  }

  private validateColumn(schema: Schema, errors?: string[]): boolean {
    const { column } = this;
    const type = column ? schema.type(column) : undefined;
    return (
      validate(
        column !== '',
        MESSAGE_DOES_NOT_HAVE_A_NAME('Pivot column'),
        errors,
      ) &&
      validate(
        type !== undefined,
        MESSAGE_NOT_IN_INPUT_SCHEMA('Pivot column', column),
        errors,
      ) &&
      validate(
        type !== undefined && isPivotableType(type),
        MESSAGE_PIVOT_COLUMN_NOT_PIVOTABLE(column, type?.displayName ?? ''),
        errors,
      ) &&
      validate(
        !this.rows.includes(column),
        MESSAGE_PIVOT_COLUMN_IS_ROW_COLUMN(column),
        errors,
      )
    );
  }

  private validateValues(schema: Schema, errors?: string[]): boolean {
    const { values } = this;
    // the pivot column is valid, checked above
    const type = schema.type(this.column) as CubeType;
    const names = this.columnNames;
    return (
      validate(
        values.length > 0,
        MESSAGE_CANNOT_BE_EMPTY('Pivot values'),
        errors,
      ) &&
      validate(
        values.length <= PIVOT_MAX_VALUES,
        MESSAGE_PIVOT_VALUES_TOO_MANY(PIVOT_MAX_VALUES),
        errors,
      ) &&
      validateAllItems(values, (value) =>
        validate(
          checkValue(value, type) === undefined,
          MESSAGE_PIVOT_VALUE_INVALID(getLiteralText(value), type.displayName),
          errors,
        ),
      ) &&
      validate(
        values.every(
          (value, index) =>
            values.findIndex((other) => sameValue(other, value)) === index,
        ),
        MESSAGE_CANNOT_HAVE_DUPLICATES('Pivot values'),
        errors,
      ) &&
      validateAllItems(values, (value, index) => {
        const text = getLiteralText(value);
        const earlier = values
          .slice(0, index)
          .map(getLiteralText)
          .find((other) => foldColumnName(other) === foldColumnName(text));
        return validate(
          earlier === undefined,
          MESSAGE_PIVOT_VALUES_DIFFER_ONLY_IN_CASE(text, earlier ?? ''),
          errors,
        );
      }) &&
      validateAllItems(values, (value, index) =>
        validate(
          isValidColumnName(getLiteralText(value)) &&
            isValidColumnName(names[index] ?? ''),
          MESSAGE_PIVOT_VALUE_NOT_A_COLUMN_NAME(getLiteralText(value)),
          errors,
        ),
      )
    );
  }

  private validateAggregation(schema: Schema, errors?: string[]): boolean {
    const { aggregation } = this;
    const { column, function: fn } = aggregation;
    return (
      validate(
        !isAggregationFunction(fn) || PIVOT_AGGREGATION_FUNCTIONS.includes(fn),
        MESSAGE_PIVOT_AGGREGATION_UNSUPPORTED(fn),
        errors,
      ) &&
      validateAggregationFunctionAndColumn(aggregation, schema, errors) &&
      validate(
        column === undefined ||
          (column !== this.column && !this.rows.includes(column)),
        MESSAGE_PIVOT_AGGREGATION_COLUMN_TAKEN(column ?? ''),
        errors,
      )
    );
  }

  /**
   * The row columns as the input has them, in the order listed, then one
   * column per value, named by it (`columnNames`), typed as the aggregation is
   * in a Group (PLAN §5.7): never empty for the counts, which give 0 where no
   * row has the value; `undefined` when invalid
   */
  override schematize(inputSchemas: readonly Schema[]): Schema | undefined {
    if (!this.validate(inputSchemas)) {
      return undefined;
    }
    const [schema] = inputSchemas as [Schema];
    const { function: fn, column } = this.aggregation;
    // the aggregation is valid, checked above
    if (!isAggregationFunction(fn)) {
      throw new Error(`Pivot "${this.id}" has an unknown function "${fn}"`);
    }
    const type = getAggregationResultType(
      fn,
      column === undefined ? undefined : schema.type(column),
    );
    if (!type) {
      throw new Error(`Pivot "${this.id}" can't type its values' columns`);
    }
    return new Schema([
      ...this.rows.map((name) => schema.lookup(name) as SchemaColumn),
      ...this.columnNames.map(
        (name) => new SchemaColumn(name, type, isAggregationNullable(fn)),
      ),
    ]);
  }

  /** `Pivot "YEAR" into 2000, 2011, 2012`, the values after the third counted */
  override isUnset(): boolean {
    return !this.column;
  }

  describe(): string {
    const { values } = this;
    const shown = values.slice(0, DESCRIBED_VALUES).map(getLiteralText);
    const more = values.length - shown.length;
    return `Pivot ${this.column ? `"${this.column}"` : BLANK_PLACEHOLDER}${
      shown.length
        ? ` into ${shown.join(', ')}${more ? ` and ${more} more` : ''}`
        : ''
    }`;
  }

  /** The description without the values, which come from the data */
  override describeRedacted(): string {
    return `Pivot ${this.column ? `"${this.column}"` : BLANK_PLACEHOLDER}`;
  }
}
