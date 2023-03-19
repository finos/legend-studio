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
  setupLegendApplicationUILibrary,
  WebApplicationNavigatorProvider,
  type LegendApplicationConfigurationInput,
  BrowserRouter,
  Core_LegendApplicationPlugin,
} from '@finos/legend-application';
import { LegendTaxonomyApplication } from '../components/LegendTaxonomyApplication.js';
import { LegendTaxonomyPluginManager } from './LegendTaxonomyPluginManager.js';
import { getRootElement } from '@finos/legend-art';
import { Core_GraphManagerPreset } from '@finos/legend-graph';
import {
  type LegendTaxonomyApplicationConfigurationData,
  LegendTaxonomyApplicationConfig,
} from './LegendTaxonomyApplicationConfig.js';
import { Core_LegendTaxonomyApplicationPlugin } from '../components/Core_LegendTaxonomyApplicationPlugin.js';

const setupLegendTaxonomyUILibrary = async (): Promise<void> => {
  // do nothing
};

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
    ]);
    return application;
  }

  async configureApplication(
    input: LegendApplicationConfigurationInput<LegendTaxonomyApplicationConfigurationData>,
  ): Promise<LegendApplicationConfig> {
    return new LegendTaxonomyApplicationConfig(input);
  }

  async loadApplication(): Promise<void> {
    // Setup React application libraries
    await setupLegendApplicationUILibrary(this.pluginManager, this.logger);
    await setupLegendTaxonomyUILibrary();

    // Render React application
    const rootElement = createRoot(getRootElement());
    rootElement.render(
      <BrowserRouter basename={this.baseUrl}>
        <WebApplicationNavigatorProvider>
          <ApplicationStoreProvider
            config={this.config}
            pluginManager={this.pluginManager}
          >
            <LegendTaxonomyApplication config={this.config} />
          </ApplicationStoreProvider>
        </WebApplicationNavigatorProvider>
      </BrowserRouter>,
    );
  }
}
