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
  Connection,
  CubeDocument,
  DEFAULT_META,
  Filter,
  Join,
  MESSAGE_SORT_COLUMNS_DROPPED,
  MESSAGE_SORT_ORDER_LOST,
  Query,
  type QueryNode,
  RelationalTableSource,
  Restrict,
  Schema,
  serializeCubeSpec,
  Sort,
  SortDirection,
} from '@finos/legend-cube';
import { flowResult, isObservable, runInAction } from 'mobx';
import {
  DEFAULT_ROW_LIMIT,
  LEGEND_CUBE_USER_DATA_KEY,
  MAX_UNDO_STEPS,
} from '../../__lib__/LegendCubeLabels.js';
import { TEST__createCubeHost } from '../../__test-utils__/CubeTestApplication.js';
import {
  CUSTOMERS_COLUMNS,
  NORTHWIND_RUNTIME,
  northwindTable,
  ORDERS_COLUMNS,
  sliceQuery,
} from '../../__test-utils__/CubeNorthwindTestQueries.js';
import { FAKE_NORTHWIND_OUTLINE } from '../../__test-utils__/FakeCubeEngine.js';
import {
  CubeEngineError,
  CubeEngineErrorKind,
} from '../../graph-manager/CubeEngine.js';
import { CUBE_NORTHWIND_MODEL } from '../fixtures/CubeNorthwindModel.js';
import { CubeEditorState } from '../CubeEditorState.js';

const sliceDocument = (): CubeDocument =>
  new CubeDocument({
    context: { model: CUBE_NORTHWIND_MODEL, runtime: NORTHWIND_RUNTIME },
    query: sliceQuery(),
  });

const engineError = (nodeId: string): CubeEngineError =>
  new CubeEngineError(
    CubeEngineErrorKind.COMPILE,
    `The column 'X' can't be found\nat line 1`,
    nodeId,
  );

beforeEach(() => {
  // the row limit is kept per user, in local storage
  localStorage.clear();
});

