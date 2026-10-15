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
import { ensureSchemas, validate } from '../../inference/ValidationUtils.js';
import {
  BLANK_PLACEHOLDER,
  MESSAGE_ALREADY_IN_INPUT_SCHEMA,
  MESSAGE_CANNOT_BE_EMPTY,
  MESSAGE_DOES_NOT_HAVE_A_NAME,
  MESSAGE_EXPLODE_COLUMN_NOT_VARIANT,
  MESSAGE_NEW_COLUMN_NAME_EMPTY,
  MESSAGE_NEW_COLUMN_NAME_INVALID,
  MESSAGE_NOT_IN_INPUT_SCHEMA,
} from '../../messages/CubeMessages.js';
import { foldColumnName, isValidColumnName } from '../../schema/ColumnName.js';
import { Schema, SchemaColumn } from '../../schema/Schema.js';
import { PrimitiveType } from '../../types/CubeType.js';
import { PRIMITIVE_TYPE_PATH } from '../../types/PrimitiveTypeRegistry.js';
import { TypeFamily } from '../../types/TypeFamily.js';
import { isStringList } from '../../utils/AssertionUtils.js';
import type { JsonObject } from '../../utils/Json.js';

/**
 * Explode Array (PLAN §11.20): one row per element of an array in a Variant
 * (JSON) column, at a path of keys (none when the column is the array). The
 * input's columns are kept, and the element is a new Variant column, empty
 * for a row whose array is empty or missing, which is kept once: the engine's
 * `lateral` with `flatten` keeps it on every database that runs it.
 */
export class Explode extends UnaryNode {
  static readonly TYPE = 'explode';

  /** The Variant column holding the documents, `''` until picked */
  readonly column: string;
  /** The keys from the column to the array, empty when the column is the array */
  readonly path: readonly string[];
  /** The new column's name, `''` until given */
  readonly name: string;

  /** By default, nothing picked yet */
  constructor(
    id: string,
    column = '',
    path: readonly string[] = [],
    name = '',
    rest?: JsonObject,
  ) {
    super(id, rest);
    if (typeof column !== 'string') {
      throw new Error(`An explode's column must be a column name`);
    }
    if (!isStringList(path)) {
      throw new Error(`An explode's path must be a list of keys`);
    }
    if (typeof name !== 'string') {
      throw new Error(`An explode's name must be a column name`);
    }
    this.column = column;
    this.path = Object.freeze([...path]);
    this.name = name;
  }

  get type(): string {
    return Explode.TYPE;
  }

  /** A new explode with the same id and rest, and these settings */
  with(settings: {
    column?: string;
    path?: readonly string[];
    name?: string;
  }): Explode {
    return new Explode(
      this.id,
      settings.column ?? this.column,
      settings.path ?? this.path,
      settings.name ?? this.name,
      this.rest,
    );
  }

  /**
   * In order: a column, in the input, a Variant; no empty key in the path;
   * then a new column's name, valid and no input column's, compared as
   * databases that ignore case compare them. Each part stops at its first
   * problem, every part reported.
   */
  validate(inputSchemas: readonly Schema[], errors?: string[]): boolean {
    // `ensureSchemas` has checked there is one schema per port
    const [schema] = ensureSchemas(inputSchemas, this.ports) as [Schema];
    const column = this.validateColumn(schema, errors);
    const path = validate(
      this.path.every((key) => key !== ''),
      MESSAGE_CANNOT_BE_EMPTY('Path key'),
      errors,
    );
    const name = this.validateName(schema, errors);
    return column && path && name;
  }

  private validateColumn(schema: Schema, errors?: string[]): boolean {
    const { column } = this;
    const type = column ? schema.type(column) : undefined;
    return (
      validate(
        column !== '',
        MESSAGE_DOES_NOT_HAVE_A_NAME('Explode column'),
        errors,
      ) &&
      validate(
        type !== undefined,
        MESSAGE_NOT_IN_INPUT_SCHEMA('Explode column', column),
        errors,
      ) &&
      validate(
        type?.family === TypeFamily.VARIANT,
        MESSAGE_EXPLODE_COLUMN_NOT_VARIANT(column, type?.displayName ?? ''),
        errors,
      )
    );
  }

  private validateName(schema: Schema, errors?: string[]): boolean {
    const { name } = this;
    const folded = foldColumnName(name);
    return (
      validate(name !== '', MESSAGE_NEW_COLUMN_NAME_EMPTY, errors) &&
      validate(
        isValidColumnName(name),
        MESSAGE_NEW_COLUMN_NAME_INVALID,
        errors,
      ) &&
      validate(
        !schema.names().some((other) => foldColumnName(other) === folded),
        MESSAGE_ALREADY_IN_INPUT_SCHEMA('Column', name),
        errors,
      )
    );
  }

  /** The input's columns, then the element, a nullable Variant; `undefined` when invalid */
  override schematize(inputSchemas: readonly Schema[]): Schema | undefined {
    if (!this.validate(inputSchemas)) {
      return undefined;
    }
    const [schema] = inputSchemas as [Schema];
    return new Schema([
      ...schema.columns,
      new SchemaColumn(
        this.name,
        PrimitiveType.get(PRIMITIVE_TYPE_PATH.VARIANT),
        true,
      ),
    ]);
  }

  // No `outputOrder`: the engine writes a lateral join, which keeps no order

  override isUnset(): boolean {
    return !this.column;
  }

  /** `Explode Array "payload" › "items" into "item"` */
  describe(): string {
    const at = [this.column, ...this.path]
      .map((part) => (part ? `"${part}"` : BLANK_PLACEHOLDER))
      .join(' › ');
    return `Explode Array ${this.column ? at : BLANK_PLACEHOLDER}${
      this.name ? ` into "${this.name}"` : ''
    }`;
  }

  /** Without the keys, which come from the data, or the name the user gave: `Explode Array "payload"` */
  override describeRedacted(): string {
    return `Explode Array ${this.column ? `"${this.column}"` : BLANK_PLACEHOLDER}`;
  }
}
