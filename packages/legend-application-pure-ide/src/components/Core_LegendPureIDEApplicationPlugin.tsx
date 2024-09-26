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
  type KeyedCommandConfigEntry,
  type LegendApplicationSetup,
} from '@finos/legend-application';
import packageJson from '../../package.json' with { type: 'json' };
import { LegendPureIDEApplicationPlugin } from '../stores/LegendPureIDEApplicationPlugin.js';
import {
  LEGEND_PURE_IDE_COMMAND_CONFIG,
  LEGEND_PURE_IDE_DIAGRAM_EDITOR_COMMAND_CONFIG,
  LEGEND_PURE_IDE_PURE_FILE_EDITOR_COMMAND_CONFIG,
} from '../__lib__/LegendPureIDECommand.js';
import { PURE_GRAMMAR_DIAGRAM_ELEMENT_TYPE_LABEL } from '../stores/PureFileEditorUtils.js';
import { setupPureLanguageService } from '@finos/legend-code-editor';
import { configureCodeEditorComponent } from '@finos/legend-lego/code-editor';

export class Core_LegendPureIDEApplicationPlugin extends LegendPureIDEApplicationPlugin {
  static NAME = packageJson.extensions.applicationPureIDEPlugin;

  constructor() {
    super(Core_LegendPureIDEApplicationPlugin.NAME, packageJson.version);
  }

  override getExtraApplicationSetups(): LegendApplicationSetup[] {
    return [
      async (applicationStore) => {
        await configureCodeEditorComponent(applicationStore);
        setupPureLanguageService(
          // NOTE: we add these manually because Pure uses a different grammar syntax for DSL diagram than the one in engine
          // also, in this particular case, for convenience, we would consider DSL Diagram as part of core Pure
          {
            extraKeywords: [PURE_GRAMMAR_DIAGRAM_ELEMENT_TYPE_LABEL],
          },
        );
      },
    ];
  }

  override getExtraKeyedCommandConfigEntries(): KeyedCommandConfigEntry[] {
    return [
      LEGEND_PURE_IDE_COMMAND_CONFIG,
      LEGEND_PURE_IDE_PURE_FILE_EDITOR_COMMAND_CONFIG,
      LEGEND_PURE_IDE_DIAGRAM_EDITOR_COMMAND_CONFIG,
    ].flatMap((data) => collectKeyedCommandConfigEntriesFromConfig(data));
  }
}
