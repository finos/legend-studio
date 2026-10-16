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
import {
  type PlainObject,
  guaranteeNonNullable,
  guaranteeType,
} from '@finos/legend-shared';
import {
  ENGINE_TEST_SUPPORT__getClassifierPathMapping,
  ENGINE_TEST_SUPPORT__getLambdaRelationType,
  ENGINE_TEST_SUPPORT__getSubtypeInfo,
  ENGINE_TEST_SUPPORT__grammarToJSON_model,
} from '../__test-utils__/EngineTestSupport.js';
import {
  TEST__buildGraphWithEntities,
  TEST__getTestGraphManagerState,
} from '../__test-utils__/GraphManagerTestUtils.js';
import type { GraphManagerState } from '../GraphManagerState.js';
import { buildRelationTypeFromRelationalRelation } from '../../graph/helpers/STO_Relational_RelationTypeHelper.js';
import { PrimitiveInstanceValue } from '../../graph/metamodel/pure/valueSpecification/InstanceValue.js';
import type { RelationType } from '../../graph/metamodel/pure/packageableElements/relation/RelationType.js';

// One column per relational type the grammar accepts, nullable and not, plus
// a view. `BINARY`/`VARBINARY` tables are covered separately: the engine can't
// type them at all.
const TEST_DATA__grammar = `###Relational
Database test::TypesDb
(
  Schema S
  (
    Table ALL_TYPES
    (
      ID INTEGER PRIMARY KEY,
      VC VARCHAR(10) NOT NULL,
      VC_NULL VARCHAR(20),
      CH CHAR(5),
      I INTEGER,
      BI BIGINT NOT NULL,
      SI SMALLINT,
      TI TINYINT,
      F FLOAT,
      D DOUBLE,
      R REAL,
      DEC DECIMAL(10, 2),
      NUM NUMERIC(12, 4),
      DT DATE,
      TS TIMESTAMP,
      B BIT,
      BOOL BOOLEAN,
      O OTHER,
      ARR ARRAY,
      SS SEMISTRUCTURED,
      J JSON,
      "quoted col" VARCHAR(3)
    )
    Table BIN
    (
      ID INTEGER PRIMARY KEY,
      PAYLOAD BINARY(16)
    )
    View V
    (
      ID: S.ALL_TYPES.ID PRIMARY KEY,
      VC: S.ALL_TYPES.VC,
      DEC: S.ALL_TYPES.DEC
    )
  )
)
`;

let graphManagerState: GraphManagerState;
let model: PlainObject;

beforeAll(async () => {
  graphManagerState = TEST__getTestGraphManagerState();
  await graphManagerState.graphManager.initialize({
    env: 'test',
    tabSize: 2,
    clientConfig: {},
    TEMPORARY__classifierPathMapping:
      await ENGINE_TEST_SUPPORT__getClassifierPathMapping(),
    TEMPORARY__subtypeInfo: await ENGINE_TEST_SUPPORT__getSubtypeInfo(),
  });
  model = (await ENGINE_TEST_SUPPORT__grammarToJSON_model(
    TEST_DATA__grammar,
    false,
  )) as PlainObject;
  await TEST__buildGraphWithEntities(
    graphManagerState,
    graphManagerState.graphManager.pureProtocolTextToEntities(
      JSON.stringify(model),
    ),
  );
});

const getEngineRelationType = async (path: string[]): Promise<PlainObject> =>
  ENGINE_TEST_SUPPORT__getLambdaRelationType(
    {
      _type: 'lambda',
      body: [{ _type: 'classInstance', type: '>', value: { path } }],
      parameters: [],
    },
    model,
  );

// name, type (resolved in the graph, so short and full paths compare
// equal), type parameters and multiplicity of each column
const describeEngineColumns = (relationType: PlainObject): unknown[] =>
  (relationType.columns as PlainObject[]).map((column) => {
    const genericType = column.genericType as PlainObject;
    const rawType = genericType.rawType as PlainObject;
    const multiplicity = column.multiplicity as PlainObject;
    return [
      column.name,
      graphManagerState.graph.getType(rawType.fullPath as string),
      ((genericType.typeVariableValues ?? []) as PlainObject[]).map(
        (value) => value.value,
      ),
      [multiplicity.lowerBound, multiplicity.upperBound],
    ];
  });

const describeLocalColumns = (relationType: RelationType): unknown[] =>
  relationType.columns.map((column) => [
    column.name,
    column.genericType.value.rawType,
    (column.genericType.value.typeVariableValues ?? []).map(
      (value) => guaranteeType(value, PrimitiveInstanceValue).values[0],
    ),
    [column.multiplicity.lowerBound, column.multiplicity.upperBound],
  ]);

const getSchema = () =>
  graphManagerState.graph
    .getDatabase('test::TypesDb')
    .schemas.find((schema) => schema.name === 'S');

describe('buildRelationTypeFromRelationalRelation matches the engine', () => {
  test('every column type of a table', async () => {
    const table = getSchema()?.tables.find((t) => t.name === 'ALL_TYPES');
    const local = buildRelationTypeFromRelationalRelation(
      guaranteeNonNullable(table),
      graphManagerState.graph,
    );

    expect(describeLocalColumns(local.relationType)).toEqual(
      describeEngineColumns(
        await getEngineRelationType(['test::TypesDb', 'S', 'ALL_TYPES']),
      ),
    );
  });

  test('view columns', async () => {
    const view = getSchema()?.views.find((v) => v.name === 'V');
    const local = buildRelationTypeFromRelationalRelation(
      guaranteeNonNullable(view),
      graphManagerState.graph,
    );

    expect(describeLocalColumns(local.relationType)).toEqual(
      describeEngineColumns(
        await getEngineRelationType(['test::TypesDb', 'S', 'V']),
      ),
    );
  });

  test('a table with a BINARY column: neither can type it', async () => {
    const table = getSchema()?.tables.find((t) => t.name === 'BIN');

    expect(() =>
      buildRelationTypeFromRelationalRelation(
        guaranteeNonNullable(table),
        graphManagerState.graph,
      ),
    ).toThrow(`Can't type column 'PAYLOAD' of table 'S.BIN'`);
    await expect(
      getEngineRelationType(['test::TypesDb', 'S', 'BIN']),
    ).rejects.toThrow();
  });
});
