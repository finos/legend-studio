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

import { afterEach, describe, expect, test } from '@jest/globals';
import {
  Connection,
  CubeDocument,
  ERR_CHECKING,
  ExpressionFilter,
  Extend,
  type IR,
  type JsonObject,
  MESSAGE_CONDITION_NOT_BOOLEAN,
  MESSAGE_CONDITION_NOT_CHECKED,
  PrimitiveType,
  Query,
  type QueryNode,
  Restrict,
  Schema,
  SchemaColumn,
} from '@finos/legend-cube';
import { getConditionRecheckWarning } from '../../__lib__/LegendCubeLabels.js';
import { getCubeCanvasNodeStatus } from '../../components/canvas/CubeCanvasElements.js';
import {
  NORTHWIND_RUNTIME,
  northwindTable,
  ORDERS_COLUMNS,
} from '../../__test-utils__/CubeNorthwindTestQueries.js';
import { TEST__createCubeHost } from '../../__test-utils__/CubeTestApplication.js';
import type { FakeCubeEngine } from '../../__test-utils__/FakeCubeEngine.js';
import {
  CubeEngineError,
  CubeEngineErrorKind,
  type NodeId,
} from '../../graph-manager/CubeEngine.js';
import { CubeEditorState } from '../CubeEditorState.js';
import { CUBE_NORTHWIND_MODEL } from '../fixtures/CubeNorthwindModel.js';

const CONTEXT = { model: CUBE_NORTHWIND_MODEL, runtime: NORTHWIND_RUNTIME };
const INTEGER = PrimitiveType.get('Integer');
const BOOLEAN = PrimitiveType.get('Boolean');
const X = { _type: 'var', name: 'x' };

/** `x | $x.<name> > <value>`, as the engine's JSON */
const greaterThan = (name: string, value = '1'): JsonObject => ({
  _type: 'lambda',
  parameters: [X],
  body: [
    {
      _type: 'func',
      function: 'greaterThan',
      parameters: [
        { _type: 'property', property: name, parameters: [X] },
        { _type: 'integer', value },
      ],
    },
  ],
});
const filterOn = (name: string, value = '1'): ExpressionFilter =>
  new ExpressionFilter(
    'expressionFilter101',
    `x | $x.${name} > ${value}`,
    greaterThan(name, value),
  );

/** The nodes in a line, the last captured */
const line = (...nodes: QueryNode[]): Query =>
  new Query(
    nodes,
    nodes
      .slice(1)
      .map(
        (node, index) => new Connection(nodes[index]?.id ?? '', node.id, 'tds'),
      ),
    nodes.at(-1)?.id,
  );

/** ORDERS, maybe restricted, then a filter on ORDER_ID */
const ordersFiltered = (restricted = false): Query =>
  line(
    northwindTable('relational101', 'ORDERS', ORDERS_COLUMNS),
    ...(restricted
      ? [new Restrict('restrict101', ['ORDER_ID', 'SHIP_VIA'])]
      : []),
    filterOn('ORDER_ID'),
  );

/**
 * The engine's answer: a filter types, the condition alone is a Boolean, an
 * Extend's chain gives Integer columns; unless the test says otherwise
 */
const answerFor = (
  lambdas: ReadonlyMap<NodeId, IR>,
  answer?: (key: NodeId) => Schema | CubeEngineError | undefined,
): Map<NodeId, Schema | CubeEngineError> =>
  new Map<NodeId, Schema | CubeEngineError>(
    [...lambdas.keys()].map((key): [NodeId, Schema | CubeEngineError] => {
      const given = answer?.(key);
      if (given) {
        return [key, given];
      }
      const [, suffix] = key.split('#');
      if (suffix === 'filter') {
        return [key, new Schema(ORDERS_COLUMNS)];
      }
      if (suffix === 'condition') {
        return [
          key,
          new Schema([
            ...ORDERS_COLUMNS,
            new SchemaColumn('cube_condition', BOOLEAN, false),
          ]),
        ];
      }
      return [
        key,
        new Schema([
          ...ORDERS_COLUMNS,
          ...Array.from(
            { length: Number(suffix) },
            (_, index) =>
              new SchemaColumn(String.fromCharCode(97 + index), INTEGER, false),
          ),
        ]),
      ];
    }),
  );

