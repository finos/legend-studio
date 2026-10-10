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
  dataProductAccessor,
  elementPtr,
  EmitRole,
  func,
  type IR,
  ingestAccessor,
  lambda,
  literal,
  type ModelContext,
  storeAccessor,
} from '@finos/legend-cube';
import { type PlainObject, TracerService } from '@finos/legend-shared';
import {
  createCubeDataProductModel,
  CUBE_DEFAULT_CONSUMER_WAREHOUSE,
  CubeDataProductEnvironmentType,
} from '../../../../CubeDataProduct.js';
import {
  CubeEngineError,
  CubeEngineErrorKind,
} from '../../../../CubeEngine.js';
import {
  createCubeIngestModel,
  CUBE_INGEST_MODEL_TYPE,
  CUBE_INGEST_RUNTIME_PATH,
} from '../../../../CubeIngest.js';
import {
  V1_CUBE_INGEST_MESSAGE,
  type V1_CubeIngestDefinitionSource,
} from '../V1_CubeIngestModel.js';
import { V1_LegendCubeEngine } from '../V1_LegendCubeEngine.js';

// An ingest cube (PLAN §6.7) on a client whose calls are mocked, and a fake
// source of deployed definitions: what a run sends, and what is refused
// before any call

const { PRODUCTION, PRODUCTION_PARALLEL } = CubeDataProductEnvironmentType;

const MODEL = createCubeIngestModel({
  environmentType: PRODUCTION,
  producerDeploymentId: '1234',
  warehouse: 'SALES_WH',
});

const ORDERS = 'sales::ingest::OrdersIngest';
const DESKS = 'sales::ingest::DesksIngest';
const urnOf = (definition: string, environment = 'prod'): string =>
  `urn:lakehouse:${environment}:ingest:definition:alloy-git:com.example~sales~${definition}`;

/** A definition element as the engine parses the ingest server's grammar */
const elementOf = (path: string): PlainObject => ({
  _type: 'ingestDefinition',
  package: path.slice(0, path.lastIndexOf('::')),
  name: path.slice(path.lastIndexOf('::') + 2),
  datasets: [{ name: 'TRADES' }],
  testSuites: [{ id: 'suite' }],
});

const accessor = (
  definition: string,
  nodeId: string,
  urn: string | undefined = urnOf(definition),
): IR =>
  ingestAccessor(
    [definition, 'TRADES'],
    { nodeId, role: EmitRole.ACCESSOR },
    urn,
  );

/** A run of a relation, captured at its first node */
const runOf = (relation: IR): IR =>
  lambda(
    [],
    [
      func(
        'from',
        [
          func('limit', [relation, literal({ kind: 'integer', value: '11' })]),
          elementPtr(CUBE_INGEST_RUNTIME_PATH),
        ],
        { nodeId: 'ingestDataset101', role: EmitRole.FROM },
      ),
    ],
  );

const RESULT = `{"builder": {"_type":"tdsBuilder","columns":[{"name":"TRADE_ID","type":"Integer"}]}, "activities": [], "result" : {"columns" : ["TRADE_ID"], "rows" : [{"values": [1]}]}}`;

/** A source of the definitions above, whose calls are recorded */
const fakeSource = (
  failing: ReadonlyMap<string, unknown> = new Map(),
): V1_CubeIngestDefinitionSource & {
  getDefinitionElement: jest.Mock<
    V1_CubeIngestDefinitionSource['getDefinitionElement']
  >;
  getRuntimeEnvironment: jest.Mock<
    V1_CubeIngestDefinitionSource['getRuntimeEnvironment']
  >;
} => ({
  getDefinitionElement: jest.fn<
    V1_CubeIngestDefinitionSource['getDefinitionElement']
  >(async (urn) => {
    if (failing.has(urn)) {
      throw failing.get(urn);
    }
    return elementOf(urn.slice(urn.lastIndexOf('~') + 1));
  }),
  getRuntimeEnvironment: jest.fn<
    V1_CubeIngestDefinitionSource['getRuntimeEnvironment']
  >(async (environmentType) =>
    environmentType === PRODUCTION ? 'producer-env' : 'producer-env-pp',
  ),
});

