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
import { integrationTest } from '@finos/legend-shared/test';
import { stub_RawLambda } from '@finos/legend-graph';
import { act, fireEvent, getByText, waitFor } from '@testing-library/react';
import {
  TEST__provideMockedQueryEditorStore,
  TEST__setUpQueryEditor,
} from '../__test-utils__/QueryEditorComponentTestUtils.js';
import {
  TEST_DATA__ResultState_entities,
  TEST_DATA__modelCoverageAnalysisResult,
} from './TEST_DATA__QueryBuilder_ResultStateTest.js';

test(
  integrationTest(
    'Settings modal opens from the menu and displays all settings options',
  ),
  async () => {
    const { renderResult } = await TEST__setUpQueryEditor(
      TEST__provideMockedQueryEditorStore(),
      TEST_DATA__ResultState_entities,
      stub_RawLambda(),
      'execution::RelationalMapping',
      'execution::Runtime',
      TEST_DATA__modelCoverageAnalysisResult,
    );

    // Open the hamburger menu
    const menuButton = renderResult.container.querySelector(
      '.query-editor__logo-header__combo__menu-item',
    ) as HTMLButtonElement;
    expect(menuButton).not.toBeNull();
    fireEvent.click(menuButton);

    // Click on the Settings menu item
    const settingsMenuItem = await waitFor(() =>
      renderResult.getByText('Dev Settings'),
    );
    fireEvent.click(settingsMenuItem);

    // Verify the Settings modal appears
    const settingsDialog = await waitFor(() =>
      renderResult.getByRole('dialog'),
    );
    expect(getByText(settingsDialog, 'Dev Settings')).not.toBeNull();

    // Verify all settings options are present
    expect(getByText(settingsDialog, 'Engine client base URL')).not.toBeNull();
    expect(
      getByText(settingsDialog, 'Engine client request payload compression'),
    ).not.toBeNull();
    expect(
      getByText(
        settingsDialog,
        'Specifies if request payload should be compressed',
      ),
    ).not.toBeNull();
    expect(
      getByText(settingsDialog, 'Engine client request payload debug'),
    ).not.toBeNull();
    expect(
      getByText(
        settingsDialog,
        'Specifies if request payload should be downloaded for debugging purpose',
      ),
    ).not.toBeNull();
    expect(getByText(settingsDialog, 'Enable minimal graph')).not.toBeNull();
    expect(
      getByText(
        settingsDialog,
        'Leverage minimal graph from corresponding mapping to improve performance',
      ),
    ).not.toBeNull();

    // Verify the Close button is present
    expect(getByText(settingsDialog, 'Close')).not.toBeNull();
  },
);

test(
  integrationTest('Settings modal can be closed with the Close button'),
  async () => {
    const { renderResult } = await TEST__setUpQueryEditor(
      TEST__provideMockedQueryEditorStore(),
      TEST_DATA__ResultState_entities,
      stub_RawLambda(),
      'execution::RelationalMapping',
      'execution::Runtime',
      TEST_DATA__modelCoverageAnalysisResult,
    );

    // Open the hamburger menu and click Settings
    const menuButton = renderResult.container.querySelector(
      '.query-editor__logo-header__combo__menu-item',
    ) as HTMLButtonElement;
    fireEvent.click(menuButton);
    const settingsMenuItem = await waitFor(() =>
      renderResult.getByText('Dev Settings'),
    );
    fireEvent.click(settingsMenuItem);

    // Verify the dialog is open
    const settingsDialog = await waitFor(() =>
      renderResult.getByRole('dialog'),
    );
    expect(getByText(settingsDialog, 'Dev Settings')).not.toBeNull();

    // Click Close button
    const closeButton = getByText(settingsDialog, 'Close');
    fireEvent.click(closeButton);

    // Verify the dialog is closed
    await waitFor(() => {
      expect(renderResult.queryByRole('dialog')).toBeNull();
    });
  },
);

test(
  integrationTest(
    'Settings modal toggles can be clicked to change boolean values',
  ),
  async () => {
    const mockedEditorStore = TEST__provideMockedQueryEditorStore();
    const { renderResult } = await TEST__setUpQueryEditor(
      mockedEditorStore,
      TEST_DATA__ResultState_entities,
      stub_RawLambda(),
      'execution::RelationalMapping',
      'execution::Runtime',
      TEST_DATA__modelCoverageAnalysisResult,
    );

    const engineConfig =
      mockedEditorStore.graphManagerState.graphManager.TEMPORARY__getEngineConfig();

    // Open Settings modal
    const menuButton = renderResult.container.querySelector(
      '.query-editor__logo-header__combo__menu-item',
    ) as HTMLButtonElement;
    fireEvent.click(menuButton);
    const settingsMenuItem = await waitFor(() =>
      renderResult.getByText('Dev Settings'),
    );
    fireEvent.click(settingsMenuItem);

    const settingsDialog = await waitFor(() =>
      renderResult.getByRole('dialog'),
    );

    // Toggle Engine client request payload compression
    const initialCompressionValue =
      engineConfig.useClientRequestPayloadCompression;
    const compressionToggle = getByText(
      settingsDialog,
      'Specifies if request payload should be compressed',
    );
    await act(async () => {
      fireEvent.click(compressionToggle);
    });
    expect(engineConfig.useClientRequestPayloadCompression).toBe(
      !initialCompressionValue,
    );

    // Toggle Engine client request payload debug
    const initialDebuggingValue = engineConfig.enableDebuggingPayload;
    const debugToggle = getByText(
      settingsDialog,
      'Specifies if request payload should be downloaded for debugging purpose',
    );
    await act(async () => {
      fireEvent.click(debugToggle);
    });
    expect(engineConfig.enableDebuggingPayload).toBe(!initialDebuggingValue);

    // Toggle Enable minimal graph
    const initialMinimalGraphValue =
      mockedEditorStore.enableMinialGraphForDataSpaceLoadingPerformance;
    const minimalGraphToggle = getByText(
      settingsDialog,
      'Leverage minimal graph from corresponding mapping to improve performance',
    );
    await act(async () => {
      fireEvent.click(minimalGraphToggle);
    });
    expect(
      mockedEditorStore.enableMinialGraphForDataSpaceLoadingPerformance,
    ).toBe(!initialMinimalGraphValue);
  },
);
