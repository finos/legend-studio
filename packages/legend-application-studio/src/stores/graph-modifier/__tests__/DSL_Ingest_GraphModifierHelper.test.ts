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

import { test, expect } from '@jest/globals';
import { unitTest } from '@finos/legend-shared/test';
import {
  TEST__buildGraphWithEntities,
  TEST__getTestGraphManagerState,
} from '@finos/legend-graph/test';
import { ExtendedIngestDefinition } from '@finos/legend-graph';
import type { Entity } from '@finos/legend-storage';
import {
  ingestDefinition_addMaterializedView,
  ingestDefinition_updateMaterializedView,
} from '../DSL_Ingest_GraphModifierHelper.js';

const INGEST_PATH = 'model::PersonIngest';
const CLASSIFIER_PATH =
  'meta::external::ingest::specification::metamodel::IngestDefinition';

const buildEntities = (_type: string): Entity[] => [
  {
    path: INGEST_PATH,
    classifierPath: CLASSIFIER_PATH,
    content: {
      _type,
      batchAttributesGenerator: {
        _type: 'packageableElementPointer',
        path: 'model::batchAttributes__Any_1_',
      },
      datasets: [],
      name: 'PersonIngest',
      package: 'model',
    },
  },
];

const LAMBDA = {
  _type: 'lambda',
  body: [{ _type: 'string', value: 'a' }],
  parameters: [],
};
const OPTIONS = { primaryKey: [], sensitivity: 'DP10' };

test(
  unitTest('Editing an extended ingest definition keeps its _type'),
  async () => {
    const graphManagerState = TEST__getTestGraphManagerState();
    await TEST__buildGraphWithEntities(
      graphManagerState,
      buildEntities('extendedIngestDefinition'),
    );
    const ingest = graphManagerState.graph.getIngestDefinition(INGEST_PATH);
    expect(ingest).toBeInstanceOf(ExtendedIngestDefinition);

    ingestDefinition_addMaterializedView(ingest, 'View', LAMBDA, OPTIONS);
    ingestDefinition_updateMaterializedView(ingest, 'View', LAMBDA, OPTIONS);

    const content =
      graphManagerState.graphManager.elementToEntity(ingest).content;
    expect(content._type).toBe('extendedIngestDefinition');
    expect(content.batchAttributesGenerator).toBeDefined();
    expect(content.datasets).toHaveLength(1);
  },
);

test(
  unitTest('Editing a plain ingest definition keeps its _type'),
  async () => {
    const graphManagerState = TEST__getTestGraphManagerState();
    await TEST__buildGraphWithEntities(
      graphManagerState,
      buildEntities('ingestDefinition'),
    );
    const ingest = graphManagerState.graph.getIngestDefinition(INGEST_PATH);
    ingestDefinition_addMaterializedView(ingest, 'View', LAMBDA, OPTIONS);
    expect(
      graphManagerState.graphManager.elementToEntity(ingest).content._type,
    ).toBe('ingestDefinition');
  },
);
