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
import type { Schema } from '@finos/legend-cube';
import {
  V1_DataProductArtifact,
  V1_dataProductModelSchema,
} from '@finos/legend-graph';
import type { PlainObject } from '@finos/legend-shared';
import { readFileSync } from 'fs';
import { resolve } from 'path';
import { deserialize } from 'serializr';
import { CubeDataProductEnvironmentType } from '../../../../CubeDataProduct.js';
import { CubeDataProductCandidate } from '../../../../CubeDataProductCatalog.js';
import {
  V1_TEST__LAKEHOUSE_ONLY_ARTIFACT,
  V1_TEST__LAKEHOUSE_ONLY_DEFINITION,
  V1_TEST__ORDERS_ARTIFACT,
  V1_TEST__ORDERS_DEFINITION,
  V1_TEST__relationColumn,
  V1_TEST__relationGenericType,
} from '../__test-utils__/V1_CubeDataProductFixtures.js';
import {
  V1_CUBE_ACCESS_POINT_REASON,
  V1_findCubeAccessPointSchema,
  V1_readCubeDataProductDescription,
} from '../V1_CubeDataProductArtifact.js';
import { V1_buildCubeSchema } from '../V1_CubeRelationTypeAdapter.js';

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

const accessPointOf = (group: string, id: string) =>
  DESCRIPTION.groups
    .find((candidate) => candidate.id === group)
    ?.accessPoints.find((point) => point.id === id);

/** A schema's columns, as name, type and nullability */
const columnsOf = (schema: Schema | undefined): string[] =>
  (schema?.columns ?? []).map(
    (column) =>
      `${column.name} ${column.type.fullName}${column.nullable ? '?' : ''}`,
  );

