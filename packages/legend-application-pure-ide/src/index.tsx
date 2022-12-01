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
  type AbstractPlugin,
  type AbstractPreset,
  WebConsole,
} from '@finos/legend-shared';
import { LegendPureIDE } from './application/LegendPureIDE.js';

export class LegendPureIDEWebApplication {
  static getPresetCollection(): AbstractPreset[] {
    return [];
  }

  static getPluginCollection(): AbstractPlugin[] {
    return [
      // loggers
      new WebConsole(),
    ];
  }

  static run(baseUrl: string): void {
    LegendPureIDE.create()
      .setup({ baseUrl })
      .withPresets(LegendPureIDEWebApplication.getPresetCollection())
      .withPlugins(LegendPureIDEWebApplication.getPluginCollection())
      .start()
      .catch((e: unknown) => {
        throw e;
      });
  }
}
