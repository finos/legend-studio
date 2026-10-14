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
  aggregationColSpec,
  buildSchemasAndValidity,
  colSpec,
  colSpecArray,
  ColumnComparisonFilter,
  CompositeFilter,
  CompositeFilterOperator,
  createNodeRegistry,
  EmitRole,
  ensureSchemas,
  Filter,
  FilterOperator,
  func,
  type IR,
  lambda,
  literal,
  type NodeRegistry,
  originOf,
  PrimitiveType,
  type Query,
  type QueryNode,
  QueryEmitter,
  Schema,
  SchemaColumn,
  type TransformDefinition,
  UnaryNode,
  variable,
} from '@finos/legend-cube';
import {
  TEST__chainOf,
  TEST__columnValues,
  TEST__northwindTable,
  TEST__resolveSources,
  TEST__typingDifferences,
} from '../__test-utils__/CubeOperationsTestUtils.js';
import { CubeEngineError } from '../graph-manager/CubeEngine.js';
import { V1_createEngineBackedCubeEngine } from '../graph-manager/protocol/pure/v1/__test-utils__/V1_CubeEngineTestUtils.js';
import type { V1_LegendCubeEngine } from '../graph-manager/protocol/pure/v1/V1_LegendCubeEngine.js';
import {
  CUBE_NORTHWIND_MODEL,
  CUBE_NORTHWIND_RUNTIME,
} from '../stores/fixtures/CubeNorthwindModel.js';

// The lets that isolate a window (PLAN §8.6, §11.6) through the engine
// adapter, before Partition exists: a test-only window counts each row's
// country's orders. A filter after a window runs before it unless the window
// is bound: France has 77 orders, but the single form counts the 2 the filter
// keeps (✅ m5-requirements synth/s1-let-filter.out).

/** Each row's count of the rows sharing its value of `column` */
class TestCountWindow extends UnaryNode {
  static readonly TYPE = 'testCountWindow';

  readonly column: string;

  constructor(id: string, column = 'SHIP_COUNTRY') {
    super(id);
    this.column = column;
  }

  get type(): string {
    return TestCountWindow.TYPE;
  }

  validate(inputSchemas: readonly Schema[]): boolean {
    ensureSchemas(inputSchemas, this.ports);
    return true;
  }

  override schematize(inputSchemas: readonly Schema[]): Schema | undefined {
    const [input] = ensureSchemas(inputSchemas, this.ports);
    return input
      ? new Schema([
          ...input.columns,
          new SchemaColumn('c', PrimitiveType.get('Integer'), false),
        ])
      : undefined;
  }

  describe(): string {
    return `Count by ${this.column}`;
  }
}

/**
 * `->extend(over(~[<column>]), ~[c: {p, w, r | 1} : y | $y->size()])`, or in
 * the single form, `~c: …`, which the engine doesn't isolate itself
 */
const windowDefinition = (
  isolationBoundary: boolean,
  singleForm: boolean,
): TransformDefinition<TestCountWindow> => ({
  kind: 'transform',
  type: TestCountWindow.TYPE,
  label: 'Test count window',
  icon: 'window',
  beta: false,
  create: (id) => new TestCountWindow(id),
  emit: (node, [input]) => {
    const origin = originOf(node.id, EmitRole.AGGREGATION);
    return func(
      'extend',
      [
        input as IR,
        func('over', [colSpecArray([colSpec(node.column)])], origin),
        ((spec: IR): IR => (singleForm ? spec : colSpecArray([spec])))(
          aggregationColSpec(
            'c',
            lambda(['p', 'w', 'r'], [literal({ kind: 'integer', value: '1' })]),
            lambda(['y'], [func('size', [variable('y')])]),
          ),
        ),
      ],
      origin,
    );
  },
  spec: {
    keys: [],
    encode: () => ({}),
    decode: (id) => new TestCountWindow(id),
  },
  isolationBoundary,
});

const registry = (
  isolationBoundary = true,
  singleForm = false,
): NodeRegistry => {
  const result = createNodeRegistry();
  result.register(windowDefinition(isolationBoundary, singleForm));
  return result;
};

/** France's orders up to 10251: 10248 and 10251 */
const FRANCE = new CompositeFilter(CompositeFilterOperator.AND, [
  new ColumnComparisonFilter('SHIP_COUNTRY', FilterOperator.EQUAL, {
    kind: 'string',
    value: 'France',
  }),
  new ColumnComparisonFilter('ORDER_ID', FilterOperator.LESS_THAN, {
    kind: 'integer',
    value: '10252',
  }),
]);

