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
import {
  EDITOR_THEME,
  EDITOR_LANGUAGE,
  MONOSPACED_FONT_FAMILY,
} from '../const';
import type {
  LegendApplicationConfig,
  LegendApplicationConfigurationData,
  LegendApplicationVersionData,
} from '../stores/ApplicationConfig';
import {
  type AbstractPlugin,
  type AbstractPreset,
  assertErrorThrown,
  LogEvent,
  guaranteeNonEmptyString,
  assertNonNullable,
  NetworkClient,
} from '@finos/legend-shared';
import { APPLICATION_LOG_EVENT } from '../stores/ApplicationLogEvent';
import { configureComponents } from '@finos/legend-art';
import type { GraphPluginManager } from '@finos/legend-graph';
import type { LegendApplicationPluginManager } from './LegendApplicationPluginManager';

export abstract class LegendApplicationLogger {
  abstract debug(event: LogEvent, ...data: unknown[]): void;
  abstract info(event: LogEvent, ...data: unknown[]): void;
  abstract warn(event: LogEvent, ...data: unknown[]): void;
  abstract error(event: LogEvent, ...data: unknown[]): void;
}

const { debug, info, warn, error } = console;

export class LegendApplicationWebConsole extends LegendApplicationLogger {
  debug(event: LogEvent, ...data: unknown[]): void {
    debug(
      `[${event.timestamp}] ${event.name} ${data.length ? ':' : ''}`,
      ...data,
    );
  }

  info(event: LogEvent, ...data: unknown[]): void {
    info(
      `[${event.timestamp}] ${event.name} ${data.length ? ':' : ''}`,
      ...data,
    );
  }

  warn(event: LogEvent, ...data: unknown[]): void {
    warn(
      `[${event.timestamp}] ${event.name} ${data.length ? ':' : ''}`,
      ...data,
    );
  }

  error(event: LogEvent, ...data: unknown[]): void {
    error(
      `[${event.timestamp}] ${event.name} ${data.length ? ':' : ''}`,
      ...data,
    );
  }
}

export const setupTextEdtiorAPI = (pluginManager: GraphPluginManager): void => {
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
        .getPureGraphManagerPlugins()
        .flatMap((plugin) => plugin.getExtraPureGrammarKeywords?.() ?? []),
      pluginManager
        .getPureGraphManagerPlugins()
        .flatMap((plugin) => plugin.getExtraPureGrammarParserNames?.() ?? []),
    ),
  );
};

// This is not considered side-effect that hinders tree-shaking because the effectful calls
// are embedded in the function
// See https://sgom.es/posts/2020-06-15-everything-you-never-wanted-to-know-about-side-effects/
export const setupLegendApplicationUILibrary = async (
  pluginManager: GraphPluginManager,
  logger: LegendApplicationLogger,
): Promise<void> => {
  setupTextEdtiorAPI(pluginManager);

  /**
   * Since we use a custom fonts for text-editor, we want to make sure the font is loaded before any text-editor is opened
   * this is to ensure
   */
  const fontLoadFailureErrorMessage = `Monospaced font '${MONOSPACED_FONT_FAMILY}' has not been loaded properly, text editor display problems might occur`;
  await document.fonts
    .load(`1em ${MONOSPACED_FONT_FAMILY}`)
    .then(() => {
      if (document.fonts.check(`1em ${MONOSPACED_FONT_FAMILY}`)) {
        monacoEditorAPI.remeasureFonts();
        logger.info(
          LogEvent.create(APPLICATION_LOG_EVENT.TEXT_EDITOR_FONT_LOADED),
          `Monospaced font '${MONOSPACED_FONT_FAMILY}' has been loaded`,
        );
      } else {
        logger.error(
          LogEvent.create(APPLICATION_LOG_EVENT.APPLICATION_SETUP_FAILURE),
          fontLoadFailureErrorMessage,
        );
      }
    })
    .catch(() =>
      logger.error(
        LogEvent.create(APPLICATION_LOG_EVENT.APPLICATION_SETUP_FAILURE),
        fontLoadFailureErrorMessage,
      ),
    );

  configureMobx({
    // Force state modification to be done via actions
    // See https://github.com/mobxjs/mobx/blob/gh-pages/docs/refguide/api.md#enforceactions
    enforceActions: 'observed',
  });

  configureComponents();
};

export abstract class LegendApplication {
  protected config!: LegendApplicationConfig;
  protected logger!: LegendApplicationLogger;

