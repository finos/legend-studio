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

import packageJson from '../../package.json' with { type: 'json' };
import type { LegendApplicationSetup } from '@finos/legend-application';
import { setupPureLanguageService } from '@finos/legend-code-editor';
import { configureCodeEditorComponent } from '@finos/legend-lego/code-editor';
import { LegendAnalyticsApplicationPlugin } from './LegendAnalyticsApplicationPlugin.js';

export class Core_LegendAnalyticsApplicationPlugin extends LegendAnalyticsApplicationPlugin {
  static NAME = packageJson.extensions.applicationAnalyticsPlugin;

  constructor() {
    super(Core_LegendAnalyticsApplicationPlugin.NAME, packageJson.version);
  }

  /** The code editor, which Cube's expression editors, SQL and spec dialogs use, as Legend Query sets it up */
  override getExtraApplicationSetups(): LegendApplicationSetup[] {
    return [
      async (applicationStore) => {
        await configureCodeEditorComponent(applicationStore);
        setupPureLanguageService({});
      },
    ];
  }
}
