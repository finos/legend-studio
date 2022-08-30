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
} from '@finos/legend-application-studio';
import {
  type AbstractPreset,
  type AbstractPlugin,
  WebConsole,
} from '@finos/legend-shared';
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
  DSLMastery_GraphManagerPreset,
  DSLMastery_LegendStudioApplicationPlugin,
} from '@finos/legend-extension-dsl-mastery';
import {
  ESService_GraphManagerPreset,
  ESService_LegendStudioApplicationPlugin,
} from '@finos/legend-extension-external-store-service';
import { ELMorphir_LegendStudioApplicationPlugin } from '@finos/legend-extension-external-language-morphir';
import { DSLExternalFormat_GraphPreset } from '@finos/legend-graph';
import { DSLPersistenceCloud_GraphManagerPreset } from '@finos/legend-extension-dsl-persistence-cloud';
import { EFJSONSchema_GraphManagerPreset } from '@finos/legend-extension-external-format-json-schema';
import { QueryBuilder_LegendStudioApplicationPreset } from '@finos/legend-extension-application-studio-query-builder';

export class LegendStudioWebApplication {
  static getPresetCollection(): AbstractPreset[] {
    return [
      // graph managers
      new DSLDiagram_GraphManagerPreset(),
      new DSLDataSpace_GraphManagerPreset(),
      new DSLExternalFormat_GraphPreset(),
      new DSLPersistence_GraphManagerPreset(),
      new DSLMastery_GraphManagerPreset(),
      new DSLPersistenceCloud_GraphManagerPreset(),
      new EFJSONSchema_GraphManagerPreset(),
      new ESService_GraphManagerPreset(),

      // application
      new QueryBuilder_LegendStudioApplicationPreset(),
    ];
  }

  static getPluginCollection(): AbstractPlugin[] {
    return [
      // application
      new DSLDiagram_LegendStudioApplicationPlugin(),
      new DSLDataSpace_LegendStudioApplicationPlugin(),
      new DSLExternalFormat_LegendStudioApplicationPlugin(),
      new DSLPersistence_LegendStudioApplicationPlugin(),
      new DSLMastery_LegendStudioApplicationPlugin(),
      new ESService_LegendStudioApplicationPlugin(),
      new ELMorphir_LegendStudioApplicationPlugin(),

      // loggers
      new WebConsole(),
    ];
  }

  static run(
    baseUrl: string,
    extraPresets: AbstractPreset[] = [],
    extraPlugins: AbstractPlugin[] = [],
  ): void {
    LegendStudio.create()
      .setup({ baseUrl })
      .withPresets([
        ...LegendStudioWebApplication.getPresetCollection(),
        ...extraPresets,
      ])
      .withPlugins([
        ...LegendStudioWebApplication.getPluginCollection(),
        ...extraPlugins,
      ])
      .start()
      .catch((e: unknown) => {
        throw e;
      });
  }
}
