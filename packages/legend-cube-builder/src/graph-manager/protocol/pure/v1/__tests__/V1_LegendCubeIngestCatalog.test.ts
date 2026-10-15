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
import type { Schema } from '@finos/legend-cube';
import {
  LakehouseContractServerClient,
  LakehouseIngestServerClient,
  LakehousePlatformServerClient,
} from '@finos/legend-server-lakehouse';
import { V1_EngineServerClient } from '@finos/legend-graph';
import {
  NetworkClientError,
  type PlainObject,
  TracerService,
} from '@finos/legend-shared';
import { CubeDataProductEnvironmentType } from '../../../../CubeDataProduct.js';
import {
  CubeEngineError,
  CubeEngineErrorKind,
} from '../../../../CubeEngine.js';
import { buildCubeIngestCatalog } from '../../CubeEngineBuilder.js';
import {
  V1_CUBE_INGEST_CATALOG_MESSAGE,
  V1_LegendCubeIngestCatalog,
} from '../V1_LegendCubeIngestCatalog.js';

// The deployed ingest definitions, read as Data Cube's producer source reads
// them, on clients whose calls are mocked; the row shapes follow
// legend-server-lakehouse's models and Marketplace's test data

const { PRODUCTION, PRODUCTION_PARALLEL } = CubeDataProductEnvironmentType;

const PROD_SERVER = 'https://lakehouse-ingest-env-a-server.example.com';
const PP_SERVER = 'https://lakehouse-ingest-env-a-pp-server.example.com';

const SUMMARIES = [
  {
    ingestEnvironmentUrn: 'urn:a',
    environmentName: 'env-a',
    environmentClassification: 'prod',
    ingestServerUrl: PROD_SERVER,
  },
  {
    ingestEnvironmentUrn: 'urn:a-pp',
    environmentName: 'env-a',
    environmentClassification: 'prod-parallel',
    ingestServerUrl: PP_SERVER,
  },
  {
    ingestEnvironmentUrn: 'urn:b',
    environmentName: 'env-b',
    environmentClassification: 'prod',
    ingestServerUrl: 'https://lakehouse-ingest-env-b-server.example.com',
  },
];

const ORDERS = 'sales::ingest::OrdersIngest';
const ORDERS_URN = `urn:lakehouse:prod:ingest:definition:alloy-git:com.example~sales~${ORDERS}`;

const PRODUCERS = [
  'urn:lakehouse:prod:producer:deployment:1234',
  'urn:lakehouse:prod:producer:deployment:5678',
  'urn:lakehouse:prod:producer:user:someone',
];

const DEFINITIONS = [
  ORDERS_URN,
  'urn:lakehouse:prod:ingest:definition:alloy-git:com.example~sales~sales::ingest::DesksIngest',
  'urn:lakehouse:prod:ingest:definition:rest-api:1234~5678~adhoc::Ingest',
  'urn:lakehouse:prod-parallel:ingest:definition:alloy-git:g~a~p::Other',
];

