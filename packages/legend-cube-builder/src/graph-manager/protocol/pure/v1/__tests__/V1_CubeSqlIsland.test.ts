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
import { printIR } from '@finos/legend-cube';
import { V1_readCubeLambda } from '../V1_CubeLambdaReader.js';
import { V1_serializeCubeLambda } from '../V1_CubeLambdaSerializer.js';
import {
  V1_findCubeSqlSources,
  V1_findCubeSqlVariables,
} from '../V1_CubeSqlIsland.js';

// The engine's SQL island, `#SQL{…}#`, as JSON and as text: its SQL kept as
// written, and what Cube finds in it without parsing it

describe("An SQL island's JSON and text", () => {
  test('Reads to an IR that prints and writes back as the engine wrote it', () => {
    const sql = "select * from var('rows')\nwhere A > 1";
    const island = { _type: 'classInstance', type: 'SQL', value: { sql } };
    const ir = V1_readCubeLambda({
      _type: 'lambda',
      parameters: [],
      body: [
        {
          _type: 'func',
          function: 'limit',
          parameters: [island, { _type: 'integer', value: 5 }],
        },
      ],
    });
    expect(printIR(ir)).toContain(`#SQL{${sql}}#`);
    expect(V1_serializeCubeLambda(ir)).toMatchObject({
      body: [{ function: 'limit', parameters: [island, {}] }],
    });
  });

  test('Finds the names SQL reads, each once, in order', () => {
    expect(
      V1_findCubeSqlVariables(
        "select * from var('b') x join VAR( 'a' ) y on x.K = y.K where x.D > var('b')",
      ),
    ).toEqual(['b', 'a']);
    expect(V1_findCubeSqlVariables('select variance(A) from t')).toEqual([]);
  });

  test('Finds the data sets and access points SQL names, each once, as legend-graph does', () => {
    expect(
      V1_findCubeSqlSources(
        "select * from i('a::Ingest.ORDERS') o join i('a::Ingest.ORDERS') o2 on 1 = 1 join p('a::Product.orders') q on 1 = 1 join tb('a::Db.S.T') t on 1 = 1",
      ),
    ).toEqual({
      dataSets: [['a::Ingest', 'ORDERS']],
      accessPoints: [['a::Product', 'orders']],
    });
    expect(V1_findCubeSqlSources('select 1')).toEqual({
      dataSets: [],
      accessPoints: [],
    });
  });
});
