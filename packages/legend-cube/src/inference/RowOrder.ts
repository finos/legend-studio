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
import { Sort, type SortDirection } from '../nodes/transforms/Sort.js';

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

/**
 * How a Sort's order is lost before it is used: the node that loses it, and,
 * when only some of its columns are lost, those columns as the Sort names
 * them, in its order
 */
export interface SortOrderLoss {
  readonly nodeId: string;
  readonly droppedColumns?: readonly string[];
}

/**
 * The Sorts whose order is lost before it is used (PLAN §11.4), by Sort id,
 * from the query's structure alone: the selection plays no part. Each Sort's
 * order is followed down its chain to the first node that takes rows by it
 * (a Limit, Drop or Slice) or to the chain's end, where it orders the output.
 *
 * - A full loss: no key of the Sort is left there. It names the first node
 *   whose rows hold none, e.g. a Join, a Restrict that drops every key, or a
 *   later Sort on all the same columns.
 * - A partial loss: some keys are left, but a node that is not a Sort (a
 *   Restrict) removed others first. It names that node and those columns.
 *
 * A later Sort on some of the same columns is no loss: the others still break
 * its ties. Where the order becomes unknown (an Unknown node), nothing is
 * reported, nor for a Sort without a named key, whose own error shows.
 */
export const findLostSortOrders = (
  query: Query,
  rowOrders: ReadonlyMap<string, RowOrder | undefined> = computeRowOrders(
    query,
  ),
): ReadonlyMap<string, SortOrderLoss> => {
  const losses = new Map<string, SortOrderLoss>();
  query.nodes.forEach((sort) => {
    if (!(sort instanceof Sort)) {
      return;
    }
    // the Sort's own named keys, by their place among its keys
    const keysOf = (order: RowOrder): Set<number> =>
      new Set(
        order
          .filter(({ sortId, column }) => sortId === sort.id && column !== '')
          .map(({ keyIndex }) => keyIndex),
      );
    const start = rowOrders.get(sort.id);
    let held = start && keysOf(start);
    if (!held?.size) {
      return;
    }
    let dropper: string | undefined;
    const dropped = new Set<number>();
    let node: QueryNode = sort;
    for (;;) {
      const target = query.getOutputConnection(node.id)?.target;
      const next = target === undefined ? undefined : query.getNode(target);
      // the chain's end orders the output, and a Limit, Drop or Slice its rows
      if (!next || next.consumesInputOrder) {
        break;
      }
      const order = rowOrders.get(next.id);
      if (!order) {
        return;
      }
      const after = keysOf(order);
      if (!after.size) {
        losses.set(sort.id, { nodeId: next.id });
        return;
      }
      // a later Sort on the same column replaces the key: no loss
      if (!(next instanceof Sort)) {
        for (const keyIndex of held) {
          if (!after.has(keyIndex)) {
            dropper ??= next.id;
            dropped.add(keyIndex);
          }
        }
      }
      held = after;
      node = next;
    }
    if (dropper !== undefined) {
      losses.set(sort.id, {
        nodeId: dropper,
        droppedColumns: sort.sorts
          .filter((_, keyIndex) => dropped.has(keyIndex))
          .map(({ column }) => column),
      });
    }
  });
  return losses;
};
