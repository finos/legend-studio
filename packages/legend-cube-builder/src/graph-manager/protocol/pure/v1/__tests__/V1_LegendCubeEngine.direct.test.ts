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

import { describe, expect, jest, test } from '@jest/globals';
import {
  type IR,
  lambda,
  type ModelContext,
  PrimitiveType,
  Query,
  QueryEmitter,
  RelationalTableSource,
  Schema,
  SchemaColumn,
  storeAccessor,
} from '@finos/legend-cube';
import {
  NetworkClientError,
  type PlainObject,
  TracerService,
} from '@finos/legend-shared';
import {
  directH2Connection,
  DIRECT_H2_CONNECTION,
} from '../../../../../__test-utils__/CubeDirectConnectionFixtures.js';
import {
  CUBE_DIRECT_CONNECTION_PATH,
  CUBE_DIRECT_DATABASE_PATH,
  CUBE_DIRECT_RUNTIME_PATH,
  createCubeDirectModel,
} from '../../../../CubeDirectConnection.js';
import {
  type AccessorPath,
  CubeEngineError,
  CubeEngineErrorKind,
} from '../../../../CubeEngine.js';
import { V1_LegendCubeEngine } from '../V1_LegendCubeEngine.js';

// A direct-connection cube (PLAN §6.8) on a client whose calls are mocked:
// what each call reads from the connection's database, and the model it
// builds from what was read

const SCHEMA = 'CUBE_DIRECT';
const MODEL = createCubeDirectModel(DIRECT_H2_CONNECTION);

/** A table of the direct Database, its names quoted as the picker saves them */
const accessor = (table: string, schema = SCHEMA): AccessorPath => [
  CUBE_DIRECT_DATABASE_PATH,
  `"${schema}"`,
  `"${table}"`,
];
const ORDERS = accessor('ORDERS');
const CUSTOMERS = accessor('CUSTOMERS');

/** A direct-connection model holding anything as its connection, as a saved spec may */
const directModelWith = (connection: unknown): ModelContext =>
  ({ _type: 'cubeDirectConnection', connection }) as unknown as ModelContext;

const accessorLambda = (path: AccessorPath): IR =>
  lambda([], [storeAccessor(path)]);

const newEngine = (): V1_LegendCubeEngine =>
  new V1_LegendCubeEngine(
    { baseUrl: 'http://localhost:6300/api' },
    new TracerService(),
  );

const integerColumn = (name: string): PlainObject => ({
  name,
  nullable: false,
  type: { _type: 'Integer' },
});

/** The tables of the H2 sample, as schema exploration reads them */
const SAMPLE_TABLES: Record<string, PlainObject[]> = {
  ORDERS: [integerColumn('ORDER_ID'), integerColumn('CUSTOMER_ID')],
  CUSTOMERS: [integerColumn('CUSTOMER_ID')],
};

/** Schema exploration's answer: the tables its patterns ask for that the database has */
const explorationOf =
  (tables: Record<string, PlainObject[]> = SAMPLE_TABLES) =>
  async (input: PlainObject): Promise<PlainObject> => {
    const patterns = (input.config as PlainObject).patterns as PlainObject[];
    return {
      _type: 'data',
      elements: [
        {
          _type: 'relational',
          package: 'cube::direct',
          name: 'Database',
          schemas: [
            {
              name: SCHEMA,
              tables: Object.entries(tables)
                .filter(([name]) =>
                  patterns.some(
                    (pattern) =>
                      pattern.schemaPattern === SCHEMA &&
                      pattern.tablePattern === name,
                  ),
                )
                .map(([name, columns]) => ({
                  name,
                  columns,
                  primaryKey: [],
                  milestoning: [],
                })),
            },
          ],
        },
      ],
    };
  };

/** A relation type of the columns given, all Integer */
const relationType = (...names: string[]): PlainObject => ({
  _type: 'relationType',
  columns: names.map((name) => ({
    name,
    genericType: {
      rawType: { _type: 'packageableType', fullPath: 'Integer' },
      typeArguments: [],
      multiplicityArguments: [],
      typeVariableValues: [],
    },
    multiplicity: { lowerBound: 1, upperBound: 1 },
  })),
});

const networkError = (message: string): NetworkClientError =>
  new NetworkClientError(
    {
      status: 500,
      statusText: 'Internal Server Error',
      url: 'http://engine',
    } as Response,
    { message } as NetworkClientError['payload'],
  );

