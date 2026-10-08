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

import { isRowIndex } from '../../nodes/transforms/RowSettings.js';
import type { Slice } from '../../nodes/transforms/Slice.js';
import { EmitRole, func, literal, type RelationExpr } from '../CubeIR.js';
import { getDialectWorkarounds } from '../CubeDialects.js';
import { type EmitContext, originOf } from '../EmitContext.js';
import { emitRowNumberRange, rowBound } from './RowNumberEmitter.js';
import { emitSortedInput } from './SortEmitter.js';

/**
 * Emits a slice as `<input>->slice(<start>, <stop>)`, the native form, whose
 * range is the node's: rows from `start` up to `stop`, counting from 0. The
 * input is sorted first by its order when the context gives one
 * (`emitSortedInput`); on a database that can't skip rows, it goes through row
 * numbers (`emitRowNumberRange`). The bounds are written as plain digits.
 */
export const emitSlice = (
  node: Slice,
  inputs: readonly RelationExpr[],
  context?: EmitContext,
): RelationExpr => {
  const [input] = inputs;
  const { start, stop } = node;
  if (
    input === undefined ||
    start === undefined ||
    stop === undefined ||
    !isRowIndex(start) ||
    !isRowIndex(stop) ||
    start >= stop
  ) {
    throw new Error(
      `Can't emit slice "${node.id}": it needs one input and whole bounds, the start before the stop`,
    );
  }
  // a database that rejects `limit m,n` keeps the rows numbered (start, stop]:
  // row numbers count from 1, the range from 0
  const range = originOf(node.id, EmitRole.ROW_RANGE);
  const fallback =
    context && getDialectWorkarounds(context.databaseType).slice
      ? emitRowNumberRange(node, input, context, (rowNumber) =>
          func(
            'and',
            [
              func('greaterThan', [rowNumber, rowBound(node, start)], range),
              func('lessThanEqual', [rowNumber, rowBound(node, stop)], range),
            ],
            range,
          ),
        )
      : undefined;
  if (fallback) {
    return fallback;
  }
  const origin = originOf(node.id, EmitRole.SLICE);
  return func(
    'slice',
    [
      emitSortedInput(node, input, context),
      literal({ kind: 'integer', value: String(start) }, origin),
      literal({ kind: 'integer', value: String(stop) }, origin),
    ],
    origin,
  );
};
