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

import type { PlainObject } from '@finos/legend-shared';

// A deployed data product's two documents, as the depot serves them, for
// Cube's tests. Their shapes are copied from legend-graph's
// TEST_DATA__DataProductAnalysis.ts (the artifact) and
// legend-extension-dsl-data-product's TEST_DATA__LakehouseDataProducts.ts
// (the definition); nothing is imported from another package's test utils

const P = 'meta::pure::precisePrimitives::';

/** A relation column, as the engine types it */
export const V1_TEST__relationColumn = (
  name: string,
  fullPath: string,
  params: number[] = [],
  lowerBound = 1,
): PlainObject => ({
  name,
  genericType: {
    rawType: { _type: 'packageableType', fullPath },
    typeArguments: [],
    multiplicityArguments: [],
    typeVariableValues: params.map((value) => ({ _type: 'integer', value })),
  },
  multiplicity: { lowerBound, upperBound: 1 },
});

/** A lambdaGenericType: a relation of these columns, under the outer type given */
export const V1_TEST__relationGenericType = (
  columns: PlainObject[],
  outer = 'meta::pure::metamodel::relation::Relation',
): PlainObject => ({
  rawType: { _type: 'packageableType', fullPath: outer },
  typeArguments: [
    {
      rawType: { _type: 'relationType', columns },
      typeArguments: [],
      multiplicityArguments: [],
      typeVariableValues: [],
    },
  ],
  multiplicityArguments: [],
  typeVariableValues: [],
});

const lambda = (parameters: PlainObject[] = []): PlainObject => ({
  _type: 'lambda',
  body: [],
  parameters,
});

const ORDERS_COLUMNS = [
  V1_TEST__relationColumn('ORDER_ID', `${P}Int`),
  V1_TEST__relationColumn('REGION', `${P}Varchar`, [200], 0),
  V1_TEST__relationColumn('AMOUNT', `${P}Numeric`, [10, 2], 0),
];

/** The orders product's definition, as its project holds it at the deployed version */
export const V1_TEST__ORDERS_DEFINITION: PlainObject = {
  _type: 'dataProduct',
  package: 'sales::products',
  name: 'OrdersProduct',
  title: 'Orders Product',
  accessPointGroups: [
    {
      _type: 'defaultAccessPointGroup',
      id: 'core',
      title: 'Core',
      accessPoints: [
        {
          _type: 'lakehouseAccessPoint',
          id: 'daily_orders',
          title: 'Daily orders',
          description: 'One row per order',
          targetEnvironment: 'Snowflake',
          func: lambda(),
        },
        {
          _type: 'lakehouseAccessPoint',
          id: 'orders_as_of',
          title: 'Orders as of a date',
          targetEnvironment: 'Snowflake',
          func: lambda([{ _type: 'var', name: 'asOf' }]),
        },
        {
          _type: 'functionAccessPoint',
          id: 'order_function',
          func: lambda(),
        },
        {
          _type: 'lakehouseAccessPoint',
          id: 'events',
          title: 'Order events',
          targetEnvironment: 'Snowflake',
          func: lambda(),
        },
        {
          _type: 'lakehouseAccessPoint',
          id: 'scalar',
          targetEnvironment: 'Snowflake',
          func: lambda(),
        },
        {
          _type: 'lakehouseAccessPoint',
          id: 'tags',
          targetEnvironment: 'Snowflake',
          func: lambda(),
        },
        {
          _type: 'lakehouseAccessPoint',
          id: 'nested',
          targetEnvironment: 'Snowflake',
          func: lambda(),
        },
        {
          _type: 'lakehouseAccessPoint',
          id: 'undeployed',
          targetEnvironment: 'Snowflake',
          func: lambda(),
        },
        { _type: 'laterAccessPoint', id: 'later', func: lambda() },
      ],
    },
    {
      _type: 'defaultAccessPointGroup',
      id: 'reference',
      title: 'Reference',
      accessPoints: [
        {
          _type: 'lakehouseAccessPoint',
          id: 'daily_orders',
          title: 'Daily customers',
          targetEnvironment: 'Snowflake',
          func: lambda(),
        },
      ],
    },
    {
      _type: 'modelAccessPointGroup',
      id: 'model',
      accessPoints: [
        {
          _type: 'lakehouseAccessPoint',
          id: 'modelled',
          targetEnvironment: 'Snowflake',
          func: lambda(),
        },
      ],
    },
  ],
};

