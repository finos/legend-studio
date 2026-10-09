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
} from '../../nodes/transforms/Aggregation.js';
import type { Group } from '../../nodes/transforms/Group.js';
import {
  aggregationColSpec,
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

/** The reduce of a function over the group's values, `$y` (PLAN §8.8, §11.5) */
const reduce = (aggregation: AggregationFunction, origin: Origin): IR => {
  const values = variable('y');
  switch (aggregation) {
    case AggregationFunction.COUNT:
    case AggregationFunction.COUNT_ROWS:
      return func('count', [values], origin);
    case AggregationFunction.DISTINCT_COUNT:
      return func('count', [func('distinct', [values], origin)], origin);
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
      throw new Error(`Can't emit aggregation function "${aggregation}"`);
  }
};

/**
 * `~name: x | $x.<column> : y | $y-><reduce>`, or for Count rows
 * `~name: x | 1 : y | $y->count()`, which counts every row
 */
const emitAggregation = (
  { column, function: fn, name }: ColumnAggregation,
  groupId: string,
  origin: Origin,
): IR => {
  const aggregation = fn as AggregationFunction;
  if (aggregation !== AggregationFunction.COUNT_ROWS && !column) {
    throw new Error(
      `Can't emit aggregation "${name}" of group "${groupId}": it has no column`,
    );
  }
  const value =
    aggregation === AggregationFunction.COUNT_ROWS
      ? literal({ kind: 'integer', value: '1' }, origin)
      : columnAccess('x', column as string, origin);
  return aggregationColSpec(
    name,
    lambda(['x'], [value]),
    lambda(['y'], [reduce(aggregation, origin)]),
  );
};

/**
 * Emits a group as `<input>->groupBy(~[<keys>], ~[<aggregations>])`, the keys
 * in the order listed, or with no key `<input>->aggregate(~[<aggregations>])`
 * (`groupBy(~[], …)` fails on the engine, PLAN §11.5). Averages are written
 * as `average()`: the engine already writes `1.0 *` before an integer's. The
 * emitter checks the columns come out as the node's inferred schema, so a
 * mismatch fails in Cube, not on the engine.
 */
export const emitGroup = (
  node: Group,
  inputs: readonly RelationExpr[],
  context: EmitContext,
): RelationExpr => {
  const [input] = inputs;
  if (input === undefined) {
    throw new Error(`Can't emit group "${node.id}": it needs one input`);
  }
  if (!node.aggregations.length) {
    throw new Error(`Can't emit group "${node.id}": it has no aggregation`);
  }
  const names = [...node.columns, ...node.aggregations.map(({ name }) => name)];
  const expected = context.schema.names();
  if (
    names.length !== expected.length ||
    names.some((name, index) => name !== expected[index])
  ) {
    throw new Error(
      `Group "${node.id}" would produce ${names.join(', ')}, but its schema is ${expected.join(', ')}`,
    );
  }
  const aggregationOrigin = originOf(node.id, EmitRole.AGGREGATION);
  const aggregations = colSpecArray(
    node.aggregations.map((aggregation) =>
      emitAggregation(aggregation, node.id, aggregationOrigin),
    ),
  );
  const origin = originOf(node.id, EmitRole.GROUP);
  return node.columns.length
    ? func(
        'groupBy',
        [
          input,
          colSpecArray(node.columns.map((column) => colSpec(column))),
          aggregations,
        ],
        origin,
      )
    : func('aggregate', [input, aggregations], origin);
};
