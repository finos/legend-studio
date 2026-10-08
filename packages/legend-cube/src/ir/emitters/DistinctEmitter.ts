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

import type { Distinct } from '../../nodes/transforms/Distinct.js';
import { getDialectWorkarounds } from '../CubeDialects.js';
import {
  colSpec,
  colSpecArray,
  EmitRole,
  func,
  lambda,
  literal,
  type RelationExpr,
} from '../CubeIR.js';
import { type EmitContext, originOf } from '../EmitContext.js';
import { getTemporaryColumnName } from '../TemporaryColumns.js';

/** The column that pads a distinct on SQL Server, unless the input has one of that name */
export const DISTINCT_PAD_COLUMN = 'cube_d';

/**
 * Emits a distinct as `<input>->distinct()`, over every column: never the
 * column form `distinct(~[…])`, which also projects. On SQL Server, where the
 * engine writes a distinct then a limit as `select top N distinct`, which
 * T-SQL rejects, it is padded so the distinct stays in its own query:
 * `->distinct()->extend(~cube_d: x | 1)->select(~[<input columns>])` (PLAN
 * §11.4).
 */
export const emitDistinct = (
  node: Distinct,
  inputs: readonly RelationExpr[],
  context?: EmitContext,
): RelationExpr => {
  const [input] = inputs;
  if (input === undefined) {
    throw new Error(`Can't emit distinct "${node.id}": it needs one input`);
  }
  const origin = originOf(node.id, EmitRole.DISTINCT);
  const distinct = func('distinct', [input], origin);
  const [inputSchema] = context?.inputSchemas ?? [];
  if (!inputSchema || !getDialectWorkarounds(context?.databaseType).distinct) {
    return distinct;
  }
  const pad = getTemporaryColumnName(DISTINCT_PAD_COLUMN, inputSchema);
  return func(
    'select',
    [
      func(
        'extend',
        [
          distinct,
          colSpec(
            pad,
            lambda(['x'], [literal({ kind: 'integer', value: '1' }, origin)]),
          ),
        ],
        origin,
      ),
      colSpecArray(inputSchema.names().map((column) => colSpec(column))),
    ],
    originOf(node.id, EmitRole.SELECT),
  );
};
