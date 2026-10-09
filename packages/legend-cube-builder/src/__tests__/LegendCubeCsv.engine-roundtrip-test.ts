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
import type { RelationalTableSource } from '@finos/legend-cube';
import { guaranteeNonNullable } from '@finos/legend-shared';
import { flowResult } from 'mobx';
import { TEST__createCubeHost } from '../__test-utils__/CubeTestApplication.js';
import { CubeDirectDatabaseType } from '../graph-manager/CubeConnectionExplorer.js';
import { V1_createEngineBackedCubeConnectionExplorer } from '../graph-manager/protocol/pure/v1/__test-utils__/V1_CubeConnectionExplorerTestUtils.js';
import { V1_createEngineBackedCubeEngine } from '../graph-manager/protocol/pure/v1/__test-utils__/V1_CubeEngineTestUtils.js';
import { CubeEditorState } from '../stores/CubeEditorState.js';
import type { CubeHost } from '../stores/CubeHost.js';
import { CUBE_CSV_SCHEMA } from '../stores/source-picker/CubeCsvSetupSql.js';
import { CubeDirectConnectionTabState } from '../stores/source-picker/CubeDirectConnectionTabState.js';

// A CSV loaded into an in-memory DuckDB connection, on the real engine
// (:6300): the database connection tab writes it into the setup SQL as a
// table, reads the database, types the table and runs the cube. The table
// has its own name, so this can run beside the other engine tests

const TABLE = 'cube_csv_e2e';

const CSV = [
  'id,big,price,active,day,at,code,note,order,missing',
  '1,9007199254740993,2.5,true,2024-02-29,2024-01-02 03:04:05,007,"O\'Brien, ""Jr""",a,',
  '2,1,-0.125,false,1999-12-31,2024-01-02T23:59:59,042,"two lines;\nhere",b,',
].join('\n');

const createHost = (): CubeHost => {
  const { host } = TEST__createCubeHost();
  const { engine } = V1_createEngineBackedCubeEngine();
  const { explorer } = V1_createEngineBackedCubeConnectionExplorer();
  return { ...host, engine, connectionExplorer: explorer };
};

const settle = async (
  done: () => boolean,
  timeoutMs = 20_000,
): Promise<void> => {
  const start = Date.now();
  while (!done()) {
    if (Date.now() - start > timeoutMs) {
      throw new Error('Timed out');
    }
    await new Promise((resolve) => setTimeout(resolve, 10));
  }
};

beforeEach(() => {
  localStorage.clear();
});

describe('A CSV loaded into DuckDB', () => {
  test('Becomes a table the cube types and runs, every value as the CSV holds it', async () => {
    const state = new CubeEditorState(createHost());
    const tab = new CubeDirectConnectionTabState(state);
    tab.setDatabaseType(CubeDirectDatabaseType.DUCKDB);
    tab.setCsvText(CSV);
    tab.setCsvTableName(TABLE);
    expect(tab.addCsv()).toBe(true);
    await flowResult(tab.testConnection());
    expect(tab.error).toBeUndefined();
    expect(tab.schemas).toContain(CUBE_CSV_SCHEMA);
    tab.selectSchema(CUBE_CSV_SCHEMA);
    await settle(() => !tab.isListing);
    expect(tab.tables.map((table) => table.name)).toContain(TABLE);
    tab.selectTable(
      tab.tables.find((table) => table.name === TABLE)?.storedName,
    );
    expect(await flowResult(tab.confirm())).toBe(true);
    expect(tab.error).toBeUndefined();
    const source = guaranteeNonNullable(
      state.document.query.nodes.at(-1),
    ) as RelationalTableSource;
    const schema =
      source.resolution.kind === 'resolved'
        ? source.resolution.schema
        : undefined;
    expect(
      Object.fromEntries(
        (schema?.columns ?? []).map((column) => [
          column.name,
          column.type.fullName.replace(/^meta::pure::precisePrimitives::/u, ''),
        ]),
      ),
    ).toEqual(
      expect.objectContaining({
        id: 'Int',
        big: 'BigInt',
        price: 'Double',
        active: 'Boolean',
        day: 'StrictDate',
        at_: 'Timestamp',
      }),
    );
    expect(schema?.columns.map((column) => column.name)).toEqual([
      'id',
      'big',
      'price',
      'active',
      'day',
      'at_',
      'code',
      'note',
      'order_',
      'missing',
    ]);
    await flowResult(state.execution.execute());
    expect(state.execution.error).toBeUndefined();
    const result = guaranteeNonNullable(state.execution.result);
    const names = result.schema.columns.map((column) => column.name);
    const rows = result.rows
      .map((row) =>
        Object.fromEntries(
          names.map((name, index) => [name, String(row[index] ?? null)]),
        ),
      )
      .sort((a, b) => Number(a.id) - Number(b.id));
    expect(rows).toEqual([
      {
        id: '1',
        big: '9007199254740993',
        price: '2.5',
        active: 'true',
        day: '2024-02-29',
        at_: expect.stringMatching(/^2024-01-02T03:04:05/u),
        code: '007',
        note: 'O\'Brien, "Jr"',
        order_: 'a',
        missing: 'null',
      },
      {
        id: '2',
        big: '1',
        price: '-0.125',
        active: 'false',
        day: '1999-12-31',
        at_: expect.stringMatching(/^2024-01-02T23:59:59/u),
        code: '042',
        note: 'two lines;\nhere',
        order_: 'b',
        missing: 'null',
      },
    ]);
  });
});
