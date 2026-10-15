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
  Extend,
  MESSAGE_VARIANT_UNSUPPORTED_DATABASE,
  PrimitiveType,
  Query,
  SchemaColumn,
} from '@finos/legend-cube';
import type { DataGridGetContextMenuItemsParams } from '@finos/legend-lego/data-grid';
import { flowResult } from 'mobx';
import { TEST__createCubeHost } from '../../../__test-utils__/CubeTestApplication.js';
import {
  NORTHWIND_RUNTIME,
  northwindTable,
} from '../../../__test-utils__/CubeNorthwindTestQueries.js';
import { createFakeNorthwindOutline } from '../../../__test-utils__/FakeCubeEngine.js';
import { getCubeGridContextMenuItems } from '../../../components/grid/CubeResultGrid.js';
import type { CubeResultValue } from '../../../graph-manager/CubeEngine.js';
import { CUBE_NORTHWIND_MODEL } from '../../fixtures/CubeNorthwindModel.js';
import { CubeEditorState } from '../../CubeEditorState.js';
import {
  getCubeJsonParseCode,
  getCubeJsonParseName,
  isCubeJsonDocumentText,
} from '../CubeJsonParse.js';

const COLUMNS = [
  new SchemaColumn('ID', PrimitiveType.get('Integer'), false),
  new SchemaColumn('DOC', PrimitiveType.get('String'), true),
];
const ROW: CubeResultValue[] = ['1', '{"a": [1, 2]}'];

/** A cube whose text column DOC holds JSON, run once on a database of this type */
const setUp = async (databaseType = 'DuckDB'): Promise<CubeEditorState> => {
  const { host, fake } = TEST__createCubeHost({
    result: { columns: ['ID', 'DOC'], rows: [ROW], sql: [], durationMs: 1 },
    outline: createFakeNorthwindOutline(databaseType),
  });
  fake.parseExpression.mockImplementation(async (code) =>
    Promise.resolve({
      lambda: { _type: 'lambda', parameters: [], body: [], code },
      located: {},
    }),
  );
  const state = new CubeEditorState(
    host,
    new CubeDocument({
      context: { model: CUBE_NORTHWIND_MODEL, runtime: NORTHWIND_RUNTIME },
      query: new Query(
        [northwindTable('relational101', 'ORDERS', COLUMNS)],
        [],
        'relational101',
      ),
    }),
  );
  await flowResult(state.execution.execute());
  // the model's databases, as the menu reads them
  await flowResult(state.loadModelOutline());
  return state;
};

type MenuItems = ReturnType<
  typeof getCubeGridContextMenuItems<readonly CubeResultValue[]>
>;

const menuOf = (
  state: CubeEditorState,
  row: CubeResultValue[] = ROW,
): MenuItems =>
  getCubeGridContextMenuItems<readonly CubeResultValue[]>(state, {
    column: { getColId: () => 'c1' },
    node: { data: row },
    defaultItems: [],
  } as unknown as DataGridGetContextMenuItemsParams<
    readonly CubeResultValue[]
  >);

const parseItem = (items: MenuItems): MenuItems[number] | undefined =>
  items.find(
    (item) => typeof item === 'object' && item.name === 'Parse as JSON',
  );

beforeEach(() => {
  localStorage.clear();
});

describe('Parse as JSON (PLAN §11.20)', () => {
  test("Reads a text column's documents with fromJson(), into <name>_json", () => {
    expect(getCubeJsonParseName('DOC')).toBe('DOC_json');
    expect(getCubeJsonParseCode('DOC')).toBe('x | $x.DOC->toOne()->fromJson()');
    expect(getCubeJsonParseCode('a doc')).toBe(
      "x | $x.'a doc'->toOne()->fromJson()",
    );
  });

  test('Is offered on text holding a JSON object or array only', () => {
    expect(isCubeJsonDocumentText('{"a": 1}')).toBe(true);
    expect(isCubeJsonDocumentText(' [1, 2] ')).toBe(true);
    expect(isCubeJsonDocumentText('"a"')).toBe(false);
    expect(isCubeJsonDocumentText('12')).toBe(false);
    expect(isCubeJsonDocumentText('{oops')).toBe(false);
  });

  test("Adds the column from a JSON text cell's menu, after the node that ran, once the engine parses it", async () => {
    const state = await setUp();
    const item = parseItem(menuOf(state));
    expect(item).toMatchObject({ disabled: false });
    if (typeof item === 'object') {
      item.action?.({} as never);
    }
    await new Promise((resolve) => setTimeout(resolve, 0));
    const { query } = state.document;
    const extend = query.getNode(query.selected ?? '') as Extend;
    expect(extend).toBeInstanceOf(Extend);
    expect(extend.columns).toEqual([
      {
        name: 'DOC_json',
        code: 'x | $x.DOC->toOne()->fromJson()',
        lambda: {
          _type: 'lambda',
          parameters: [],
          body: [],
          code: 'x | $x.DOC->toOne()->fromJson()',
        },
      },
    ]);
    expect(query.getInputIds(extend.id)).toEqual(['relational101']);
  });

  test('Is not offered on text that is not a JSON document, and is refused where JSON is not read', async () => {
    const state = await setUp();
    expect(parseItem(menuOf(state, ['1', 'France']))).toBeUndefined();
    expect(parseItem(menuOf(state, ['1', null]))).toBeUndefined();
    const h2 = await setUp('H2');
    expect(parseItem(menuOf(h2))).toMatchObject({
      disabled: true,
      tooltip: MESSAGE_VARIANT_UNSUPPORTED_DATABASE('H2'),
    });
  });
});