/** Makes the fake answer each call when the test says so */
const deferChecks = (
  fake: FakeCubeEngine,
): Array<{
  lambdas: ReadonlyMap<NodeId, IR>;
  resolve: (answer: Map<NodeId, Schema | CubeEngineError>) => void;
  reject: (error: unknown) => void;
}> => {
  const calls: ReturnType<typeof deferChecks> = [];
  fake.typeLambdas.mockImplementation(
    (_model, lambdas) =>
      new Promise((resolve, reject) => {
        calls.push({ lambdas, resolve, reject });
      }),
  );
  return calls;
};

const settle = async (): Promise<void> => {
  await new Promise((resolve) => setTimeout(resolve, 0));
};

let editorStates: CubeEditorState[] = [];

afterEach(() => {
  editorStates.forEach((state) => state.dispose());
  editorStates = [];
});

const open = (
  query: Query,
): {
  state: CubeEditorState;
  calls: ReturnType<typeof deferChecks>;
} => {
  const { host, fake } = TEST__createCubeHost();
  const calls = deferChecks(fake);
  const state = new CubeEditorState(
    host,
    new CubeDocument({ context: CONTEXT, query }),
  );
  editorStates.push(state);
  return { state, calls };
};

const filterOf = (state: CubeEditorState): ExpressionFilter =>
  state.document.query.getNode('expressionFilter101') as ExpressionFilter;

/** The keys of each call */
const keysOf = (calls: ReturnType<typeof deferChecks>): string[][] =>
  calls.map(({ lambdas }) => [...lambdas.keys()]);

