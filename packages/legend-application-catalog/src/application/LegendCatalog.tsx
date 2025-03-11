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
  ApplicationStoreProvider,
  Core_LegendApplicationPlugin,
  getApplicationRootElement,
  LegendApplication,
} from '@finos/legend-application';
import {
  type LegendCatalogApplicationConfigurationData,
  LegendCatalogApplicationConfig,
} from './LegendCatalogApplicationConfig.js';
import { LegendCatalogPluginManager } from './LegendCatalogPluginManager.js';
import { Core_LegendCatalogApplicationPlugin } from '../components/extensions/Core_LegendCatalogApplicationPlugin.js';
import type { LegendCatalogApplicationStore } from '../stores/LegendCatalogBaseStore.js';
import { LegendCatalogWebApplication } from '../components/LegendCatalogWebApplication.js';

export class LegendCatalog extends LegendApplication {
  declare config: LegendCatalogApplicationConfig;
  declare pluginManager: LegendCatalogPluginManager;

  static create(): LegendCatalog {
    const application = new LegendCatalog(LegendCatalogPluginManager.create());
    application.withBasePlugins([
      new Core_LegendApplicationPlugin(),
      new Core_LegendCatalogApplicationPlugin(),
    ]);
    return application;
  }

  async configureApplication(
    input: LegendApplicationConfigurationInput<LegendCatalogApplicationConfigurationData>,
  ): Promise<LegendApplicationConfig> {
    return new LegendCatalogApplicationConfig(input);
  }

  async loadApplication(
    applicationStore: LegendCatalogApplicationStore,
  ): Promise<void> {
    createRoot(getApplicationRootElement()).render(
      <ApplicationStoreProvider store={applicationStore}>
        <LegendCatalogWebApplication baseUrl={this.baseAddress} />
      </ApplicationStoreProvider>,
    );
  }
}
