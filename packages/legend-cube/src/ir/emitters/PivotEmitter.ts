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

import type { Pivot } from '../../nodes/transforms/Pivot.js';
import type { SchemaColumn } from '../../schema/Schema.js';
import { isPrimitiveType } from '../../types/CubeType.js';
import {
  getLiteralText,
  type LiteralValue,
} from '../../values/LiteralValue.js';
import {
  colSpec,
  colSpecArray,
  collection,
  EmitRole,
  func,
  genericType,
  literal,
  type RelationExpr,
  relationType,
} from '../CubeIR.js';
import { type EmitContext, originOf } from '../EmitContext.js';
import { emitAggregation } from './GroupEmitter.js';

/** The name of a Pivot's aggregation, which only the engine's names for its columns carry */
export const PIVOT_AGGREGATION_NAME = 'cube_pivot';

/**
 * The engine's name for a value's column after a static pivot: the value's
 * text, then `__|__` and the aggregation's name, in single quotes, which are
 * part of the name (`'2000__|__cube_pivot'`, PLAN §11.12)
 */
export const getEnginePivotColumnName = (value: LiteralValue): string =>
  `'${getLiteralText(value)}__|__${PIVOT_AGGREGATION_NAME}'`;

/** A column's type as a `cast` names it: its path, and a primitive's parameters (`Varchar(15)`) */
const typeOf = (column: SchemaColumn): ReturnType<typeof genericType> =>
  genericType(
    column.type.path,
    isPrimitiveType(column.type) ? column.type.params : [],
  );

/**
 * Emits a Pivot (PLAN §11.12) as
 * `<input>->select(~[<rows>, <column>, <aggregated>])->pivot(~<column>, [<values>], ~cube_pivot: x|… : y|…)->cast(@Relation<(…)>)->rename(…)…`:
 * the `select` keeps the row columns only, since every column the pivot
 * doesn't consume makes rows; the static pivot makes one column per value,
 * typed `Relation<Any>`, so the `cast` names each as the node's schema types
 * it; then each is renamed to its column name. The emitter checks the columns
 * come out as the node's inferred schema, so a mismatch fails in Cube.
 */
export const emitPivot = (
  node: Pivot,
  inputs: readonly RelationExpr[],
  context: EmitContext,
): RelationExpr => {
  const [input] = inputs;
  if (input === undefined) {
    throw new Error(`Can't emit pivot "${node.id}": it needs one input`);
  }
  const { rows, column, values, aggregation } = node;
  const names = node.columnNames;
  const expected = context.schema.names();
  const produced = [...rows, ...names];
  if (
    produced.length !== expected.length ||
    produced.some((name, index) => name !== expected[index])
  ) {
    throw new Error(
      `Pivot "${node.id}" would produce ${produced.join(', ')}, but its schema is ${expected.join(', ')}`,
    );
  }
  const origin = (role: EmitRole): ReturnType<typeof originOf> =>
    originOf(node.id, role);
  const selected = func(
    'select',
    [
      input,
      colSpecArray(
        [
          ...rows,
          column,
          ...(aggregation.column ? [aggregation.column] : []),
        ].map((name) => colSpec(name)),
      ),
    ],
    origin(EmitRole.SELECT),
  );
  const pivoted = func(
    'pivot',
    [
      selected,
      colSpec(column),
      collection(values.map((value) => literal(value, origin(EmitRole.VALUE)))),
      emitAggregation(
        { ...aggregation, name: PIVOT_AGGREGATION_NAME },
        node.id,
        origin(EmitRole.AGGREGATION),
      ),
    ],
    origin(EmitRole.PIVOT),
  );
  const { columns } = context.schema;
  const cast = func(
    'cast',
    [
      pivoted,
      relationType(
        columns.map((output, index) => {
          const value = values[index - rows.length];
          return {
            name:
              value === undefined
                ? output.name
                : getEnginePivotColumnName(value),
            type: typeOf(output),
          };
        }),
      ),
    ],
    origin(EmitRole.CAST),
  );
  return values.reduce<RelationExpr>(
    (relation, value, index) =>
      func(
        'rename',
        [
          relation,
          colSpec(getEnginePivotColumnName(value)),
          colSpec(names[index] as string),
        ],
        origin(EmitRole.RENAME),
      ),
    cast,
  );
};
