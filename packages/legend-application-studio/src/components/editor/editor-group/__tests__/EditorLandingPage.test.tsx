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
import {
  type RenderResult,
  fireEvent,
  waitFor,
  within,
} from '@testing-library/react';
import { ApplicationStore } from '@finos/legend-application';
import { createSpy, integrationTest } from '@finos/legend-shared/test';
import TEST_DATA__m2mGraphEntities from '../../../../stores/editor/__tests__/TEST_DATA__M2MGraphEntities.json' with { type: 'json' };
import {
  TEST__provideMockedEditorStore,
  TEST__setUpEditorWithDefaultSDLCData,
} from '../../__test-utils__/EditorComponentTestUtils.js';
import { TEST__getLegendStudioApplicationConfig } from '../../../../stores/__test-utils__/LegendStudioApplicationTestUtils.js';
import { LegendStudioPluginManager } from '../../../../application/LegendStudioPluginManager.js';
import { Core_LegendStudioApplicationPlugin } from '../../../extensions/Core_LegendStudioApplicationPlugin.js';
import { LEGEND_STUDIO_COMMAND_KEY } from '../../../../__lib__/LegendStudioCommand.js';
import { LEGEND_STUDIO_DOCUMENTATION_KEY } from '../../../../__lib__/LegendStudioDocumentation.js';
import type { EditorStore } from '../../../../stores/editor/EditorStore.js';

const setUpLandingPage = async (
  extraConfigData = {},
): Promise<{ editorStore: EditorStore; renderResult: RenderResult }> => {
  // the core plugin carries the commands' default keyboard shortcuts
  const pluginManager = LegendStudioPluginManager.create();
  pluginManager
    .usePlugins([new Core_LegendStudioApplicationPlugin()])
    .install();
  const editorStore = TEST__provideMockedEditorStore({
    pluginManager,
    applicationStore: new ApplicationStore(
      TEST__getLegendStudioApplicationConfig(extraConfigData),
      pluginManager,
    ),
  });
  const renderResult = await TEST__setUpEditorWithDefaultSDLCData(editorStore, {
    entities: TEST_DATA__m2mGraphEntities,
  });
  await waitFor(() => renderResult.getByText('Open an element'));
  return { editorStore, renderResult };
};

const getSection = (renderResult: RenderResult, title: string): HTMLElement =>
  renderResult.getByRole('heading', { name: title })
    .parentElement as HTMLElement;

test(
  integrationTest(
    'Landing page shows each action with its keys and runs its command on click',
  ),
  async () => {
    const { editorStore, renderResult } = await setUpLandingPage();

    const start = getSection(renderResult, 'Start');
    const openElement = within(start).getByRole('button', {
      name: /Open an element/,
    });
    expect(within(openElement).getByText('Ctrl')).not.toBeNull();
    expect(within(openElement).getByText('P')).not.toBeNull();
    const newElement = within(start).getByRole('button', {
      name: /New element/,
    });
    expect(
      within(newElement)
        .getAllByText(/./u, { selector: 'kbd' })
        .map((key) => key.textContent),
    ).toEqual(['Ctrl', 'Shift', 'N']);
    expect(
      within(within(start).getByRole('button', { name: /Compile/ })).getByText(
        'F9',
      ),
    ).not.toBeNull();

    const runCommand = createSpy(
      editorStore.applicationStore.commandService,
      'runCommand',
    );
    expect(editorStore.showSearchElementCommand).toBe(false);
    fireEvent.click(openElement);
    expect(runCommand).toHaveBeenCalledWith(
      LEGEND_STUDIO_COMMAND_KEY.SEARCH_ELEMENT,
    );
    expect(editorStore.showSearchElementCommand).toBe(true);
  },
);

test(
  integrationTest('Learn lists Rule engagement only when it is configured'),
  async () => {
    const { renderResult } = await setUpLandingPage();
    const learn = getSection(renderResult, 'Learn');
    expect(within(learn).getByText('Showcases')).not.toBeNull();
    expect(within(learn).getByText('Documentation')).not.toBeNull();
    expect(within(learn).queryByText('Rule engagement')).toBeNull();
  },
);

test(
  integrationTest('Learn opens the configured Rule engagement page'),
  async () => {
    const { editorStore, renderResult } = await setUpLandingPage({
      documentation: {
        url: 'https://testDocUrl',
        entries: {
          [LEGEND_STUDIO_DOCUMENTATION_KEY.APPLICATION_RULE_ENGAGEMENT]: {
            title: 'Rule engagement',
            url: 'https://testRuleEngagementUrl',
          },
        },
      },
    });
    const visitAddress = createSpy(
      editorStore.applicationStore.navigationService.navigator,
      'visitAddress',
    ).mockImplementation(() => undefined);
    fireEvent.click(
      within(getSection(renderResult, 'Learn')).getByRole('button', {
        name: /Rule engagement/,
      }),
    );
    expect(visitAddress).toHaveBeenCalledWith('https://testRuleEngagementUrl');
  },
);
