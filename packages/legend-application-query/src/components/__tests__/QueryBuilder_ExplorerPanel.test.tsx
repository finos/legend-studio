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

import { test, expect } from '@jest/globals';
import TEST_DATA_SimpleSubtypeModel from '../../stores/__tests__/TEST_DATA__QueryBuilder_Model_SimpleSubtype.json';
import TEST_DATA_ComplexSubtypeModel from '../../stores/__tests__/TEST_DATA__QueryBuilder_Model_ComplexSubType.json';
import {
  integrationTest,
  guaranteeNonNullable,
  guaranteeType,
} from '@finos/legend-shared';
import { create_RawLambda, stub_RawLambda } from '@finos/legend-graph';
import {
  QueryBuilderExplorerTreeRootNodeData,
  QueryBuilderExplorerTreeSubTypeNodeData,
} from '../../stores/explorer/QueryBuilderExplorerState.js';
import { LegendQueryPluginManager } from '../../application/LegendQueryPluginManager.js';
import { QueryBuilder_GraphManagerPreset } from '../../graphManager/QueryBuilder_GraphManagerPreset.js';
import {
  TEST__provideMockedQueryEditorStore,
  TEST__setUpQueryEditor,
} from '../../components/QueryEditorComponentTestUtils.js';
import {
  TEST_DATA__ModelCoverageAnalysisResult_HighlightProperties,
  TEST_DATA__ModelCoverageAnalysisResult_SimpleSubtype,
  TEST_DATA__ModelCoverageAnalysisResult_ComplexSubtype,
} from '../../stores/__tests__/TEST_DATA__ModelCoverageAnalysisResult.js';
import TEST_DATA__QueryBuilder_Model_HighlightProperties from './TEST_DATA__QueryBuilder_Model_HiglightProperties.json';
import {
  TEST_DATA_simpleGraphFetchWithSubType,
  TEST_DATA__simpleGraphFetch,
  TEST_DATA__simpleProjection,
} from './TEST_DATA__QueryBuilder_HighlightProperties.js';
import { waitFor, getByText, getAllByText } from '@testing-library/react';
import { act } from 'react-dom/test-utils';
import { QUERY_BUILDER_TEST_ID } from '../../components/QueryBuilder_TestID.js';
import { isExplorerTreeNodeAlreadyUsed } from '../../components/explorer/QueryBuilderExplorerPanel.js';
import { TEST_DATA__simpleProjectionWithSubtypeFromSubtypeModel } from '../../stores/__tests__/TEST_DATA__QueryBuilder_Generic.js';

test(
  integrationTest('Highlight already used properties in projection'),
  async () => {
    const pluginManager = LegendQueryPluginManager.create();
    pluginManager.usePresets([new QueryBuilder_GraphManagerPreset()]).install();
    const MOCK__editorStore = TEST__provideMockedQueryEditorStore({
      pluginManager,
    });
    const renderResult = await TEST__setUpQueryEditor(
      MOCK__editorStore,
      TEST_DATA__QueryBuilder_Model_HighlightProperties,
      stub_RawLambda(),
      'my::map',
      'my::runtime',
      TEST_DATA__ModelCoverageAnalysisResult_HighlightProperties,
    );
    const queryBuilderState = MOCK__editorStore.queryBuilderState;
    const _firmClass =
      MOCK__editorStore.graphManagerState.graph.getClass('my::Firm');

    await act(async () => {
      queryBuilderState.changeClass(_firmClass);
    });
    const queryBuilderSetup = await waitFor(() =>
      renderResult.getByTestId(QUERY_BUILDER_TEST_ID.QUERY_BUILDER_SETUP),
    );
    await waitFor(() => getByText(queryBuilderSetup, 'Firm'));
    await waitFor(() => getByText(queryBuilderSetup, 'map'));
    await waitFor(() => getByText(queryBuilderSetup, 'runtime'));
    await act(async () => {
      queryBuilderState.initialize(
        create_RawLambda(
          TEST_DATA__simpleProjection.parameters,
          TEST_DATA__simpleProjection.body,
        ),
      );
    });

    expect(
      Array.from(
        queryBuilderState.explorerState.nonNullableTreeData.nodes.values(),
      ).filter((node) => isExplorerTreeNodeAlreadyUsed(node, queryBuilderState))
        .length,
    ).toBe(2);
  },
);