/** The definition's element, as the engine parses the ingest server's grammar */
const ELEMENT: PlainObject = {
  _type: 'ingestDefinition',
  package: 'sales::ingest',
  name: 'OrdersIngest',
  writeMode: { _type: 'append_only' },
  datasets: [
    {
      name: 'TRADES',
      primaryKey: ['ID'],
      source: {
        _type: 'serializedSource',
        schema: {
          _type: 'relationType',
          columns: [
            {
              name: 'ID',
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
    },
    {
      name: 'DAILY',
      primaryKey: [],
      source: { _type: 'FunctionSource', function: { _type: 'lambda' } },
    },
  ],
};

const notFound = (): NetworkClientError =>
  new NetworkClientError(
    { status: 404, statusText: 'Not Found', url: PROD_SERVER } as Response,
    undefined,
  );

const setUp = (
  baseEnvironment = 'env-a',
): {
  catalog: V1_LegendCubeIngestCatalog;
  summaries: jest.Mock;
  producers: jest.Mock;
  definitions: jest.Mock;
  grammar: jest.Mock;
  parse: jest.Mock;
} => {
  const platform = new LakehousePlatformServerClient('http://platform.test');
  const ingest = new LakehouseIngestServerClient(undefined);
  const summaries = jest
    .spyOn(platform, 'getIngestEnvironmentSummaries')
    .mockImplementation((async () => SUMMARIES) as never);
  const producers = jest
    .spyOn(ingest, 'getProducerEnvironments')
    .mockImplementation((async () => PRODUCERS) as never);
  const definitions = jest
    .spyOn(ingest, 'getIngestDefinitions')
    .mockImplementation((async () => DEFINITIONS) as never);
  const grammar = jest
    .spyOn(ingest, 'getIngestDefinitionGrammar')
    .mockImplementation(
      (async () => 'Ingest sales::ingest::OrdersIngest …') as never,
    );
  const parse = jest.fn(async () => ({ _type: 'data', elements: [ELEMENT] }));
  return {
    catalog: new V1_LegendCubeIngestCatalog(
      platform,
      ingest,
      async () => baseEnvironment,
      parse as unknown as (code: string) => Promise<PlainObject>,
      () => 'token',
    ),
    summaries: summaries as unknown as jest.Mock,
    producers: producers as unknown as jest.Mock,
    definitions: definitions as unknown as jest.Mock,
    grammar: grammar as unknown as jest.Mock,
    parse,
  };
};

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

describe('The deployed ingest definitions of a lakehouse', () => {
  test("Finds the viewer's ingest environment of each class, and the environment runs name, from its server", async () => {
    const { catalog, summaries } = setUp();
    const production = await catalog.resolveEnvironment(PRODUCTION);
    expect(production.name).toBe('env-a');
    expect(production.runtimeEnvironment).toBe('lakehouse-ingest-env-a');
    expect(
      (await catalog.resolveEnvironment(PRODUCTION_PARALLEL))
        .runtimeEnvironment,
    ).toBe('lakehouse-ingest-env-a-pp');
    expect(await catalog.getRuntimeEnvironment(PRODUCTION)).toBe(
      'lakehouse-ingest-env-a',
    );
    expect(summaries).toHaveBeenCalledTimes(1);
    expect(summaries).toHaveBeenCalledWith('token');
    const elsewhere = setUp('env-c');
    expect(
      (await errorOf(() => elsewhere.catalog.resolveEnvironment(PRODUCTION)))
        .detail,
    ).toBe(V1_CUBE_INGEST_CATALOG_MESSAGE.NO_ENVIRONMENT('env-c', PRODUCTION));
    expect(
      V1_CUBE_INGEST_CATALOG_MESSAGE.NO_ENVIRONMENT('env-c', PRODUCTION),
    ).toBe('The lakehouse has no production ingest environment named env-c');
  });

  test('Lists the producer deployments of the environment, numeric ones only, once per class', async () => {
    const { catalog, producers } = setUp();
    const listed = await catalog.listProducers(PRODUCTION);
    expect(listed.map((each) => each.deploymentId)).toEqual(['1234', '5678']);
    await catalog.listProducers(PRODUCTION);
    expect(producers.mock.calls).toEqual([[PROD_SERVER, 'token']]);
    await catalog.listProducers(PRODUCTION_PARALLEL);
    expect(producers.mock.calls[1]).toEqual([PP_SERVER, 'token']);
  });

  test("Lists a producer's SDLC-deployed definitions of the class, counting the others", async () => {
    const { catalog, definitions } = setUp();
    const list = await catalog.listDefinitions(PRODUCTION, '1234');
    expect(
      list.candidates.map((each) => [
        each.definition,
        each.name,
        `${each.groupId}:${each.artifactId}`,
      ]),
    ).toEqual([
      [ORDERS, 'OrdersIngest', 'com.example:sales'],
      ['sales::ingest::DesksIngest', 'DesksIngest', 'com.example:sales'],
    ]);
    expect(list.droppedCount).toBe(2);
    expect(definitions.mock.calls).toEqual([
      ['urn:lakehouse:prod:producer:deployment:1234', PROD_SERVER, 'token'],
    ]);
    expect(
      (await errorOf(() => catalog.listDefinitions(PRODUCTION, '9999'))).detail,
    ).toBe(V1_CUBE_INGEST_CATALOG_MESSAGE.NO_PRODUCER('9999'));
  });

  test("Reads a definition's data sets from its grammar, which the engine parses, once a visit unless fresh", async () => {
    const { catalog, grammar, parse } = setUp();
    const dataSets = await catalog.describe(ORDERS_URN, PRODUCTION);
    expect(dataSets.map((each) => [each.name, each.isPickable])).toEqual([
      ['TRADES', true],
      ['DAILY', false],
    ]);
    expect(grammar.mock.calls).toEqual([[ORDERS_URN, PROD_SERVER, 'token']]);
    expect(parse.mock.calls).toEqual([
      ['###Lakehouse\nIngest sales::ingest::OrdersIngest …'],
    ]);
    // the engine types and runs on the same element
    expect(await catalog.getDefinitionElement(ORDERS_URN, PRODUCTION)).toBe(
      ELEMENT,
    );
    expect(grammar).toHaveBeenCalledTimes(1);
    await catalog.describe(ORDERS_URN, PRODUCTION, { fresh: true });
    expect(grammar).toHaveBeenCalledTimes(2);
  });

  test('Says a definition is gone, or unreadable, and reads it again after a failure', async () => {
    const { catalog, grammar, parse } = setUp();
    grammar.mockImplementationOnce(async () => {
      throw notFound();
    });
    const gone = await errorOf(() => catalog.describe(ORDERS_URN, PRODUCTION));
    expect(gone.kind).toBe(CubeEngineErrorKind.NETWORK);
    expect(gone.detail).toBe(V1_CUBE_INGEST_CATALOG_MESSAGE.GONE(ORDERS));
    parse.mockImplementationOnce(async () => {
      throw new Error("Parser error: 'Lakehouse' is not a known section\nat 1");
    });
    const unparsable = await errorOf(() =>
      catalog.describe(ORDERS_URN, PRODUCTION),
    );
    expect(unparsable.kind).toBe(CubeEngineErrorKind.COMPILE);
    expect(unparsable.detail).toBe(
      V1_CUBE_INGEST_CATALOG_MESSAGE.UNPARSABLE(
        ORDERS_URN,
        "Parser error: 'Lakehouse' is not a known section",
      ),
    );
    parse.mockImplementationOnce(async () => ({
      _type: 'data',
      elements: [{ ...ELEMENT, name: 'Other' }],
    }));
    expect(
      (await errorOf(() => catalog.describe(ORDERS_URN, PRODUCTION))).detail,
    ).toBe(V1_CUBE_INGEST_CATALOG_MESSAGE.NOT_ONE_DEFINITION(ORDERS));
    expect(
      (await catalog.describe(ORDERS_URN, PRODUCTION)).map((each) => each.name),
    ).toEqual(['TRADES', 'DAILY']);
  });

  test('Resolves each saved source to its data set’s schema, or its node’s error', async () => {
    const { catalog, grammar } = setUp();
    const DESKS_URN = DEFINITIONS[1] as string;
    grammar.mockImplementation((async (urn: string) => {
      if (urn === DESKS_URN) {
        throw notFound();
      }
      return 'Ingest …';
    }) as never);
    const resolved = await catalog.resolveSchemas(
      PRODUCTION,
      new Map([
        [
          'ingestDataset101',
          {
            ingestDefinitionUrn: ORDERS_URN,
            ingestDefinition: ORDERS,
            dataSet: 'TRADES',
          },
        ],
        [
          'ingestDataset102',
          {
            ingestDefinitionUrn: ORDERS_URN,
            ingestDefinition: ORDERS,
            dataSet: 'DAILY',
          },
        ],
        [
          'ingestDataset103',
          {
            ingestDefinitionUrn: ORDERS_URN,
            ingestDefinition: ORDERS,
            dataSet: 'GONE',
          },
        ],
        [
          'ingestDataset104',
          {
            ingestDefinitionUrn: DESKS_URN,
            ingestDefinition: 'sales::ingest::DesksIngest',
            dataSet: 'DESKS',
          },
        ],
      ]),
    );
    expect(
      (resolved.get('ingestDataset101') as Schema).columns.map(
        (each) => each.name,
      ),
    ).toEqual(['ID']);
    const errors = Object.fromEntries(
      ['ingestDataset102', 'ingestDataset103', 'ingestDataset104'].map(
        (nodeId) => {
          const error = resolved.get(nodeId) as CubeEngineError;
          return [nodeId, [error.nodeId, error.detail]];
        },
      ),
    );
    expect(errors).toEqual({
      ingestDataset102: [
        'ingestDataset102',
        'It is a materialized view, which Cube does not support yet',
      ],
      ingestDataset103: [
        'ingestDataset103',
        V1_CUBE_INGEST_CATALOG_MESSAGE.NO_DATA_SET('GONE', ORDERS),
      ],
      ingestDataset104: [
        'ingestDataset104',
        V1_CUBE_INGEST_CATALOG_MESSAGE.GONE('sales::ingest::DesksIngest'),
      ],
    });
    // one read per definition
    expect(grammar).toHaveBeenCalledTimes(2);
  });

  test("Names producer deployments from the deployment directory, asking once for those it hasn't asked, again after a failure", async () => {
    const read = jest.fn(async (ids: readonly string[]) =>
      Promise.resolve(
        [
          { 'Deployment Id': 1234, 'Deployment Name': 'Sales Feed' },
          { 'Deployment Id': 5678, 'Deployment Name': ' ' },
          'not a row',
        ].filter(
          (row) =>
            typeof row !== 'object' ||
            ids.includes(String(row['Deployment Id'])),
        ),
      ),
    );
    const platform = new LakehousePlatformServerClient('http://platform.test');
    const catalog = new V1_LegendCubeIngestCatalog(
      platform,
      new LakehouseIngestServerClient(undefined),
      async () => 'env-a',
      async () => ({}),
      () => 'token',
      { readDeploymentNames: read },
    );
    // one call for both; a blank name is no name
    expect([...(await catalog.getProducerNames(['1234', '5678']))]).toEqual([
      ['1234', 'Sales Feed'],
    ]);
    expect(read).toHaveBeenCalledTimes(1);
    expect(read).toHaveBeenCalledWith(['1234', '5678']);
    // asked already, whatever the answer
    await catalog.getProducerNames(['5678', '1234']);
    expect(read).toHaveBeenCalledTimes(1);
    // only the new one is asked
    await catalog.getProducerNames(['1234', '9999']);
    expect(read).toHaveBeenLastCalledWith(['9999']);

    read.mockRejectedValueOnce(new Error('directory down'));
    expect((await errorOf(() => catalog.getProducerNames(['4321']))).kind).toBe(
      CubeEngineErrorKind.NETWORK,
    );
    await catalog.getProducerNames(['4321']);
    expect(read).toHaveBeenLastCalledWith(['4321']);
    expect(read).toHaveBeenCalledTimes(4);

    // without a directory, no names, nothing called
    expect((await setUp().catalog.getProducerNames(['1234'])).size).toBe(0);
  });

  test('Asks the Legend user service Marketplace configures for the names, several deployments at once', async () => {
    const execute = jest
      .spyOn(V1_EngineServerClient.prototype, 'get')
      .mockImplementation((async () => [
        { 'Deployment Id': 1234, 'Deployment Name': 'Sales Feed' },
      ]) as never);
    try {
      const catalog = buildCubeIngestCatalog(
        { baseUrl: 'http://engine.test' },
        new TracerService(),
        {
          contractServerClient: new LakehouseContractServerClient({
            baseUrl: 'http://contract.test',
          }),
          depotServerClient: {} as never,
          getAccessToken: () => 'token',
          getCurrentUser: () => 'someone',
          platformServerClient: new LakehousePlatformServerClient(
            'http://platform.test',
          ),
          ingestServerClient: new LakehouseIngestServerClient(undefined),
          deploymentNameServiceUrl: '/directory/deploymentNames',
        },
      );
      expect([
        ...((await catalog?.getProducerNames?.(['1234', '5678'])) ?? []),
      ]).toEqual([['1234', 'Sales Feed']]);
      // as Marketplace's producer info asks: one id per repeated parameter
      expect(execute).toHaveBeenCalledWith(
        'http://engine.test/user/directory/deploymentNames',
        {},
        undefined,
        {
          env: 'PROD',
          deploymentIds: [1234, 5678],
          serializationFormat: expect.any(String),
        },
      );
    } finally {
      execute.mockRestore();
    }
  });

  test('Is built only for a host with a lakehouse platform and its ingest servers', () => {
    const contractServerClient = new LakehouseContractServerClient({
      baseUrl: 'http://lakehouse.test',
    });
    const services = {
      contractServerClient,
      depotServerClient: undefined as never,
      getAccessToken: () => 'token',
      getCurrentUser: () => 'viewer',
    };
    const config = { baseUrl: 'http://engine.test/api' };
    expect(
      buildCubeIngestCatalog(config, new TracerService(), services),
    ).toBeUndefined();
    expect(
      buildCubeIngestCatalog(config, new TracerService(), {
        ...services,
        platformServerClient: new LakehousePlatformServerClient(
          'http://platform.test',
        ),
        ingestServerClient: new LakehouseIngestServerClient(undefined),
      }),
    ).toBeInstanceOf(V1_LegendCubeIngestCatalog);
  });
});