describe('Filter by Expression checking', () => {
  test('Checks a waiting condition in the background, in one call, outside the undo history', async () => {
    const { state, calls } = open(ordersFiltered());
    expect(keysOf(calls)).toEqual([
      ['expressionFilter101#filter', 'expressionFilter101#condition'],
    ]);
    // pending meanwhile: no error, and the node shows it is being checked
    expect(state.analysis.validity.get('expressionFilter101')).toEqual([
      ERR_CHECKING,
    ]);
    expect(state.isCheckingExpressions).toBe(true);
    const status = getCubeCanvasNodeStatus(state, filterOf(state));
    expect(status.isInvalid).toBe(false);
    expect(status.isResolving).toBe(true);
    expect(state.nodesToCheck).toEqual([]);
    calls[0]?.resolve(answerFor(calls[0].lambdas));
    await settle();
    expect(filterOf(state).check.kind).toBe('checked');
    expect(state.analysis.validity.get('expressionFilter101')).toEqual([]);
    // its columns are its input's
    expect(state.analysis.schemas.get('expressionFilter101')?.names()).toEqual(
      ORDERS_COLUMNS.map(({ name }) => name),
    );
    expect(state.isCheckingExpressions).toBe(false);
    expect(state.history).toHaveLength(0);
    expect(calls).toHaveLength(1);
  });

  test("Names the condition's type when it isn't one Boolean, and the engine's first line otherwise", async () => {
    const noMatch = new CubeEngineError(
      CubeEngineErrorKind.COMPILE,
      "Can't find a match for function 'filter(Relation<(ORDER_ID:SmallInt[1], …)>[1],…)'",
      'expressionFilter101',
    );
    const typedAs = (type: PrimitiveType, nullable: boolean): Schema =>
      new Schema([
        ...ORDERS_COLUMNS,
        new SchemaColumn('cube_condition', type, nullable),
      ]);
    const cases: Array<
      [(key: NodeId) => Schema | CubeEngineError | undefined, string]
    > = [
      [
        (key) => (key.endsWith('#filter') ? noMatch : typedAs(INTEGER, false)),
        MESSAGE_CONDITION_NOT_BOOLEAN('Integer'),
      ],
      [
        (key) => (key.endsWith('#filter') ? noMatch : typedAs(BOOLEAN, true)),
        MESSAGE_CONDITION_NOT_BOOLEAN('Boolean[0..1]'),
      ],
      // alone, the condition's own error, which names no filter
      [
        () =>
          new CubeEngineError(
            CubeEngineErrorKind.COMPILE,
            "The column 'NOPE' can't be found in the relation - Context:[a, b]",
            'expressionFilter101',
          ),
        MESSAGE_CONDITION_NOT_CHECKED(
          "The column 'NOPE' can't be found in the relation",
        ),
      ],
    ];
    for (const [answer, message] of cases) {
      const { state, calls } = open(ordersFiltered());
      calls[0]?.resolve(answerFor(calls[0].lambdas, answer));
      await settle();
      expect(state.analysis.validity.get('expressionFilter101')).toEqual([
        message,
      ]);
      // a failure is no reason to check again
      expect(calls).toHaveLength(1);
    }
  });

  test("Keeps a check still current when the engine can't be reached, with a warning; fails one that isn't", async () => {
    const { state, calls } = open(ordersFiltered());
    calls[0]?.resolve(answerFor(calls[0].lambdas));
    await settle();
    const checked = filterOf(state);
    // checked once on import, as a loaded cube is
    state.importDocument(state.document, false);
    expect(calls).toHaveLength(2);
    calls[1]?.reject(new Error('Failed to fetch'));
    await settle();
    expect(filterOf(state) === checked).toBe(true);
    expect(state.analysis.validity.get('expressionFilter101')).toEqual([]);
    expect(state.warnings.get(checked.key)).toEqual([
      getConditionRecheckWarning('Failed to fetch'),
    ]);

    const second = open(ordersFiltered());
    second.calls[0]?.reject(new Error('Failed to fetch'));
    await settle();
    expect(second.state.analysis.validity.get('expressionFilter101')).toEqual([
      MESSAGE_CONDITION_NOT_CHECKED('Failed to fetch'),
    ]);
  });

  test('Drops an answer for a node changed meanwhile, and checks the new one', async () => {
    const { state, calls } = open(ordersFiltered());
    const changed = filterOf(state).withCondition(
      'x | $x.ORDER_ID > 2',
      greaterThan('ORDER_ID', '2'),
    );
    state.applyQuery(state.document.query.replace(changed));
    calls[0]?.resolve(answerFor(calls[0].lambdas));
    await settle();
    expect(filterOf(state) === changed).toBe(true);
    expect(filterOf(state).currentCheck(new Schema(ORDERS_COLUMNS)).kind).toBe(
      'unresolved',
    );
    expect(calls).toHaveLength(2);
    calls[1]?.resolve(answerFor(calls[1].lambdas));
    await settle();
    expect(state.analysis.validity.get('expressionFilter101')).toEqual([]);
  });

  test('Checks a condition again once its input changes', async () => {
    const { state, calls } = open(ordersFiltered(true));
    calls[0]?.resolve(answerFor(calls[0].lambdas));
    await settle();
    expect(state.analysis.validity.get('expressionFilter101')).toEqual([]);
    const restrict = state.document.query.getNode('restrict101') as Restrict;
    state.applyQuery(
      state.document.query.replace(
        new Restrict('restrict101', [...restrict.columns, 'FREIGHT']),
      ),
    );
    expect(state.analysis.validity.get('expressionFilter101')).toEqual([
      ERR_CHECKING,
    ]);
    expect(calls).toHaveLength(2);
  });

  test("Checks a condition again when its input as the engine is given it changes, though Cube's schema doesn't", async () => {
    const extended = new Extend('extend101', [
      { name: 'a', code: 'x | 1', lambda: greaterThan('ORDER_ID') },
    ]);
    const { state, calls } = open(
      line(
        northwindTable('relational101', 'ORDERS', ORDERS_COLUMNS),
        extended,
        filterOn('a'),
      ),
    );
    calls[0]?.resolve(answerFor(calls[0].lambdas));
    await settle();
    calls[1]?.resolve(answerFor(calls[1].lambdas));
    await settle();
    expect(keysOf(calls)).toEqual([
      ['extend101#1'],
      ['expressionFilter101#filter', 'expressionFilter101#condition'],
    ]);
    expect(state.analysis.validity.get('expressionFilter101')).toEqual([]);
    // extend101 gets another expression of the same type: Cube's schema of
    // the filter's input is the same, what the engine is given isn't
    const extend = state.document.query.getNode('extend101') as Extend;
    state.applyQuery(
      state.document.query.replace(
        extend.withColumns([
          { name: 'a', code: 'x | 2', lambda: greaterThan('ORDER_ID', '2') },
        ]),
      ),
    );
    calls[2]?.resolve(answerFor(calls[2].lambdas));
    await settle();
    // the filter waits, and is checked again
    expect(state.analysis.validity.get('expressionFilter101')).toEqual([
      ERR_CHECKING,
    ]);
    expect(keysOf(calls)[3]).toEqual([
      'expressionFilter101#filter',
      'expressionFilter101#condition',
    ]);
    calls[3]?.resolve(answerFor(calls[3].lambdas));
    await settle();
    expect(state.analysis.validity.get('expressionFilter101')).toEqual([]);
    await settle();
    expect(calls).toHaveLength(4);
  });
});
