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

import { test, expect } from '@jest/globals';
import {
  type RenderResult,
  act,
  fireEvent,
  getAllByText,
  getAllByTitle,
  getByDisplayValue,
  getByRole,
  getByText,
  getByTitle,
  queryByText,
  waitFor,
  within,
} from '@testing-library/react';
import { guaranteeNonNullable, guaranteeType } from '@finos/legend-shared';
import { createSpy, integrationTest } from '@finos/legend-shared/test';
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
  DataSpace,
  DataSpaceAnalysisResult,
  DataSpaceMappingProvider,
  DataSpaceSupportCombinedInfo,
  DSL_DataSpace_GraphManagerPreset,
  DSL_DataSpace_getGraphManagerExtension,
} from '@finos/legend-extension-dsl-data-space/graph';
import { flowResult, runInAction } from 'mobx';
import { DSL_Diagram_GraphManagerPreset } from '@finos/legend-extension-dsl-diagram';
import { DSL_DataSpace_LegendStudioApplicationPlugin } from '../DSL_DataSpace_LegendStudioApplicationPlugin.js';
import { DataSpacePreviewState } from '../../stores/DataSpacePreviewState.js';
import { TEST_DATA__DataSpaceEditor } from './TEST_DATA__DataSpaceEditor.js';

const pluginManager = LegendStudioPluginManager.create();
pluginManager
  .usePresets([
    new DSL_Diagram_GraphManagerPreset(),
    new DSL_DataSpace_GraphManagerPreset(),
  ])
  .usePlugins([new DSL_DataSpace_LegendStudioApplicationPlugin()])
  .install();

const setUpDataSpaceEditor = async (
  isReadOnly = false,
): Promise<{
  editorStore: EditorStore;
  renderResult: RenderResult;
  editor: HTMLElement;
  dataSpace: DataSpace;
}> => {
  const editorStore = TEST__provideMockedEditorStore({ pluginManager });
  // the related data spaces picker loads every released data space from Depot
  createSpy(
    editorStore.depotServerClient,
    'getEntitiesSummaryByClassifier',
  ).mockResolvedValue([]);
  const renderResult = await TEST__setUpEditorWithDefaultSDLCData(
    editorStore,
    { entities: TEST_DATA__DataSpaceEditor },
    isReadOnly,
  );
  await TEST__openElementFromExplorerTree('model::dataSpace', renderResult);
  const editor = await waitFor(() =>
    guaranteeNonNullable(
      renderResult.container.querySelector<HTMLElement>('.dataSpace-editor'),
    ),
  );
  const dataSpace = guaranteeType(
    editorStore.graphManagerState.graph.getElement('model::dataSpace'),
    DataSpace,
  );
  return { editorStore, renderResult, editor, dataSpace };
};

const getRow = (editor: HTMLElement, text: string): HTMLElement =>
  guaranteeNonNullable(
    getByText(editor, text).closest<HTMLElement>(
      '.dataSpace-editor-table__row',
    ),
  );

test(
  integrationTest(
    'Data space editor shows a header with counts and the Home tab in sections',
  ),
  async () => {
    const { editor } = await setUpDataSpaceEditor();

    // header and sidebar
    getByText(editor, 'Untitled');
    getByText(editor, 'Data space · model::dataSpace');
    expect(getByTitle(editor, 'Execution Contexts').textContent).toContain('1');
    expect(getByTitle(editor, 'Executables').textContent).toContain('2');

    // sections
    ['About', 'Diagrams', 'Elements', 'Support'].forEach((title) =>
      getByText(editor, title),
    );

    // diagrams: one row each, with their title and description
    expect(getAllByText(editor, 'DummyDiagram')).toHaveLength(2);
    getByDisplayValue(editor, 'Diag 1');
    getByDisplayValue(editor, 'some information about the diagram');

    // elements: with their type; excluded ones are marked
    within(getRow(editor, 'DummyDomain')).getByText('Class');
    within(getRow(editor, 'target')).getByText('Package');
    expect(
      editor.querySelectorAll('.dataSpace-editor-table__row--excluded'),
    ).toHaveLength(2);

    // support: contacts, and every link, including the support URL
    getByText(editor, 'someEmail@test.org');
    getByText(editor, 'someEmail2@test.org');
    getByDisplayValue(editor, 'https://example.org/faq');
    getByDisplayValue(editor, 'https://example.org/support');
  },
);

