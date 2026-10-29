/**
 * Copyright (c) 2026-present, Goldman Sachs
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
  type RenderResult,
  act,
  fireEvent,
  getByText,
  queryByText,
  screen,
  waitFor,
} from '@testing-library/react';
import { createSpy, integrationTest } from '@finos/legend-shared/test';
import { guaranteeType } from '@finos/legend-shared';
import {
  type EditorStore,
  LegendStudioPluginManager,
} from '@finos/legend-application-studio';
import {
  TEST__provideMockedEditorStore,
  TEST__setUpEditorWithDefaultSDLCData,
  TEST__openElementFromExplorerTree,
} from '@finos/legend-application-studio/test';
import {
  DataProduct,
  PackageableElementExplicitReference,
} from '@finos/legend-graph';
import {
  DSL_DataSpace_GraphManagerPreset,
  DataSpace,
  DataSpaceMappingProvider,
  DataSpaceSupportCombinedInfo,
} from '@finos/legend-extension-dsl-data-space/graph';
import { runInAction } from 'mobx';
import { DSL_DataSpace_LegendStudioApplicationPlugin } from '../DSL_DataSpace_LegendStudioApplicationPlugin.js';

const TEST_DATA__dataSpaceEntities = [
  {
    path: 'model::Person',
    content: {
      _type: 'class',
      name: 'Person',
      package: 'model',
      properties: [],
    },
    classifierPath: 'meta::pure::metamodel::type::Class',
  },
  {
    path: 'model::PersonMapping',
    content: {
      _type: 'mapping',
      name: 'PersonMapping',
      package: 'model',
      classMappings: [],
      enumerationMappings: [],
      includedMappings: [],
      tests: [],
    },
    classifierPath: 'meta::pure::mapping::Mapping',
  },
  {
    path: 'model::PersonDataSpace',
    content: {
      _type: 'dataSpace',
      name: 'PersonDataSpace',
      package: 'model',
      executionContexts: [
        {
          name: 'Context 1',
          mapping: {
            path: 'model::PersonMapping',
            type: 'MAPPING',
          },
        },
      ],
      defaultExecutionContext: 'Context 1',
      supportInfo: {
        _type: 'combined',
        documentationUrl: 'https://example.org/docs',
        emails: ['support@example.org'],
      },
    },
    classifierPath: 'meta::pure::metadata::DataSpace',
  },
];

const pluginManager = LegendStudioPluginManager.create();
pluginManager
  .usePresets([new DSL_DataSpace_GraphManagerPreset()])
  .usePlugins([new DSL_DataSpace_LegendStudioApplicationPlugin()])
  .install();

jest.mock('react-oidc-context', () => {
  const { MOCK__reactOIDCContext } = jest.requireActual<{
    MOCK__reactOIDCContext: unknown;
  }>('@finos/legend-shared/test');
  return MOCK__reactOIDCContext;
});

const setUpDataSpaceEditor = async (): Promise<{
  renderResult: RenderResult;
  editorStore: EditorStore;
  dataSpace: DataSpace;
}> => {
  const MOCK__editorStore = TEST__provideMockedEditorStore({ pluginManager });
  // the editor looks up related data spaces in Depot when it opens
  createSpy(
    MOCK__editorStore.depotServerClient,
    'getEntitiesSummaryByClassifier',
  ).mockResolvedValue([]);
  const renderResult = await TEST__setUpEditorWithDefaultSDLCData(
    MOCK__editorStore,
    { entities: TEST_DATA__dataSpaceEntities },
  );
  await TEST__openElementFromExplorerTree(
    'model::PersonDataSpace',
    renderResult,
  );
  await waitFor(() => renderResult.getByText('Support Information'));
  const dataSpace = guaranteeType(
    MOCK__editorStore.graphManagerState.graph.getElement(
      'model::PersonDataSpace',
    ),
    DataSpace,
  );
  return { renderResult, editorStore: MOCK__editorStore, dataSpace };
};

const getSupportSection = (renderResult: RenderResult): HTMLElement =>
  renderResult.getByText('Support Information').parentElement as HTMLElement;

const selectSupportInfoType = (
  supportSection: HTMLElement,
  optionText: string,
): void => {
  const selectorInput = supportSection.querySelector(
    'input[role="combobox"]',
  ) as HTMLElement;
  fireEvent.keyDown(selectorInput, { key: 'ArrowDown' });
  fireEvent.click(screen.getByRole('option', { name: optionText }));
};

test(
  integrationTest('Data space editor edits the support URL of support info'),
  async () => {
    const { renderResult, dataSpace } = await setUpDataSpaceEditor();
    const supportSection = getSupportSection(renderResult);

    const supportUrlInput = renderResult.getByPlaceholderText(
      'Enter support URL',
    ) as HTMLInputElement;
    fireEvent.change(supportUrlInput, {
      target: { value: 'https://example.org/support' },
    });
    expect(
      guaranteeType(dataSpace.supportInfo, DataSpaceSupportCombinedInfo)
        .supportUrl,
    ).toBe('https://example.org/support');
    expect(supportUrlInput.value).toBe('https://example.org/support');
    expect(getByText(supportSection, 'Support URL')).not.toBeNull();
  },
);

test(
  integrationTest(
    'Data space editor clears combined support info by choosing None',
  ),
  async () => {
    const { renderResult, dataSpace } = await setUpDataSpaceEditor();
    const supportSection = getSupportSection(renderResult);

    // choosing Combined again keeps what is there
    selectSupportInfoType(supportSection, 'Combined');
    expect(
      guaranteeType(dataSpace.supportInfo, DataSpaceSupportCombinedInfo).emails,
    ).toEqual(['support@example.org']);

    selectSupportInfoType(supportSection, 'None');
    await waitFor(() =>
      expect(queryByText(supportSection, 'Support URL')).toBeNull(),
    );
    expect(dataSpace.supportInfo).toBeUndefined();

    // the selector stays, so support info can be added back
    selectSupportInfoType(supportSection, 'Combined');
    await waitFor(() => getByText(supportSection, 'Support URL'));
    expect(dataSpace.supportInfo).toBeInstanceOf(DataSpaceSupportCombinedInfo);
  },
);

test(
  integrationTest(
    'Data space editor switches an execution context from a mapping to a mapping provider',
  ),
  async () => {
    const { renderResult, dataSpace } = await setUpDataSpaceEditor();
    const context = dataSpace.executionContexts?.[0];
    fireEvent.click(renderResult.getByTitle('Execution Contexts'));
    const mappingTab = await waitFor(() =>
      renderResult.getByRole('button', { name: 'Mapping' }),
    );
    const mappingProviderTab = renderResult.getByRole('button', {
      name: 'Mapping Provider',
    });
    const ACTIVE_TAB_CLASS = 'dataSpace-editor__tab-toggle__tab--active';
    expect(mappingTab.classList).toContain(ACTIVE_TAB_CLASS);

    // cancelling keeps the mapping
    fireEvent.click(mappingProviderTab);
    await waitFor(() =>
      renderResult.getByText('Switch to a mapping provider?'),
    );
    expect(
      renderResult.getByText(
        `An execution context takes either a mapping or a mapping provider. This removes mapping 'model::PersonMapping' from 'Context 1'.`,
      ),
    ).not.toBeNull();
    fireEvent.click(renderResult.getByRole('button', { name: 'Cancel' }));
    await waitFor(() =>
      expect(
        renderResult.queryByText('Switch to a mapping provider?'),
      ).toBeNull(),
    );
    expect(context?.mapping?.value.path).toBe('model::PersonMapping');
    expect(mappingTab.classList).toContain(ACTIVE_TAB_CLASS);

    // confirming drops the mapping and shows the mapping provider picker
    fireEvent.click(mappingProviderTab);
    fireEvent.click(
      await waitFor(() =>
        renderResult.getByRole('button', { name: 'Remove mapping' }),
      ),
    );
    await waitFor(() => renderResult.getByText('Select a mapping provider...'));
    expect(context?.mapping).toBeUndefined();
    expect(mappingProviderTab.classList).toContain(ACTIVE_TAB_CLASS);

    // with nothing to drop, switching back asks nothing
    fireEvent.click(mappingTab);
    await waitFor(() => renderResult.getByText('Select a mapping...'));
    expect(renderResult.queryByText('Switch to a mapping?')).toBeNull();
    expect(mappingTab.classList).toContain(ACTIVE_TAB_CLASS);
  },
);

test(
  integrationTest(
    'Data space editor resolves an execution context that has both a mapping and a mapping provider',
  ),
  async () => {
    const { renderResult, dataSpace } = await setUpDataSpaceEditor();
    const context = dataSpace.executionContexts?.[0];
    fireEvent.click(renderResult.getByTitle('Execution Contexts'));
    await waitFor(() => renderResult.getByRole('button', { name: 'Mapping' }));

    // grammar can set both, which the modifiers never do
    const provider = new DataSpaceMappingProvider();
    provider.element = PackageableElementExplicitReference.create(
      new DataProduct('PersonDataProduct'),
    );
    provider.keys = ['group'];
    act(() =>
      runInAction(() => {
        if (context) {
          context.mappingProvider = provider;
        }
      }),
    );
    await waitFor(() =>
      renderResult.getByText(
        'Only one of mapping and mapping provider can be set.',
      ),
    );

    fireEvent.click(renderResult.getByRole('button', { name: 'Mapping' }));
    fireEvent.click(
      await waitFor(() =>
        renderResult.getByRole('button', { name: 'Remove mapping provider' }),
      ),
    );
    await waitFor(() =>
      expect(
        renderResult.queryByText(
          'Only one of mapping and mapping provider can be set.',
        ),
      ).toBeNull(),
    );
    expect(context?.mappingProvider).toBeUndefined();
    expect(context?.mapping?.value.path).toBe('model::PersonMapping');
  },
);
