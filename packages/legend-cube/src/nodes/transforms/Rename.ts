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
  MESSAGE_ALREADY_IN_INPUT_SCHEMA,
  MESSAGE_CANNOT_BE_EMPTY,
  MESSAGE_DOES_NOT_HAVE_A_NAME,
  MESSAGE_NEW_COLUMN_NAME_EMPTY,
  MESSAGE_NEW_COLUMN_NAME_INVALID,
  MESSAGE_NEW_COLUMN_NAME_SAME_AS_OLD,
  MESSAGE_NEW_COLUMN_NAME_SAME_AS_OTHER,
  MESSAGE_NOT_IN_INPUT_SCHEMA,
} from '../../messages/CubeMessages.js';
import { isValidColumnName } from '../../schema/ColumnName.js';
import { Schema, SchemaColumn } from '../../schema/Schema.js';
import type { JsonObject } from '../../utils/Json.js';

/** One column to rename: its name in the input, and its new name; `''` until picked or typed */
export interface RenameMapping {
  readonly from: string;
  readonly to: string;
}

const isRenameMapping = (value: unknown): value is RenameMapping =>
  typeof value === 'object' &&
  value !== null &&
  typeof (value as Partial<Record<keyof RenameMapping, unknown>>).from ===
    'string' &&
  typeof (value as Partial<Record<keyof RenameMapping, unknown>>).to ===
    'string';

/**
 * Checks one mapping of a rename against the input schema, stopping at its
 * first problem (spec §7.5's five checks, then the collision fix of PLAN
 * Appendix A): the old column is named and in the input; the new name is
 * given, is a valid column name (`isValidColumnName`) and differs from the old
 * one; neither name appears in another mapping, so a swap or a chain is
 * refused and the renames can run in any order; and the new name is not a
 * column the input keeps. Exported so an editor can mark each row.
 */
export const validateRenameMapping = (
  mappings: readonly RenameMapping[],
  index: number,
  schema: Schema,
  errors?: string[],
): boolean => {
  const mapping = mappings[index];
  if (!mapping) {
    throw new Error(`A rename has no mapping ${index}`);
  }
  const { from, to } = mapping;
  return (
    validate(from !== '', MESSAGE_DOES_NOT_HAVE_A_NAME('Old column'), errors) &&
    validate(
      schema.lookup(from) !== undefined,
      MESSAGE_NOT_IN_INPUT_SCHEMA('Old column', from),
      errors,
    ) &&
    validate(to !== '', MESSAGE_NEW_COLUMN_NAME_EMPTY, errors) &&
    validate(isValidColumnName(to), MESSAGE_NEW_COLUMN_NAME_INVALID, errors) &&
    validate(to !== from, MESSAGE_NEW_COLUMN_NAME_SAME_AS_OLD(to), errors) &&
    validate(
      mappings.every(
        (other, otherIndex) =>
          otherIndex === index ||
          ![other.from, other.to].some((name) => name === from || name === to),
      ),
      MESSAGE_NEW_COLUMN_NAME_SAME_AS_OTHER(to),
      errors,
    ) &&
    validate(
      schema.lookup(to) === undefined,
      MESSAGE_ALREADY_IN_INPUT_SCHEMA('New column name', to),
      errors,
    )
  );
};

/**
 * Gives some columns of its input new names (spec §7.5); their types,
 * nullability and positions stay as they are
 */
export class Rename extends UnaryNode {
  static readonly TYPE = 'rename';

  readonly mappings: readonly RenameMapping[];

  /** By default, no mapping yet */
  constructor(
    id: string,
    mappings: readonly RenameMapping[] = [],
    rest?: JsonObject,
  ) {
    super(id, rest);
    const list: unknown = mappings;
    if (
      !Array.isArray(list) ||
      !Array.from(list as unknown[]).every(isRenameMapping)
    ) {
      throw new Error(`A rename's mappings must be a list of {from, to} names`);
    }
    this.mappings = Object.freeze(
      mappings.map(({ from, to }) => Object.freeze({ from, to })),
    );
  }

  get type(): string {
    return Rename.TYPE;
  }

  /** A new rename with the same id, and these mappings */
  withMappings(mappings: readonly RenameMapping[]): Rename {
    return new Rename(this.id, mappings, this.rest);
  }

  /** Some mappings, then every mapping checked (`validateRenameMapping`) */
  validate(inputSchemas: readonly Schema[], errors?: string[]): boolean {
    // `ensureSchemas` has checked there is one schema per port
    const [schema] = ensureSchemas(inputSchemas, this.ports) as [Schema];
    return (
      validate(
        this.mappings.length > 0,
        MESSAGE_CANNOT_BE_EMPTY('Column renames'),
        errors,
      ) &&
      validateAllItems(this.mappings, (_, index) =>
        validateRenameMapping(this.mappings, index, schema, errors),
      )
    );
  }

  /** The input's columns, renamed in place, or `undefined` when invalid */
  override schematize(inputSchemas: readonly Schema[]): Schema | undefined {
    if (!this.validate(inputSchemas)) {
      return undefined;
    }
    const [schema] = inputSchemas as [Schema];
    return new Schema(
      schema.columns.map((column) => {
        const mapping = this.mappings.find(({ from }) => from === column.name);
        return mapping
          ? new SchemaColumn(mapping.to, column.type, column.nullable)
          : column;
      }),
    );
  }

  describe(): string {
    const count = this.mappings.length;
    return `Rename ${count} Column${count === 1 ? '' : 's'}`;
  }
}
