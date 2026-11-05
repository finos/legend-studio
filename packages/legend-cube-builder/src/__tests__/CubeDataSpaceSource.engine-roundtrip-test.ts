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
  ColumnComparisonFilter,
  Connection,
  DataSpaceSource,
  Filter,
  FilterOperator,
  type JsonObject,
  type ModelContext,
  Query,
  QueryEmitter,
  Schema,
} from '@finos/legend-cube';
import { CUBE_ENGINE_TEST__grammarToJson_lambda } from '../__test-utils__/CubeEngineTestSupport.js';
import { TEST__columnValues } from '../__test-utils__/CubeOperationsTestUtils.js';
import { CubeEngineError } from '../graph-manager/CubeEngine.js';
import { V1_createEngineBackedCubeEngine } from '../graph-manager/protocol/pure/v1/__test-utils__/V1_CubeEngineTestUtils.js';
import type { V1_LegendCubeEngine } from '../graph-manager/protocol/pure/v1/V1_LegendCubeEngine.js';
import { recheckCubeDataSpaceSources } from '../stores/CubeDataSpaceRecheck.js';
import { toPureSetupSqls } from '../stores/fixtures/CubeSampleSql.js';

// A data space source through the engine (PLAN §11.25), on Legend Query's
// COVID test data: a class mapped to an H2 table of two rows. The source
// holds the relation the query builder's typed writer writes; the engine
// types it without a mapping, and runs it with Cube's steps after it through
// `from(mapping, runtime)`.

const CLASS = 'covid::COVIDData';
const DATABASE = 'covid::CovidDataStore';
const MAPPING = 'covid::CovidDataMapping';
const RUNTIME = 'covid::H2Runtime';

const SETUP_SQLS = [
  'DROP TABLE IF EXISTS COVID_DATA;',
  'CREATE TABLE COVID_DATA(ID INT PRIMARY KEY, FIPS VARCHAR(200), DATE DATE, CASE_TYPE VARCHAR(200), CASES FLOAT, LAST_REPORTED_FLAG BIT);',
  "INSERT INTO COVID_DATA VALUES(1, '1', '2021-04-01', 'Confirmed', 405.34343, 0);",
  "INSERT INTO COVID_DATA VALUES(2, '2', '2021-04-01', 'Active', 290.2332233333, 1);",
];

const MODEL: ModelContext = {
  _type: 'text',
  code: `###Pure
Class ${CLASS}
{
  id: Integer[1];
  fips: String[0..1];
  date: StrictDate[0..1];
  caseType: String[0..1];
  cases: Float[0..1];
  lastReportedFlag: Boolean[0..1];
}


###Relational
Database ${DATABASE}
(
  Table COVID_DATA
  (
    ID INTEGER PRIMARY KEY,
    FIPS VARCHAR(200),
    DATE DATE,
    CASE_TYPE VARCHAR(200),
    CASES FLOAT,
    LAST_REPORTED_FLAG BIT
  )
)


###Mapping
Mapping ${MAPPING}
(
  ${CLASS}: Relational
  {
    ~mainTable [${DATABASE}]COVID_DATA
    id: [${DATABASE}]COVID_DATA.ID,
    fips: [${DATABASE}]COVID_DATA.FIPS,
    date: [${DATABASE}]COVID_DATA.DATE,
    caseType: [${DATABASE}]COVID_DATA.CASE_TYPE,
    cases: [${DATABASE}]COVID_DATA.CASES,
    lastReportedFlag: [${DATABASE}]COVID_DATA.LAST_REPORTED_FLAG
  }
)


###Connection
RelationalDatabaseConnection covid::CovidConnection
{
  store: ${DATABASE};
  type: H2;
  specification: LocalH2
  {
    testDataSetupSqls: [
${toPureSetupSqls(SETUP_SQLS)}
    ];
  };
  auth: DefaultH2;
}


###Runtime
Runtime ${RUNTIME}
{
  mappings:
  [
    ${MAPPING}
  ];
  connections:
  [
    ${DATABASE}:
    [
      connection_1: covid::CovidConnection
    ]
  ];
}
`,
};

