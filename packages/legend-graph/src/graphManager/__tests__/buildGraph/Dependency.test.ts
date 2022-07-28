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
import { type TEMPORARY__JestMatcher, unitTest } from '@finos/legend-shared';
import { TEST__getTestGraphManagerState } from '../../GraphManagerTestUtils.js';
import { DependencyManager } from '../../../graph/DependencyManager.js';
import type { Entity } from '@finos/legend-storage';

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
          type: 'String',
        },
      ],
      superTypes: ['model::ClassB'],
    },
    classifierPath: 'meta::pure::metamodel::type::Class',
  },
];

const firstDependencyEntities = [
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
          type: 'String',
        },
      ],
    },
    classifierPath: 'meta::pure::metamodel::type::Class',
  },
];

const secondDependencyEntities = [
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
          type: 'String',
        },
      ],
    },
    classifierPath: 'meta::pure::metamodel::type::Class',
  },
];

test(
  unitTest('Dependent entities are taken into account when building graph'),
  async () => {
    const firstDependencyKey = 'dep1';
    const secondDependencyKey = 'dep2';
    const graphManagerState = TEST__getTestGraphManagerState();

    await graphManagerState.initializeSystem();
    const dependencyManager = new DependencyManager([]);
    const dependencyEntitiesIndex = new Map<string, Entity[]>();
    dependencyEntitiesIndex.set(firstDependencyKey, firstDependencyEntities);
    dependencyEntitiesIndex.set(secondDependencyKey, secondDependencyEntities);
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
    expect(dependencyManager.getModel(firstDependencyKey)).toBeDefined();
    expect(dependencyManager.getModel(secondDependencyKey)).toBeDefined();
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
    const dependencyEntitiesIndex = new Map<string, Entity[]>();
    dependencyEntitiesIndex.set('dep', firstDependencyEntities);
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
        firstDependencyEntities,
        graphManagerState.graphBuildState,
      ),
    ).rejects.toThrowError(`Element 'model::ClassB' already exists`);
  },
);
