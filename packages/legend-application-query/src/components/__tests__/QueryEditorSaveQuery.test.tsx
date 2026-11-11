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
import { act, waitFor } from '@testing-library/react';
import {
  TEST__provideMockedQueryEditorStore,
  TEST__setUpQueryEditor,
} from '../__test-utils__/QueryEditorComponentTestUtils.js';
import {
  TEST_DATA__ResultState_entities,
  TEST_DATA__modelCoverageAnalysisResult,
} from './TEST_DATA__QueryBuilder_ResultStateTest.js';
import { ExistingQueryEditorStore } from '../../stores/QueryEditorStore.js';

// versions used by the test query set up in `TEST__setUpQueryEditor`
const HEAD_VERSION = '0.0.0';
const TEST_QUERY_ID = 'test-query-id';

const WARNING_TEXT = 'Saving will change the query version';

const setUpEditor = async (
  projectVersionId?: string | undefined,
): Promise<{
  editorStore: ExistingQueryEditorStore;
  openSaveDialog: () => Promise<HTMLElement>;
}> => {
  const base = TEST__provideMockedQueryEditorStore();
  const editorStore = projectVersionId
    ? TEST__provideMockedQueryEditorStore({
        mock: new ExistingQueryEditorStore(
          base.applicationStore,
          base.depotServerClient,
          TEST_QUERY_ID,
          undefined,
          undefined,
          projectVersionId,
        ),
      })
    : base;
  const { renderResult } = await TEST__setUpQueryEditor(
    editorStore,
    TEST_DATA__ResultState_entities,
    stub_RawLambda(),
    'execution::RelationalMapping',
    'execution::Runtime',
    TEST_DATA__modelCoverageAnalysisResult,
  );
  return {
    editorStore,
    openSaveDialog: async () => {
      act(() => {
        editorStore.updateState.showSaveModal();
      });
      return waitFor(() => renderResult.getByRole('dialog'));
    },
  };
};

test(
  integrationTest(
    'Save dialog does not warn when saving keeps the stored query version',
  ),
  async () => {
    const { openSaveDialog } = await setUpEditor();
    const dialog = await openSaveDialog();
    expect(dialog.textContent).toContain('Save Existing Query');
    expect(dialog.textContent).not.toContain(WARNING_TEXT);
  },
);

test(
  integrationTest(
    'Save dialog warns when the project version override differs from the stored query version',
  ),
  async () => {
    const { openSaveDialog } = await setUpEditor('1.0.0-SNAPSHOT');
    const dialog = await openSaveDialog();
    expect(dialog.textContent).toContain(
      `${WARNING_TEXT} from "${HEAD_VERSION}" to "1.0.0-SNAPSHOT"`,
    );
  },
);

test(
  integrationTest(
    'Save dialog does not warn when the project version override equals the stored query version',
  ),
  async () => {
    const { openSaveDialog } = await setUpEditor(HEAD_VERSION);
    const dialog = await openSaveDialog();
    expect(dialog.textContent).not.toContain(WARNING_TEXT);
  },
);