describe('Cube editor state', () => {
  test('Opens on an empty, unnamed cube with no model', () => {
    const state = new CubeEditorState(TEST__createCubeHost().host);
    expect(state.document.name).toBeUndefined();
    expect(state.document.context).toBeUndefined();
    expect(state.document.query.nodes).toEqual([]);
    expect(state.history).toEqual([]);
  });

  test('Opens an empty cube again after a reload: the cube, edited or imported, is never kept in browser storage, only the row limit', async () => {
    // not the default presentation, so one brought back from storage shows
    const meta = {
      presentation: {
        showGraph: false,
        columnWidths: [{ column: 'ORDER_ID', width: 120 }],
      },
    };
    const state = new CubeEditorState(TEST__createCubeHost().host);
    state.applyDocument(sliceDocument().withName('France').withMeta(meta));
    state.select('join101');
    expect(state.setRowLimit(25)).toBe(true);
    state.specTransfer.openImport();
    state.specTransfer.setImportText(
      serializeCubeSpec(sliceDocument().withName('Imported').withMeta(meta)),
    );
    expect(state.specTransfer.importSpec()).toBe(true);
    // let the import's tables be typed again before the page closes
    await new Promise((resolve) => {
      setTimeout(resolve, 0);
    });
    expect(state.isResolvingSources).toBe(false);
    expect(state.document.name).toBe('Imported');
    expect(state.document.meta.presentation.showGraph).toBe(false);
    state.dispose();

    // the page opens again in the same browser, with no cube given
    const reloaded = new CubeEditorState(TEST__createCubeHost().host);
    // the browser storage survived: the row limit is remembered
    expect(reloaded.rowLimit).toBe(25);
    expect(reloaded.document.name).toBeUndefined();
    expect(reloaded.document.context).toBeUndefined();
    // ids and counts only: a failed match on nodes or documents can't be
    // reported across Jest's workers, since their schemas hold BigInts
    expect(reloaded.document.query.nodes.map(({ id }) => id)).toEqual([]);
    expect(reloaded.document.meta).toEqual(DEFAULT_META);
    expect(reloaded.history.length).toBe(0);
  });

  test('Checks the query-level rules too: tables from two databases are an error', () => {
    const otherDatabase = new RelationalTableSource(
      'relational102',
      { database: 'other::Database', schema: 'NORTHWIND', table: 'ORDERS' },
      { kind: 'resolved', schema: new Schema(ORDERS_COLUMNS) },
    );
    const state = new CubeEditorState(
      TEST__createCubeHost().host,
      new CubeDocument({
        query: new Query(
          [
            northwindTable('relational101', 'ORDERS', ORDERS_COLUMNS),
            otherDatabase,
          ],
          [],
          'relational101',
        ),
      }),
    );
    expect(state.analysis.validity.get('relational101')).toEqual([]);
    expect(state.analysis.validity.get('relational102')?.join(' ')).toContain(
      'Sources from different databases are not supported yet',
    );
  });

  test('Keeps each earlier cube for undo, oldest first', () => {
    const state = new CubeEditorState(TEST__createCubeHost().host);
    const empty = state.document;
    const sliced = sliceDocument();
    state.applyDocument(sliced);
    state.applyQuery(sliced.query.select('join101'));
    expect(state.history).toEqual([empty, sliced]);
    expect(state.document.query.selected).toBe('join101');
    // the same document again is no change
    state.applyDocument(state.document);
    expect(state.history).toHaveLength(2);
  });

  test(`Keeps at most ${MAX_UNDO_STEPS} undo steps`, () => {
    const state = new CubeEditorState(TEST__createCubeHost().host);
    for (let index = 0; index <= MAX_UNDO_STEPS + 5; index++) {
      state.applyDocument(state.document.withName(`cube ${index}`));
    }
    expect(state.history).toHaveLength(MAX_UNDO_STEPS);
    expect(state.history[MAX_UNDO_STEPS - 1]?.name).toBe(
      `cube ${MAX_UNDO_STEPS + 4}`,
    );
  });

  test('Selects a node to run, and ignores a node it cannot select', () => {
    const state = new CubeEditorState(
      TEST__createCubeHost().host,
      sliceDocument(),
    );
    state.select('join101');
    expect(state.document.query.selected).toBe('join101');
    expect(state.history).toHaveLength(1);
    state.select('join101');
    state.select('missing');
    expect(state.history).toHaveLength(1);
  });

  test('Drops engine errors when the query changes, and keeps them otherwise', () => {
    const state = new CubeEditorState(
      TEST__createCubeHost().host,
      sliceDocument(),
    );
    state.setHostIssue('filter101', engineError('filter101'));
    expect(state.hostIssues.get('filter101')).toEqual({
      firstLine: `The column 'X' can't be found`,
      detail: `The column 'X' can't be found\nat line 1`,
    });
    state.applyDocument(state.document.withName('France'));
    expect(state.hostIssues.size).toBe(1);
    state.select('join101');
    expect(state.hostIssues.size).toBe(0);
  });

  test("Drops the last run's error in the grid too when the query changes, and keeps it when only the name or the presentation does", async () => {
    const { host, fake } = TEST__createCubeHost();
    fake.execute.mockRejectedValueOnce(engineError('filter101'));
    const state = new CubeEditorState(host, sliceDocument());
    await flowResult(state.execution.execute());
    expect(state.execution.error?.firstLine).toBe(
      `The column 'X' can't be found`,
    );
    expect([...state.hostIssues.keys()]).toEqual(['filter101']);
    state.applyDocument(state.document.withName('France'));
    const { meta } = state.document;
    state.applyDocument(
      state.document.withMeta({
        ...meta,
        presentation: {
          ...meta.presentation,
          showGraph: !meta.presentation.showGraph,
        },
      }),
    );
    expect(state.history).toHaveLength(2);
    expect(state.execution.error?.firstLine).toBe(
      `The column 'X' can't be found`,
    );
    expect(state.hostIssues.size).toBe(1);
    state.select('join101');
    expect(state.execution.error).toBeUndefined();
    expect(state.hostIssues.size).toBe(0);
  });

  test('Holds the undo history and the engine errors by reference, never observed deeply', () => {
    const state = new CubeEditorState(
      TEST__createCubeHost().host,
      sliceDocument(),
    );
    state.select('join101');
    expect(state.history).toHaveLength(1);
    expect(isObservable(state.history)).toBe(false);
    state.setHostIssue('join101', engineError('join101'));
    expect(state.hostIssues.size).toBe(1);
    expect(isObservable(state.hostIssues)).toBe(false);
  });

  test('Holds the model outline its source picker loaded by reference, never observed deeply', async () => {
    const state = new CubeEditorState(TEST__createCubeHost().host);
    await flowResult(state.sourcePicker.selectModel(CUBE_NORTHWIND_MODEL));
    const { outline } = state.sourcePicker;
    expect(outline).toBeDefined();
    // the very outline the engine answered, as the model catalog keeps it
    expect(outline === FAKE_NORTHWIND_OUTLINE).toBe(true);
    expect(isObservable(outline)).toBe(false);
  });

  test(`Runs ${DEFAULT_ROW_LIMIT} rows by default, and remembers the user's row limit`, () => {
    const { host } = TEST__createCubeHost();
    const state = new CubeEditorState(host);
    expect(state.rowLimit).toBe(DEFAULT_ROW_LIMIT);
    expect(state.setRowLimit(25)).toBe(true);
    expect(state.rowLimit).toBe(25);
    expect(new CubeEditorState(host).rowLimit).toBe(25);
  });

  test.each([0, -1, 2.5, NaN, Infinity, Number.MAX_SAFE_INTEGER + 1])(
    'Refuses the row limit %s',
    (value) => {
      const state = new CubeEditorState(TEST__createCubeHost().host);
      expect(state.setRowLimit(value)).toBe(false);
      expect(state.rowLimit).toBe(DEFAULT_ROW_LIMIT);
    },
  );

  test('Falls back to the default row limit when the remembered one is unusable', () => {
    const { host } = TEST__createCubeHost();
    host.applicationStore.userDataService.persistValue(
      LEGEND_CUBE_USER_DATA_KEY.ROW_LIMIT,
      0,
    );
    expect(new CubeEditorState(host).rowLimit).toBe(DEFAULT_ROW_LIMIT);
    host.applicationStore.userDataService.persistValue(
      LEGEND_CUBE_USER_DATA_KEY.ROW_LIMIT,
      '50',
    );
    expect(new CubeEditorState(host).rowLimit).toBe(DEFAULT_ROW_LIMIT);
  });
});

