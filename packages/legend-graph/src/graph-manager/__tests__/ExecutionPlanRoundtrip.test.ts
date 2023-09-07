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

import { test, describe, expect } from '@jest/globals';
import type { Entity } from '@finos/legend-storage';
import { unitTest } from '@finos/legend-shared/test';
import {
  TEST__buildGraphWithEntities,
  TEST__getTestGraphManagerState,
} from '../__test-utils__/GraphManagerTestUtils.js';
import { TEST_DATA__simpleRelationalExecutionPlan } from './roundtripTestData/TEST_DATA__SimpleRelationalExecutionPlan.js';
import { TEST_DATA__simpleM2MExecutionPlan } from './roundtripTestData/TEST_DATA__SimpleM2MExecutionPlan.js';
import { TEST_DATA__simpleFlowControlExecutionPlan } from './roundtripTestData/TEST_DATA__SimpleFlowControlExecutionPlan.js';
import { TEST_DATA__simpleGraphFetchExecutionPlan } from './roundtripTestData/TEST_DATA__simpleGraphFetchExecutionPlan.js';
import { TEST_DATA__simpleCrossStoreGraphFetchExecutionPlan } from './roundtripTestData/TEST_DATA__simpleCrossStoreGraphFetchExecutionPlan.js';

type RoundtripTestCase = [
  string,
  {
    entities: Entity[];
  },
  object,
];

const cases: RoundtripTestCase[] = [
  [
    'Simple M2M execution plan',
    {
      entities: TEST_DATA__simpleM2MExecutionPlan.entities,
    },
    TEST_DATA__simpleM2MExecutionPlan.plan,
  ],
  [
    'Simple relational execution plan',
    {
      entities: TEST_DATA__simpleRelationalExecutionPlan.entities,
    },
    TEST_DATA__simpleRelationalExecutionPlan.plan,
  ],
  [
    'Simple flow control execution plan',
    {
      entities: TEST_DATA__simpleFlowControlExecutionPlan.entities,
    },
    TEST_DATA__simpleFlowControlExecutionPlan.plan,
  ],
  [
    'Simple graph fetch execution plan',
    {
      entities: TEST_DATA__simpleGraphFetchExecutionPlan.entities,
    },
    TEST_DATA__simpleGraphFetchExecutionPlan.plan,
  ],
  [
    'Simple cross store graph fetch execution plan',
    {
      entities: TEST_DATA__simpleCrossStoreGraphFetchExecutionPlan.entities,
    },
    TEST_DATA__simpleCrossStoreGraphFetchExecutionPlan.plan,
  ],
];

describe(unitTest('Execution plan processing roundtrip test'), () => {
  test.each(cases)(
    '%s',
    async (
      testName: RoundtripTestCase[0],
      context: RoundtripTestCase[1],
      executionPlanJson: RoundtripTestCase[2],
    ) => {
      const { entities } = context;
      // setup
      const graphManagerState = TEST__getTestGraphManagerState();
      await TEST__buildGraphWithEntities(graphManagerState, entities);
      // roundtrip check
      const executionPlan = graphManagerState.graphManager.buildExecutionPlan(
        executionPlanJson,
        graphManagerState.graph,
      );
      const _executionPlanJson =
        graphManagerState.graphManager.serializeExecutionPlan(executionPlan);
      expect(_executionPlanJson).toEqual(executionPlanJson);
    },
  );
});
