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
  getApplicationRootElement,
  LegendApplication,
} from '@finos/legend-application';
import {
  type LegendMarketplaceApplicationConfigurationData,
  LegendMarketplaceApplicationConfig,
} from './LegendMarketplaceApplicationConfig.js';
import { LegendMarketplacePluginManager } from './LegendMarketplacePluginManager.js';
import { Core_LegendMarketplaceApplicationPlugin } from './extensions/Core_LegendMarketplaceApplicationPlugin.js';
import type { LegendMarketplaceApplicationStore } from '../stores/LegendMarketplaceBaseStore.js';
import { LegendMarketplaceWebApplication } from './LegendMarketplaceWebApplication.js';
import { Core_LegendMarketplace_LegendApplicationPlugin } from './extensions/Core_LegendMarketplace_LegendApplicationPlugin.js';
import { Core_DataProductDataAccess_LegendApplicationPlugin } from '@finos/legend-extension-dsl-data-product';

export class LegendMarketplace extends LegendApplication {
  declare config: LegendMarketplaceApplicationConfig;
  declare pluginManager: LegendMarketplacePluginManager;

  static create(): LegendMarketplace {
    const application = new LegendMarketplace(
      LegendMarketplacePluginManager.create(),
    );
    application.withBasePlugins([
      new Core_LegendMarketplace_LegendApplicationPlugin(),
      new Core_LegendMarketplaceApplicationPlugin(),
      new Core_DataProductDataAccess_LegendApplicationPlugin(),
    ]);
    return application;
  }

  async configureApplication(
    input: LegendApplicationConfigurationInput<LegendMarketplaceApplicationConfigurationData>,
  ): Promise<LegendApplicationConfig> {
    return new LegendMarketplaceApplicationConfig(input);
  }

  async loadApplication(
    applicationStore: LegendMarketplaceApplicationStore,
  ): Promise<void> {
    createRoot(getApplicationRootElement()).render(
      <ApplicationStoreProvider store={applicationStore}>
        <LegendMarketplaceWebApplication
          baseUrl={this.baseAddress}
          oidcConfig={this.config.marketplaceOidcConfig}
        />
      </ApplicationStoreProvider>,
    );
  }
}