let engine: V1_LegendCubeEngine;

beforeEach(() => {
  ({ engine } = V1_createEngineBackedCubeEngine());
});

/** ORDERS, a count window with this id, then the France filter, captured */
const windowThenFilter = async (
  windowId: string,
  column?: string,
): Promise<Query> => {
  const [orders] = await TEST__resolveSources(engine, [
    TEST__northwindTable('relational101', 'ORDERS'),
  ]);
  return TEST__chainOf([
    orders as QueryNode,
    new TestCountWindow(windowId, column),
    new Filter('filter101', FRANCE),
  ]);
};

const runLambda = (
  query: Query,
  isolationBoundary = true,
  singleForm = false,
): IR =>
  new QueryEmitter(
    query,
    registry(isolationBoundary, singleForm),
  ).emitExecutionLambda({
    rowLimit: 100,
    runtime: CUBE_NORTHWIND_RUNTIME,
  });

/** The block of a run lambda with lets: `{| <lets>; <relation>}` */
const blockOf = (executionLambda: IR): IR => {
  const limit =
    executionLambda.k === 'lambda' ? executionLambda.body[0] : undefined;
  const from = limit?.k === 'func' ? limit.params[0] : undefined;
  const block = from?.k === 'func' ? from.params[0] : undefined;
  expect(block?.k).toBe('lambda');
  return block as IR;
};

describe('Window isolation on the engine', () => {
  test('Counts a window over every row of the partition, then filters, when the window is bound', async () => {
    const query = await windowThenFilter('window101');
    const bound = await engine.execute(CUBE_NORTHWIND_MODEL, runLambda(query));
    expect(TEST__columnValues(bound, 'ORDER_ID').map(Number).sort()).toEqual([
      10248, 10251,
    ]);
    expect(TEST__columnValues(bound, 'c').map(Number)).toEqual([77, 77]);
    expect(bound.sql.join('\n')).toMatch(/\bwith\b/iu);

    // in the single form, the filter runs before the window unless a let
    // binds the window
    const single = await engine.execute(
      CUBE_NORTHWIND_MODEL,
      runLambda(query, false, true),
    );
    expect(TEST__columnValues(single, 'c').map(Number)).toEqual([2, 2]);
    const singleBound = await engine.execute(
      CUBE_NORTHWIND_MODEL,
      runLambda(query, true, true),
    );
    expect(TEST__columnValues(singleBound, 'c').map(Number)).toEqual([77, 77]);
  });

  test('Runs a window whose id is no identifier, under a let named for its place', async () => {
    const query = await windowThenFilter('a-b');
    const executionLambda = runLambda(query);
    expect(JSON.stringify(executionLambda)).toContain('"name":"n_1"');
    const result = await engine.execute(CUBE_NORTHWIND_MODEL, executionLambda);
    expect(TEST__columnValues(result, 'c').map(Number)).toEqual([77, 77]);
  });

  test('Types the let form as Cube infers it, and as the chain that types the node', async () => {
    const query = await windowThenFilter('window101');
    const emitter = new QueryEmitter(query, registry());
    const typed = await engine.typeLambdas(
      CUBE_NORTHWIND_MODEL,
      new Map([
        ['chain', emitter.emitTypingLambda('filter101')],
        ['let', blockOf(runLambda(query))],
      ]),
    );
    const cube = buildSchemasAndValidity(
      query,
      registry().queryRules,
    ).schemas.get('filter101');
    expect(
      TEST__typingDifferences('chain', cube, typed.get('chain'), {
        widerNullable: [],
      }),
    ).toEqual([]);
    expect(
      TEST__typingDifferences('let', cube, typed.get('let'), {
        widerNullable: [],
      }),
    ).toEqual([]);
  });

  test('Shows the lets in Pure', async () => {
    const text = await engine.renderPure(
      runLambda(await windowThenFilter('window101')),
    );
    expect(text).toContain('let n_window101 =');
    expect(text).toContain('$n_window101->filter(');
  });

  test('Puts an error inside a let on the window the let binds', async () => {
    const query = await windowThenFilter('window101', 'NO_SUCH_COLUMN');
    const error = await engine
      .execute(CUBE_NORTHWIND_MODEL, runLambda(query))
      .then(
        () => undefined,
        (caught: unknown) => caught,
      );
    expect(error).toBeInstanceOf(CubeEngineError);
    expect((error as CubeEngineError).nodeId).toBe('window101');
    expect((error as CubeEngineError).firstLine).toContain('NO_SUCH_COLUMN');
  });
});
