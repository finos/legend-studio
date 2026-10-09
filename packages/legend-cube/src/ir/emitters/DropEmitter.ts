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

import type { Drop } from '../../nodes/transforms/Drop.js';
import { isPositiveWholeNumber } from '../../nodes/transforms/RowSettings.js';
import { EmitRole, func, literal, type RelationExpr } from '../CubeIR.js';
import { getDialectWorkarounds } from '../CubeDialects.js';
import { type EmitContext, originOf } from '../EmitContext.js';
import { emitRowNumberRange, rowBound } from './RowNumberEmitter.js';
import { emitSortedInput } from './SortEmitter.js';

/**
 * Emits a drop as `<input>->drop(<size>)`, the native form, the input sorted
 * first by its order when the context gives one (`emitSortedInput`); on a
 * database that can't skip rows, through row numbers (`emitRowNumberRange`),
 * keeping those after the size. The size is
 * written as plain digits: the serializer would also accept a number token
 * such as `1e3`.
 */
export const emitDrop = (
  node: Drop,
  inputs: readonly RelationExpr[],
  context?: EmitContext,
): RelationExpr => {
  const [input] = inputs;
  const { size } = node;
  if (
    input === undefined ||
    size === undefined ||
    !isPositiveWholeNumber(size)
  ) {
    throw new Error(
      `Can't emit drop "${node.id}": it needs one input and a positive whole size`,
    );
  }
  // a database that rejects `limit m,-1` keeps the rows numbered after `size`
  const fallback =
    context && getDialectWorkarounds(context.databaseType).drop
      ? emitRowNumberRange(node, input, context, (rowNumber) =>
          func(
            'greaterThan',
            [rowNumber, rowBound(node, size)],
            originOf(node.id, EmitRole.ROW_RANGE),
          ),
        )
      : undefined;
  if (fallback) {
    return fallback;
  }
  const origin = originOf(node.id, EmitRole.DROP);
  return func(
    'drop',
    [
      emitSortedInput(node, input, context),
      literal({ kind: 'integer', value: String(size) }, origin),
    ],
    origin,
  );
};
