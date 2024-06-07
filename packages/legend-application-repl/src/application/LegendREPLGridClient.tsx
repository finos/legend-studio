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
  APPLICATION_EVENT,
  type LegendApplicationVersionData,
} from '@finos/legend-application';
import {
  LegendREPLGridClientApplicationConfig,
  type LegendREPLGridClientApplicationConfigData,
} from './LegendREPLGridClientApplicationConfig.js';
import { LegendREPLGridClientPluginManager } from './LegendREPLGridClientPluginManager.js';
import { LegendREPLGridClientWebApplication } from '../components/LegendREPLGridClientApplication.js';
import { Core_LegendREPLGridClientApplicationPlugin } from '../components/Core_LegendREPLGridClientApplicationPlugin.js';
import type { LegendREPLGridClientApplicationStore } from '../stores/LegendREPLGridClientBaseStore.js';
import {
  type ExtensionsConfigurationData,
  NetworkClient,
  assertErrorThrown,
  LogEvent,
  assertNonNullable,
} from '@finos/legend-shared';

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
