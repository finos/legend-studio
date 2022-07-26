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

import { LegendTaxonomy } from '@finos/legend-taxonomy';
import {
  type AbstractPlugin,
  type AbstractPreset,
  WebConsole,
} from '@finos/legend-shared';
import { DSLText_GraphManagerPreset } from '@finos/legend-extension-dsl-text';
import { DSLDiagram_GraphManagerPreset } from '@finos/legend-extension-dsl-diagram';
import { DSLDataSpace_GraphManagerPreset } from '@finos/legend-extension-dsl-data-space';
import { DSLExternalFormat_GraphPreset } from '@finos/legend-graph';
import { DSLPersistenceCloud_GraphManagerPreset } from '@finos/legend-extension-dsl-persistence-cloud';
import { EFJSONSchema_GraphManagerPreset } from '@finos/legend-extension-external-format-json-schema';
import { ESService_GraphManagerPreset } from '@finos/legend-extension-external-store-service';
import { DSLPersistence_GraphManagerPreset } from '@finos/legend-extension-dsl-persistence';

export class LegendTaxonomyWebApplication {
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
      // loggers
      new WebConsole(),
    ];
  }

  static run(baseUrl: string): void {
    LegendTaxonomy.create()
      .setup({ baseUrl })
      .withPresets(LegendTaxonomyWebApplication.getPresetCollection())
      .withPlugins(LegendTaxonomyWebApplication.getPluginCollection())
      .start()
      .catch((e: unknown) => {
        throw e;
      });
  }
}
