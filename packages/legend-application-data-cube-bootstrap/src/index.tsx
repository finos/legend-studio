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

import { LegendDataCube } from '@finos/legend-application-data-cube';
import { DSL_DataSpace_GraphManagerPreset } from '@finos/legend-extension-dsl-data-space/graph';
import {
  type AbstractPreset,
  type AbstractPlugin,
  WebConsole,
} from '@finos/legend-shared';

export class LegendDataCubeWebApplication {
  static getPresetCollection(): AbstractPreset[] {
    return [new DSL_DataSpace_GraphManagerPreset()];
  }

  static getPluginCollection(): AbstractPlugin[] {
    return [
      // loggers
      new WebConsole(),
    ];
  }

  static run(baseUrl: string): void {
    LegendDataCube.create()
      .setup({ baseAddress: baseUrl })
      .withPresets(LegendDataCubeWebApplication.getPresetCollection())
      .withPlugins(LegendDataCubeWebApplication.getPluginCollection())
      .withDownloadHelper()
      .start()
      .catch((e: unknown) => {
        throw e;
      });
  }
}
