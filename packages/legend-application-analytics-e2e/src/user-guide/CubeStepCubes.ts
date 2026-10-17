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

// A small cube for each step the guide shows, on the sample sales of the
// example "Sales by country and year" (DuckDB): demo.sales has id, country,
// product, year, amount and price; demo.orders has id and a JSON document.
// Each is the query of a cube spec, imported as Cube > Import does; its last
// node is the step shown.

type SpecNode = Record<string, unknown> & { readonly id: string };

const sales = (id: string): SpecNode => ({
  kind: 'relational',
  id,
  database: 'cube::direct::Database',
  schema: '"demo"',
  table: '"sales"',
});

const orders = (id: string): SpecNode => ({
  kind: 'relational',
  id,
  database: 'cube::direct::Database',
  schema: '"demo"',
  table: '"orders"',
});

/** The sales table, then the step */
const afterSales = (step: SpecNode): SpecNode[] => [
  sales('relational101'),
  { ...step, inputs: ['relational101'] },
];

const ofYear = (id: string, input: string, year: number): SpecNode => ({
  kind: 'filter',
  id,
  inputs: [input],
  filter: {
    column: 'year',
    operator: 'Equal',
    value: { kind: 'integer', value: String(year) },
  },
});

const totalByCountry = (id: string, input: string): SpecNode => ({
  kind: 'group',
  id,
  inputs: [input],
  columns: ['country'],
  aggregations: [{ column: 'amount', function: 'Sum', name: 'total' }],
});

export const CUBE_STEP_CUBES: Readonly<Record<string, readonly SpecNode[]>> = {
  sort: afterSales({
    kind: 'sort',
    id: 'sort101',
    sorts: [
      { column: 'amount', direction: 'DESC' },
      { column: 'country', direction: 'ASC' },
    ],
  }),
  group: afterSales({
    kind: 'group',
    id: 'group101',
    columns: ['country'],
    aggregations: [
      { column: 'amount', function: 'Sum', name: 'total_amount' },
      { function: 'CountRows', name: 'sales' },
    ],
  }),
  pivot: afterSales({
    kind: 'pivot',
    id: 'pivot101',
    rows: ['country'],
    column: 'year',
    values: ['2022', '2023', '2024'].map((value) => ({
      kind: 'integer',
      value,
    })),
    aggregation: { column: 'amount', function: 'Sum' },
  }),
  filter: afterSales({
    kind: 'filter',
    id: 'filter101',
    filter: {
      column: 'country',
      operator: 'Equal',
      value: { kind: 'string', value: 'France' },
    },
  }),
  expressionFilter: afterSales({
    kind: 'expressionFilter',
    id: 'expressionFilter101',
    code: 'x | $x.amount->toOne() * $x.price->toOne() > 300',
  }),
  restrict: afterSales({
    kind: 'restrict',
    id: 'restrict101',
    columns: ['country', 'product', 'amount'],
  }),
  rename: afterSales({
    kind: 'rename',
    id: 'rename101',
    mappings: [{ from: 'amount', to: 'units' }],
  }),
  distinct: [
    sales('relational101'),
    {
      kind: 'restrict',
      id: 'restrict101',
      inputs: ['relational101'],
      columns: ['country', 'product'],
    },
    { kind: 'distinct', id: 'distinct101', inputs: ['restrict101'] },
  ],
  drop: afterSales({ kind: 'drop', id: 'drop101', size: 3 }),
  limit: afterSales({ kind: 'limit', id: 'limit101', size: 5 }),
  slice: afterSales({ kind: 'slice', id: 'slice101', start: 2, stop: 6 }),
  concat: [
    sales('relational101'),
    sales('relational102'),
    ofYear('filter101', 'relational101', 2022),
    ofYear('filter102', 'relational102', 2024),
    {
      kind: 'concat',
      id: 'concat101',
      inputs: ['filter101', 'filter102'],
      widenTypes: false,
    },
  ],
  join: [
    sales('relational101'),
    orders('relational102'),
    {
      kind: 'join',
      id: 'join101',
      inputs: ['relational101', 'relational102'],
      joinType: 'LEFT_OUTER',
      leftColumns: ['id'],
      rightColumns: ['id'],
    },
  ],
  difference: [
    sales('relational101'),
    sales('relational102'),
    ofYear('filter101', 'relational101', 2023),
    totalByCountry('group101', 'filter101'),
    ofYear('filter102', 'relational102', 2024),
    totalByCountry('group102', 'filter102'),
    {
      kind: 'difference',
      id: 'difference101',
      inputs: ['group101', 'group102'],
      leftColumns: ['country'],
      rightColumns: ['country'],
      differenceColumns: ['total'],
    },
  ],
  partition: afterSales({
    kind: 'partition',
    id: 'partition101',
    columns: ['country'],
    sorts: [{ column: 'amount', direction: 'DESC' }],
    aggregations: [{ function: 'Rank', name: 'rank_in_country' }],
  }),
  extend: afterSales({
    kind: 'extend',
    id: 'extend101',
    columns: [
      { name: 'revenue', code: 'x | $x.amount->toOne() * $x.price->toOne()' },
    ],
  }),
};

/** The steps whose expressions must be checked by the engine before they run */
export const CUBE_STEPS_WITH_EXPRESSIONS: readonly string[] = [
  'expressionFilter',
  'extend',
];
