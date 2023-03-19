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
  DSL_ExternalFormat_LegendStudioApplicationPlugin,
} from '@finos/legend-application-studio';
import {
  type AbstractPreset,
  type AbstractPlugin,
  WebConsole,
} from '@finos/legend-shared';
import {
  DSL_Text_GraphManagerPreset,
  DSL_Text_LegendStudioApplicationPlugin,
} from '@finos/legend-extension-dsl-text';
import {
  DSL_Diagram_GraphManagerPreset,
  DSL_Diagram_LegendStudioApplicationPlugin,
} from '@finos/legend-extension-dsl-diagram';
import {
  DSL_DataSpace_GraphManagerPreset,
  DSL_DataSpace_LegendStudioApplicationPlugin,
} from '@finos/legend-extension-dsl-data-space';
import {
  DSL_Persistence_GraphManagerPreset,
  DSL_Persistence_LegendStudioApplicationPlugin,
} from '@finos/legend-extension-dsl-persistence';
import {
  DSL_Mastery_GraphManagerPreset,
  DSL_Mastery_LegendStudioApplicationPlugin,
} from '@finos/legend-extension-dsl-mastery';
import {
  STO_ServiceStore_GraphManagerPreset,
  STO_ServiceStore_LegendStudioApplicationPlugin,
} from '@finos/legend-extension-store-service-store';
import { FMT_Morphir_LegendStudioApplicationPlugin } from '@finos/legend-extension-format-morphir';
import { DSL_ExternalFormat_GraphPreset } from '@finos/legend-graph';
import { FMT_JSONSchema_GraphManagerPreset } from '@finos/legend-extension-format-json-schema';
import { DSL_Service_LegendStudioApplicationPlugin } from '@finos/legend-extension-dsl-service';
import { FMT_GraphQL_GraphManagerPreset } from '@finos/legend-extension-format-graphql';

export class LegendStudioWebApplication {
  static getPresetCollection(): AbstractPreset[] {
    return [
      // graph managers
      new DSL_Text_GraphManagerPreset(),
      new DSL_Diagram_GraphManagerPreset(),
      new DSL_DataSpace_GraphManagerPreset(),
      new DSL_ExternalFormat_GraphPreset(),
      new DSL_Persistence_GraphManagerPreset(),
      new DSL_Mastery_GraphManagerPreset(),
      new FMT_JSONSchema_GraphManagerPreset(),
      new STO_ServiceStore_GraphManagerPreset(),
      new FMT_GraphQL_GraphManagerPreset(),
    ];
  }

  static getPluginCollection(): AbstractPlugin[] {
    return [
      // application
      new DSL_Text_LegendStudioApplicationPlugin(),
      new DSL_Diagram_LegendStudioApplicationPlugin(),
      new DSL_DataSpace_LegendStudioApplicationPlugin(),
      new DSL_Service_LegendStudioApplicationPlugin(),
      new DSL_ExternalFormat_LegendStudioApplicationPlugin(),
      new DSL_Persistence_LegendStudioApplicationPlugin(),
      new DSL_Mastery_LegendStudioApplicationPlugin(),
      new STO_ServiceStore_LegendStudioApplicationPlugin(),
      new FMT_Morphir_LegendStudioApplicationPlugin(),

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
