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
  LegendREPLApplicationConfig,
  type LegendREPLApplicationConfigData,
} from './LegendREPLApplicationConfig.js';
import { LegendREPLPluginManager } from './LegendREPLPluginManager.js';
import { LegendREPLWebApplication } from '../components/LegendREPLApplication.js';
import { Core_LegendREPLApplicationPlugin } from '../components/Core_LegendREPLApplicationPlugin.js';
import type { LegendREPLApplicationStore } from '../stores/LegendREPLBaseStore.js';

export class LegendREPL extends LegendApplication {
  declare config: LegendREPLApplicationConfig;
  declare pluginManager: LegendREPLPluginManager;

  static create(): LegendREPL {
    const application = new LegendREPL(LegendREPLPluginManager.create());
    application.withBasePlugins([
      new Core_LegendApplicationPlugin(),
      new Core_LegendREPLApplicationPlugin(),
    ]);
    application.withBasePresets([]);
    return application;
  }

  async configureApplication(
    input: LegendApplicationConfigurationInput<LegendREPLApplicationConfigData>,
  ): Promise<LegendApplicationConfig> {
    return new LegendREPLApplicationConfig(input);
  }

  async loadApplication(
    application: LegendREPLApplicationStore,
  ): Promise<void> {
    createRoot(getApplicationRootElement()).render(
      <ApplicationStoreProvider store={application}>
        <LegendREPLWebApplication baseUrl={this.baseAddress} />
      </ApplicationStoreProvider>,
    );
  }
}
