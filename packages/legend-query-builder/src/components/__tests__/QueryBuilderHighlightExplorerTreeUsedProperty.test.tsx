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
import TEST_DATA__SimpleSubTypeModel from '../../stores/__tests__/TEST_DATA__QueryBuilder_Model_SimpleSubtype.json' with { type: 'json' };
import TEST_DATA__NestedSubTypeModel from '../../stores/__tests__/TEST_DATA__QueryBuilder_Model_NestedSubType.json' with { type: 'json' };
import { guaranteeNonNullable, type PlainObject } from '@finos/legend-shared';
import { integrationTest } from '@finos/legend-shared/test';
import {
  create_RawLambda,
  extractElementNameFromPath,
  stub_RawLambda,
} from '@finos/legend-graph';
import {
  TEST_DATA__ModelCoverageAnalysisResult_HighlightProperties,
  TEST_DATA__ModelCoverageAnalysisResult_NestedSubtype,
  TEST_DATA__ModelCoverageAnalysisResult_SimpleSubtype,
} from '../../stores/__tests__/TEST_DATA__ModelCoverageAnalysisResult.js';
import TEST_DATA__QueryBuilder_Model_HighlightProperties from './TEST_DATA__QueryBuilder_Model_HiglightProperties.json' with { type: 'json' };
import {
  TEST_DATA__simpleProjection,
  TEST_DATA__projectionWithNestedSubtype,
  TEST_DATA__simpleGraphFetch,
  TEST_DATA__graphFetchWithNestedSubtype,
} from './TEST_DATA__QueryBuilder_Query_HighlightProperties.js';
import {
  waitFor,
  getByText,
  fireEvent,
  queryByText,
  getAllByText,
  act,
} from '@testing-library/react';
import { QUERY_BUILDER_TEST_ID } from '../../__lib__/QueryBuilderTesting.js';
import { isExplorerTreeNodeAlreadyUsed } from '../explorer/QueryBuilderExplorerPanel.js';
import type { Entity } from '@finos/legend-storage';
import { TEST__setUpQueryBuilder } from '../__test-utils__/QueryBuilderComponentTestUtils.js';
import {
  TEST_DATA__simpleGraphFetchWithSubtype,
  TEST_DATA__simpleProjectWithSubtype,
  TEST_DATA__simpleProjectionWithSubtypesInDeepLevel,
} from '../../stores/__tests__/TEST_DATA__QueryBuilder_Generic.js';

type TestCase = [
  string,
  {
    mappingPath: string;
    runtimePath: string;
    classPath: string;
    entities: Entity[];
    rawLambda: { parameters?: object; body?: object };
    rawMappingModelCoverageAnalysisResult: PlainObject;
    /**
     * Assuming the root node is already expanded
     */
    nodesToExpand: string[];
    expectedNumberOfUsedPropertyNode: number;
  },
];

const cases: TestCase[] = [
  [
    'Simple projection',
    {
      mappingPath: 'my::map',
      runtimePath: 'my::runtime',
      classPath: 'my::Firm',
      entities: TEST_DATA__QueryBuilder_Model_HighlightProperties,
      rawLambda: TEST_DATA__simpleProjection,
      rawMappingModelCoverageAnalysisResult:
        TEST_DATA__ModelCoverageAnalysisResult_HighlightProperties,
      nodesToExpand: [],
      expectedNumberOfUsedPropertyNode: 2,
    },
  ],
  [
    'Simple projection (with subtype)',
    {
      mappingPath: 'model::NewMapping',
      runtimePath: 'model::Runtime',
      classPath: 'model::Person',
      entities: TEST_DATA__NestedSubTypeModel,
      rawLambda: TEST_DATA__projectionWithNestedSubtype,
      rawMappingModelCoverageAnalysisResult:
        TEST_DATA__ModelCoverageAnalysisResult_NestedSubtype,
      nodesToExpand: ['Address', '@Address Type 1', '@Address Type 2'],
      expectedNumberOfUsedPropertyNode: 5,
    },
  ],
  [
    'Simple graph-fetch',
    {
      mappingPath: 'my::map',
      runtimePath: 'my::runtime',
      classPath: 'my::Firm',
      entities: TEST_DATA__QueryBuilder_Model_HighlightProperties,
      rawLambda: TEST_DATA__simpleGraphFetch,
      rawMappingModelCoverageAnalysisResult:
        TEST_DATA__ModelCoverageAnalysisResult_HighlightProperties,
      nodesToExpand: [],
      expectedNumberOfUsedPropertyNode: 2,
    },
  ],
  [
    'Simple graph-fetch (with subtype)',
    {
      mappingPath: 'model::NewMapping',
      runtimePath: 'model::Runtime',
      classPath: 'model::Person',
      entities: TEST_DATA__NestedSubTypeModel,
      rawLambda: TEST_DATA__graphFetchWithNestedSubtype,
      rawMappingModelCoverageAnalysisResult:
        TEST_DATA__ModelCoverageAnalysisResult_NestedSubtype,
      nodesToExpand: ['Address', '@Address Type 1', '@Address Type 2'],
      expectedNumberOfUsedPropertyNode: 5,
    },
  ],
  [
    'Simple projection (with subType) when propery mapping points to class mapping of subType',
    {
      mappingPath: 'model::NewMapping',
      runtimePath: 'model::Runtime',
      classPath: 'model::Person',
      entities: TEST_DATA__SimpleSubTypeModel,
      rawLambda: TEST_DATA__simpleProjectWithSubtype,
      rawMappingModelCoverageAnalysisResult:
        TEST_DATA__ModelCoverageAnalysisResult_SimpleSubtype,
      nodesToExpand: ['Address'],
      expectedNumberOfUsedPropertyNode: 5,
    },
  ],
  [
    'Simple graphFetch (with subType) when propery mapping points to class mapping of subType',
    {
      mappingPath: 'model::NewMapping',
      runtimePath: 'model::Runtime',
      classPath: 'model::Person',
      entities: TEST_DATA__SimpleSubTypeModel,
      rawLambda: TEST_DATA__simpleGraphFetchWithSubtype,
      rawMappingModelCoverageAnalysisResult:
        TEST_DATA__ModelCoverageAnalysisResult_SimpleSubtype,
      nodesToExpand: ['Address'],
      expectedNumberOfUsedPropertyNode: 5,
    },
  ],

  [
    'Simple projection (with subType) when deep-level ( > 1 layer) propery mapping points to class mapping of subType',
    {
      mappingPath: 'model::NewMapping',
      runtimePath: 'model::Runtime',
      classPath: 'model::Firm',
      entities: TEST_DATA__SimpleSubTypeModel,
      rawLambda: TEST_DATA__simpleProjectionWithSubtypesInDeepLevel,
      rawMappingModelCoverageAnalysisResult:
        TEST_DATA__ModelCoverageAnalysisResult_SimpleSubtype,
      nodesToExpand: ['Employees', 'Address'],
      expectedNumberOfUsedPropertyNode: 6,
    },
  ],
];

