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

import { LegendStudio, type LegendStudioPlugin } from '@finos/legend-studio';
import { WebConsole } from '@finos/legend-shared';
import { getLegendGraphExtensionCollection } from '@finos/legend-graph-extension-collection';
import { QueryBuilder_LegendStudioPreset } from '@finos/legend-studio-extension-query-builder';
import { DSLText_LegendStudioPlugin } from '@finos/legend-extension-dsl-text';
import { DSLDiagram_LegendStudioPlugin } from '@finos/legend-extension-dsl-diagram';
import { DSLDataSpace_LegendStudioPlugin } from '@finos/legend-extension-dsl-data-space';
import { DSLPersistence_LegendStudioPlugin } from '@finos/legend-extension-dsl-persistence';
import { ESService_LegendStudioPlugin } from '@finos/legend-extension-external-store-service';
import { ELMorphir_LegendStudioPlugin } from '@finos/legend-extension-external-language-morphir';

export const getLegendStudioPluginCollection = (): LegendStudioPlugin[] => [
  new DSLText_LegendStudioPlugin(),
  new DSLDiagram_LegendStudioPlugin(),
  new DSLDataSpace_LegendStudioPlugin(),
  new DSLPersistence_LegendStudioPlugin(),
  new ESService_LegendStudioPlugin(),
  new ELMorphir_LegendStudioPlugin(),
];

export class LegendStudioWebApplication {
  static run(baseUrl: string): void {
    LegendStudio.create()
      .setup({ baseUrl })
      .withPresets([
        ...getLegendGraphExtensionCollection(),
        new QueryBuilder_LegendStudioPreset(),
      ])
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
