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
  MESSAGE_DOES_NOT_HAVE_A_NAME,
  MESSAGE_DUPLICATE_COLUMNS_BETWEEN_INPUTS,
  MESSAGE_JOIN_COLUMN_COUNTS_DIFFER,
  MESSAGE_JOIN_COLUMNS_INCOMPATIBLE,
  MESSAGE_LEFT_JOIN_COLUMNS_EMPTY,
  MESSAGE_NOT_IN_INPUT_SCHEMA,
  MESSAGE_RIGHT_JOIN_COLUMNS_EMPTY,
} from '../../messages/CubeMessages.js';
import { Schema, SchemaColumn } from '../../schema/Schema.js';
import type { CubeType } from '../../types/CubeType.js';
import {
  areCompatibleTypes,
  getLeastCommonAncestor,
} from '../../types/TypeCompatibility.js';
import { assertUnreachable } from '../../utils/AssertionUtils.js';

export enum JoinType {
  INNER = 'INNER',
  LEFT_OUTER = 'LEFT_OUTER',
  RIGHT_OUTER = 'RIGHT_OUTER',
  FULL_OUTER = 'FULL_OUTER',
}

/** The join types, in the order the editor offers them */
export const JOIN_TYPES: readonly JoinType[] = Object.freeze([
  JoinType.INNER,
  JoinType.LEFT_OUTER,
  JoinType.RIGHT_OUTER,
  JoinType.FULL_OUTER,
]);

export const JOIN_TYPE_LABELS: Readonly<Record<JoinType, string>> =
  Object.freeze({
    [JoinType.INNER]: 'Inner',
    [JoinType.LEFT_OUTER]: 'Left Outer',
    [JoinType.RIGHT_OUTER]: 'Right Outer',
    [JoinType.FULL_OUTER]: 'Full Outer',
  });

export const isJoinType = (value: unknown): value is JoinType =>
  JOIN_TYPES.some((joinType) => joinType === value);

export const JOIN_PORTS: readonly string[] = Object.freeze([
  'leftTds',
  'rightTds',
]);

const LEFT_JOIN_COLUMN = 'Left join column';
const RIGHT_JOIN_COLUMN = 'Right join column';

/** The key columns, paired by position, and the join type */
export interface JoinSettings {
  readonly leftColumns: readonly string[];
  readonly rightColumns: readonly string[];
  readonly joinType: JoinType;
}

// `Array.from` turns holes into `undefined`, which `every` would skip
const isStringArray = (value: unknown): value is readonly string[] =>
  Array.isArray(value) &&
  Array.from(value as unknown[]).every((item) => typeof item === 'string');

/**
 * The names `n` with `leftColumns[i] === rightColumns[i] === n`: the
 * positionally identical keys, each once, in key order. Such a key is one
 * column of the output.
 */
export const getSameNamedJoinKeys = (
  leftColumns: readonly string[],
  rightColumns: readonly string[],
): string[] =>
  Array.from(
    new Set(leftColumns.filter((name, index) => name === rightColumns[index])),
  );

/**
 * The column names, in left schema order, that both inputs have but that are
 * neither a positionally identical key nor one of the `extra` names (which
 * Difference uses for its difference columns). Each one would be two columns
 * of the same name in the output, so a join with any is invalid.
 */
export const getDuplicateJoinColumns = (
  leftSchema: Schema,
  rightSchema: Schema,
  leftColumns: readonly string[],
  rightColumns: readonly string[],
  extra?: readonly string[],
): string[] => {
  const applied = new Set([
    ...(extra ?? []),
    ...getSameNamedJoinKeys(leftColumns, rightColumns),
  ]);
  const rightNames = new Set(rightSchema.names());
  return leftSchema
    .names()
    .filter((name) => rightNames.has(name) && !applied.has(name));
};

/**
 * The type of a FULL OUTER join's merged key, `coalesce(left, right)`: their
 * type when equal, else the most specific type both are, e.g. `String` for
 * `Varchar(15)` and `Varchar(2)`. The types must be compatible.
 */
export const getMergedJoinKeyType = (
  leftType: CubeType,
  rightType: CubeType,
): CubeType => {
  if (leftType.equals(rightType)) {
    return leftType;
  }
  const ancestor = getLeastCommonAncestor(leftType, rightType);
  if (!ancestor) {
    throw new Error(
      `Join key types ${leftType.fullName} and ${rightType.fullName} have no common type`,
    );
  }
  return ancestor;
};

