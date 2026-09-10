/**
 * Copyright (c) 2020-present, Goldman Sachs
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
import { TEST__getTestEditorStore } from '../__test-utils__/EditorStoreTestUtils.js';
import { flowResult } from 'mobx';
import { type EntityDiff, EntityChangeType } from '@finos/legend-server-sdlc';
import {
  Class,
  getClassProperty,
  SnowflakeComputeSpecification,
  SnowflakeWarehouseSize,
} from '@finos/legend-graph';
import { property_setName } from '../../graph-modifier/DomainGraphModifierHelper.js';
import {
  graph_addElement,
  graph_deleteElement,
} from '../../graph-modifier/GraphModifierHelper.js';
import { snowflakeSpec_setWarehouseSize } from '../../graph-modifier/DSL_Compute_GraphModifierHelper.js';

const entities = [
  {
    path: 'model::ClassA',
    content: {
      _type: 'class',
      name: 'ClassA',
      package: 'model',
      properties: [
        {
          multiplicity: {
            lowerBound: 1,
            upperBound: 1,
          },
          name: 'prop',
          genericType: {
            rawType: {
              _type: 'packageableType',
              fullPath: 'String',
            },
          },
        },
      ],
    },
    classifierPath: 'meta::pure::metamodel::type::Class',
  },
];

test(unitTest('Change detection works properly'), async () => {
  const editorStore = TEST__getTestEditorStore();

  await editorStore.graphManagerState.graphManager.initialize({
    env: 'test',
    tabSize: 2,
    clientConfig: {},
  });
  await editorStore.graphManagerState.initializeSystem();
  await editorStore.graphManagerState.graphManager.buildGraph(
    editorStore.graphManagerState.graph,
    entities,
    editorStore.graphManagerState.graphBuildState,
  );

  // set original hash
  editorStore.changeDetectionState.workspaceLocalLatestRevisionState.setEntityHashesIndex(
    await editorStore.graphManagerState.graphManager.buildHashesIndex(entities),
  );

  // check hash
  await flowResult(editorStore.changeDetectionState.computeLocalChanges(true));
  expect(
    editorStore.changeDetectionState.workspaceLocalLatestRevisionState.changes
      .length,
  ).toEqual(0);

  // make some modification and recheck hash
  const _class = editorStore.graphManagerState.graph.getClass('model::ClassA');

  // modify
  property_setName(getClassProperty(_class, 'prop'), 'prop1');

  await flowResult(editorStore.changeDetectionState.computeLocalChanges(true));
  expect(
    editorStore.changeDetectionState.workspaceLocalLatestRevisionState.changes
      .length,
  ).toEqual(1);
  let change = editorStore.changeDetectionState
    .workspaceLocalLatestRevisionState.changes[0] as EntityDiff;
  expect(change.entityChangeType).toEqual(EntityChangeType.MODIFY);
  expect(change.oldPath).toEqual(_class.path);
  property_setName(getClassProperty(_class, 'prop1'), 'prop'); // reset

  // add
  const newClass = new Class('ClassB');
  graph_addElement(
    editorStore.graphManagerState.graph,
    newClass,
    undefined,
    editorStore.changeDetectionState.observerContext,
  );

  await flowResult(editorStore.changeDetectionState.computeLocalChanges(true));
  expect(
    editorStore.changeDetectionState.workspaceLocalLatestRevisionState.changes
      .length,
  ).toEqual(1);
  change = editorStore.changeDetectionState.workspaceLocalLatestRevisionState
    .changes[0] as EntityDiff;
  expect(change.entityChangeType).toEqual(EntityChangeType.CREATE);
  expect(change.newPath).toEqual(newClass.path);
  graph_deleteElement(editorStore.graphManagerState.graph, newClass); // reset

  // delete
  graph_deleteElement(editorStore.graphManagerState.graph, _class);

  await flowResult(editorStore.changeDetectionState.computeLocalChanges(true));
  expect(
    editorStore.changeDetectionState.workspaceLocalLatestRevisionState.changes
      .length,
  ).toEqual(1);
  change = editorStore.changeDetectionState.workspaceLocalLatestRevisionState
    .changes[0] as EntityDiff;
  expect(change.entityChangeType).toEqual(EntityChangeType.DELETE);
  expect(change.oldPath).toEqual(_class.path);
});

const computeEntities = [
  {
    path: 'compute::SnowflakeWh',
    content: {
      _type: 'compute',
      name: 'SnowflakeWh',
      package: 'compute',
      owner: {
        _type: 'appDir',
        production: { appDirId: 12345, level: 'DEPLOYMENT' },
      },
      specification: {
        _type: 'snowflakeComputeSpecification',
        autoSuspend: 60,
        enableQueryAcceleration: false,
        generation: 2,
        maxClusterCount: 10,
        minClusterCount: 1,
        queryAccelerationMaxScaleFactor: 2,
        scalingPolicy: 'STANDARD',
        warehouseSize: 'SMALL',
        warehouseType: 'STANDARD',
      },
    },
    classifierPath:
      'meta::external::compute::specification::metamodel::Compute',
  },
  {
    path: 'compute::PartialWh',
    content: {
      _type: 'compute',
      name: 'PartialWh',
      package: 'compute',
      owner: {
        _type: 'appDir',
        production: { appDirId: 12345, level: 'DEPLOYMENT' },
      },
      // Deliberately partial
      specification: {
        _type: 'snowflakeComputeSpecification',
        autoResume: true,
        warehouseSize: 'SMALL',
        warehouseType: 'STANDARD',
      },
    },
    classifierPath:
      'meta::external::compute::specification::metamodel::Compute',
  },
];

test(
  unitTest('Change detection detects edits to a Compute element'),
  async () => {
    const editorStore = TEST__getTestEditorStore();

    await editorStore.graphManagerState.graphManager.initialize({
      env: 'test',
      tabSize: 2,
      clientConfig: {},
    });
    await editorStore.graphManagerState.initializeSystem();
    await editorStore.graphManagerState.graphManager.buildGraph(
      editorStore.graphManagerState.graph,
      computeEntities,
      editorStore.graphManagerState.graphBuildState,
    );

    editorStore.changeDetectionState.workspaceLocalLatestRevisionState.setEntityHashesIndex(
      await editorStore.graphManagerState.graphManager.buildHashesIndex(
        computeEntities,
      ),
    );

    await flowResult(
      editorStore.changeDetectionState.computeLocalChanges(true),
    );
    expect(
      editorStore.changeDetectionState.workspaceLocalLatestRevisionState.changes
        .length,
    ).toEqual(0);

    const compute = editorStore.graphManagerState.graph.getCompute(
      'compute::SnowflakeWh',
    );
    snowflakeSpec_setWarehouseSize(
      guaranteeType(compute.specification, SnowflakeComputeSpecification),
      SnowflakeWarehouseSize.LARGE,
    );

    await flowResult(
      editorStore.changeDetectionState.computeLocalChanges(true),
    );
    expect(
      editorStore.changeDetectionState.workspaceLocalLatestRevisionState.changes
        .length,
    ).toEqual(1);
    const change = editorStore.changeDetectionState
      .workspaceLocalLatestRevisionState.changes[0] as EntityDiff;
    expect(change.entityChangeType).toEqual(EntityChangeType.MODIFY);
    expect(change.oldPath).toEqual(compute.path);
  },
);
