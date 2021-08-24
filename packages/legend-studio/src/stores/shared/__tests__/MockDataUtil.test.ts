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

import TEST_DATA__completeGraphEntities from './TEST_DATA__MockDataGeneration.json';
import { classHasCycle, createMockClassInstance } from '../MockDataUtil';
import { unitTest } from '@finos/legend-shared';
import { TEST__getTestEditorStore } from '../../EditorStoreTestUtils';
import { flowResult } from 'mobx';
import type { Entity } from '@finos/legend-model-storage';

const editorStore = TEST__getTestEditorStore();

beforeAll(async () => {
  await flowResult(
    editorStore.graphManagerState.graphManager.buildGraph(
      editorStore.graphManagerState.graph,
      TEST_DATA__completeGraphEntities as Entity[],
    ),
  );
});

test(unitTest('Class with hierarchy cycle is detected'), () => {
  const _class = editorStore.graphManagerState.graph.getClass(
    'myPackage::test::Misc',
  );
  expect(createMockClassInstance(_class)).toContainAllKeys([
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
  expect(classHasCycle(cycledComplexClass, true, new Set<string>())).toBe(true);
  expect(
    classHasCycle(nonComplexStyleClass, true, new Set<string>()),
  ).toBeFalse();
  expect(classHasCycle(simpleClass, true, new Set<string>())).toBeFalse();
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
