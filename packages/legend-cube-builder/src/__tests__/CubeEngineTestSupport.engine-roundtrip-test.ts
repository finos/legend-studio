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
import {
  CUBE_ENGINE_TEST__compile,
  CUBE_ENGINE_TEST__execute,
  CUBE_ENGINE_TEST__getCommit,
  CUBE_ENGINE_TEST__jsonToGrammar_lambda,
  CUBE_ENGINE_TEST__lambdaRelationTypeBatch,
} from '../__test-utils__/CubeEngineTestSupport.js';

// The engine calls Cube's engine tests make, against a small model (PLAN §3.4)

const MODEL = {
  _type: 'text',
  code: `###Relational
Database test::Db
(
  Schema S
  (
    Table T (ID INTEGER PRIMARY KEY, BI BIGINT, AMT DECIMAL(10,2))
  )
)
###Connection
RelationalDatabaseConnection test::Connection
{
  store: test::Db;
  type: H2;
  specification: LocalH2
  {
    testDataSetupSqls: [
      'drop schema if exists S cascade;',
      'create schema S;',
      'create table S.T (ID INTEGER PRIMARY KEY, BI BIGINT, AMT DECIMAL(10,2));',
      'insert into S.T values (1, 9007199254740993, 12.30);'
    ];
  };
  auth: DefaultH2;
}
###Runtime
Runtime test::Runtime
{
  mappings: [];
  connectionStores: [ test::Connection: [ test::Db ] ];
}
`,
};

describe('Cube engine test support', () => {
  test('Reads the commit of the engine', async () => {
    expect(await CUBE_ENGINE_TEST__getCommit()).toMatch(/^[0-9a-f]{40}$/u);
  });

  test('Compiles a text model, and reports one that does not compile', async () => {
    expect(await CUBE_ENGINE_TEST__compile(MODEL)).toHaveProperty(
      'message',
      'OK',
    );
    await expect(
      CUBE_ENGINE_TEST__compile({
        _type: 'text',
        code: '###Pure\nClass test::A { x: NoSuchType[1]; }',
      }),
    ).rejects.toThrow('400');
  });

  test('Types a batch of lambdas, keyed as given, under result', async () => {
    const response = await CUBE_ENGINE_TEST__lambdaRelationTypeBatch({
      model: MODEL,
      lambdas: {
        table:
          await ENGINE_TEST_SUPPORT__grammarToJSON_lambda('|#>{test::Db.S.T}#'),
      },
    });
    expect(Object.keys(response)).toContain('result');
    expect(Object.keys(response.result as object)).toEqual(['table']);
  });

  test('Renders a lambda as Pure text', async () => {
    const lambda =
      await ENGINE_TEST_SUPPORT__grammarToJSON_lambda('|#>{test::Db.S.T}#');
    expect(await CUBE_ENGINE_TEST__jsonToGrammar_lambda(lambda)).toBe(
      '|#>{test::Db.S.T}#',
    );
  });

  test('Executes a query and gives its body unread, numbers as the engine wrote them', async () => {
    const response = await CUBE_ENGINE_TEST__execute({
      clientVersion: 'vX_X_X',
      function: await ENGINE_TEST_SUPPORT__grammarToJSON_lambda(
        '|#>{test::Db.S.T}#->from(test::Runtime)',
      ),
      model: MODEL,
      context: { _type: 'BaseExecutionContext', enableConstraints: true },
      parameterValues: [],
    });
    expect([response.ok, response.status]).toEqual([true, 200]);
    // past 2^53, and with the scale of its column: lost by JSON.parse
    expect(await response.text()).toContain('[1,9007199254740993,12.30]');
  });
});
