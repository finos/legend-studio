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
import { LegendStudioApplication } from '../components/LegendStudioApplication.js';
import { LegendStudioPluginManager } from './LegendStudioPluginManager.js';
import {
  type LegendApplicationConfig,
  ApplicationStoreProvider,
  LegendApplication,
  WebApplicationNavigatorProvider,
  type LegendApplicationConfigurationInput,
  BrowserRouter,
  Core_LegendApplicationPlugin,
  getApplicationRootElement,
} from '@finos/legend-application';
import { Core_GraphManagerPreset } from '@finos/legend-graph';
import {
  type LegendStudioApplicationConfigurationData,
  LegendStudioApplicationConfig,
} from './LegendStudioApplicationConfig.js';
import { Core_LegendStudioApplicationPlugin } from '../components/extensions/Core_LegendStudioApplicationPlugin.js';
import {
  QueryBuilder_GraphManagerPreset,
  QueryBuilder_LegendApplicationPlugin,
} from '@finos/legend-query-builder';

export class LegendStudio extends LegendApplication {
  declare config: LegendStudioApplicationConfig;
  declare pluginManager: LegendStudioPluginManager;

  static create(): LegendStudio {
    const application = new LegendStudio(LegendStudioPluginManager.create());
    application.withBasePresets([
      new Core_GraphManagerPreset(),
      new QueryBuilder_GraphManagerPreset(),
    ]);
    application.withBasePlugins([
      new Core_LegendApplicationPlugin(),
      new Core_LegendStudioApplicationPlugin(),
      new QueryBuilder_LegendApplicationPlugin(),
    ]);
    return application;
  }

  async configureApplication(
    input: LegendApplicationConfigurationInput<LegendStudioApplicationConfigurationData>,
  ): Promise<LegendApplicationConfig> {
    return new LegendStudioApplicationConfig(input);
  }

  async loadApplication(): Promise<void> {
    const rootElement = createRoot(getApplicationRootElement());
    rootElement.render(
      <BrowserRouter basename={this.baseUrl}>
        <WebApplicationNavigatorProvider>
          <ApplicationStoreProvider
            config={this.config}
            pluginManager={this.pluginManager}
          >
            <LegendStudioApplication config={this.config} />
          </ApplicationStoreProvider>
        </WebApplicationNavigatorProvider>
      </BrowserRouter>,
    );
  }
}
