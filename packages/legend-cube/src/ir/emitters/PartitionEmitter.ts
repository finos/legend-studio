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

import {
  AggregationFunction,
  type ColumnAggregation,
  isWindowRankFunction,
  WindowRankFunction,
} from '../../nodes/transforms/Aggregation.js';
import type { Partition } from '../../nodes/transforms/Partition.js';
import { SortDirection } from '../../nodes/transforms/Sort.js';
import {
  aggregationColSpec,
  collection,
  colSpec,
  colSpecArray,
  columnAccess,
  EmitRole,
  func,
  type IR,
  lambda,
  literal,
  type Origin,
  type RelationExpr,
  variable,
} from '../CubeIR.js';
import { type EmitContext, originOf } from '../EmitContext.js';

/**
 * How a window's values reduce, `$y` (PLAN §8.8, §11.6): the counts are
 * `size()`, since `count()` loses its OVER clause on the engine and fails
 */
const reduce = (aggregation: AggregationFunction, origin: Origin): IR => {
  const values = variable('y');
  switch (aggregation) {
    case AggregationFunction.COUNT:
    case AggregationFunction.COUNT_ROWS:
      return func('size', [values], origin);
    case AggregationFunction.DISTINCT_COUNT:
      return func('size', [func('distinct', [values], origin)], origin);
    case AggregationFunction.DISTINCT_VALUE:
      return func('uniqueValueOnly', [values], origin);
    case AggregationFunction.SUM:
      return func('sum', [values], origin);
    case AggregationFunction.AVERAGE:
      return func('average', [values], origin);
    case AggregationFunction.MIN:
      return func('min', [values], origin);
    case AggregationFunction.MAX:
      return func('max', [values], origin);
    default:
      throw new Error(`Can't emit window function "${aggregation}"`);
  }
};

/** A rank function's number for a row, `$p->rank($w, $r)`, `denseRank` the same, `$p->rowNumber($r)` */
const rank = (fn: WindowRankFunction, origin: Origin): IR => {
  const [p, w, r] = [variable('p'), variable('w'), variable('r')];
  switch (fn) {
    case WindowRankFunction.RANK:
      return func('rank', [p, w, r], origin);
    case WindowRankFunction.DENSE_RANK:
      return func('denseRank', [p, w, r], origin);
    case WindowRankFunction.ROW_NUMBER:
      return func('rowNumber', [p, r], origin);
    default:
      throw new Error(`Can't emit window function "${String(fn)}"`);
  }
};

/**
 * `~name: {p, w, r | $r.<column>} : y | $y-><reduce>`, or for Count rows
 * `~name: {p, w, r | 1} : y | $y->size()`, which counts every row; a rank
 * function `~name: {p, w, r | <rank>}`
 */
const emitWindowFunction = (
  { column, function: fn, name }: ColumnAggregation,
  partitionId: string,
  origin: Origin,
): IR => {
  if (isWindowRankFunction(fn)) {
    return colSpec(name, lambda(['p', 'w', 'r'], [rank(fn, origin)]));
  }
  const aggregation = fn as AggregationFunction;
  if (aggregation !== AggregationFunction.COUNT_ROWS && !column) {
    throw new Error(
      `Can't emit window function "${name}" of partition "${partitionId}": it has no column`,
    );
  }
  const value =
    aggregation === AggregationFunction.COUNT_ROWS
      ? literal({ kind: 'integer', value: '1' }, origin)
      : columnAccess('r', column as string, origin);
  return aggregationColSpec(
    name,
    lambda(['p', 'w', 'r'], [value]),
    lambda(['y'], [reduce(aggregation, origin)]),
  );
};

/**
 * The window: `over(~[<partition columns>], [<sort keys>])`, without either
 * list when it is empty, and `over([])` with neither; never an empty column
 * list (an NPE on the engine) or an empty sort list beside columns
 */
const emitOver = (node: Partition, origin: Origin): IR => {
  const sorts = collection(
    node.sorts.map(({ column, direction }) =>
      func(
        direction === SortDirection.DESC ? 'descending' : 'ascending',
        [colSpec(column)],
        origin,
      ),
    ),
  );
  if (!node.columns.length) {
    return func('over', [sorts], origin);
  }
  const columns = colSpecArray(node.columns.map((column) => colSpec(column)));
  return func('over', node.sorts.length ? [columns, sorts] : [columns], origin);
};

/**
 * Emits a partition (PLAN §8.8, §11.6) as
 * `<input>->extend(<over>, ~[<aggregates>])->extend(<over>, ~[<ranks>])`, in
 * the array form (the engine runs a later filter before a single-form
 * window) and in two extends (one holding both fails on the engine), each
 * left out when it has nothing; then, when the window functions are listed in
 * another order, a `select` of every column in the schema's order. No frame
 * is written: SQL's default (D5). The emitter checks the columns come out as
 * the node's inferred schema, so a mismatch fails in Cube, not on the engine.
 */
export const emitPartition = (
  node: Partition,
  inputs: readonly RelationExpr[],
  context: EmitContext,
): RelationExpr => {
  const [input] = inputs;
  const [inputSchema] = context.inputSchemas;
  if (input === undefined || inputSchema === undefined) {
    throw new Error(`Can't emit partition "${node.id}": it needs one input`);
  }
  if (!node.aggregations.length) {
    throw new Error(
      `Can't emit partition "${node.id}": it has no window function`,
    );
  }
  const expected = context.schema.names();
  const names = [
    ...inputSchema.names(),
    ...node.aggregations.map(({ name }) => name),
  ];
  if (
    names.length !== expected.length ||
    names.some((name, index) => name !== expected[index])
  ) {
    throw new Error(
      `Partition "${node.id}" would produce ${names.join(', ')}, but its schema is ${expected.join(', ')}`,
    );
  }
  const origin = originOf(node.id, EmitRole.WINDOW);
  const functionOrigin = originOf(node.id, EmitRole.AGGREGATION);
  const aggregates = node.aggregations.filter(
    ({ function: fn }) => !isWindowRankFunction(fn),
  );
  const ranks = node.aggregations.filter(({ function: fn }) =>
    isWindowRankFunction(fn),
  );
  const extended = [aggregates, ranks]
    .filter((functions) => functions.length)
    .reduce(
      (relation, functions) =>
        func(
          'extend',
          [
            relation,
            emitOver(node, origin),
            colSpecArray(
              functions.map((aggregation) =>
                emitWindowFunction(aggregation, node.id, functionOrigin),
              ),
            ),
          ],
          origin,
        ),
      input,
    );
  const emitted = [
    ...inputSchema.names(),
    ...[...aggregates, ...ranks].map(({ name }) => name),
  ];
  return emitted.every((name, index) => name === expected[index])
    ? extended
    : func(
        'select',
        [extended, colSpecArray(expected.map((name) => colSpec(name)))],
        originOf(node.id, EmitRole.SELECT),
      );
};
