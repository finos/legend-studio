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
import {
  elementPtr,
  func,
  lambda,
  literal,
  type ModelContext,
  Schema,
} from '@finos/legend-cube';
import type { PlainObject } from '@finos/legend-shared';
import {
  CUBE_DATA_PRODUCT_RUNTIME_PATH,
  CubeDataProductEnvironmentType,
} from '../graph-manager/CubeDataProduct.js';
import { CubeDataProductCandidate } from '../graph-manager/CubeDataProductCatalog.js';
import {
  V1_TEST__ORDERS_ARTIFACT,
  V1_TEST__ORDERS_DEFINITION,
} from '../graph-manager/protocol/pure/v1/__test-utils__/V1_CubeDataProductFixtures.js';
import { V1_createEngineBackedCubeEngine } from '../graph-manager/protocol/pure/v1/__test-utils__/V1_CubeEngineTestUtils.js';
import { V1_readCubeDataProductDescription } from '../graph-manager/protocol/pure/v1/V1_CubeDataProductArtifact.js';
import { createTextModel } from '../stores/LocalModelCatalog.js';

// The open-source engine reads no data product construct (PLAN §6.8), so a
// data product's access point is stood in for by a Pure function declaring
// the relation type its deployed artifact gives, over an H2 table. This
// checks, on the engine, that Cube reads the artifact's types as the engine
// types such a function, and that a run reads through a runtime at Cube's
// fixed path. Its own schema, so it can run beside the other engine tests

const SCHEMA = 'CUBE_DP_STANDIN';
const DATABASE = 'cube::standin::Db';

/** The access points stood in for: their group, id, and the H2 table behind them */
const STANDINS = [
  {
    group: 'core',
    accessPoint: 'daily_orders',
    table: 'ORDERS',
    columns:
      'ORDER_ID INTEGER PRIMARY KEY, REGION VARCHAR(200), AMOUNT DECIMAL(10,2)',
  },
  {
    group: 'reference',
    accessPoint: 'daily_orders',
    table: 'CUSTOMERS',
    columns: 'CUSTOMER_ID VARCHAR(10) PRIMARY KEY',
  },
];

const CANDIDATE = new CubeDataProductCandidate({
  id: 'ORDERS_PRODUCT',
  deploymentId: 'deployment-1234',
  dataProductPath: 'sales::products::OrdersProduct',
  title: 'Orders Product',
  groupId: 'com.example.sales',
  artifactId: 'orders-products',
  versionId: '1.4.0',
  environmentType: CubeDataProductEnvironmentType.PRODUCTION,
});

const DESCRIPTION = V1_readCubeDataProductDescription(
  CANDIDATE,
  V1_TEST__ORDERS_ARTIFACT,
  V1_TEST__ORDERS_DEFINITION,
);

const artifactSchemaOf = (group: string, accessPoint: string): Schema => {
  const schema = DESCRIPTION.groups
    .find((candidate) => candidate.id === group)
    ?.accessPoints.find((point) => point.id === accessPoint)?.schema;
  expect(schema).toBeInstanceOf(Schema);
  return schema as Schema;
};

/** The artifact's sample rows of the core access point, as SQL values */
const ORDER_ROWS = (
  (
    (V1_TEST__ORDERS_ARTIFACT.accessPointGroups as PlainObject[])[0]
      ?.accessPointImplementations as PlainObject[]
  )[0]?.relationElement as { rows: { values: string[] }[] }
).rows.map(({ values: [region, id, amount] }) => [id, region, amount] as const);

interface RawRelationColumn {
  name: string;
  genericType: {
    rawType: { fullPath: string };
    typeVariableValues?: { value: number }[];
  };
  multiplicity: { lowerBound: number };
}

/**
 * The relation type an access point's deployed artifact declares, as Pure
 * writes it, read from the fixture's JSON itself rather than through Cube,
 * e.g. `REGION:meta::pure::precisePrimitives::Varchar(200)[0..1]`
 */
const declaredTypeOf = (group: string, accessPoint: string): string => {
  const implementation = (
    (V1_TEST__ORDERS_ARTIFACT.accessPointGroups as PlainObject[]).find(
      (each) => each.id === group,
    )?.accessPointImplementations as PlainObject[]
  ).find((each) => each.id === accessPoint) as {
    lambdaGenericType: {
      typeArguments: { rawType: { columns: RawRelationColumn[] } }[];
    };
  };
  const [relation] = implementation.lambdaGenericType.typeArguments;
  return (relation?.rawType.columns ?? [])
    .map(({ name, genericType, multiplicity }) => {
      const params = (genericType.typeVariableValues ?? []).map(
        ({ value }) => value,
      );
      const type = `${genericType.rawType.fullPath}${params.length ? `(${params.join(',')})` : ''}`;
      return `${name}:${type}[${multiplicity.lowerBound === 0 ? '0..1' : '1'}]`;
    })
    .join(', ');
};

