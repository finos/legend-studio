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

import type { Entity } from '../../models/sdlc/models/entity/Entity';
import { unitTest } from '@finos/legend-studio-shared';
import { getTestEditorStore } from '../StoreTestUtils';
import { simpleRelationalPlan } from './roundtrip/executionPlan/SimpleRelationalPlanTestData';

type RoundtripTestCase = [
  string,
  {
    entities: Entity[];
  },
  object,
];

const ctx = {
  entities: simpleRelationalPlan.entities,
};

const cases: RoundtripTestCase[] = [
  ['Simple relational execution plan', ctx, simpleRelationalPlan.plan],
];

describe(unitTest('Execution plan processing roundtrip test'), () => {
  test.each(cases)('%s', async (testName, context, executionPlanJson) => {
    const { entities } = context;
    // setup
    const editorStore = getTestEditorStore();
    await editorStore.graphState.initializeSystem();
    await editorStore.graphState.graphManager.buildGraph(
      editorStore.graphState.graph,
      entities,
      { TEMPORARY__keepSectionIndex: true },
    );
    // roundtrip check
    const executionPlan =
      editorStore.graphState.graphManager.buildExecutionPlan(
        executionPlanJson,
        editorStore.graphState.graph,
      );
    const _executionPlanJson =
      editorStore.graphState.graphManager.serializeExecutionPlan(executionPlan);
    expect(_executionPlanJson).toEqual(executionPlanJson);
  });
});