const lookupColumn = (
  schema: Schema,
  name: string,
  side: string,
): SchemaColumn => {
  const column = schema.lookup(name);
  if (!column) {
    throw new Error(`The ${side} input has no join column "${name}"`);
  }
  return column;
};

const asNullable = (column: SchemaColumn): SchemaColumn =>
  column.nullable ? column : new SchemaColumn(column.name, column.type, true);

/**
 * The output columns of a valid join, in the spec's order: the left keys, the
 * right keys, the other left columns in left schema order, then the other
 * right columns in right schema order, each name once.
 *
 * The side a join type keeps unmatched rows of keeps its nullability; the
 * other side's columns become nullable. A positionally identical key is one
 * column, at its left key's position:
 * - INNER and LEFT_OUTER: the left column;
 * - RIGHT_OUTER: the right column, since the left one is NULL for unmatched rows;
 * - FULL_OUTER: `coalesce(left, right)`, of their common type, and nullable if
 *   either key is: a NULL key never matches, so its row comes out unmatched.
 */
export const buildJoinSchemaColumns = (
  leftSchema: Schema,
  rightSchema: Schema,
  leftColumns: readonly string[],
  rightColumns: readonly string[],
  joinType: JoinType,
): SchemaColumn[] => {
  const sameNamedKeys = new Set(
    getSameNamedJoinKeys(leftColumns, rightColumns),
  );
  const leftNullable =
    joinType === JoinType.RIGHT_OUTER || joinType === JoinType.FULL_OUTER;
  const rightNullable =
    joinType === JoinType.LEFT_OUTER || joinType === JoinType.FULL_OUTER;
  const fromLeft = (column: SchemaColumn): SchemaColumn =>
    leftNullable ? asNullable(column) : column;
  const fromRight = (column: SchemaColumn): SchemaColumn =>
    rightNullable ? asNullable(column) : column;
  const mergeKey = (name: string): SchemaColumn => {
    const left = lookupColumn(leftSchema, name, 'left');
    const right = lookupColumn(rightSchema, name, 'right');
    switch (joinType) {
      case JoinType.INNER:
      case JoinType.LEFT_OUTER:
        return left;
      case JoinType.RIGHT_OUTER:
        return right;
      case JoinType.FULL_OUTER:
        return new SchemaColumn(
          name,
          getMergedJoinKeyType(left.type, right.type),
          left.nullable || right.nullable,
        );
      default:
        return assertUnreachable(joinType);
    }
  };

  const output = new Map<string, SchemaColumn>();
  const emitLeft = (name: string): void => {
    if (!output.has(name)) {
      output.set(
        name,
        sameNamedKeys.has(name)
          ? mergeKey(name)
          : fromLeft(lookupColumn(leftSchema, name, 'left')),
      );
    }
  };
  const emitRight = (name: string): void => {
    if (!output.has(name)) {
      output.set(name, fromRight(lookupColumn(rightSchema, name, 'right')));
    }
  };
  leftColumns.forEach(emitLeft);
  rightColumns.forEach(emitRight);
  leftSchema.names().forEach(emitLeft);
  rightSchema.names().forEach(emitRight);
  return Array.from(output.values());
};

/** Both columns must exist; only then are their types compared. A blank name has no name to look up. */
const validateKeyPair = (
  leftSchema: Schema,
  rightSchema: Schema,
  leftName: string,
  rightName: string,
  errors?: string[],
): boolean => {
  const validateColumn = (
    schema: Schema,
    name: string,
    label: string,
  ): boolean =>
    name
      ? validate(
          schema.lookup(name) !== undefined,
          MESSAGE_NOT_IN_INPUT_SCHEMA(label, name),
          errors,
        )
      : validate(false, MESSAGE_DOES_NOT_HAVE_A_NAME(label), errors);
  const leftExists = validateColumn(leftSchema, leftName, LEFT_JOIN_COLUMN);
  const rightExists = validateColumn(rightSchema, rightName, RIGHT_JOIN_COLUMN);
  const leftType = leftSchema.type(leftName);
  const rightType = rightSchema.type(rightName);
  return (
    leftExists &&
    rightExists &&
    validate(
      leftType !== undefined &&
        rightType !== undefined &&
        areCompatibleTypes(leftType, rightType),
      MESSAGE_JOIN_COLUMNS_INCOMPATIBLE(leftName, rightName),
      errors,
    )
  );
};

