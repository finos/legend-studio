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

import completeGraphEntities from './MockDataGenerationTestData.json';
import type { Entity } from '../../../models/sdlc/models/entity/Entity';
import { classHasCycle, createMockClassInstance } from '../MockDataUtil';
import { unitTest } from '@finos/legend-studio-shared';
import { getTestEditorStore } from '../../StoreTestUtils';

const editorStore = getTestEditorStore();

beforeAll(async () => {
  await editorStore.graphState.graphManager.buildGraph(
    editorStore.graphState.graph,
    completeGraphEntities as Entity[],
  );
});

test(unitTest('Class with hierarchy cycle is detected'), () => {
  const cycledComplexClass = editorStore.graphState.graph.getClass(
    'myPackage::test::shared::src::Application',
  );
  const nonComplexStyleClass = editorStore.graphState.graph.getClass(
    'myPackage::test::shared::src::Membership',
  );
  const simpleClass = editorStore.graphState.graph.getClass(
    'myPackage::test::shared::src::Address',
  );
  expect(classHasCycle(cycledComplexClass, true, new Set<string>())).toBeTrue();
  expect(
    classHasCycle(nonComplexStyleClass, true, new Set<string>()),
  ).toBeFalse();
  expect(classHasCycle(simpleClass, true, new Set<string>())).toBeFalse();
});

// TODO: maybe we should isolate this to another test for mock data util
test(unitTest('Test mock data with classes cycle'), () => {
  const applicationClass = editorStore.graphState.graph.getClass(
    'myPackage::test::shared::src::Application',
  );
  const applicationInstance = createMockClassInstance(
    applicationClass,
    true,
    3,
  );
  // 1st level
  const applicationKeys = ['applicant', 'employee', 'previousEmployeer'];
  expect(applicationInstance).toContainAllKeys(applicationKeys);
  const applicantInstance = (
    applicationInstance as {
      applicant: Record<PropertyKey, unknown>;
    }
  ).applicant;
  // 2nd level
  expect(applicantInstance).toContainKeys([
    'userName',
    'previousApplication',
    'password',
    'firstName',
    'dateOfBirth',
  ]);
  const secondApplicationInstance = (
    applicantInstance as {
      previousApplication: Record<PropertyKey, unknown>;
    }
  ).previousApplication;
  expect(secondApplicationInstance).toContainAllKeys(applicationKeys);
  // 3rd level
  const secondApplicantInstance = (
    secondApplicationInstance as {
      applicant: Record<PropertyKey, unknown>;
    }
  ).applicant;
  expect(secondApplicantInstance).toContainKeys([
    'userName',
    'password',
    'firstName',
    'dateOfBirth',
  ]);
  // should not continue on to next depth
  expect(secondApplicantInstance).not.toContain('previousApplication');
});
