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
import { keepInputOrder, type RowOrder } from '../../inference/RowOrder.js';
import {
  ensureSchemas,
  validate,
  validateAllItems,
} from '../../inference/ValidationUtils.js';
import {
  MESSAGE_CANNOT_BE_EMPTY,
  MESSAGE_CANNOT_HAVE_DUPLICATES,
  MESSAGE_DOES_NOT_HAVE_A_NAME,
  MESSAGE_NOT_IN_INPUT_SCHEMA,
  MESSAGE_PARTITION_COLUMN_NOT_PARTITIONABLE,
} from '../../messages/CubeMessages.js';
import { Schema, SchemaColumn } from '../../schema/Schema.js';
import { isSortableType } from '../../types/TypeCompatibility.js';
import { isStringList } from '../../utils/AssertionUtils.js';
import type { JsonObject } from '../../utils/Json.js';
import {
  type AggregationUse,
  type ColumnAggregation,
  freezeColumnAggregation,
  getAggregationResultType,
  isAggregationNullable,
  isColumnAggregation,
  isWindowFunction,
  validateColumnAggregation,
} from './Aggregation.js';
import {
  type ColumnDirection,
  isColumnDirection,
  validateSortKey,
} from './Sort.js';

/**
 * Checks one partition column against the input schema, stopping at its
 * first problem: it is named, in the input, and of a type the database can
 * partition by (`isSortableType`: not VARIANT or a type Cube doesn't know,
 * as for a Group's keys). Exported so an editor can mark each column.
 */
export const validatePartitionColumn = (
  name: string,
  schema: Schema,
  errors?: string[],
): boolean => {
  const type = name ? schema.type(name) : undefined;
  return (
    validate(
      name !== '',
      MESSAGE_DOES_NOT_HAVE_A_NAME('Partition column'),
      errors,
    ) &&
    validate(
      type !== undefined,
      MESSAGE_NOT_IN_INPUT_SCHEMA('Partition column', name),
      errors,
    ) &&
    (type === undefined ||
      validate(
        isSortableType(type),
        MESSAGE_PARTITION_COLUMN_NOT_PARTITIONABLE(name, type.displayName),
        errors,
      ))
  );
};

/**
 * Adds a column per window function to every row (spec §7.13): each computed
 * over the rows that share the row's partition column values (all the rows
 * without any), in the window's sort order. With a sort, an aggregate runs
 * from the partition's first row to the current one, rows tied on the sort
 * sharing a value, as SQL's default frame does (D5, PLAN §11.6); without
 * one, it covers the whole partition. The rank and row functions need a sort
 * (PLAN §11.9). The input's columns and rows stay as they are, in the
 * input's order.
 */
export class Partition extends UnaryNode {
  static readonly TYPE = 'partition';

  /** The partition columns, as listed; none is a window over all the rows */
  readonly columns: readonly string[];
  /** The window's sort keys, most significant first; may be empty */
  readonly sorts: readonly ColumnDirection[];
  /** The window functions, each a new column */
  readonly aggregations: readonly ColumnAggregation[];

  /** By default, no partition column, no sort and no window function yet */
  constructor(
    id: string,
    columns: readonly string[] = [],
    sorts: readonly ColumnDirection[] = [],
    aggregations: readonly ColumnAggregation[] = [],
    rest?: JsonObject,
  ) {
    super(id, rest);
    if (!isStringList(columns)) {
      throw new Error(`A partition's columns must be a list of column names`);
    }
    const sortList: unknown = sorts;
    if (
      !Array.isArray(sortList) ||
      !Array.from(sortList as unknown[]).every(isColumnDirection)
    ) {
      throw new Error(
        `A partition's sorts must be a list of {column, direction}, the direction ASC or DESC`,
      );
    }
    const aggregationList: unknown = aggregations;
    if (
      !Array.isArray(aggregationList) ||
      !Array.from(aggregationList as unknown[]).every(isColumnAggregation)
    ) {
      throw new Error(
        `A partition's window functions must be a list of {column, function, name, offset?, buckets?}, the column left out for a function that takes none`,
      );
    }
    this.columns = Object.freeze([...columns]);
    this.sorts = Object.freeze(
      sorts.map(({ column, direction }) =>
        Object.freeze({ column, direction }),
      ),
    );
    this.aggregations = Object.freeze(
      aggregations.map(freezeColumnAggregation),
    );
  }

