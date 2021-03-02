/**
 * Copyright 2020 Goldman Sachs
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

import type { RenderResult } from '@testing-library/react';
import { getByText } from '@testing-library/react';
import m2mGraphEntities from '../../../../stores/__tests__/buildGraph/M2MGraphEntitiesTestData.json';
import {
  integrationTest,
  guaranteeNonNullable,
} from '@finos/legend-studio-shared';
import {
  openAndAssertPathWithElement,
  getMockedEditorStore,
  setUpEditorWithDefaultSDLCData,
} from '../../../ComponentTestUtils';
import type { EditorStore } from '../../../../stores/EditorStore';

const packageRootChildren = ['ui'];

let renderResult: RenderResult;
let mockedEditorStore: EditorStore;

beforeEach(async () => {
  mockedEditorStore = getMockedEditorStore();
  renderResult = await setUpEditorWithDefaultSDLCData(mockedEditorStore, {
    entities: m2mGraphEntities,
  });
});

test(integrationTest('Package Explorer'), async () => {
  const explorerTitleLabel = renderResult.getByText('workspace');
  const explorerTitle = explorerTitleLabel.parentElement as HTMLElement;
  getByText(
    explorerTitle,
    guaranteeNonNullable(mockedEditorStore.sdlcState.currentWorkspace)
      .workspaceId,
  );
  packageRootChildren.forEach((p) =>
    expect(renderResult.queryByText(p)).not.toBeNull(),
  );
  await openAndAssertPathWithElement('ui::test1::ProfileTest', renderResult);
  // TODO test generation package when added to model;
});