/** The query builder's filter and columns, as its own lambda (TDS) and as the typed writer's relation */
const QUERY = `|${CLASS}.all()->filter(x|$x.caseType == 'Confirmed')->project([x|$x.caseType, x|$x.cases, x|$x.date], ['Case Type', 'Cases', 'Date'])`;
const RELATION = `|${CLASS}.all()->filter(x|$x.caseType == 'Confirmed')->project(~['Case Type': x|$x.caseType, Cases: x|$x.cases, Date: x|$x.date])`;

let engine: V1_LegendCubeEngine;

// the engine's spies are restored after each test
beforeEach(() => {
  engine = V1_createEngineBackedCubeEngine().engine;
});

/** A data space source the editor applied: the query builder's query and its relation */
const applied = async (relation = RELATION): Promise<DataSpaceSource> =>
  new DataSpaceSource('dataSpace101', {
    dataSpace: 'covid::CovidDataSpace',
    executionContext: 'default',
    entity: CLASS,
    query: (await CUBE_ENGINE_TEST__grammarToJson_lambda(QUERY)) as JsonObject,
    relation: (await CUBE_ENGINE_TEST__grammarToJson_lambda(
      relation,
    )) as JsonObject,
  });

/** The source, typed by the engine as the editor types it */
const typed = async (): Promise<DataSpaceSource> => {
  const source = await applied();
  const schema = (
    await recheckCubeDataSpaceSources(engine, MODEL, [source])
  ).get(source.id);
  if (!(schema instanceof Schema)) {
    throw schema ?? new Error(`No schema for ${source.id}`);
  }
  return source.withResolution({ kind: 'resolved', schema });
};

describe('Data space sources on the engine (PLAN §11.25)', () => {
  test("Types the query builder's relation without a mapping: its columns, as the class has them", async () => {
    const source = await typed();
    expect(
      source
        .schematize([])
        ?.columns.map((column) => [
          column.name,
          column.type.fullName,
          column.nullable,
        ]),
    ).toEqual([
      ['Case Type', 'String', true],
      ['Cases', 'Float', true],
      ['Date', 'StrictDate', true],
    ]);
  });

  test("Runs it with Cube's steps after it, through from(mapping, runtime), as one SQL statement", async () => {
    const source = await typed();
    const filter = new Filter(
      'filter101',
      new ColumnComparisonFilter('Cases', FilterOperator.GREATER_THAN, {
        kind: 'float',
        value: '100',
      }),
    );
    const query = new Query(
      [source, filter],
      [new Connection(source.id, filter.id, 'tds')],
      filter.id,
    );
    const result = await engine.execute(
      MODEL,
      new QueryEmitter(query).emitExecutionLambda({
        rowLimit: 1000,
        mapping: MAPPING,
        runtime: RUNTIME,
      }),
    );
    // of the two rows, the one Confirmed, which has over 100 cases
    expect(result.columns).toEqual(['Case Type', 'Cases', 'Date']);
    expect(TEST__columnValues(result, 'Case Type')).toEqual(['Confirmed']);
    expect(result.sql).toHaveLength(1);
    expect(result.sql[0]).toMatch(/CASE_TYPE\W*=\s*'Confirmed'/u);
    expect(result.sql[0]).toMatch(/CASES\W*>/u);
  });

  test('Fails a relation the model has no property for, as its own failure', async () => {
    const source = await applied(
      `|${CLASS}.all()->project(~[Nope: x|$x.nope])`,
    );
    const answer = (
      await recheckCubeDataSpaceSources(engine, MODEL, [source])
    ).get(source.id);
    expect(answer).toBeInstanceOf(CubeEngineError);
    expect((answer as CubeEngineError).message).toMatch(/nope/u);
  });
});