test(
  integrationTest(
    'Highlight already used subtype in projection (with subtype)',
  ),
  async () => {
    const pluginManager = LegendQueryPluginManager.create();
    pluginManager.usePresets([new QueryBuilder_GraphManagerPreset()]).install();
    const MOCK__editorStore = TEST__provideMockedQueryEditorStore({
      pluginManager,
    });
    const renderResult = await TEST__setUpQueryEditor(
      MOCK__editorStore,
      TEST_DATA_SimpleSubtypeModel,
      stub_RawLambda(),
      'model::NewMapping',
      'model::Runtime',
      TEST_DATA__ModelCoverageAnalysisResult_SimpleSubtype,
    );
    const queryBuilderState = MOCK__editorStore.queryBuilderState;
    const _legalEntityClass =
      MOCK__editorStore.graphManagerState.graph.getClass('model::LegalEntity');
    await act(async () => {
      queryBuilderState.changeClass(_legalEntityClass);
    });
    const queryBuilderSetup = await waitFor(() =>
      renderResult.getByTestId(QUERY_BUILDER_TEST_ID.QUERY_BUILDER_SETUP),
    );
    await waitFor(() => getAllByText(queryBuilderSetup, 'LegalEntity'));
    await waitFor(() => getAllByText(queryBuilderSetup, 'NewMapping'));

    // check subclass display in the explorer tree
    const treeData = guaranteeNonNullable(
      queryBuilderState.explorerState.treeData,
    );
    const rootNode = guaranteeType(
      treeData.nodes.get(treeData.rootIds[0] as string),
      QueryBuilderExplorerTreeRootNodeData,
    );
    expect(rootNode.mappingData.mapped).toBe(true);
    const subTypeNodes = [...treeData.nodes.values()].filter(
      (node) => node instanceof QueryBuilderExplorerTreeSubTypeNodeData,
    );
    expect(subTypeNodes.length).toBe(1);
    expect(guaranteeNonNullable(subTypeNodes[0]).mappingData.mapped).toBe(true);
    const queryBuilderExplorerTreeSetup = await waitFor(() =>
      renderResult.getByTestId(QUERY_BUILDER_TEST_ID.QUERY_BUILDER_EXPLORER),
    );
    await waitFor(() => getByText(queryBuilderExplorerTreeSetup, '@Firm'));

    // simpleProjection with subType
    await act(async () => {
      queryBuilderState.initialize(
        create_RawLambda(
          TEST_DATA__simpleProjectionWithSubtypeFromSubtypeModel.parameters,
          TEST_DATA__simpleProjectionWithSubtypeFromSubtypeModel.body,
        ),
      );
    });

    const projectionColsWithSubType = await waitFor(() =>
      renderResult.getByTestId(QUERY_BUILDER_TEST_ID.QUERY_BUILDER_PROJECTION),
    );
    const NAME_ALIAS = '(@Firm)/Employees/First Name';
    await waitFor(() => getByText(projectionColsWithSubType, NAME_ALIAS));
    expect(
      Array.from(
        queryBuilderState.explorerState.nonNullableTreeData.nodes.values(),
      ).filter((node) => isExplorerTreeNodeAlreadyUsed(node, queryBuilderState))
        .length,
    ).toBe(2);
  },
);

test(
  integrationTest('Highlight already used properties in graph-fetch'),
  async () => {
    const pluginManager = LegendQueryPluginManager.create();
    pluginManager.usePresets([new QueryBuilder_GraphManagerPreset()]).install();
    const MOCK__editorStore = TEST__provideMockedQueryEditorStore({
      pluginManager,
    });
    const renderResult = await TEST__setUpQueryEditor(
      MOCK__editorStore,
      TEST_DATA__QueryBuilder_Model_HighlightProperties,
      stub_RawLambda(),
      'my::map',
      'my::runtime',
      TEST_DATA__ModelCoverageAnalysisResult_HighlightProperties,
    );
    const queryBuilderState = MOCK__editorStore.queryBuilderState;
    const _firmClass =
      MOCK__editorStore.graphManagerState.graph.getClass('my::Firm');

    await act(async () => {
      queryBuilderState.changeClass(_firmClass);
    });
    const queryBuilderSetup = await waitFor(() =>
      renderResult.getByTestId(QUERY_BUILDER_TEST_ID.QUERY_BUILDER_SETUP),
    );
    await waitFor(() => getByText(queryBuilderSetup, 'Firm'));
    await waitFor(() => getByText(queryBuilderSetup, 'map'));
    await waitFor(() => getByText(queryBuilderSetup, 'runtime'));
    await act(async () => {
      queryBuilderState.initialize(
        create_RawLambda(
          TEST_DATA__simpleGraphFetch.parameters,
          TEST_DATA__simpleGraphFetch.body,
        ),
      );
    });

    expect(
      Array.from(
        queryBuilderState.explorerState.nonNullableTreeData.nodes.values(),
      ).filter((node) => isExplorerTreeNodeAlreadyUsed(node, queryBuilderState))
        .length,
    ).toBe(2);
  },
);

test(
  integrationTest(
    'Highlight already used subtype in graph-fetch (with subtype)',
  ),
  async () => {
    const pluginManager = LegendQueryPluginManager.create();
    pluginManager.usePresets([new QueryBuilder_GraphManagerPreset()]).install();
    const MOCK__editorStore = TEST__provideMockedQueryEditorStore({
      pluginManager,
    });
    const renderResult = await TEST__setUpQueryEditor(
      MOCK__editorStore,
      TEST_DATA_ComplexSubtypeModel,
      stub_RawLambda(),
      'model::NewMapping',
      'model::Runtime',
      TEST_DATA__ModelCoverageAnalysisResult_ComplexSubtype,
    );
    const queryBuilderState = MOCK__editorStore.queryBuilderState;
    const _Class =
      MOCK__editorStore.graphManagerState.graph.getClass('model::Firm');
    await act(async () => {
      queryBuilderState.changeClass(_Class);
    });
    const queryBuilderSetup = await waitFor(() =>
      renderResult.getByTestId(QUERY_BUILDER_TEST_ID.QUERY_BUILDER_SETUP),
    );
    await waitFor(() => getAllByText(queryBuilderSetup, 'Firm'));
    await waitFor(() => getAllByText(queryBuilderSetup, 'NewMapping'));

    // check subclass display in the explorer tree
    const treeData = guaranteeNonNullable(
      queryBuilderState.explorerState.treeData,
    );
    const rootNode = guaranteeType(
      treeData.nodes.get(treeData.rootIds[0] as string),
      QueryBuilderExplorerTreeRootNodeData,
    );
    expect(rootNode.mappingData.mapped).toBe(true);

    await act(async () => {
      queryBuilderState.initialize(
        create_RawLambda(
          TEST_DATA_simpleGraphFetchWithSubType.parameters,
          TEST_DATA_simpleGraphFetchWithSubType.body,
        ),
      );
    });

    expect(
      Array.from(
        queryBuilderState.explorerState.nonNullableTreeData.nodes.values(),
      ).filter((node) => isExplorerTreeNodeAlreadyUsed(node, queryBuilderState))
        .length,
    ).toBe(2);
  },
);
