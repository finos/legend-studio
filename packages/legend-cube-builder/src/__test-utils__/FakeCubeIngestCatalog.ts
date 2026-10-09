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

import { jest } from '@jest/globals';
import { PrimitiveType, Schema, SchemaColumn } from '@finos/legend-cube';
import { CubeDataProductEnvironmentType } from '../graph-manager/CubeDataProduct.js';
import {
  CubeEngineError,
  CubeEngineErrorKind,
} from '../graph-manager/CubeEngine.js';
import {
  type CubeIngestCatalog,
  CubeIngestDataSet,
  CubeIngestDefinitionCandidate,
  CubeIngestEnvironment,
  CubeIngestProducer,
} from '../graph-manager/CubeIngestCatalog.js';

// A fake of the deployed ingest definitions, for the Ingest tab's and the
// editor's tests: producer deployment 1234 deploys two definitions from
// com.example:sales, 5678 none

const { PRODUCTION, PRODUCTION_PARALLEL } = CubeDataProductEnvironmentType;

export const FAKE_INGEST_ORDERS = 'sales::ingest::OrdersIngest';
export const FAKE_INGEST_DESKS = 'sales::ingest::DesksIngest';

export const fakeIngestUrnOf = (
  definition: string,
  environmentType = PRODUCTION,
): string =>
  `urn:lakehouse:${environmentType === PRODUCTION ? 'prod' : 'prod-parallel'}:ingest:definition:alloy-git:com.example~sales~${definition}`;

export const FAKE_INGEST_TRADES_SCHEMA = new Schema([
  new SchemaColumn('TRADE_ID', PrimitiveType.get('Integer'), false),
  new SchemaColumn(
    'DESK',
    PrimitiveType.get('meta::pure::precisePrimitives::Varchar', [20]),
    true,
  ),
]);

export const FAKE_INGEST_DESKS_SCHEMA = new Schema([
  new SchemaColumn('DESK', PrimitiveType.get('String'), false),
]);

const DATA_SETS: ReadonlyMap<string, readonly CubeIngestDataSet[]> = new Map([
  [
    FAKE_INGEST_ORDERS,
    [
      new CubeIngestDataSet({
        name: 'TRADES',
        schema: FAKE_INGEST_TRADES_SCHEMA,
        primaryKey: ['TRADE_ID'],
      }),
      new CubeIngestDataSet({
        name: 'DAILY',
        disabledReason:
          'It is a materialized view, which Cube does not support yet',
      }),
    ],
  ],
  [
    FAKE_INGEST_DESKS,
    [
      new CubeIngestDataSet({
        name: 'DESKS',
        schema: FAKE_INGEST_DESKS_SCHEMA,
      }),
    ],
  ],
]);

const definitionOf = (urn: string): string =>
  urn.slice(urn.lastIndexOf('~') + 1);

export interface FakeCubeIngestCatalog {
  catalog: CubeIngestCatalog;
  resolveEnvironment: jest.Mock<CubeIngestCatalog['resolveEnvironment']>;
  listProducers: jest.Mock<CubeIngestCatalog['listProducers']>;
  listDefinitions: jest.Mock<CubeIngestCatalog['listDefinitions']>;
  describe: jest.Mock<CubeIngestCatalog['describe']>;
  resolveSchemas: jest.Mock<CubeIngestCatalog['resolveSchemas']>;
}

/** A fresh fake: build one per test, since jest.fn keeps its calls across tests */
export const createFakeCubeIngestCatalog = (): FakeCubeIngestCatalog => {
  const resolveEnvironment = jest.fn<CubeIngestCatalog['resolveEnvironment']>(
    async (environmentType) =>
      Promise.resolve(
        new CubeIngestEnvironment({
          environmentType,
          name: 'env-a',
          runtimeEnvironment:
            environmentType === PRODUCTION_PARALLEL
              ? 'lakehouse-ingest-env-a-pp'
              : 'lakehouse-ingest-env-a',
        }),
      ),
  );
  const listProducers = jest.fn<CubeIngestCatalog['listProducers']>(async () =>
    Promise.resolve(
      ['1234', '5678'].map(
        (deploymentId) =>
          new CubeIngestProducer({
            deploymentId,
            urn: `urn:lakehouse:prod:producer:deployment:${deploymentId}`,
          }),
      ),
    ),
  );
  const listDefinitions = jest.fn<CubeIngestCatalog['listDefinitions']>(
    async (environmentType, producerDeploymentId) =>
      Promise.resolve(
        producerDeploymentId === '1234'
          ? {
              candidates: [FAKE_INGEST_ORDERS, FAKE_INGEST_DESKS].map(
                (definition) =>
                  new CubeIngestDefinitionCandidate({
                    urn: fakeIngestUrnOf(definition, environmentType),
                    definition,
                    groupId: 'com.example',
                    artifactId: 'sales',
                  }),
              ),
              droppedCount: 1,
            }
          : { candidates: [], droppedCount: 0 },
      ),
  );
  const describe = jest.fn<CubeIngestCatalog['describe']>(async (urn) =>
    Promise.resolve(DATA_SETS.get(definitionOf(urn)) ?? []),
  );
  const resolveSchemas = jest.fn<CubeIngestCatalog['resolveSchemas']>(
    async (_environmentType, sources) =>
      Promise.resolve(
        new Map(
          [...sources].map(([nodeId, source]) => [
            nodeId,
            DATA_SETS.get(source.ingestDefinition)?.find(
              (dataSet) => dataSet.name === source.dataSet,
            )?.schema ??
              new CubeEngineError(
                CubeEngineErrorKind.COMPILE,
                `Ingest definition ${source.ingestDefinition} has no data set ${source.dataSet}`,
                nodeId,
              ),
          ]),
        ),
      ),
  );
  return {
    catalog: {
      environmentTypes: [PRODUCTION, PRODUCTION_PARALLEL],
      resolveEnvironment,
      listProducers,
      listDefinitions,
      describe,
      resolveSchemas,
    },
    resolveEnvironment,
    listProducers,
    listDefinitions,
    describe,
    resolveSchemas,
  };
};
