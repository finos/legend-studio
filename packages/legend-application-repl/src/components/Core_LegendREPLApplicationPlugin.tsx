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

import type { LegendApplicationSetup } from '@finos/legend-application';
import packageJson from '../../package.json' assert { type: 'json' };
import { LegendREPLApplicationPlugin } from '../stores/LegendREPLApplicationPlugin.js';
import {
  configureCodeEditorComponent,
  setupPureLanguageService,
} from '@finos/legend-lego/code-editor';

export class Core_LegendREPLApplicationPlugin extends LegendREPLApplicationPlugin {
  static NAME = packageJson.extensions.applicationREPLPlugin;

  constructor() {
    super(Core_LegendREPLApplicationPlugin.NAME, packageJson.version);
  }

  override getExtraApplicationSetups(): LegendApplicationSetup[] {
    return [
      async (application) => {
        await configureCodeEditorComponent(application);
        setupPureLanguageService();
      },
    ];
  }
}
