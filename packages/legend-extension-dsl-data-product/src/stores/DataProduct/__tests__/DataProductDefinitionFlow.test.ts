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
import { createDepotIngestDefinitionLoader } from '../DataProductDefinitionFlow.js';

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
