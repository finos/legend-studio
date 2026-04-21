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
import {
  TEST__GraphManagerPluginManager,
  TEST__getTestGraphManagerState,
} from '@finos/legend-graph/test';
import { DependencyManager } from '@finos/legend-graph';
import { EntitiesWithOrigin } from '@finos/legend-storage';
import { DSL_DataSpace_GraphManagerPreset } from '../DSL_DataSpace_GraphManagerPreset.js';

const depA_entities = new EntitiesWithOrigin('org.test', 'dep-a', '1.0.0', [
  {
    path: 'deps::MappingA',
    content: {
      _type: 'mapping',
      classMappings: [],
      enumerationMappings: [],
      includedMappings: [],
      name: 'MappingA',
      package: 'deps',
      tests: [],
    },
    classifierPath: 'meta::pure::mapping::Mapping',
  },
  {
    path: 'deps::RuntimeA',
    content: {
      _type: 'runtime',
      name: 'RuntimeA',
      package: 'deps',
      runtimeValue: {
        _type: 'engineRuntime',
        connectionStores: [],
        connections: [],
        mappings: [
          {
            path: 'deps::MappingA',
            type: 'MAPPING',
          },
        ],
      },
    },
    classifierPath: 'meta::pure::runtime::PackageableRuntime',
  },
]);

const depB_entities = new EntitiesWithOrigin('org.test', 'dep-b', '1.0.0', [
  {
    path: 'deps::TestDataSpace',
    content: {
      _type: 'dataSpace',
      defaultExecutionContext: 'default',
      executionContexts: [
        {
          defaultRuntime: {
            path: 'deps::RuntimeA',
            type: 'RUNTIME',
          },
          mapping: {
            path: 'deps::MappingA',
            type: 'MAPPING',
          },
          name: 'default',
        },
      ],
      name: 'TestDataSpace',
      package: 'deps',
    },
    classifierPath: 'meta::pure::metamodel::dataSpace::DataSpace',
  },
]);

const pluginManager = new TEST__GraphManagerPluginManager();
pluginManager.usePresets([new DSL_DataSpace_GraphManagerPreset()]).install();

test(
  unitTest(
    'Cross-dependency: DataSpace plugin resolves Mapping and Runtime from another dependency input',
  ),
  async () => {
    const graphManagerState = TEST__getTestGraphManagerState(pluginManager);

    await graphManagerState.graphManager.initialize({
      env: 'test',
      tabSize: 2,
      clientConfig: {},
    });
    await graphManagerState.initializeSystem();

    const dependencyManager = new DependencyManager(
      pluginManager.getPureGraphPlugins(),
    );
    const dependencyEntitiesIndex = new Map<string, EntitiesWithOrigin>();

    dependencyEntitiesIndex.set('org.test:dep-b:1.0.0', depB_entities);
    dependencyEntitiesIndex.set('org.test:dep-a:1.0.0', depA_entities);

    graphManagerState.graph.dependencyManager = dependencyManager;

    await graphManagerState.graphManager.buildDependencies(
      graphManagerState.coreModel,
      graphManagerState.systemModel,
      dependencyManager,
      dependencyEntitiesIndex,
      graphManagerState.dependenciesBuildState,
    );

    expect(graphManagerState.dependenciesBuildState.hasSucceeded).toBe(true);
    expect(dependencyManager.allOwnElements.length).toBe(3);
  },
);
