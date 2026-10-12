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

import { resolveCubeType, Schema, SchemaColumn } from '@finos/legend-cube';
import type {
  CubeModelOutline,
  CubeOutlineFunction,
} from '../graph-manager/CubeEngine.js';
import {
  NORTHWIND_DATABASE,
  NORTHWIND_RUNTIME,
} from './CubeNorthwindTestQueries.js';
import { FAKE_NORTHWIND_OUTLINE } from './FakeCubeEngine.js';

// The fake Northwind outline with functions that return a relation (PLAN
// §6.5), and a second runtime: one function of each kind

export const ARCHIVE_RUNTIME = 'northwind::ArchiveRuntime';

const fn = (
  name: string,
  parameters: CubeOutlineFunction['parameters'] = [],
  extra: Partial<CubeOutlineFunction> = {},
): CubeOutlineFunction => ({
  path: `northwind::${name}`,
  signature: `northwind::${name}__Relation_1_`,
  parameters,
  columns: [{ name: 'ORDER_ID', type: 'Integer' }],
  ...extra,
});

export const ALL_ORDERS = fn('allOrders');
export const ORDERS_ABOVE = fn('ordersAbove', [
  { name: 'min', type: 'Float', multiplicity: '[1]' },
  { name: 'status', type: 'String', multiplicity: '[0..1]' },
]);
export const SHIPPED = fn('shipped', [], { runtime: NORTHWIND_RUNTIME });
export const ARCHIVED = fn('archived', [], { runtime: ARCHIVE_RUNTIME });
export const ORDERS_OF = fn(
  'ordersOf',
  [{ name: 'ids', type: 'Integer', multiplicity: '[*]' }],
  {
    problem:
      'Its parameter "ids" takes [*] values; Cube takes one value, or none',
  },
);

export const FUNCTIONS_OUTLINE: CubeModelOutline = {
  ...FAKE_NORTHWIND_OUTLINE,
  runtimes: [
    ...FAKE_NORTHWIND_OUTLINE.runtimes,
    {
      path: ARCHIVE_RUNTIME,
      storePaths: [NORTHWIND_DATABASE],
      connections: [
        { storePath: NORTHWIND_DATABASE, databaseType: 'Postgres' },
      ],
    },
  ],
  functions: [ALL_ORDERS, ORDERS_ABOVE, SHIPPED, ARCHIVED, ORDERS_OF],
};

export const FUNCTION_SCHEMA = new Schema([
  new SchemaColumn('ORDER_ID', resolveCubeType('Integer'), true),
]);