const setUp = (
  ingestDefinitions?: V1_CubeIngestDefinitionSource,
  getRememberedWarehouse?: () => string | undefined,
): {
  engine: V1_LegendCubeEngine;
  run: jest.Mock;
  batch: jest.Mock;
} => {
  const engine = new V1_LegendCubeEngine(
    { baseUrl: 'http://localhost:6300/api' },
    new TracerService(),
    { ingestDefinitions, getRememberedWarehouse },
  );
  const run = jest.spyOn(engine.client, 'runQuery').mockResolvedValue({
    ok: true,
    status: 200,
    text: async () => RESULT,
  } as never);
  const batch = jest
    .spyOn(engine.client, 'batchLambdasRelationType')
    .mockResolvedValue({ result: {} } as never);
  return {
    engine,
    run: run as unknown as jest.Mock,
    batch: batch as unknown as jest.Mock,
  };
};

const sentBody = (call: unknown[]): PlainObject =>
  JSON.parse(call[0] as string) as PlainObject;

const errorOf = async (
  run: () => Promise<unknown>,
): Promise<CubeEngineError> => {
  try {
    await run();
  } catch (error) {
    if (error instanceof CubeEngineError) {
      return error;
    }
    throw error;
  }
  throw new Error('Expected a CubeEngineError');
};

/** The runtime element a run's model holds */
const runtimeOf = (environment: string, warehouse: string): PlainObject => ({
  _type: 'runtime',
  package: 'cube::ingest',
  name: 'Runtime',
  runtimeValue: {
    _type: 'LakehouseRuntime',
    connectionStores: [],
    connections: [],
    mappings: [],
    environment,
    warehouse,
  },
});

const withoutTestSuites = (element: PlainObject): PlainObject => {
  const { testSuites, ...rest } = element;
  return rest;
};

