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

import { expect, test } from '@jest/globals';
import { MockedMonacoEditorInstance } from '@finos/legend-lego/code-editor/test';
import { integrationTest } from '@finos/legend-shared/test';
import {
  fireEvent,
  getByDisplayValue,
  getByText,
  waitFor,
} from '@testing-library/react';
import {
  TEST__provideMockedEditorStore,
  TEST__setUpEditorWithDefaultSDLCData,
} from '../../../__test-utils__/EditorComponentTestUtils.js';
import TEST_DATA__SimpleRelationalModel from './TEST_DATA__SimpleRelationalEntities.json' with { type: 'json' };
import { LEGEND_STUDIO_TEST_ID } from '../../../../../__lib__/LegendStudioTesting.js';
import { Core_GraphManagerPreset } from '@finos/legend-graph';
import { LegendStudioPluginManager } from '../../../../../application/LegendStudioPluginManager.js';

const pluginManager = LegendStudioPluginManager.create();
pluginManager.usePresets([new Core_GraphManagerPreset()]).install();

test(integrationTest('Test Function Activator '), async () => {
  const MOCK__editorStore = TEST__provideMockedEditorStore({
    pluginManager,
  });
  const renderResult = await TEST__setUpEditorWithDefaultSDLCData(
    MOCK__editorStore,
    {
      entities: TEST_DATA__SimpleRelationalModel,
    },
  );
  MockedMonacoEditorInstance.getValue.mockReturnValue('');
  MockedMonacoEditorInstance.getRawOptions.mockReturnValue({
    readOnly: true,
  });

  const functionPackageName = 'model';
  const functionName = 'Firm_QueryFunction():TabularDataSet[1]';
  const explorerTree = renderResult.getByTestId(
    LEGEND_STUDIO_TEST_ID.EXPLORER_TREES,
  );
  fireEvent.click(getByText(explorerTree, functionPackageName));
  fireEvent.click(getByText(explorerTree, functionName));

  const functionEditor = renderResult.getByTestId(
    LEGEND_STUDIO_TEST_ID.FUNCTION_EDITOR,
  );
  fireEvent.click(getByText(functionEditor, 'Activate'));
  const functionActivatorModal = await waitFor(() =>
    renderResult.getByRole('dialog'),
  );
  expect(getByText(functionActivatorModal, 'Snowflake UDTF')).toBeDefined();
  fireEvent.click(getByText(functionActivatorModal, 'Snowflake UDTF'));
  expect(getByText(functionActivatorModal, 'Target Path')).toBeDefined();
  fireEvent.click(getByText(functionActivatorModal, 'Activate'));
  fireEvent.click(getByText(explorerTree, 'NewActivator'));
  const editorGroupHeaders = renderResult.getByTestId(
    LEGEND_STUDIO_TEST_ID.EDITOR_GROUP__HEADER_TABS,
  );
  expect(getByText(editorGroupHeaders, 'NewActivator')).toBeDefined();
  const editorGroupContent = await renderResult.findByTestId(
    LEGEND_STUDIO_TEST_ID.EDITOR_GROUP_CONTENT,
  );
  expect(getByText(editorGroupContent, 'snowflake application')).toBeDefined();
  expect(
    getByText(editorGroupContent, 'Snowflake Activator Metadata'),
  ).toBeDefined();
  expect(getByText(editorGroupContent, 'Function')).toBeDefined();
  expect(
    getByDisplayValue(
      editorGroupContent,
      `${functionPackageName}::${functionName}`,
    ),
  ).toBeDefined();
  expect(getByText(editorGroupContent, 'Connection')).toBeDefined();
  expect(getByText(editorGroupContent, `SnowflakeConnection`)).toBeDefined();
  expect(getByText(editorGroupContent, 'Activator Identifer')).toBeDefined();
  expect(getByText(editorGroupContent, `Description`)).toBeDefined();
});
