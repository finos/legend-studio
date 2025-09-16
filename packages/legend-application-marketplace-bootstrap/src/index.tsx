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

import { LegendMarketplace } from '@finos/legend-application-marketplace';
import {
  type AbstractPreset,
  type AbstractPlugin,
  WebConsole,
} from '@finos/legend-shared';
import { DSL_DataSpace_GraphManagerPreset } from '@finos/legend-extension-dsl-data-space/graph';

export class LegendMarketplaceWebApplication {
  static getPresetCollection(): AbstractPreset[] {
    return [
      // graph managers
      new DSL_DataSpace_GraphManagerPreset(),
    ];
  }

  static getPluginCollection(): AbstractPlugin[] {
    return [
      // loggers
      new WebConsole(),
    ];
  }

  static run(baseUrl: string): void {
    LegendMarketplace.create()
      .setup({ baseAddress: baseUrl })
      .withPresets(LegendMarketplaceWebApplication.getPresetCollection())
      .withPlugins(LegendMarketplaceWebApplication.getPluginCollection())
      .start()
      .catch((e: unknown) => {
        throw e;
      });
  }
}
