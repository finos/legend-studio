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
  type LegendStudioApplicationPlugin,
} from '@finos/legend-studio';
import { type AbstractPreset, WebConsole } from '@finos/legend-shared';
import { getLegendGraphExtensionCollection } from '@finos/legend-graph-extension-collection';
import { QueryBuilder_LegendStudioApplicationPreset } from '@finos/legend-studio-extension-query-builder';
import { DSLText_LegendStudioApplicationPlugin } from '@finos/legend-extension-dsl-text';
import { DSLDiagram_LegendStudioApplicationPlugin } from '@finos/legend-extension-dsl-diagram';
import { DSLDataSpace_LegendStudioApplicationPlugin } from '@finos/legend-extension-dsl-data-space';
import { DSLPersistence_LegendStudioApplicationPlugin } from '@finos/legend-extension-dsl-persistence';
import { ESService_LegendStudioApplicationPlugin } from '@finos/legend-extension-external-store-service';
import { ELMorphir_LegendStudioApplicationPlugin } from '@finos/legend-extension-external-language-morphir';

export const getLegendStudioPresetCollection = (): AbstractPreset[] => [
  ...getLegendGraphExtensionCollection(),
  new QueryBuilder_LegendStudioApplicationPreset(),
];

export const getLegendStudioPluginCollection =
  (): LegendStudioApplicationPlugin[] => [
    new DSLText_LegendStudioApplicationPlugin(),
    new DSLDiagram_LegendStudioApplicationPlugin(),
    new DSLDataSpace_LegendStudioApplicationPlugin(),
    new DSLExternalFormat_LegendStudioApplicationPlugin(),
    new DSLPersistence_LegendStudioApplicationPlugin(),
    new ESService_LegendStudioApplicationPlugin(),
    new ELMorphir_LegendStudioApplicationPlugin(),
  ];

export class LegendStudioWebApplication {
  static run(baseUrl: string): void {
    LegendStudio.create()
      .setup({ baseUrl })
      .withPresets([...getLegendStudioPresetCollection()])
      .withPlugins([
        ...getLegendStudioPluginCollection(),
        // loggers
        new WebConsole(),
      ])
      .start()
      .catch((e: unknown) => {
        throw e;
      });
  }
}
