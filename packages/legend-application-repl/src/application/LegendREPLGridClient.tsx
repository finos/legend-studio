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
  ApplicationStoreProvider,
  Core_LegendApplicationPlugin,
  getApplicationRootElement,
} from '@finos/legend-application';
import {
  LegendREPLGridClientApplicationConfig,
  type LegendREPLGridClientApplicationConfigData,
} from './LegendREPLGridClientApplicationConfig.js';
import { LegendREPLGridClientPluginManager } from './LegendREPLGridClientPluginManager.js';
import { LegendREPLGridClientWebApplication } from '../components/LegendREPLGridClientApplication.js';
import { Core_LegendREPLGridClientApplicationPlugin } from '../components/Core_LegendREPLGridClientApplicationPlugin.js';
import type { LegendREPLGridClientApplicationStore } from '../stores/LegendREPLGridClientBaseStore.js';

export class LegendREPLGridClient extends LegendApplication {
  declare config: LegendREPLGridClientApplicationConfig;
  declare pluginManager: LegendREPLGridClientPluginManager;

  static create(): LegendREPLGridClient {
    const application = new LegendREPLGridClient(
      LegendREPLGridClientPluginManager.create(),
    );
    application.withBasePlugins([
      new Core_LegendApplicationPlugin(),
      new Core_LegendREPLGridClientApplicationPlugin(),
    ]);
    application.withBasePresets([]);
    return application;
  }

  // TODO: we need a btter strategy to make this work with vscode code-server
  // especially when handling static content such as config.json and version.json
  // we need to balance out what we output in the HTML file, what we call in the app
  // to fetch these files, as well as how we develop locally
  // e.g. use something like `${window.location.href.split('/repl/')[0]}/repl/`

  async configureApplication(
    input: LegendApplicationConfigurationInput<LegendREPLGridClientApplicationConfigData>,
  ): Promise<LegendApplicationConfig> {
    return new LegendREPLGridClientApplicationConfig(input);
  }

  async loadApplication(
    applicationStore: LegendREPLGridClientApplicationStore,
  ): Promise<void> {
    createRoot(getApplicationRootElement()).render(
      <ApplicationStoreProvider store={applicationStore}>
        <LegendREPLGridClientWebApplication baseUrl={this.baseAddress} />
      </ApplicationStoreProvider>,
    );
  }
}
