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

import {
  TEST_DATA__MissingSuperType,
  TEST_DATA__MissingProfile,
  TEST_DATA__MissingProperty,
  TEST_DATA__MissingStereoType,
  TEST_DATA__MissingTagValue,
  TEST_DATA__MissingTargetClassinMapping,
  TEST_DATA__MissingSetImp,
  TEST_DATA__MissingClassMapping,
  TEST_DATA__MissingClassMappingWithTargetId,
} from './TEST_DATA__GraphBuildFailure';
import { unitTest } from '@finos/legend-shared';
import { flowResult } from 'mobx';
import type { Entity } from '@finos/legend-model-storage';
import type { GraphManagerState } from '../../GraphManagerState';
import { TEST__getTestGraphManagerState } from '../../GraphManagerTestUtils';

let graphManagerState: GraphManagerState;

beforeEach(async () => {
  graphManagerState = TEST__getTestGraphManagerState();
});

test(unitTest('Missing super type'), async () => {
  const buildGraph = flowResult(
    graphManagerState.graphManager.buildGraph(
      graphManagerState.graph,
      TEST_DATA__MissingSuperType as Entity[],
    ),
  );
  await expect(buildGraph).rejects.toThrowError(
    `Can't find supertype 'ui::test1::Organism' of class 'ui::test1::Animal'`,
  );
});

test(unitTest('Missing profile'), async () => {
  const buildGraph = flowResult(
    graphManagerState.graphManager.buildGraph(
      graphManagerState.graph,
      TEST_DATA__MissingProfile as Entity[],
    ),
  );
  await expect(buildGraph).rejects.toThrowError(
    `Can't find profile 'ui::test1::ProfileTest'`,
  );
});

test(unitTest('Missing class property'), async () => {
  const buildGraph = flowResult(
    graphManagerState.graphManager.buildGraph(
      graphManagerState.graph,
      TEST_DATA__MissingProperty as Entity[],
    ),
  );
  await expect(buildGraph).rejects.toThrowError(
    `Can't find type 'ui::test1::NotFound'`,
  );
});

test(unitTest('Missing stereotype'), async () => {
  const buildGraph = flowResult(
    graphManagerState.graphManager.buildGraph(
      graphManagerState.graph,
      TEST_DATA__MissingStereoType as Entity[],
    ),
  );
  await expect(buildGraph).rejects.toThrowError(
    `Can't find stereotype 'missingStereotype' in profile 'ui::meta::pure::profiles::TestProfile'`,
  );
});

test(unitTest('Missing tagged value'), async () => {
  const buildGraph = flowResult(
    graphManagerState.graphManager.buildGraph(
      graphManagerState.graph,
      TEST_DATA__MissingTagValue as Entity[],
    ),
  );
  await expect(buildGraph).rejects.toThrowError(
    `Can't find tag 'missingTag' in profile 'ui::meta::pure::profiles::TestProfile'`,
  );
});

test(unitTest('Missing class in Pure Instance class mapping'), async () => {
  const buildGraph = flowResult(
    graphManagerState.graphManager.buildGraph(
      graphManagerState.graph,
      TEST_DATA__MissingTargetClassinMapping as Entity[],
    ),
  );
  await expect(buildGraph).rejects.toThrowError(
    `Can't find type 'ui::test1::Target_Something'`,
  );
});

test(unitTest('Missing class mapping'), async () => {
  const buildGraph = flowResult(
    graphManagerState.graphManager.buildGraph(
      graphManagerState.graph,
      TEST_DATA__MissingClassMapping as Entity[],
    ),
  );
  await expect(buildGraph).rejects.toThrowError(
    `Can't find any class mapping for class 'ui::Employeer' in mapping 'ui::myMap'`,
  );
});

test(unitTest('Missing class mapping with ID'), async () => {
  const buildGraph = flowResult(
    graphManagerState.graphManager.buildGraph(
      graphManagerState.graph,
      TEST_DATA__MissingClassMappingWithTargetId as Entity[],
    ),
  );
  await expect(buildGraph).rejects.toThrowError(
    `Can't find class mapping with ID 'notFound' in mapping 'ui::myMap'`,
  );
});

// TODO This test is skipped because we don't support include mappings. We don't fail yet
// Unskip when include mappings support is added
test.skip(unitTest('Missing set implementation'), async () => {
  const buildGraph = flowResult(
    graphManagerState.graphManager.buildGraph(
      graphManagerState.graph,
      TEST_DATA__MissingSetImp as Entity[],
    ),
  );
  await expect(buildGraph).rejects.toThrowError(
    `Can't find set implementation 'targetClassAMissing'`,
  );
});
