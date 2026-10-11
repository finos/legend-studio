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
import {
  ensureSchemas,
  validate,
  validateAllItems,
} from '../../inference/ValidationUtils.js';
import {
  MESSAGE_ALREADY_IN_INPUT_SCHEMA,
  MESSAGE_ALREADY_IN_OUTPUT_SCHEMA,
  MESSAGE_CANNOT_BE_EMPTY,
  MESSAGE_CANNOT_HAVE_DUPLICATES,
  MESSAGE_DIFFERENCE_COLUMN_IS_JOIN_COLUMN,
  MESSAGE_DIFFERENCE_COLUMN_NOT_NUMERIC,
  MESSAGE_DIFFERENCE_COLUMN_TYPE_DIFFERS,
  MESSAGE_DIFFERENCE_OUTPUT_NAME_INVALID,
  MESSAGE_DOES_NOT_HAVE_A_NAME,
  MESSAGE_NOT_IN_INPUT_SCHEMA,
} from '../../messages/CubeMessages.js';
import { foldColumnName, isValidColumnName } from '../../schema/ColumnName.js';
import { Schema, SchemaColumn } from '../../schema/Schema.js';
import { type CubeType, PrimitiveType } from '../../types/CubeType.js';
import { PRIMITIVE_TYPE_PATH } from '../../types/PrimitiveTypeRegistry.js';
import { isNumericFamily, TypeFamily } from '../../types/TypeFamily.js';
import { isStringList } from '../../utils/AssertionUtils.js';
import type { JsonObject } from '../../utils/Json.js';
import {
  buildJoinSchemaColumns,
  getDuplicateJoinColumns,
  JoinType,
  validateJoinKeys,
  validateNoDuplicateColumns,
} from './Join.js';

const LEFT_DIFFERENCE_COLUMN = 'Left difference column';
const RIGHT_DIFFERENCE_COLUMN = 'Right difference column';
const DIFFERENCE_OUTPUT_COLUMN = 'Difference output column';

/** The suffixes of a difference column's three outputs, in output order (spec §7.12) */
export enum DifferenceSuffix {
  LEFT = '_1',
  RIGHT = '_2',
  DIFFERENCE = '_valueDifference',
}

export const DIFFERENCE_SUFFIXES: readonly DifferenceSuffix[] = Object.freeze([
  DifferenceSuffix.LEFT,
  DifferenceSuffix.RIGHT,
  DifferenceSuffix.DIFFERENCE,
]);

/** The key columns, paired by position, and the numeric columns to compare */
export interface DifferenceSettings {
  readonly leftColumns: readonly string[];
  readonly rightColumns: readonly string[];
  readonly differenceColumns: readonly string[];
}

/**
 * The output names the difference columns give, suffix by suffix (spec
 * §7.12): with `[a, b]`, `a_1, b_1, a_2, b_2, a_valueDifference,
 * b_valueDifference`, not grouped per column
 */
export const getDifferenceOutputNames = (
  differenceColumns: readonly string[],
): string[] =>
  DIFFERENCE_SUFFIXES.flatMap((suffix) =>
    differenceColumns.map((name) => `${name}${suffix}`),
  );

/**
 * The type of `coalesce(x_1, 0) - coalesce(x_2, 0)` as the engine types it
 * (PLAN §11.7 Q5): Integer for the integer family, Float for the float family
 * (the zero written `0.0`), Number for decimals and Number itself ✅;
 * `undefined` for a type that isn't numeric
 */
export const getDifferenceResultType = (
  type: CubeType,
): PrimitiveType | undefined => {
  switch (type.family) {
    case TypeFamily.INTEGER:
      return PrimitiveType.get(PRIMITIVE_TYPE_PATH.INTEGER);
    case TypeFamily.FLOAT:
      return PrimitiveType.get(PRIMITIVE_TYPE_PATH.FLOAT);
    case TypeFamily.DECIMAL:
    case TypeFamily.NUMBER:
      return PrimitiveType.get(PRIMITIVE_TYPE_PATH.NUMBER);
    default:
      return undefined;
  }
};

const asNullable = (column: SchemaColumn, name: string): SchemaColumn =>
  new SchemaColumn(name, column.type, true);

