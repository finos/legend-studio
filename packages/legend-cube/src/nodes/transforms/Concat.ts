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

import { BinaryNode } from '../../graph/QueryNode.js';
import { ensureSchemas } from '../../inference/ValidationUtils.js';
import {
  MESSAGE_CONCAT_COLUMN_COUNT,
  MESSAGE_CONCAT_COLUMN_NAME,
  MESSAGE_CONCAT_COLUMN_ORDER,
  MESSAGE_CONCAT_COLUMN_TYPE,
  MESSAGE_INPUT_SCHEMAS_DIFFER,
} from '../../messages/CubeMessages.js';
import { Schema, SchemaColumn } from '../../schema/Schema.js';
import type { JsonObject } from '../../utils/Json.js';

/** How the canvas and the messages call a Concat's inputs (PLAN §11.5, Q8) */
export const CONCAT_PORT_LABELS: readonly string[] = Object.freeze([
  'First',
  'Second',
]);

const isSameNames = (a: readonly string[], b: readonly string[]): boolean =>
  a.length === b.length && a.every((name, index) => name === b[index]);

const isSameSet = (a: readonly string[], b: readonly string[]): boolean =>
  a.length === b.length &&
  [...a].sort().every((name, index) => name === [...b].sort()[index]);

/**
 * Checks that a Concat's two inputs have the same columns, matched by
 * position (spec §7.10, PLAN §11.5): the same count, which the engine doesn't
 * check; then the same name at each position, in the same case, a reordering
 * told apart; then the same precise type at each position, named by its
 * short name, or its path when both share one. Nullability is never compared. The spec's message comes first, then Cube's for every
 * position that differs.
 */
export const validateConcatSchemas = (
  first: Schema,
  second: Schema,
  errors?: string[],
): boolean => {
  const problems: string[] = [];
  const firstNames = first.names();
  const secondNames = second.names();
  if (firstNames.length !== secondNames.length) {
    problems.push(
      MESSAGE_CONCAT_COLUMN_COUNT(firstNames.length, secondNames.length),
    );
  } else if (!isSameNames(firstNames, secondNames)) {
    if (isSameSet(firstNames, secondNames)) {
      problems.push(MESSAGE_CONCAT_COLUMN_ORDER);
    } else {
      firstNames.forEach((name, index) => {
        const other = secondNames[index] as string;
        if (name !== other) {
          problems.push(MESSAGE_CONCAT_COLUMN_NAME(index + 1, name, other));
        }
      });
    }
  } else {
    first.columns.forEach((column, index) => {
      const other = second.columns[index] as SchemaColumn;
      if (!column.type.equals(other.type)) {
        // two enumerations or opaque types can share a short name
        const named =
          column.type.displayName === other.type.displayName
            ? 'fullName'
            : 'displayName';
        problems.push(
          MESSAGE_CONCAT_COLUMN_TYPE(
            column.name,
            column.type[named],
            other.type[named],
          ),
        );
      }
    });
  }
  if (problems.length) {
    errors?.push(MESSAGE_INPUT_SCHEMAS_DIFFER, ...problems);
  }
  return !problems.length;
};

/**
 * Gives the rows of its first input, then those of its second, keeping
 * duplicates, in no particular order (spec §7.10, `UNION ALL`). Both must have
 * the same columns, matched by position. The output has the first input's
 * names and types; a column is nullable when either input's is. Its
 * `widenTypes` setting, which converts differing types within a family to
 * the type they share (Q5), is kept and saved; the conversion comes in M4.13,
 * so until then types must match.
 */
export class Concat extends BinaryNode {
  static readonly TYPE = 'concat';

  /** Whether differing types within a family are converted to the type they share (Q5) */
  readonly widenTypes: boolean;

  /** By default, types must match */
  constructor(id: string, widenTypes = false, rest?: JsonObject) {
    super(id, rest);
    if (typeof widenTypes !== 'boolean') {
      throw new Error(`A concat's widenTypes must be true or false`);
    }
    this.widenTypes = widenTypes;
  }

  get type(): string {
    return Concat.TYPE;
  }

  override get portLabels(): readonly string[] {
    return CONCAT_PORT_LABELS;
  }

  /** A new concat with the same id, and this setting */
  withWidenTypes(widenTypes: boolean): Concat {
    return new Concat(this.id, widenTypes, this.rest);
  }

  /** The two inputs' columns match (`validateConcatSchemas`) */
  validate(inputSchemas: readonly Schema[], errors?: string[]): boolean {
    // `ensureSchemas` has checked there is one schema per port
    const [first, second] = ensureSchemas(inputSchemas, this.ports) as [
      Schema,
      Schema,
    ];
    return validateConcatSchemas(first, second, errors);
  }

  /**
   * The first input's names and types, each column nullable when either
   * input's is; `undefined` when the inputs don't match
   */
  override schematize(inputSchemas: readonly Schema[]): Schema | undefined {
    if (!this.validate(inputSchemas)) {
      return undefined;
    }
    const [first, second] = inputSchemas as [Schema, Schema];
    return new Schema(
      first.columns.map(
        (column, index) =>
          new SchemaColumn(
            column.name,
            column.type,
            column.nullable || (second.columns[index]?.nullable ?? false),
          ),
      ),
    );
  }

  describe(): string {
    return `Concatenate additional input${this.widenTypes ? ', converting types' : ''}`;
  }
}
