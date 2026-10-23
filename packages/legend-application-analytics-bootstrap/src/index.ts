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
import {
  type AbstractPlugin,
  type AbstractPreset,
  WebConsole,
} from '@finos/legend-shared';

export class LegendAnalyticsWebApplication {
  /**
   * None: a Legend Cube data space source's query builder builds only the
   * light graph of its data space's analytics (PLAN §11.25), its classes,
   * the data space and stubs of its mappings and runtimes, which Legend
   * Analytics' base presets (core, query builder, data space) cover
   */
  static getPresetCollection(): AbstractPreset[] {
    return [];
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