const functionPathOf = (group: string, accessPoint: string): string =>
  `cube::standin::${group}_${accessPoint}__`;

/** The stand-in model: the H2 tables, a function per access point, and the runtime at Cube's fixed path */
const MODEL: ModelContext = createTextModel(
  [
    '###Relational',
    `Database ${DATABASE}`,
    '(',
    `  Schema ${SCHEMA}`,
    '  (',
    ...STANDINS.map(({ table, columns }) => `    Table ${table} (${columns})`),
    '  )',
    ')',
    '',
    '###Pure',
    ...STANDINS.map(({ group, accessPoint, table }) =>
      [
        `function ${functionPathOf(group, accessPoint)}(): meta::pure::metamodel::relation::Relation<(${declaredTypeOf(group, accessPoint)})>[1]`,
        '{',
        `  #>{${DATABASE}.${SCHEMA}.${table}}#`,
        '}',
      ].join('\n'),
    ),
    '',
    '###Connection',
    'RelationalDatabaseConnection cube::standin::Connection',
    '{',
    `  store: ${DATABASE};`,
    '  type: H2;',
    `  specification: LocalH2 { testDataSetupSqls: [${[
      `drop schema if exists ${SCHEMA} cascade`,
      `create schema ${SCHEMA}`,
      ...STANDINS.map(
        ({ table, columns }) => `create table ${SCHEMA}.${table} (${columns})`,
      ),
      `insert into ${SCHEMA}.ORDERS values ${ORDER_ROWS.map(
        ([id, region, amount]) => `(${id}, \\'${region}\\', ${amount})`,
      ).join(', ')}`,
    ]
      .map((sql) => `'${sql}'`)
      .join(', ')}]; };`,
    '  auth: DefaultH2;',
    '}',
    '',
    '###Runtime',
    `Runtime ${CUBE_DATA_PRODUCT_RUNTIME_PATH}`,
    '{',
    '  mappings: [];',
    `  connections: [ ${DATABASE}: [ connection: cube::standin::Connection ] ];`,
    '}',
  ].join('\n'),
);

describe('Data product stand-ins, on the engine', () => {
  test("Types each stand-in, declared with the artifact's types, as Cube reads them from the artifact", async () => {
    const { engine } = V1_createEngineBackedCubeEngine();
    const typed = await engine.typeLambdas(
      MODEL,
      new Map(
        STANDINS.map(({ group, accessPoint }, index) => [
          `dataProductAccessPoint10${index + 1}`,
          lambda([], [func(functionPathOf(group, accessPoint), [])]),
        ]),
      ),
    );
    STANDINS.forEach(({ group, accessPoint }, index) => {
      const schema = typed.get(`dataProductAccessPoint10${index + 1}`);
      expect(schema).toBeInstanceOf(Schema);
      expect(
        (schema as Schema).isIdenticalTo(artifactSchemaOf(group, accessPoint)),
      ).toBe(true);
    });
  });

  test('Types the tables behind the stand-ins as the artifact declares, parameters and nullability included', async () => {
    const { engine } = V1_createEngineBackedCubeEngine();
    const typed = await engine.resolveSchemas(
      MODEL,
      new Map(
        STANDINS.map(({ table }, index) => [
          `relational10${index + 1}`,
          [DATABASE, SCHEMA, table] as const,
        ]),
      ),
    );
    STANDINS.forEach(({ group, accessPoint }, index) => {
      const schema = typed.get(`relational10${index + 1}`);
      expect(schema).toBeInstanceOf(Schema);
      expect(
        (schema as Schema).isIdenticalTo(artifactSchemaOf(group, accessPoint)),
      ).toBe(true);
    });
  });

  test("Runs a stand-in through a runtime at Cube's fixed path", async () => {
    const { engine } = V1_createEngineBackedCubeEngine();
    const result = await engine.execute(
      MODEL,
      lambda(
        [],
        [
          func('from', [
            func('limit', [
              func(functionPathOf('core', 'daily_orders'), []),
              literal({ kind: 'integer', value: '100' }),
            ]),
            elementPtr(CUBE_DATA_PRODUCT_RUNTIME_PATH),
          ]),
        ],
      ),
    );
    const ids = result.rows.map(
      (row) => row[result.columns.indexOf('ORDER_ID')],
    );
    expect(new Set(ids)).toEqual(new Set(ORDER_ROWS.map(([id]) => id)));
    expect(result.rows).toHaveLength(ORDER_ROWS.length);
  });
});
