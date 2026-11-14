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
  DepotServerClient,
  MASTER_SNAPSHOT_ALIAS,
  SNAPSHOT_VERSION_ALIAS,
} from '@finos/legend-server-depot';
import { createSpy } from '@finos/legend-shared/test';
import {
  createDepotFunctionLoader,
  createDepotIngestDefinitionLoader,
} from '../DataProductDefinitionFlow.js';

const INGEST_DEFINITION = 'markets::ingest::TradePositionsIngest';
const CONTENT = {
  _type: 'ingestDefinition',
  name: 'TradePositionsIngest',
  package: 'markets::ingest',
};

describe('Ingest definitions from Depot, for an access point definition flow', () => {
  test("reads the ingest definition's content at the data product's version", async () => {
    const depotServerClient = new DepotServerClient({
      serverUrl: 'http://testDepotServerClientUrl',
    });
    const getVersionEntity = createSpy(
      depotServerClient,
      'getVersionEntity',
    ).mockResolvedValue({
      path: INGEST_DEFINITION,
      classifierPath:
        'meta::external::ingest::specification::metamodel::IngestDefinition',
      content: CONTENT,
    });

    const load = createDepotIngestDefinitionLoader(depotServerClient, {
      groupId: 'com.example.markets',
      artifactId: 'trade-positions',
      versionId: '1.2.0',
    });
    expect(await load(INGEST_DEFINITION)).toEqual(CONTENT);
    expect(getVersionEntity).toHaveBeenCalledWith(
      'com.example.markets',
      'trade-positions',
      '1.2.0',
      INGEST_DEFINITION,
    );

    // a snapshot is asked for by Depot's name for it
    await createDepotIngestDefinitionLoader(depotServerClient, {
      groupId: 'com.example.markets',
      artifactId: 'trade-positions',
      versionId: SNAPSHOT_VERSION_ALIAS,
    })(INGEST_DEFINITION);
    expect(getVersionEntity).toHaveBeenLastCalledWith(
      'com.example.markets',
      'trade-positions',
      MASTER_SNAPSHOT_ALIAS,
      INGEST_DEFINITION,
    );
  });
});

describe('Functions from Depot, for an access point definition flow (PLAN §11.33)', () => {
  const FUNCTION_CLASSIFIER =
    'meta::pure::metamodel::function::ConcreteFunctionDefinition';
  const PROJECT = {
    groupId: 'com.example.shop',
    artifactId: 'order-insights',
    versionId: '1.4.0',
  };
  const stored = (path: string): Record<string, unknown> => ({
    entity: {
      path,
      classifierPath: FUNCTION_CLASSIFIER,
      content: { _type: 'function', name: path.split('::').at(-1) },
    },
  });
  /** Depot's answer: the project's own functions, then a dependency's */
  const DEPENDENCIES = [
    {
      ...PROJECT,
      versionedEntity: false,
      entities: [
        stored('shop::orders::activeOrders__Relation_1_'),
        stored('shop::orders::active_orders_by_desk_String_1__Relation_1_'),
        stored('shop::orders::ordersSince_StrictDate_1__Relation_1_'),
      ],
    },
    {
      groupId: 'com.example.shop',
      artifactId: 'shop-common',
      versionId: '2.1.0',
      versionedEntity: false,
      entities: [stored('shop::common::onlyOpen_Relation_1__Relation_1_')],
    },
  ];

  test('reads every function of the project and its dependencies in one request, kept for the page', async () => {
    const depotServerClient = new DepotServerClient({
      serverUrl: 'http://testDepotServerClientUrl',
    });
    const getDependencyEntities = createSpy(
      depotServerClient,
      'getDependencyEntities',
    ).mockResolvedValue(DEPENDENCIES);
    const load = createDepotFunctionLoader(depotServerClient, PROJECT);

    // a call names a function without its signature: the elements of that name
    expect(
      (await load(['shop::orders::activeOrders'])).map((each) => each.path),
    ).toEqual(['shop::orders::activeOrders__Relation_1_']);
    expect(
      (await load(['shop::common::onlyOpen', 'shop::orders::ordersSince'])).map(
        (each) => [each.path, each.origin],
      ),
    ).toEqual([
      // the data product's own project goes without saying
      ['shop::orders::ordersSince_StrictDate_1__Relation_1_', undefined],
      [
        'shop::common::onlyOpen_Relation_1__Relation_1_',
        'com.example.shop:shop-common:2.1.0',
      ],
    ]);
    expect(await load(['shop::orders::missing'])).toEqual([]);
    expect(getDependencyEntities).toHaveBeenCalledTimes(1);
    expect(getDependencyEntities).toHaveBeenCalledWith(
      'com.example.shop',
      'order-insights',
      '1.4.0',
      true,
      true,
      FUNCTION_CLASSIFIER,
    );
  });

  test('asks Depot again after a failure', async () => {
    const depotServerClient = new DepotServerClient({
      serverUrl: 'http://testDepotServerClientUrl',
    });
    const getDependencyEntities = createSpy(
      depotServerClient,
      'getDependencyEntities',
    )
      .mockRejectedValueOnce(new Error('Depot is down'))
      .mockResolvedValue(DEPENDENCIES);
    const load = createDepotFunctionLoader(depotServerClient, PROJECT);
    await expect(load(['shop::orders::activeOrders'])).rejects.toThrow(
      'Depot is down',
    );
    expect(
      (await load(['shop::orders::activeOrders'])).map((each) => each.path),
    ).toEqual(['shop::orders::activeOrders__Relation_1_']);
    expect(getDependencyEntities).toHaveBeenCalledTimes(2);
  });
});
