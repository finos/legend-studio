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
  EmitRole,
  func,
  type IR,
  lambda,
  literal,
  type ModelContext,
  QueryEmitter,
  Schema,
  storeAccessor,
} from '@finos/legend-cube';
import {
  NetworkClientError,
  type PlainObject,
  TracerService,
} from '@finos/legend-shared';
import {
  type AccessorPath,
  CubeEngineError,
  CubeEngineErrorKind,
} from '../../../../CubeEngine.js';
import {
  NORTHWIND_RUNTIME,
  sliceQuery,
} from '../../../../../__test-utils__/CubeNorthwindTestQueries.js';
import { V1_EngineServerClient } from '@finos/legend-graph';
import { buildCubeEngine } from '../../CubeEngineBuilder.js';
import { V1_LegendCubeEngine } from '../V1_LegendCubeEngine.js';

const MODEL: ModelContext = Object.freeze({
  _type: 'text',
  code: '###Relational\nDatabase test::Db ()',
});
const POINTER: ModelContext = Object.freeze({
  _type: 'pointer',
  sdlcInfo: {},
});
const ACCESSOR: AccessorPath = ['test::Db', 'S', 'T'];

const newEngine = (): V1_LegendCubeEngine =>
  new V1_LegendCubeEngine(
    { baseUrl: 'http://localhost:6300/api' },
    new TracerService(),
  );

const relationType = (name: string): PlainObject => ({
  _type: 'relationType',
  columns: [
    {
      name,
      genericType: {
        rawType: { _type: 'packageableType', fullPath: 'Integer' },
        typeArguments: [],
        multiplicityArguments: [],
        typeVariableValues: [],
      },
      multiplicity: { lowerBound: 1, upperBound: 1 },
    },
  ],
});

const networkError = (payload: unknown): NetworkClientError =>
  new NetworkClientError(
    {
      status: 400,
      statusText: 'Bad Request',
      url: 'http://engine',
    } as Response,
    payload as NetworkClientError['payload'],
  );

/** The execution lambda of the slice, captured at `filter101` */
const SLICE_EXECUTION = new QueryEmitter(sliceQuery()).emitExecutionLambda({
  rowLimit: 1000,
  runtime: NORTHWIND_RUNTIME,
});

const RESULT_TEXT = `{"builder": {"_type":"tdsBuilder","columns":[{"name":"ID","type":"Integer"}]}, "activities": [{"_type":"relational","sql":"select ID"}], "result" : {"columns" : ["ID"], "rows" : [{"values": [9007199254740993]}]}}`;

const responseOf = (text: string): Response =>
  ({ ok: true, status: 200, text: async () => text }) as Response;

describe('Legend Cube engine: wiring', () => {
  test('Builds an engine whose client has a tracer, so its calls get as far as the network', async () => {
    const engine = buildCubeEngine(
      { baseUrl: 'http://localhost:6300/api' },
      new TracerService(),
    );
    expect(engine).toBeInstanceOf(V1_LegendCubeEngine);
    // the test environment refuses real network calls, after the tracer's check
    const error = await engine
      .loadModel(MODEL)
      .catch((caught: unknown) => caught);
    expect(error).toBeInstanceOf(CubeEngineError);
    expect((error as CubeEngineError).kind).toBe(CubeEngineErrorKind.NETWORK);
    expect((error as CubeEngineError).detail).not.toContain('Tracer service');
    // without one, a client fails before any request
    await expect(
      new V1_EngineServerClient({
        baseUrl: 'http://localhost:6300/api',
      }).grammarToJSON_model('x'),
    ).rejects.toThrow('Tracer service has not been set');
  });
});

describe('Legend Cube engine: model kinds', () => {
  test('Refuses a model of a kind it cannot run, without calling the engine', async () => {
    const engine = newEngine();
    const parse = jest.spyOn(engine.client, 'grammarToJSON_model');
    const type = jest.spyOn(engine.client, 'batchLambdasRelationType');
    const run = jest.spyOn(engine.client, 'runQuery');
    const message = `This cube's model kind "pointer" isn't supported yet.`;
    await expect(engine.loadModel(POINTER)).rejects.toThrow(message);
    const typed = await engine.resolveSchemas(
      POINTER,
      new Map([['relational101', ACCESSOR]]),
    );
    const error = typed.get('relational101');
    expect(error).toBeInstanceOf(CubeEngineError);
    expect(error).toMatchObject({
      kind: CubeEngineErrorKind.UNSUPPORTED_MODEL,
      nodeId: 'relational101',
      detail: message,
    });
    await expect(
      engine.execute(POINTER, SLICE_EXECUTION),
    ).rejects.toMatchObject({
      kind: CubeEngineErrorKind.UNSUPPORTED_MODEL,
      nodeId: 'filter101',
    });
    expect(parse).not.toHaveBeenCalled();
    expect(type).not.toHaveBeenCalled();
    expect(run).not.toHaveBeenCalled();
  });

  test('Refuses a text model without its text', async () => {
    await expect(newEngine().loadModel({ _type: 'text' })).rejects.toThrow(
      `This cube's model kind "text" isn't supported yet.`,
    );
  });
});

