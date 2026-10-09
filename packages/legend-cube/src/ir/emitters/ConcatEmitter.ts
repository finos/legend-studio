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
import { EmitRole, func, type RelationExpr } from '../CubeIR.js';
import { type EmitContext, originOf } from '../EmitContext.js';

/**
 * Emits a concat as `<first>->concatenate(<second>)` (PLAN §8.8, §11.5),
 * which the engine writes as `UNION ALL`. The engine types a concatenate of
 * different column counts as the shorter relation and fails only when it
 * runs, so the emitter checks both inputs have the node's columns, by name and
 * in order: a mismatch fails in Cube, not on the engine.
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
  if (context.inputSchemas.length !== 2) {
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
    [first, second],
    originOf(node.id, EmitRole.CONCAT),
  );
};
