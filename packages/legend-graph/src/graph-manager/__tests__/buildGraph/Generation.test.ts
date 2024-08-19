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
import { guaranteeNonNullable } from '@finos/legend-shared';
import {
  unitTest,
  type TEMPORARY__JestMatcher,
} from '@finos/legend-shared/test';
import {
  TEST_DATA__simpleDebuggingCase,
  TEST_DATA__AutoImportsWithAny,
  TEST_DATA__AutoImportsWithSystemProfiles,
} from '../roundtripTestData/TEST_DATA__GenericRoundtrip.js';
import TEST_DATA__m2mGraphEntities from './TEST_DATA__M2MGraphEntities.json' with { type: 'json' };
import { TEST_DATA__SimpleGraph } from './TEST_DATA__Core.js';
import type { Entity } from '@finos/legend-storage';
import {
  TEST__buildGraphWithEntities,
  TEST__getTestGraphManagerState,
} from '../../__test-utils__/GraphManagerTestUtils.js';
import { isElementReadOnly } from '../../../graph/helpers/DomainHelper.js';

const PARENT_ELEMENT_PATH = 'model::myFileGeneration';

const buildParentElement = (): Entity => {
  const fileGeneration = {
    path: PARENT_ELEMENT_PATH,
    content: {
      _type: 'fileGeneration',
      configurationProperties: [],
      name: 'myFileGeneration',
      package: 'model',
      scopeElements: [],
      type: 'testType',
    },
    classifierPath:
      'meta::pure::generation::metamodel::GenerationConfiguration',
  } as Entity;
  return fileGeneration;
};

const testGeneratedElements = async (
  entities: Entity[],
  generatedEntities: Entity[],
): Promise<void> => {
  entities.push(buildParentElement());
  const generatedElementPaths = generatedEntities.map((e) => e.path);
  const graphManagerState = TEST__getTestGraphManagerState();
  await TEST__buildGraphWithEntities(graphManagerState, entities);

  expect(graphManagerState.graphBuildState.hasSucceeded).toBe(true);
  // build generation graph
  const generatedEntitiesIndex = new Map<string, Entity[]>();
  generatedEntitiesIndex.set(PARENT_ELEMENT_PATH, generatedEntities);
  await graphManagerState.graphManager.buildGenerations(
    graphManagerState.graph,
    generatedEntitiesIndex,
    graphManagerState.generationsBuildState,
  );

  expect(graphManagerState.graph.generationModel.allOwnElements.length).toBe(
    generatedElementPaths.length,
  );
  generatedElementPaths.forEach((e) => {
    const element =
      graphManagerState.graph.generationModel.getOwnNullableElement(e);
    guaranteeNonNullable(
      element,
      `Element '${e}' not found in generated model manager`,
    );
    const elementInGraph = graphManagerState.graph.getElement(e);
    guaranteeNonNullable(
      elementInGraph,
      `Element '${e}' not found in main graph`,
    );
    const elementInMainGraph = graphManagerState.graph.allOwnElements.find(
      (el) => el.path === e,
    );
    expect(elementInMainGraph).toBeUndefined();
    expect(elementInGraph).toBe(element);
    expect(isElementReadOnly(elementInGraph)).toBe(true);
  });

  const transformedEntities = graphManagerState.graph.allOwnElements.map((el) =>
    graphManagerState.graphManager.elementToEntity(el),
  );
  (expect(entities) as TEMPORARY__JestMatcher).toIncludeSameMembers(
    transformedEntities,
  );
  // Ensure generated elements are not transformed
  for (const entityPath of generatedElementPaths) {
    expect(
      transformedEntities.find((el) => el.path === entityPath),
    ).toBeUndefined();
  }
};

test(unitTest('M2M graph generation check'), async () => {
  await testGeneratedElements(
    [] as Entity[],
    TEST_DATA__m2mGraphEntities as Entity[],
  );
  await testGeneratedElements(
    [] as Entity[],
    TEST_DATA__simpleDebuggingCase as Entity[],
  );
});

test(unitTest('Auto-imports generation check'), async () => {
  await testGeneratedElements(
    [] as Entity[],
    TEST_DATA__AutoImportsWithSystemProfiles as Entity[],
  );
  await testGeneratedElements(
    [] as Entity[],
    TEST_DATA__AutoImportsWithAny as Entity[],
  );
});

test(unitTest('Core model generations check'), async () => {
  await testGeneratedElements(
    [] as Entity[],
    TEST_DATA__SimpleGraph as Entity[],
  );
});
