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

import { createRoot } from 'react-dom/client';
import {
  type LegendApplicationConfig,
  type LegendApplicationConfigurationInput,
  LegendApplication,
  ApplicationStoreProvider,
  Core_LegendApplicationPlugin,
  getApplicationRootElement,
} from '@finos/legend-application';
import {
  LegendPureIDEApplicationConfig,
  type LegendPureIDEApplicationConfigData,
} from './LegendPureIDEApplicationConfig.js';
import { LegendPureIDEPluginManager } from './LegendPureIDEPluginManager.js';
import { LegendPureIDEWebApplication } from '../components/LegendPureIDEApplication.js';
import { Core_LegendPureIDEApplicationPlugin } from '../components/Core_LegendPureIDEApplicationPlugin.js';
import type { LegendPureIDEApplicationStore } from '../stores/LegendPureIDEBaseStore.js';

export class LegendPureIDE extends LegendApplication {
  declare config: LegendPureIDEApplicationConfig;
  declare pluginManager: LegendPureIDEPluginManager;

  static create(): LegendPureIDE {
    const application = new LegendPureIDE(LegendPureIDEPluginManager.create());
    application.withBasePlugins([
      new Core_LegendApplicationPlugin(),
      new Core_LegendPureIDEApplicationPlugin(),
    ]);
    return application;
  }

  async configureApplication(
    input: LegendApplicationConfigurationInput<LegendPureIDEApplicationConfigData>,
  ): Promise<LegendApplicationConfig> {
    return new LegendPureIDEApplicationConfig(input);
  }

  async loadApplication(
    applicationStore: LegendPureIDEApplicationStore,
  ): Promise<void> {
    createRoot(getApplicationRootElement()).render(
      <ApplicationStoreProvider store={applicationStore}>
        <LegendPureIDEWebApplication baseUrl={this.baseAddress} />
      </ApplicationStoreProvider>,
    );
  }
}
