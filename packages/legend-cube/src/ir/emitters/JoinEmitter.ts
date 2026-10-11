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

import {
  buildJoinSchemaColumns,
  getMergedJoinKeyType,
  getSameNamedJoinKeys,
  type Join,
  type JoinSettings,
  JoinType,
} from '../../nodes/transforms/Join.js';
import { foldColumnName } from '../../schema/ColumnName.js';
import type { Schema, SchemaColumn } from '../../schema/Schema.js';
import { isPrimitiveType } from '../../types/CubeType.js';
import {
  colSpec,
  colSpecArray,
  columnAccess,
  EmitRole,
  enumValue,
  func,
  genericType,
  type IR,
  lambda,
  type RelationExpr,
} from '../CubeIR.js';
import { type EmitContext, originOf } from '../EmitContext.js';

export const JOIN_KIND_PATH = 'meta::pure::functions::relation::JoinKind';

/** The engine's join kind for each join type */
export const JOIN_KINDS: Readonly<Record<JoinType, string>> = Object.freeze({
  [JoinType.INNER]: 'INNER',
  [JoinType.LEFT_OUTER]: 'LEFT',
  [JoinType.RIGHT_OUTER]: 'RIGHT',
  [JoinType.FULL_OUTER]: 'FULL',
});

/** The suffixes of the temporary names a same-named key gets on each side */
export const LEFT_KEY_SUFFIX = '__cube_l';
export const RIGHT_KEY_SUFFIX = '__cube_r';

/** The variables of the join condition and of the FULL merge */
const LEFT = 'l';
const RIGHT = 'r';
const ROW = 'x';

const lookup = (schema: Schema, name: string, side: string): SchemaColumn => {
  const column = schema.lookup(name);
  if (!column) {
    throw new Error(`The ${side} input of the join has no column "${name}"`);
  }
  return column;
};

/**
 * Emits a join's relation, before its last `select` (PLAN §8.4). The engine
 * rejects any column name both inputs have, so each positionally identical
 * key is renamed to a temporary name on the side whose value is not kept
 * (both sides for a FULL join, which then merges them with `coalesce`). The
 * condition compares each pair of keys, with `toOne()` on the left key when
 * both keys are nullable, so NULL keys never match. The parts carry the
 * node's id: a Join's, or a Difference's, which joins its inputs this way.
 *
 * The keys must be valid for the input schemas.
 */