const validateNoDuplicateColumns = (
  duplicates: readonly string[],
  errors?: string[],
): boolean =>
  validate(
    duplicates.length === 0,
    MESSAGE_DUPLICATE_COLUMNS_BETWEEN_INPUTS(duplicates),
    errors,
  );

/**
 * Joins its right input to its left one on pairs of key columns, matched by
 * position. Key values match when equal, and a NULL key never matches.
 */
export class Join extends BinaryNode {
  static readonly TYPE = 'join';

  readonly leftColumns: readonly string[];
  readonly rightColumns: readonly string[];
  readonly joinType: JoinType;

  /** By default, no key columns yet and a left outer join */
  constructor(id: string, settings: Partial<JoinSettings> = {}) {
    super(id);
    const {
      leftColumns = [],
      rightColumns = [],
      joinType = JoinType.LEFT_OUTER,
    } = settings;
    if (!isStringArray(leftColumns) || !isStringArray(rightColumns)) {
      throw new Error(`Join columns must be lists of column names`);
    }
    if (!isJoinType(joinType)) {
      throw new Error(`Unknown join type "${String(joinType)}"`);
    }
    this.leftColumns = Object.freeze([...leftColumns]);
    this.rightColumns = Object.freeze([...rightColumns]);
    this.joinType = joinType;
  }

  get type(): string {
    return Join.TYPE;
  }

  override get ports(): readonly string[] {
    return JOIN_PORTS;
  }

  /** A new join with the same id, and these settings changed */
  withSettings(changes: Partial<JoinSettings>): Join {
    return new Join(this.id, {
      leftColumns: this.leftColumns,
      rightColumns: this.rightColumns,
      joinType: this.joinType,
      ...changes,
    });
  }

  /** The key columns swap sides with the inputs, so the join stays valid; the join type stays */
  override withSwappedInputs(): Join {
    return this.withSettings({
      leftColumns: this.rightColumns,
      rightColumns: this.leftColumns,
    });
  }

  /**
   * Checks, in order, stopping at the first failing step:
   * 1–2. there are left and right key columns;
   * 3. as many on each side;
   * 4. each pair's columns exist in their inputs and have compatible types,
   *    reported for every pair at once;
   * 5. no other column name is in both inputs.
   */
  validate(inputSchemas: readonly Schema[], errors?: string[]): boolean {
    // `ensureSchemas` has checked there is one schema per port
    const [leftSchema, rightSchema] = ensureSchemas(
      inputSchemas,
      this.ports,
    ) as [Schema, Schema];
    return (
      validate(
        this.leftColumns.length > 0,
        MESSAGE_LEFT_JOIN_COLUMNS_EMPTY,
        errors,
      ) &&
      validate(
        this.rightColumns.length > 0,
        MESSAGE_RIGHT_JOIN_COLUMNS_EMPTY,
        errors,
      ) &&
      validate(
        this.leftColumns.length === this.rightColumns.length,
        MESSAGE_JOIN_COLUMN_COUNTS_DIFFER,
        errors,
      ) &&
      validateAllItems(this.leftColumns, (leftName, index) =>
        validateKeyPair(
          leftSchema,
          rightSchema,
          leftName,
          this.rightColumns[index] ?? '',
          errors,
        ),
      ) &&
      validateNoDuplicateColumns(
        getDuplicateJoinColumns(
          leftSchema,
          rightSchema,
          this.leftColumns,
          this.rightColumns,
        ),
        errors,
      )
    );
  }

  /** The output schema (`buildJoinSchemaColumns`), or `undefined` when the join is invalid */
  schematize(inputSchemas: readonly Schema[]): Schema | undefined {
    if (!this.validate(inputSchemas)) {
      return undefined;
    }
    const [leftSchema, rightSchema] = inputSchemas as [Schema, Schema];
    return new Schema(
      buildJoinSchemaColumns(
        leftSchema,
        rightSchema,
        this.leftColumns,
        this.rightColumns,
        this.joinType,
      ),
    );
  }

  /** Deliberately generic, as in the spec */
  describe(): string {
    return 'Join additional input';
  }
}
