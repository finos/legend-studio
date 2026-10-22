/**
 * Copyright (c) 2026-present, Goldman Sachs
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

import { LegendAnalytics } from '@finos/legend-application-analytics';
import { Assortment_GraphManagerPreset } from '@finos/legend-extension-assortment/graph';
import { DSL_DataQuality_GraphManagerPreset } from '@finos/legend-extension-dsl-data-quality/graph';
import { DSL_Diagram_GraphManagerPreset } from '@finos/legend-extension-dsl-diagram/graph';
import { DSL_Persistence_GraphManagerPreset } from '@finos/legend-extension-dsl-persistence/graph';
import { DSL_Text_GraphManagerPreset } from '@finos/legend-extension-dsl-text/graph';
import { STO_ServiceStore_GraphManagerPreset } from '@finos/legend-extension-store-service-store/graph';
import {
  type AbstractPlugin,
  type AbstractPreset,
  WebConsole,
} from '@finos/legend-shared';

export class LegendAnalyticsWebApplication {
  /**
   * The graph managers of the elements a project can hold, as Legend Query
   * registers them: a Legend Cube data space source's query builder builds
   * the data space's project (PLAN §11.25). The data space's own is a base
   * preset of Legend Analytics.
   */
  static getPresetCollection(): AbstractPreset[] {
    return [
      new Assortment_GraphManagerPreset(),
      new DSL_Text_GraphManagerPreset(),
      new DSL_Diagram_GraphManagerPreset(),
      new DSL_Persistence_GraphManagerPreset(),
      new STO_ServiceStore_GraphManagerPreset(),
      new DSL_DataQuality_GraphManagerPreset(),
    ];
  }

  static getPluginCollection(): AbstractPlugin[] {
    return [
      // loggers
      new WebConsole(),
    ];
  }

  /** Cube downloads its files itself (data URIs), so no download helper service worker is registered */
  static run(baseUrl: string): void {
    LegendAnalytics.create()
      .setup({ baseAddress: baseUrl })
      .withPresets(LegendAnalyticsWebApplication.getPresetCollection())
      .withPlugins(LegendAnalyticsWebApplication.getPluginCollection())
      .start()
      .catch((e: unknown) => {
        throw e;
      });
  }
}
