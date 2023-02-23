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
import { editor as monacoEditorAPI } from 'monaco-editor';
import { MONOSPACED_FONT_FAMILY } from '../const.js';
import type {
  LegendApplicationConfig,
  LegendApplicationConfigurationData,
  LegendApplicationVersionData,
} from './LegendApplicationConfig.js';
import {
  type AbstractPlugin,
  type AbstractPreset,
  assertErrorThrown,
  LogEvent,
  guaranteeNonEmptyString,
  assertNonNullable,
  NetworkClient,
  type Writable,
  type ExtensionsConfigurationData,
  createRegExpPatternFromWildcardPattern,
} from '@finos/legend-shared';
import { APPLICATION_EVENT } from '../stores/ApplicationEvent.js';
import { configureComponents } from '@finos/legend-art';
import type { GraphManagerPluginManager } from '@finos/legend-graph';
import type { LegendApplicationPluginManager } from './LegendApplicationPluginManager.js';
import { setupPureLanguageService } from '../stores/PureLanguageSupport.js';
import {
  collectKeyedDocumnetationEntriesFromConfig,
  type DocumentationConfigEntry,
  type DocumentationRegistryData,
  type DocumentationRegistryEntry,
} from '../stores/DocumentationService.js';
import type { LegendApplicationPlugin } from '../stores/LegendApplicationPlugin.js';

export abstract class LegendApplicationLogger {
  abstract debug(event: LogEvent, ...data: unknown[]): void;
  abstract info(event: LogEvent, ...data: unknown[]): void;
  abstract warn(event: LogEvent, ...data: unknown[]): void;
  abstract error(event: LogEvent, ...data: unknown[]): void;
}

export class LegendApplicationWebConsole extends LegendApplicationLogger {
  debug(event: LogEvent, ...data: unknown[]): void {
    // eslint-disable-next-line no-console
    console.debug(
      `[${event.timestamp}] ${event.name} ${data.length ? ':' : ''}`,
      ...data,
    );
  }

  info(event: LogEvent, ...data: unknown[]): void {
    // eslint-disable-next-line no-console
    console.info(
      `[${event.timestamp}] ${event.name} ${data.length ? ':' : ''}`,
      ...data,
    );
  }

  warn(event: LogEvent, ...data: unknown[]): void {
    // eslint-disable-next-line no-console
    console.warn(
      `[${event.timestamp}] ${event.name} ${data.length ? ':' : ''}`,
      ...data,
    );
  }

  error(event: LogEvent, ...data: unknown[]): void {
    // eslint-disable-next-line no-console
    console.error(
      `[${event.timestamp}] ${event.name} ${data.length ? ':' : ''}`,
      ...data,
    );
  }
}

// This is not considered side-effect that hinders tree-shaking because the effectful calls
// are embedded in the function
// See https://sgom.es/posts/2020-06-15-everything-you-never-wanted-to-know-about-side-effects/
export const setupLegendApplicationUILibrary = async (
  pluginManager: GraphManagerPluginManager,
  logger: LegendApplicationLogger,
): Promise<void> => {
  setupPureLanguageService(pluginManager);

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
        logger.info(
          LogEvent.create(APPLICATION_EVENT.LOAD_TEXT_EDITOR_FONT__SUCCESS),
          `Monospaced font '${MONOSPACED_FONT_FAMILY}' has been loaded`,
        );
      } else {
        logger.error(
          LogEvent.create(APPLICATION_EVENT.APPLICATION_SETUP__FAILURE),
          fontLoadFailureErrorMessage,
        );
      }
    })
    .catch(() =>
      logger.error(
        LogEvent.create(APPLICATION_EVENT.APPLICATION_SETUP__FAILURE),
        fontLoadFailureErrorMessage,
      ),
    );

  configureMobx({
    // Force state modification to be done via actions
    // Otherwise, warning will be shown in development mode
    // However, no warning will shown in production mode
    // See https://mobx.js.org/configuration.html#enforceactions
    enforceActions: 'observed',
  });

  configureComponents();
};

export interface LegendApplicationConfigurationInput<
  T extends LegendApplicationConfigurationData,
> {
  baseUrl: string;
  configData: T;
  versionData: LegendApplicationVersionData;
  docEntries?: Record<string, DocumentationConfigEntry>;
}

export abstract class LegendApplication {
  protected config!: LegendApplicationConfig;
  protected logger!: LegendApplicationLogger;

  protected pluginManager: LegendApplicationPluginManager<LegendApplicationPlugin>;
  protected basePresets: AbstractPreset[] = [];
  protected basePlugins: AbstractPlugin[] = [];

  protected baseUrl!: string;
  protected pluginRegister?:
    | ((
        pluginManager: LegendApplicationPluginManager<LegendApplicationPlugin>,
        config: LegendApplicationConfig,
      ) => void)
    | undefined;
  protected _isConfigured = false;

