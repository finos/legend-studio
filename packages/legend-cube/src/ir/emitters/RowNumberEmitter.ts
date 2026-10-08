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

import type { QueryNode } from '../../graph/QueryNode.js';
import { isSortableType } from '../../types/TypeCompatibility.js';
import {
  collection,
  colSpec,
  colSpecArray,
  columnAccess,
  EmitRole,
  func,
  type IR,
  lambda,
  literal,
  type RelationExpr,
  variable,
} from '../CubeIR.js';
import { type EmitContext, originOf } from '../EmitContext.js';
import { getTemporaryColumnName } from '../TemporaryColumns.js';
import { emitSortKeys } from './SortEmitter.js';

/** The column the row numbers go in, unless the input has one of that name */
export const ROW_NUMBER_COLUMN = 'cube_rn';

/** An integer literal of a row bound, stamped as part of the range */
export const rowBound = (node: QueryNode, value: number): IR =>
  literal(
    { kind: 'integer', value: String(value) },
    originOf(node.id, EmitRole.ROW_RANGE),
  );

/**
 * Takes rows by their numbers, for a database whose engine plan can't take
 * them right (PLAN §11.4): `<input>->extend([<keys>]->over(), ~[cube_rn: {p, w, r |
 * $p->rowNumber($r)}])->filter({row | <range>})->select(~[<input columns>])`.
 * The rows are numbered from 1 in the input's order, else by the first input
 * column that sorts, ascending; `range` gets the row number to compare. No
 * sort is written before it: in a derived table, SQL Server rejects one. It
 * gives `undefined` when no column sorts, for the native form.
 */
export const emitRowNumberRange = (
  node: QueryNode,
  input: RelationExpr,
  context: EmitContext,
  range: (rowNumber: IR) => IR,
): RelationExpr | undefined => {
  const [inputSchema] = context.inputSchemas;
  if (!inputSchema) {
    return undefined;
  }
  const numbering = originOf(node.id, EmitRole.ROW_NUMBER);
  const filtering = originOf(node.id, EmitRole.ROW_RANGE);
  const order = context.inputOrder ?? [];
  const firstSortable = inputSchema.columns.find((column) =>
    isSortableType(column.type),
  );
  const keys = order.length
    ? emitSortKeys(order, inputSchema)
    : firstSortable
      ? [func('ascending', [colSpec(firstSortable.name)], numbering)]
      : [];
  if (!keys.length) {
    return undefined;
  }
  const name = getTemporaryColumnName(ROW_NUMBER_COLUMN, inputSchema);
  const numbered = func(
    'extend',
    [
      input,
      func('over', [collection(keys)], numbering),
      colSpecArray([
        colSpec(
          name,
          lambda(
            ['p', 'w', 'r'],
            [func('rowNumber', [variable('p'), variable('r')], numbering)],
          ),
        ),
      ]),
    ],
    numbering,
  );
  const inRange = func(
    'filter',
    [numbered, lambda(['row'], [range(columnAccess('row', name, filtering))])],
    filtering,
  );
  return func(
    'select',
    [
      inRange,
      colSpecArray(inputSchema.names().map((column) => colSpec(column))),
    ],
    originOf(node.id, EmitRole.SELECT),
  );
};
