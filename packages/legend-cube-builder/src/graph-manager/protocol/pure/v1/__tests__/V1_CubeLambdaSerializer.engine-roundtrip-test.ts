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
  aggregationColSpec,
  colSpec,
  colSpecArray,
  collection,
  columnAccess,
  ColumnComparisonFilter,
  CompositeFilter,
  CompositeFilterOperator,
  Connection,
  elementPtr,
  EmitRole,
  Filter,
  FilterOperator,
  func,
  type IR,
  Join,
  JoinType,
  lambda,
  letBinding,
  literal,
  NotFilter,
  PrimitiveType,
  printIR,
  Query,
  QueryEmitter,
  RelationalTableSource,
  Schema,
  SchemaColumn,
  storeAccessor,
  variable,
} from '@finos/legend-cube';
import {
  parseLosslessJSON,
  type PlainObject,
  stringifyLosslessJSON,
} from '@finos/legend-shared';
import {
  CUBE_ENGINE_TEST__grammarToJson_lambda,
  CUBE_ENGINE_TEST__lambdaRelationTypeBatch,
} from '../../../../../__test-utils__/CubeEngineTestSupport.js';
import {
  fullJoinQuery,
  NORTHWIND_RUNTIME,
  sliceQuery,
} from '../../../../../__test-utils__/CubeNorthwindTestQueries.js';
import {
  V1_parseCubeSourceId,
  V1_serializeCubeLambda,
} from '../V1_CubeLambdaSerializer.js';

// The serializer's JSON equals the engine's own parse of the same lambda as
// Pure text (the core's debug printer), source information aside (PLAN
// §11.2 A.11). None of these lambdas has a negative number or a quoted dotted
// table, which Pure text can't carry as the JSON does

const withoutSourceInformation = (json: unknown): unknown =>
  parseLosslessJSON(
    stringifyLosslessJSON(json, (key: string, value: unknown) =>
      key === 'sourceInformation' ? undefined : value,
    ),
  );

const expectAsParsed = async (ir: IR): Promise<void> => {
  expect(withoutSourceInformation(V1_serializeCubeLambda(ir))).toEqual(
    await CUBE_ENGINE_TEST__grammarToJson_lambda(printIR(ir)),
  );
};

const NEGATIONS = new CompositeFilter(CompositeFilterOperator.OR, [
  new NotFilter(
    new ColumnComparisonFilter('SHIP_REGION', FilterOperator.EQUAL, {
      kind: 'string',
      value: 'BC',
    }),
  ),
  new ColumnComparisonFilter('EMPLOYEE_ID', FilterOperator.NOT_IN, [
    { kind: 'integer', value: '32767' },
  ]),
  new ColumnComparisonFilter('FREIGHT', FilterOperator.GREATER_THAN, {
    kind: 'float',
    value: '50.5',
  }),
  new ColumnComparisonFilter('SHIP_NAME', FilterOperator.STARTS_WITH, {
    kind: 'string',
    value: "it's",
  }),
]);

describe('Cube lambda serializer, against the engine parser', () => {
  test('Writes the slice execution lambda as the engine parses it', async () => {
    await expectAsParsed(
      new QueryEmitter(sliceQuery()).emitExecutionLambda({
        rowLimit: 1000,
        runtime: NORTHWIND_RUNTIME,
      }),
    );
  });

  test.each([JoinType.LEFT_OUTER, JoinType.RIGHT_OUTER])(
    'Writes a %s join as the engine parses it',
    async (joinType) => {
      await expectAsParsed(
        new QueryEmitter(sliceQuery(undefined, joinType)).emitTypingLambda(
          'filter101',
        ),
      );
    },
  );

  test('Writes a FULL join, with toOne, the merge and its cast, as the engine parses it', async () => {
    await expectAsParsed(
      new QueryEmitter(fullJoinQuery()).emitTypingLambda('join101'),
    );
  });

  test('Writes negations, with their isEmpty guards, as the engine parses them', async () => {
    await expectAsParsed(
      new QueryEmitter(sliceQuery(NEGATIONS)).emitTypingLambda('filter101'),
    );
  });

  test('Writes a column spec with two functions, alone and in a column list, as the engine parses it', async () => {
    // ~total: x | $x.B : y | $y->sum()
    const total: IR = {
      k: 'colSpec',
      name: 'total',
      fn1: lambda(['x'], [columnAccess('x', 'B')]),
      fn2: lambda(['y'], [func('sum', [variable('y')])]),
    };
    await expectAsParsed(lambda([], [total]));
    await expectAsParsed(lambda([], [colSpecArray([colSpec('A'), total])]));
  });

  test('Writes the let form that isolates a window, with what follows it, as the engine parses it', async () => {
    const integer = (value: string): IR => literal({ kind: 'integer', value });
    const window = (name: string, fn1: IR, fn2?: IR): IR =>
      colSpecArray([
        fn2 ? aggregationColSpec(name, fn1, fn2) : colSpec(name, fn1),
      ]);
    const over = func('over', [
      colSpecArray([colSpec('SHIP_COUNTRY')]),
      collection([func('descending', [colSpec('ORDER_ID')])]),
    ]);
    // ORDERS' window columns, bound by a let, then filtered and sorted
    const windowed = func('extend', [
      func('extend', [
        func('select', [
          storeAccessor([
            'showcase::northwind::store::NorthwindDatabase',
            'NORTHWIND',
            'ORDERS',
          ]),
          colSpecArray([colSpec('ORDER_ID'), colSpec('SHIP_COUNTRY')]),
        ]),
        over,
        window(
          'c',
          lambda(['p', 'w', 'r'], [integer('1')]),
          lambda(['y'], [func('size', [variable('y')])]),
        ),
      ]),
      over,
      window(
        'rk',
        lambda(
          ['p', 'w', 'r'],
          [func('rank', [variable('p'), variable('w'), variable('r')])],
        ),
      ),
    ]);
    await expectAsParsed(
      lambda(
        [],
        [
          func('limit', [
            func('sort', [
              func('from', [
                lambda(
                  [],
                  [
                    letBinding('n_partition101', windowed),
                    func('filter', [
                      variable('n_partition101'),
                      lambda(
                        ['row'],
                        [
                          func('lessThanEqual', [
                            columnAccess('row', 'rk'),
                            integer('3'),
                          ]),
                        ],
                      ),
                    ]),
                  ],
                ),
                elementPtr(NORTHWIND_RUNTIME),
              ]),
              collection([func('ascending', [colSpec('rk')])]),
            ]),
            integer('11'),
          ]),
        ],
      ),
    );
  });
});

