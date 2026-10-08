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

import type { Rename } from '../../nodes/transforms/Rename.js';
import {
  colSpec,
  EmitRole,
  func,
  type IR,
  type RelationExpr,
} from '../CubeIR.js';
import { type EmitContext, originOf } from '../EmitContext.js';

/**
 * Emits a rename as one `->rename(~old, ~'new')` per mapping, chained in
 * mapping order: the engine's array form fails (PLAN §8.8). No mapping names
 * another's column, so the order doesn't matter. Names travel as JSON
 * strings, so any valid name needs no quoting. The emitter checks the names
 * come out as the node's inferred schema, so a mismatch fails in Cube, not on
 * the engine.
 */
export const emitRename = (
  node: Rename,
  inputs: readonly RelationExpr[],
  context: EmitContext,
): RelationExpr => {
  const [input] = inputs;
  const [inputSchema] = context.inputSchemas;
  if (input === undefined || inputSchema === undefined) {
    throw new Error(`Can't emit rename "${node.id}": it needs one input`);
  }
  const renamed = inputSchema
    .names()
    .map((name) => node.mappings.find(({ from }) => from === name)?.to ?? name);
  const expected = context.schema.names();
  if (
    !node.mappings.length ||
    renamed.length !== expected.length ||
    renamed.some((name, index) => name !== expected[index])
  ) {
    throw new Error(
      `Rename "${node.id}" would produce ${renamed.join(', ')}, but its schema is ${expected.join(', ')}`,
    );
  }
  const origin = originOf(node.id, EmitRole.RENAME);
  return node.mappings.reduce<IR>(
    (relation, { from, to }) =>
      func('rename', [relation, colSpec(from), colSpec(to)], origin),
    input,
  );
};
