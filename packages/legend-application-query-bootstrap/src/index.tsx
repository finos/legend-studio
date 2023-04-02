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

import { LegendQuery } from '@finos/legend-application-query';
import {
  type AbstractPreset,
  type AbstractPlugin,
  WebConsole,
} from '@finos/legend-shared';
import {
  DSL_DataSpace_GraphManagerPreset,
  DSL_DataSpace_LegendQueryApplicationPlugin,
  DSL_DataSpace_LegendApplicationPlugin,
} from '@finos/legend-extension-dsl-data-space';
import { DSL_Text_GraphManagerPreset } from '@finos/legend-extension-dsl-text';
import { DSL_Diagram_GraphManagerPreset } from '@finos/legend-extension-dsl-diagram';
import { STO_ServiceStore_GraphManagerPreset } from '@finos/legend-extension-store-service-store';
import { DSL_Persistence_GraphManagerPreset } from '@finos/legend-extension-dsl-persistence';
import { DSL_Mastery_GraphManagerPreset } from '@finos/legend-extension-dsl-mastery';
import { DSL_Service_LegendQueryApplicationPlugin } from '@finos/legend-extension-dsl-service';
import { FMT_JSONSchema_GraphManagerPreset } from '@finos/legend-extension-format-json-schema';
import { FMT_GraphQL_GraphManagerPreset } from '@finos/legend-extension-format-graphql';
import { FMT_Avro_GraphManagerPreset } from '@finos/legend-extension-format-avro';

export class LegendQueryWebApplication {
  static getPresetCollection(): AbstractPreset[] {
    return [
      // graph managers
      new DSL_Text_GraphManagerPreset(),
      new DSL_Diagram_GraphManagerPreset(),
      new DSL_DataSpace_GraphManagerPreset(),
      new DSL_Persistence_GraphManagerPreset(),
      new DSL_Mastery_GraphManagerPreset(),
      new STO_ServiceStore_GraphManagerPreset(),
      new FMT_JSONSchema_GraphManagerPreset(),
      new FMT_GraphQL_GraphManagerPreset(),
      new FMT_Avro_GraphManagerPreset(),
    ];
  }

  static getPluginCollection(): AbstractPlugin[] {
    return [
      // application
      new DSL_Service_LegendQueryApplicationPlugin(),
      new DSL_DataSpace_LegendQueryApplicationPlugin(),

      // loggers
      new WebConsole(),
      // generic dataspace plugin
      new DSL_DataSpace_LegendApplicationPlugin(),
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