export const emitJoinRelation = (
  nodeId: string,
  node: JoinSettings,
  [leftInput, rightInput]: readonly [RelationExpr, RelationExpr],
  [leftSchema, rightSchema]: readonly [Schema, Schema],
): IR => {
  const origin = (role: EmitRole): ReturnType<typeof originOf> =>
    originOf(nodeId, role);
  const { joinType } = node;
  const sameNamedKeys = getSameNamedJoinKeys(
    node.leftColumns,
    node.rightColumns,
  );

  // 1–2. rename the same-named keys on the side(s) whose value is not kept
  const renameLeft =
    joinType === JoinType.RIGHT_OUTER || joinType === JoinType.FULL_OUTER;
  const renameRight = joinType !== JoinType.RIGHT_OUTER;
  // in any case: a database that compares names without case takes
  // `ID__CUBE_R` and `ID__cube_r` for one column
  const taken = new Set(
    [...leftSchema.names(), ...rightSchema.names()].map(foldColumnName),
  );
  const temporaryName = (name: string, suffix: string): string => {
    let candidate = `${name}${suffix}`;
    for (let index = 2; taken.has(foldColumnName(candidate)); index += 1) {
      candidate = `${name}${suffix}${index}`;
    }
    taken.add(foldColumnName(candidate));
    return candidate;
  };
  const leftNames = new Map<string, string>();
  const rightNames = new Map<string, string>();
  let left = leftInput;
  let right = rightInput;
  sameNamedKeys.forEach((name) => {
    if (renameLeft) {
      const temporary = temporaryName(name, LEFT_KEY_SUFFIX);
      leftNames.set(name, temporary);
      left = func(
        'rename',
        [left, colSpec(name), colSpec(temporary)],
        origin(EmitRole.RENAME),
      );
    }
    if (renameRight) {
      const temporary = temporaryName(name, RIGHT_KEY_SUFFIX);
      rightNames.set(name, temporary);
      right = func(
        'rename',
        [right, colSpec(name), colSpec(temporary)],
        origin(EmitRole.RENAME),
      );
    }
  });
  const leftName = (name: string): string => leftNames.get(name) ?? name;
  const rightName = (name: string): string => rightNames.get(name) ?? name;
  const renamedRight = new Set(rightSchema.names().map(rightName));
  const shared = leftSchema
    .names()
    .map(leftName)
    .filter((name) => renamedRight.has(name));
  if (shared.length) {
    throw new Error(
      `Join "${nodeId}" would give the engine two columns named ${shared.map((name) => `"${name}"`).join(', ')}`,
    );
  }

  // 3. the condition: each pair of keys equal, left folded with `and`
  const comparisons = node.leftColumns.map((leftKey, index) => {
    const rightKey = node.rightColumns[index];
    if (rightKey === undefined) {
      throw new Error(`Join "${nodeId}" has more left keys than right keys`);
    }
    const bothNullable =
      lookup(leftSchema, leftKey, 'left').nullable &&
      lookup(rightSchema, rightKey, 'right').nullable;
    const leftAccess = columnAccess(
      LEFT,
      leftName(leftKey),
      origin(EmitRole.KEY),
    );
    return func(
      'equal',
      [
        bothNullable
          ? func('toOne', [leftAccess], origin(EmitRole.TO_ONE))
          : leftAccess,
        columnAccess(RIGHT, rightName(rightKey), origin(EmitRole.KEY)),
      ],
      origin(EmitRole.CONDITION),
    );
  });
  const [first, ...others] = comparisons;
  if (!first) {
    throw new Error(`Join "${nodeId}" has no key columns`);
  }
  const condition = others.reduce(
    (folded, comparison) =>
      func('and', [folded, comparison], origin(EmitRole.CONDITION)),
    first,
  );

  // 4. the join
  let joined: IR = func(
    'join',
    [
      left,
      right,
      enumValue(JOIN_KIND_PATH, JOIN_KINDS[joinType], origin(EmitRole.JOIN)),
      lambda([LEFT, RIGHT], [condition]),
    ],
    origin(EmitRole.JOIN),
  );

  // 5. FULL: each same-named key is the first non-NULL of its two copies,
  // cast to their common type when they differ
  if (joinType === JoinType.FULL_OUTER && sameNamedKeys.length) {
    const merges = sameNamedKeys.map((name) => {
      const leftType = lookup(leftSchema, name, 'left').type;
      const rightType = lookup(rightSchema, name, 'right').type;
      let merged = func(
        'coalesce',
        [
          columnAccess(ROW, leftName(name), origin(EmitRole.MERGE_KEY)),
          columnAccess(ROW, rightName(name), origin(EmitRole.MERGE_KEY)),
        ],
        origin(EmitRole.COALESCE),
      );
      if (!leftType.equals(rightType)) {
        const type = getMergedJoinKeyType(leftType, rightType);
        merged = func(
          'cast',
          [
            merged,
            genericType(type.path, isPrimitiveType(type) ? type.params : []),
          ],
          origin(EmitRole.CAST),
        );
      }
      return colSpec(name, lambda([ROW], [merged]));
    });
    joined = func(
      'extend',
      [joined, colSpecArray(merges)],
      origin(EmitRole.MERGE),
    );
  }

  return joined;
};

/**
 * Emits a join as the engine needs it (`emitJoinRelation`), then a `select`
 * that gives the columns their order and drops the temporary ones.
 *
 * The join must be valid for its input schemas.
 */
export const emitJoin = (
  node: Join,
  inputs: readonly RelationExpr[],
  context: EmitContext,
): RelationExpr => {
  const [leftInput, rightInput] = inputs;
  const [leftSchema, rightSchema] = context.inputSchemas;
  if (!leftInput || !rightInput || !leftSchema || !rightSchema) {
    throw new Error(`Join "${node.id}" needs two inputs to be emitted`);
  }
  const joined = emitJoinRelation(
    node.id,
    node,
    [leftInput, rightInput],
    [leftSchema, rightSchema],
  );

  // 6. the output columns, in order
  const names = buildJoinSchemaColumns(
    leftSchema,
    rightSchema,
    node.leftColumns,
    node.rightColumns,
    node.joinType,
  ).map((column) => column.name);
  const expected = context.schema.names();
  if (
    names.length !== expected.length ||
    names.some((name, index) => name !== expected[index])
  ) {
    throw new Error(
      `Join "${node.id}" would select ${names.join(', ')}, but its schema is ${expected.join(', ')}`,
    );
  }
  return func(
    'select',
    [joined, colSpecArray(names.map((name) => colSpec(name)))],
    originOf(node.id, EmitRole.SELECT),
  );
};
