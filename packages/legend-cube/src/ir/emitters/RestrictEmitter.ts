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

import type { Restrict } from '../../nodes/transforms/Restrict.js';
import {
  colSpec,
  colSpecArray,
  EmitRole,
  func,
  type RelationExpr,
} from '../CubeIR.js';
import { type EmitContext, originOf } from '../EmitContext.js';

/**
 * Emits a restrict as `<input>->select(~[…])`, listing the node's inferred
 * columns, which are in the input's order: `select` keeps the order it is
 * given (PLAN §8.8). The emitter checks they are a subsequence of the input,
 * so a mismatch fails in Cube, not on the engine.
 */
export const emitRestrict = (
  node: Restrict,
  inputs: readonly RelationExpr[],
  context: EmitContext,
): RelationExpr => {
  const [input] = inputs;
  const [inputSchema] = context.inputSchemas;
  if (input === undefined || inputSchema === undefined) {
    throw new Error(`Can't emit restrict "${node.id}": it needs one input`);
  }
  const names = context.schema.names();
  const inputNames = inputSchema.names();
  let next = 0;
  const inOrder = names.every((name) => {
    const at = inputNames.indexOf(name, next);
    next = at + 1;
    return at >= 0;
  });
  if (!inOrder || !names.length) {
    throw new Error(
      `Restrict "${node.id}" would select ${names.join(', ')}, but its input is ${inputNames.join(', ')}`,
    );
  }
  return func(
    'select',
    [input, colSpecArray(names.map((name) => colSpec(name)))],
    originOf(node.id, EmitRole.SELECT),
  );
};