/**
 * Compares numeric columns of two inputs, spec §7.12's "Compare Column
 * Values": the inputs are joined on pairs of key columns, keeping every row of
 * both (a full outer join), and each difference column `x` gives `x_1` (the
 * left value), `x_2` (the right value), each of its input's type and empty for
 * a row only the other input has, and `x_valueDifference`, `x_1 - x_2` with
 * an empty value counting as 0. The other columns are a join's.
 */
export class Difference extends BinaryNode {
  static readonly TYPE = 'difference';

  readonly leftColumns: readonly string[];
  readonly rightColumns: readonly string[];
  readonly differenceColumns: readonly string[];

  /** By default, no key columns and no difference columns yet */
  constructor(
    id: string,
    settings: Partial<DifferenceSettings> = {},
    rest?: JsonObject,
  ) {
    super(id, rest);
    const {
      leftColumns = [],
      rightColumns = [],
      differenceColumns = [],
    } = settings;
    if (!isStringList(leftColumns) || !isStringList(rightColumns)) {
      throw new Error(`Difference join columns must be lists of column names`);
    }
    if (!isStringList(differenceColumns)) {
      throw new Error(`Difference columns must be a list of column names`);
    }
    this.leftColumns = Object.freeze([...leftColumns]);
    this.rightColumns = Object.freeze([...rightColumns]);
    this.differenceColumns = Object.freeze([...differenceColumns]);
  }

  get type(): string {
    return Difference.TYPE;
  }

  /** A new difference with the same id, and these settings changed */
  withSettings(changes: Partial<DifferenceSettings>): Difference {
    return new Difference(
      this.id,
      {
        leftColumns: this.leftColumns,
        rightColumns: this.rightColumns,
        differenceColumns: this.differenceColumns,
        ...changes,
      },
      this.rest,
    );
  }

  /** The key columns swap sides with the inputs, so the difference stays valid; `x_1` is then the other input's */
  override withSwappedInputs(): Difference {
    return this.withSettings({
      leftColumns: this.rightColumns,
      rightColumns: this.leftColumns,
    });
  }

  /**
   * Checks, in order, stopping at the first failing step:
   * 1–4. the key columns, as a join's (`validateJoinKeys`);
   * 5–6. there are difference columns, none twice;
   * 7. each is named, not a key, in both inputs, of the same type in both
   *    and numeric, reported for every column at once;
   * 8. no other column name is in both inputs;
   * 9. each output name is valid and no other column's, compared as
   *    databases that ignore case compare them.
   */
  validate(inputSchemas: readonly Schema[], errors?: string[]): boolean {
    // `ensureSchemas` has checked there is one schema per port
    const [leftSchema, rightSchema] = ensureSchemas(
      inputSchemas,
      this.ports,
    ) as [Schema, Schema];
    return (
      validateJoinKeys(
        leftSchema,
        rightSchema,
        this.leftColumns,
        this.rightColumns,
        errors,
      ) &&
      validate(
        this.differenceColumns.length > 0,
        MESSAGE_CANNOT_BE_EMPTY('Difference columns'),
        errors,
      ) &&
      validate(
        new Set(this.differenceColumns).size === this.differenceColumns.length,
        MESSAGE_CANNOT_HAVE_DUPLICATES('Difference columns'),
        errors,
      ) &&
      validateAllItems(this.differenceColumns, (name) =>
        this.validateDifferenceColumn(name, leftSchema, rightSchema, errors),
      ) &&
      validateNoDuplicateColumns(
        getDuplicateJoinColumns(
          leftSchema,
          rightSchema,
          this.leftColumns,
          this.rightColumns,
          this.differenceColumns,
        ),
        errors,
      ) &&
      this.validateOutputNames(leftSchema, rightSchema, errors)
    );
  }