/** The client of an engine, its schema exploration and typing mocked */
const mockClient = (
  engine: V1_LegendCubeEngine,
  exploration = explorationOf(),
): {
  explore: jest.Mock;
  batch: jest.Mock;
  run: jest.Mock;
} => {
  const explore = jest
    .spyOn(engine.client, 'buildDatabase')
    .mockImplementation(exploration as never);
  const batch = jest
    .spyOn(engine.client, 'batchLambdasRelationType')
    .mockImplementation(async (body) => {
      const { lambdas } = JSON.parse(body as unknown as string) as {
        lambdas: Record<string, unknown>;
      };
      return {
        result: Object.fromEntries(
          Object.keys(lambdas).map((nodeId) => [
            nodeId,
            relationType('ORDER_ID'),
          ]),
        ),
      } as never;
    });
  const run = jest.spyOn(engine.client, 'runQuery').mockResolvedValue({
    ok: true,
    status: 200,
    text: async () =>
      `{"builder": {"_type":"tdsBuilder","columns":[{"name":"ORDER_ID","type":"Integer"}]}, "activities": [], "result" : {"columns" : ["ORDER_ID"], "rows" : [{"values": [1]}]}}`,
  } as never);
  return {
    explore: explore as unknown as jest.Mock,
    batch: batch as unknown as jest.Mock,
    run: run as unknown as jest.Mock,
  };
};

/** The model a call sent, as protocol JSON */
const sentModel = (call: unknown[]): PlainObject =>
  (JSON.parse(call[0] as string) as { model: PlainObject }).model;

/** The tables of the Database in a model sent, by quoted schema and table */
const tablesIn = (model: PlainObject): string[] =>
  (
    ((model.elements as PlainObject[])[0] as PlainObject)
      .schemas as PlainObject[]
  ).flatMap((schema) =>
    (schema.tables as PlainObject[]).map(
      (table) => `${schema.name as string}.${table.name as string}`,
    ),
  );

/** The tables an exploration request asked for, as schema.table */
const tablesAsked = (call: unknown[]): string[] =>
  ((call[0] as PlainObject).config as { patterns: PlainObject[] }).patterns.map(
    (pattern) =>
      `${pattern.schemaPattern as string}.${pattern.tablePattern as string}`,
  );

/** The execution lambda of a query on one table, captured at it */
const executionOn = (path: AccessorPath): IR =>
  new QueryEmitter(
    new Query(
      [
        new RelationalTableSource(
          'relational101',
          { database: path[0], schema: path[1], table: path[2] },
          {
            kind: 'resolved',
            schema: new Schema([
              new SchemaColumn('ORDER_ID', PrimitiveType.get('Integer'), false),
            ]),
          },
        ),
      ],
      [],
      'relational101',
    ),
  ).emitExecutionLambda({ rowLimit: 10, runtime: CUBE_DIRECT_RUNTIME_PATH });

