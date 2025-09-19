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

import {
  type LegendApplicationPlugin,
  LegendApplicationConfig,
  LegendApplicationPluginManager,
} from '@finos/legend-application';
import { TEST__getApplicationVersionData } from '@finos/legend-application/test';
import type {
  GraphManagerPluginManager,
  PureProtocolProcessorPlugin,
  PureGraphManagerPlugin,
  PureGraphPlugin,
} from '@finos/legend-graph';

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

class TEST__LegendApplicationConfig extends LegendApplicationConfig {
  override getDefaultApplicationStorageKey(): string {
    return 'test';
  }
}

export const TEST__getGenericApplicationConfig = (
  extraConfigData = {},
): LegendApplicationConfig => {
  const config = new TEST__LegendApplicationConfig({
    configData: {
      env: 'TEST',
      appName: 'TEST',
      ...extraConfigData,
    },
    versionData: TEST__getApplicationVersionData(),
    baseAddress: '/',
  });
  return config;
};
