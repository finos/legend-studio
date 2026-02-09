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

import { test, expect, jest } from '@jest/globals';
import {
  waitFor,
  fireEvent,
  findByDisplayValue,
  act,
} from '@testing-library/react';
import { createSpy, integrationTest } from '@finos/legend-shared/test';
import {
  TEST__openElementFromExplorerTree,
  TEST__provideMockedEditorStore,
  TEST__setUpEditorWithDefaultSDLCData,
} from '../../../__test-utils__/EditorComponentTestUtils.js';
import { LEGEND_STUDIO_TEST_ID } from '../../../../../__lib__/LegendStudioTesting.js';
import {
  Core_GraphManagerPreset,
  V1_buildModelCoverageAnalysisResult,
  V1_MappingModelCoverageAnalysisResult,
  type V1_PureGraphManager,
} from '@finos/legend-graph';
import {
  QUERY_BUILDER_TEST_ID,
  QueryBuilder_GraphManagerPreset,
} from '@finos/legend-query-builder';
import { LegendStudioPluginManager } from '../../../../../application/LegendStudioPluginManager.js';
import { MockedMonacoEditorInstance } from '@finos/legend-lego/code-editor/test';
import { getByText, screen } from '@testing-library/dom';
import { TEST_DATA__DataProduct_NativeModelAccess } from './DataProductTestData.js';

const rawMappingCoverageCustomer = {
  mappedEntities: [
    {
      path: 'showcase::northwind::model::crm::Customer',
      properties: [
        {
          _type: 'MappedProperty',
          name: 'companyName',
        },
        {
          _type: 'MappedProperty',
          name: 'companyTitle',
        },
        {
          _type: 'MappedProperty',
          name: 'contactName',
        },
        {
          _type: 'MappedProperty',
          name: 'faxNumber',
        },
        {
          _type: 'MappedProperty',
          name: 'id',
        },
        {
          _type: 'MappedProperty',
          name: 'telephoneNumber',
        },
      ],
    },
  ],
};

const rawCategoryMappingCoverageCustomer = {
  mappedEntities: [
    {
      path: 'showcase::northwind::model::inventory::ProductCategory',
      properties: [
        {
          _type: 'MappedProperty',
          name: 'description',
        },
        {
          _type: 'MappedProperty',
          name: 'id',
        },
        {
          _type: 'MappedProperty',
          name: 'name',
        },
      ],
    },
  ],
};
const pluginManager = LegendStudioPluginManager.create();
pluginManager
  .usePresets([
    new QueryBuilder_GraphManagerPreset(),
    new Core_GraphManagerPreset(),
  ])
  .install();

jest.mock('react-oidc-context', () => {
  const { MOCK__reactOIDCContext } = jest.requireActual<{
    MOCK__reactOIDCContext: unknown;
  }>('@finos/legend-shared/test');
  return MOCK__reactOIDCContext;
});

(global as unknown as { IntersectionObserver: unknown }).IntersectionObserver =
  jest.fn().mockImplementation(() => ({
    observe: jest.fn(),
    unobserve: jest.fn(),
    disconnect: jest.fn(),
  }));

