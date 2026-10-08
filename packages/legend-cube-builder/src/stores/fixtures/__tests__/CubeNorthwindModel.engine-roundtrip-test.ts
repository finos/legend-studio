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

import { describe, expect, test } from '@jest/globals';
import { ENGINE_TEST_SUPPORT__grammarToJSON_lambda } from '@finos/legend-graph/test';
import type { PlainObject } from '@finos/legend-shared';
import {
  CUBE_ENGINE_TEST__compile,
  CUBE_ENGINE_TEST__execute,
  CUBE_ENGINE_TEST__lambdaRelationTypeBatch,
} from '../../../__test-utils__/CubeEngineTestSupport.js';
import {
  CUBE_NORTHWIND_DATABASE,
  CUBE_NORTHWIND_MODEL,
  CUBE_NORTHWIND_RUNTIME,
} from '../CubeNorthwindModel.js';

// The Cube Northwind fixture on the engine (PLAN §6.2.4): it compiles, every
// table but the binary one types, and the CUBETEST rows read back as designed

const accessor = (schema: string, table: string): PlainObject => ({
  _type: 'lambda',
  parameters: [],
  body: [
    {
      _type: 'classInstance',
      type: '>',
      value: { path: [CUBE_NORTHWIND_DATABASE, schema, table] },
    },
  ],
});

const TABLES: Record<string, string[]> = {
  NORTHWIND: [
    'CATEGORIES',
    'CUSTOMERS',
    'CUSTOMER_CUSTOMER_DEMO',
    'CUSTOMER_DEMOGRAPHICS',
    'EMPLOYEES',
    'EMPLOYEE_TERRITORIES',
    'ORDERS',
    'ORDER_DETAILS',
    'PRODUCTS',
    'REGION',
    'SHIPPERS',
    'SUPPLIERS',
    'TERRITORIES',
    'US_STATES',
  ],
  CUBETEST: [
    'ALLTYPES',
    '"ORDER.LINES"',
    'PROBLEM_BINARY',
    'PROBLEM_CHAR',
    'PROBLEM_OTHER',
    'PROBLEM_VIEW',
    'EMP_REGION',
    'CUST_REGION',
    'CATEGORY_REGION',
    'KEY_VC15',
    'KEY_VC2',
    'KEY_DEC',
    'KEY_NUM',
  ],
  default: ['CUBETEST'],
};

const typeOf = async (
  lambdas: Record<string, PlainObject>,
): Promise<{
  result: PlainObject;
  errors: Record<string, { message: string }>;
}> =>
  (await CUBE_ENGINE_TEST__lambdaRelationTypeBatch({
    model: CUBE_NORTHWIND_MODEL,
    lambdas,
  })) as { result: PlainObject; errors: Record<string, { message: string }> };

const columnNames = (relationType: unknown): string[] =>
  (relationType as { columns: { name: string }[] }).columns.map(
    (column) => column.name,
  );

const rowsOf = async (pure: string): Promise<string> => {
  const response = await CUBE_ENGINE_TEST__execute({
    clientVersion: 'vX_X_X',
    function: await ENGINE_TEST_SUPPORT__grammarToJSON_lambda(pure),
    model: CUBE_NORTHWIND_MODEL,
    context: { _type: 'BaseExecutionContext' },
    parameterValues: [],
  });
  expect(response.status).toBe(200);
  return response.text();
};

describe('Cube Northwind fixture', () => {
  test('Compiles as a text model', async () => {
    expect(
      await CUBE_ENGINE_TEST__compile(CUBE_NORTHWIND_MODEL),
    ).toHaveProperty('message', 'OK');
  });

  test('Types every table in one call, and only the table with a binary column fails, alone', async () => {
    const lambdas = Object.fromEntries(
      Object.entries(TABLES).flatMap(([schema, tables]) =>
        tables.map((table) => [`${schema}.${table}`, accessor(schema, table)]),
      ),
    );
    const { result, errors } = await typeOf(lambdas);
    expect(Object.keys(errors)).toEqual(['CUBETEST.PROBLEM_BINARY']);
    expect(Object.keys(result).sort()).toEqual(
      Object.keys(lambdas)
        .filter((key) => key !== 'CUBETEST.PROBLEM_BINARY')
        .sort(),
    );
    expect(columnNames(result['CUBETEST.ALLTYPES'])).toEqual([
      'ID',
      'TI',
      'SI',
      'BI',
      'F',
      'D',
      'DEC',
      'NUM',
      'DT',
      'TS',
      'B',
      'VC',
    ]);
  });

  test("Reads a quoted, dotted table from a JSON path, and the decoy from that path's Pure text", async () => {
    // PLAN §6.2.1: the path must never go through Pure text
    const { result, errors } = await typeOf({
      json: accessor('CUBETEST', '"ORDER.LINES"'),
      unquoted: accessor('CUBETEST', 'ORDER.LINES'),
      text: await ENGINE_TEST_SUPPORT__grammarToJSON_lambda(
        `|#>{${CUBE_NORTHWIND_DATABASE}.CUBETEST."ORDER.LINES"}#`,
      ),
    });
    expect(columnNames(result.json)).toEqual(['LINE_ID', 'RIGHT_COL']);
    expect(columnNames(result.text)).toEqual(['WRONG_TABLE']);
    expect(errors.unquoted?.message).toContain(
      "Can't find table 'ORDER.LINES' in schema 'CUBETEST'",
    );
  });

  test('Reads back the ALLTYPES rows as designed, numbers as written', async () => {
    const text = await rowsOf(
      `|#>{${CUBE_NORTHWIND_DATABASE}.CUBETEST.ALLTYPES}#->from(${CUBE_NORTHWIND_RUNTIME})`,
    );
    expect(text).toContain(
      '[1,1,100,4,1.5,2.5,12.34,1.2345,"2024-01-02","2024-01-02T03:04:05.678000000+0000",true,"abc"]',
    );
    expect(text).toContain(
      '[2,2,200,9007199254740993,2.5,0.1,1.25,2.5000,"2024-01-03","2024-01-02T13:00:00.000000000+0000",false,"xyz"]',
    );
    expect(text).toContain(
      '[3,null,null,null,null,null,null,null,null,null,null,null]',
    );
  });
});
