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
  ColumnComparisonFilter,
  CompositeFilter,
  CompositeFilterOperator,
  Connection,
  CubeDocument,
  Filter,
  FilterOperator,
  Join,
  Query,
} from '@finos/legend-cube';
import { flowResult } from 'mobx';
import { TEST__createCubeHost } from '../../__test-utils__/CubeTestApplication.js';
import {
  CUSTOMERS_COLUMNS,
  NORTHWIND_RUNTIME,
  northwindTable,
  ORDERS_COLUMNS,
  sliceQuery,
} from '../../__test-utils__/CubeNorthwindTestQueries.js';
import {
  CubeEngineError,
  CubeEngineErrorKind,
} from '../../graph-manager/CubeEngine.js';
import { CUBE_NORTHWIND_MODEL } from '../fixtures/CubeNorthwindModel.js';
import { CubeEditorState } from '../CubeEditorState.js';

const CONTEXT = { model: CUBE_NORTHWIND_MODEL, runtime: NORTHWIND_RUNTIME };

/** ORDERS and CUSTOMERS, and a Join that nothing feeds yet */
const unwiredJoin = (): CubeDocument =>
  new CubeDocument({
    context: CONTEXT,
    query: new Query(
      [
        northwindTable('relational101', 'ORDERS', ORDERS_COLUMNS),
        northwindTable('relational102', 'CUSTOMERS', CUSTOMERS_COLUMNS),
        new Join('join101'),
      ],
      [],
      'relational101',
    ),
  });

const createState = (document?: CubeDocument): CubeEditorState =>
  new CubeEditorState(TEST__createCubeHost().host, document);

beforeEach(() => {
  localStorage.clear();
});

describe('Connecting nodes', () => {
  test('Feeds a node into the named port, as one undoable edit', () => {
    const state = createState(unwiredJoin());
    state.connect('relational102', 'join101', 'rightTds');
    expect(state.document.query.connections).toEqual([
      new Connection('relational102', 'join101', 'rightTds'),
    ]);
    expect(state.history).toHaveLength(1);
    state.connect('relational101', 'join101');
    // the first free port
    expect(state.document.query.getInputIds('join101')).toEqual([
      'relational101',
      'relational102',
    ]);
    expect(state.history).toHaveLength(2);
  });

  test('Does nothing the query does not allow: a taken port, a node that already feeds one, itself', () => {
    const state = createState(unwiredJoin());
    state.connect('relational101', 'join101', 'leftTds');
    const { document } = state;
    state.connect('relational102', 'join101', 'leftTds');
    state.connect('relational101', 'join101', 'rightTds');
    state.connect('join101', 'join101', 'rightTds');
    state.connect('relational102', 'join101', 'noSuchPort');
    expect(state.document).toBe(document);
    expect(state.history).toHaveLength(1);
  });

  test('Does nothing while the cube is read-only', () => {
    const state = createState();
    state.importDocument(unwiredJoin(), true);
    const { document } = state;
    state.connect('relational101', 'join101', 'leftTds');
    expect(state.document).toBe(document);
  });
});

describe('Showing and hiding the graph', () => {
  test('Saves it in the cube, keeping the rest of the presentation, as an undoable edit', () => {
    const presentationRest = { zoom: 2 };
    const state = createState(
      new CubeDocument({
        query: sliceQuery(),
        meta: {
          presentation: {
            showGraph: true,
            columnWidths: [{ column: 'ORDER_ID', width: 120 }],
            rest: presentationRest,
          },
          rest: { theme: 'dark' },
        },
      }),
    );
    const { query } = state.document;
    state.setShowGraph(false);
    expect(state.document.meta).toEqual({
      presentation: {
        showGraph: false,
        columnWidths: [{ column: 'ORDER_ID', width: 120 }],
        rest: presentationRest,
      },
      rest: { theme: 'dark' },
    });
    // the query is the same object, so its rows are not stale
    expect(state.document.query).toBe(query);
    expect(state.history).toHaveLength(1);
    // already hidden: no edit
    state.setShowGraph(false);
    expect(state.history).toHaveLength(1);
    state.undo();
    expect(state.document.meta.presentation.showGraph).toBe(true);
    expect(state.document.query).toBe(query);
  });

  test('Leaves the last run fresh', async () => {
    const { host, fake } = TEST__createCubeHost();
    fake.execute.mockResolvedValue({
      columns: ORDERS_COLUMNS.map((column) => column.name),
      rows: [ORDERS_COLUMNS.map(() => null)],
      sql: [],
      durationMs: 1,
    });
    const state = new CubeEditorState(
      host,
      new CubeDocument({
        context: CONTEXT,
        query: new Query(
          [northwindTable('relational101', 'ORDERS', ORDERS_COLUMNS)],
          [],
          'relational101',
        ),
      }),
    );
    await flowResult(state.execution.execute());
    expect(state.execution.result).toBeDefined();
    expect(state.execution.isStale).toBe(false);
    state.setShowGraph(false);
    expect(state.execution.isStale).toBe(false);
  });
});

