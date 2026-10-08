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
import { getDialectWorkarounds } from '../CubeDialects.js';
import { EmitRole, func, literal, type RelationExpr } from '../CubeIR.js';
import { type EmitContext, originOf } from '../EmitContext.js';
import { emitRowNumberRange, rowBound } from './RowNumberEmitter.js';
import { emitSortedInput } from './SortEmitter.js';

/**
 * Emits a limit as `<input>->limit(<size>)`, the input sorted first by its
 * order when the context gives one (`emitSortedInput`). On a database whose
 * engine plan numbers a limit's rows by the first sort key only (Sybase IQ),
 * a limit after a Sort on several columns goes through row numbers
 * (`emitRowNumberRange`), keeping those up to the size. The size is written
 * as plain digits: the serializer would also accept a number token such as
 * `1e3`.
 */
export const emitLimit = (
  node: Limit,
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
      `Can't emit limit "${node.id}": it needs one input and a positive whole size`,
    );
  }
  const fallback =
    context &&
    (context.inputOrder?.length ?? 0) > 1 &&
    getDialectWorkarounds(context.databaseType).limit
      ? emitRowNumberRange(node, input, context, (rowNumber) =>
          func(
            'lessThanEqual',
            [rowNumber, rowBound(node, size)],
            originOf(node.id, EmitRole.ROW_RANGE),
          ),
        )
      : undefined;
  if (fallback) {
    return fallback;
  }
  const origin = originOf(node.id, EmitRole.TAKE);
  return func(
    'limit',
    [
      emitSortedInput(node, input, context),
      literal({ kind: 'integer', value: String(size) }, origin),
    ],
    origin,
  );
};