describe('Legend Cube engine: ingest cubes', () => {
  test('Outlines the model with its runtime, without calling the engine', async () => {
    const { engine, run } = setUp(fakeSource());
    expect(await engine.loadModel(MODEL)).toEqual({
      databases: [],
      runtimes: [{ path: CUBE_INGEST_RUNTIME_PATH, storePaths: [] }],
    });
    expect(run).not.toHaveBeenCalled();
  });

  test('Runs on the definitions it reads, each fetched once, and a lakehouse runtime of the cube’s class', async () => {
    const source = fakeSource();
    const { engine, run } = setUp(source);
    const query = runOf(
      func('join', [
        accessor(ORDERS, 'ingestDataset101'),
        accessor(ORDERS, 'ingestDataset102'),
        accessor(DESKS, 'ingestDataset103'),
      ]),
    );
    const result = await engine.execute(MODEL, query);
    expect(result.rows).toHaveLength(1);
    expect(source.getDefinitionElement.mock.calls).toEqual([
      [urnOf(ORDERS), PRODUCTION],
      [urnOf(DESKS), PRODUCTION],
    ]);
    expect(source.getRuntimeEnvironment.mock.calls).toEqual([[PRODUCTION]]);
    const body = sentBody(run.mock.calls[0] as unknown[]);
    expect(body.model).toEqual({
      _type: 'data',
      elements: [
        withoutTestSuites(elementOf(ORDERS)),
        withoutTestSuites(elementOf(DESKS)),
        runtimeOf('producer-env', 'SALES_WH'),
      ],
    });
    // the URN stays out of the query
    expect(JSON.stringify(body.function)).not.toContain('urn:lakehouse');
    expect(JSON.stringify(body.function)).toContain('"type":"I"');
  });

  test('Runs on the cube’s warehouse, else the one the viewer last picked, else the default, in the class’s environment', async () => {
    const parallel = createCubeIngestModel({
      environmentType: PRODUCTION_PARALLEL,
      producerDeploymentId: '1234',
    });
    const parallelQuery = runOf(
      accessor(ORDERS, 'ingestDataset101', urnOf(ORDERS, 'prod-parallel')),
    );
    const remembered = setUp(fakeSource(), () => 'MY_WH');
    await remembered.engine.execute(parallel, parallelQuery);
    expect(
      (sentBody(remembered.run.mock.calls[0] as unknown[]).model as PlainObject)
        .elements,
    ).toContainEqual(runtimeOf('producer-env-pp', 'MY_WH'));
    const fallback = setUp(fakeSource(), () => '');
    await fallback.engine.execute(parallel, parallelQuery);
    expect(
      (sentBody(fallback.run.mock.calls[0] as unknown[]).model as PlainObject)
        .elements,
    ).toContainEqual(
      runtimeOf('producer-env-pp', CUBE_DEFAULT_CONSUMER_WAREHOUSE),
    );
  });

  test.each([
    [
      'without a URN',
      ingestAccessor([ORDERS, 'TRADES'], {
        nodeId: 'ingestDataset101',
        role: EmitRole.ACCESSOR,
      }),
      V1_CUBE_INGEST_MESSAGE.NO_URN(ORDERS),
    ],
    [
      'deployed ad hoc',
      accessor(
        ORDERS,
        'ingestDataset101',
        `urn:lakehouse:prod:ingest:definition:rest-api:1234~5678~${ORDERS}`,
      ),
      V1_CUBE_INGEST_MESSAGE.NOT_SDLC(ORDERS),
    ],
    [
      'of another class',
      accessor(ORDERS, 'ingestDataset101', urnOf(ORDERS, 'prod-parallel')),
      V1_CUBE_INGEST_MESSAGE.OTHER_CLASS(ORDERS),
    ],
    [
      'whose URN names another definition',
      accessor(ORDERS, 'ingestDataset101', urnOf(DESKS)),
      V1_CUBE_INGEST_MESSAGE.OTHER_PATH(ORDERS),
    ],
  ])(
    'Refuses a data set %s before any call, on the node that runs',
    async (_, relation, message) => {
      const source = fakeSource();
      const { engine, run, batch } = setUp(source);
      const error = await errorOf(() => engine.execute(MODEL, runOf(relation)));
      expect(error.kind).toBe(CubeEngineErrorKind.EXECUTION);
      expect(error.detail).toBe(message);
      expect(error.nodeId).toBe('ingestDataset101');
      const typed = await engine.typeLambdas(
        MODEL,
        new Map([['filter101', lambda([], [relation])]]),
      );
      expect((typed.get('filter101') as CubeEngineError).detail).toBe(message);
      expect(run).not.toHaveBeenCalled();
      expect(batch).not.toHaveBeenCalled();
      expect(source.getDefinitionElement).not.toHaveBeenCalled();
    },
  );

  test('Keeps ingest data sets, data products and tables apart, before any call', async () => {
    const { engine, run, batch } = setUp(fakeSource());
    const table = storeAccessor(['a::Db', 'S', 'T'], {
      nodeId: 'relational101',
      role: EmitRole.ACCESSOR,
    });
    const accessPoint = dataProductAccessor(['a::Product', 'daily'], {
      nodeId: 'dataProductAccessPoint101',
      role: EmitRole.ACCESSOR,
    });
    const ingest = accessor(ORDERS, 'ingestDataset101');
    const cases: [ModelContext, IR, string][] = [
      [MODEL, table, 'An ingest cube reads ingest data sets only'],
      [MODEL, accessPoint, 'An ingest cube reads ingest data sets only'],
      [
        createCubeDataProductModel({
          groupId: 'g',
          artifactId: 'a',
          versionId: '1.0.0',
          environmentType: PRODUCTION,
        }),
        ingest,
        'Only an ingest cube can read ingest data sets',
      ],
      [
        { _type: 'text', code: 'Class a::A {}' } as ModelContext,
        ingest,
        'Only an ingest cube can read ingest data sets',
      ],
    ];
    for (const [model, relation, message] of cases) {
      expect(
        (await errorOf(() => engine.execute(model, runOf(relation)))).detail,
      ).toBe(message);
      const typed = await engine.typeLambdas(
        model,
        new Map([['filter101', lambda([], [relation])]]),
      );
      expect((typed.get('filter101') as CubeEngineError).detail).toBe(message);
    }
    expect(
      (
        (
          await engine.resolveSchemas(
            MODEL,
            new Map([['relational101', ['a::Db', 'S', 'T']]]),
          )
        ).get('relational101') as CubeEngineError
      ).detail,
    ).toBe('An ingest cube reads ingest data sets only');
    expect(run).not.toHaveBeenCalled();
    expect(batch).not.toHaveBeenCalled();
  });

  test('Types on the definitions alone, failing only the lambdas whose definition can’t be read', async () => {
    const source = fakeSource(
      new Map([
        [
          urnOf(DESKS),
          new CubeEngineError(
            CubeEngineErrorKind.NETWORK,
            'Ingest definition sales::ingest::DesksIngest is no longer deployed',
          ),
        ],
      ]),
    );
    const { engine, batch } = setUp(source);
    batch.mockResolvedValueOnce({
      result: {
        filter101: {
          columns: [
            {
              name: 'TRADE_ID',
              genericType: {
                rawType: { _type: 'packageableType', fullPath: 'Integer' },
                typeArguments: [],
                multiplicityArguments: [],
                typeVariableValues: [],
              },
              multiplicity: { lowerBound: 1, upperBound: 1 },
            },
          ],
        },
      },
    } as never);
    const typed = await engine.typeLambdas(
      MODEL,
      new Map([
        ['filter101', lambda([], [accessor(ORDERS, 'ingestDataset101')])],
        ['filter102', lambda([], [accessor(DESKS, 'ingestDataset102')])],
      ]),
    );
    expect([...typed.keys()]).toEqual(['filter101', 'filter102']);
    expect(typed.get('filter101')).not.toBeInstanceOf(CubeEngineError);
    const failed = typed.get('filter102') as CubeEngineError;
    expect(failed.kind).toBe(CubeEngineErrorKind.NETWORK);
    expect(failed.nodeId).toBe('filter102');
    expect(failed.detail).toContain('no longer deployed');
    const body = JSON.parse(
      (batch.mock.calls[0] as unknown[])[0] as string,
    ) as PlainObject;
    expect(body.model).toEqual({
      _type: 'data',
      elements: [withoutTestSuites(elementOf(ORDERS))],
    });
    expect(Object.keys(body.lambdas as PlainObject)).toEqual(['filter101']);
  });

  test('Fails a run whose definition or environment can’t be read, on the node that runs', async () => {
    const gone = setUp(
      fakeSource(new Map([[urnOf(ORDERS), new Error('404 Not Found')]])),
    );
    const error = await errorOf(() =>
      gone.engine.execute(MODEL, runOf(accessor(ORDERS, 'ingestDataset101'))),
    );
    expect(error.kind).toBe(CubeEngineErrorKind.NETWORK);
    expect(error.detail).toBe('404 Not Found');
    expect(error.nodeId).toBe('ingestDataset101');
    expect(gone.run).not.toHaveBeenCalled();
    const source = fakeSource();
    source.getRuntimeEnvironment.mockRejectedValueOnce(
      new Error('The platform server is down'),
    );
    const noEnvironment = setUp(source);
    const environmentError = await errorOf(() =>
      noEnvironment.engine.execute(
        MODEL,
        runOf(accessor(ORDERS, 'ingestDataset101')),
      ),
    );
    expect(environmentError.kind).toBe(CubeEngineErrorKind.EXECUTION);
    expect(environmentError.detail).toBe('The platform server is down');
    expect(noEnvironment.run).not.toHaveBeenCalled();
  });

  test('Says so when the host has no ingest servers, and refuses a model it can’t use', async () => {
    const { engine, run } = setUp();
    const noSource = await errorOf(() =>
      engine.execute(MODEL, runOf(accessor(ORDERS, 'ingestDataset101'))),
    );
    expect(noSource.kind).toBe(CubeEngineErrorKind.UNSUPPORTED_MODEL);
    expect(noSource.detail).toBe(
      "This page can't read ingest data sets: its host has no ingest servers",
    );
    const broken = {
      _type: CUBE_INGEST_MODEL_TYPE,
      environmentType: 'DEVELOPMENT',
      producerDeploymentId: '1234',
    } as ModelContext;
    expect((await errorOf(() => engine.loadModel(broken))).detail).toBe(
      `Cube doesn't know the environment type "DEVELOPMENT"`,
    );
    const typed = await engine.typeLambdas(
      broken,
      new Map([['filter101', lambda([], [accessor(ORDERS, 'x')])]]),
    );
    expect((typed.get('filter101') as CubeEngineError).kind).toBe(
      CubeEngineErrorKind.UNSUPPORTED_MODEL,
    );
    expect(run).not.toHaveBeenCalled();
  });
});
