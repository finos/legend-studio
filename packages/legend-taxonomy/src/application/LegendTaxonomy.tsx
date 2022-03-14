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

import {
  type LegendApplicationConfig,
  type LegendApplicationVersionData,
  LegendApplication,
  ApplicationStoreProvider,
  setupLegendApplicationUILibrary,
  WebApplicationNavigatorProvider,
} from '@finos/legend-application';
import { configure as configureReactHotkeys } from 'react-hotkeys';
import ReactDOM from 'react-dom';
import { BrowserRouter } from 'react-router-dom';
import { LegendTaxonomyApplication } from '../components/LegendTaxonomyApplication';
import { LegendTaxonomyPluginManager } from './LegendTaxonomyPluginManager';
import { getRootElement } from '@finos/legend-art';
import {
  CorePureGraphManagerPlugin,
  DSLExternalFormat_GraphPreset,
} from '@finos/legend-graph';
import {
  type LegendTaxonomyConfigurationData,
  LegendTaxonomyConfig,
} from './LegendTaxonomyConfig';

export const setupLegendQueryUILibrary = async (): Promise<void> => {
  configureReactHotkeys({
    // By default, `react-hotkeys` will avoid capturing keys from input tags like <input>, <textarea>, <select>
    // We want to listen to hotkey from every where in the app so we disable that
    // See https://github.com/greena13/react-hotkeys#ignoring-events
    ignoreTags: [],
  });
};

export class LegendTaxonomy extends LegendApplication {
  declare config: LegendTaxonomyConfig;
  declare pluginManager: LegendTaxonomyPluginManager;

  static create(): LegendTaxonomy {
    const application = new LegendTaxonomy(
      LegendTaxonomyPluginManager.create(),
    );
    application.withBasePlugins([new CorePureGraphManagerPlugin()]);
    application.withBasePresets([
      // NOTE: This makes it easier to eventually modularize `DSL External Format`,
      // but it makes the layering a bit strange since core graph has DSLs depending on
      // `DSL External Format` like generation and relational, which ideally we could move out later
      // See https://github.com/finos/legend-studio/issues/65
      new DSLExternalFormat_GraphPreset(),
    ]);
    return application;
  }

  async configureApplication(
    configData: LegendTaxonomyConfigurationData,
    versionData: LegendApplicationVersionData,
    baseUrl: string,
  ): Promise<LegendApplicationConfig> {
    return new LegendTaxonomyConfig(configData, versionData, baseUrl);
  }

  async loadApplication(): Promise<void> {
    // Setup React application libraries
    await setupLegendApplicationUILibrary(this.pluginManager, this.logger);
    await setupLegendQueryUILibrary();

    // Render React application
    ReactDOM.render(
      <BrowserRouter basename={this.baseUrl}>
        <WebApplicationNavigatorProvider>
          <ApplicationStoreProvider
            config={this.config}
            pluginManager={this.pluginManager}
          >
            <LegendTaxonomyApplication
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
