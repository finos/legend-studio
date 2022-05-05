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

import { AbstractPlugin } from '@finos/legend-shared';
import type { LegendQueryPluginManager } from '../application/LegendQueryPluginManager';
import type { QuerySetupState, QuerySetupStore } from './QuerySetupStore';

export type QuerySetupOptionRendererConfiguration = {
  key: string;
  renderer: (setupStore: QuerySetupStore) => React.ReactNode | undefined;
};

export type QuerySetupRenderer = (
  setupState: QuerySetupState,
) => React.ReactNode | undefined;

export abstract class LegendQueryPlugin extends AbstractPlugin {
  /**
   * This helps to better type-checking for this empty abtract type
   * See https://github.com/finos/legend-studio/blob/master/docs/technical/typescript-usage.md#understand-typescript-structual-type-system
   */
  private readonly _$nominalTypeBrand!: 'LegendQueryPlugin';

  install(pluginManager: LegendQueryPluginManager): void {
    pluginManager.registerApplicationPlugin(this);
    pluginManager.registerQueryPlugin(this);
  }

  /**
   * Get the list of renderer configurations for the query setup option.
   */
  getExtraQuerySetupOptionRendererConfigurations?(): QuerySetupOptionRendererConfiguration[];

  /**
   * Get the list of renderers for query setup.
   */
  getExtraQuerySetupRenderers?(): QuerySetupRenderer[];
}
