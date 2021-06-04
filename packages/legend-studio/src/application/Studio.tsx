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

import ReactDOM from 'react-dom';
import { BrowserRouter } from 'react-router-dom';
import { configure as configureReactHotkeys } from 'react-hotkeys';
import { configure as configureMobx } from 'mobx';
import {
  editor as monacoEditorAPI,
  languages as monacoLanguagesAPI,
} from 'monaco-editor';
import {
  configuration,
  generateLanguageMonarch,
  theme,
} from '../stores/PureLanguageSupport';
import { EDITOR_THEME, EDITOR_LANGUAGE } from '../stores/EditorConfig';
import type {
  ConfigurationData,
  VersionData,
} from '../stores/ApplicationConfig';
import { ApplicationConfig } from '../stores/ApplicationConfig';
import type {
  AbstractPlugin,
  AbstractPreset,
} from '@finos/legend-studio-shared';
import {
  guaranteeNonEmptyString,
  assertNonNullable,
  NetworkClient,
} from '@finos/legend-studio-shared';
import { Logger, CORE_LOG_EVENT } from '../utils/Logger';
import { App } from '../components/App';
import { ModuleRegistry as agGrid_ModuleRegistry } from '@ag-grid-community/core';
import { ClientSideRowModelModule } from '@ag-grid-community/client-side-row-model';
import { PluginManager } from './PluginManager';
import type { DSL_EditorPlugin_Extension } from '../stores/EditorPlugin';

// This is not considered side-effect that hinders tree-shaking because the effectful calls
// are embedded in the function
// See https://sgom.es/posts/2020-06-15-everything-you-never-wanted-to-know-about-side-effects/
const setupReactApp = (pluginManager: PluginManager): void => {
  // Register module extensions for `ag-grid`
  agGrid_ModuleRegistry.registerModules([ClientSideRowModelModule]);

  // Register Pure as a language in `monaco-editor`
  monacoEditorAPI.defineTheme(EDITOR_THEME.STUDIO, theme);
  monacoLanguagesAPI.register({ id: EDITOR_LANGUAGE.PURE });
  monacoLanguagesAPI.setLanguageConfiguration(
    EDITOR_LANGUAGE.PURE,
    configuration,
  );
  monacoLanguagesAPI.setMonarchTokensProvider(
    EDITOR_LANGUAGE.PURE,
    generateLanguageMonarch(
      pluginManager
        .getEditorPlugins()
        .flatMap(
          (plugin) =>
            (
              plugin as DSL_EditorPlugin_Extension
            ).getExtraPureGrammarKeywords?.() ?? [],
        ),
      pluginManager
        .getEditorPlugins()
        .flatMap(
          (plugin) =>
            (
              plugin as DSL_EditorPlugin_Extension
            ).getExtraPureGrammarParserNames?.() ?? [],
        ),
    ),
  );

  configureMobx({
    // Force state modification to be done via actions
    // See https://github.com/mobxjs/mobx/blob/gh-pages/docs/refguide/api.md#enforceactions
    enforceActions: 'observed',
  });

  configureReactHotkeys({
    // By default, `react-hotkeys` will avoid capturing keys from input tags like <input>, <textarea>, <select>
    // We want to listen to hotkey from every where in the app so we disable that
    // See https://github.com/greena13/react-hotkeys#ignoring-events
    ignoreTags: [],
  });

  /**
   * The following block is needed to inject `react-reflex` styling during development
   * as HMR makes stylesheet loaded after layout calculation, throwing off `react-reflex`
   * See https://github.com/leefsmp/Re-Flex/issues/27#issuecomment-718949629
   */
  // eslint-disable-next-line no-process-env
  if (process.env.NODE_ENV === 'development') {
    const stylesheet = document.createElement('style');
    stylesheet.innerHTML = `
        /* For development, this needs to be injected before stylesheet, else \`react-reflex\` panel dimension calculation will be off */
        .reflex-container { height: 100%; width: 100%; }
        /* NOTE: we have to leave the min dimension as \`0.1rem\` to avoid re-calculation bugs due to HMR style injection order */
        .reflex-container.horizontal { flex-direction: column; min-height: 0.1rem; }
        .reflex-container.vertical { flex-direction: row; min-width: 0.1rem; }
        .reflex-container > .reflex-element { height: 100%; width: 100%; }
      `;
    document.head.prepend(stylesheet);
  }
};

