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

import type { Limit } from '../../nodes/transforms/Limit.js';
import { isPositiveWholeNumber } from '../../nodes/transforms/RowSettings.js';
import { EmitRole, func, literal, type RelationExpr } from '../CubeIR.js';
import { originOf } from '../EmitContext.js';

/**
 * Emits a limit as `<input>->limit(<size>)`. The size is written as plain
 * digits: the serializer would also accept a number token such as `1e3`.
 */
export const emitLimit = (
  node: Limit,
  inputs: readonly RelationExpr[],
): RelationExpr => {
  const [input] = inputs;
  const { size } = node;
  if (
    input === undefined ||
    size === undefined ||
    !isPositiveWholeNumber(size)
  ) {
    throw new Error(
      `Can't emit limit "${node.id}": it needs one input and a positive whole size`,
    );
  }
  const origin = originOf(node.id, EmitRole.TAKE);
  return func(
    'limit',
    [input, literal({ kind: 'integer', value: String(size) }, origin)],
    origin,
  );
};