describe(integrationTest('Build property mapping data'), () => {
  test.each(cases)(
    '%s',
    async (testName: TestCase[0], testCase: TestCase[1]) => {
      const {
        mappingPath,
        runtimePath,
        classPath,
        entities,
        rawLambda,
        rawMappingModelCoverageAnalysisResult,
        nodesToExpand,
        expectedNumberOfUsedPropertyNode,
      } = testCase;
      const { renderResult, queryBuilderState } = await TEST__setUpQueryBuilder(
        entities,
        stub_RawLambda(),
        mappingPath,
        runtimePath,
        rawMappingModelCoverageAnalysisResult,
      );

      await act(async () => {
        queryBuilderState.changeClass(
          queryBuilderState.graphManagerState.graph.getClass(classPath),
        );
      });
      const setupPanel = await waitFor(() =>
        renderResult.getByTestId(QUERY_BUILDER_TEST_ID.QUERY_BUILDER_SETUP),
      );
      await waitFor(() =>
        getByText(setupPanel, extractElementNameFromPath(classPath)),
      );
      await waitFor(() =>
        getByText(setupPanel, extractElementNameFromPath(mappingPath)),
      );
      expect(
        getAllByText(setupPanel, extractElementNameFromPath(runtimePath))
          .length,
      ).toBeGreaterThanOrEqual(1);
      await act(async () => {
        queryBuilderState.initializeWithQuery(
          create_RawLambda(rawLambda.parameters, rawLambda.body),
        );
      });

      const explorerPanel = await waitFor(() =>
        renderResult.getByTestId(QUERY_BUILDER_TEST_ID.QUERY_BUILDER_EXPLORER),
      );
      for (const label of nodesToExpand) {
        await waitFor(() => getByText(explorerPanel, label));
        fireEvent.click(getByText(explorerPanel, label));
      }

      expect(
        Array.from(
          queryBuilderState.explorerState.nonNullableTreeData.nodes.values(),
        ).filter((node) =>
          isExplorerTreeNodeAlreadyUsed(node, queryBuilderState),
        ).length,
      ).toBe(expectedNumberOfUsedPropertyNode);
    },
  );
});

test(integrationTest('Query builder parameter default values'), async () => {
  const { renderResult, queryBuilderState } = await TEST__setUpQueryBuilder(
    TEST_DATA__QueryBuilder_Model_HighlightProperties,
    stub_RawLambda(),
    'my::map',
    'my::runtime',
    TEST_DATA__ModelCoverageAnalysisResult_HighlightProperties,
  );
  await act(async () => {
    queryBuilderState.changeClass(
      queryBuilderState.graphManagerState.graph.getClass('my::Firm'),
    );
  });

  const explorerPanel = await waitFor(() =>
    renderResult.getByTestId(QUERY_BUILDER_TEST_ID.QUERY_BUILDER_EXPLORER),
  );
  await waitFor(() => getByText(explorerPanel, 'Firm'));
  const tooltipIcon = await waitFor(
    () =>
      renderResult.getAllByTestId(
        QUERY_BUILDER_TEST_ID.QUERY_BUILDER_TOOLTIP_ICON,
      )[0],
  );
  fireEvent.mouseOver(guaranteeNonNullable(tooltipIcon));
  const tooltip = await waitFor(() => renderResult.getByRole('tooltip'));
  await waitFor(() => getByText(tooltip, 'Tagged Values'));
  await waitFor(() => getByText(tooltip, 'Show More'));
  await waitFor(() => getByText(tooltip, 'TestProfile.ID'));
  expect(queryByText(tooltip, 'TestProfile.Test')).toBeNull();
  fireEvent.click(getByText(tooltip, 'Show More'));
  await waitFor(() => getByText(tooltip, 'Show Less'));
  await waitFor(() => getByText(tooltip, 'TestProfile.Test'));
});
