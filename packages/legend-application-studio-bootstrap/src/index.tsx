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
  LegendStudio,
  DSLExternalFormat_LegendStudioApplicationPlugin,
} from '@finos/legend-studio';
import {
  type AbstractPreset,
  type AbstractPlugin,
  WebConsole,
} from '@finos/legend-shared';
import {
  DSLText_GraphManagerPreset,
  DSLText_LegendStudioApplicationPlugin,
} from '@finos/legend-extension-dsl-text';
import {
  DSLDiagram_GraphManagerPreset,
  DSLDiagram_LegendStudioApplicationPlugin,
} from '@finos/legend-extension-dsl-diagram';
import {
  DSLDataSpace_GraphManagerPreset,
  DSLDataSpace_LegendStudioApplicationPlugin,
} from '@finos/legend-extension-dsl-data-space';
import {
  DSLPersistence_GraphManagerPreset,
  DSLPersistence_LegendStudioApplicationPlugin,
} from '@finos/legend-extension-dsl-persistence';
import {
  ESService_GraphManagerPreset,
  ESService_LegendStudioApplicationPlugin,
} from '@finos/legend-extension-external-store-service';
import { ELMorphir_LegendStudioApplicationPlugin } from '@finos/legend-extension-external-language-morphir';
import { DSLExternalFormat_GraphPreset } from '@finos/legend-graph';
import { DSLPersistenceCloud_GraphManagerPreset } from '@finos/legend-extension-dsl-persistence-cloud';
import { EFJSONSchema_GraphManagerPreset } from '@finos/legend-extension-external-format-json-schema';

export class LegendStudioWebApplication {
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
      new DSLText_LegendStudioApplicationPlugin(),
      new DSLDiagram_LegendStudioApplicationPlugin(),
      new DSLDataSpace_LegendStudioApplicationPlugin(),
      new DSLExternalFormat_LegendStudioApplicationPlugin(),
      new DSLPersistence_LegendStudioApplicationPlugin(),
      new ESService_LegendStudioApplicationPlugin(),
      new ELMorphir_LegendStudioApplicationPlugin(),
      // loggers
      new WebConsole(),
    ];
  }

  static run(baseUrl: string): void {
    LegendStudio.create()
      .setup({ baseUrl })
      .withPresets(LegendStudioWebApplication.getPresetCollection())
      .withPlugins(LegendStudioWebApplication.getPluginCollection())
      .start()
      .catch((e: unknown) => {
        throw e;
      });
  }
}
