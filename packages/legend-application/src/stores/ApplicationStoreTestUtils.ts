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
import { WebApplicationNavigator } from './navigation/WebApplicationNavigator.js';
import { LegendApplicationConfig } from '../application/LegendApplicationConfig.js';
import { LegendApplicationPluginManager } from '../application/LegendApplicationPluginManager.js';
import type { LegendApplicationPlugin } from './LegendApplicationPlugin.js';
import type {
  GraphManagerPluginManager,
  PureGraphManagerPlugin,
  PureGraphPlugin,
  PureProtocolProcessorPlugin,
} from '@finos/legend-graph';

export const TEST_DATA__applicationVersion = {
  buildTime: '2001-01-01T00:00:00-0000',
  version: 'test-version',
  commitSHA: 'test-commit-id',
};

class TEST__LegendApplicationConfig extends LegendApplicationConfig {}

export const TEST__getGenericApplicationConfig = (
  extraConfigData = {},
): LegendApplicationConfig => {
  const config = new TEST__LegendApplicationConfig({
    configData: {
      env: 'TEST',
      appName: 'TEST',
      ...extraConfigData,
    },
    versionData: TEST_DATA__applicationVersion,
    baseUrl: '/query/',
  });
  return config;
};

export const TEST__getTestApplicationStore = <
  T extends LegendApplicationConfig,
  V extends LegendApplicationPluginManager<LegendApplicationPlugin>,
>(
  config: T,
  pluginManager: V,
): ApplicationStore<T, V> =>
  new ApplicationStore(
    config,
    new WebApplicationNavigator(createBrowserHistory()),
    pluginManager,
  );

export class TEST__LegendApplicationPluginManager
  extends LegendApplicationPluginManager<LegendApplicationPlugin>
  implements GraphManagerPluginManager
{
  private pureProtocolProcessorPlugins: PureProtocolProcessorPlugin[] = [];
  private pureGraphManagerPlugins: PureGraphManagerPlugin[] = [];
  private pureGraphPlugins: PureGraphPlugin[] = [];

  private constructor() {
    super();
  }

  static create(): TEST__LegendApplicationPluginManager {
    return new TEST__LegendApplicationPluginManager();
  }

  registerPureProtocolProcessorPlugin(
    plugin: PureProtocolProcessorPlugin,
  ): void {
    this.pureProtocolProcessorPlugins.push(plugin);
  }

  registerPureGraphManagerPlugin(plugin: PureGraphManagerPlugin): void {
    this.pureGraphManagerPlugins.push(plugin);
  }

  registerPureGraphPlugin(plugin: PureGraphPlugin): void {
    this.pureGraphPlugins.push(plugin);
  }

  getPureGraphManagerPlugins(): PureGraphManagerPlugin[] {
    return [...this.pureGraphManagerPlugins];
  }

  getPureProtocolProcessorPlugins(): PureProtocolProcessorPlugin[] {
    return [...this.pureProtocolProcessorPlugins];
  }

  getPureGraphPlugins(): PureGraphPlugin[] {
    return [...this.pureGraphPlugins];
  }
}
