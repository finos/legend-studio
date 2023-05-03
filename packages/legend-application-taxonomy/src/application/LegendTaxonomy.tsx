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
  LegendApplication,
  ApplicationStoreProvider,
  type LegendApplicationConfigurationInput,
  Core_LegendApplicationPlugin,
  getApplicationRootElement,
} from '@finos/legend-application';
import { LegendTaxonomyPluginManager } from './LegendTaxonomyPluginManager.js';
import { Core_GraphManagerPreset } from '@finos/legend-graph';
import {
  type LegendTaxonomyApplicationConfigurationData,
  LegendTaxonomyApplicationConfig,
} from './LegendTaxonomyApplicationConfig.js';
import { Core_LegendTaxonomyApplicationPlugin } from '../components/Core_LegendTaxonomyApplicationPlugin.js';
import type { LegendTaxonomyApplicationStore } from '../stores/LegendTaxonomyBaseStore.js';
import { LegendTaxonomyWebApplication } from '../components/LegendTaxonomyWebApplication.js';
import { QueryBuilder_LegendApplicationPlugin } from '@finos/legend-query-builder';

export class LegendTaxonomy extends LegendApplication {
  declare config: LegendTaxonomyApplicationConfig;
  declare pluginManager: LegendTaxonomyPluginManager;

  static create(): LegendTaxonomy {
    const application = new LegendTaxonomy(
      LegendTaxonomyPluginManager.create(),
    );
    application.withBasePresets([new Core_GraphManagerPreset()]);
    application.withBasePlugins([
      new Core_LegendApplicationPlugin(),
      new Core_LegendTaxonomyApplicationPlugin(),
      new QueryBuilder_LegendApplicationPlugin(),
    ]);
    return application;
  }

  async configureApplication(
    input: LegendApplicationConfigurationInput<LegendTaxonomyApplicationConfigurationData>,
  ): Promise<LegendApplicationConfig> {
    return new LegendTaxonomyApplicationConfig(input);
  }

  async loadApplication(
    applicationStore: LegendTaxonomyApplicationStore,
  ): Promise<void> {
    createRoot(getApplicationRootElement()).render(
      <ApplicationStoreProvider store={applicationStore}>
        <LegendTaxonomyWebApplication baseUrl={this.baseAddress} />
      </ApplicationStoreProvider>,
    );
  }
}
