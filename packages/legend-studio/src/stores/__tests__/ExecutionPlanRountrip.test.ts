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

import type { Entity } from '@finos/legend-model-storage';
import { unitTest } from '@finos/legend-shared';
import {
  TEST__buildGraphBasic,
  TEST__getTestEditorStore,
} from '../EditorStoreTestUtils';
import { TEST_DATA__simpleRelationalPlan } from './roundtrip/executionPlan/SimpleRelationalPlanTestData';

type RoundtripTestCase = [
  string,
  {
    entities: Entity[];
  },
  object,
];

const ctx = {
  entities: TEST_DATA__simpleRelationalPlan.entities,
};

const cases: RoundtripTestCase[] = [
  [
    'Simple relational execution plan',
    ctx,
    TEST_DATA__simpleRelationalPlan.plan,
  ],
];

describe(unitTest('Execution plan processing roundtrip test'), () => {
  test.each(cases)('%s', async (testName, context, executionPlanJson) => {
    const { entities } = context;
    // setup
    const editorStore = TEST__getTestEditorStore();
    await TEST__buildGraphBasic(entities, editorStore, {
      TEMPORARY__keepSectionIndex: true,
    });
    // roundtrip check
    const executionPlan =
      editorStore.graphManagerState.graphManager.buildExecutionPlan(
        executionPlanJson,
        editorStore.graphManagerState.graph,
      );
    const _executionPlanJson =
      editorStore.graphManagerState.graphManager.serializeExecutionPlan(
        executionPlan,
      );
    expect(_executionPlanJson).toEqual(executionPlanJson);
  });
});