/** ORDERS sorted by CUSTOMER_ID then ORDER_ID, then these nodes, the last selected */
const sortedOrdersThen = (...nodes: QueryNode[]): CubeDocument => {
  const all = [
    northwindTable('relational101', 'ORDERS', ORDERS_COLUMNS),
    new Sort('sort101', [
      { column: 'CUSTOMER_ID', direction: SortDirection.ASC },
      { column: 'ORDER_ID', direction: SortDirection.DESC },
    ]),
    ...nodes,
  ];
  return new CubeDocument({
    context: { model: CUBE_NORTHWIND_MODEL, runtime: NORTHWIND_RUNTIME },
    query: new Query(
      all,
      all
        .slice(1)
        .map(
          (node, index) =>
            new Connection((all[index] as QueryNode).id, node.id, 'tds'),
        ),
      all.at(-1)?.id,
    ),
  });
};

/** The sorted ORDERS joined to CUSTOMERS on CUSTOMER_ID, the join selected */
const sortedOrdersJoined = (): CubeDocument => {
  const sorted = sortedOrdersThen();
  return sorted.withQuery(
    new Query(
      [
        ...sorted.query.nodes,
        northwindTable('relational102', 'CUSTOMERS', CUSTOMERS_COLUMNS),
        new Join('join101', {
          leftColumns: ['CUSTOMER_ID'],
          rightColumns: ['CUSTOMER_ID'],
        }),
      ],
      [
        ...sorted.query.connections,
        new Connection('sort101', 'join101', 'leftTds'),
        new Connection('relational102', 'join101', 'rightTds'),
      ],
      'join101',
    ),
  );
};

