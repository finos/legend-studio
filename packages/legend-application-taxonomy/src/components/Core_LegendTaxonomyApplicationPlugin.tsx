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
  collectKeyedCommandConfigEntriesFromConfig,
  LegendApplicationPlugin,
  type KeyedCommandConfigEntry,
  type LegendApplicationPluginManager,
  type LegendApplicationSetup,
} from '@finos/legend-application';
import packageJson from '../../package.json';
import { LEGEND_TAXONOMY_COMMAND_CONFIG } from '../__lib__/LegendTaxonomyCommand.js';
import {
  configureCodeEditorComponent,
  setupPureLanguageService,
} from '@finos/legend-lego/code-editor';

export class Core_LegendTaxonomyApplicationPlugin extends LegendApplicationPlugin {
  static NAME = packageJson.extensions.applicationTaxonomyPlugin;

  constructor() {
    super(Core_LegendTaxonomyApplicationPlugin.NAME, packageJson.version);
  }

  install(
    pluginManager: LegendApplicationPluginManager<LegendApplicationPlugin>,
  ): void {
    pluginManager.registerApplicationPlugin(this);
  }

  override getExtraApplicationSetups(): LegendApplicationSetup[] {
    return [
      async (applicationStore) => {
        await configureCodeEditorComponent(applicationStore);
        setupPureLanguageService({});
      },
    ];
  }

  override getExtraKeyedCommandConfigEntries(): KeyedCommandConfigEntry[] {
    return collectKeyedCommandConfigEntriesFromConfig(
      LEGEND_TAXONOMY_COMMAND_CONFIG,
    );
  }
}
