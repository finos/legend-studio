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
  TEST_DATA__DuplicateEnumerationValues,
  TEST_DATA__DuplicateProfileTags,
  TEST_DATA__DuplicateProfileStereotypes,
  TEST_DATA__DuplicateClassProperties,
  TEST_DATA__DuplicateAssociationProperties,
} from './TEST_DATA__GraphBuildFailure';
import { unitTest } from '@finos/legend-shared';
import type { Entity } from '@finos/legend-model-storage';
import type { GraphManagerState } from '../../GraphManagerState';
import { TEST__getTestGraphManagerState } from '../../GraphManagerTestUtils';

let graphManagerState: GraphManagerState;

beforeEach(async () => {
  graphManagerState = TEST__getTestGraphManagerState();
});

test(unitTest('Missing super type'), async () => {
  await expect(() =>
    graphManagerState.graphManager.buildGraph(
      graphManagerState.graph,
      TEST_DATA__MissingSuperType as Entity[],
    ),
  ).rejects.toThrowError(
    `Can't find supertype 'ui::test1::Organism' of class 'ui::test1::Animal'`,
  );
});

test(unitTest('Missing profile'), async () => {
  await expect(() =>
    graphManagerState.graphManager.buildGraph(
      graphManagerState.graph,
      TEST_DATA__MissingProfile as Entity[],
    ),
  ).rejects.toThrowError(`Can't find profile 'ui::test1::ProfileTest'`);
});

test(unitTest('Missing class property'), async () => {
  await expect(() =>
    graphManagerState.graphManager.buildGraph(
      graphManagerState.graph,
      TEST_DATA__MissingProperty as Entity[],
    ),
  ).rejects.toThrowError(`Can't find type 'ui::test1::NotFound'`);
});

test(unitTest('Missing stereotype'), async () => {
  await expect(() =>
    graphManagerState.graphManager.buildGraph(
      graphManagerState.graph,
      TEST_DATA__MissingStereoType as Entity[],
    ),
  ).rejects.toThrowError(
    `Can't find stereotype 'missingStereotype' in profile 'ui::meta::pure::profiles::TestProfile'`,
  );
});

test(unitTest('Missing tagged value'), async () => {
  await expect(() =>
    graphManagerState.graphManager.buildGraph(
      graphManagerState.graph,
      TEST_DATA__MissingTagValue as Entity[],
    ),
  ).rejects.toThrowError(
    `Can't find tag 'missingTag' in profile 'ui::meta::pure::profiles::TestProfile'`,
  );
});

test(unitTest('Missing class in Pure Instance class mapping'), async () => {
  await expect(() =>
    graphManagerState.graphManager.buildGraph(
      graphManagerState.graph,
      TEST_DATA__MissingTargetClassinMapping as Entity[],
    ),
  ).rejects.toThrowError(`Can't find type 'ui::test1::Target_Something'`);
});

test(unitTest('Missing class mapping'), async () => {
  await expect(() =>
    graphManagerState.graphManager.buildGraph(
      graphManagerState.graph,
      TEST_DATA__MissingClassMapping as Entity[],
    ),
  ).rejects.toThrowError(
    `Can't find any class mapping for class 'ui::Employeer' in mapping 'ui::myMap'`,
  );
});

// TODO: This test is skipped because we want to temporarily relax graph building algorithm
// to ease Pure -> Legend migration push.
/* @MARKER: RELAXED GRAPH CHECK - See https://github.com/finos/legend-studio/issues/880 */
test.skip(unitTest('Missing class mapping with ID'), async () => {
  await expect(() =>
    graphManagerState.graphManager.buildGraph(
      graphManagerState.graph,
      TEST_DATA__MissingClassMappingWithTargetId as Entity[],
    ),
  ).rejects.toThrowError(
    `Can't find class mapping with ID 'notFound' in mapping 'ui::myMap'`,
  );
});

// TODO: This test is skipped because we don't support include mappings. We don't fail yet
// Unskip when include mappings support is added
test.skip(unitTest('Missing set implementation'), async () => {
  await expect(() =>
    graphManagerState.graphManager.buildGraph(
      graphManagerState.graph,
      TEST_DATA__MissingSetImp as Entity[],
    ),
  ).rejects.toThrowError(`Can't find set implementation 'targetClassAMissing'`);
});

/* @MARKER: RELAXED GRAPH CHECK - See https://github.com/finos/legend-studio/issues/660 */
test.skip(unitTest('Duplicate enumeration values'), async () => {
  await expect(() =>
    graphManagerState.graphManager.buildGraph(
      graphManagerState.graph,
      TEST_DATA__DuplicateEnumerationValues as Entity[],
    ),
  ).rejects.toThrowError(
    `Found duplicated value 'enum_value' in enumeration 'test::enum'`,
  );
});

/* @MARKER: RELAXED GRAPH CHECK - See https://github.com/finos/legend-studio/issues/660 */
test.skip(unitTest('Duplicate profile tags'), async () => {
  await expect(() =>
    graphManagerState.graphManager.buildGraph(
      graphManagerState.graph,
      TEST_DATA__DuplicateProfileTags as Entity[],
    ),
  ).rejects.toThrowError(
    `Found duplicated tag 'tag1' in profile 'test::profile1'`,
  );
});

/* @MARKER: RELAXED GRAPH CHECK - See https://github.com/finos/legend-studio/issues/660 */
test.skip(unitTest('Duplicate profile stereotypes'), async () => {
  await expect(() =>
    graphManagerState.graphManager.buildGraph(
      graphManagerState.graph,
      TEST_DATA__DuplicateProfileStereotypes as Entity[],
    ),
  ).rejects.toThrowError(
    `Found duplicated stereotype 'stereotype1' in profile 'test::profile2'`,
  );
});

/* @MARKER: RELAXED GRAPH CHECK - See https://github.com/finos/legend-studio/issues/660 */
test.skip(unitTest('Duplicate class properties'), async () => {
  await expect(() =>
    graphManagerState.graphManager.buildGraph(
      graphManagerState.graph,
      TEST_DATA__DuplicateClassProperties as Entity[],
    ),
  ).rejects.toThrowError(
    `Found duplicated property 'abc' in class 'test::class'`,
  );
});

/* @MARKER: RELAXED GRAPH CHECK - See https://github.com/finos/legend-studio/issues/660 */
test.skip(unitTest('Duplicate association properties'), async () => {
  await expect(() =>
    graphManagerState.graphManager.buildGraph(
      graphManagerState.graph,
      TEST_DATA__DuplicateAssociationProperties as Entity[],
    ),
  ).rejects.toThrowError(
    `Found duplicated property 'abc' in association 'test::association'`,
  );
});
