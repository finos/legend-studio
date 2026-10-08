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

import {
  ColumnComparisonFilter,
  CompositeFilter,
  CompositeFilterOperator,
  Connection,
  Filter,
  FilterOperator,
  type FilterRule,
  Join,
  JoinType,
  PrimitiveType,
  Query,
  RelationalTableSource,
  Schema,
  SchemaColumn,
} from '@finos/legend-cube';

// Cube queries over Northwind, typed as the engine types the Cube fixture
// (PLAN §8.5), for the serializer's and the engine's tests

export const NORTHWIND_DATABASE =
  'showcase::northwind::store::NorthwindDatabase';
export const NORTHWIND_RUNTIME = 'showcase::northwind::mapping::StoreRuntime';

const P = 'meta::pure::precisePrimitives::';

const column = (
  name: string,
  path: string,
  nullable = true,
  params: number[] = [],
): SchemaColumn =>
  new SchemaColumn(name, PrimitiveType.get(path, params), nullable);
const varchar = (name: string, length: number, nullable = true): SchemaColumn =>
  column(name, `${P}Varchar`, nullable, [length]);
const smallInt = (name: string, nullable = true): SchemaColumn =>
  column(name, `${P}SmallInt`, nullable);
const date = (name: string): SchemaColumn => column(name, 'StrictDate');

export const ORDERS_COLUMNS = [
  smallInt('ORDER_ID', false),
  varchar('CUSTOMER_ID', 5),
  smallInt('EMPLOYEE_ID'),
  date('ORDER_DATE'),
  date('REQUIRED_DATE'),
  date('SHIPPED_DATE'),
  smallInt('SHIP_VIA'),
  column('FREIGHT', `${P}Double`),
  varchar('SHIP_NAME', 40),
  varchar('SHIP_ADDRESS', 60),
  varchar('SHIP_CITY', 15),
  varchar('SHIP_REGION', 15),
  varchar('SHIP_POSTAL_CODE', 10),
  varchar('SHIP_COUNTRY', 15),
];

export const CUSTOMERS_COLUMNS = [
  varchar('CUSTOMER_ID', 5, false),
  varchar('COMPANY_NAME', 40, false),
  varchar('CONTACT_NAME', 30),
  varchar('CONTACT_TITLE', 30),
  varchar('ADDRESS', 60),
  varchar('CITY', 15),
  varchar('REGION', 15),
  varchar('POSTAL_CODE', 10),
  varchar('COUNTRY', 15),
  varchar('PHONE', 24),
  varchar('FAX', 24),
];

export const northwindTable = (
  id: string,
  name: string,
  columns: SchemaColumn[],
): RelationalTableSource =>
  new RelationalTableSource(
    id,
    { database: NORTHWIND_DATABASE, schema: 'NORTHWIND', table: name },
    { kind: 'resolved', schema: new Schema(columns) },
  );

/** France since 1997, by employees 1 and 4 (PLAN §8.5) */
export const SLICE_FILTER: FilterRule = new CompositeFilter(
  CompositeFilterOperator.AND,
  [
    new ColumnComparisonFilter('SHIP_COUNTRY', FilterOperator.EQUAL, {
      kind: 'string',
      value: 'France',
    }),
    new ColumnComparisonFilter(
      'ORDER_DATE',
      FilterOperator.GREATER_THAN_OR_EQUAL,
      { kind: 'strictDate', value: '1997-01-01' },
    ),
    new ColumnComparisonFilter('EMPLOYEE_ID', FilterOperator.IN, [
      { kind: 'integer', value: '1' },
      { kind: 'integer', value: '4' },
    ]),
  ],
);

/** The slice (PLAN §8.5): ORDERS ⋈ CUSTOMERS on CUSTOMER_ID, then the filter, captured at the filter */
export const sliceQuery = (
  filter: FilterRule = SLICE_FILTER,
  joinType = JoinType.INNER,
): Query =>
  new Query(
    [
      northwindTable('relational101', 'ORDERS', ORDERS_COLUMNS),
      northwindTable('relational102', 'CUSTOMERS', CUSTOMERS_COLUMNS),
      new Join('join101', {
        leftColumns: ['CUSTOMER_ID'],
        rightColumns: ['CUSTOMER_ID'],
        joinType,
      }),
      new Filter('filter101', filter),
    ],
    [
      new Connection('relational101', 'join101', 'leftTds'),
      new Connection('relational102', 'join101', 'rightTds'),
      new Connection('join101', 'filter101', 'tds'),
    ],
    'filter101',
  );

/**
 * ORDERS ⟗ a CUSTOMERS-like table on CUSTOMER_ID, nullable on both sides with
 * different lengths (so `toOne()`, a merge and a cast), captured at the join
 */
export const fullJoinQuery = (): Query =>
  new Query(
    [
      northwindTable('relational101', 'ORDERS', ORDERS_COLUMNS),
      northwindTable('relational102', 'CUSTOMERS', [
        varchar('CUSTOMER_ID', 40),
        varchar('COMPANY_NAME', 40),
      ]),
      new Join('join101', {
        leftColumns: ['CUSTOMER_ID'],
        rightColumns: ['CUSTOMER_ID'],
        joinType: JoinType.FULL_OUTER,
      }),
    ],
    [
      new Connection('relational101', 'join101', 'leftTds'),
      new Connection('relational102', 'join101', 'rightTds'),
    ],
    'join101',
  );