test(
  integrationTest(
    'Data space elements can be excluded, and diagrams and elements removed',
  ),
  async () => {
    const { editor, dataSpace } = await setUpDataSpaceEditor();
    const domain = guaranteeNonNullable(
      dataSpace.elements?.find(
        (pointer) => pointer.element.value.path === 'domain::DummyDomain',
      ),
    );

    fireEvent.click(
      within(getRow(editor, 'DummyDomain')).getByText('Excluded'),
    );
    expect(domain.exclude).toBe(true);
    await waitFor(() =>
      expect(
        editor.querySelectorAll('.dataSpace-editor-table__row--excluded'),
      ).toHaveLength(3),
    );

    fireEvent.click(
      guaranteeNonNullable(
        getAllByTitle(editor, 'Remove this diagram from the data space')[0],
      ),
    );
    expect(dataSpace.diagrams).toHaveLength(1);
    await waitFor(() =>
      expect(getAllByText(editor, 'DummyDiagram')).toHaveLength(1),
    );

    fireEvent.click(
      within(getRow(editor, 'DummyDomain')).getByTitle(
        'Remove this element from the list',
      ),
    );
    expect(dataSpace.elements).toHaveLength(3);
    await waitFor(() => expect(queryByText(editor, 'DummyDomain')).toBeNull());
  },
);

test(
  integrationTest(
    'Data space support: the support URL can be edited, and support can be cleared',
  ),
  async () => {
    const { editor, dataSpace } = await setUpDataSpaceEditor();
    const supportInfo = guaranteeType(
      dataSpace.supportInfo,
      DataSpaceSupportCombinedInfo,
    );

    fireEvent.change(getByDisplayValue(editor, 'https://example.org/support'), {
      target: { value: 'https://example.org/help' },
    });
    expect(supportInfo.supportUrl).toBe('https://example.org/help');

    fireEvent.click(getByRole(editor, 'button', { name: 'None' }));
    expect(dataSpace.supportInfo).toBeUndefined();
    await waitFor(() => getByText(editor, /No support information/));
  },
);

test(
  integrationTest(
    'Data space execution context: the default context is a toggle',
  ),
  async () => {
    const { editor, dataSpace } = await setUpDataSpaceEditor();
    fireEvent.click(getByTitle(editor, 'Execution Contexts'));

    const toggle = await waitFor(() =>
      getByRole(editor, 'button', { name: 'Default context' }),
    );
    expect(toggle.getAttribute('aria-pressed')).toBe('true');

    fireEvent.click(toggle);
    expect(dataSpace.defaultExecutionContext).toBeUndefined();
    await waitFor(() => getByRole(editor, 'button', { name: 'Make default' }));
  },
);

test(
  integrationTest('Data space executable tabs say what each executable is'),
  async () => {
    const { editor } = await setUpDataSpaceEditor();
    fireEvent.click(getByTitle(editor, 'Executables'));

    const service = await waitFor(() => getByText(editor, 'Exec 1'));
    expect(service.parentElement?.textContent).toContain('Service');
    expect(
      getByText(editor, 'this is template').parentElement?.textContent,
    ).toContain('Query');
  },
);

test(
  integrationTest('Data space statuses set on the Info tab show in the header'),
  async () => {
    const { editor } = await setUpDataSpaceEditor();
    const header = guaranteeNonNullable(
      editor.querySelector<HTMLElement>('.dataSpace-editor-header'),
    );
    expect(queryByText(header, 'Verified')).toBeNull();
    fireEvent.click(getByTitle(editor, 'Info'));

    fireEvent.click(
      await waitFor(() => getByRole(editor, 'checkbox', { name: /^Verified/ })),
    );
    await waitFor(() => getByText(header, 'Verified'));

    fireEvent.change(getByRole(editor, 'textbox', { name: 'Notice' }), {
      target: { value: 'Use model::NewDataSpace instead.' },
    });
    await waitFor(() => getByText(header, 'Deprecated'));
    getByText(
      guaranteeNonNullable(
        editor.querySelector<HTMLElement>('.dataSpace-editor-notice-preview'),
      ),
      'Use model::NewDataSpace instead.',
    );
  },
);

test(
  integrationTest('A read-only data space disables its controls'),
  async () => {
    const { editor } = await setUpDataSpaceEditor(true);

    getByText(editor, 'Read-only');
    expect(
      getByRole(editor, 'button', { name: 'Add diagram' }).hasAttribute(
        'disabled',
      ),
    ).toBe(true);
    expect(
      within(getRow(editor, 'DummyDomain'))
        .getByText('Excluded')
        .hasAttribute('disabled'),
    ).toBe(true);

    fireEvent.click(getByTitle(editor, 'Info'));
    await waitFor(() =>
      expect(
        getByRole(editor, 'checkbox', { name: /^Verified/ }).hasAttribute(
          'disabled',
        ),
      ).toBe(true),
    );
  },
);

