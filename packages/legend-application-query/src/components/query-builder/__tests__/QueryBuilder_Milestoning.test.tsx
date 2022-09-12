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

import { describe, test, expect } from '@jest/globals';
import { act } from '@testing-library/react';
import {
  TEST_DATA__simpleProjectionWithBiTemporalSourceAndBiTemporalTarget,
  TEST_DATA__simpleProjectionWithBiTemporalSourceAndBusinessTemporalTarget,
  TEST_DATA__simpleProjectionWithBiTemporalSourceAndProcessingTemporalTarget,
  TEST_DATA__simpleProjectionWithBusinessTemporalSourceAndBiTemporalTarget,
  TEST_DATA__simpleProjectionWithBusinessTemporalSourceAndBusinessTemporalTarget,
  TEST_DATA__simpleProjectionWithBusinessTemporalSourceAndProcessingTemporalTarget,
  TEST_DATA__simpleProjectionWithNonTemporalSourceAndBiTemporalTarget,
  TEST_DATA__simpleProjectionWithNonTemporalSourceAndBusinessTemporalTarget,
  TEST_DATA__simpleProjectionWithNonTemporalSourceAndProcessingTemporalTarget,
  TEST_DATA__simpleProjectionWithProcessingTemporalSourceAndBiTemporalTarget,
  TEST_DATA__simpleProjectionWithProcessingTemporalSourceAndBusinessTemporalTarget,
  TEST_DATA__simpleProjectionWithProcessingTemporalSourceAndProcessingTemporalTarget,
} from '../../../stores/query-builder/__tests__/TEST_DATA__QueryBuilder_Milestoning.js';
import TEST_MilestoningModel from '../../../stores/query-builder/__tests__/TEST_DATA__QueryBuilder_Model_Milestoning.json';
import {
  integrationTest,
  guaranteeNonNullable,
  guaranteeType,
} from '@finos/legend-shared';
import { stub_RawLambda, create_RawLambda } from '@finos/legend-graph';
import {
  TEST__provideMockedQueryEditorStore,
  TEST__setUpQueryEditor,
} from '../../QueryEditorComponentTestUtils.js';
import { QueryBuilderSimpleProjectionColumnState } from '../../../stores/query-builder/fetch-structure/projection/QueryBuilderProjectionColumnState.js';
import { LegendQueryPluginManager } from '../../../application/LegendQueryPluginManager.js';
import { QueryBuilder_GraphManagerPreset } from '../../../graphManager/QueryBuilder_GraphManagerPreset.js';
import { QueryBuilderProjectionState } from '../../../stores/query-builder/fetch-structure/projection/QueryBuilderProjectionState.js';
import type { Entity } from '@finos/legend-storage';

type TestCase = [
  string,
  {
    mappingPath: string;
    runtimePath: string;
    classPath: string;
    entities: Entity[];
    rawLambda: { parameters?: object; body?: object };
    expectedNumberOfDerivedPropertyStates: number;
    expectedNumberOfParameterValues: number;
  },
];