describe('Legend Cube engine: typing', () => {
  test('Types every table in one call, sending the saved model as it is', async () => {
    const engine = newEngine();
    const type = jest
      .spyOn(engine.client, 'batchLambdasRelationType')
      .mockResolvedValue({
        result: {
          relational101: relationType('A'),
          relational102: relationType('B'),
        },
      } as never);
    const typed = await engine.resolveSchemas(
      MODEL,
      new Map([
        ['relational101', ACCESSOR],
        ['relational102', ['test::Db', 'S', '"U.V"']],
      ]),
    );
    expect(type).toHaveBeenCalledTimes(1);
    const body = JSON.parse(type.mock.calls[0]?.[0] as unknown as string) as {
      model: unknown;
      lambdas: Record<string, { body: [{ value: { path: string[] } }] }>;
    };
    expect(body.model).toEqual(MODEL);
    expect(body.lambdas.relational102?.body[0].value.path).toEqual([
      'test::Db',
      'S',
      '"U.V"',
    ]);
    expect(
      [...typed].map(([nodeId, schema]) => [
        nodeId,
        (schema as Schema).columns.map((column) => column.name),
      ]),
    ).toEqual([
      ['relational101', ['A']],
      ['relational102', ['B']],
    ]);
  });

  test('Reads the results under `results` too', async () => {
    const engine = newEngine();
    jest
      .spyOn(engine.client, 'batchLambdasRelationType')
      .mockResolvedValue({ results: { n: relationType('A') } } as never);
    expect(
      (
        await engine.typeLambdas(
          MODEL,
          new Map([['n', lambda([], [storeAccessor(ACCESSOR)])]]),
        )
      ).get('n'),
    ).toBeInstanceOf(Schema);
  });

  test('Gives each key its own error, on the node its stamp names or else on the key', async () => {
    const engine = newEngine();
    jest.spyOn(engine.client, 'batchLambdasRelationType').mockResolvedValue({
      result: { good: relationType('A') },
      errors: {
        bad: { message: 'Match failure: BinaryObject instanceOf Binary' },
        stamped: {
          message: "Can't find the column 'X'",
          sourceInformation: { sourceId: 'cube:filter101:column' },
        },
      },
    } as never);
    const ir = lambda([], [storeAccessor(ACCESSOR)]);
    const typed = await engine.typeLambdas(
      MODEL,
      new Map([
        ['good', ir],
        ['bad', ir],
        ['stamped', ir],
        ['missing', ir],
      ]),
    );
    expect(typed.get('good')).toBeInstanceOf(Schema);
    expect(typed.get('bad')).toMatchObject({
      kind: CubeEngineErrorKind.COMPILE,
      nodeId: 'bad',
      firstLine: 'Match failure: BinaryObject instanceOf Binary',
    });
    expect(typed.get('stamped')).toMatchObject({
      nodeId: 'filter101',
      role: 'column',
    });
    expect(typed.get('missing')).toMatchObject({
      kind: CubeEngineErrorKind.NETWORK,
      nodeId: 'missing',
    });
  });

  test('Gives every key the error of a call that fails as a whole', async () => {
    const engine = newEngine();
    jest
      .spyOn(engine.client, 'batchLambdasRelationType')
      .mockRejectedValue(networkError({ message: 'Model does not compile' }));
    const typed = await engine.resolveSchemas(
      MODEL,
      new Map([
        ['a', ACCESSOR],
        ['b', ACCESSOR],
      ]),
    );
    expect(
      [...typed.values()].map((error) => (error as CubeEngineError).nodeId),
    ).toEqual(['a', 'b']);
    expect(
      [...typed.values()].every(
        (error) =>
          (error as CubeEngineError).firstLine === 'Model does not compile',
      ),
    ).toBe(true);
  });

  test('Makes no call for nothing to type', async () => {
    const engine = newEngine();
    const type = jest.spyOn(engine.client, 'batchLambdasRelationType');
    expect((await engine.resolveSchemas(MODEL, new Map())).size).toBe(0);
    expect(type).not.toHaveBeenCalled();
  });

  test('Sends numbers digit for digit', async () => {
    const engine = newEngine();
    const type = jest
      .spyOn(engine.client, 'batchLambdasRelationType')
      .mockResolvedValue({ result: {} } as never);
    await engine.typeLambdas(
      MODEL,
      new Map<string, IR>([
        [
          'n',
          lambda(
            [],
            [
              func('limit', [
                storeAccessor(ACCESSOR),
                literal({ kind: 'integer', value: '9007199254740993' }),
              ]),
            ],
          ),
        ],
      ]),
    );
    expect(type.mock.calls[0]?.[0]).toContain('"value":9007199254740993');
  });

  test('Stamps a table accessor with its node, so its errors land there', async () => {
    const engine = newEngine();
    const type = jest
      .spyOn(engine.client, 'batchLambdasRelationType')
      .mockResolvedValue({ result: {} } as never);
    await engine.resolveSchemas(MODEL, new Map([['relational101', ACCESSOR]]));
    expect(type.mock.calls[0]?.[0]).toContain(
      `"sourceId":"cube:relational101:${EmitRole.ACCESSOR}"`,
    );
  });
});

