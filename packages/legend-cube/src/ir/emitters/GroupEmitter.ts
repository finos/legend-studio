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

/**
 * The setting of a function as its literal: Percentile's fraction a Float
 * (`percentile(1)` doesn't type on the engine), Join Text's separator a
 * String; it throws on one validation refuses (PLAN §11.28)
 */
const settingLiteral = (
  { function: fn, percentile, separator, name }: ColumnAggregation,
  origin: Origin,
): IR => {
  if (fn === AggregationFunction.PERCENTILE) {
    if (
      percentile === undefined ||
      !Number.isFinite(percentile) ||
      percentile < 0 ||
      percentile > 1
    ) {
      throw new Error(
        `Can't emit aggregation "${name}": its percentile isn't from 0 to 1`,
      );
    }
    return literal({ kind: 'float', value: String(percentile) }, origin);
  }
  if (separator === undefined || separator.includes('\\')) {
    throw new Error(
      `Can't emit aggregation "${name}": it has no separator, or one with a backslash`,
    );
  }
  return literal({ kind: 'string', value: separator }, origin);
};

/**
 * The reduce of a function over the group's values, `$y` (PLAN §8.8, §11.5,
 * §11.28): Std Dev and Variance the sample ones
 */
const reduce = (aggregation: ColumnAggregation, origin: Origin): IR => {
  const values = variable('y');
  switch (aggregation.function) {
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
    case AggregationFunction.MEDIAN:
      return func('median', [values], origin);
    case AggregationFunction.PERCENTILE:
      return func(
        'percentile',
        [values, settingLiteral(aggregation, origin)],
        origin,
      );
    case AggregationFunction.STD_DEV:
      return func('stdDevSample', [values], origin);
    case AggregationFunction.VARIANCE:
      return func('varianceSample', [values], origin);
    case AggregationFunction.JOIN_TEXT:
      return func(
        'joinStrings',
        [values, settingLiteral(aggregation, origin)],
        origin,
      );
    default:
      throw new Error(
        `Can't emit aggregation function "${aggregation.function}"`,
      );
  }
};

/**
 * `~name: x | $x.<column> : y | $y-><reduce>`, or for Count rows
 * `~name: x | 1 : y | $y->count()`, which counts every row
 */
export const emitAggregation = (
  aggregation: ColumnAggregation,
  groupId: string,
  origin: Origin,
): IR => {
  const { column, function: fn, name } = aggregation;
  if (fn !== AggregationFunction.COUNT_ROWS && !column) {
    throw new Error(
      `Can't emit aggregation "${name}" of group "${groupId}": it has no column`,
    );
  }
  const value =
    fn === AggregationFunction.COUNT_ROWS
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