const cases: TestCase[] = [
  [
    'Query builder state is properly set after processing a lambda with Business Temporal source Processing Temporal target',
    {
      mappingPath: 'my::map',
      runtimePath: 'my::runtime',
      classPath: 'my::Person',
      entities: TEST_MilestoningModel,
      rawLambda:
        TEST_DATA__simpleProjectionWithBusinessTemporalSourceAndProcessingTemporalTarget,
      expectedNumberOfDerivedPropertyStates: 1,
      expectedNumberOfParameterValues: 2,
    },
  ],
  [
    'Query builder state is properly set after processing a lambda with Business Temporal source Business Temporal target',
    {
      mappingPath: 'my::map',
      runtimePath: 'my::runtime',
      classPath: 'my::Person',
      entities: TEST_MilestoningModel,
      rawLambda:
        TEST_DATA__simpleProjectionWithBusinessTemporalSourceAndBusinessTemporalTarget,
      expectedNumberOfDerivedPropertyStates: 1,
      expectedNumberOfParameterValues: 2,
    },
  ],
  [
    'Query builder state is properly set after processing a lambda with Business Temporal source BiTemporal target',
    {
      mappingPath: 'my::map',
      runtimePath: 'my::runtime',
      classPath: 'my::Person',
      entities: TEST_MilestoningModel,
      rawLambda:
        TEST_DATA__simpleProjectionWithBusinessTemporalSourceAndBiTemporalTarget,
      expectedNumberOfDerivedPropertyStates: 1,
      expectedNumberOfParameterValues: 3,
    },
  ],
  [
    'Query builder state is properly set after processing a lambda with BiTemporal source BiTemporal target',
    {
      mappingPath: 'my::map',
      runtimePath: 'my::runtime',
      classPath: 'my::Person',
      entities: TEST_MilestoningModel,
      rawLambda:
        TEST_DATA__simpleProjectionWithBiTemporalSourceAndBiTemporalTarget,
      expectedNumberOfDerivedPropertyStates: 1,
      expectedNumberOfParameterValues: 3,
    },
  ],
  [
    'Query builder state is properly set after processing a lambda with BiTemporal source Business Temporal target',
    {
      mappingPath: 'my::map',
      runtimePath: 'my::runtime',
      classPath: 'my::Person',
      entities: TEST_MilestoningModel,
      rawLambda:
        TEST_DATA__simpleProjectionWithBiTemporalSourceAndBusinessTemporalTarget,
      expectedNumberOfDerivedPropertyStates: 1,
      expectedNumberOfParameterValues: 2,
    },
  ],
  [
    'Query builder state is properly set after processing a lambda with BiTemporal source Processing Temporal target',
    {
      mappingPath: 'my::map',
      runtimePath: 'my::runtime',
      classPath: 'my::Person',
      entities: TEST_MilestoningModel,
      rawLambda:
        TEST_DATA__simpleProjectionWithBiTemporalSourceAndProcessingTemporalTarget,
      expectedNumberOfDerivedPropertyStates: 1,
      expectedNumberOfParameterValues: 2,
    },
  ],
  [
    'Query builder state is properly set after processing a lambda with Processing Temporal source BiTemporal target',
    {
      mappingPath: 'my::map',
      runtimePath: 'my::runtime',
      classPath: 'my::Person',
      entities: TEST_MilestoningModel,
      rawLambda:
        TEST_DATA__simpleProjectionWithProcessingTemporalSourceAndBiTemporalTarget,
      expectedNumberOfDerivedPropertyStates: 1,
      expectedNumberOfParameterValues: 3,
    },
  ],
  [
    'Query builder state is properly set after processing a lambda with Processing Temporal source Business Temporal target',
    {
      mappingPath: 'my::map',
      runtimePath: 'my::runtime',
      classPath: 'my::Person',
      entities: TEST_MilestoningModel,
      rawLambda:
        TEST_DATA__simpleProjectionWithProcessingTemporalSourceAndBusinessTemporalTarget,
      expectedNumberOfDerivedPropertyStates: 1,
      expectedNumberOfParameterValues: 2,
    },
  ],
  [
    'Query builder state is properly set after processing a lambda with Processing Temporal source Processing Temporal target',
    {
      mappingPath: 'my::map',
      runtimePath: 'my::runtime',
      classPath: 'my::Person',
      entities: TEST_MilestoningModel,
      rawLambda:
        TEST_DATA__simpleProjectionWithProcessingTemporalSourceAndProcessingTemporalTarget,
      expectedNumberOfDerivedPropertyStates: 1,
      expectedNumberOfParameterValues: 2,
    },
  ],
  [
    'Query builder state is properly set after processing a lambda with non-temporal source Processing Temporal target',
    {
      mappingPath: 'my::map',
      runtimePath: 'my::runtime',
      classPath: 'my::Person',
      entities: TEST_MilestoningModel,
      rawLambda:
        TEST_DATA__simpleProjectionWithNonTemporalSourceAndProcessingTemporalTarget,
      expectedNumberOfDerivedPropertyStates: 1,
      expectedNumberOfParameterValues: 2,
    },
  ],
  [
    'Query builder state is properly set after processing a lambda with non-temporal source Business Temporal target',
    {
      mappingPath: 'my::map',
      runtimePath: 'my::runtime',
      classPath: 'my::Person',
      entities: TEST_MilestoningModel,
      rawLambda:
        TEST_DATA__simpleProjectionWithNonTemporalSourceAndBusinessTemporalTarget,
      expectedNumberOfDerivedPropertyStates: 1,
      expectedNumberOfParameterValues: 2,
    },
  ],
  [
    'Query builder state is properly set after processing a lambda with non-temporal source BiTemporal target',
    {
      mappingPath: 'my::map',
      runtimePath: 'my::runtime',
      classPath: 'my::Person',
      entities: TEST_MilestoningModel,
      rawLambda:
        TEST_DATA__simpleProjectionWithNonTemporalSourceAndBiTemporalTarget,
      expectedNumberOfDerivedPropertyStates: 1,
      expectedNumberOfParameterValues: 3,
    },
  ],
];

describe(integrationTest('Query builder milestoning'), () => {
  test.each(cases)(
    '%s',
    async (testName: TestCase[0], testCase: TestCase[1]) => {
      const {
        mappingPath,
        runtimePath,
        classPath,
        entities,
        rawLambda,
        expectedNumberOfDerivedPropertyStates,
        expectedNumberOfParameterValues,
      } = testCase;

      const pluginManager = LegendQueryPluginManager.create();
      pluginManager
        .usePresets([new QueryBuilder_GraphManagerPreset()])
        .install();
      const MOCK__editorStore = TEST__provideMockedQueryEditorStore({
        pluginManager,
      });
      const { queryBuilderState } = await TEST__setUpQueryEditor(
        MOCK__editorStore,
        entities,
        stub_RawLambda(),
        mappingPath,
        runtimePath,
      );

      const _personClass =
        MOCK__editorStore.graphManagerState.graph.getClass(classPath);
      await act(async () => {
        queryBuilderState.changeClass(_personClass);
      });

      await act(async () => {
        queryBuilderState.initialize(
          create_RawLambda(rawLambda.parameters, rawLambda.body),
        );
      });

      const projectionState = guaranteeType(
        queryBuilderState.fetchStructureState.implementation,
        QueryBuilderProjectionState,
      );
      const projectionColumnState = guaranteeType(
        projectionState.columns[0],
        QueryBuilderSimpleProjectionColumnState,
      );
      const derivedPropertyExpressionStates =
        projectionColumnState.propertyExpressionState
          .derivedPropertyExpressionStates;

      // property replaced with derived property as it is milestoned
      expect(derivedPropertyExpressionStates.length).toBe(
        expectedNumberOfDerivedPropertyStates,
      );
      const parameterValues = guaranteeNonNullable(
        derivedPropertyExpressionStates[0]?.propertyExpression.parametersValues,
      );

      // default milestoning date is propagated as date propagation is not supported.
      expect(parameterValues.length).toBe(expectedNumberOfParameterValues);
    },
  );
});
