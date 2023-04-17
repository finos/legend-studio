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
import {
  TEST_DATA__InferenceDefaultMappingElementID,
  TEST_DATA__ImportResolutionMultipleMatchesFound,
  TEST_DATA__ReferenceWithoutSection,
  TEST_DATA__ReferenceModification,
} from './TEST_DATA__Inference.js';
import type { Entity } from '@finos/legend-storage';
import {
  TEST__buildGraphWithEntities,
  TEST__excludeSectionIndex,
  TEST__getTestGraphManagerState,
} from '../__test-utils__/GraphManagerTestUtils.js';
import { getTag } from '../../graph/helpers/DomainHelper.js';

test(unitTest('Infer default mapping element ID'), async () => {
  const graphManagerState = TEST__getTestGraphManagerState();
  await TEST__buildGraphWithEntities(
    graphManagerState,
    TEST_DATA__InferenceDefaultMappingElementID as Entity[],
  );
  const transformedEntities = graphManagerState.graph.allOwnElements.map(
    (element) => graphManagerState.graphManager.elementToEntity(element),
  );
  (expect(transformedEntities) as TEMPORARY__JestMatcher).toIncludeSameMembers(
    TEST__excludeSectionIndex(
      TEST_DATA__InferenceDefaultMappingElementID as Entity[],
    ),
  );
});

test(
  unitTest('Import resolution throws when multiple matches found'),
  async () => {
    const graphManagerState = TEST__getTestGraphManagerState();
    await graphManagerState.initializeSystem();
    await expect(() =>
      graphManagerState.graphManager.buildGraph(
        graphManagerState.graph,
        TEST_DATA__ImportResolutionMultipleMatchesFound as Entity[],
        graphManagerState.graphBuildState,
      ),
    ).rejects.toThrow(
      `Can't resolve element with path 'A' - multiple matches found [test::A, test2::A]`,
    );
  },
);

test(
  unitTest(
    'Reference without section index should resolve all reference to full path during serialization',
  ),
  async () => {
    const graphManagerState = TEST__getTestGraphManagerState();
    await TEST__buildGraphWithEntities(
      graphManagerState,
      TEST_DATA__ReferenceWithoutSection.original as Entity[],
    );
    const transformedEntities = graphManagerState.graph.allOwnElements.map(
      (element) => graphManagerState.graphManager.elementToEntity(element),
    );
    (
      expect(transformedEntities) as TEMPORARY__JestMatcher
    ).toIncludeSameMembers(TEST_DATA__ReferenceWithoutSection.withoutSection);
  },
);

test(
  unitTest('Modified reference should resolve serialization path properly'),
  async () => {
    // If the reference owner does not change, the serialized path is kept as user input
    let graphManagerState = TEST__getTestGraphManagerState();
    await TEST__buildGraphWithEntities(
      graphManagerState,
      TEST_DATA__ReferenceModification.original as Entity[],
      { TEMPORARY__preserveSectionIndex: true },
    );
    let enumeration = graphManagerState.graph.getEnumeration('test::tEnum');
    const tagValue = enumeration.taggedValues[0];
    if (tagValue) {
      tagValue.tag.value = getTag(
        graphManagerState.graph.getProfile('test::tProf'),
        's4',
      );
      tagValue.tag.ownerReference.value =
        graphManagerState.graph.getProfile('test::tProf');
    }

    (
      expect(
        graphManagerState.graph.allOwnElements.map((element) =>
          graphManagerState.graphManager.elementToEntity(element),
        ),
      ) as TEMPORARY__JestMatcher
    ).toIncludeSameMembers(
      TEST__excludeSectionIndex(
        TEST_DATA__ReferenceModification.sameProfileModification as Entity[],
      ),
    );

    // If the reference owner changes, the serialized path is fully-resolved
    graphManagerState = TEST__getTestGraphManagerState();
    await TEST__buildGraphWithEntities(
      graphManagerState,
      TEST_DATA__ReferenceModification.original as Entity[],
    );
    enumeration = graphManagerState.graph.getEnumeration('test::tEnum');
    const taggedValue = enumeration.taggedValues[0];
    if (taggedValue) {
      taggedValue.tag.value = getTag(
        graphManagerState.graph.getProfile('test2::tProf'),
        's1',
      );
      taggedValue.tag.ownerReference.value =
        graphManagerState.graph.getProfile('test2::tProf');
    }

    (
      expect(
        graphManagerState.graph.allOwnElements.map((element) =>
          graphManagerState.graphManager.elementToEntity(element),
        ),
      ) as TEMPORARY__JestMatcher
    ).toIncludeSameMembers(
      TEST__excludeSectionIndex(
        TEST_DATA__ReferenceModification.differentProfileModification as Entity[],
      ),
    );
  },
);