  private validateDifferenceColumn(
    name: string,
    leftSchema: Schema,
    rightSchema: Schema,
    errors?: string[],
  ): boolean {
    if (
      !validate(
        name !== '',
        MESSAGE_DOES_NOT_HAVE_A_NAME('Difference column'),
        errors,
      )
    ) {
      return false;
    }
    if (
      !validate(
        !this.leftColumns.includes(name) && !this.rightColumns.includes(name),
        MESSAGE_DIFFERENCE_COLUMN_IS_JOIN_COLUMN(name),
        errors,
      )
    ) {
      return false;
    }
    const leftType = leftSchema.type(name);
    const rightType = rightSchema.type(name);
    const inLeft = validate(
      leftType !== undefined,
      MESSAGE_NOT_IN_INPUT_SCHEMA(LEFT_DIFFERENCE_COLUMN, name),
      errors,
    );
    const inRight = validate(
      rightType !== undefined,
      MESSAGE_NOT_IN_INPUT_SCHEMA(RIGHT_DIFFERENCE_COLUMN, name),
      errors,
    );
    return (
      inLeft &&
      inRight &&
      leftType !== undefined &&
      rightType !== undefined &&
      validate(
        leftType.equals(rightType),
        MESSAGE_DIFFERENCE_COLUMN_TYPE_DIFFERS(name),
        errors,
      ) &&
      validate(
        isNumericFamily(leftType.family),
        MESSAGE_DIFFERENCE_COLUMN_NOT_NUMERIC(name),
        errors,
      )
    );
  }

  /** Every output name the difference columns give, each checked against the inputs' names and those before it */
  private validateOutputNames(
    leftSchema: Schema,
    rightSchema: Schema,
    errors?: string[],
  ): boolean {
    const inputNames = new Set(
      [...leftSchema.names(), ...rightSchema.names()].map(foldColumnName),
    );
    const outputNames = new Set<string>();
    return validateAllItems(
      getDifferenceOutputNames(this.differenceColumns),
      (name) => {
        const folded = foldColumnName(name);
        const valid =
          validate(
            isValidColumnName(name),
            MESSAGE_DIFFERENCE_OUTPUT_NAME_INVALID(name),
            errors,
          ) &&
          validate(
            !inputNames.has(folded),
            MESSAGE_ALREADY_IN_INPUT_SCHEMA(DIFFERENCE_OUTPUT_COLUMN, name),
            errors,
          ) &&
          validate(
            !outputNames.has(folded),
            MESSAGE_ALREADY_IN_OUTPUT_SCHEMA(DIFFERENCE_OUTPUT_COLUMN, name),
            errors,
          );
        outputNames.add(folded);
        return valid;
      },
    );
  }

  /**
   * A full outer join's columns without the difference columns
   * (`buildJoinSchemaColumns`), then, suffix by suffix, `x_1` (the left
   * type), `x_2` (the right type), both nullable, and `x_valueDifference`
   * (`getDifferenceResultType`), never empty; `undefined` when invalid
   */
  schematize(inputSchemas: readonly Schema[]): Schema | undefined {
    if (!this.validate(inputSchemas)) {
      return undefined;
    }
    const [leftSchema, rightSchema] = inputSchemas as [Schema, Schema];
    const differenceColumns = new Set(this.differenceColumns);
    const lookup = (schema: Schema, name: string): SchemaColumn => {
      const column = schema.lookup(name);
      if (!column) {
        throw new Error(
          `Difference "${this.id}" has no difference column "${name}"`,
        );
      }
      return column;
    };
    return new Schema([
      ...buildJoinSchemaColumns(
        leftSchema,
        rightSchema,
        this.leftColumns,
        this.rightColumns,
        JoinType.FULL_OUTER,
      ).filter((column) => !differenceColumns.has(column.name)),
      ...this.differenceColumns.map((name) =>
        asNullable(lookup(leftSchema, name), `${name}${DifferenceSuffix.LEFT}`),
      ),
      ...this.differenceColumns.map((name) =>
        asNullable(
          lookup(rightSchema, name),
          `${name}${DifferenceSuffix.RIGHT}`,
        ),
      ),
      ...this.differenceColumns.map((name) => {
        const type = getDifferenceResultType(lookup(leftSchema, name).type);
        if (!type) {
          throw new Error(
            `Difference "${this.id}" can't type its difference of "${name}"`,
          );
        }
        return new SchemaColumn(
          `${name}${DifferenceSuffix.DIFFERENCE}`,
          type,
          false,
        );
      }),
    ]);
  }

  describe(): string {
    return 'Compare Column Values';
  }
}
