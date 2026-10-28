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
  getByDisplayValue,
  getByPlaceholderText,
  getByRole,
  getByTestId,
  getByText,
  queryByText,
} from '@testing-library/react';
import { guaranteeNonNullable } from '@finos/legend-shared';
import { integrationTest } from '@finos/legend-shared/test';
import {
  TEST__openElementFromExplorerTree,
  TEST__provideMockedEditorStore,
  TEST__setUpEditorWithDefaultSDLCData,
} from '../../../__test-utils__/EditorComponentTestUtils.js';
import { LEGEND_STUDIO_TEST_ID } from '../../../../../__lib__/LegendStudioTesting.js';

const TEST_DATA__enumerations = [
  {
    path: 'test::AccountStatus',
    classifierPath: 'meta::pure::metamodel::type::Enumeration',
    content: {
      _type: 'Enumeration',
      name: 'AccountStatus',
      package: 'test',
      values: [
        {
          value: 'ACTIVE',
          taggedValues: [
            {
              tag: {
                profile: 'meta::pure::profiles::doc',
                value: 'doc',
              },
              value: 'The account can trade.',
            },
          ],
        },
        {
          value: 'CLOSED',
        },
      ],
    },
  },
  {
    path: 'test::NoValues',
    classifierPath: 'meta::pure::metamodel::type::Enumeration',
    content: {
      _type: 'Enumeration',
      name: 'NoValues',
      package: 'test',
      values: [],
    },
  },
];

let renderResult: RenderResult;

beforeEach(async () => {
  const MOCK__editorStore = TEST__provideMockedEditorStore();
  renderResult = await TEST__setUpEditorWithDefaultSDLCData(MOCK__editorStore, {
    entities: TEST_DATA__enumerations,
  });
});

const openEnumeration = async (path: string): Promise<HTMLElement> => {
  await TEST__openElementFromExplorerTree(path, renderResult);
  return renderResult.getByTestId(LEGEND_STUDIO_TEST_ID.ENUMERATION_EDITOR);
};

const getTab = (editor: HTMLElement, name: RegExp): HTMLElement =>
  getByRole(
    getByTestId(editor, LEGEND_STUDIO_TEST_ID.UML_ELEMENT_EDITOR__TABS_HEADER),
    'tab',
    { name },
  );

test(
  integrationTest('Enumeration editor shows the documentation of each value'),
  async () => {
    const editor = await openEnumeration('test::AccountStatus');
    getTab(editor, /^Values\s*2$/);
    getTab(editor, /^Tagged Values\s*0$/);
    getByText(editor, 'Documentation');

    const active = guaranteeNonNullable(
      getByDisplayValue(editor, 'ACTIVE').closest<HTMLElement>(
        '.enum-basic-editor',
      ),
    );
    getByText(active, 'The account can trade.');
    const closed = guaranteeNonNullable(
      getByDisplayValue(editor, 'CLOSED').closest<HTMLElement>(
        '.enum-basic-editor',
      ),
    );
    getByText(closed, 'No documentation');
  },
);

test(
  integrationTest(
    'Enumeration editor shows an empty state, with the action that adds the first item',
  ),
  async () => {
    const editor = await openEnumeration('test::NoValues');
    getByText(editor, 'No values yet');
    expect(queryByText(editor, 'Documentation')).toBeNull();

    fireEvent.click(getByText(editor, 'Add enum value'));
    expect(queryByText(editor, 'No values yet')).toBeNull();
    getByPlaceholderText(editor, 'Enum name');
    getByText(editor, 'Documentation');
    getTab(editor, /^Values\s*1$/);

    // the empty state sits inside the drop zone, so a profile can still be dropped on it
    fireEvent.click(getTab(editor, /^Tagged Values/));
    expect(
      getByText(editor, 'No tagged values yet').closest('.dnd__dropzone'),
    ).not.toBeNull();
    fireEvent.click(getByText(editor, 'Add tagged value'));
    expect(queryByText(editor, 'No tagged values yet')).toBeNull();
    getTab(editor, /^Tagged Values\s*1$/);
  },
);