test(
  integrationTest(
    'Data space execution context: switching from a mapping to a mapping provider asks first',
  ),
  async () => {
    const { renderResult, editor, dataSpace } = await setUpDataSpaceEditor();
    const context = guaranteeNonNullable(dataSpace.executionContexts?.[0]);
    fireEvent.click(getByTitle(editor, 'Execution Contexts'));
    const mappingTab = await waitFor(() =>
      getByRole(editor, 'button', { name: 'Mapping' }),
    );
    const mappingProviderTab = getByRole(editor, 'button', {
      name: 'Mapping Provider',
    });
    const ACTIVE_TAB_CLASS = 'dataSpace-editor__tab-toggle__tab--active';
    expect(mappingTab.classList).toContain(ACTIVE_TAB_CLASS);

    // cancelling keeps the mapping
    fireEvent.click(mappingProviderTab);
    await waitFor(() =>
      renderResult.getByText('Switch to a mapping provider?'),
    );
    renderResult.getByText(
      `An execution context takes either a mapping or a mapping provider. This removes mapping 'model::DummyMapping' from 'Context 1'.`,
    );
    fireEvent.click(renderResult.getByRole('button', { name: 'Cancel' }));
    await waitFor(() =>
      expect(
        renderResult.queryByText('Switch to a mapping provider?'),
      ).toBeNull(),
    );
    expect(context.mapping?.value.path).toBe('model::DummyMapping');
    expect(mappingTab.classList).toContain(ACTIVE_TAB_CLASS);

    // confirming drops the mapping and shows the mapping provider picker
    fireEvent.click(mappingProviderTab);
    fireEvent.click(
      await waitFor(() =>
        renderResult.getByRole('button', { name: 'Remove mapping' }),
      ),
    );
    await waitFor(() => getByText(editor, 'Select a mapping provider...'));
    expect(context.mapping).toBeUndefined();
    expect(mappingProviderTab.classList).toContain(ACTIVE_TAB_CLASS);

    // with nothing to drop, switching back asks nothing
    fireEvent.click(mappingTab);
    await waitFor(() => getByText(editor, 'Select a mapping...'));
    expect(renderResult.queryByText('Switch to a mapping?')).toBeNull();
    expect(mappingTab.classList).toContain(ACTIVE_TAB_CLASS);
  },
);

test(
  integrationTest(
    'Data space execution context: a context with both a mapping and a mapping provider keeps the one clicked',
  ),
  async () => {
    const { renderResult, editor, dataSpace } = await setUpDataSpaceEditor();
    const context = guaranteeNonNullable(dataSpace.executionContexts?.[0]);
    fireEvent.click(getByTitle(editor, 'Execution Contexts'));
    await waitFor(() => getByRole(editor, 'button', { name: 'Mapping' }));

    // grammar can set both, which the modifiers never do
    const provider = new DataSpaceMappingProvider();
    provider.element = PackageableElementExplicitReference.create(
      new DataProduct('DummyDataProduct'),
    );
    provider.keys = ['group'];
    act(() =>
      runInAction(() => {
        context.mappingProvider = provider;
      }),
    );
    await waitFor(() =>
      getByText(editor, 'Only one of mapping and mapping provider can be set.'),
    );

    fireEvent.click(getByRole(editor, 'button', { name: 'Mapping' }));
    fireEvent.click(
      await waitFor(() =>
        renderResult.getByRole('button', { name: 'Remove mapping provider' }),
      ),
    );
    await waitFor(() =>
      expect(
        queryByText(
          editor,
          'Only one of mapping and mapping provider can be set.',
        ),
      ).toBeNull(),
    );
    expect(context.mappingProvider).toBeUndefined();
    expect(context.mapping?.value.path).toBe('model::DummyMapping');
  },
);

test(
  integrationTest(
    "Previewing a data space views the editor's own graph, reporting progress",
  ),
  async () => {
    const { editorStore, dataSpace } = await setUpDataSpaceEditor();
    const analysis = new DataSpaceAnalysisResult();
    analysis.executionContextsIndex = new Map();
    const analyze = createSpy(
      DSL_DataSpace_getGraphManagerExtension(
        editorStore.graphManagerState.graphManager,
      ),
      'analyzeDataSpace',
    ).mockResolvedValue(analysis);
    const preview = DataSpacePreviewState.retrieveState(editorStore);

    await act(async () => {
      await flowResult(preview.previewDataSpace(dataSpace));
    });

    const [path, entities, , progress] = guaranteeNonNullable(
      analyze.mock.calls[0],
    );
    expect(path).toBe('model::dataSpace');
    expect((await entities()).map((entity) => entity.path)).toContain(
      'model::dataSpace',
    );
    expect(progress).toBe(preview.loadDataSpaceState);
    expect(preview.loadDataSpaceState.hasSucceeded).toBe(true);
    expect(preview.dataSpaceViewerState?.versionId).toBe('LOCAL');
    expect(preview.dataSpaceViewerState?.retrieveGraphData()).toBeDefined();
  },
);
