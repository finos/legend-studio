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
import type { RowOrder } from '../../inference/RowOrder.js';
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
} from '../../messages/CubeMessages.js';
import { Schema } from '../../schema/Schema.js';
import { isStringList } from '../../utils/AssertionUtils.js';
import type { JsonObject } from '../../utils/Json.js';

/**
 * Keeps only some columns of its input (spec §7.4), in the input's order, not
 * the order they were picked in: the engine's `select` keeps the order it is
 * given, so the emitter lists them in input order too.
 */
export class Restrict extends UnaryNode {
  static readonly TYPE = 'restrict';

  /** The columns to keep, as given; validation checks them against the input */
  readonly columns: readonly string[];

  /** By default, no column yet */
  constructor(id: string, columns: readonly string[] = [], rest?: JsonObject) {
    super(id, rest);
    if (!isStringList(columns)) {
      throw new Error(`A restrict's columns must be a list of column names`);
    }
    this.columns = Object.freeze([...columns]);
  }

  get type(): string {
    return Restrict.TYPE;
  }

  /** A new restrict with the same id, and these columns */
  withColumns(columns: readonly string[]): Restrict {
    return new Restrict(this.id, columns, this.rest);
  }

  /**
   * In the spec's order: some columns, no column twice, then each column
   * named and in the input, every column reported
   */
  validate(inputSchemas: readonly Schema[], errors?: string[]): boolean {
    // `ensureSchemas` has checked there is one schema per port
    const [schema] = ensureSchemas(inputSchemas, this.ports) as [Schema];
    return (
      validate(
        this.columns.length > 0,
        MESSAGE_CANNOT_BE_EMPTY('Columns'),
        errors,
      ) &&
      validate(
        new Set(this.columns).size === this.columns.length,
        MESSAGE_CANNOT_HAVE_DUPLICATES('Columns'),
        errors,
      ) &&
      validateAllItems(
        this.columns,
        (name) =>
          validate(
            name !== '',
            MESSAGE_DOES_NOT_HAVE_A_NAME('Column'),
            errors,
          ) &&
          validate(
            schema.lookup(name) !== undefined,
            MESSAGE_NOT_IN_INPUT_SCHEMA('Column', name),
            errors,
          ),
      )
    );
  }

  /** The input's columns that are kept, in the input's order, or `undefined` when invalid */
  override schematize(inputSchemas: readonly Schema[]): Schema | undefined {
    if (!this.validate(inputSchemas)) {
      return undefined;
    }
    const [schema] = inputSchemas as [Schema];
    return new Schema(
      schema.columns.filter((column) => this.columns.includes(column.name)),
    );
  }

  /**
   * The input's order up to its first key on a column it doesn't keep: the
   * rows are still in order by the keys before it, not by the ones after
   */
  override outputOrder(
    inputOrders: readonly (RowOrder | undefined)[],
  ): RowOrder | undefined {
    const [input] = inputOrders;
    if (!input) {
      return input;
    }
    const dropped = input.findIndex(
      ({ column }) => !this.columns.includes(column),
    );
    return dropped < 0 ? input : input.slice(0, dropped);
  }

  describe(): string {
    return `Restrict Columns to: ${
      this.columns.length
        ? this.columns.map((name) => `"${name}"`).join(', ')
        : BLANK_PLACEHOLDER
    }`;
  }
}
