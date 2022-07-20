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

import { ApplicationStore } from './ApplicationStore.js';
import { createBrowserHistory } from 'history';
import { WebApplicationNavigator } from './WebApplicationNavigator.js';
import type { LegendApplicationConfig } from './LegendApplicationConfig.js';
import type { LegendApplicationPluginManager } from '../application/LegendApplicationPluginManager.js';
import type { LegendApplicationPlugin } from './LegendApplicationPlugin.js';

export const TEST_DATA__applicationVersion = {
  buildTime: '2001-01-01T00:00:00-0000',
  version: 'test-version',
  commitSHA: 'test-commit-id',
};

export const TEST__getTestApplicationStore = <
  T extends LegendApplicationConfig,
  V extends LegendApplicationPlugin,
>(
  config: T,
  pluginManager: LegendApplicationPluginManager<V>,
): ApplicationStore<T, V> =>
  new ApplicationStore(
    config,
    new WebApplicationNavigator(createBrowserHistory()),
    pluginManager,
  );
