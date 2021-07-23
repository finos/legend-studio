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
  LegendApplicationVersionData,
} from '../stores/ApplicationConfig';
import { ApplicationConfig } from '../stores/ApplicationConfig';
import type {
  AbstractPlugin,
  AbstractPluginManager,
  AbstractPreset,
} from '@finos/legend-studio-shared';
import {
  guaranteeNonEmptyString,
  assertNonNullable,
  NetworkClient,
} from '@finos/legend-studio-shared';
import { Logger, CORE_LOG_EVENT } from '../utils/Logger';
import { LegendStudioApplication } from '../components/LegendStudioApplication';
import { PluginManager } from './PluginManager';
import type { DSL_EditorPlugin_Extension } from '../stores/EditorPlugin';

// This is not considered side-effect that hinders tree-shaking because the effectful calls
// are embedded in the function
// See https://sgom.es/posts/2020-06-15-everything-you-never-wanted-to-know-about-side-effects/
export const setupLegendStudioUILibrary = async (
  pluginManager: PluginManager,
): Promise<void> => {
  // Register Pure as a language in `monaco-editor`
  monacoEditorAPI.defineTheme(EDITOR_THEME.LEGEND, theme);
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

  await Promise.all(
    pluginManager
      .getEditorPlugins()
      .flatMap((plugin) => plugin.getExtraEditorPluginSetups?.() ?? [])
      .map((setup) => setup(pluginManager)),
  );
};

export abstract class LegendApplication {
  protected pluginManager: AbstractPluginManager;
  protected baseUrl!: string;
  protected appConfig!: ApplicationConfig;
  protected pluginRegister?: (
    pluginManager: AbstractPluginManager,
    config: ApplicationConfig,
  ) => void;
  protected _isConfigured = false;

  protected constructor(pluginManager: AbstractPluginManager) {
    this.pluginManager = pluginManager;
  }

  setup(options: {
    /** Base URL of the application. e.g. /studio/, /query/ */
    baseUrl: string;
    /**
     * Provide an alternative mechanism to register plugins and presets which is more flexible
     * by allowing configuring specific plugin or preset.
     */
    pluginRegister?: (
      pluginManager: AbstractPluginManager,
      config: ApplicationConfig,
    ) => void;
  }): LegendApplication {
    this.baseUrl = guaranteeNonEmptyString(
      options.baseUrl,
      `Application setup failure: option 'baseUrl' is missing or empty`,
    );
    this.pluginRegister = options.pluginRegister;
    this._isConfigured = true;
    return this;
  }

  withPresets(presets: AbstractPreset[]): LegendApplication {
    this.pluginManager.usePresets(presets);
    return this;
  }

  withPlugins(plugins: AbstractPlugin[]): LegendApplication {
    this.pluginManager.usePlugins(plugins);
    return this;
  }

  async fetchLegendApplicationConfiguration(
    baseUrl: string,
  ): Promise<[ApplicationConfig, Record<PropertyKey, object>]> {
    const client = new NetworkClient();
    const logger = new Logger();
    let configData: ConfigurationData | undefined;
    try {
      configData = await client.get<ConfigurationData>(`${baseUrl}config.json`);
    } catch (error: unknown) {
      logger.error(CORE_LOG_EVENT.CONFIG_CONFIGURATION_FETCHING_PROBLEM, error);
    }
    assertNonNullable(
      configData,
      `Can't fetch Legend application configuration`,
    );
    let versionData;
    try {
      versionData = await client.get<LegendApplicationVersionData>(
        `${baseUrl}version.json`,
      );
    } catch (error: unknown) {
      logger.error(CORE_LOG_EVENT.CONFIG_VERSION_INFO_FETCHING_PROBLEM, error);
    }
    assertNonNullable(versionData, `Can't fetch Legend application version`);
    return [
      new ApplicationConfig(configData, versionData, baseUrl),
      (configData.options ?? {}) as Record<PropertyKey, object>,
    ];
  }

  protected abstract loadApplication(): Promise<void>;

  async start(): Promise<void> {
    assertNonNullable(
      this._isConfigured,
      'Legend application has not been configured properly. Make sure to run setup() before start()',
    );
    const logger = new Logger();
    try {
      // Fetch application config
      const [appConfig, pluginConfigData] =
        await this.fetchLegendApplicationConfiguration(this.baseUrl);
      this.appConfig = appConfig;

      // Setup plugins
      this.pluginRegister?.(this.pluginManager, this.appConfig);
      this.pluginManager.configure(pluginConfigData);
      this.pluginManager.install();

      await this.loadApplication();

      logger.info(
        CORE_LOG_EVENT.APPLICATION_LOADED,
        'Legend application loaded',
      );
    } catch (error: unknown) {
      logger.error(
        CORE_LOG_EVENT.APPLICATION_LOAD_FAILED,
        'Failed to load Legend application',
      );
      throw error;
    }
  }
}

export class LegendStudio extends LegendApplication {
  declare pluginManager: PluginManager;

  static create(): LegendStudio {
    return new LegendStudio(PluginManager.create());
  }

  async loadApplication(): Promise<void> {
    // Setup React application libraries
    await setupLegendStudioUILibrary(this.pluginManager);

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
        <LegendStudioApplication
          config={this.appConfig}
          pluginManager={this.pluginManager}
        />
      </BrowserRouter>,
      root,
    );
  }
}
