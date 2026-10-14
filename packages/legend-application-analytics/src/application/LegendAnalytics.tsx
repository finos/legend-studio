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

import { createRoot } from 'react-dom/client';
import {
  ApplicationStoreProvider,
  getApplicationRootElement,
  LegendApplication,
  type LegendApplicationConfig,
  type LegendApplicationConfigurationInput,
} from '@finos/legend-application';
import {
  LegendAnalyticsApplicationConfig,
  type LegendAnalyticsApplicationConfigurationData,
} from './LegendAnalyticsApplicationConfig.js';
import { LegendAnalyticsPluginManager } from './LegendAnalyticsPluginManager.js';
import { Core_LegendAnalytics_LegendApplicationPlugin } from './Core_LegendAnalytics_LegendApplicationPlugin.js';
import { Core_LegendAnalyticsApplicationPlugin } from './Core_LegendAnalyticsApplicationPlugin.js';
import { LegendAnalyticsWebApplication } from '../components/LegendAnalyticsWebApplication.js';
import type { LegendAnalyticsApplicationStore } from '../stores/LegendAnalyticsBaseStore.js';

/**
 * Legend Analytics (PLAN §11.18): its first iteration runs the Legend Cube
 * page on its own
 */
export class LegendAnalytics extends LegendApplication {
  declare config: LegendAnalyticsApplicationConfig;
  declare pluginManager: LegendAnalyticsPluginManager;

  static create(): LegendAnalytics {
    const application = new LegendAnalytics(
      LegendAnalyticsPluginManager.create(),
    );
    application.withBasePresets([]);
    application.withBasePlugins([
      new Core_LegendAnalytics_LegendApplicationPlugin(),
      new Core_LegendAnalyticsApplicationPlugin(),
    ]);
    return application;
  }

  async configureApplication(
    input: LegendApplicationConfigurationInput<LegendAnalyticsApplicationConfigurationData>,
  ): Promise<LegendApplicationConfig> {
    return new LegendAnalyticsApplicationConfig(input);
  }

  async loadApplication(
    applicationStore: LegendAnalyticsApplicationStore,
  ): Promise<void> {
    createRoot(getApplicationRootElement()).render(
      <ApplicationStoreProvider store={applicationStore}>
        <LegendAnalyticsWebApplication baseUrl={this.baseAddress} />
      </ApplicationStoreProvider>,
    );
  }
}