describe('Legend Cube engine: execution', () => {
  test('Runs a lambda with the saved model and no runtime of its own, reading the result losslessly', async () => {
    const engine = newEngine();
    const run = jest
      .spyOn(engine.client, 'runQuery')
      .mockResolvedValue(responseOf(RESULT_TEXT));
    const abortController = new AbortController();
    const result = await engine.execute(MODEL, SLICE_EXECUTION, {
      abortController,
    });
    expect(result).toMatchObject({
      columns: ['ID'],
      rows: [['9007199254740993']],
      sql: ['select ID'],
    });
    expect(result.durationMs).toBeGreaterThanOrEqual(0);
    const [body, options] = run.mock.calls[0] ?? [];
    expect(options).toEqual({ returnAsResponse: true, abortController });
    const sent = JSON.parse(body as unknown as string) as PlainObject;
    expect(Object.keys(sent).sort()).toEqual([
      'clientVersion',
      'context',
      'function',
      'model',
      'parameterValues',
    ]);
    expect(sent.model).toEqual(MODEL);
    expect(sent.context).toEqual({ _type: 'BaseExecutionContext' });
  });

  test("Places a failed run's error on its stamped node, or else on the node run", async () => {
    const engine = newEngine();
    const run = jest
      .spyOn(engine.client, 'runQuery')
      .mockRejectedValueOnce(
        networkError({
          errorType: 'COMPILATION',
          message: "Can't find the column 'X'",
          sourceInformation: { sourceId: 'cube:join101:key' },
        }),
      )
      .mockRejectedValueOnce(networkError({ message: 'Table not found' }));
    await expect(engine.execute(MODEL, SLICE_EXECUTION)).rejects.toMatchObject({
      kind: CubeEngineErrorKind.COMPILE,
      nodeId: 'join101',
    });
    await expect(engine.execute(MODEL, SLICE_EXECUTION)).rejects.toMatchObject({
      kind: CubeEngineErrorKind.EXECUTION,
      nodeId: 'filter101',
      firstLine: 'Table not found',
    });
    expect(run).toHaveBeenCalledTimes(2);
  });

  test('Reports a response it cannot read as an execution error on the node run', async () => {
    const engine = newEngine();
    jest
      .spyOn(engine.client, 'runQuery')
      .mockResolvedValue(
        responseOf('{"result": java.lang.NullPointerException'),
      );
    await expect(engine.execute(MODEL, SLICE_EXECUTION)).rejects.toMatchObject({
      kind: CubeEngineErrorKind.EXECUTION,
      nodeId: 'filter101',
    });
  });
});

describe('Legend Cube engine: Pure text', () => {
  test('Renders a lambda as pretty Pure text', async () => {
    const engine = newEngine();
    const render = jest
      .spyOn(engine.client, 'JSONToGrammar_lambda')
      .mockResolvedValue('|1');
    expect(
      await engine.renderPure(
        lambda([], [literal({ kind: 'integer', value: '1' })]),
      ),
    ).toBe('|1');
    expect(render.mock.calls[0]?.[1]).toBe('PRETTY');
  });
});
