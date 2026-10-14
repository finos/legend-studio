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

import { afterEach, beforeEach, expect, jest, test } from '@jest/globals';
import {
  ApplicationStore,
  ApplicationStoreProvider,
} from '@finos/legend-application';
import {
  LEGEND_CUBE_COMMAND_KEY,
  LEGEND_CUBE_TEST_ID,
} from '@finos/legend-cube-builder';
import { fireEvent, render } from '@testing-library/react';
import { runInAction } from 'mobx';
import { Core_LegendAnalytics_LegendApplicationPlugin } from '../../application/Core_LegendAnalytics_LegendApplicationPlugin.js';
import { LegendAnalyticsPluginManager } from '../../application/LegendAnalyticsPluginManager.js';
import { TEST__getTestLegendAnalyticsApplicationConfig } from '../../application/__test-utils__/LegendAnalyticsApplicationTestUtils.js';
import { LegendAnalyticsWebApplication } from '../LegendAnalyticsWebApplication.js';

beforeEach(() => {
  localStorage.clear();
});

afterEach(() => {
  window.history.replaceState({}, '', '/');
});

/**
 * The application at an address, its plugins installed before its store is
 * made, as the app does: key bindings are read once, when the store is made
 */
const renderAt = (
  url: string,
): {
  applicationStore: ApplicationStore<
    ReturnType<typeof TEST__getTestLegendAnalyticsApplicationConfig>,
    LegendAnalyticsPluginManager
  >;
  findByTestId: ReturnType<typeof render>['findByTestId'];
} => {
  window.history.replaceState({}, '', url);
  const pluginManager = LegendAnalyticsPluginManager.create();
  pluginManager
    .usePlugins([new Core_LegendAnalytics_LegendApplicationPlugin()])
    .install();
  const applicationStore = new ApplicationStore(
    TEST__getTestLegendAnalyticsApplicationConfig(),
    pluginManager,
  );
  const { findByTestId } = render(
    <ApplicationStoreProvider store={applicationStore}>
      <LegendAnalyticsWebApplication baseUrl="/analytics/" />
    </ApplicationStoreProvider>,
  );
  return { applicationStore, findByTestId };
};

test('Opens the Cube page at the application root, with no feature flag', async () => {
  // the routes mount once the base store is initialized; its identity call
  // fails on Jest's blocked fetch, and the store goes on without a user
  const { findByTestId } = renderAt('/analytics/');
  const page = await findByTestId(LEGEND_CUBE_TEST_ID.EDITOR);
  expect(page.textContent).toContain('Unsaved Query');
  expect(page.textContent).toContain(
    'Connect to a source to start a new one, or open an example.',
  );
});

test("Runs Cube's Execute on F9 and binds undo to Ctrl/Cmd+Z, through the application's core plugin", async () => {
  const { applicationStore, findByTestId } = renderAt('/analytics/');
  const { keyboardShortcutsService, commandService } = applicationStore;
  expect(keyboardShortcutsService.keyMap.get('F9')).toEqual([
    LEGEND_CUBE_COMMAND_KEY.EXECUTE,
  ]);
  expect(keyboardShortcutsService.keyMap.get('Control+KeyZ')).toContain(
    LEGEND_CUBE_COMMAND_KEY.UNDO,
  );
  expect(keyboardShortcutsService.keyMap.get('Meta+KeyZ')).toContain(
    LEGEND_CUBE_COMMAND_KEY.UNDO,
  );
  await findByTestId(LEGEND_CUBE_TEST_ID.EDITOR);
  const execute = commandService.commandRegistry.get(
    LEGEND_CUBE_COMMAND_KEY.EXECUTE,
  );
  expect(execute).toBeDefined();
  // the page opens empty, so Execute can't run yet: let it, and watch F9
  const action = jest.fn();
  runInAction(() => {
    if (execute) {
      execute.trigger = (): boolean => true;
      execute.action = action;
    }
  });
  fireEvent.keyDown(document, { key: 'F9', code: 'F9' });
  expect(action).toHaveBeenCalledTimes(1);
});
