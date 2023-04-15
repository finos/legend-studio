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

import packageJson from '../../package.json';
import type { LegendApplicationPluginManager } from '../application/LegendApplicationPluginManager.js';
import { LEGEND_APPLICATION_SETTING_CONFIG } from '../application/LegendApplicationSetting.js';
import {
  HIGH_CONTRAST_LIGHT_COLOR_THEME,
  LEGACY_LIGHT_COLOR_THEME,
} from '../application/LegendApplicationTheme.js';
import type { ColorTheme } from './LayoutService.js';
import {
  LegendApplicationPlugin,
  type LegendApplicationSetup,
} from './LegendApplicationPlugin.js';
import {
  collectSettingConfigurationEntriesFromConfig,
  type SettingConfigurationEntry,
} from './SettingService.js';
import { configure as configureMobx } from 'mobx';
import { KeyCode, KeyMod, editor as monacoEditorAPI } from 'monaco-editor';
import { MONOSPACED_FONT_FAMILY } from '../const.js';
import { LogEvent } from '@finos/legend-shared';
import { APPLICATION_EVENT } from '../application/LegendApplicationEvent.js';
import { configureComponents } from '@finos/legend-art';
import type { GenericLegendApplicationStore } from './ApplicationStore.js';

const configureCodeEditorComponent = async (
  applicationStore: GenericLegendApplicationStore,
): Promise<void> => {
  /**
   * Since we use a custom fonts for text-editor, we want to make sure the font is loaded before any text-editor is opened
   * this is to ensure
   */
  const fontLoadFailureErrorMessage = `Monospaced font '${MONOSPACED_FONT_FAMILY}' has not been loaded properly, text editor display problems might occur`;
  await Promise.all(
    [400, 700].map((weight) =>
      document.fonts.load(`${weight} 1em ${MONOSPACED_FONT_FAMILY}`),
    ),
  )
    .then(() => {
      if (document.fonts.check(`1em ${MONOSPACED_FONT_FAMILY}`)) {
        monacoEditorAPI.remeasureFonts();
        applicationStore.logService.info(
          LogEvent.create(APPLICATION_EVENT.LOAD_TEXT_EDITOR_FONT__SUCCESS),
          `Monospaced font '${MONOSPACED_FONT_FAMILY}' has been loaded`,
        );
      } else {
        applicationStore.logService.error(
          LogEvent.create(APPLICATION_EVENT.APPLICATION_SETUP__FAILURE),
          fontLoadFailureErrorMessage,
        );
      }
    })
    .catch(() =>
      applicationStore.logService.error(
        LogEvent.create(APPLICATION_EVENT.APPLICATION_SETUP__FAILURE),
        fontLoadFailureErrorMessage,
      ),
    );

  // override native hotkeys supported by monaco-editor
  // here we map these keys to a dummy command that would just dispatch the key combination
  // to the application keyboard shortcut service, effectively bypassing the command associated
  // with the native keybinding
  const OVERRIDE_DEFAULT_KEYBINDING_COMMAND =
    'legend.code-editor.override-default-keybinding';
  monacoEditorAPI.registerCommand(
    OVERRIDE_DEFAULT_KEYBINDING_COMMAND,
    (accessor, ...args) => {
      applicationStore.keyboardShortcutsService.dispatch(args[0]);
    },
  );
  const hotkeyMapping: [number, string][] = [
    [KeyCode.F1, 'F1'], // show command center
    [KeyCode.F8, 'F8'], // show error
    [KeyCode.F9, 'F9'], // toggle debugger breakpoint
    [KeyMod.WinCtrl | KeyCode.KeyG, 'Control+KeyG'], // go-to line command
    [KeyMod.WinCtrl | KeyCode.KeyB, 'Control+KeyB'], // cursor move (core command)
    [KeyMod.WinCtrl | KeyCode.KeyO, 'Control+KeyO'], // cursor move (core command)
    [KeyMod.WinCtrl | KeyCode.KeyD, 'Control+KeyD'], // cursor move (core command)
    [KeyMod.WinCtrl | KeyCode.KeyP, 'Control+KeyP'], // cursor move (core command)
    [KeyMod.Shift | KeyCode.F10, 'Shift+F10'], // show editor context menu
    [KeyMod.WinCtrl | KeyCode.F2, 'Control+F2'], // change all instances
    [KeyMod.WinCtrl | KeyCode.F12, 'Control+F12'], // go-to definition
  ];
  monacoEditorAPI.addKeybindingRules(
    hotkeyMapping.map(([nativeCodeEditorKeyBinding, keyCombination]) => ({
      keybinding: nativeCodeEditorKeyBinding,
      command: OVERRIDE_DEFAULT_KEYBINDING_COMMAND,
      commandArgs: keyCombination,
    })),
  );
};

export class Core_LegendApplicationPlugin extends LegendApplicationPlugin {
  static NAME = packageJson.extensions.applicationPlugin;

  constructor() {
    super(Core_LegendApplicationPlugin.NAME, packageJson.version);
  }

  install(
    pluginManager: LegendApplicationPluginManager<LegendApplicationPlugin>,
  ): void {
    pluginManager.registerApplicationPlugin(this);
  }

  override getExtraApplicationSetups(): LegendApplicationSetup[] {
    return [
      async (applicationStore) => {
        // configure `mobx`
        configureMobx({
          // Force state modification to be done via actions
          // Otherwise, warning will be shown in development mode
          // However, no warning will shown in production mode
          // See https://mobx.js.org/configuration.html#enforceactions
          enforceActions: 'observed',
        });

        // configure UI components
        configureComponents();

        // configure code editor
        await configureCodeEditorComponent(applicationStore);
      },
    ];
  }

  override getExtraColorThemes(): ColorTheme[] {
    return [LEGACY_LIGHT_COLOR_THEME, HIGH_CONTRAST_LIGHT_COLOR_THEME];
  }

  override getExtraSettingConfigurationEntries(): SettingConfigurationEntry[] {
    return collectSettingConfigurationEntriesFromConfig(
      LEGEND_APPLICATION_SETTING_CONFIG,
    );
  }
}
