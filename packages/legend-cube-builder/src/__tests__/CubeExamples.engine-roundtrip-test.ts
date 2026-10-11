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

import { beforeEach, describe, expect, test } from '@jest/globals';
import {
  AggregationFunction,
  buildSchemasAndValidity,
  createNodeRegistry,
  Group,
  Query,
  QueryEmitter,
  RelationalTableSource,
  Schema,
} from '@finos/legend-cube';
import { CUBE_ENGINE_TEST__compile } from '../__test-utils__/CubeEngineTestSupport.js';
import {
  TEST__emittableNodes,
  TEST__typingDifferences,
} from '../__test-utils__/CubeOperationsTestUtils.js';
import { V1_createEngineBackedCubeEngine } from '../graph-manager/protocol/pure/v1/__test-utils__/V1_CubeEngineTestUtils.js';
import type { V1_LegendCubeEngine } from '../graph-manager/protocol/pure/v1/V1_LegendCubeEngine.js';
import { CUBE_EXAMPLES, type CubeExample } from '../stores/CubeExamples.js';
import { CUBE_SPORTS_MODEL } from '../stores/fixtures/CubeSportsModel.js';
import { CUBE_TRADES_MODEL } from '../stores/fixtures/CubeTradesModel.js';

// The example cubes (PLAN §6.9) are real cubes: the sample models compile and
// load their rows, and each example, typed as it opens, has every node valid,
// typed on the engine as Cube infers it, and rows to show

let engine: V1_LegendCubeEngine;

beforeEach(() => {
  ({ engine } = V1_createEngineBackedCubeEngine());
});

/** The example's cube with its tables typed by the engine, as opening it does */
const openExample = async (example: CubeExample) => {
  const document = example.createDocument();
  const model = document.context?.model;
  const runtime = document.context?.runtime;
  if (!model || !runtime) {
    throw new Error(`Example ${example.id} has no model or runtime`);
  }
  const sources = document.query.nodes.filter(
    (node): node is RelationalTableSource =>
      node instanceof RelationalTableSource,
  );
  const typed = await engine.resolveSchemas(
    model,
    new Map(
      sources.map((source) => [
        source.id,
        [source.database, source.schema, source.table] as const,
      ]),
    ),
  );
  const query = new Query(
    document.query.nodes.map((node) => {
      if (!(node instanceof RelationalTableSource)) {
        return node;
      }
      const schema = typed.get(node.id);
      if (!(schema instanceof Schema)) {
        throw schema ?? new Error(`No schema for ${node.id}`);
      }
      return node.withResolution({ kind: 'resolved', schema });
    }),
    document.query.connections,
    document.query.selected,
  );
  return { model, runtime, query };
};

/**
 * The Sum and Average outputs of the query's groups, which the engine types
 * as never null though a group of empty values gives none (PLAN §5.7): Cube
 * says nullable, there and downstream
 */
const sumsAndAverages = (query: Query): string[] =>
  query.nodes.flatMap((node) =>
    node instanceof Group
      ? node.aggregations
          .filter(
            (aggregation) =>
              aggregation.function === AggregationFunction.SUM ||
              aggregation.function === AggregationFunction.AVERAGE,
          )
          .map((aggregation) => aggregation.name)
      : [],
  );

/** The rows each example shows */
const ROW_COUNTS = new Map([
  // the ten customers with most orders
  ['northwind-top-customers', 10],
  // Northwind's eight categories
  ['northwind-stock-by-category', 8],
  // the ten sports
  ['sports-top-watched', 10],
  // the desks' nine pairs of desk and asset class
  ['trades-notional-by-desk', 9],
  // the six desks, each ranked within its region
  ['trades-desk-league', 6],
  ['trades-largest-buys', 20],
]);

describe('Example cubes, on the engine', () => {
  test('Compiles the sample models', async () => {
    expect(await CUBE_ENGINE_TEST__compile(CUBE_SPORTS_MODEL)).toHaveProperty(
      'message',
      'OK',
    );
    expect(await CUBE_ENGINE_TEST__compile(CUBE_TRADES_MODEL)).toHaveProperty(
      'message',
      'OK',
    );
  });

  test.each(CUBE_EXAMPLES.map((example) => [example.id, example] as const))(
    'Opens %s with every node valid and typed as Cube infers it, and runs it',
    async (id, example) => {
      const { model, runtime, query } = await openExample(example);
      const { schemas, validity } = buildSchemasAndValidity(
        query,
        createNodeRegistry().queryRules,
      );
      expect([...validity].filter(([, errors]) => errors.length)).toEqual([]);

      const targets = TEST__emittableNodes(id, query);
      expect(targets.map(({ nodeId }) => nodeId)).toEqual(
        query.nodes.map((node) => node.id),
      );
      const engineSchemas = await engine.typeLambdas(
        model,
        new Map(
          targets.map(({ key, nodeId }) => [
            key,
            new QueryEmitter(query).emitTypingLambda(nodeId),
          ]),
        ),
      );
      expect(
        targets.flatMap(({ key, nodeId }) =>
          TEST__typingDifferences(
            key,
            schemas.get(nodeId),
            engineSchemas.get(key),
            { widerNullable: sumsAndAverages(query) },
          ),
        ),
      ).toEqual([]);

      const result = await engine.execute(
        model,
        new QueryEmitter(query).emitExecutionLambda({
          rowLimit: 1000,
          runtime,
        }),
      );
      const expected = ROW_COUNTS.get(id);
      if (expected === undefined) {
        // European finals: a handful of the events
        expect(result.rows.length).toBeGreaterThan(0);
        expect(result.rows.length).toBeLessThanOrEqual(10);
      } else {
        expect(result.rows.length).toBe(expected);
      }
    },
  );
});
