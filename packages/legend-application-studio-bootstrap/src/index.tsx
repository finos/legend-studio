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
import { DSL_Text_GraphManagerPreset } from '@finos/legend-extension-dsl-text/graph';
import { DSL_Diagram_GraphManagerPreset } from '@finos/legend-extension-dsl-diagram/graph';
import { DSL_DataSpace_GraphManagerPreset } from '@finos/legend-extension-dsl-data-space/graph';
import { DSL_Persistence_GraphManagerPreset } from '@finos/legend-extension-dsl-persistence/graph';
import { DSL_Mastery_GraphManagerPreset } from '@finos/legend-extension-dsl-mastery/graph';
import { STO_ServiceStore_GraphManagerPreset } from '@finos/legend-extension-store-service-store/graph';
import { DSL_Service_LegendStudioApplicationPlugin } from '@finos/legend-extension-dsl-service/application-studio';
import { FMT_JSONSchema_GraphManagerPreset } from '@finos/legend-extension-format-json-schema/graph';
import { FMT_GraphQL_GraphManagerPreset } from '@finos/legend-extension-format-graphql/graph';
import { DSL_Text_LegendStudioApplicationPlugin } from '@finos/legend-extension-dsl-text/application-studio';
import { DSL_Diagram_LegendStudioApplicationPlugin } from '@finos/legend-extension-dsl-diagram/application-studio';
import { DSL_DataSpace_LegendStudioApplicationPlugin } from '@finos/legend-extension-dsl-data-space/application-studio';
import { DSL_Persistence_LegendStudioApplicationPlugin } from '@finos/legend-extension-dsl-persistence/application-studio';
import { DSL_Mastery_LegendStudioApplicationPlugin } from '@finos/legend-extension-dsl-mastery/application-studio';
import { STO_ServiceStore_LegendStudioApplicationPlugin } from '@finos/legend-extension-store-service-store/application-studio';

export class LegendStudioWebApplication {
  static getPresetCollection(): AbstractPreset[] {
    return [
      // graph managers
      new DSL_Text_GraphManagerPreset(),
      new DSL_Diagram_GraphManagerPreset(),
      new DSL_DataSpace_GraphManagerPreset(),
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

      // loggers
      new WebConsole(),
    ];
  }

  static run(baseUrl: string): void {
    LegendStudio.create()
      .setup({ baseAddress: baseUrl })
      .withPresets(LegendStudioWebApplication.getPresetCollection())
      .withPlugins(LegendStudioWebApplication.getPluginCollection())
      .start()
      .catch((e: unknown) => {
        throw e;
      });
  }
}
