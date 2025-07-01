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
  findByText,
  findByDisplayValue,
} from '@testing-library/react';
import { integrationTest } from '@finos/legend-shared/test';
import {
  TEST__openElementFromExplorerTree,
  TEST__provideMockedEditorStore,
  TEST__setUpEditorWithDefaultSDLCData,
} from '../../../__test-utils__/EditorComponentTestUtils.js';
import TEST_DATA__LHDataProduct from './TEST_DATA__LHDataProduct.json' with { type: 'json' };
import { LEGEND_STUDIO_TEST_ID } from '../../../../../__lib__/LegendStudioTesting.js';
import { Core_GraphManagerPreset } from '@finos/legend-graph';
import { QueryBuilder_GraphManagerPreset } from '@finos/legend-query-builder';
import { LegendStudioPluginManager } from '../../../../../application/LegendStudioPluginManager.js';
import { MockedMonacoEditorInstance } from '@finos/legend-lego/code-editor/test';
import { guaranteeNonNullable } from '@finos/legend-shared';
import {
  findByPlaceholderText,
  findByTitle,
  screen,
  within,
} from '@testing-library/dom';
import {
  AP_EMPTY_DESC_WARNING,
  AP_GROUP_MODAL_ERRORS,
} from '../DataPoductEditor.js';

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

test(integrationTest('Editing access point groups'), async () => {
  const MOCK__editorStore = TEST__provideMockedEditorStore({ pluginManager });
  const renderResult = await TEST__setUpEditorWithDefaultSDLCData(
    MOCK__editorStore,
    { entities: TEST_DATA__LHDataProduct },
  );
  MockedMonacoEditorInstance.getRawOptions.mockReturnValue({
    readOnly: true,
  });
  await TEST__openElementFromExplorerTree(
    'model::sampleDataProduct',
    renderResult,
  );

  const editorGroup = await waitFor(() =>
    renderResult.getByTestId(LEGEND_STUDIO_TEST_ID.EDITOR_GROUP),
  );

  // check that the data product rendered properly
  await findByDisplayValue(editorGroup, 'My Data Product');
  await findByDisplayValue(editorGroup, 'sample for testing');
  const group1Title = await findByText(editorGroup, 'group1');
  const group1Desc = await findByText(
    editorGroup,
    'my first access point group',
  );
  await findByText(editorGroup, 'ap1');
  await findByText(editorGroup, 'group2');
  await findByText(editorGroup, 'access point group 2');
  await findByText(editorGroup, 'ap2');
  // TODO: test access point descriptions rendered properly after grammar changes have been added

  //edit group title
  fireEvent.mouseEnter(group1Title);
  await renderResult.findByTestId(LEGEND_STUDIO_TEST_ID.HOVER_EDIT_ICON);
  fireEvent.click(group1Title);
  const textbox = await findByDisplayValue(editorGroup, 'group1');
  fireEvent.click(textbox);
  fireEvent.change(textbox, { target: { value: 'New Group Name' } });
  fireEvent.click(await findByText(editorGroup, 'access point groups'));
  await findByText(editorGroup, 'New Group Name');
  //title cannot be undefined
  fireEvent.change(textbox, { target: { value: '' } });
  fireEvent.click(await findByText(editorGroup, 'access point groups'));
  await findByText(editorGroup, 'New Group Name');

  // edit group description
  fireEvent.mouseEnter(group1Desc);
  await renderResult.findByTestId(LEGEND_STUDIO_TEST_ID.HOVER_EDIT_ICON);
  fireEvent.click(group1Desc);
  const descriptionTextbox = await findByDisplayValue(
    editorGroup,
    'my first access point group',
  );
  fireEvent.click(descriptionTextbox);
  fireEvent.change(descriptionTextbox, {
    target: { value: 'Updated Group Description' },
  });
  fireEvent.click(await findByText(editorGroup, 'access point groups'));
  await findByText(editorGroup, 'Updated Group Description');

  // remove group
  fireEvent.click(
    guaranteeNonNullable(
      (
        await screen.findAllByRole('button', {
          name: 'Remove Access Point Group',
        })
      )[1],
    ),
  );
  expect(screen.queryByText('group2')).toBeNull();
});