describe("A deployed data product's access points", () => {
  test('Lists every access point of its definition, by group, and which can be picked', () => {
    expect(
      DESCRIPTION.groups.map((group) => [
        group.id,
        group.title,
        group.accessPoints.map((point) => [
          point.id,
          point.isPickable ? 'pickable' : point.disabledReason,
        ]),
      ]),
    ).toEqual([
      [
        'core',
        'Core',
        [
          ['daily_orders', 'pickable'],
          ['orders_as_of', V1_CUBE_ACCESS_POINT_REASON.PARAMETERS],
          ['order_function', V1_CUBE_ACCESS_POINT_REASON.NOT_LAKEHOUSE],
          ['events', 'pickable'],
          ['scalar', V1_CUBE_ACCESS_POINT_REASON.NO_RELATION],
          ['tags', V1_CUBE_ACCESS_POINT_REASON.BAD_MULTIPLICITY('TAG')],
          ['nested', `Column "INNER" has a type Cube can't read`],
          ['undeployed', V1_CUBE_ACCESS_POINT_REASON.NOT_DEPLOYED],
          ['later', V1_CUBE_ACCESS_POINT_REASON.NOT_LAKEHOUSE],
        ],
      ],
      ['reference', 'Reference', [['daily_orders', 'pickable']]],
      [
        'model',
        undefined,
        [['modelled', V1_CUBE_ACCESS_POINT_REASON.MODEL_GROUP]],
      ],
    ]);
  });

  test('Pairs an access point with its deployment by group and id, so two groups may share an id', () => {
    expect(columnsOf(accessPointOf('core', 'daily_orders')?.schema)).toEqual([
      'ORDER_ID meta::pure::precisePrimitives::Int',
      'REGION meta::pure::precisePrimitives::Varchar(200)?',
      'AMOUNT meta::pure::precisePrimitives::Numeric(10,2)?',
    ]);
    expect(
      columnsOf(accessPointOf('reference', 'daily_orders')?.schema),
    ).toEqual(['CUSTOMER_ID meta::pure::precisePrimitives::Varchar(10)']);
    expect(accessPointOf('core', 'daily_orders')?.title).toBe('Daily orders');
    expect(accessPointOf('core', 'daily_orders')?.description).toBe(
      'One row per order',
    );
  });

  test("Reads columns under an ingest accessor, short and full type paths, and columns with only their type, from an older artifact's single resource builder", () => {
    expect(columnsOf(accessPointOf('core', 'events')?.schema)).toEqual([
      'EVENT_ID Integer',
      'AT meta::pure::precisePrimitives::Timestamp',
      'DAY StrictDate?',
      'RATE meta::pure::precisePrimitives::Float4?',
      'PAYLOAD meta::pure::metamodel::variant::Variant?',
      'NOTE String?',
    ]);
  });

  test("Shows up to five of the artifact's sample rows, in the columns' order", () => {
    const { sampleRows } = accessPointOf('core', 'daily_orders') ?? {};
    expect(sampleRows).toHaveLength(5);
    expect(sampleRows?.[0]).toEqual(['1', 'EMEA', '1.50']);
    expect(accessPointOf('reference', 'daily_orders')?.sampleRows).toEqual([]);
  });

  test('Opens a product of Lakehouse access points only, with no model group', () => {
    const description = V1_readCubeDataProductDescription(
      CANDIDATE,
      V1_TEST__LAKEHOUSE_ONLY_ARTIFACT,
      V1_TEST__LAKEHOUSE_ONLY_DEFINITION,
    );
    expect(
      description.groups.flatMap((group) =>
        group.accessPoints.map((point) => [point.id, point.isPickable]),
      ),
    ).toEqual([['all_customers', true]]);
  });

  test("Lists a product whose definition can't be read, with nothing to pick", () => {
    const description = V1_readCubeDataProductDescription(
      CANDIDATE,
      V1_TEST__ORDERS_ARTIFACT,
      undefined,
    );
    const points = description.groups.flatMap((group) => group.accessPoints);
    expect(points.length).toBeGreaterThan(0);
    points.forEach((point) =>
      expect(point.disabledReason).toBe(
        V1_CUBE_ACCESS_POINT_REASON.NO_DEFINITION,
      ),
    );
  });

  test('Reads nothing it does not understand into an error', () => {
    [undefined, null, 'text', [], { accessPointGroups: 'many' }].forEach(
      (value) =>
        expect(() =>
          V1_readCubeDataProductDescription(CANDIDATE, value, value),
        ).not.toThrow(),
    );
  });

  test("Finds a saved source's schema, or says why it has none", () => {
    const location = {
      dataProduct: 'sales::products::OrdersProduct',
      accessPointGroup: 'reference',
      accessPoint: 'daily_orders',
    };
    expect(
      columnsOf(V1_findCubeAccessPointSchema(DESCRIPTION, location) as Schema),
    ).toEqual(['CUSTOMER_ID meta::pure::precisePrimitives::Varchar(10)']);
    expect(
      V1_findCubeAccessPointSchema(DESCRIPTION, {
        ...location,
        accessPointGroup: 'core',
        accessPoint: 'orders_as_of',
      }),
    ).toBe(V1_CUBE_ACCESS_POINT_REASON.PARAMETERS);
    expect(
      V1_findCubeAccessPointSchema(DESCRIPTION, {
        ...location,
        accessPoint: 'gone',
      }),
    ).toBe('The data product has no access point "gone" in group "reference"');
  });

  test("Types every Northwind table as the engine's relation type does", () => {
    const { tables } = JSON.parse(
      readFileSync(
        resolve(
          __dirname,
          '../../../../../__tests__/CubeNorthwindRelationTypes.json',
        ),
        'utf-8',
      ),
    ) as {
      tables: Record<
        string,
        {
          columns: {
            name: string;
            type: string;
            parameters: number[];
            multiplicity: string;
          }[];
        }
      >;
    };
    const typed = Object.entries(tables).filter(([, { columns }]) => columns);
    expect(typed.length).toBeGreaterThan(10);
    typed.forEach(([table, { columns }]) => {
      const relationColumns = columns.map((column) =>
        V1_TEST__relationColumn(
          column.name,
          column.type,
          column.parameters,
          column.multiplicity === '[0..1]' ? 0 : 1,
        ),
      );
      const description = V1_readCubeDataProductDescription(
        CANDIDATE,
        {
          accessPointGroups: [
            {
              id: 'g',
              accessPointImplementations: [
                {
                  id: 'ap',
                  lambdaGenericType:
                    V1_TEST__relationGenericType(relationColumns),
                },
              ],
            },
          ],
        },
        {
          accessPointGroups: [
            {
              id: 'g',
              accessPoints: [
                {
                  _type: 'lakehouseAccessPoint',
                  id: 'ap',
                  func: { parameters: [] },
                },
              ],
            },
          ],
        },
      );
      const schema = description.groups[0]?.accessPoints[0]?.schema;
      const bare = V1_buildCubeSchema({
        _type: 'relationType',
        columns: relationColumns,
      });
      expect([table, schema?.isIdenticalTo(bare)]).toEqual([table, true]);
    });
  });

  test("Uses fixtures legend-graph's own serializers read", () => {
    const plainArtifact: PlainObject = {
      dataProduct: { path: 'sales::products::CustomersProduct' },
      accessPointGroups: (
        V1_TEST__LAKEHOUSE_ONLY_ARTIFACT.accessPointGroups as PlainObject[]
      ).map((group) => group),
    };
    expect(
      V1_DataProductArtifact.serialization.fromJson(plainArtifact)
        .accessPointGroups[0]?.accessPointImplementations[0]?.id,
    ).toBe('all_customers');
    expect(
      deserialize(
        V1_dataProductModelSchema([]),
        V1_TEST__LAKEHOUSE_ONLY_DEFINITION,
      ).accessPointGroups[0]?.accessPoints[0]?.id,
    ).toBe('all_customers');
  });
});
