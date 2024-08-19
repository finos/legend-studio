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

import { test, expect, beforeEach } from '@jest/globals';
import TEST_DATA__fileGeneration from './TEST_DATA__FileGeneration.json' with { type: 'json' };
import { guaranteeType } from '@finos/legend-shared';
import { unitTest } from '@finos/legend-shared/test';
import type { Entity } from '@finos/legend-storage';
import {
  TEST__buildGraphWithEntities,
  TEST__getTestGraphManagerState,
} from '../../../__test-utils__/GraphManagerTestUtils.js';
import { PackageableElementReference } from '../../../../graph/metamodel/pure/packageableElements/PackageableElementReference.js';
import type { GraphManagerState } from '../../../GraphManagerState.js';

let graphManagerState: GraphManagerState;

beforeEach(async () => {
  graphManagerState = TEST__getTestGraphManagerState();
  await TEST__buildGraphWithEntities(
    graphManagerState,
    TEST_DATA__fileGeneration as Entity[],
  );
});

test(unitTest('File Generation Graph Success'), () => {
  const graph = graphManagerState.graph;
  expect(graph.ownClasses).toHaveLength(3);
  expect(graph.ownEnumerations).toHaveLength(1);
  expect(graph.ownProfiles).toHaveLength(1);
  expect(graph.ownFunctions).toHaveLength(1);
  expect(graph.ownFileGenerations).toHaveLength(3);
  const fileGeneration = graph.getFileGeneration('model::MyProtobuf');
  expect(graph.ownGenerationSpecifications).toHaveLength(1);
  const scope = fileGeneration.scopeElements;
  expect(scope).toHaveLength(1);
  const otherPackage = guaranteeType(
    scope[0],
    PackageableElementReference,
  ).value;
  expect(otherPackage).toBe(graph.getElement('model::other', true));
});

test(unitTest('Generated Function paths are valid'), () => {
  const functionPath =
    'model::functionFullPath_Firm_1__Firm_MANY__Firm_$1_MANY$__String_1__Boolean_1_';
  const functionGen = graphManagerState.graph.getFunction(functionPath);
  const entity = graphManagerState.graphManager.elementToEntity(functionGen);
  expect(entity.path).toBe(functionPath);
});