test(integrationTest('New access point group modal'), async () => {
  const MOCK__editorStore = TEST__provideMockedEditorStore({ pluginManager });
  const renderResult = await TEST__setUpEditorWithDefaultSDLCData(
    MOCK__editorStore,
    { entities: TEST_DATA__LHDataProduct },
  );
  MockedMonacoEditorInstance.getRawOptions.mockReturnValue({
    readOnly: true,
  });
  await TEST__openElementFromExplorerTree(
    'model::sampleDataProduct',
    renderResult,
  );
  const editorGroup = await waitFor(() =>
    renderResult.getByTestId(LEGEND_STUDIO_TEST_ID.EDITOR_GROUP),
  );

  //add access point group
  fireEvent.click(
    await findByTitle(editorGroup, 'Create new access point group'),
  );
  await waitFor(() => renderResult.getByRole('dialog'));
  const createButton = await screen.findByRole('button', { name: 'Create' });
  expect(createButton.hasAttribute('disabled')).toBe(true);
  const groupNameInput = await screen.findByPlaceholderText(
    'Access Point Group Name',
  );
  const groupDescriptionInput = await screen.findByPlaceholderText(
    'Access Point Group Description',
  );
  const accessPointNameInput =
    await screen.findByPlaceholderText('Access Point Name');
  const accessPointDescriptionInput = await screen.findByPlaceholderText(
    'Access Point Description',
  );

  fireEvent.change(groupNameInput, { target: { value: 'New Group' } });
  fireEvent.change(groupDescriptionInput, {
    target: { value: 'This is a new group description' },
  });
  fireEvent.change(accessPointNameInput, {
    target: { value: 'Access Point 1' },
  });
  fireEvent.change(accessPointDescriptionInput, {
    target: { value: 'Access Point 1 Description' },
  });
  expect(createButton.hasAttribute('disabled')).toBe(false);

  // Group Error Checking
  fireEvent.change(groupNameInput, { target: { value: '' } });
  await screen.findByTitle(AP_GROUP_MODAL_ERRORS.GROUP_NAME_EMPTY);
  expect(createButton.hasAttribute('disabled')).toBe(true);

  fireEvent.change(groupNameInput, { target: { value: 'group1' } });
  await screen.findByTitle(AP_GROUP_MODAL_ERRORS.GROUP_NAME_EXISTS);
  expect(createButton.hasAttribute('disabled')).toBe(true);

  fireEvent.change(groupDescriptionInput, { target: { value: '' } });
  await screen.findByTitle(AP_GROUP_MODAL_ERRORS.GROUP_DESCRIPTION_EMPTY);
  expect(createButton.hasAttribute('disabled')).toBe(true);

  //Access Point Error Checking
  fireEvent.change(accessPointNameInput, { target: { value: '' } });
  await screen.findByTitle(AP_GROUP_MODAL_ERRORS.AP_NAME_EMPTY);
  expect(createButton.hasAttribute('disabled')).toBe(true);

  fireEvent.change(accessPointNameInput, { target: { value: 'ap1' } });
  await screen.findByTitle(AP_GROUP_MODAL_ERRORS.AP_NAME_EXISTS);
  expect(createButton.hasAttribute('disabled')).toBe(true);

  fireEvent.change(accessPointDescriptionInput, { target: { value: '' } });
  await screen.findByTitle(AP_GROUP_MODAL_ERRORS.AP_DESCRIPTION_EMPTY);
  expect(createButton.hasAttribute('disabled')).toBe(true);

  //reset errors
  fireEvent.change(groupNameInput, { target: { value: 'New Group' } });
  fireEvent.change(groupDescriptionInput, {
    target: { value: 'This is a new group description' },
  });
  fireEvent.change(accessPointNameInput, {
    target: { value: 'Access Point 1' },
  });
  fireEvent.change(accessPointDescriptionInput, {
    target: { value: 'Access Point 1 Description' },
  });
  expect(createButton.hasAttribute('disabled')).toBe(false);

  //create group
  fireEvent.click(createButton);
  await findByText(editorGroup, 'New Group');
  await findByText(editorGroup, 'This is a new group description');
  await findByText(editorGroup, 'Access Point 1');
  await findByText(editorGroup, 'Access Point 1 Description');
});

