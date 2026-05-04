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
  fireEvent,
  getAllByText,
  getByText,
  getByTitle,
  waitFor,
} from '@testing-library/react';
import { integrationTest } from '@finos/legend-shared/test';
import {
  TEST__openElementFromExplorerTree,
  TEST__provideMockedEditorStore,
  TEST__setUpEditorWithDefaultSDLCData,
} from '../../../__test-utils__/EditorComponentTestUtils.js';
import { LEGEND_STUDIO_TEST_ID } from '../../../../../__lib__/LegendStudioTesting.js';
import TEST_DATA__SimpleRelationalEntities from '../../function-activator/__tests__/TEST_DATA__SimpleRelationalEntities.json' with { type: 'json' };
import {
  DATABASE_EDITOR_TAB,
  DatabaseEditorState,
} from '../../../../../stores/editor/editor-state/element-editor-state/DatabaseEditorState.js';
import { MockedMonacoEditorInstance } from '@finos/legend-lego/code-editor/test';

// React Flow measures the canvas with ResizeObserver and IntersectionObserver.
// ResizeObserver is already polyfilled by the shared DOM setup; mirror the
// IntersectionObserver mock used by other component tests
// (see DataProductEditor.test.tsx) so the canvas can mount.
(global as unknown as { IntersectionObserver: unknown }).IntersectionObserver =
  jest.fn().mockImplementation(() => ({
    observe: jest.fn(),
    unobserve: jest.fn(),
    disconnect: jest.fn(),
  }));

test(
  integrationTest('Database editor renders with VIEW tab active'),
  async () => {
    MockedMonacoEditorInstance.getValue.mockReturnValue('');
    MockedMonacoEditorInstance.getRawOptions.mockReturnValue({
      readOnly: true,
    });
    const MOCK__editorStore = TEST__provideMockedEditorStore();
    const renderResult = await TEST__setUpEditorWithDefaultSDLCData(
      MOCK__editorStore,
      { entities: TEST_DATA__SimpleRelationalEntities },
    );

    await TEST__openElementFromExplorerTree('store::TestDB', renderResult);

    const editorGroup = await waitFor(() =>
      renderResult.getByTestId(LEGEND_STUDIO_TEST_ID.EDITOR_GROUP),
    );

    // Both tab buttons render — `prettyCONSTName` formats them as "View" / "Grammar".
    await waitFor(() => getByText(editorGroup, 'View'));
    await waitFor(() => getByText(editorGroup, 'Grammar'));

    // Read-only badge is always visible.
    await waitFor(() => getByText(editorGroup, 'READ ONLY'));
    await waitFor(() => getByTitle(editorGroup, 'This editor is read-only'));

    // Schema tree contents (VIEW tab is active by default) — schemas default
    // to expanded so table names render immediately. Schema and table names
    // also appear in the ERD canvas nodes, so we use `getAllByText` and just
    // assert at least one occurrence.
    await waitFor(() =>
      expect(getAllByText(editorGroup, 'default').length).toBeGreaterThan(0),
    );
    await waitFor(() =>
      expect(getAllByText(editorGroup, 'PersonTable').length).toBeGreaterThan(
        0,
      ),
    );
    await waitFor(() =>
      expect(getAllByText(editorGroup, 'FirmTable').length).toBeGreaterThan(0),
    );

    // The editor state's selectedTab confirms the default.
    const editorState =
      MOCK__editorStore.tabManagerState.getCurrentEditorState(
        DatabaseEditorState,
      );
    expect(editorState.selectedTab).toBe(DATABASE_EDITOR_TAB.VIEW);
  },
);

test(
  integrationTest('Database editor switches to Grammar tab on click'),
  async () => {
    MockedMonacoEditorInstance.getValue.mockReturnValue('');
    MockedMonacoEditorInstance.getRawOptions.mockReturnValue({
      readOnly: true,
    });
    const MOCK__editorStore = TEST__provideMockedEditorStore();
    const renderResult = await TEST__setUpEditorWithDefaultSDLCData(
      MOCK__editorStore,
      { entities: TEST_DATA__SimpleRelationalEntities },
    );
    await TEST__openElementFromExplorerTree('store::TestDB', renderResult);

    const editorGroup = await waitFor(() =>
      renderResult.getByTestId(LEGEND_STUDIO_TEST_ID.EDITOR_GROUP),
    );

    // Click the Grammar tab.
    fireEvent.click(await waitFor(() => getByText(editorGroup, 'Grammar')));

    const editorState =
      MOCK__editorStore.tabManagerState.getCurrentEditorState(
        DatabaseEditorState,
      );
    await waitFor(() =>
      expect(editorState.selectedTab).toBe(DATABASE_EDITOR_TAB.GRAMMAR),
    );

    // Click back to the View tab.
    fireEvent.click(getByText(editorGroup, 'View'));
    await waitFor(() =>
      expect(editorState.selectedTab).toBe(DATABASE_EDITOR_TAB.VIEW),
    );
  },
);