  get type(): string {
    return Partition.TYPE;
  }

  /** A new partition with the same id, and these partition columns */
  withColumns(columns: readonly string[]): Partition {
    return new Partition(
      this.id,
      columns,
      this.sorts,
      this.aggregations,
      this.rest,
    );
  }

  /** A new partition with the same id, and these sort keys */
  withSorts(sorts: readonly ColumnDirection[]): Partition {
    return new Partition(
      this.id,
      this.columns,
      sorts,
      this.aggregations,
      this.rest,
    );
  }

  /** A new partition with the same id, and these window functions */
  withAggregations(aggregations: readonly ColumnAggregation[]): Partition {
    return new Partition(
      this.id,
      this.columns,
      this.sorts,
      aggregations,
      this.rest,
    );
  }

  /** Where its window functions are: a window, sorted when it has sort keys */
  get aggregationUse(): AggregationUse {
    return { kind: 'window', sorted: this.sorts.length > 0 };
  }

  /**
   * The partition columns first: none twice, then each checked
   * (`validatePartitionColumn`), every one reported; none at all is one
   * window over all the rows. Then the sort keys, each checked
   * (`validateSortKey`), every one reported, then none twice; none at all is
   * an unsorted window. Then some window functions, each checked
   * (`validateColumnAggregation`, as a window's), every one reported. The
   * engine fails on a duplicate with no location, so Cube refuses one first.
   */
  validate(inputSchemas: readonly Schema[], errors?: string[]): boolean {
    // `ensureSchemas` has checked there is one schema per port
    const [schema] = ensureSchemas(inputSchemas, this.ports) as [Schema];
    // every key is named by then: a blank one fails `validateSortKey` first
    const sortColumns = this.sorts.map(({ column }) => column);
    return (
      validate(
        new Set(this.columns).size === this.columns.length,
        MESSAGE_CANNOT_HAVE_DUPLICATES('Partition columns'),
        errors,
      ) &&
      validateAllItems(this.columns, (name) =>
        validatePartitionColumn(name, schema, errors),
      ) &&
      validateAllItems(this.sorts, (sort) =>
        validateSortKey(sort, schema, errors),
      ) &&
      validate(
        new Set(sortColumns).size === sortColumns.length,
        MESSAGE_CANNOT_HAVE_DUPLICATES('Sort columns'),
        errors,
      ) &&
      validate(
        this.aggregations.length > 0,
        MESSAGE_CANNOT_BE_EMPTY('Aggregations'),
        errors,
      ) &&
      validateAllItems(this.aggregations, (_, index) =>
        validateColumnAggregation(
          this.aggregations,
          index,
          schema,
          errors,
          this.aggregationUse,
        ),
      )
    );
  }

  /**
   * The input's columns as they are, then one column per window function, in
   * the order listed, typed as the engine types it and nullable but for the
   * counts and the rank functions (PLAN §5.7, §11.6, §11.9); `undefined` when
   * invalid
   */
  override schematize(inputSchemas: readonly Schema[]): Schema | undefined {
    if (!this.validate(inputSchemas)) {
      return undefined;
    }
    const [schema] = inputSchemas as [Schema];
    return new Schema([
      ...schema.columns,
      ...this.aggregations.map(({ column, function: fn, name }) => {
        // every window function is valid, checked above
        if (!isWindowFunction(fn)) {
          throw new Error(
            `Partition "${this.id}" has an unknown function "${fn}"`,
          );
        }
        const type = getAggregationResultType(
          fn,
          column === undefined ? undefined : schema.type(column),
        );
        if (!type) {
          throw new Error(`Partition "${this.id}" can't type its "${name}"`);
        }
        return new SchemaColumn(name, type, isAggregationNullable(fn));
      }),
    ]);
  }

  /**
   * The input's order: every row and column is kept, so the order's columns
   * are still there, and Cube writes it where it is used, after the window
   * (PLAN §11.6). The window's own sort orders its functions, not the rows.
   */
  override outputOrder(
    inputOrders: readonly (RowOrder | undefined)[],
  ): RowOrder | undefined {
    return keepInputOrder(inputOrders);
  }

  describe(): string {
    const count = this.aggregations.length;
    return `Apply ${count} Window Function${count === 1 ? '' : 's'}`;
  }
}
