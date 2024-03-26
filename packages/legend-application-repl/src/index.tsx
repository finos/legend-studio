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

import { type AbstractPlugin, type AbstractPreset } from '@finos/legend-shared';
import { LegendREPLGridClient } from './application/LegendREPLGridClient.js';
import { Core_LegendREPLGridClientApplicationPlugin } from './components/Core_LegendREPLGridClientApplicationPlugin.js';

export class LegendREPLGridClientWebApplication {
  static getPresetCollection(): AbstractPreset[] {
    return [];
  }

  static getPluginCollection(): AbstractPlugin[] {
    return [new Core_LegendREPLGridClientApplicationPlugin()];
  }

  static run(baseUrl: string): void {
    LegendREPLGridClient.create()
      .setup({ baseAddress: baseUrl })
      .withPresets(LegendREPLGridClientWebApplication.getPresetCollection())
      .withPlugins(LegendREPLGridClientWebApplication.getPluginCollection())
      .start()
      .catch((e: unknown) => {
        throw e;
      });
  }
}
