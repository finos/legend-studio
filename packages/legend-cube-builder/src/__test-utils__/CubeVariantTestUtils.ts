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
import { expect } from '@jest/globals';
import {
  CubeDocument,
  PrimitiveType,
  Query,
  SchemaColumn,
} from '@finos/legend-cube';
import { flowResult } from 'mobx';
import type { CubeResult } from '../graph-manager/CubeEngine.js';
import { CubeEditorState } from '../stores/CubeEditorState.js';
import { CUBE_NORTHWIND_MODEL } from '../stores/fixtures/CubeNorthwindModel.js';
import { TEST__createCubeHost } from './CubeTestApplication.js';
import {
  NORTHWIND_RUNTIME,
  northwindTable,
} from './CubeNorthwindTestQueries.js';
import {
  createFakeNorthwindOutline,
  type FakeCubeEngine,
} from './FakeCubeEngine.js';

// A cube whose rows hold a Variant column, PAYLOAD, for Explore JSON's tests
// (PLAN §11.20): Northwind's ORDERS as a table of a model whose runtime runs on
// the database type given

export const TEST__PAYLOAD = new SchemaColumn(
  'PAYLOAD',
  PrimitiveType.get('Variant'),
  true,
);

const COLUMNS = [
  new SchemaColumn(
    'ORDER_ID',
    PrimitiveType.get('meta::pure::precisePrimitives::Int'),
    false,
  ),
  TEST__PAYLOAD,
  // a name an offer would take, in another case
  new SchemaColumn('PAYLOAD_TAGS_COUNT', PrimitiveType.get('Integer'), true),
];

export const TEST__PAYLOAD_DOCUMENTS = [
  '{"user":{"name":"ann","tier":"gold"},"tags":["a","b"]}',
  '{"user":{"name":"bob"},"tags":[]}',
];

/** The engine's answer to a read of PAYLOAD: these documents, one per row */
export const TEST__payloadSample = (
  documents: readonly string[] = TEST__PAYLOAD_DOCUMENTS,
): CubeResult => ({
  columns: ['PAYLOAD'],
  rows: documents.map((document) => [document]),
  sql: [],
  durationMs: 1,
});

/** The table alone, run once on a database of this type; later runs read the sample */
export const TEST__setUpPayloadRun = async (
  databaseType = 'DuckDB',
  sample: CubeResult = TEST__payloadSample(),
): Promise<{ state: CubeEditorState; fake: FakeCubeEngine }> => {
  const { host, fake } = TEST__createCubeHost({
    result: {
      columns: COLUMNS.map((column) => column.name),
      rows: [['1', TEST__PAYLOAD_DOCUMENTS[0] ?? null, '2']],
      sql: [],
      durationMs: 1,
    },
    outline: createFakeNorthwindOutline(databaseType),
  });
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
  expect(state.execution.result).toBeDefined();
  fake.execute.mockResolvedValue(sample);
  return { state, fake };
};
