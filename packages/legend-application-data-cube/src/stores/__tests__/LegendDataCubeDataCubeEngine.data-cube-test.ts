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

import { createSpy, unitTest } from '@finos/legend-shared/test';
import { beforeAll, describe, expect, jest, test } from '@jest/globals';
import {
  type PlainObject,
  guaranteeNonNullable,
  guaranteeType,
} from '@finos/legend-shared';
import {
  type V1_EngineServerClient,
  INTERNAL__TDSColumn,
  TabularDataSet,
  TDSBuilder,
  TDSExecutionResult,
  V1_ClassInstance,
  V1_PureGraphManager,
} from '@finos/legend-graph';
import { TEST__getTestGraphManagerState } from '@finos/legend-graph/test';
import { FreeformTDSExpressionDataCubeSource } from '@finos/legend-data-cube';
import type { DepotServerClient } from '@finos/legend-server-depot';
import type {
  LakehouseContractServerClient,
  LakehouseIngestServerClient,
} from '@finos/legend-server-lakehouse';
import type { LegendDataCubeApplicationStore } from '../LegendDataCubeBaseStore.js';
import type { LegendDataCubeDuckDBEngine } from '../LegendDataCubeDuckDBEngine.js';
import { LegendDataCubeDataCubeEngine } from '../LegendDataCubeDataCubeEngine.js';
import {
  LOCAL_FILE_QUERY_DATA_CUBE_SOURCE_TYPE,
  LocalFileDataCubeSource,
} from '../model/LocalFileDataCubeSource.js';

// `LegendDataCubeDuckDBEngine` uses `import.meta`, which jest can't parse; each
// test stubs the methods it needs on the instance the engine creates
// NOTE: the factory is hoisted above the `@jest/globals` import, so it must not
// reference `jest` itself - plain functions only
jest.mock('../LegendDataCubeDuckDBEngine', () => ({
  LegendDataCubeDuckDBEngine: function LegendDataCubeDuckDBEngine() {
    return {};
  },
}));

const graphManager = guaranteeType(
  TEST__getTestGraphManagerState().graphManager,
  V1_PureGraphManager,
);

beforeAll(async () => {
  // sets up the serialization of the synthesized model
  await graphManager.initialize({ env: 'test', tabSize: 2, clientConfig: {} });
});

// only the DuckDB engine, the graph manager, and the methods each test spies on
// are used here
const buildEngine = () =>
  new LegendDataCubeDataCubeEngine(
    {} as LegendDataCubeApplicationStore,
    {} as DepotServerClient,
    {} as V1_EngineServerClient,
    {} as LakehouseContractServerClient,
    {} as LakehouseIngestServerClient,
    graphManager,
  );

const getDuckDBEngine = (engine: LegendDataCubeDataCubeEngine) =>
  (
    engine as unknown as {
      _duckDBEngine: Partial<LegendDataCubeDuckDBEngine>;
    }
  )._duckDBEngine;

/**
 * Returns the columns of the (only) table of the synthesized model, as sent to
 * the engine.
 */
const getSynthesizedColumns = (model: PlainObject): PlainObject[] => {
  const database = guaranteeNonNullable(
    (model.elements as PlainObject[]).find(
      (element) => element._type === 'relational',
    ),
  );
  const schema = guaranteeNonNullable((database.schemas as PlainObject[])[0]);
  const table = guaranteeNonNullable((schema.tables as PlainObject[])[0]);
  return table.columns as PlainObject[];
};

describe(unitTest('Data Cube synthesized DuckDB table definitions'), () => {
  test('local file source columns keep their DuckDB types', async () => {
    const engine = buildEngine();
    // as DuckDB's DESCRIBE reports the columns of an ingested CSV file
    getDuckDBEngine(engine).retrieveCatalogTable = () => ({
      schemaName: 'main',
      tableName: 'ingest1',
      columns: [
        ['id', 'BIGINT'],
        ['active', 'BOOLEAN'],
        ['amount', 'DECIMAL(10,2)'],
        ['name', 'VARCHAR'],
        ['at', 'TIMESTAMP'],
      ],
    });
    createSpy(engine, '_getLambdaRelationType').mockResolvedValue({
      columns: [],
    });

    const source = guaranteeType(
      await engine.processSource({
        _type: LOCAL_FILE_QUERY_DATA_CUBE_SOURCE_TYPE,
        fileName: 'data.csv',
        fileFormat: 'csv',
        _ref: 'test-ref',
        columnNames: ['id', 'active', 'amount', 'name', 'at'],
      }),
      LocalFileDataCubeSource,
    );

    expect(getSynthesizedColumns(source.model)).toMatchObject([
      { name: 'id', type: { _type: 'BigInt' } },
      { name: 'active', type: { _type: 'Varchar' } },
      {
        name: 'amount',
        type: { _type: 'Decimal', precision: 10, scale: 2 },
      },
      { name: 'name', type: { _type: 'Varchar' } },
      { name: 'at', type: { _type: 'Timestamp' } },
    ]);
  });

  test('cached source columns keep their types', async () => {
    const engine = buildEngine();
    getDuckDBEngine(engine).cache = async () => ({
      schema: 'main',
      table: 'cache1',
      rowCount: 0,
    });
    // as the engine reports the columns of a relation result
    const builder = new TDSBuilder();
    builder.columns = [
      ['name', 'meta::pure::precisePrimitives::Varchar'],
      ['active', 'Boolean'],
      ['quantity', 'meta::pure::precisePrimitives::Int'],
      ['price', 'Decimal'],
      ['amount', 'meta::pure::precisePrimitives::Numeric'],
      ['day', 'StrictDate'],
      ['at', 'meta::pure::precisePrimitives::Timestamp'],
      ['updatedAt', 'DateTime'],
    ].map(([name, type]) => {
      const column = new INTERNAL__TDSColumn();
      column.name = guaranteeNonNullable(name);
      column.type = type;
      return column;
    });
    const result = new TDSExecutionResult();
    result.builder = builder;
    result.result = new TabularDataSet();
    createSpy(engine, 'executeQuery').mockResolvedValue({
      result,
      executedQuery: '',
      executedSQL: undefined,
      executionTime: 0,
    });

    const source = new FreeformTDSExpressionDataCubeSource();
    source.runtime = 'test::Runtime';
    source.model = {};
    source.query = new V1_ClassInstance();

    const cachedSource = guaranteeNonNullable(
      await engine.initializeCache(source),
    );

    expect(getSynthesizedColumns(cachedSource.model)).toMatchObject([
      { name: 'name', type: { _type: 'Varchar' } },
      { name: 'active', type: { _type: 'Bit' } },
      { name: 'quantity', type: { _type: 'Integer' } },
      {
        name: 'price',
        type: { _type: 'Decimal', precision: 18, scale: 3 },
      },
      { name: 'amount', type: { _type: 'Numeric' } },
      { name: 'day', type: { _type: 'Date' } },
      { name: 'at', type: { _type: 'Timestamp' } },
      { name: 'updatedAt', type: { _type: 'Timestamp' } },
    ]);
  });
});
