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
import type { PlainObject } from '@finos/legend-shared';
import { createSpy, integrationTest } from '@finos/legend-shared/test';
import { getByText, queryByText, waitFor } from '@testing-library/react';
import type { Entity } from '@finos/legend-storage';
import {
  TEST__openElementFromExplorerTree,
  TEST__provideMockedEditorStore,
  TEST__setUpEditorWithDefaultSDLCData,
} from '../../__test-utils__/EditorComponentTestUtils.js';
import { LEGEND_STUDIO_TEST_ID } from '../../../../__lib__/LegendStudioTesting.js';

const TEST_DATA__avroFileGeneration: PlainObject<Entity>[] = [
  {
    path: 'test::Person',
    content: {
      _type: 'class',
      name: 'Person',
      package: 'test',
      properties: [
        {
          multiplicity: { lowerBound: 1, upperBound: 1 },
          name: 'name',
          genericType: {
            rawType: { _type: 'packageableType', fullPath: 'String' },
          },
        },
      ],
    },
    classifierPath: 'meta::pure::metamodel::type::Class',
  },
  {
    path: 'test::PersonAvro',
    content: {
      _type: 'fileGeneration',
      configurationProperties: [],
      name: 'PersonAvro',
      package: 'test',
      scopeElements: ['test::Person'],
      type: 'avro',
    },
    classifierPath:
      'meta::pure::generation::metamodel::GenerationConfiguration',
  },
];

const MISSING_DESCRIPTION_NOTICE =
  /the engine has no description for file generation type 'avro'/;

test(
  integrationTest(
    'File generation editor shows a notice instead of crashing when the engine has no description for its type',
  ),
  async () => {
    const MOCK__editorStore = TEST__provideMockedEditorStore();
    const notifyErrorSpy = createSpy(
      MOCK__editorStore.applicationStore.notificationService,
      'notifyError',
    );
    const renderResult = await TEST__setUpEditorWithDefaultSDLCData(
      MOCK__editorStore,
      {
        entities: TEST_DATA__avroFileGeneration,
        // e.g. the engine returned an error for its available generations
        availableGenerationDescriptions: [],
      },
    );

    await TEST__openElementFromExplorerTree('test::PersonAvro', renderResult);

    const editorGroup = await waitFor(() =>
      renderResult.getByTestId(LEGEND_STUDIO_TEST_ID.EDITOR_GROUP_CONTENT),
    );
    await waitFor(() => getByText(editorGroup, MISSING_DESCRIPTION_NOTICE));
    // the rest of the editor still works
    getByText(editorGroup, 'avro configuration');
    getByText(editorGroup, 'Generation Output Path');
    expect(
      renderResult.queryByTestId(LEGEND_STUDIO_TEST_ID.EXPLORER_TREES),
    ).not.toBeNull();
    // opening it doesn't try to generate files with an unknown generation mode
    expect(
      notifyErrorSpy.mock.calls.filter(([content]) =>
        (content instanceof Error ? content.message : String(content)).includes(
          'configuration description',
        ),
      ),
    ).toHaveLength(0);
  },
);

test(
  integrationTest(
    'File generation editor shows no notice when the engine has a description for its type',
  ),
  async () => {
    const MOCK__editorStore = TEST__provideMockedEditorStore();
    const renderResult = await TEST__setUpEditorWithDefaultSDLCData(
      MOCK__editorStore,
      { entities: TEST_DATA__avroFileGeneration },
    );

    await TEST__openElementFromExplorerTree('test::PersonAvro', renderResult);

    const editorGroup = await waitFor(() =>
      renderResult.getByTestId(LEGEND_STUDIO_TEST_ID.EDITOR_GROUP_CONTENT),
    );
    await waitFor(() => getByText(editorGroup, 'avro configuration'));
    expect(queryByText(editorGroup, MISSING_DESCRIPTION_NOTICE)).toBeNull();
  },
);
