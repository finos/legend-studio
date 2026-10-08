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

import type { Query } from '../graph/Query.js';
import type { QueryNode } from '../graph/QueryNode.js';
import type { SortDirection } from '../nodes/transforms/Sort.js';

/**
 * One key of the order a node's rows come in: a column, as named at that
 * point of the query (after any Rename), its direction, and the Sort that
 * declared it, with its position among that Sort's keys
 */
export interface OrderKey {
  readonly column: string;
  readonly direction: SortDirection;
  readonly sortId: string;
  readonly keyIndex: number;
}

/**
 * The order a node's rows come in, most significant key first; empty when
 * nothing orders them, e.g. a table or a join
 */
export type RowOrder = readonly OrderKey[];

/** The order of a node that keeps its only input's rows in order */
export const keepInputOrder = (
  inputOrders: readonly (RowOrder | undefined)[],
): RowOrder | undefined => inputOrders[0];

/**
 * The row order of every node of the query (PLAN §11.4), from its inputs'
 * through `QueryNode.outputOrder`: `undefined` when it can't be known (an
 * Unknown node, or a node fed by one). The emitter writes a sort where an
 * order is used, and the Sort warning reads it, so the two never disagree.
 */
export const computeRowOrders = (
  query: Query,
): ReadonlyMap<string, RowOrder | undefined> => {
  const orders = new Map<string, RowOrder | undefined>();
  // the query is acyclic, but guard the recursion anyway
  const visiting = new Set<string>();
  const visit = (node: QueryNode): RowOrder | undefined => {
    if (orders.has(node.id)) {
      return orders.get(node.id);
    }
    if (visiting.has(node.id)) {
      return undefined;
    }
    visiting.add(node.id);
    const inputOrders = query.getInputIds(node.id).map((inputId) => {
      const input = inputId === undefined ? undefined : query.getNode(inputId);
      return input ? visit(input) : undefined;
    });
    visiting.delete(node.id);
    const order = node.outputOrder(inputOrders);
    orders.set(node.id, order);
    return order;
  };
  query.nodes.forEach(visit);
  return orders;
};
