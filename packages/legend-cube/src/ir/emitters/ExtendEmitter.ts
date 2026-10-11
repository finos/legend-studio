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

import type { Extend } from '../../nodes/transforms/Extend.js';
import {
  colSpec,
  colSpecArray,
  EmitRole,
  func,
  type IR,
  lambdaJson,
  type RelationExpr,
} from '../CubeIR.js';
import { type EmitContext, originOf } from '../EmitContext.js';

/**
 * Emits an Extend as one `->extend(~[<name>: <lambda>])` per column, in listed
 * order, so a column can use the ones before it: one extend can't see its own
 * columns ✅ (PLAN §11.7 Q3). Each lambda is the engine's JSON, marked with the
 * Extend, so an engine error inside it lands on the node.
 *
 * The extend must be valid for its input schema.
 */
export const emitExtend = (
  node: Extend,
  inputs: readonly RelationExpr[],
  context: EmitContext,
): RelationExpr => {
  const [input] = inputs;
  if (!input) {
    throw new Error(`Extend "${node.id}" needs an input to be emitted`);
  }
  const names = node.columns.map(({ name }) => name);
  const expected = context.schema.names().slice(-names.length);
  if (names.some((name, index) => name !== expected[index])) {
    throw new Error(
      `Extend "${node.id}" would add ${names.join(', ')}, but its schema ends with ${expected.join(', ')}`,
    );
  }
  return node.columns.reduce<IR>((relation, { name, lambda }) => {
    if (!lambda) {
      throw new Error(`Extend "${node.id}" has no expression for "${name}"`);
    }
    return func(
      'extend',
      [
        relation,
        colSpecArray([
          colSpec(
            name,
            lambdaJson(lambda, originOf(node.id, EmitRole.EXPRESSION)),
          ),
        ]),
      ],
      originOf(node.id, EmitRole.EXTEND),
    );
  }, input);
};
