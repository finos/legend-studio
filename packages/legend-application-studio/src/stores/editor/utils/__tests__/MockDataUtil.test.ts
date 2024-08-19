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

import { test, expect, beforeAll } from '@jest/globals';
import TEST_DATA__completeGraphEntities from './TEST_DATA__MockDataGeneration.json' with { type: 'json' };
import { createMockClassInstance } from '../MockDataUtils.js';
import { type PlainObject } from '@finos/legend-shared';
import {
  type TEMPORARY__JestMatcher,
  unitTest,
} from '@finos/legend-shared/test';
import { TEST__getTestEditorStore } from '../../__test-utils__/EditorStoreTestUtils.js';
import type { Entity } from '@finos/legend-storage';
import { TEST__buildGraphWithEntities } from '@finos/legend-graph/test';
import { classHasCycle } from '@finos/legend-graph';

const editorStore = TEST__getTestEditorStore();
beforeAll(async () => {
  await TEST__buildGraphWithEntities(
    editorStore.graphManagerState,
    TEST_DATA__completeGraphEntities as Entity[],
  );
});

test(unitTest('Class with hierarchy cycle is detected'), () => {
  const _class = editorStore.graphManagerState.graph.getClass(
    'myPackage::test::Misc',
  );
  (
    expect(createMockClassInstance(_class)) as TEMPORARY__JestMatcher
  ).toContainAllKeys([
    'string',
    'boolean',
    'float',
    'decimal',
    'number',
    'integer',
    'date',
    'dateTime',
    'strictDate',
  ]);
});

test(unitTest('Class with hierarchy cycle is detected'), () => {
  const cycledComplexClass = editorStore.graphManagerState.graph.getClass(
    'myPackage::test::shared::src::Application',
  );
  const nonComplexStyleClass = editorStore.graphManagerState.graph.getClass(
    'myPackage::test::shared::src::Membership',
  );
  const simpleClass = editorStore.graphManagerState.graph.getClass(
    'myPackage::test::shared::src::Address',
  );
  expect(
    classHasCycle(cycledComplexClass, {
      traverseNonRequiredProperties: true,
    }),
  ).toBe(true);
  expect(
    classHasCycle(nonComplexStyleClass, {
      traverseNonRequiredProperties: true,
    }),
  ).toBe(false);
  expect(
    classHasCycle(simpleClass, {
      traverseNonRequiredProperties: true,
    }),
  ).toBe(false);
});

// TODO: maybe we should isolate this to another test for mock data util
test(unitTest('Test mock data with classes cycle'), () => {
  const applicationClass = editorStore.graphManagerState.graph.getClass(
    'myPackage::test::shared::src::Application',
  );
  const applicationInstance = createMockClassInstance(
    applicationClass,
    true,
    3,
  );
  // 1st level
  const applicationKeys = ['applicant', 'employee', 'previousEmployeer'];
  (expect(applicationInstance) as TEMPORARY__JestMatcher).toContainAllKeys(
    applicationKeys,
  );
  const applicantInstance = (
    applicationInstance as {
      applicant: PlainObject;
    }
  ).applicant;
  // 2nd level
  (expect(applicantInstance) as TEMPORARY__JestMatcher).toContainKeys([
    'userName',
    'previousApplication',
    'password',
    'firstName',
    'dateOfBirth',
  ]);
  const secondApplicationInstance = (
    applicantInstance as {
      previousApplication: PlainObject;
    }
  ).previousApplication;
  (
    expect(secondApplicationInstance) as TEMPORARY__JestMatcher
  ).toContainAllKeys(applicationKeys);
  // 3rd level
  const secondApplicantInstance = (
    secondApplicationInstance as {
      applicant: PlainObject;
    }
  ).applicant;
  (expect(secondApplicantInstance) as TEMPORARY__JestMatcher).toContainKeys([
    'userName',
    'password',
    'firstName',
    'dateOfBirth',
  ]);
  // should not continue on to next depth
  expect(secondApplicantInstance).not.toContain('previousApplication');
});

test(unitTest('Class with miestoning'), () => {
  const vehicleOwner = editorStore.graphManagerState.graph.getClass(
    'myPackage::test::shared::dest::VehicleOwner',
  );
  const vehicleOwner_Instance = createMockClassInstance(vehicleOwner, true, 2);
  const vehicleOwner_properties = [
    'name',
    'businessDate',
    'vehicleAllVersions',
  ];
  (expect(vehicleOwner_Instance) as TEMPORARY__JestMatcher).toContainAllKeys(
    vehicleOwner_properties,
  );
});
