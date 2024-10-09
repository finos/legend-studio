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
import { APPLICATION_EVENT } from '../__lib__/LegendApplicationEvent.js';
import type { LegendApplicationPluginManager } from './LegendApplicationPluginManager.js';
import {
  collectKeyedDocumentationEntriesFromConfig,
  type DocumentationEntryData,
  type DocumentationRegistryData,
  type DocumentationRegistryEntry,
} from '../stores/DocumentationService.js';
import type { LegendApplicationPlugin } from '../stores/LegendApplicationPlugin.js';
import {
  ApplicationStore,
  type GenericLegendApplicationStore,
} from '../stores/ApplicationStore.js';
import { registerDownloadHelperServiceWorker } from '../util/DownloadHelperServiceWorker.js';
import type { VersionReleaseNotes } from '../stores/ReleaseNotesService.js';

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

export interface LegendApplicationConfigurationInput<
  T extends LegendApplicationConfigurationData,
> {
  baseAddress?: string;
  configData: T;
  versionData: LegendApplicationVersionData;
  docEntries?: Record<string, DocumentationEntryData>;
}

export abstract class LegendApplication {
  protected config!: LegendApplicationConfig;
  protected logger!: LegendApplicationLogger;

  protected pluginManager: LegendApplicationPluginManager<LegendApplicationPlugin>;
  protected basePresets: AbstractPreset[] = [];
  protected basePlugins: AbstractPlugin[] = [];

  protected baseAddress!: string;
  protected pluginRegister?:
    | ((
        pluginManager: LegendApplicationPluginManager<LegendApplicationPlugin>,
        config: LegendApplicationConfig,
      ) => void)
    | undefined;
  protected _isConfigured = false;

  protected downloadHelperServiceWorkerPath: string | undefined;
  protected downloadHelper = false;

  protected releaseNotes: VersionReleaseNotes[] | undefined;

  protected constructor(
    pluginManager: LegendApplicationPluginManager<LegendApplicationPlugin>,
  ) {
    this.pluginManager = pluginManager;
    this.logger = new LegendApplicationWebConsole();
  }

  setup(options: {
    /** Base URL of the application. e.g. /studio/, /query/ */
    baseAddress: string;
    /**
     * Provide an alternative mechanism to register and configure plugins and presets
     * which is more flexible by allowing configuring specific plugin or preset.
     */
    pluginRegister?: (
      pluginManager: LegendApplicationPluginManager<LegendApplicationPlugin>,
      config: LegendApplicationConfig,
    ) => void;
  }): LegendApplication {
    this.baseAddress = guaranteeNonEmptyString(
      options.baseAddress,
      `Can't setup application: 'baseAddress' is missing or empty`,
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

  withDownloadHelper(path?: string | undefined): LegendApplication {
    this.downloadHelper = true;
    this.downloadHelperServiceWorkerPath = path;
    return this;
  }

  withReleaseNotes(releaseNotes: VersionReleaseNotes[]): LegendApplication {
    this.releaseNotes = releaseNotes;
    return this;
  }

  setupApplicationStore(store: GenericLegendApplicationStore): void {
    if (this.releaseNotes) {
      store.releaseNotesService.configure(this.releaseNotes);
    }
  }

  async fetchApplicationConfiguration(): Promise<
    [LegendApplicationConfig, ExtensionsConfigurationData]
  > {
    const client = new NetworkClient();

    // app config
    let configData: LegendApplicationConfigurationData | undefined;
    try {
      configData = await client.get<LegendApplicationConfigurationData>(
        `${window.location.origin}${this.baseAddress}config.json`,
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
        `${window.location.origin}${this.baseAddress}version.json`,
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
        baseAddress: this.baseAddress,
      }),
      configData.extensions ?? {},
    ];
  }

  async loadDocumentationRegistryData(
    config: LegendApplicationConfig,
  ): Promise<void> {
    const entries: Record<string, DocumentationEntryData> = {};

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
            LogEvent.create(APPLICATION_EVENT.DOCUMENTATION_FETCH__FAILURE),
            error,
          );
        }
      }),
    );

    // NOTE: config entries will override
    (config as Writable<LegendApplicationConfig>).keyedDocumentationEntries = [
      ...collectKeyedDocumentationEntriesFromConfig(entries),
      ...config.keyedDocumentationEntries,
    ];
  }

  protected abstract configureApplication(
    input: LegendApplicationConfigurationInput<LegendApplicationConfigurationData>,
  ): Promise<LegendApplicationConfig>;

  protected abstract loadApplication(
    applicationStore: ApplicationStore<
      LegendApplicationConfig,
      LegendApplicationPluginManager<LegendApplicationPlugin>
    >,
  ): Promise<void>;

  async start(): Promise<void> {
    assertNonNullable(
      this._isConfigured,
      'Legend application has not been configured properly. Make sure to run setup() before start()',
    );
    try {
      // fetch application config
      const [config, extensionConfigData] =
        await this.fetchApplicationConfiguration();
      this.config = config;

      // setup plugins
      this.pluginRegister?.(this.pluginManager, this.config);
      this.pluginManager.configure(extensionConfigData);
      this.pluginManager.install();

      // other setups
      await Promise.all(
        // NOTE: to be done in parallel to save time
        [this.loadDocumentationRegistryData(config)],
      );

      // setup application store
      const applicationStore = new ApplicationStore(
        this.config,
        this.pluginManager,
      );
      await Promise.all(
        this.pluginManager
          .getApplicationPlugins()
          .flatMap((plugin) => plugin.getExtraApplicationSetups?.() ?? [])
          .map((setup) => setup(applicationStore)),
      );

      // set up application
      this.setupApplicationStore(applicationStore);

      // load application
      await this.loadApplication(applicationStore);

      this.logger.info(
        LogEvent.create(APPLICATION_EVENT.APPLICATION_LOAD__SUCCESS),
        'Legend application loaded',
      );
      if (this.downloadHelper) {
        registerDownloadHelperServiceWorker(
          this.downloadHelperServiceWorkerPath,
        );
      }
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

export const LEGEND_APPLICATION_ROOT_ELEMENT_TAG = 'legend-application-root';

// NOTE: we use a special tag to mount the application to avoid styling conflicts
export const getApplicationRootElement = (): Element => {
  let rootEl = document.getElementsByTagName(
    LEGEND_APPLICATION_ROOT_ELEMENT_TAG,
  ).length
    ? document.getElementsByTagName(LEGEND_APPLICATION_ROOT_ELEMENT_TAG)[0]
    : undefined;
  if (!rootEl) {
    rootEl = document.createElement(LEGEND_APPLICATION_ROOT_ELEMENT_TAG);
    document.body.appendChild(rootEl);
  }
  rootEl.setAttribute('style', 'height: 100%; width: 100%; display: block');
  return rootEl;
};
