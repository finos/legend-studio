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
import { guaranteeType } from '@finos/legend-shared';
import type { Entity } from '@finos/legend-storage';
import { TEST__buildGraphWithEntities } from '@finos/legend-graph/test';
import {
  type EditorStore,
  LegendStudioPluginManager,
  graph_addElement,
} from '@finos/legend-application-studio';
import { TEST__getTestEditorStore } from '@finos/legend-application-studio/test';
import { DSL_Persistence_GraphManagerPreset } from '../../../graph-manager/DSL_Persistence_GraphManagerPreset.js';
import { DSL_Persistence_LegendStudioApplicationPlugin } from '../../../components/studio/DSL_Persistence_LegendStudioApplicationPlugin.js';
import { Persistence } from '../../../graph/metamodel/pure/model/packageableElements/persistence/DSL_Persistence_Persistence.js';
import { NewPersistenceDriver } from '../DSL_Persistence_NewPersistenceDriver.js';
import { TEST_DATA__roundtrip_append_only_allow_duplicates } from '../../../graph-manager/__tests__/TEST_DATA_DSL_PersistenceV2_Roundtrip.js';

const PERSISTENCE_ELEMENT_TYPE = 'PERSISTENCE';
const PERSISTENCE_CLASSIFIER_PATH =
  'meta::pure::persistence::metamodel::Persistence';

// the service this persistence will point at, with the class, store and mapping it needs
const TEST_DATA__serviceEntities = (
  TEST_DATA__roundtrip_append_only_allow_duplicates as Entity[]
).filter((entity) => entity.classifierPath !== PERSISTENCE_CLASSIFIER_PATH);

const createEditorStore = async (entities: Entity[]): Promise<EditorStore> => {
  const pluginManager = LegendStudioPluginManager.create();
  pluginManager
    .usePresets([new DSL_Persistence_GraphManagerPreset()])
    .usePlugins([new DSL_Persistence_LegendStudioApplicationPlugin()])
    .install();
  const editorStore = TEST__getTestEditorStore(pluginManager);
  await TEST__buildGraphWithEntities(editorStore.graphManagerState, entities);
  return editorStore;
};

test(
  unitTest(
    'Creating a persistence from the new element dialog gives a complete element',
  ),
  async () => {
    const editorStore = await createEditorStore(TEST_DATA__serviceEntities);
    const newElementState = editorStore.newElementState;

    // what the dialog does: pick the type, fill in the driver, then create
    newElementState.setElementType(PERSISTENCE_ELEMENT_TYPE);
    const driver = newElementState.getNewElementDriver(NewPersistenceDriver);
    expect(driver.serviceOption?.value.path).toBe('test::Service');
    expect(newElementState.isValid).toBe(false);
    driver.setDocumentation('Persists the people service');
    expect(newElementState.isValid).toBe(true);

    const persistence = guaranteeType(
      newElementState.createElement('NewPersistence'),
      Persistence,
    );
    graph_addElement(
      editorStore.graphManagerState.graph,
      persistence,
      'test',
      editorStore.changeDetectionState.observerContext,
    );

    // change detection hashes every element: this used to throw on the missing service
    expect(() => persistence.hashCode).not.toThrow();

    // the element serializes, and hashes the same way once read back
    const entity =
      editorStore.graphManagerState.graphManager.elementToEntity(persistence);
    expect(entity.path).toBe('test::NewPersistence');
    expect(entity.content).toMatchObject({
      documentation: 'Persists the people service',
      service: { path: 'test::Service' },
      trigger: { _type: 'manualTrigger' },
    });
    const hashesIndex =
      await editorStore.graphManagerState.graphManager.buildHashesIndex([
        entity,
      ]);
    expect(hashesIndex.get('test::NewPersistence')).toBe(persistence.hashCode);

    // and a graph that contains it builds on the next load
    const reloadedEditorStore = await createEditorStore([
      ...TEST_DATA__serviceEntities,
      entity,
    ]);
    expect(
      reloadedEditorStore.graphManagerState.graphBuildState.hasSucceeded,
    ).toBe(true);
  },
);

test(
  unitTest(
    "A persistence can't be created from the new element dialog without a service",
  ),
  async () => {
    const editorStore = await createEditorStore([]);
    const newElementState = editorStore.newElementState;

    newElementState.setElementType(PERSISTENCE_ELEMENT_TYPE);
    const driver = newElementState.getNewElementDriver(NewPersistenceDriver);
    driver.setDocumentation('Persists nothing yet');

    expect(driver.serviceOptions).toHaveLength(0);
    expect(newElementState.isValid).toBe(false);
  },
);
