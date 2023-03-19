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

import { AbstractPlugin } from '@finos/legend-shared';
import type { LegendApplicationPluginManager } from '../application/LegendApplicationPluginManager.js';
import type { KeyedCommandConfigEntry } from './CommandService.js';
import type {
  ContextualDocumentationEntry,
  DocumentationRegistryEntry,
  KeyedDocumentationEntry,
} from './DocumentationService.js';
import type { ColorTheme } from './LayoutService.js';
import type { SettingConfigurationEntry } from './SettingService.js';

export type LegendApplicationSetup = <T extends LegendApplicationPlugin>(
  pluginManager: LegendApplicationPluginManager<T>,
) => Promise<void>;

/**
 * Prefix URL patterns coming from extensions with `/extensions/`
 * to avoid potential conflicts with main routes.
 */
export const generateExtensionUrlPattern = (pattern: string): string =>
  `/extensions/${pattern}`.replace(/^\/extensions\/\//, '/extensions/');

export type ApplicationPageEntry = {
  key: string;
  urlPatterns: string[];
  renderer: React.FC | React.ReactElement;
};

export abstract class LegendApplicationPlugin extends AbstractPlugin {
  /**
   * Get the list of setup procedures to be run when booting up the application.
   *
   * NOTE: The application will call the setup procedures from all extensions concurrently.
   */
  getExtraApplicationSetups?(): LegendApplicationSetup[];

  /**
   * Get the list of application page entries to be rendered.
   */
  getExtraApplicationPageEntries?(): ApplicationPageEntry[];

  /**
   * Get the list of keyed command config entries to be registered.
   */
  getExtraKeyedCommandConfigEntries?(): KeyedCommandConfigEntry[];

  /**
   * Get the list of documentation registry entries from which the application can fetch
   * documentation config data and load the documentation registry
   */
  getExtraDocumentationRegistryEntries?(): DocumentationRegistryEntry[];

  /**
   * Get the list of keyed documentation entries to be registered with documentation service.
   */
  getExtraKeyedDocumentationEntries?(): KeyedDocumentationEntry[];

  /**
   * Get the list of documentation keys whose corresponding documentation entry is required
   * in the application. The documentation registry will be scanned for the presence of these,
   * if they are not available, warnings will be issued.
   */
  getExtraRequiredDocumentationKeys?(): string[];

  /**
   * Get the list of contextual documentation entries to be registered with documentation service.
   */
  getExtraContextualDocumentationEntries?(): ContextualDocumentationEntry[];

  /**
   * Get the list of application context keys for which the application will log event for
   * when their corresponding contexts are accessed
   */
  getExtraAccessEventLoggingApplicationContextKeys?(): string[];

  /**
   * Get the list of color themes
   */
  getExtraColorThemes?(): ColorTheme[];

  /**
   * Get the list of setting configuration entries
   */
  getExtraSettingConfigurationEntries?(): SettingConfigurationEntry[];
}
