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
import {
  type TEMPORARY__JestMatcher,
  unitTest,
} from '@finos/legend-shared/test';
import { TEST__getTestGraphManagerState } from '../../__test-utils__/GraphManagerTestUtils.js';
import { DependencyManager } from '../../../graph/DependencyManager.js';
import type { EntitiesWithOrigin } from '@finos/legend-storage';

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
      superTypes: ['model::ClassB'],
    },
    classifierPath: 'meta::pure::metamodel::type::Class',
  },
];

const firstDependencyEntities = {
  groupId: 'group-1',
  artifactId: 'artifact-1',
  versionId: '1.0.0',
  entities: [
    {
      path: 'model::ClassB',
      content: {
        _type: 'class',
        name: 'ClassB',
        package: 'model',
        properties: [
          {
            multiplicity: {
              lowerBound: 1,
              upperBound: 1,
            },
            name: 'prop1',
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
  ],
};

const secondDependencyEntities = {
  groupId: 'group-2',
  artifactId: 'artifact-2',
  versionId: '1.0.0',
  entities: [
    {
      path: 'model::ClassC',
      content: {
        _type: 'class',
        name: 'ClassC',
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
  ],
};

const thirdDependencyEntities = {
  groupId: 'group-3',
  artifactId: 'artifact-3',
  versionId: '1.0.0',
  entities: [
    {
      path: 'model::ClassC',
      content: {
        _type: 'class',
        name: 'ClassC',
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
  ],
};

test(
  unitTest('Dependent entities are taken into account when building graph'),
  async () => {
    const a_DependencyKey = 'group-1:artifact-2:1.0.0';
    const b_DependencyKey = 'group-2:artifact-2:1.0.0';
    const graphManagerState = TEST__getTestGraphManagerState();

    await graphManagerState.graphManager.initialize({
      env: 'test',
      tabSize: 2,
      clientConfig: {},
    });
    await graphManagerState.initializeSystem();
    const dependencyManager = new DependencyManager([]);
    const dependencyEntitiesIndex = new Map<string, EntitiesWithOrigin>();
    dependencyEntitiesIndex.set(a_DependencyKey, firstDependencyEntities);
    dependencyEntitiesIndex.set(b_DependencyKey, secondDependencyEntities);
    graphManagerState.graph.dependencyManager = dependencyManager;
    await graphManagerState.graphManager.buildDependencies(
      graphManagerState.coreModel,
      graphManagerState.systemModel,
      dependencyManager,
      dependencyEntitiesIndex,
      graphManagerState.dependenciesBuildState,
    );
    expect(graphManagerState.dependenciesBuildState.hasSucceeded).toBe(true);

    await graphManagerState.graphManager.buildGraph(
      graphManagerState.graph,
      entities,
      graphManagerState.graphBuildState,
    );
    expect(graphManagerState.graphBuildState.hasSucceeded).toBe(true);
    Array.from(dependencyEntitiesIndex.keys()).forEach((k) =>
      expect(dependencyManager.getModel(k)).toBeDefined(),
    );

    // check dependency manager
    expect(dependencyManager.getModel(a_DependencyKey)).toBeDefined();
    expect(dependencyManager.getModel(b_DependencyKey)).toBeDefined();
    expect(dependencyManager.allOwnElements.length).toBe(2);

    // make sure dependency entities are not mingled with main graph entities
    expect(graphManagerState.graph.allOwnElements.length).toBe(1);
    const transformedEntities = graphManagerState.graph.allOwnElements.map(
      (el) => graphManagerState.graphManager.elementToEntity(el),
    );
    (expect(entities) as TEMPORARY__JestMatcher).toIncludeSameMembers(
      transformedEntities,
    );
  },
);

test(
  unitTest('Duplicates from dependencies will make building graph fail'),
  async () => {
    const graphManagerState = TEST__getTestGraphManagerState();

    await graphManagerState.initializeSystem();
    const dependencyManager = new DependencyManager([]);
    const dependencyEntitiesIndex = new Map<string, EntitiesWithOrigin>();
    dependencyEntitiesIndex.set(
      'group-1:artifact-2:1.0.0',
      firstDependencyEntities,
    );
    graphManagerState.graph.dependencyManager = dependencyManager;
    await graphManagerState.graphManager.buildDependencies(
      graphManagerState.coreModel,
      graphManagerState.systemModel,
      dependencyManager,
      dependencyEntitiesIndex,
      graphManagerState.dependenciesBuildState,
    );
    expect(graphManagerState.dependenciesBuildState.hasSucceeded).toBe(true);

    await expect(() =>
      graphManagerState.graphManager.buildGraph(
        graphManagerState.graph,
        firstDependencyEntities.entities,
        graphManagerState.graphBuildState,
      ),
    ).rejects.toThrowError(
      `Element 'model::ClassB' already exists in project dependency group-1:artifact-1`,
    );
  },
);

test(
  unitTest('Duplicates from dependencies will make building graph fail'),
  async () => {
    const graphManagerState = TEST__getTestGraphManagerState();

    await graphManagerState.initializeSystem();
    const dependencyManager = new DependencyManager([]);
    const dependencyEntitiesIndex = new Map<string, EntitiesWithOrigin>();
    dependencyEntitiesIndex.set(
      'group-2:artifact-2:1.0.0',
      secondDependencyEntities,
    );
    dependencyEntitiesIndex.set(
      'group-3:artifact-3:1.0.0',
      thirdDependencyEntities,
    );
    graphManagerState.graph.dependencyManager = dependencyManager;
    await expect(() =>
      graphManagerState.graphManager.buildDependencies(
        graphManagerState.coreModel,
        graphManagerState.systemModel,
        dependencyManager,
        dependencyEntitiesIndex,
        graphManagerState.dependenciesBuildState,
      ),
    ).rejects.toThrowError(
      `Project dependency group-3:artifact-3 Element 'model::ClassC' already exists in project dependency group-2:artifact-2`,
    );
  },
);