const fetchConfiguration = async (
  baseUrl: string,
): Promise<[ApplicationConfig, Record<PropertyKey, object>]> => {
  const client = new NetworkClient();
  const logger = new Logger();
  let configData: ConfigurationData | undefined;
  try {
    configData = await client.get<ConfigurationData>(`${baseUrl}config.json`);
  } catch (error: unknown) {
    logger.error(CORE_LOG_EVENT.CONFIG_CONFIGURATION_FETCHING_PROBLEM, error);
  }
  assertNonNullable(configData, `Can't fetch application configuration`);
  let versionData;
  try {
    versionData = await client.get<VersionData>(`${baseUrl}version.json`);
  } catch (error: unknown) {
    logger.error(CORE_LOG_EVENT.CONFIG_VERSION_INFO_FETCHING_PROBLEM, error);
  }
  assertNonNullable(versionData, `Can't fetch application version`);
  return [
    new ApplicationConfig(configData, versionData, baseUrl),
    (configData.options ?? {}) as Record<PropertyKey, object>,
  ];
};

export class Studio {
  private pluginManager = PluginManager.create();
  private baseUrl!: string;
  private pluginRegister?: (
    pluginManager: PluginManager,
    config: ApplicationConfig,
  ) => void;
  private _isConfigured = false;
  private constructor() {
    // do nothing
  }

  static create(): Studio {
    return new Studio();
  }

  setup(options: {
    /** Base URL of the application. e.g. /studio/ */
    baseUrl: string;
    /**
     * Provide an alternative mechanism to register plugins and presets which is more flexible
     * by allowing configuring specific plugin or preset.
     */
    pluginRegister?: (
      pluginManager: PluginManager,
      config: ApplicationConfig,
    ) => void;
  }): Studio {
    this.baseUrl = guaranteeNonEmptyString(
      options.baseUrl,
      `Application setup failure: option 'baseUrl' is missing or empty`,
    );
    this.pluginRegister = options.pluginRegister;
    this._isConfigured = true;
    return this;
  }

  withPresets(presets: AbstractPreset[]): Studio {
    this.pluginManager.usePresets(presets);
    return this;
  }

  withPlugins(plugins: AbstractPlugin[]): Studio {
    this.pluginManager.usePlugins(plugins);
    return this;
  }

  async start(): Promise<void> {
    assertNonNullable(
      this._isConfigured,
      'Application has not been configured properly. Make sure to run setup() before start()',
    );
    const logger = new Logger();
    try {
      // Fetch application config
      const [appConfig, pluginConfigData] = await fetchConfiguration(
        this.baseUrl,
      );

      // Setup plugins
      this.pluginRegister?.(this.pluginManager, appConfig);
      this.pluginManager.configure(pluginConfigData);
      this.pluginManager.install();

      // Setup React application libraries
      setupReactApp(this.pluginManager);

      // Render React application
      const root = ((): Element => {
        let rootEl = document.getElementsByTagName('root').length
          ? document.getElementsByTagName('root')[0]
          : undefined;
        if (!rootEl) {
          rootEl = document.createElement('root');
          document.body.appendChild(rootEl);
        }
        return rootEl;
      })();

      ReactDOM.render(
        // TODO: would be great if we can have <React.StrictMode> here but since Mobx React is not ready for
        // concurrency yet, we would have to wait until @next become official
        // See https://github.com/mobxjs/mobx-react-lite/issues/53
        <BrowserRouter basename={this.baseUrl}>
          <App config={appConfig} pluginManager={this.pluginManager} />
        </BrowserRouter>,
        root,
      );

      logger.info(CORE_LOG_EVENT.APPLICATION_LOADED, 'Application loaded');
    } catch (error: unknown) {
      logger.error(
        CORE_LOG_EVENT.APPLICATION_LOAD_FAILED,
        'Failed to load application',
      );
      throw error;
    }
  }
}
