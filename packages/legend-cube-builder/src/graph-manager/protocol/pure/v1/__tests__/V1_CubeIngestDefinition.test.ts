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

import { beforeAll, describe, expect, test } from '@jest/globals';
import { PrimitiveType, type Schema } from '@finos/legend-cube';
import {
  IngestDefinition,
  IngestionAccessor,
  PrimitiveInstanceValue,
} from '@finos/legend-graph';
import {
  TEST__buildGraphWithEntities,
  TEST__getTestGraphManagerState,
} from '@finos/legend-graph/test';
import { guaranteeType, type PlainObject } from '@finos/legend-shared';
import type { CubeIngestDataSet } from '../../../../CubeIngestCatalog.js';
import {
  V1_CUBE_INGEST_DATA_SET_REASON,
  V1_readCubeIngestDataSets,
} from '../V1_CubeIngestDefinition.js';

// A deployed ingest definition's data sets, typed from what it declares, as
// legend-graph types them for Legend Query (#5598). The content follows the
// shape of legend-graph's own ingest accessor tests

interface TestColumn {
  name: string;
  path: string;
  params?: number[];
  multiplicity?: { lowerBound: number; upperBound?: number };
}

const column = (
  name: string,
  path: string,
  params: number[] = [],
  multiplicity: { lowerBound: number; upperBound?: number } = {
    lowerBound: 1,
    upperBound: 1,
  },
): TestColumn => ({ name, path, params, multiplicity });

const dataSet = (
  name: string,
  columns: TestColumn[],
  writeMode?: string,
): PlainObject => ({
  name,
  primaryKey: columns.slice(0, 1).map((each) => each.name),
  source: {
    _type: 'ingestSource',
    schema: {
      _type: 'schema',
      columns: columns.map((each) => ({
        name: each.name,
        genericType: {
          rawType: { _type: 'packageableType', fullPath: each.path },
          typeArguments: [],
          multiplicityArguments: [],
          typeVariableValues: (each.params ?? []).map((value) => ({
            _type: 'integer',
            value,
          })),
        },
        multiplicity: each.multiplicity,
      })),
    },
  },
  ...(writeMode ? { writeMode: { _type: writeMode } } : {}),
});

const TRADES = dataSet('TRADES', [
  column('TRADE_ID', 'meta::pure::precisePrimitives::BigInt'),
  column('DESK', 'meta::pure::precisePrimitives::Varchar', [20]),
  column('PRICE', 'Numeric', [18, 4], { lowerBound: 0, upperBound: 1 }),
  column('QUANTITY', 'meta::pure::metamodel::type::Integer'),
  column('TRADED_ON', 'StrictDate'),
]);

const CONTENT: PlainObject = {
  writeMode: { _type: 'batch_milestoned' },
  datasets: [
    TRADES,
    dataSet(
      'DESKS',
      [column('DESK', 'String')],
      'batch_milestoned_business_temporal',
    ),
    dataSet('FLAGS', [column('FLAG', 'Boolean')], 'append_only'),
    {
      name: 'DAILY',
      primaryKey: [],
      source: {
        _type: 'FunctionSource',
        function: { _type: 'lambda', body: [], parameters: [] },
      },
    },
    dataSet('EMPTY', []),
    dataSet('TAGS', [column('TAG', 'String', [], { lowerBound: 0 })]),
    dataSet('COLORS', [column('COLOR', 'test::Color')]),
    dataSet('CLASH', [column('LAKE_IN_ID', 'Integer')]),
    { name: 'NO_SOURCE', primaryKey: [] },
    { name: 'NO_SCHEMA', primaryKey: [], source: { _type: 'ingestSource' } },
  ],
};

/** A schema as `name: type?` lines, nullable columns marked */
const describeSchema = (schema: Schema | undefined): string[] =>
  (schema?.columns ?? []).map(
    (each) => `${each.name}: ${each.type.fullName}${each.nullable ? '?' : ''}`,
  );

const byName = (
  dataSets: CubeIngestDataSet[],
  name: string,
): CubeIngestDataSet | undefined => dataSets.find((each) => each.name === name);

