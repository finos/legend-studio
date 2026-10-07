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
  CubeDocument,
  Query,
  RelationalTableSource,
  Schema,
} from '@finos/legend-cube';
import {
  DEFAULT_ROW_LIMIT,
  LEGEND_CUBE_USER_DATA_KEY,
  MAX_UNDO_STEPS,
} from '../../__lib__/LegendCubeLabels.js';
import { TEST__createCubeHost } from '../../__test-utils__/CubeTestApplication.js';
import {
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
