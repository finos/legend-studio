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
import { type RenderResult, getByText } from '@testing-library/react';
import TEST_DATA__m2mGraphEntities from '../../../../stores/editor/__tests__/TEST_DATA__M2MGraphEntities.json' with { type: 'json' };
import { guaranteeNonNullable } from '@finos/legend-shared';
import { integrationTest } from '@finos/legend-shared/test';
import {
  TEST__openAndAssertPathWithElement,
  TEST__provideMockedEditorStore,
  TEST__setUpEditorWithDefaultSDLCData,
} from '../../__test-utils__/EditorComponentTestUtils.js';
import type { EditorStore } from '../../../../stores/editor/EditorStore.js';

const packageRootChildren = ['ui'];

let renderResult: RenderResult;
let MOCK__editorStore: EditorStore;

beforeEach(async () => {
  MOCK__editorStore = TEST__provideMockedEditorStore();
  renderResult = await TEST__setUpEditorWithDefaultSDLCData(MOCK__editorStore, {
    entities: TEST_DATA__m2mGraphEntities,
  });
});

test(integrationTest('Package Explorer'), async () => {
  const explorerTitleLabel = renderResult.getByText('workspace');
  const explorerTitle = explorerTitleLabel.parentElement as HTMLElement;
  getByText(
    explorerTitle,
    guaranteeNonNullable(MOCK__editorStore.sdlcState.currentWorkspace)
      .workspaceId,
  );
  packageRootChildren.forEach((p) =>
    expect(renderResult.queryByText(p)).not.toBeNull(),
  );
  await TEST__openAndAssertPathWithElement(
    'ui::test1::ProfileTest',
    renderResult,
  );
  // TODO test generation package when added to model;
});
