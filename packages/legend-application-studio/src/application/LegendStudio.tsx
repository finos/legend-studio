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
import { configure as configureReactHotkeys } from 'react-hotkeys';
import { LegendStudioApplication } from '../components/LegendStudioApplication.js';
import { LegendStudioPluginManager } from './LegendStudioPluginManager.js';
import {
  type LegendApplicationConfig,
  type LegendApplicationLogger,
  ApplicationStoreProvider,
  LegendApplication,
  setupLegendApplicationUILibrary,
  WebApplicationNavigatorProvider,
  type LegendApplicationConfigurationInput,
  BrowserRouter,
} from '@finos/legend-application';
import { Core_PureGraphManagerPlugin } from '@finos/legend-graph';
import { getRootElement } from '@finos/legend-art';
import {
  type LegendStudioApplicationConfigurationData,
  LegendStudioApplicationConfig,
} from './LegendStudioApplicationConfig.js';
import { Core_LegendStudioApplicationPlugin } from '../components/Core_LegendStudioApplicationPlugin.js';
import {
  QueryBuilder_GraphManagerPreset,
  setupQueryBuilderUILibrary,
} from '@finos/legend-query-builder';

const setupLegendStudioUILibrary = async (
  pluginManager: LegendStudioPluginManager,
  logger: LegendApplicationLogger,
): Promise<void> => {
  await setupLegendApplicationUILibrary(pluginManager, logger);
  await setupQueryBuilderUILibrary();

  configureReactHotkeys({
    // By default, `react-hotkeys` will avoid capturing keys from input tags like <input>, <textarea>, <select>
    // We want to listen to hotkey from every where in the app so we disable that
    // See https://github.com/greena13/react-hotkeys#ignoring-events
    ignoreTags: [],
  });
};

export class LegendStudio extends LegendApplication {
  declare config: LegendStudioApplicationConfig;
  declare pluginManager: LegendStudioPluginManager;

  static create(): LegendStudio {
    const application = new LegendStudio(LegendStudioPluginManager.create());
    application.withBasePresets([new QueryBuilder_GraphManagerPreset()]);
    application.withBasePlugins([
      new Core_PureGraphManagerPlugin(),
      new Core_LegendStudioApplicationPlugin(),
    ]);
    return application;
  }

  async configureApplication(
    input: LegendApplicationConfigurationInput<LegendStudioApplicationConfigurationData>,
  ): Promise<LegendApplicationConfig> {
    return new LegendStudioApplicationConfig(input);
  }

  async loadApplication(): Promise<void> {
    // Setup React application libraries
    await setupLegendStudioUILibrary(this.pluginManager, this.logger);

    // Render React application
    const rootElement = createRoot(getRootElement());
    rootElement.render(
      // TODO: would be great if we can have <React.StrictMode> here but since Mobx React is not ready for
      // concurrency yet, we would have to wait
      // See https://github.com/mobxjs/mobx/issues/2526
      <BrowserRouter basename={this.baseUrl}>
        <WebApplicationNavigatorProvider>
          <ApplicationStoreProvider
            config={this.config}
            pluginManager={this.pluginManager}
          >
            <LegendStudioApplication
              config={this.config}
              pluginManager={this.pluginManager}
            />
          </ApplicationStoreProvider>
        </WebApplicationNavigatorProvider>
      </BrowserRouter>,
    );
  }
}
