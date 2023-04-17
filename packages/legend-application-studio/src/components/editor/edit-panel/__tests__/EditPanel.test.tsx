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

import { test, expect, beforeEach } from '@jest/globals';
import {
  type RenderResult,
  waitFor,
  fireEvent,
  getByText,
  getByTestId,
  queryByText,
  getByTitle,
} from '@testing-library/react';
import TEST_DATA__m2mGraphEntities from '../../../../stores/editor/__tests__/TEST_DATA__M2MGraphEntities.json';
import { integrationTest } from '@finos/legend-shared';
import {
  TEST__openElementFromExplorerTree,
  TEST__provideMockedEditorStore,
  TEST__setUpEditorWithDefaultSDLCData,
} from '../../__test-utils__/EditorComponentTestUtils.js';
import { LEGEND_STUDIO_TEST_ID } from '../../../../application/LegendStudioTesting.js';

let renderResult: RenderResult;

beforeEach(async () => {
  const MOCK__editorStore = TEST__provideMockedEditorStore();
  renderResult = await TEST__setUpEditorWithDefaultSDLCData(MOCK__editorStore, {
    entities: TEST_DATA__m2mGraphEntities,
  });
});

test(integrationTest('Test navigation between element states'), async () => {
  // Test opening multiple elements
  await TEST__openElementFromExplorerTree('ui::test1::Animal', renderResult);
  const packageExplorer = renderResult.getByTestId(
    LEGEND_STUDIO_TEST_ID.EXPLORER_TREES,
  );
  fireEvent.click(getByText(packageExplorer, 'TestClass'));
  fireEvent.click(getByText(packageExplorer, 'TestEnumeration'));
  fireEvent.click(getByText(packageExplorer, 'Anyone'));
  fireEvent.click(getByText(packageExplorer, 'Dog'));
  fireEvent.click(getByText(packageExplorer, 'Something'));
  fireEvent.click(getByText(packageExplorer, 'ProfileTest'));
  const editPanelHeader = renderResult.getByTestId(
    LEGEND_STUDIO_TEST_ID.EDIT_PANEL__HEADER_TABS,
  );
  await waitFor(() => getByText(editPanelHeader, 'ProfileTest'));

  const openElements = [
    'TestEnumeration',
    'TestClass',
    'Anyone',
    'Dog',
    'Something',
    'ProfileTest',
  ];
  openElements.forEach((openEl) => getByText(editPanelHeader, openEl));

  // navigate through visit buttons
  fireEvent.click(getByText(editPanelHeader, 'TestClass'));
  await waitFor(() => renderResult.getByText('founder'));
  const navigateToClass = async (className: string): Promise<void> => {
    const classForm = renderResult.getByTestId(
      LEGEND_STUDIO_TEST_ID.CLASS_FORM_EDITOR,
    );
    const property = await waitFor(() => getByText(classForm, className));
    const propertyBasicEditor = property.parentElement as HTMLElement;
    const navigateButton = getByTestId(
      propertyBasicEditor,
      LEGEND_STUDIO_TEST_ID.TYPE_VISIT,
    );
    fireEvent.click(navigateButton);
    await waitFor(() => getByText(editPanelHeader, className));
  };

  await navigateToClass('Person');
  await navigateToClass('Firm');
  await navigateToClass('Person');
  await navigateToClass('Degree');
  const newOpened = ['Firm', 'Degree', 'Person'];
  openElements
    .concat(newOpened)
    .forEach((openElement) => getByText(editPanelHeader, openElement));

  // test closing of tabs
  const closeTabs = ['Firm', 'Degree', 'TestEnumeration'];
  closeTabs.forEach((tab) => {
    const text = getByText(editPanelHeader, tab);
    const parent = text.parentElement as HTMLElement;
    const deleteButton = getByTitle(parent, 'Close');
    fireEvent.click(deleteButton);
  });
  closeTabs.forEach((tab) =>
    expect(queryByText(editPanelHeader, tab)).toBeNull(),
  );
  // TODO Add Diff Element States
});
