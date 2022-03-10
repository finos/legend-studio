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

import ReactDOM from 'react-dom';
import { BrowserRouter } from 'react-router-dom';
import { configure as configureReactHotkeys } from 'react-hotkeys';
import { LegendStudioApplication } from '../components/LegendStudioApplication';
import { LegendStudioPluginManager } from './LegendStudioPluginManager';
import {
  type LegendApplicationConfig,
  type LegendApplicationLogger,
  type LegendApplicationVersionData,
  ApplicationStoreProvider,
  LegendApplication,
  setupLegendApplicationUILibrary,
  WebApplicationNavigatorProvider,
} from '@finos/legend-application';
import {
  CorePureGraphManagerPlugin,
  DSLExternalFormat_GraphPreset,
} from '@finos/legend-graph';
import { getRootElement } from '@finos/legend-art';
import {
  type LegendStudioConfigurationData,
  LegendStudioConfig,
} from './LegendStudioConfig';
import { DSLExternalFormat_LegendStudioPlugin } from '../components/editor/edit-panel/externalFormat-editor/DSLExternalFormat_LegendStudioPlugin';

const setupLegendStudioUILibrary = async (
  pluginManager: LegendStudioPluginManager,
  logger: LegendApplicationLogger,
): Promise<void> => {
  await setupLegendApplicationUILibrary(pluginManager, logger);

  configureReactHotkeys({
    // By default, `react-hotkeys` will avoid capturing keys from input tags like <input>, <textarea>, <select>
    // We want to listen to hotkey from every where in the app so we disable that
    // See https://github.com/greena13/react-hotkeys#ignoring-events
    ignoreTags: [],
  });

  await Promise.all(
    pluginManager
      .getStudioPlugins()
      .flatMap((plugin) => plugin.getExtraApplicationSetups?.() ?? [])
      .map((setup) => setup(pluginManager)),
  );
};

export class LegendStudio extends LegendApplication {
  declare config: LegendStudioConfig;
  declare pluginManager: LegendStudioPluginManager;

  static create(): LegendStudio {
    const application = new LegendStudio(LegendStudioPluginManager.create());
    application.withBasePlugins([
      new CorePureGraphManagerPlugin(),
      new DSLExternalFormat_LegendStudioPlugin(),
    ]);
    application.withBasePresets([new DSLExternalFormat_GraphPreset()]);
    return application;
  }

  async configureApplication(
    configData: LegendStudioConfigurationData,
    versionData: LegendApplicationVersionData,
    baseUrl: string,
  ): Promise<LegendApplicationConfig> {
    return new LegendStudioConfig(configData, versionData, baseUrl);
  }

  async loadApplication(): Promise<void> {
    // Setup React application libraries
    await setupLegendStudioUILibrary(this.pluginManager, this.logger);

    // Render React application
    ReactDOM.render(
      // TODO: would be great if we can have <React.StrictMode> here but since Mobx React is not ready for
      // concurrency yet, we would have to wait until @next become official
      // See https://github.com/mobxjs/mobx-react-lite/issues/53
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
      getRootElement(),
    );
  }
}
