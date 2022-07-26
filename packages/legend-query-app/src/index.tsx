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

import { LegendQuery } from '@finos/legend-query';
import {
  type AbstractPreset,
  type AbstractPlugin,
  WebConsole,
} from '@finos/legend-shared';
import {
  DSLDataSpace_GraphManagerPreset,
  DSLDataSpace_LegendQueryApplicationPlugin,
} from '@finos/legend-extension-dsl-data-space';
import { DSLText_GraphManagerPreset } from '@finos/legend-extension-dsl-text';
import { DSLDiagram_GraphManagerPreset } from '@finos/legend-extension-dsl-diagram';
import { DSLExternalFormat_GraphPreset } from '@finos/legend-graph';
import { DSLPersistenceCloud_GraphManagerPreset } from '@finos/legend-extension-dsl-persistence-cloud';
import { ESService_GraphManagerPreset } from '@finos/legend-extension-external-store-service';
import { EFJSONSchema_GraphManagerPreset } from '@finos/legend-extension-external-format-json-schema';
import { DSLPersistence_GraphManagerPreset } from '@finos/legend-extension-dsl-persistence';

export class LegendQueryWebApplication {
  static getPresetCollection(): AbstractPreset[] {
    return [
      new DSLText_GraphManagerPreset(),
      new DSLDiagram_GraphManagerPreset(),
      new DSLDataSpace_GraphManagerPreset(),
      new DSLExternalFormat_GraphPreset(),
      new DSLPersistence_GraphManagerPreset(),
      new DSLPersistenceCloud_GraphManagerPreset(),
      new EFJSONSchema_GraphManagerPreset(),
      new ESService_GraphManagerPreset(),
    ];
  }

  static getPluginCollection(): AbstractPlugin[] {
    return [
      new DSLDataSpace_LegendQueryApplicationPlugin(),
      // loggers
      new WebConsole(),
    ];
  }

  static run(baseUrl: string): void {
    LegendQuery.create()
      .setup({ baseUrl })
      .withPresets(LegendQueryWebApplication.getPresetCollection())
      .withPlugins(LegendQueryWebApplication.getPluginCollection())
      .start()
      .catch((e: unknown) => {
        throw e;
      });
  }
}
