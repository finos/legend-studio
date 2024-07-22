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

import type { ApplicationStore } from '@finos/legend-application';
import type { LegendREPLApplicationConfig } from '../application/LegendREPLApplicationConfig.js';
import type { LegendREPLPluginManager } from '../application/LegendREPLPluginManager.js';

export type LegendREPLApplicationStore = ApplicationStore<
  LegendREPLApplicationConfig,
  LegendREPLPluginManager
>;

export class LegendREPLBaseStore {
  readonly application: LegendREPLApplicationStore;
  readonly pluginManager: LegendREPLPluginManager;

  constructor(application: LegendREPLApplicationStore) {
    this.application = application;
    this.pluginManager = application.pluginManager;
  }
}
