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

import { beforeEach, expect, jest, test } from '@jest/globals';
import {
  ApplicationStore,
  ApplicationStoreProvider,
} from '@finos/legend-application';
import { Route, Routes } from '@finos/legend-application/browser';
import { TEST__BrowserEnvironmentProvider } from '@finos/legend-application/test';
import {
  LEGEND_CUBE_COMMAND_KEY,
  LEGEND_CUBE_TEST_ID,
} from '@finos/legend-cube-builder';
import { QueryBuilder_LegendApplicationPlugin } from '@finos/legend-query-builder';
import { fireEvent, render } from '@testing-library/react';
import { runInAction } from 'mobx';
import { LEGEND_QUERY_ROUTE_PATTERN } from '../../__lib__/LegendQueryNavigation.js';
import { Core_LegendQuery_LegendApplicationPlugin } from '../../application/Core_LegendQuery_LegendApplicationPlugin.js';
import { LegendQueryPluginManager } from '../../application/LegendQueryPluginManager.js';
import { TEST__getTestLegendQueryApplicationConfig } from '../../stores/__test-utils__/LegendQueryApplicationTestUtils.js';
import { LegendQueryCubeRoute } from '../cube/LegendQueryCubeRoute.js';
import { LegendQueryFrameworkProvider } from '../LegendQueryFrameworkProvider.js';

beforeEach(() => {
  localStorage.clear();
});

test("Runs Cube's Execute on F9 at /cube, though the query builder binds F9 too", async () => {
  // the plugins are installed before the application store is made, as the
  // app does: key bindings are read once, when the store is made
  const pluginManager = LegendQueryPluginManager.create();
  pluginManager
    .usePlugins([
      new Core_LegendQuery_LegendApplicationPlugin(),
      new QueryBuilder_LegendApplicationPlugin(),
    ])
    .install();
  const applicationStore = new ApplicationStore(
    TEST__getTestLegendQueryApplicationConfig(),
    pluginManager,
  );
  const { keyboardShortcutsService, commandService } = applicationStore;
  const onF9 = keyboardShortcutsService.keyMap.get('F9') ?? [];
  expect(onF9).toContain(LEGEND_CUBE_COMMAND_KEY.EXECUTE);
  // the query builder's Compile
  expect(onF9.length).toBeGreaterThan(1);
  expect(keyboardShortcutsService.keyMap.get('Control+KeyZ')).toContain(
    LEGEND_CUBE_COMMAND_KEY.UNDO,
  );
  expect(keyboardShortcutsService.keyMap.get('Meta+KeyZ')).toContain(
    LEGEND_CUBE_COMMAND_KEY.UNDO,
  );

  const { findByTestId } = render(
    <ApplicationStoreProvider store={applicationStore}>
      <TEST__BrowserEnvironmentProvider
        initialEntries={[LEGEND_QUERY_ROUTE_PATTERN.CUBE]}
      >
        <LegendQueryFrameworkProvider>
          <Routes>
            <Route
              path={LEGEND_QUERY_ROUTE_PATTERN.CUBE}
              element={<LegendQueryCubeRoute />}
            />
          </Routes>
        </LegendQueryFrameworkProvider>
      </TEST__BrowserEnvironmentProvider>
    </ApplicationStoreProvider>,
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
