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

import type { Concat } from '../../nodes/transforms/Concat.js';
import { foldColumnName } from '../../schema/ColumnName.js';
import type { Schema } from '../../schema/Schema.js';
import { isPrimitiveType } from '../../types/CubeType.js';
import {
  colSpec,
  colSpecArray,
  columnAccess,
  EmitRole,
  func,
  genericType,
  lambda,
  type RelationExpr,
} from '../CubeIR.js';
import { type EmitContext, originOf } from '../EmitContext.js';

/** The base name of a converted column, before it takes its own name back */
export const CONCAT_CONVERTED_COLUMN_BASE = 'cube_cast';

const ROW = 'x';

/**
 * An input whose columns have the node's types as they are; else, each
 * column of another type cast to the node's (Convert types, PLAN §11.5, Q5)
 * as `->extend(~[<tmp>: x|$x.<c>->cast(@<T>), …])->select(~[…])`, the
 * temporary columns in the places of theirs, `->rename(~<tmp>, ~<c>)` each.
 * The cast is type-only: the engine writes no SQL cast.
 */
const converted = (
  node: Concat,
  input: RelationExpr,
  inputSchema: Schema,
  schema: Schema,
): RelationExpr => {
  const origin = (role: EmitRole) => originOf(node.id, role);
  // in any case: a database that compares names without case takes
  // `CUBE_CAST` and `cube_cast` for one column
  const taken = new Set(inputSchema.names().map(foldColumnName));
  const temporaryName = (): string => {
    let name = CONCAT_CONVERTED_COLUMN_BASE;
    for (let index = 2; taken.has(foldColumnName(name)); index += 1) {
      name = `${CONCAT_CONVERTED_COLUMN_BASE}${index}`;
    }
    taken.add(foldColumnName(name));
    return name;
  };
  const casts = inputSchema.columns.flatMap((column, index) => {
    const type = schema.columns[index]?.type;
    return type && !column.type.equals(type)
      ? [{ name: column.name, type, temporary: temporaryName() }]
      : [];
  });
  if (!casts.length) {
    return input;
  }
  const extended = func(
    'extend',
    [
      input,
      colSpecArray(
        casts.map(({ name, type, temporary }) =>
          colSpec(
            temporary,
            lambda(
              [ROW],
              [
                func(
                  'cast',
                  [
                    columnAccess(ROW, name, origin(EmitRole.CONVERT)),
                    genericType(
                      type.path,
                      isPrimitiveType(type) ? type.params : [],
                    ),
                  ],
                  origin(EmitRole.CAST),
                ),
              ],
            ),
          ),
        ),
      ),
    ],
    origin(EmitRole.CONVERT),
  );
  const temporaries = new Map(
    casts.map(({ name, temporary }) => [name, temporary]),
  );
  return casts.reduce(
    (relation, { name, temporary }) =>
      func(
        'rename',
        [relation, colSpec(temporary), colSpec(name)],
        origin(EmitRole.RENAME),
      ),
    func(
      'select',
      [
        extended,
        colSpecArray(
          inputSchema
            .names()
            .map((name) => colSpec(temporaries.get(name) ?? name)),
        ),
      ],
      origin(EmitRole.SELECT),
    ),
  );
};

/**
 * Emits a concat as `<first>->concatenate(<second>)` (PLAN §8.8, §11.5),
 * which the engine writes as `UNION ALL`. The engine types a concatenate of
 * different column counts as the shorter relation and fails only when it
 * runs, so the emitter checks both inputs have the node's columns, by name and
 * in order: a mismatch fails in Cube, not on the engine. Converting types,
 * each column whose type differs from the node's is cast to it first.
 */
export const emitConcat = (
  node: Concat,
  inputs: readonly RelationExpr[],
  context: EmitContext,
): RelationExpr => {
  const [first, second] = inputs;
  if (inputs.length !== 2 || first === undefined || second === undefined) {
    throw new Error(`Can't emit concat "${node.id}": it needs two inputs`);
  }
  const [firstSchema, secondSchema] = context.inputSchemas;
  if (
    context.inputSchemas.length !== 2 ||
    firstSchema === undefined ||
    secondSchema === undefined
  ) {
    throw new Error(
      `Can't emit concat "${node.id}": it needs two input schemas`,
    );
  }
  const expected = context.schema.names();
  context.inputSchemas.forEach((schema, index) => {
    const names = schema.names();
    if (
      names.length !== expected.length ||
      names.some((name, position) => name !== expected[position])
    ) {
      throw new Error(
        `Concat "${node.id}" input ${index + 1} has ${names.join(', ')}, but its schema is ${expected.join(', ')}`,
      );
    }
  });
  return func(
    'concatenate',
    [
      converted(node, first, firstSchema, context.schema),
      converted(node, second, secondSchema, context.schema),
    ],
    originOf(node.id, EmitRole.CONCAT),
  );
};
