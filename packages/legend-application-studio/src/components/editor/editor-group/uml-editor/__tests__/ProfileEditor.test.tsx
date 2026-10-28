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

import { test, expect, beforeEach } from '@jest/globals';
import {
  type RenderResult,
  fireEvent,
  getAllByTitle,
  getByDisplayValue,
  getByPlaceholderText,
  getByRole,
  getByTestId,
  getByText,
  getByTitle,
  queryByText,
} from '@testing-library/react';
import TEST_DATA__m2mGraphEntities from '../../../../../stores/editor/__tests__/TEST_DATA__M2MGraphEntities.json' with { type: 'json' };
import { guaranteeNonNullable } from '@finos/legend-shared';
import { integrationTest } from '@finos/legend-shared/test';
import {
  TEST__openElementFromExplorerTree,
  TEST__provideMockedEditorStore,
  TEST__setUpEditorWithDefaultSDLCData,
} from '../../../__test-utils__/EditorComponentTestUtils.js';
import { LEGEND_STUDIO_TEST_ID } from '../../../../../__lib__/LegendStudioTesting.js';

let renderResult: RenderResult;

beforeEach(async () => {
  const MOCK__editorStore = TEST__provideMockedEditorStore();
  renderResult = await TEST__setUpEditorWithDefaultSDLCData(MOCK__editorStore, {
    entities: TEST_DATA__m2mGraphEntities,
  });
});

const openProfileTest = async (): Promise<HTMLElement> => {
  await TEST__openElementFromExplorerTree(
    'ui::test1::ProfileTest',
    renderResult,
  );
  return renderResult.getByTestId(LEGEND_STUDIO_TEST_ID.EDITOR_GROUP_CONTENT);
};

const getTab = (editor: HTMLElement, name: RegExp): HTMLElement =>
  getByRole(
    getByTestId(editor, LEGEND_STUDIO_TEST_ID.UML_ELEMENT_EDITOR__TABS_HEADER),
    'tab',
    { name },
  );

// the row of the tag or stereotype with the given value
const getRow = (editor: HTMLElement, value: string): HTMLElement =>
  guaranteeNonNullable(
    getByDisplayValue(editor, value).closest<HTMLElement>(
      '.tag-basic-editor, .stereotype-basic-editor',
    ),
  );

test(
  integrationTest(
    'Profile editor shows where each tag and stereotype is used in the model',
  ),
  async () => {
    const editor = await openProfileTest();
    expect(getTab(editor, /^Tags\s*3$/).getAttribute('aria-selected')).toBe(
      'true',
    );
    getTab(editor, /^Stereotypes\s*2$/);
    getByText(editor, 'Used by');

    // the first two users, sorted, then how many more; every user in the tooltip
    const tag1 = getRow(editor, 'tag1');
    getByText(tag1, 'Anyone');
    getByText(tag1, 'TestAssociation');
    getByText(tag1, '+4');
    expect(queryByText(tag1, 'TestClass')).toBeNull();
    expect(
      guaranteeNonNullable(getByText(tag1, 'Anyone').parentElement).title,
    ).toBe(
      [
        'ui::test1::Anyone',
        'ui::TestAssociation',
        'ui::TestAssociation.testClassSibling',
        'ui::TestClass',
        'ui::TestEnumeration',
        'ui::TestEnumeration.enumA',
      ].join('\n'),
    );
    // used on a class property
    getByText(getRow(editor, 'tag2'), 'TestClass.b');
    getByText(getRow(editor, 'tag3'), 'Not used');

    fireEvent.click(getTab(editor, /^Stereotypes/));
    // used on an enum value and on an association property
    const stereotype1 = getRow(editor, 'stereotype1');
    getByText(stereotype1, 'TestAssociation.testClassSibling');
    getByText(stereotype1, 'TestClass');
    getByText(stereotype1, '+2');
    const stereotype2 = getRow(editor, 'stereotype2');
    getByText(stereotype2, 'TestAssociation');
    getByText(stereotype2, 'TestEnumeration');
  },
);

test(
  integrationTest(
    'Profile editor shows an empty state, with the action that adds the first item',
  ),
  async () => {
    const editor = await openProfileTest();
    getByTitle(editor, 'Add tag');
    fireEvent.click(getTab(editor, /^Stereotypes/));
    expect(queryByText(editor, 'No stereotypes yet')).toBeNull();

    fireEvent.click(guaranteeNonNullable(getAllByTitle(editor, 'Remove')[0]));
    fireEvent.click(guaranteeNonNullable(getAllByTitle(editor, 'Remove')[0]));
    getByText(editor, 'No stereotypes yet');
    getTab(editor, /^Stereotypes\s*0$/);
    expect(queryByText(editor, 'Used by')).toBeNull();

    fireEvent.click(getByText(editor, 'Add stereotype'));
    expect(queryByText(editor, 'No stereotypes yet')).toBeNull();
    getByPlaceholderText(editor, 'Stereotype value');
    getByText(editor, 'Used by');
    getTab(editor, /^Stereotypes\s*1$/);
  },
);