// A table snapshot older than its table: the engine reports a column it can't
// find on the column spec that names it, so the error must come back on the
// Join that emitted the spec, not on the node typed or captured downstream

const DATABASE = 'test::CubeDb';

/** L, and R, keyed on RK: a snapshot of R that lists K instead is older than R */
const MODEL = {
  _type: 'text',
  code: `###Relational
Database ${DATABASE}
(
  Schema S
  (
    Table L (ID INTEGER PRIMARY KEY, K VARCHAR(5), A VARCHAR(10))
    Table R (RK VARCHAR(5) PRIMARY KEY, B VARCHAR(10))
  )
)
`,
};

const varchar = (name: string, nullable = true): SchemaColumn =>
  new SchemaColumn(
    name,
    PrimitiveType.get('meta::pure::precisePrimitives::Varchar', [10]),
    nullable,
  );
const L_COLUMNS = [
  new SchemaColumn(
    'ID',
    PrimitiveType.get('meta::pure::precisePrimitives::Int'),
    false,
  ),
  varchar('K'),
  varchar('A'),
];

/** L ⟕ R on the keys, then a filter on A, captured at the filter */
const snapshotJoinQuery = (
  leftColumns: SchemaColumn[],
  rightColumns: SchemaColumn[],
  rightKey: string,
): Query =>
  new Query(
    [
      new RelationalTableSource(
        'relational101',
        { database: DATABASE, schema: 'S', table: 'L' },
        { kind: 'resolved', schema: new Schema(leftColumns) },
      ),
      new RelationalTableSource(
        'relational102',
        { database: DATABASE, schema: 'S', table: 'R' },
        { kind: 'resolved', schema: new Schema(rightColumns) },
      ),
      new Join('join101', {
        leftColumns: ['K'],
        rightColumns: [rightKey],
        joinType: JoinType.LEFT_OUTER,
      }),
      new Filter(
        'filter101',
        new ColumnComparisonFilter('A', FilterOperator.STARTS_WITH, {
          kind: 'string',
          value: 'x',
        }),
      ),
    ],
    [
      new Connection('relational101', 'join101', 'leftTds'),
      new Connection('relational102', 'join101', 'rightTds'),
      new Connection('join101', 'filter101', 'tds'),
    ],
    'filter101',
  );

/** The error the engine gives each node's typing lambda, its message and origin, by node */
const typingErrors = async (query: Query): Promise<Record<string, unknown>> => {
  const emitter = new QueryEmitter(query);
  const lambdas = Object.fromEntries(
    ['join101', 'filter101'].map((id) => [
      id,
      V1_serializeCubeLambda(emitter.emitTypingLambda(id)),
    ]),
  );
  const { errors } = await CUBE_ENGINE_TEST__lambdaRelationTypeBatch(
    JSON.parse(stringifyLosslessJSON({ model: MODEL, lambdas })) as object,
  );
  return Object.fromEntries(
    Object.entries((errors ?? {}) as Record<string, PlainObject>).map(
      ([id, error]) => [
        id,
        {
          message: error.message,
          origin: V1_parseCubeSourceId(
            (error.sourceInformation as { sourceId?: string } | null)?.sourceId,
          ),
        },
      ],
    ),
  );
};

describe('Cube lambda serializer, against the engine compiler', () => {
  test("Puts a column the left snapshot lists but its table doesn't have on the Join's select", async () => {
    const error = {
      message: expect.stringContaining("The column 'GONE' can't be found"),
      origin: { nodeId: 'join101', role: EmitRole.SELECT },
    };
    expect(
      await typingErrors(
        snapshotJoinQuery(
          [...L_COLUMNS, varchar('GONE')],
          [varchar('RK', false), varchar('B')],
          'RK',
        ),
      ),
    ).toEqual({ join101: error, filter101: error });
  });

  test("Puts a key the right snapshot lists but its table doesn't have on the Join's rename", async () => {
    const error = {
      message: expect.stringContaining("The column 'K' can't be found"),
      origin: { nodeId: 'join101', role: EmitRole.RENAME },
    };
    expect(
      await typingErrors(
        snapshotJoinQuery(L_COLUMNS, [varchar('K', false), varchar('B')], 'K'),
      ),
    ).toEqual({ join101: error, filter101: error });
  });
});
