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
  type Difference,
  DifferenceSuffix,
} from '../../nodes/transforms/Difference.js';
import { JoinType } from '../../nodes/transforms/Join.js';
import { Schema, SchemaColumn } from '../../schema/Schema.js';
import type { CubeType } from '../../types/CubeType.js';
import { TypeFamily } from '../../types/TypeFamily.js';
import {
  collection,
  colSpec,
  colSpecArray,
  columnAccess,
  EmitRole,
  func,
  type IR,
  lambda,
  literal,
  type Origin,
  type RelationExpr,
} from '../CubeIR.js';
import { type EmitContext, originOf } from '../EmitContext.js';
import { emitJoinRelation } from './JoinEmitter.js';

/** The variable of the differences' extend */
const ROW = 'x';

/**
 * The 0 an empty value counts as: `0.0` for the float family, so the
 * difference is Float, else `0`, so it is Integer for integers and Number for
 * decimals (PLAN §11.7 Q5 ✅)
 */
const zeroOf = (type: CubeType, origin: Origin): IR =>
  literal(
    type.family === TypeFamily.FLOAT
      ? { kind: 'float', value: '0.0' }
      : { kind: 'integer', value: '0' },
    origin,
  );

/** The schema with each difference column renamed with the suffix */
const withSuffix = (
  schema: Schema,
  differenceColumns: ReadonlySet<string>,
  suffix: DifferenceSuffix,
): Schema =>
  new Schema(
    schema.columns.map((column) =>
      differenceColumns.has(column.name)
        ? new SchemaColumn(
            `${column.name}${suffix}`,
            column.type,
            column.nullable,
          )
        : column,
    ),
  );

/**
 * Emits a Difference, which the engine has no relation function for, as a
 * full outer join (PLAN §8.8, §11.7):
 * 1. each input renames its difference columns `x` to `x_1` or `x_2`;
 * 2. the inputs are joined on the keys as a FULL join is (`emitJoinRelation`);
 * 3. one extend gives each `x_valueDifference: x | $x.x_1->coalesce(0) -
 *    $x.x_2->coalesce(0)`, so an empty value counts as 0;
 * 4. a `select` gives the columns the schema's order and drops the temporary
 *    keys.
 *
 * The difference must be valid for its input schemas.
 */
export const emitDifference = (
  node: Difference,
  inputs: readonly RelationExpr[],
  context: EmitContext,
): RelationExpr => {
  const [leftInput, rightInput] = inputs;
  const [leftSchema, rightSchema] = context.inputSchemas;
  if (!leftInput || !rightInput || !leftSchema || !rightSchema) {
    throw new Error(`Difference "${node.id}" needs two inputs to be emitted`);
  }
  const origin = (role: EmitRole): Origin => originOf(node.id, role);
  const differenceColumns = new Set(node.differenceColumns);

  // 1. x to x_1 on the left, to x_2 on the right
  const renamed = (input: IR, suffix: DifferenceSuffix): IR =>
    node.differenceColumns.reduce(
      (relation, name) =>
        func(
          'rename',
          [relation, colSpec(name), colSpec(`${name}${suffix}`)],
          origin(EmitRole.RENAME),
        ),
      input,
    );

  // 2. the full outer join
  const joined = emitJoinRelation(
    node.id,
    {
      leftColumns: node.leftColumns,
      rightColumns: node.rightColumns,
      joinType: JoinType.FULL_OUTER,
    },
    [
      renamed(leftInput, DifferenceSuffix.LEFT),
      renamed(rightInput, DifferenceSuffix.RIGHT),
    ],
    [
      withSuffix(leftSchema, differenceColumns, DifferenceSuffix.LEFT),
      withSuffix(rightSchema, differenceColumns, DifferenceSuffix.RIGHT),
    ],
  );

  // 3. the differences
  const differences = node.differenceColumns.map((name) => {
    const type = leftSchema.type(name);
    if (!type) {
      throw new Error(
        `Difference "${node.id}" has no difference column "${name}"`,
      );
    }
    const valueOf = (suffix: DifferenceSuffix): IR =>
      func(
        'coalesce',
        [
          columnAccess(ROW, `${name}${suffix}`, origin(EmitRole.DIFFERENCE)),
          zeroOf(type, origin(EmitRole.DIFFERENCE)),
        ],
        origin(EmitRole.DIFFERENCE),
      );
    return colSpec(
      `${name}${DifferenceSuffix.DIFFERENCE}`,
      lambda(
        [ROW],
        [
          func(
            'minus',
            [
              collection([
                valueOf(DifferenceSuffix.LEFT),
                valueOf(DifferenceSuffix.RIGHT),
              ]),
            ],
            origin(EmitRole.DIFFERENCE),
          ),
        ],
      ),
    );
  });
  const extended = func(
    'extend',
    [joined, colSpecArray(differences)],
    origin(EmitRole.DIFFERENCE),
  );

  // 4. the output columns, in order
  return func(
    'select',
    [
      extended,
      colSpecArray(context.schema.names().map((name) => colSpec(name))),
    ],
    origin(EmitRole.SELECT),
  );
};