  protected constructor(
    pluginManager: LegendApplicationPluginManager<LegendApplicationPlugin>,
  ) {
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
      pluginManager: LegendApplicationPluginManager<LegendApplicationPlugin>,
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
  ): Promise<[LegendApplicationConfig, ExtensionsConfigurationData]> {
    const client = new NetworkClient();

    // app config
    let configData: LegendApplicationConfigurationData | undefined;
    try {
      configData = await client.get<LegendApplicationConfigurationData>(
        `${window.location.origin}${baseUrl}config.json`,
      );
    } catch (error) {
      assertErrorThrown(error);
      this.logger.error(
        LogEvent.create(APPLICATION_EVENT.APPLICATION_CONFIGURATION__FAILURE),
        error,
      );
    }
    assertNonNullable(
      configData,
      `Can't fetch Legend application configuration`,
    );

    // app version
    let versionData;
    try {
      versionData = await client.get<LegendApplicationVersionData>(
        `${window.location.origin}${baseUrl}version.json`,
      );
    } catch (error) {
      assertErrorThrown(error);
      this.logger.error(
        LogEvent.create(APPLICATION_EVENT.APPLICATION_CONFIGURATION__FAILURE),
        error,
      );
    }
    assertNonNullable(versionData, `Can't fetch Legend application version`);

    return [
      await this.configureApplication({
        configData,
        versionData,
        baseUrl,
      }),
      configData.extensions ?? {},
    ];
  }

  async loadDocumentationRegistryData(
    config: LegendApplicationConfig,
  ): Promise<void> {
    const entries: Record<string, DocumentationConfigEntry> = {};

    await Promise.all(
      [
        ...config.documentationRegistryEntries,
        ...this.pluginManager
          .getApplicationPlugins()
          .flatMap(
            (plugin) => plugin.getExtraDocumentationRegistryEntries?.() ?? [],
          ),
      ].map(async (entry: DocumentationRegistryEntry) => {
        try {
          const client = new NetworkClient(
            entry.simple
              ? {
                  /**
                   * NOTE: see the documentation for `simple` flag {@link DocumentationRegistryEntry}
                   * here, basically, we expect to fetch just the JSON from an endpoint where `Access-Control-Allow-Origin", "*"` is set
                   * as such, we must not include the credential in our request
                   * See https://stackoverflow.com/questions/19743396/cors-cannot-use-wildcard-in-access-control-allow-origin-when-credentials-flag-i
                   */
                  options: {
                    credentials: 'omit',
                  },
                }
              : {},
          );
          const docData = await client.get<DocumentationRegistryData>(
            guaranteeNonEmptyString(
              entry.url,
              `Can't load documentation registry: 'url' field is missing or empty`,
            ),
          );
          assertNonNullable(
            docData.entries,
            `Can't load documentation registry data: 'entries' field is missing`,
          );

          const patterns = entry.includes?.map((filter) =>
            createRegExpPatternFromWildcardPattern(filter),
          );
          Object.entries(docData.entries).forEach(([key, docEntry]) => {
            if (!patterns || patterns.some((pattern) => pattern.test(key))) {
              // NOTE: entries will NOT override
              if (!entries[key]) {
                entries[key] = docEntry;
              }
            }
          });
        } catch (error) {
          assertErrorThrown(error);
          this.logger.warn(
            LogEvent.create(
              APPLICATION_EVENT.APPLICATION_DOCUMENTATION_FETCH__FAILURE,
            ),
            error,
          );
        }
      }),
    );

    // NOTE: config entries will override
    (config as Writable<LegendApplicationConfig>).keyedDocumentationEntries = [
      ...collectKeyedDocumnetationEntriesFromConfig(entries),
      ...config.keyedDocumentationEntries,
    ];
  }

  protected abstract configureApplication(
    input: LegendApplicationConfigurationInput<LegendApplicationConfigurationData>,
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

      // Other setups
      await Promise.all(
        // NOTE: to be done in parallel to save time
        [this.loadDocumentationRegistryData(config)],
      );

      await this.loadApplication();
      await Promise.all(
        this.pluginManager
          .getApplicationPlugins()
          .flatMap((plugin) => plugin.getExtraApplicationSetups?.() ?? [])
          .map((setup) => setup(this.pluginManager)),
      );

      this.logger.info(
        LogEvent.create(APPLICATION_EVENT.APPLICATION_LOAD__SUCCESS),
        'Legend application loaded',
      );
    } catch (error) {
      assertErrorThrown(error);
      this.logger.error(
        LogEvent.create(APPLICATION_EVENT.APPLICATION_LOAD__FAILURE),
        'Failed to load Legend application',
      );
      throw error;
    }
  }
}
