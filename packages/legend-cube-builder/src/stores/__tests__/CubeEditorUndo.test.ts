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
import { CubeDocument, Query } from '@finos/legend-cube';
import { flowResult } from 'mobx';
import { TEST__createCubeHost } from '../../__test-utils__/CubeTestApplication.js';
import {
  CUSTOMERS_COLUMNS,
  NORTHWIND_RUNTIME,
  northwindTable,
  ORDERS_COLUMNS,
} from '../../__test-utils__/CubeNorthwindTestQueries.js';
import {
  CubeEngineError,
  CubeEngineErrorKind,
  type CubeResult,
} from '../../graph-manager/CubeEngine.js';
import { CUBE_NORTHWIND_MODEL } from '../fixtures/CubeNorthwindModel.js';
import { CubeEditorState } from '../CubeEditorState.js';

const CONTEXT = { model: CUBE_NORTHWIND_MODEL, runtime: NORTHWIND_RUNTIME };

/** ORDERS and CUSTOMERS side by side, ORDERS captured */
const twoTablesDocument = (): CubeDocument =>
  new CubeDocument({
    context: CONTEXT,
    query: new Query(
      [
        northwindTable('relational101', 'ORDERS', ORDERS_COLUMNS),
        northwindTable('relational102', 'CUSTOMERS', CUSTOMERS_COLUMNS),
      ],
      [],
      'relational101',
    ),
  });

const ORDERS_RESULT: CubeResult = {
  columns: ORDERS_COLUMNS.map((column) => column.name),
  rows: [ORDERS_COLUMNS.map(() => null)],
  sql: ['select * from NORTHWIND.ORDERS'],
  durationMs: 1,
};

beforeEach(() => {
  localStorage.clear();
});

describe('Cube undo', () => {
  test('Can undo only after a change, and an undo with nothing to undo changes nothing', () => {
    const state = new CubeEditorState(TEST__createCubeHost().host);
    const empty = state.document;
    expect(state.canUndo).toBe(false);
    state.undo();
    expect(state.document).toBe(empty);
    expect(state.history).toEqual([]);
    state.applyDocument(twoTablesDocument());
    expect(state.canUndo).toBe(true);
  });

  test('Undoing the first pick empties the query and drops the model and runtime', () => {
    const state = new CubeEditorState(TEST__createCubeHost().host);
    state.applyDocument(twoTablesDocument());
    state.undo();
    expect(state.document.query.nodes).toEqual([]);
    expect(state.document.context).toBeUndefined();
    expect(state.canUndo).toBe(false);
  });

  test('Steps back one change at a time, and adds no undo step of its own', () => {
    const state = new CubeEditorState(TEST__createCubeHost().host);
    const empty = state.document;
    const picked = twoTablesDocument();
    state.applyDocument(picked);
    state.select('relational102');
    state.applyDocument(state.document.withName('Orders'));
    expect(state.history).toHaveLength(3);

    state.undo();
    expect(state.document.name).toBeUndefined();
    expect(state.document.query.selected).toBe('relational102');
    expect(state.history).toHaveLength(2);
    state.undo();
    expect(state.document.query.selected).toBe('relational101');
    expect(state.document.query.nodes).toEqual(picked.query.nodes);
    expect(state.history).toEqual([empty]);
  });

  test('Restores the earlier query as a new object, so the rows that ran before the change show as stale', async () => {
    const { host, fake } = TEST__createCubeHost({ result: ORDERS_RESULT });
    const state = new CubeEditorState(host);
    state.applyDocument(twoTablesDocument());
    const ran = state.document.query;
    await flowResult(state.execution.execute());
    expect(state.execution.isStale).toBe(false);

    state.select('relational102');
    state.undo();
    // the same nodes and capture as the run, in a query of its own
    expect(state.document.query).not.toBe(ran);
    expect(state.document.query.nodes).toEqual(ran.nodes);
    expect(state.document.query.selected).toBe('relational101');
    expect(state.execution.isStale).toBe(true);
    expect(state.execution.result?.rows).toHaveLength(1);
    expect(fake.execute).toHaveBeenCalledTimes(1);
  });

  test("Drops the undone query's engine errors, on its nodes and in the results", async () => {
    const { host, fake } = TEST__createCubeHost();
    fake.execute.mockRejectedValue(
      new CubeEngineError(
        CubeEngineErrorKind.COMPILE,
        "Can't find column 'X'",
        'relational102',
      ),
    );
    const state = new CubeEditorState(host);
    state.applyDocument(twoTablesDocument());
    state.select('relational102');
    await flowResult(state.execution.execute());
    expect(state.hostIssues.get('relational102')?.firstLine).toBe(
      "Can't find column 'X'",
    );
    expect(state.execution.error).toBeDefined();

    state.undo();
    expect(state.hostIssues.size).toBe(0);
    expect(state.execution.error).toBeUndefined();
  });

  test('Keeps engine errors when it undoes a change that left the query alone', async () => {
    const { host, fake } = TEST__createCubeHost();
    fake.execute.mockRejectedValue(
      new CubeEngineError(
        CubeEngineErrorKind.COMPILE,
        "Can't find column 'X'",
        'relational101',
      ),
    );
    const state = new CubeEditorState(host);
    state.applyDocument(twoTablesDocument());
    await flowResult(state.execution.execute());
    const ran = state.document.query;
    state.applyDocument(state.document.withName('Orders'));
    state.undo();
    expect(state.document.name).toBeUndefined();
    expect(state.document.query).toBe(ran);
    expect(state.hostIssues.get('relational101')?.firstLine).toBe(
      "Can't find column 'X'",
    );
    expect(state.execution.error).toBeDefined();
  });
});