/** The orders product's deployed artifact */
export const V1_TEST__ORDERS_ARTIFACT: PlainObject = {
  dataProduct: {
    path: 'sales::products::OrdersProduct',
    deploymentId: 'deployment-1234',
    title: 'Orders Product',
    dataProductType: { _type: 'laterDataProductType' },
  },
  accessPointGroups: [
    {
      id: 'core',
      accessPointImplementations: [
        {
          id: 'daily_orders',
          description: 'Deployed daily orders',
          resourceBuilder: [
            { _type: 'functionAccessPoint', functionGrammar: '|1' },
          ],
          lambdaGenericType: V1_TEST__relationGenericType(ORDERS_COLUMNS),
          relationElement: {
            columns: ['REGION', 'ORDER_ID', 'AMOUNT'],
            paths: [],
            rows: [1, 2, 3, 4, 5, 6, 7].map((id) => ({
              values: [id % 2 ? 'EMEA' : 'APAC', String(id), `${id}.50`],
            })),
          },
        },
        {
          id: 'orders_as_of',
          lambdaGenericType: V1_TEST__relationGenericType(ORDERS_COLUMNS),
        },
        {
          id: 'order_function',
          lambdaGenericType: V1_TEST__relationGenericType(ORDERS_COLUMNS),
        },
        {
          id: 'events',
          // as artifacts were generated before it became a list
          resourceBuilder: {
            _type: 'functionAccessPoint',
            functionGrammar: '|1',
          },
          lambdaGenericType: V1_TEST__relationGenericType(
            [
              V1_TEST__relationColumn('EVENT_ID', 'Integer'),
              V1_TEST__relationColumn('AT', `${P}Timestamp`),
              V1_TEST__relationColumn('DAY', 'StrictDate', [], 0),
              V1_TEST__relationColumn('RATE', `${P}Float4`, [], 0),
              V1_TEST__relationColumn(
                'PAYLOAD',
                'meta::pure::metamodel::variant::Variant',
                [],
                0,
              ),
              // a column with nothing but its type
              {
                name: 'NOTE',
                genericType: {
                  rawType: { _type: 'packageableType', fullPath: 'String' },
                },
                multiplicity: { lowerBound: 0, upperBound: 1 },
              },
            ],
            'meta::external::ingest::accessor::IngestRelationAccessor',
          ),
        },
        {
          id: 'scalar',
          lambdaGenericType: {
            rawType: { _type: 'packageableType', fullPath: 'String' },
          },
        },
        {
          id: 'tags',
          lambdaGenericType: V1_TEST__relationGenericType([
            // no upper bound: many values
            {
              name: 'TAG',
              genericType: {
                rawType: { _type: 'packageableType', fullPath: 'String' },
              },
              multiplicity: { lowerBound: 0 },
            },
          ]),
        },
        {
          id: 'nested',
          lambdaGenericType: V1_TEST__relationGenericType([
            {
              name: 'INNER',
              genericType: { rawType: { _type: 'relationType', columns: [] } },
              multiplicity: { lowerBound: 1, upperBound: 1 },
            },
          ]),
        },
        {
          id: 'later',
          lambdaGenericType: V1_TEST__relationGenericType(ORDERS_COLUMNS),
        },
        { id: 'only_in_artifact' },
      ],
    },
    {
      id: 'reference',
      accessPointImplementations: [
        {
          id: 'daily_orders',
          lambdaGenericType: V1_TEST__relationGenericType([
            V1_TEST__relationColumn('CUSTOMER_ID', `${P}Varchar`, [10]),
          ]),
        },
      ],
    },
    {
      _type: 'modelAccessPointGroup',
      id: 'model',
      accessPointImplementations: [
        {
          id: 'modelled',
          lambdaGenericType: V1_TEST__relationGenericType(ORDERS_COLUMNS),
        },
      ],
    },
  ],
};

/** A product of Lakehouse access points only, with no model group: definition and artifact */
export const V1_TEST__LAKEHOUSE_ONLY_DEFINITION: PlainObject = {
  _type: 'dataProduct',
  package: 'sales::products',
  name: 'CustomersProduct',
  accessPointGroups: [
    {
      _type: 'defaultAccessPointGroup',
      id: 'customers',
      accessPoints: [
        {
          _type: 'lakehouseAccessPoint',
          id: 'all_customers',
          targetEnvironment: 'Snowflake',
          func: lambda(),
        },
      ],
    },
  ],
};

export const V1_TEST__LAKEHOUSE_ONLY_ARTIFACT: PlainObject = {
  dataProduct: {
    path: 'sales::products::CustomersProduct',
    deploymentId: 'deployment-5678',
  },
  accessPointGroups: [
    {
      id: 'customers',
      accessPointImplementations: [
        {
          id: 'all_customers',
          resourceBuilder: [
            { _type: 'functionAccessPoint', functionGrammar: '|1' },
          ],
          lambdaGenericType: V1_TEST__relationGenericType([
            V1_TEST__relationColumn('CUSTOMER_ID', `${P}Varchar`, [10]),
          ]),
        },
      ],
    },
  ],
};