describe("An ingest definition's data sets", () => {
  const dataSets = V1_readCubeIngestDataSets(CONTENT);

  test('Lists every data set, in order, with its primary key', () => {
    expect(dataSets.map((each) => each.name)).toEqual([
      'TRADES',
      'DESKS',
      'FLAGS',
      'DAILY',
      'EMPTY',
      'TAGS',
      'COLORS',
      'CLASH',
      'NO_SOURCE',
      'NO_SCHEMA',
    ]);
    expect(byName(dataSets, 'TRADES')?.primaryKey).toEqual(['TRADE_ID']);
  });

  test('Types declared columns by full path or name, parameters kept, then adds the columns of the write mode', () => {
    const trades = byName(dataSets, 'TRADES');
    expect(trades?.isPickable).toBe(true);
    // the definition's write mode, batch milestoned
    expect(describeSchema(trades?.schema)).toEqual([
      'TRADE_ID: meta::pure::precisePrimitives::BigInt',
      'DESK: meta::pure::precisePrimitives::Varchar(20)',
      'PRICE: meta::pure::precisePrimitives::Numeric(18,4)?',
      'QUANTITY: Integer',
      'TRADED_ON: StrictDate',
      'LAKE_IN_ID: Integer',
      'LAKE_OUT_ID: Integer',
      'LAKE_DIGEST: String',
    ]);
    // its own write mode first: business temporal adds the business dates
    expect(describeSchema(byName(dataSets, 'DESKS')?.schema)).toEqual([
      'DESK: String',
      'LAKE_IN_ID: Integer',
      'LAKE_OUT_ID: Integer',
      'LAKE_DIGEST: String',
      'LAKE_FROM: meta::pure::precisePrimitives::Timestamp',
      'LAKE_THRU: meta::pure::precisePrimitives::Timestamp',
    ]);
    // append only adds none
    expect(describeSchema(byName(dataSets, 'FLAGS')?.schema)).toEqual([
      'FLAG: Boolean',
    ]);
    expect(byName(dataSets, 'TRADES')?.schema?.columns[3]?.type).toBe(
      PrimitiveType.get('Integer'),
    );
  });

  test('Lists the data sets Cube cannot read, with the reason, and never types a column as text', () => {
    const reasons = Object.fromEntries(
      dataSets
        .filter((each) => !each.isPickable)
        .map((each) => [each.name, each.disabledReason]),
    );
    expect(reasons).toEqual({
      DAILY: V1_CUBE_INGEST_DATA_SET_REASON.MATERIALIZED_VIEW,
      EMPTY: V1_CUBE_INGEST_DATA_SET_REASON.NO_COLUMNS,
      TAGS: V1_CUBE_INGEST_DATA_SET_REASON.BAD_MULTIPLICITY('TAG'),
      COLORS: V1_CUBE_INGEST_DATA_SET_REASON.UNKNOWN_TYPE(
        'COLOR',
        'test::Color',
      ),
      CLASH: expect.stringContaining('LAKE_IN_ID'),
      NO_SOURCE: V1_CUBE_INGEST_DATA_SET_REASON.NO_COLUMNS,
      NO_SCHEMA: V1_CUBE_INGEST_DATA_SET_REASON.NO_COLUMNS,
    });
    dataSets
      .filter((each) => !each.isPickable)
      .forEach((each) => expect(each.schema).toBeUndefined());
    expect(
      V1_CUBE_INGEST_DATA_SET_REASON.UNKNOWN_TYPE('COLOR', 'test::Color'),
    ).toBe(`Column "COLOR" has a type Cube doesn't know: test::Color`);
  });

  test('Names an unknown type with its parameters', () => {
    const [unknown] = V1_readCubeIngestDataSets({
      datasets: [dataSet('ODD', [column('ODD', 'my::Decimal', [9, 2])])],
    });
    expect(unknown?.disabledReason).toBe(
      V1_CUBE_INGEST_DATA_SET_REASON.UNKNOWN_TYPE('ODD', 'my::Decimal(9, 2)'),
    );
  });

  test('Has no data sets when the definition declares none', () => {
    expect(V1_readCubeIngestDataSets({})).toEqual([]);
  });
});

/**
 * A type's name: legend-graph names precise primitives by their short name
 * only (PLAN §11.3, M2.0), so paths compare by their last segment
 */
const lastSegment = (path: string): string =>
  path.slice(path.lastIndexOf(':') + 1);

describe("An ingest definition's data sets, as legend-graph types them", () => {
  const graphManagerState = TEST__getTestGraphManagerState();

  beforeAll(async () => {
    await TEST__buildGraphWithEntities(graphManagerState, []);
  });

  test('Have the columns, types, parameters and nullability Legend Query gives them', async () => {
    const definition = new IngestDefinition('OrdersIngest');
    definition.content = CONTENT;
    const cube = V1_readCubeIngestDataSets(CONTENT).filter(
      (each) => each.isPickable,
    );
    expect(cube.length).toBe(3);
    for (const each of cube) {
      const accessor = guaranteeType(
        await graphManagerState.graphManager.createAccessorFromPackageableElement(
          definition,
          graphManagerState.graph,
          { schemaName: undefined, tableName: each.name },
        ),
        IngestionAccessor,
      );
      const graphColumns = accessor.relationType.columns.map((graphColumn) => {
        const params = (
          graphColumn.genericType.value.typeVariableValues ?? []
        ).map(
          (value) => guaranteeType(value, PrimitiveInstanceValue).values[0],
        );
        return {
          name: graphColumn.name,
          type: lastSegment(graphColumn.genericType.value.rawType.path),
          params,
          nullable: graphColumn.multiplicity.lowerBound === 0,
        };
      });
      expect(
        (each.schema?.columns ?? []).map((cubeColumn) => ({
          name: cubeColumn.name,
          type: lastSegment(cubeColumn.type.path),
          params:
            cubeColumn.type instanceof PrimitiveType
              ? [...cubeColumn.type.params]
              : [],
          nullable: cubeColumn.nullable,
        })),
      ).toEqual(graphColumns);
    }
  });
});
