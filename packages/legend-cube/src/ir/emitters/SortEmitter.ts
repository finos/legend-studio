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
import type { RowOrder } from '../../inference/RowOrder.js';
import { type Sort, SortDirection } from '../../nodes/transforms/Sort.js';
import type { Schema } from '../../schema/Schema.js';
import {
  collection,
  colSpec,
  EmitRole,
  func,
  type IR,
  type Origin,
  type RelationExpr,
} from '../CubeIR.js';
import { type EmitContext, originOf } from '../EmitContext.js';

/**
 * A Sort emits nothing where it stands (PLAN §11.4): its input, as it is.
 * Its keys are written where the order is used, by `emitSortedInput` and
 * before the run's own row limit.
 */
export const emitSort = (
  node: Sort,
  inputs: readonly RelationExpr[],
): RelationExpr => {
  const [input] = inputs;
  if (input === undefined) {
    throw new Error(`Can't emit sort "${node.id}": it needs one input`);
  }
  return input;
};

/**
 * The keys of an order, each `~column->ascending()` or `~column->descending()`
 * stamped with the Sort that declared it, most significant first. Every key's
 * column must be in the schema, so a mismatch fails in Cube, not on the
 * engine.
 */
export const emitSortKeys = (order: RowOrder, schema: Schema): IR[] => {
  const missing = order.filter(({ column }) => !schema.lookup(column));
  if (!order.length || missing.length) {
    throw new Error(
      `Can't sort by ${order.map(({ column }) => column).join(', ') || 'no column'}: the rows have ${schema.names().join(', ')}`,
    );
  }
  return order.map(({ column, direction, sortId }) =>
    func(
      direction === SortDirection.DESC ? 'descending' : 'ascending',
      [colSpec(column)],
      originOf(sortId, EmitRole.SORT_KEY),
    ),
  );
};

/** `<input>->sort(<keys>)` (`emitSortKeys`): one key as is, several as a list */
export const emitRowOrder = (
  input: RelationExpr,
  order: RowOrder,
  schema: Schema,
  origin: Origin,
): RelationExpr => {
  const keys = emitSortKeys(order, schema);
  return func(
    'sort',
    [input, keys.length === 1 ? (keys[0] as IR) : collection(keys)],
    origin,
  );
};

/**
 * The input of a node that takes rows by their order (a Limit, Drop or
 * Slice), sorted by that order just before the node when the context gives
 * one; else the input as it is
 */
export const emitSortedInput = (
  node: QueryNode,
  input: RelationExpr,
  context: EmitContext | undefined,
): RelationExpr => {
  const order = context?.inputOrder;
  const [inputSchema] = context?.inputSchemas ?? [];
  return order?.length && inputSchema
    ? emitRowOrder(input, order, inputSchema, originOf(node.id, EmitRole.SORT))
    : input;
};
