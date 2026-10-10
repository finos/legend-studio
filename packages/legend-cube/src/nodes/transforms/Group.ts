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
  MESSAGE_GROUP_COLUMN_NOT_GROUPABLE,
  MESSAGE_NOT_IN_INPUT_SCHEMA,
} from '../../messages/CubeMessages.js';
import { Schema, SchemaColumn } from '../../schema/Schema.js';
import { isSortableType } from '../../types/TypeCompatibility.js';
import { isStringList } from '../../utils/AssertionUtils.js';
import type { JsonObject } from '../../utils/Json.js';
import {
  type ColumnAggregation,
  getAggregationResultType,
  isAggregationFunction,
  isColumnAggregation,
  isAggregationNullable,
  validateColumnAggregation,
} from './Aggregation.js';

/**
 * Checks one key of a group against the input schema, stopping at its first
 * problem: it is named, in the input, and of a type the database can group by
 * (`isSortableType`: not VARIANT or a type Cube doesn't know, PLAN §11.5).
 * Exported so an editor can mark each key.
 */
export const validateGroupColumn = (
  name: string,
  schema: Schema,
  errors?: string[],
): boolean => {
  const type = name ? schema.type(name) : undefined;
  return (
    validate(
      name !== '',
      MESSAGE_DOES_NOT_HAVE_A_NAME('Group column'),
      errors,
    ) &&
    validate(
      type !== undefined,
      MESSAGE_NOT_IN_INPUT_SCHEMA('Group column', name),
      errors,
    ) &&
    (type === undefined ||
      validate(
        isSortableType(type),
        MESSAGE_GROUP_COLUMN_NOT_GROUPABLE(name, type.displayName),
        errors,
      ))
  );
};

/**
 * Gives one row per value of its key columns, with each aggregation of the
 * rows of that group (spec §7.2), or with no key one row for all the rows.
 * The keys keep the order they are listed in, which the engine follows; no
 * row order is kept, so no sort is written before a group (PLAN §11.5).
 */
export class Group extends UnaryNode {
  static readonly TYPE = 'group';

  /** The key columns, as listed; validation checks them against the input */
  readonly columns: readonly string[];
  readonly aggregations: readonly ColumnAggregation[];

  /** By default, no key and no aggregation yet */
  constructor(
    id: string,
    columns: readonly string[] = [],
    aggregations: readonly ColumnAggregation[] = [],
    rest?: JsonObject,
  ) {
    super(id, rest);
    if (!isStringList(columns)) {
      throw new Error(`A group's columns must be a list of column names`);
    }
    const list: unknown = aggregations;
    if (
      !Array.isArray(list) ||
      !Array.from(list as unknown[]).every(isColumnAggregation)
    ) {
      throw new Error(
        `A group's aggregations must be a list of {column, function, name}, the column left out for Count rows`,
      );
    }
    this.columns = Object.freeze([...columns]);
    this.aggregations = Object.freeze(
      aggregations.map(({ column, function: fn, name }) =>
        Object.freeze({ column, function: fn, name }),
      ),
    );
  }

  get type(): string {
    return Group.TYPE;
  }

  /** A new group with the same id, and these keys */
  withColumns(columns: readonly string[]): Group {
    return new Group(this.id, columns, this.aggregations, this.rest);
  }

  /** A new group with the same id, and these aggregations */
  withAggregations(aggregations: readonly ColumnAggregation[]): Group {
    return new Group(this.id, this.columns, aggregations, this.rest);
  }

  /**
   * The keys first: none twice, then each checked (`validateGroupColumn`),
   * every key reported; no key at all is a group of all the rows. Then some
   * aggregations, each checked (`validateColumnAggregation`), every one
   * reported. The engine fails on a duplicate name with no location, so Cube
   * refuses one first.
   */
  validate(inputSchemas: readonly Schema[], errors?: string[]): boolean {
    // `ensureSchemas` has checked there is one schema per port
    const [schema] = ensureSchemas(inputSchemas, this.ports) as [Schema];
    return (
      validate(
        new Set(this.columns).size === this.columns.length,
        MESSAGE_CANNOT_HAVE_DUPLICATES('Group columns'),
        errors,
      ) &&
      validateAllItems(this.columns, (name) =>
        validateGroupColumn(name, schema, errors),
      ) &&
      validate(
        this.aggregations.length > 0,
        MESSAGE_CANNOT_BE_EMPTY('Aggregations'),
        errors,
      ) &&
      validateAllItems(this.aggregations, (_, index) =>
        validateColumnAggregation(this.aggregations, index, schema, errors),
      )
    );
  }

  /**
   * The keys as the input has them, in the order listed, then one column per
   * aggregation, typed as the engine types it and nullable but for the
   * counts (PLAN §5.7); `undefined` when invalid
   */
  override schematize(inputSchemas: readonly Schema[]): Schema | undefined {
    if (!this.validate(inputSchemas)) {
      return undefined;
    }
    const [schema] = inputSchemas as [Schema];
    return new Schema([
      ...this.columns.map((name) => schema.lookup(name) as SchemaColumn),
      ...this.aggregations.map(({ column, function: fn, name }) => {
        // every aggregation is valid, checked above
        if (!isAggregationFunction(fn)) {
          throw new Error(`Group "${this.id}" has an unknown function "${fn}"`);
        }
        const type = getAggregationResultType(
          fn,
          column === undefined ? undefined : schema.type(column),
        );
        if (!type) {
          throw new Error(`Group "${this.id}" can't type its "${name}"`);
        }
        return new SchemaColumn(name, type, isAggregationNullable(fn));
      }),
    ]);
  }

  describe(): string {
    return this.columns.length
      ? `Group by ${this.columns
          .map((name) => (name ? `"${name}"` : BLANK_PLACEHOLDER))
          .join(', ')}`
      : 'Aggregate all rows';
  }
}
