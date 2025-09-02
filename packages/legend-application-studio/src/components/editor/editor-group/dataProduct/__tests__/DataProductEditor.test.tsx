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
import {
  Core_GraphManagerPreset,
  DataProductLibraryIcon,
} from '@finos/legend-graph';
import { QueryBuilder_GraphManagerPreset } from '@finos/legend-query-builder';
import { LegendStudioPluginManager } from '../../../../../application/LegendStudioPluginManager.js';
import { MockedMonacoEditorInstance } from '@finos/legend-lego/code-editor/test';
import { guaranteeNonNullable } from '@finos/legend-shared';
import { findByPlaceholderText, screen, within } from '@testing-library/dom';
import { AP_EMPTY_DESC_WARNING } from '../DataProductEditor.js';

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

  fireEvent.click(await findByText(editorGroup, 'APG'));
  guaranteeNonNullable(within(editorGroup).getAllByText('group1')[1]);
  await findByText(editorGroup, 'my first access point group');
  await findByText(editorGroup, 'ap1');

  fireEvent.click(await findByText(editorGroup, 'group2'));
  guaranteeNonNullable(within(editorGroup).getAllByText('group2')[1]);
  await findByText(editorGroup, 'access point group 2');
  await findByText(editorGroup, 'ap2');
  // TODO: test access point descriptions rendered properly after grammar changes have been added

  //edit group title
  fireEvent.click(await findByText(editorGroup, 'group1'));
  const accessPointGroupContainer = await waitFor(() =>
    renderResult.getByTestId(LEGEND_STUDIO_TEST_ID.ACCESS_POINT_GROUP_EDITOR),
  );
  const group1Title = await findByText(accessPointGroupContainer, 'group1');
  fireEvent.mouseEnter(group1Title);
  await renderResult.findByTestId(LEGEND_STUDIO_TEST_ID.HOVER_EDIT_ICON);
  fireEvent.click(group1Title);
  const textbox = await findByDisplayValue(editorGroup, 'group1');
  fireEvent.click(textbox);
  fireEvent.change(textbox, { target: { value: 'NewGroupName' } });
  fireEvent.click(await findByText(editorGroup, 'Access Points'));
  expect(within(editorGroup).getAllByText('NewGroupName')).not.toBeNull();
  //title cannot be undefined
  fireEvent.change(textbox, { target: { value: '' } });
  fireEvent.click(await findByText(editorGroup, 'Access Points'));
  expect(within(editorGroup).getAllByText('NewGroupName')).not.toBeNull();

  // edit group description
  const group1Desc = await findByText(
    editorGroup,
    'my first access point group',
  );
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
  fireEvent.click(await findByText(editorGroup, 'Access Points'));
  await findByText(editorGroup, 'Updated Group Description');

  // remove group
  fireEvent.click(
    guaranteeNonNullable(
      (
        await screen.findAllByRole('button', {
          name: 'Remove Access Point Group',
        })
      )[0],
    ),
  );
  fireEvent.click(await screen.findByText('Confirm'));
  expect(screen.queryByText('group1')).toBeNull();
});

test(integrationTest('Editing access points'), async () => {
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

  fireEvent.click(await findByText(editorGroup, 'APG'));

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
  fireEvent.click(await findByText(editorGroup, 'Access Points'));
  await findByText(editorGroup, 'New description here');

  //remove first access point
  fireEvent.click(
    guaranteeNonNullable(
      (await screen.findAllByRole('button', { name: 'Remove' }))[0],
    ),
  );
  fireEvent.click(await screen.findByText('Confirm'));
  expect(screen.queryByText('ap1')).toBeNull();
});

test(integrationTest('Editing data product icon'), async () => {
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

  // Check that data product has icon set
  const dataProduct =
    MOCK__editorStore.graphManagerState.graph.getOwnDataProduct(
      'model::sampleDataProduct',
    );
  expect(dataProduct.icon instanceof DataProductLibraryIcon).toBe(true);
  expect((dataProduct.icon as DataProductLibraryIcon).libraryId).toBe(
    'react-icons',
  );
  expect((dataProduct.icon as DataProductLibraryIcon).iconId).toBe(
    'TbArrowsExchange',
  );

  // Test changing icon
  const iconGrid = editorGroup.querySelector('.icon-selector__grid');
  fireEvent.click(iconGrid?.children[1] as HTMLElement);

  expect(dataProduct.icon instanceof DataProductLibraryIcon).toBe(true);
  expect((dataProduct.icon as DataProductLibraryIcon).libraryId).toBe(
    'react-icons',
  );
  expect((dataProduct.icon as DataProductLibraryIcon).iconId).toBe(
    'TbAlertCircle',
  );

  // Test setting icon to None
  fireEvent.click(screen.getByText('None'));
  await screen.findByText('No icon selected');
  expect(dataProduct.icon).toBeUndefined();
});
