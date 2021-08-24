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

import { unitTest } from '@finos/legend-shared';
import { flowResult } from 'mobx';
import { TEST__getTestGraphManagerState } from '../../GraphManagerTestUtils';
import { DependencyManager } from '../../graph/DependencyManager';
import type { Entity } from '@finos/legend-model-storage';

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

    await flowResult(graphManagerState.initializeSystem());
    const dependencyManager = new DependencyManager([]);
    const dependencyEntitiesMap = new Map<string, Entity[]>();
    dependencyEntitiesMap.set(firstDependencyKey, firstDependencyEntities);
    dependencyEntitiesMap.set(secondDependencyKey, secondDependencyEntities);
    graphManagerState.graph.setDependencyManager(dependencyManager);
    await flowResult(
      graphManagerState.graphManager.buildDependencies(
        graphManagerState.coreModel,
        graphManagerState.systemModel,
        dependencyManager,
        dependencyEntitiesMap,
      ),
    );
    expect(
      graphManagerState.graph.dependencyManager.buildState.hasSucceeded,
    ).toBeTrue();

    await flowResult(
      graphManagerState.graphManager.buildGraph(
        graphManagerState.graph,
        entities,
        { TEMPORARY__keepSectionIndex: true },
      ),
    );
    expect(graphManagerState.graph.buildState.hasSucceeded).toBeTrue(),
      Array.from(dependencyEntitiesMap.keys()).forEach((k) =>
        expect(dependencyManager.getModel(k)).toBeDefined(),
      );

    // check dependency manager
    expect(dependencyManager.getModel(firstDependencyKey)).toBeDefined();
    expect(dependencyManager.getModel(secondDependencyKey)).toBeDefined();
    expect(dependencyManager.allElements.length).toBe(2);

    // make sure dependency entities are not mingled with main graph entities
    expect(graphManagerState.graph.allOwnElements.length).toBe(1);
    const transformedEntities = graphManagerState.graph.allOwnElements.map(
      (el) => graphManagerState.graphManager.elementToEntity(el),
    );
    expect(entities).toIncludeSameMembers(transformedEntities);
  },
);

test(
  unitTest('Duplicates from dependencies will make building graph fail'),
  async () => {
    const graphManagerState = TEST__getTestGraphManagerState();

    await flowResult(graphManagerState.initializeSystem());
    const dependencyManager = new DependencyManager([]);
    const dependencyEntitiesMap = new Map<string, Entity[]>();
    dependencyEntitiesMap.set('dep', firstDependencyEntities);
    graphManagerState.graph.setDependencyManager(dependencyManager);
    await flowResult(
      graphManagerState.graphManager.buildDependencies(
        graphManagerState.coreModel,
        graphManagerState.systemModel,
        dependencyManager,
        dependencyEntitiesMap,
      ),
    );
    expect(
      graphManagerState.graph.dependencyManager.buildState.hasSucceeded,
    ).toBeTrue();

    const buildGraphPromise = flowResult(
      graphManagerState.graphManager.buildGraph(
        graphManagerState.graph,
        firstDependencyEntities,
        { TEMPORARY__keepSectionIndex: true },
      ),
    );

    await expect(buildGraphPromise).rejects.toThrowError(
      `Element 'model::ClassB' already exists`,
    );
  },
);
