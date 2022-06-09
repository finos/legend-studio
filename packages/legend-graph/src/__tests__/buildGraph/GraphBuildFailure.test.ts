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
import {
  TEST_DATA__MissingSuperType,
  TEST_DATA__MissingProfile,
  TEST_DATA__MissingProperty,
  TEST_DATA__MissingStereoType,
  TEST_DATA__MissingTagValue,
  TEST_DATA__MissingTargetClassinMapping,
  TEST_DATA__MissingClassMapping,
  TEST_DATA__MissingClassMappingWithTargetId,
  TEST_DATA__DuplicateEnumerationValues,
  TEST_DATA__DuplicateProfileTags,
  TEST_DATA__DuplicateProfileStereotypes,
  TEST_DATA__DuplicateClassProperties,
  TEST_DATA__DuplicateAssociationProperties,
  TEST_DATA__DuplicatedElement,
} from './TEST_DATA__GraphBuildFailure.js';
import { unitTest } from '@finos/legend-shared';
import type { Entity } from '@finos/legend-model-storage';
import type { GraphManagerState } from '../../GraphManagerState.js';
import {
  TEST__buildGraphWithEntities,
  TEST__getTestGraphManagerState,
} from '../../GraphManagerTestUtils.js';

let graphManagerState: GraphManagerState;

beforeEach(async () => {
  graphManagerState = TEST__getTestGraphManagerState();
});

test(unitTest('Missing super type'), async () => {
  await expect(() =>
    graphManagerState.graphManager.buildGraph(
      graphManagerState.graph,
      TEST_DATA__MissingSuperType as Entity[],
      graphManagerState.graphBuildState,
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
      graphManagerState.graphBuildState,
    ),
  ).rejects.toThrowError(`Can't find profile 'ui::test1::ProfileTest'`);
});

test(unitTest('Duplicated element'), async () => {
  await expect(() =>
    graphManagerState.graphManager.buildGraph(
      graphManagerState.graph,
      TEST_DATA__DuplicatedElement as Entity[],
      graphManagerState.graphBuildState,
    ),
  ).rejects.toThrowError(`Element 'ui::test1::Animal' already exists`);
});

test(unitTest('Missing class property'), async () => {
  await expect(() =>
    graphManagerState.graphManager.buildGraph(
      graphManagerState.graph,
      TEST_DATA__MissingProperty as Entity[],
      graphManagerState.graphBuildState,
    ),
  ).rejects.toThrowError(`Can't find type 'ui::test1::NotFound'`);
});

test(unitTest('Missing stereotype'), async () => {
  await expect(() =>
    graphManagerState.graphManager.buildGraph(
      graphManagerState.graph,
      TEST_DATA__MissingStereoType as Entity[],
      graphManagerState.graphBuildState,
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
      graphManagerState.graphBuildState,
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
      graphManagerState.graphBuildState,
    ),
  ).rejects.toThrowError(`Can't find type 'ui::test1::Target_Something'`);
});

test(unitTest('Missing class mapping'), async () => {
  await expect(() =>
    TEST__buildGraphWithEntities(
      graphManagerState,
      TEST_DATA__MissingClassMapping as Entity[],
    ),
  ).rejects.toThrowError(
    `Can't find any class mapping for class 'ui::Employeer' in mapping 'ui::myMap'`,
  );
});

/**
 * This test is skipped because we want to temporarily relax graph building algorithm
 * to ease Pure -> Legend migration push.
 * See https://github.com/finos/legend-studio/issues/880
 *
 * @discrepancy graph-building
 */
test.skip(unitTest('Missing class mapping with ID'), async () => {
  await expect(() =>
    graphManagerState.graphManager.buildGraph(
      graphManagerState.graph,
      TEST_DATA__MissingClassMappingWithTargetId as Entity[],
      graphManagerState.graphBuildState,
    ),
  ).rejects.toThrowError(
    `Can't find class mapping with ID 'notFound' in mapping 'ui::myMap'`,
  );
});

/**
 * This test is skipped because we want to temporarily relax graph building algorithm
 * to ease Pure -> Legend migration push.
 * See https://github.com/finos/legend-studio/issues/660
 *
 * @discrepancy graph-building
 */
test.skip(unitTest('Duplicate enumeration values'), async () => {
  await expect(() =>
    graphManagerState.graphManager.buildGraph(
      graphManagerState.graph,
      TEST_DATA__DuplicateEnumerationValues as Entity[],
      graphManagerState.graphBuildState,
    ),
  ).rejects.toThrowError(
    `Found duplicated value 'enum_value' in enumeration 'test::enum'`,
  );
});

/**
 * This test is skipped because we want to temporarily relax graph building algorithm
 * to ease Pure -> Legend migration push.
 * See https://github.com/finos/legend-studio/issues/660
 *
 * @discrepancy graph-building
 */
test.skip(unitTest('Duplicate profile tags'), async () => {
  await expect(() =>
    graphManagerState.graphManager.buildGraph(
      graphManagerState.graph,
      TEST_DATA__DuplicateProfileTags as Entity[],
      graphManagerState.graphBuildState,
    ),
  ).rejects.toThrowError(
    `Found duplicated tag 'tag1' in profile 'test::profile1'`,
  );
});

/**
 * This test is skipped because we want to temporarily relax graph building algorithm
 * to ease Pure -> Legend migration push.
 * See https://github.com/finos/legend-studio/issues/660
 *
 * @discrepancy graph-building
 */
test.skip(unitTest('Duplicate profile stereotypes'), async () => {
  await expect(() =>
    graphManagerState.graphManager.buildGraph(
      graphManagerState.graph,
      TEST_DATA__DuplicateProfileStereotypes as Entity[],
      graphManagerState.graphBuildState,
    ),
  ).rejects.toThrowError(
    `Found duplicated stereotype 'stereotype1' in profile 'test::profile2'`,
  );
});

/**
 * This test is skipped because we want to temporarily relax graph building algorithm
 * to ease Pure -> Legend migration push.
 * See https://github.com/finos/legend-studio/issues/660
 *
 * @discrepancy graph-building
 */
test.skip(unitTest('Duplicate class properties'), async () => {
  await expect(() =>
    graphManagerState.graphManager.buildGraph(
      graphManagerState.graph,
      TEST_DATA__DuplicateClassProperties as Entity[],
      graphManagerState.graphBuildState,
    ),
  ).rejects.toThrowError(
    `Found duplicated property 'abc' in class 'test::class'`,
  );
});

/**
 * This test is skipped because we want to temporarily relax graph building algorithm
 * to ease Pure -> Legend migration push.
 * See https://github.com/finos/legend-studio/issues/660
 *
 * @discrepancy graph-building
 */
test.skip(unitTest('Duplicate association properties'), async () => {
  await expect(() =>
    graphManagerState.graphManager.buildGraph(
      graphManagerState.graph,
      TEST_DATA__DuplicateAssociationProperties as Entity[],
      graphManagerState.graphBuildState,
    ),
  ).rejects.toThrowError(
    `Found duplicated property 'abc' in association 'test::association'`,
  );
});