describe("A node's errors", () => {
  test('Lists its own errors, then the engine error on it, each once', () => {
    const state = createState(
      new CubeDocument({
        context: CONTEXT,
        query: sliceQuery(
          new CompositeFilter(CompositeFilterOperator.AND, [
            new ColumnComparisonFilter('ORDER_ID', FilterOperator.EQUAL),
            new ColumnComparisonFilter('SHIP_CITY', FilterOperator.EQUAL),
          ]),
        ),
      }),
    );
    expect(state.getNodeErrors('filter101')).toEqual([
      'Filter value is required.',
    ]);
    state.setHostIssue(
      'filter101',
      new CubeEngineError(
        CubeEngineErrorKind.EXECUTION,
        'Filter value is required.\nat line 1',
      ),
    );
    state.setHostIssue(
      'join101',
      new CubeEngineError(
        CubeEngineErrorKind.EXECUTION,
        'Something failed\nat line 1',
      ),
    );
    expect(state.getNodeErrors('filter101')).toEqual([
      'Filter value is required.',
    ]);
    expect(state.getNodeErrors('join101')).toEqual(['Something failed']);
    expect(state.getNodeErrors('relational101')).toEqual([]);
    expect(state.getNodeErrors('nothing101')).toEqual([]);
  });

  test('Tells a source being typed again by the engine, until it answers', async () => {
    const { host, fake } = TEST__createCubeHost();
    let answer: (
      value: Awaited<ReturnType<typeof fake.engine.resolveSchemas>>,
    ) => void = () => undefined;
    fake.resolveSchemas.mockReturnValueOnce(
      new Promise((resolve) => {
        answer = resolve;
      }),
    );
    const state = new CubeEditorState(host);
    const document = new CubeDocument({
      context: CONTEXT,
      query: new Query(
        [
          northwindTable('relational101', 'ORDERS', ORDERS_COLUMNS),
          new Filter('filter101'),
        ],
        [new Connection('relational101', 'filter101', 'tds')],
        'filter101',
      ),
    });
    state.importDocument(document, false);
    const source = document.query.getNode('relational101');
    const filter = document.query.getNode('filter101');
    expect(source && state.isPendingSource(source)).toBe(true);
    expect(filter && state.isPendingSource(filter)).toBe(false);
    answer(new Map());
    await new Promise((resolve) => setTimeout(resolve, 0));
    expect(source && state.isPendingSource(source)).toBe(false);
  });
});

describe('The node editor', () => {
  test('Opens on a node without changing which node Execute runs, and closes on import', () => {
    const state = createState(new CubeDocument({ query: sliceQuery() }));
    state.nodeEditor.open('join101');
    expect(state.nodeEditor.node).toBe(state.document.query.getNode('join101'));
    expect(state.document.query.selected).toBe('filter101');
    expect(state.history).toHaveLength(0);
    state.nodeEditor.open('nothing101');
    expect(state.nodeEditor.nodeId).toBe('join101');
    state.importDocument(unwiredJoin(), false);
    expect(state.nodeEditor.nodeId).toBeUndefined();
  });
});