test(integrationTest('New access point modal'), async () => {
  const MOCK__editorStore = TEST__provideMockedEditorStore({ pluginManager });
  const renderResult = await TEST__setUpEditorWithDefaultSDLCData(
    MOCK__editorStore,
    { entities: TEST_DATA__LHDataProduct },
  );

  await TEST__openElementFromExplorerTree(
    'model::sampleDataProduct',
    renderResult,
  );

  const editorGroup = await waitFor(() =>
    renderResult.getByTestId(LEGEND_STUDIO_TEST_ID.EDITOR_GROUP),
  );

  fireEvent.click(
    guaranteeNonNullable(
      (
        await screen.findAllByRole('button', {
          name: 'Create new access point',
        })
      )[0],
    ),
  );
  const addAccessPointModal = await waitFor(() =>
    renderResult.getByRole('dialog'),
  );
  const accessPointNameInput =
    await within(addAccessPointModal).findByPlaceholderText(
      'Access Point Name',
    );
  const accessPointDescriptionInput = await within(
    addAccessPointModal,
  ).findByPlaceholderText('Access Point Description');
  const createButton = await screen.findByRole('button', { name: 'Create' });
  expect(createButton.hasAttribute('disabled')).toBe(true);

  // Fill out all fields
  fireEvent.change(accessPointNameInput, {
    target: { value: 'New Access Point' },
  });
  fireEvent.change(accessPointDescriptionInput, {
    target: { value: 'This is a new access point description' },
  });
  expect(createButton.hasAttribute('disabled')).toBe(false);

  // Test name error handling
  fireEvent.change(accessPointNameInput, { target: { value: '' } });
  fireEvent.blur(accessPointNameInput);
  await screen.findByTitle('Access Point Name is empty');
  expect(createButton.hasAttribute('disabled')).toBe(true);

  fireEvent.change(accessPointNameInput, { target: { value: 'ap1' } });
  fireEvent.blur(accessPointNameInput);
  await screen.findByTitle('Access Point Name already exists');
  expect(createButton.hasAttribute('disabled')).toBe(true);

  // Refill the access point name with a valid unique name
  fireEvent.change(accessPointNameInput, {
    target: { value: 'New Access Point' },
  });
  fireEvent.blur(accessPointNameInput);
  expect(screen.queryByTitle('Access point name must be unique')).toBeNull();

  // Test description error handling
  fireEvent.change(accessPointDescriptionInput, { target: { value: '' } });
  fireEvent.blur(accessPointDescriptionInput);
  await screen.findByTitle('Access Point Description is empty');
  expect(createButton.hasAttribute('disabled')).toBe(true);

  // Refill the access point name with a valid unique description
  fireEvent.change(accessPointDescriptionInput, {
    target: { value: 'This is a new access point description' },
  });
  expect(createButton.hasAttribute('disabled')).toBe(false);

  // Verify that the new access point is added to the correct group
  fireEvent.click(createButton);
  const group1Title = await findByText(editorGroup, 'group1');
  const group1Container = group1Title.closest(
    '.access-point-editor__group-container',
  );
  if (!group1Container) {
    throw new Error('Group 1 container not found');
  }
  await findByText(group1Container as HTMLElement, 'New Access Point');
  await findByText(
    group1Container as HTMLElement,
    'This is a new access point description',
  );
});

test(integrationTest('Editing access points'), async () => {
  const MOCK__editorStore = TEST__provideMockedEditorStore({ pluginManager });
  const renderResult = await TEST__setUpEditorWithDefaultSDLCData(
    MOCK__editorStore,
    { entities: TEST_DATA__LHDataProduct },
  );

  await TEST__openElementFromExplorerTree(
    'model::sampleDataProduct',
    renderResult,
  );

  const editorGroup = await waitFor(() =>
    renderResult.getByTestId(LEGEND_STUDIO_TEST_ID.EDITOR_GROUP),
  );

  //remove first access point
  fireEvent.click(
    guaranteeNonNullable(
      (await screen.findAllByRole('button', { name: 'Remove' }))[0],
    ),
  );
  expect(screen.queryByText('ap1')).toBeNull();

  //edit description
  //TODO: replace placeholder with description after grammar changes have been added
  const apDescription = await findByText(editorGroup, AP_EMPTY_DESC_WARNING);
  fireEvent.mouseEnter(apDescription);
  await renderResult.findByTestId(LEGEND_STUDIO_TEST_ID.HOVER_EDIT_ICON);
  fireEvent.click(apDescription);
  const textbox = await findByPlaceholderText(
    editorGroup,
    'Access Point description',
  );
  fireEvent.click(textbox);
  fireEvent.change(textbox, { target: { value: 'New description here' } });
  fireEvent.click(await findByText(editorGroup, 'access point groups'));
  await findByText(editorGroup, 'New description here');
});