describe('Legend Cube engine: direct connections', () => {
  test("Outlines the model with its one runtime and its connection's database type, without calling the engine: its tables are listed through the connection", async () => {
    const engine = newEngine();
    const { explore, batch, run } = mockClient(engine);
    const parse = jest.spyOn(engine.client, 'grammarToJSON_model');
    expect(await engine.loadModel(MODEL)).toEqual({
      databases: [],
      runtimes: [
        {
          path: CUBE_DIRECT_RUNTIME_PATH,
          storePaths: [CUBE_DIRECT_DATABASE_PATH],
          connections: [
            { storePath: CUBE_DIRECT_DATABASE_PATH, databaseType: 'H2' },
          ],
        },
      ],
    });
    [parse, explore, batch, run].forEach((call) =>
      expect(call).not.toHaveBeenCalled(),
    );
  });

  test.each<[string, ModelContext, string]>([
    [
      'without a connection',
      { _type: 'cubeDirectConnection' },
      'The connection is not a relational database connection',
    ],
    [
      'with a connection that is text',
      directModelWith('h2'),
      'The connection is not a relational database connection',
    ],
    [
      'with a connection that is a list',
      directModelWith([DIRECT_H2_CONNECTION]),
      'The connection is not a relational database connection',
    ],
    [
      'with a setting Cube does not support',
      createCubeDirectModel({
        ...DIRECT_H2_CONNECTION,
        quoteIdentifiers: true,
      }),
      `The connection sets "quoteIdentifiers", which Cube doesn't support`,
    ],
  ])(
    'Refuses a model %s for every call, on its node, without calling the engine',
    async (_, model, message) => {
      const engine = newEngine();
      const { explore, batch, run } = mockClient(engine);
      await expect(engine.loadModel(model)).rejects.toMatchObject({
        kind: CubeEngineErrorKind.UNSUPPORTED_MODEL,
        detail: message,
      });
      const resolved = await engine.resolveSchemas(
        model,
        new Map([['relational101', ORDERS]]),
      );
      const typed = await engine.typeLambdas(
        model,
        new Map([['join101', accessorLambda(ORDERS)]]),
      );
      [
        [resolved.get('relational101'), 'relational101'] as const,
        [typed.get('join101'), 'join101'] as const,
      ].forEach(([error, nodeId]) => {
        expect(error).toBeInstanceOf(CubeEngineError);
        expect(error).toMatchObject({
          kind: CubeEngineErrorKind.UNSUPPORTED_MODEL,
          nodeId,
          detail: message,
        });
      });
      await expect(
        engine.execute(model, executionOn(ORDERS)),
      ).rejects.toMatchObject({
        kind: CubeEngineErrorKind.UNSUPPORTED_MODEL,
        nodeId: 'relational101',
        detail: message,
      });
      [explore, batch, run].forEach((call) =>
        expect(call).not.toHaveBeenCalled(),
      );
    },
  );

  test("Reads the tables to resolve in one call, then types them on a model of just those tables, bound to the cube's connection", async () => {
    const engine = newEngine();
    const { explore, batch } = mockClient(engine);
    const resolved = await engine.resolveSchemas(
      MODEL,
      new Map([
        ['relational101', ORDERS],
        ['relational102', CUSTOMERS],
      ]),
    );
    expect(explore).toHaveBeenCalledTimes(1);
    const request = explore.mock.calls[0]?.[0] as PlainObject;
    // the saved connection as it is, never bound to a store
    expect(request.connection).toEqual(DIRECT_H2_CONNECTION);
    expect(request.targetDatabase).toEqual({
      package: 'cube::direct',
      name: 'Database',
    });
    expect(tablesAsked(explore.mock.calls[0] as unknown[])).toEqual([
      'CUBE_DIRECT.ORDERS',
      'CUBE_DIRECT.CUSTOMERS',
    ]);
    expect(batch).toHaveBeenCalledTimes(1);
    const model = sentModel(batch.mock.calls[0] as unknown[]);
    expect(model._type).toBe('data');
    const [database, connection, runtime] = model.elements as PlainObject[];
    expect(database).toMatchObject({
      _type: 'relational',
      package: 'cube::direct',
      name: 'Database',
    });
    // one Database, in a fixed order, every name quoted
    expect(tablesIn(model)).toEqual([
      '"CUBE_DIRECT"."CUSTOMERS"',
      '"CUBE_DIRECT"."ORDERS"',
    ]);
    expect(connection).toEqual({
      _type: 'connection',
      package: 'cube::direct',
      name: 'Connection',
      connectionValue: {
        ...DIRECT_H2_CONNECTION,
        element: CUBE_DIRECT_DATABASE_PATH,
      },
    });
    expect(runtime).toMatchObject({
      _type: 'runtime',
      package: 'cube::direct',
      name: 'Runtime',
      runtimeValue: {
        _type: 'engineRuntime',
        connections: [
          {
            store: { type: 'STORE', path: CUBE_DIRECT_DATABASE_PATH },
            storeConnections: [
              {
                id: 'connection',
                connection: {
                  _type: 'connectionPointer',
                  connection: CUBE_DIRECT_CONNECTION_PATH,
                },
              },
            ],
          },
        ],
      },
    });
    expect([...resolved.keys()]).toEqual(['relational101', 'relational102']);
    resolved.forEach((schema) => expect(schema).toBeInstanceOf(Schema));
  });

  test('Builds the same model for the same tables, whatever their order', async () => {
    const engine = newEngine();
    const { batch } = mockClient(engine);
    await engine.typeLambdas(
      MODEL,
      new Map([
        ['join101', accessorLambda(ORDERS)],
        ['join102', accessorLambda(CUSTOMERS)],
      ]),
    );
    await engine.typeLambdas(
      MODEL,
      new Map([
        ['join102', accessorLambda(CUSTOMERS)],
        ['join101', accessorLambda(ORDERS)],
      ]),
    );
    expect(JSON.stringify(sentModel(batch.mock.calls[0] as unknown[]))).toEqual(
      JSON.stringify(sentModel(batch.mock.calls[1] as unknown[])),
    );
  });

  test('Reads a table again whenever it is resolved, and only the tables it has not read to type or run', async () => {
    const engine = newEngine();
    const { explore, run } = mockClient(engine);
    const accessors = new Map([['relational101', ORDERS]]);
    await engine.resolveSchemas(MODEL, accessors);
    await engine.resolveSchemas(MODEL, accessors);
    expect(explore).toHaveBeenCalledTimes(2);
    await engine.typeLambdas(
      MODEL,
      new Map([['join101', accessorLambda(ORDERS)]]),
    );
    expect(explore).toHaveBeenCalledTimes(2);
    await engine.typeLambdas(
      MODEL,
      new Map([
        ['join101', accessorLambda(ORDERS)],
        ['join102', accessorLambda(CUSTOMERS)],
      ]),
    );
    expect(explore).toHaveBeenCalledTimes(3);
    expect(tablesAsked(explore.mock.calls[2] as unknown[])).toEqual([
      'CUBE_DIRECT.CUSTOMERS',
    ]);
    const result = await engine.execute(MODEL, executionOn(ORDERS));
    expect(result.rows).toHaveLength(1);
    expect(explore).toHaveBeenCalledTimes(3);
    expect(tablesIn(sentModel(run.mock.calls[0] as unknown[]))).toEqual([
      '"CUBE_DIRECT"."ORDERS"',
    ]);
  });

  test('Keeps the tables of each connection apart, though their names are the same', async () => {
    const engine = newEngine();
    const other = directH2Connection('CUBE_DIRECT_OTHER');
    const { explore, batch } = mockClient(engine, async (input) =>
      explorationOf(
        input.connection === other
          ? { ORDERS: [integerColumn('OTHER_ID')] }
          : SAMPLE_TABLES,
      )(input),
    );
    const lambdas = new Map([['join101', accessorLambda(ORDERS)]]);
    await engine.typeLambdas(MODEL, lambdas);
    await engine.typeLambdas(createCubeDirectModel(other), lambdas);
    expect(explore).toHaveBeenCalledTimes(2);
    const columnsSent = (call: unknown[]): string[] =>
      (
        (
          (
            (sentModel(call).elements as PlainObject[])[0]
              ?.schemas as PlainObject[]
          )[0]?.tables as PlainObject[]
        )[0]?.columns as PlainObject[]
      ).map((column) => column.name as string);
    expect(columnsSent(batch.mock.calls[0] as unknown[])).toEqual([
      '"ORDER_ID"',
      '"CUSTOMER_ID"',
    ]);
    expect(columnsSent(batch.mock.calls[1] as unknown[])).toEqual([
      '"OTHER_ID"',
    ]);
  });

  test("Places a table the database doesn't have on its node, and forgets a table that is gone", async () => {
    const engine = newEngine();
    let tables = SAMPLE_TABLES;
    const { batch, run } = mockClient(engine, async (input) =>
      explorationOf(tables)(input),
    );
    await engine.typeLambdas(
      MODEL,
      new Map([['join101', accessorLambda(ORDERS)]]),
    );
    expect(batch).toHaveBeenCalledTimes(1);
    tables = { CUSTOMERS: SAMPLE_TABLES.CUSTOMERS as PlainObject[] };
    const resolved = await engine.resolveSchemas(
      MODEL,
      new Map([
        ['relational101', ORDERS],
        ['relational102', CUSTOMERS],
      ]),
    );
    const message = 'The database has no table ORDERS in schema CUBE_DIRECT';
    expect(resolved.get('relational101')).toMatchObject({
      kind: CubeEngineErrorKind.COMPILE,
      nodeId: 'relational101',
      detail: message,
    });
    expect(resolved.get('relational102')).toBeInstanceOf(Schema);
    // only the table it has is typed
    expect(tablesIn(sentModel(batch.mock.calls[1] as unknown[]))).toEqual([
      '"CUBE_DIRECT"."CUSTOMERS"',
    ]);
    // typing and running read it again rather than use what was read before
    const typed = await engine.typeLambdas(
      MODEL,
      new Map([['join101', accessorLambda(ORDERS)]]),
    );
    expect(typed.get('join101')).toMatchObject({
      kind: CubeEngineErrorKind.COMPILE,
      nodeId: 'join101',
      detail: message,
    });
    await expect(
      engine.execute(MODEL, executionOn(ORDERS)),
    ).rejects.toMatchObject({
      kind: CubeEngineErrorKind.EXECUTION,
      nodeId: 'relational101',
      detail: message,
    });
    expect(batch).toHaveBeenCalledTimes(2);
    expect(run).not.toHaveBeenCalled();
  });

  test("Refuses a table outside the cube's database connection, on its node", async () => {
    const engine = newEngine();
    const { explore, batch, run } = mockClient(engine);
    const foreign: AccessorPath = ['test::Db', 'S', 'T'];
    const message = `The table is in "test::Db", not in the cube's database connection`;
    const typed = await engine.typeLambdas(
      MODEL,
      new Map([
        ['join101', accessorLambda(foreign)],
        ['join102', accessorLambda(ORDERS)],
      ]),
    );
    expect(typed.get('join101')).toMatchObject({
      kind: CubeEngineErrorKind.COMPILE,
      nodeId: 'join101',
      detail: message,
    });
    expect(typed.get('join102')).toBeInstanceOf(Schema);
    expect(tablesAsked(explore.mock.calls[0] as unknown[])).toEqual([
      'CUBE_DIRECT.ORDERS',
    ]);
    expect(batch).toHaveBeenCalledTimes(1);
    await expect(
      engine.execute(MODEL, executionOn(foreign)),
    ).rejects.toMatchObject({
      kind: CubeEngineErrorKind.EXECUTION,
      nodeId: 'relational101',
      detail: message,
    });
    expect(run).not.toHaveBeenCalled();
  });

  test('Places a failed read of the database on every node, saying what it means', async () => {
    const engine = newEngine();
    const { batch, run } = mockClient(engine, async () => {
      throw networkError(
        'org.h2.jdbc.JdbcSQLSyntaxErrorException: Syntax error in SQL statement "CREATE TABL"',
      );
    });
    const typed = await engine.typeLambdas(
      MODEL,
      new Map([
        ['join101', accessorLambda(ORDERS)],
        ['join102', accessorLambda(CUSTOMERS)],
      ]),
    );
    const meaning =
      "The database refused a statement: check the connection's setup SQL";
    ['join101', 'join102'].forEach((nodeId) => {
      const error = typed.get(nodeId) as CubeEngineError;
      expect(error).toMatchObject({
        kind: CubeEngineErrorKind.COMPILE,
        nodeId,
      });
      expect(error.detail.split('\n')[0]).toBe(meaning);
    });
    const failed = (await engine
      .execute(MODEL, executionOn(ORDERS))
      .catch((error: unknown) => error)) as CubeEngineError;
    expect(failed).toMatchObject({
      kind: CubeEngineErrorKind.EXECUTION,
      nodeId: 'relational101',
    });
    expect(failed.detail.split('\n')[0]).toBe(meaning);
    expect(batch).not.toHaveBeenCalled();
    expect(run).not.toHaveBeenCalled();
  });

  test('Runs on a model of the tables run, and goes no further when stopped while reading them', async () => {
    const engine = newEngine();
    let explored: () => void = () => undefined;
    const { run } = mockClient(engine, async (input) => {
      await new Promise<void>((resolve) => {
        explored = resolve;
      });
      return explorationOf()(input);
    });
    const abortController = new AbortController();
    const outcome = engine
      .execute(MODEL, executionOn(ORDERS), { abortController })
      .catch((error: unknown) => error);
    await new Promise((resolve) => setTimeout(resolve, 0));
    abortController.abort();
    explored();
    expect(await outcome).toMatchObject({
      kind: CubeEngineErrorKind.EXECUTION,
      nodeId: 'relational101',
      detail: 'The run was stopped',
    });
    expect(run).not.toHaveBeenCalled();
    // what was read is kept: the next run reads nothing and runs
    const result = await engine.execute(MODEL, executionOn(ORDERS));
    expect(result.rows).toHaveLength(1);
    const body = JSON.parse(run.mock.calls[0]?.[0] as string) as PlainObject;
    expect(tablesIn(body.model as PlainObject)).toEqual([
      '"CUBE_DIRECT"."ORDERS"',
    ]);
  });
});