test(
  integrationTest('Querying Data Product With Native Model Access'),
  async () => {
    const MOCK__editorStore = TEST__provideMockedEditorStore({ pluginManager });
    const renderResult = await TEST__setUpEditorWithDefaultSDLCData(
      MOCK__editorStore,
      { entities: TEST_DATA__DataProduct_NativeModelAccess },
    );
    MockedMonacoEditorInstance.getRawOptions.mockReturnValue({
      readOnly: true,
    });
    await TEST__openElementFromExplorerTree(
      'showcase::northwind::dataProduct::NorthwindDataProduct',
      renderResult,
    );

    const editorGroup = await waitFor(() =>
      renderResult.getByTestId(LEGEND_STUDIO_TEST_ID.EDITOR_GROUP),
    );
    // check that the data product rendered properly
    await findByDisplayValue(
      editorGroup,
      'DataProduct Auto Generated title: Please update',
    );

    const packageExplorer = renderResult.getByTestId(
      LEGEND_STUDIO_TEST_ID.EXPLORER_TREES,
    );
    fireEvent.contextMenu(getByText(packageExplorer, 'NorthwindDataProduct'));

    const explorerContextMenu = renderResult.getByTestId(
      LEGEND_STUDIO_TEST_ID.EXPLORER_CONTEXT_MENU,
    );

    const v1MappingCover =
      V1_MappingModelCoverageAnalysisResult.serialization.fromJson(
        rawMappingCoverageCustomer,
      );
    const mappingCoverage = V1_buildModelCoverageAnalysisResult(
      v1MappingCover,
      MOCK__editorStore.graphManagerState.graphManager as V1_PureGraphManager,
      MOCK__editorStore.graphManagerState.graph.getMapping(
        'showcase::northwind::mapping::CustomerMapping',
      ),
    );
    createSpy(
      MOCK__editorStore.graphManagerState.graphManager,
      'analyzeMappingModelCoverage',
    ).mockResolvedValue(mappingCoverage);
    await act(async () =>
      fireEvent.click(getByText(explorerContextMenu, 'Query...')),
    );

    const dataProductSetup = await waitFor(() =>
      renderResult.getByTestId(QUERY_BUILDER_TEST_ID.QUERY_BUILDER_SETUP),
    );
    // query builder set up
    expect(getByText(dataProductSetup, 'Data Product')).not.toBeNull();
    expect(
      getByText(
        dataProductSetup,
        'DataProduct Auto Generated title: Please update',
      ),
    ).not.toBeNull();
    expect(getByText(dataProductSetup, 'Context')).not.toBeNull();
    expect(getByText(dataProductSetup, 'customer')).not.toBeNull();
    expect(getByText(dataProductSetup, 'Entity')).not.toBeNull();
    expect(
      getByText(dataProductSetup, 'showcase::northwind::model::crm::Customer'),
    ).not.toBeNull();

    let queryExplorer = renderResult.getByTestId(
      QUERY_BUILDER_TEST_ID.QUERY_BUILDER_EXPLORER,
    );
    // mapping analysis has been called and used to render the properties
    expect(getByText(queryExplorer, 'Customer')).not.toBeNull();
    expect(getByText(queryExplorer, 'Company Name')).not.toBeNull();
    expect(getByText(queryExplorer, 'Company Title')).not.toBeNull();
    expect(getByText(queryExplorer, 'Contact Name')).not.toBeNull();
    expect(getByText(queryExplorer, 'Fax Number')).not.toBeNull();
    expect(getByText(queryExplorer, 'Id')).not.toBeNull();
    expect(getByText(queryExplorer, 'Telephone Number')).not.toBeNull();

    // change exec

    fireEvent.mouseDown(getByText(dataProductSetup, 'customer'));

    const categoryCoverage = V1_buildModelCoverageAnalysisResult(
      V1_MappingModelCoverageAnalysisResult.serialization.fromJson(
        rawCategoryMappingCoverageCustomer,
      ),
      MOCK__editorStore.graphManagerState.graphManager as V1_PureGraphManager,
      MOCK__editorStore.graphManagerState.graph.getMapping(
        'showcase::northwind::mapping::CategoryMapping',
      ),
    );
    createSpy(
      MOCK__editorStore.graphManagerState.graphManager,
      'analyzeMappingModelCoverage',
    ).mockResolvedValue(categoryCoverage);
    await act(async () => screen.getByText('category').click());

    queryExplorer = renderResult.getByTestId(
      QUERY_BUILDER_TEST_ID.QUERY_BUILDER_EXPLORER,
    );

    // ProductCategory
    expect(getByText(queryExplorer, 'ProductCategory')).not.toBeNull();
    expect(getByText(queryExplorer, 'Id')).not.toBeNull();
    expect(getByText(queryExplorer, 'Description')).not.toBeNull();
    expect(getByText(queryExplorer, 'Name')).not.toBeNull();
  },
);
