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
  setupLegendApplicationUILibrary,
  WebApplicationNavigatorProvider,
  BrowserRouter,
  ApplicationStoreProvider,
} from '@finos/legend-application';
import { getRootElement } from '@finos/legend-art';
import {
  LegendPureIDEApplicationConfig,
  type LegendPureIDEApplicationConfigData,
} from './LegendPureIDEApplicationConfig.js';
import { LegendPureIDEPluginManager } from './LegendPureIDEPluginManager.js';
import { DSL_Diagram_GraphManagerPreset } from '@finos/legend-extension-dsl-diagram';
import { LegendPureIDEApplication } from '../components/LegendPureIDEApplication.js';

export class LegendPureIDE extends LegendApplication {
  declare config: LegendPureIDEApplicationConfig;
  declare pluginManager: LegendPureIDEPluginManager;

  static create(): LegendPureIDE {
    const application = new LegendPureIDE(LegendPureIDEPluginManager.create());
    application.withBasePresets([new DSL_Diagram_GraphManagerPreset()]);
    return application;
  }

  async configureApplication(
    input: LegendApplicationConfigurationInput<LegendPureIDEApplicationConfigData>,
  ): Promise<LegendApplicationConfig> {
    return new LegendPureIDEApplicationConfig(input);
  }

  async loadApplication(): Promise<void> {
    // Setup React application libraries
    await setupLegendApplicationUILibrary(this.pluginManager, this.logger);

    // Render React application
    const rootElement = createRoot(getRootElement());
    rootElement.render(
      <BrowserRouter basename={this.baseUrl}>
        <WebApplicationNavigatorProvider>
          <ApplicationStoreProvider
            config={this.config}
            pluginManager={this.pluginManager}
          >
            <LegendPureIDEApplication />
          </ApplicationStoreProvider>
        </WebApplicationNavigatorProvider>
      </BrowserRouter>,
    );
  }
}
