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
import { listOrigins } from '../../__test-utils__/CubeIRTestUtils.js';
import { column } from '../../__test-utils__/CubeTestNodes.js';
import { unitTest } from '../../__test-utils__/CubeTestUtils.js';
import { FilterOperator } from '../../filter/FilterOperator.js';
import { ColumnComparisonFilter } from '../../filter/FilterTree.js';
import { Connection } from '../../graph/Connection.js';
import { Query } from '../../graph/Query.js';
import {
  DATA_PRODUCT_ACCESS_POINT_SOURCE_DEFINITION,
  FILTER_DEFINITION,
  JOIN_DEFINITION,
  NodeRegistry,
  RELATIONAL_TABLE_SOURCE_DEFINITION,
} from '../../nodes/NodeRegistry.js';
import { DataProductAccessPointSource } from '../../nodes/sources/DataProductAccessPointSource.js';
import { Filter } from '../../nodes/transforms/Filter.js';
import { Join } from '../../nodes/transforms/Join.js';
import { Schema } from '../../schema/Schema.js';
import { printIR } from '../IRPrinter.js';
import { QueryEmitter } from '../QueryEmitter.js';

// Data product access points (PLAN §6.8) emit as their accessor; everything
// downstream emits as it does over database tables. The source isn't in the
// default registry yet, so these pass one with it

const REGISTRY = new NodeRegistry([
  RELATIONAL_TABLE_SOURCE_DEFINITION,
  DATA_PRODUCT_ACCESS_POINT_SOURCE_DEFINITION,
  FILTER_DEFINITION,
  JOIN_DEFINITION,
]);

const RUNTIME = 'cube::dataProduct::Runtime';

const accessPoint = (
  id: string,
  name: string,
  columns: string[],
): DataProductAccessPointSource =>
  new DataProductAccessPointSource(
    id,
    {
      dataProduct: 'sales::products::OrdersProduct',
      accessPointGroup: 'core',
      accessPoint: name,
      dataProductId: 'ORDERS_PRODUCT',
      deploymentId: '1234',
    },
    {
      kind: 'resolved',
      schema: new Schema(columns.map((each) => column(each, 'String'))),
    },
  );

describe(unitTest('Query emitter over data products'), () => {
  test('Runs one access point as its accessor, limited, from the runtime', () => {
    const query = new Query(
      [accessPoint('dataProductAccessPoint101', 'daily_orders', ['ID'])],
      [],
      'dataProductAccessPoint101',
    );
    const emitter = new QueryEmitter(query, REGISTRY);
    expect(emitter.emitRelation('dataProductAccessPoint101')).toStrictEqual({
      k: 'dataProductAccessor',
      path: ['sales::products::OrdersProduct', 'daily_orders'],
      origin: { nodeId: 'dataProductAccessPoint101', role: 'accessor' },
    });
    expect(
      printIR(emitter.emitExecutionLambda({ rowLimit: 10, runtime: RUNTIME })),
    ).toBe(
      '{| #P{sales::products::OrdersProduct.daily_orders}#->limit(11)->from(cube::dataProduct::Runtime)}',
    );
  });

  test('Joins and filters access points as it does tables, every call stamped', () => {
    const query = new Query(
      [
        accessPoint('dataProductAccessPoint101', 'daily_orders', [
          'ID',
          'CUSTOMER',
        ]),
        accessPoint('dataProductAccessPoint102', 'customers', [
          'CUSTOMER',
          'REGION',
        ]),
        new Join('join101', {
          leftColumns: ['CUSTOMER'],
          rightColumns: ['CUSTOMER'],
        }),
        new Filter(
          'filter101',
          new ColumnComparisonFilter('REGION', FilterOperator.EQUAL, {
            kind: 'string',
            value: 'EMEA',
          }),
        ),
      ],
      [
        new Connection('dataProductAccessPoint101', 'join101', 'leftTds'),
        new Connection('dataProductAccessPoint102', 'join101', 'rightTds'),
        new Connection('join101', 'filter101', 'tds'),
      ],
      'filter101',
    );
    const lambda = new QueryEmitter(query, REGISTRY).emitExecutionLambda({
      rowLimit: 10,
      runtime: RUNTIME,
    });
    const printed = printIR(lambda);
    expect(printed).toContain(
      '#P{sales::products::OrdersProduct.daily_orders}#',
    );
    expect(printed).toContain('#P{sales::products::OrdersProduct.customers}#');
    expect(printed).toContain("->filter({row | $row.REGION == 'EMEA'})");
    expect(printed.endsWith('->from(cube::dataProduct::Runtime)}')).toBe(true);
    const origins = listOrigins(lambda);
    expect(origins).toContain(
      '#P{sales::products::OrdersProduct.daily_orders}#@dataProductAccessPoint101:accessor',
    );
    expect(origins).toContain(
      '#P{sales::products::OrdersProduct.customers}#@dataProductAccessPoint102:accessor',
    );
    expect(origins.filter((origin) => origin.endsWith('@-'))).toEqual([]);
  });
});
