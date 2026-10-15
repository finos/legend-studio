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

import type { Explode } from '../../nodes/transforms/Explode.js';
import { PRIMITIVE_TYPE_PATH } from '../../types/PrimitiveTypeRegistry.js';
import {
  colSpec,
  columnAccess,
  EmitRole,
  func,
  genericType,
  type IR,
  lambda,
  literal,
  type RelationExpr,
} from '../CubeIR.js';
import { getDatabaseProblemOfType } from '../CubeDialects.js';
import { type EmitContext, originOf } from '../EmitContext.js';

/** The lateral's row */
const ROW = 'x';

/**
 * Emits an Explode Array (PLAN §11.20) as
 * `<input>->lateral(x | $x.<column>->get('<key>')…->toMany(@Variant)->flatten(~<name>))`:
 * one row per element, the input's columns kept, and a row whose array is
 * empty or missing kept once with an empty element, on every database that
 * runs it (each writes an outer form). The emitter refuses a database that
 * can't, as the editor does once it knows the database, and checks the
 * columns come out as the node's inferred schema.
 */
export const emitExplode = (
  node: Explode,
  inputs: readonly RelationExpr[],
  context: EmitContext,
): RelationExpr => {
  const [input] = inputs;
  const [inputSchema] = context.inputSchemas;
  if (input === undefined || inputSchema === undefined) {
    throw new Error(`Can't emit explode "${node.id}": it needs one input`);
  }
  const problem = getDatabaseProblemOfType(node.type, context.databaseType);
  if (problem !== undefined) {
    throw new Error(problem);
  }
  const produced = [...inputSchema.names(), node.name];
  const expected = context.schema.names();
  if (
    produced.length !== expected.length ||
    produced.some((name, index) => name !== expected[index])
  ) {
    throw new Error(
      `Explode "${node.id}" would produce ${produced.join(', ')}, but its schema is ${expected.join(', ')}`,
    );
  }
  const origin = originOf(node.id, EmitRole.EXPLODE);
  const array = node.path.reduce<IR>(
    (value, key) =>
      func(
        'get',
        [value, literal({ kind: 'string', value: key }, origin)],
        origin,
      ),
    columnAccess(ROW, node.column, origin),
  );
  return func(
    'lateral',
    [
      input,
      lambda(
        [ROW],
        [
          func(
            'flatten',
            [
              func(
                'toMany',
                [array, genericType(PRIMITIVE_TYPE_PATH.VARIANT)],
                origin,
              ),
              colSpec(node.name),
            ],
            origin,
          ),
        ],
      ),
    ],
    origin,
  );
};
