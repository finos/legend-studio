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

import { LegendApplicationPlugin } from '@finos/legend-application';
import type { LegendREPLPluginManager } from '../application/LegendREPLPluginManager.js';
import { DocumentationKey } from '../application/LegendREPLDocumentation.js';

export abstract class LegendREPLApplicationPlugin extends LegendApplicationPlugin {
  /**
   * This helps to better type-check for this empty abtract type
   * See https://github.com/finos/legend-studio/blob/master/docs/technical/typescript-usage.md#understand-typescript-structual-type-system
   */
  private readonly _$nominalTypeBrand!: 'LegendREPLApplicationPlugin';

  install(pluginManager: LegendREPLPluginManager) {
    pluginManager.registerApplicationPlugin(this);
  }

  override getExtraRequiredDocumentationKeys() {
    return [
      DocumentationKey.DATA_CUBE_EXTENDED_COLUMN_LEVELS,
      DocumentationKey.DATA_CUBE_COLUMN_KINDS,
      DocumentationKey.DATA_CUBE_COLUMN_DISPLAY_AS_LINK,
    ];
  }
}
