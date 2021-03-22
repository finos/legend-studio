/**
 * Copyright Goldman Sachs
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

import type { Entity } from '../../models/sdlc/models/entity/Entity';
import { unitTest } from '@finos/legend-studio-shared';
import {
  getTestEditorStore,
  ensureObjectFieldsAreSortedAlphabetically,
  excludeSectionIndex,
} from '../StoreTestUtils';
import {
  m2mTestData,
  testData,
  projectWithCols,
  simpleAllFunc,
  simpleFilterFunc,
  simpleProjection,
  simpleProjectionWithFilter,
  simpleGraphFetch,
  firmPersonGraphFetch,
} from './LambdaRoundtripTestData';

const testRoundtripLambda = async (
  entities: Entity[],
  lambda: Record<string | number | symbol, unknown>,
): Promise<void> => {
  // setup + test setup
  const editorStore = getTestEditorStore();
  await editorStore.graphState.initializeSystem();
  await editorStore.graphState.graphManager.buildGraph(
    editorStore.graphState.graph,
    entities,
    { TEMPORARY__keepSectionIndex: true },
  );
  const transformedEntities = editorStore.graphState.graph.allElements.map(
    (element) => editorStore.graphState.graphManager.elementToEntity(element),
  );
  transformedEntities.forEach((entity) =>
    ensureObjectFieldsAreSortedAlphabetically(entity.content),
  );
  expect(transformedEntities).toIncludeSameMembers(
    excludeSectionIndex(entities),
  );
  await editorStore.graphState.graph.precomputeHashes(
    editorStore.applicationStore.logger,
  );
  const protocolHashesIndex = await editorStore.graphState.graphManager.buildHashesIndex(
    entities,
  );
  editorStore.changeDetectionState.workspaceLatestRevisionState.setEntityHashesIndex(
    protocolHashesIndex,
  );
  await editorStore.changeDetectionState.computeLocalChanges(true);
  expect(
    editorStore.changeDetectionState.workspaceLatestRevisionState.changes
      .length,
  ).toBe(0);
  // roundtrip check
  const _builtValueSpec = editorStore.graphState.graphManager.buildValueSpecificationFromJson(
    lambda,
    editorStore.graphState.graph,
  );
  const _rawLambda = editorStore.graphState.graphManager.buildRawValueSpecification(
    _builtValueSpec,
    editorStore.graphState.graph,
  );
  const _jsonLambda = editorStore.graphState.graphManager.serializeRawValueSpecification(
    _rawLambda,
  );
  expect([_jsonLambda]).toIncludeAllMembers([lambda]);
};

test(unitTest('Test projection query function'), async () => {
  await testRoundtripLambda(testData as Entity[], simpleAllFunc);
  await testRoundtripLambda(testData as Entity[], simpleFilterFunc);
  await testRoundtripLambda(testData as Entity[], simpleProjection);
  await testRoundtripLambda(testData as Entity[], projectWithCols);
  await testRoundtripLambda(testData as Entity[], simpleProjectionWithFilter);
});

test(unitTest('Test graph fetch tree'), async () => {
  await testRoundtripLambda(m2mTestData as Entity[], simpleGraphFetch);
  await testRoundtripLambda(m2mTestData as Entity[], firmPersonGraphFetch);
});
