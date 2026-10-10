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
import type { OrderKey, RowOrder } from '../../inference/RowOrder.js';
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
  MESSAGE_SORT_COLUMN_NOT_SORTABLE,
} from '../../messages/CubeMessages.js';
import type { Schema } from '../../schema/Schema.js';
import { isSortableType } from '../../types/TypeCompatibility.js';
import type { JsonObject } from '../../utils/Json.js';

export enum SortDirection {
  ASC = 'ASC',
  DESC = 'DESC',
}

export const SORT_DIRECTIONS: readonly SortDirection[] = Object.freeze([
  SortDirection.ASC,
  SortDirection.DESC,
]);

export const isSortDirection = (value: unknown): value is SortDirection =>
  SORT_DIRECTIONS.includes(value as SortDirection);

/** How a description names a direction (spec §7.1) */
export const SORT_DIRECTION_LABELS: Readonly<Record<SortDirection, string>> =
  Object.freeze({
    [SortDirection.ASC]: 'Asc',
    [SortDirection.DESC]: 'Desc',
  });

/** How an editor offers a direction (spec §7.1) */
export const SORT_DIRECTION_DESCRIPTIONS: Readonly<
  Record<SortDirection, string>
> = Object.freeze({
  [SortDirection.ASC]: 'Ascending',
  [SortDirection.DESC]: 'Descending',
});

/** One sort key: a column, `''` until picked, and its direction */
export interface ColumnDirection {
  readonly column: string;
  readonly direction: SortDirection;
}

/** Whether a value has a `ColumnDirection`'s shape: a column text and a known direction */
export const isColumnDirection = (value: unknown): value is ColumnDirection =>
  typeof value === 'object' &&
  value !== null &&
  typeof (value as Partial<Record<keyof ColumnDirection, unknown>>).column ===
    'string' &&
  isSortDirection(
    (value as Partial<Record<keyof ColumnDirection, unknown>>).direction,
  );

/**
 * Checks one sort key against the input schema, stopping at its first
 * problem: its column is named, in the input, and of a type that sorts
 * (`isSortableType`). Exported so an editor can mark each row.
 */
export const validateSortKey = (
  sort: ColumnDirection,
  schema: Schema,
  errors?: string[],
): boolean => {
  const { column } = sort;
  const type = column ? schema.type(column) : undefined;
  return (
    validate(
      column !== '',
      MESSAGE_DOES_NOT_HAVE_A_NAME('Sort column'),
      errors,
    ) &&
    validate(
      type !== undefined,
      MESSAGE_NOT_IN_INPUT_SCHEMA('Sort column', column),
      errors,
    ) &&
    (type === undefined ||
      validate(
        isSortableType(type),
        MESSAGE_SORT_COLUMN_NOT_SORTABLE(column, type.displayName),
        errors,
      ))
  );
};

/**
 * Orders the rows of its input by one or more columns (spec §7.1); the
 * columns stay as they are. Where Cube writes the sort follows where the
 * order is used, not where the node stands (PLAN §11.4): before a Limit, Drop
 * or Slice that takes rows by it, and before the run's own row limit.
 */
export class Sort extends UnaryNode {
  static readonly TYPE = 'sort';

  readonly sorts: readonly ColumnDirection[];

  /** By default, no sort key yet */
  constructor(
    id: string,
    sorts: readonly ColumnDirection[] = [],
    rest?: JsonObject,
  ) {
    super(id, rest);
    const list: unknown = sorts;
    if (
      !Array.isArray(list) ||
      !Array.from(list as unknown[]).every(isColumnDirection)
    ) {
      throw new Error(
        `A sort's keys must be a list of {column, direction}, the direction ASC or DESC`,
      );
    }
    this.sorts = Object.freeze(
      sorts.map(({ column, direction }) =>
        Object.freeze({ column, direction }),
      ),
    );
  }

  /** The quick action's sort (spec §7.1): one column, ascending */
  static byColumn(id: string, column: string): Sort {
    return new Sort(id, [{ column, direction: SortDirection.ASC }]);
  }

  get type(): string {
    return Sort.TYPE;
  }

  /** A new sort with the same id, and these keys */
  withSorts(sorts: readonly ColumnDirection[]): Sort {
    return new Sort(this.id, sorts, this.rest);
  }

  /**
   * Some keys; then each key checked (`validateSortKey`), every key
   * reported; then no column twice
   */
  validate(inputSchemas: readonly Schema[], errors?: string[]): boolean {
    // `ensureSchemas` has checked there is one schema per port
    const [schema] = ensureSchemas(inputSchemas, this.ports) as [Schema];
    const named = this.sorts.map(({ column }) => column).filter(Boolean);
    return (
      validate(
        this.sorts.length > 0,
        MESSAGE_CANNOT_BE_EMPTY('Sorts'),
        errors,
      ) &&
      validateAllItems(this.sorts, (sort) =>
        validateSortKey(sort, schema, errors),
      ) &&
      validate(
        new Set(named).size === named.length,
        MESSAGE_CANNOT_HAVE_DUPLICATES('Sort columns'),
        errors,
      )
    );
  }

  /** The input schema, or `undefined` when the keys are invalid */
  override schematize(inputSchemas: readonly Schema[]): Schema | undefined {
    return this.validate(inputSchemas) ? inputSchemas[0] : undefined;
  }

  /**
   * Its own keys first, then the input's order on the columns it doesn't
   * sort by, as ties are kept in order (the engine merges consecutive sorts
   * the same way)
   */
  override outputOrder(
    inputOrders: readonly (RowOrder | undefined)[],
  ): RowOrder | undefined {
    const own: OrderKey[] = this.sorts.map(
      ({ column, direction }, keyIndex) => ({
        column,
        direction,
        sortId: this.id,
        keyIndex,
      }),
    );
    const columns = new Set(own.map(({ column }) => column));
    const [input] = inputOrders;
    return [
      ...own,
      ...(input ?? []).filter(({ column }) => !columns.has(column)),
    ];
  }

  describe(): string {
    return `Sort by ${
      this.sorts.length
        ? this.sorts
            .map(
              ({ column, direction }) =>
                `${column ? `"${column}"` : BLANK_PLACEHOLDER} ${SORT_DIRECTION_LABELS[direction]}`,
            )
            .join(', ')
        : BLANK_PLACEHOLDER
    }`;
  }
}