describe('Sort warnings', () => {
  test('Warns on a Sort whose order a Join loses, never as an error, so the cube still runs', () => {
    const state = new CubeEditorState(
      TEST__createCubeHost().host,
      sortedOrdersJoined(),
    );
    expect(Object.fromEntries(state.derivedWarnings)).toEqual({
      sort101: [MESSAGE_SORT_ORDER_LOST('join101')],
    });
    const sort = state.document.query.getNode('sort101') as Sort;
    expect(state.getNodeWarnings(sort)).toEqual([
      MESSAGE_SORT_ORDER_LOST('join101'),
    ]);
    expect(state.analysis.validity.get('sort101')).toEqual([]);
    expect(state.warnings.size).toBe(0);
    expect(state.execution.canExecute).toBe(true);
  });

  test('Names the Restrict and the columns it drops before the order is used', () => {
    const state = new CubeEditorState(
      TEST__createCubeHost().host,
      sortedOrdersThen(
        new Restrict('restrict101', ['CUSTOMER_ID', 'SHIP_CITY']),
      ),
    );
    expect(Object.fromEntries(state.derivedWarnings)).toEqual({
      sort101: [MESSAGE_SORT_COLUMNS_DROPPED(['ORDER_ID'], 'restrict101')],
    });
  });

  test('Waits until the Sort and the node that loses its order have no errors', () => {
    // a Restrict just added, with no column yet
    const state = new CubeEditorState(
      TEST__createCubeHost().host,
      sortedOrdersThen(new Restrict('restrict101')),
    );
    expect(state.derivedWarnings.size).toBe(0);
    state.applyQuery(
      state.document.query.replace(new Restrict('restrict101', ['SHIP_CITY'])),
    );
    expect(Object.fromEntries(state.derivedWarnings)).toEqual({
      sort101: [MESSAGE_SORT_ORDER_LOST('restrict101')],
    });
    // a Sort with a column the input lacks shows its error only
    state.applyQuery(
      state.document.query.replace(
        new Sort('sort101', [
          { column: 'CUSTOMER_ID', direction: SortDirection.ASC },
          { column: 'SHIPPER', direction: SortDirection.ASC },
        ]),
      ),
    );
    expect(state.derivedWarnings.size).toBe(0);
  });

  test('Has no warning for a Sort whose order reaches the output', () => {
    const state = new CubeEditorState(
      TEST__createCubeHost().host,
      sortedOrdersThen(new Filter('filter101')),
    );
    expect(state.derivedWarnings.size).toBe(0);
  });

  test('Follows the query: the warning goes with the Join, and undo brings it back', () => {
    const state = new CubeEditorState(
      TEST__createCubeHost().host,
      sortedOrdersJoined(),
    );
    state.removeNode('join101');
    expect(state.derivedWarnings.size).toBe(0);
    expect(state.warnings.size).toBe(0);
    state.undo();
    expect(Object.fromEntries(state.derivedWarnings)).toEqual({
      sort101: [MESSAGE_SORT_ORDER_LOST('join101')],
    });
  });

  test("Puts a node's stored warnings before its derived ones", () => {
    const state = new CubeEditorState(
      TEST__createCubeHost().host,
      sortedOrdersJoined(),
    );
    const sort = state.document.query.getNode('sort101') as Sort;
    runInAction(() => {
      state.warnings = new Map([[sort.key, ['A stored warning']]]);
    });
    expect(state.getNodeWarnings(sort)).toEqual([
      'A stored warning',
      MESSAGE_SORT_ORDER_LOST('join101'),
    ]);
  });
});