  protected pluginManager: LegendApplicationPluginManager;
  protected basePresets: AbstractPreset[] = [];
  protected basePlugins: AbstractPlugin[] = [];

  protected baseUrl!: string;
  protected pluginRegister?:
    | ((
        pluginManager: LegendApplicationPluginManager,
        config: LegendApplicationConfig,
      ) => void)
    | undefined;
  protected _isConfigured = false;

  protected constructor(pluginManager: LegendApplicationPluginManager) {
    this.pluginManager = pluginManager;
    this.logger = new LegendApplicationWebConsole();
  }

  setup(options: {
    /** Base URL of the application. e.g. /studio/, /query/ */
    baseUrl: string;
    /**
     * Provide an alternative mechanism to register and configure plugins and presets
     * which is more flexible by allowing configuring specific plugin or preset.
     */
    pluginRegister?: (
      pluginManager: LegendApplicationPluginManager,
      config: LegendApplicationConfig,
    ) => void;
  }): LegendApplication {
    this.baseUrl = guaranteeNonEmptyString(
      options.baseUrl,
      `Can't setup application: 'baseUrl' is missing or empty`,
    );
    this.pluginRegister = options.pluginRegister;
    this._isConfigured = true;
    return this;
  }

  protected withBasePresets(presets: AbstractPreset[]): LegendApplication {
    this.basePresets = presets;
    return this.withPresets([]); // this will reset the preset list and prepend with base presets
  }

  protected withBasePlugins(plugins: AbstractPlugin[]): LegendApplication {
    this.basePlugins = plugins;
    return this.withPlugins([]); // this will reset the plugin list and prepend with base plugins
  }

  withPresets(presets: AbstractPreset[]): LegendApplication {
    this.pluginManager.usePresets([...this.basePresets, ...presets]);
    return this;
  }

  withPlugins(plugins: AbstractPlugin[]): LegendApplication {
    this.pluginManager.usePlugins([...this.basePlugins, ...plugins]);
    return this;
  }

  async fetchApplicationConfiguration(
    baseUrl: string,
  ): Promise<[LegendApplicationConfig, Record<PropertyKey, object>]> {
    const client = new NetworkClient();
    let configData: LegendApplicationConfigurationData | undefined;
    try {
      configData = await client.get<LegendApplicationConfigurationData>(
        `${window.location.origin}${baseUrl}config.json`,
      );
    } catch (error) {
      assertErrorThrown(error);
      this.logger.error(
        LogEvent.create(
          APPLICATION_LOG_EVENT.APPLICATION_CONFIGURATION_FAILURE,
        ),
        error,
      );
    }
    assertNonNullable(
      configData,
      `Can't fetch Legend application configuration`,
    );
    let versionData;
    try {
      versionData = await client.get<LegendApplicationVersionData>(
        `${window.location.origin}${baseUrl}version.json`,
      );
    } catch (error) {
      assertErrorThrown(error);
      this.logger.error(
        LogEvent.create(
          APPLICATION_LOG_EVENT.APPLICATION_CONFIGURATION_FAILURE,
        ),
        error,
      );
    }
    assertNonNullable(versionData, `Can't fetch Legend application version`);
    return [
      await this.configureApplication(configData, versionData, baseUrl),
      (configData.extensions ?? {}) as Record<PropertyKey, object>,
    ];
  }

  protected abstract configureApplication(
    configData: LegendApplicationConfigurationData,
    versionData: LegendApplicationVersionData,
    baseUrl: string,
  ): Promise<LegendApplicationConfig>;

  protected abstract loadApplication(): Promise<void>;

  async start(): Promise<void> {
    assertNonNullable(
      this._isConfigured,
      'Legend application has not been configured properly. Make sure to run setup() before start()',
    );
    try {
      // Fetch application config
      const [config, extensionConfigData] =
        await this.fetchApplicationConfiguration(this.baseUrl);
      this.config = config;

      // Setup plugins
      this.pluginRegister?.(this.pluginManager, this.config);
      this.pluginManager.configure(extensionConfigData);
      this.pluginManager.install();

      await this.loadApplication();

      this.logger.info(
        LogEvent.create(APPLICATION_LOG_EVENT.APPLICATION_LOADED),
        'Legend application loaded',
      );
    } catch (error) {
      assertErrorThrown(error);
      this.logger.error(
        LogEvent.create(APPLICATION_LOG_EVENT.APPLICATION_FAILURE),
        'Failed to load Legend application',
      );
      throw error;
    }
  }
}
