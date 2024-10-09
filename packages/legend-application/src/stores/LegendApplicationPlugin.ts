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
import type { KeyedCommandConfigEntry } from './CommandService.js';
import type {
  ContextualDocumentationEntry,
  DocumentationRegistryEntry,
  KeyedDocumentationEntry,
} from './DocumentationService.js';
import type { ColorTheme } from './LayoutService.js';
import type { SettingConfigurationEntry } from './SettingService.js';
import type {
  ApplicationExtensionState,
  GenericLegendApplicationStore,
} from './ApplicationStore.js';

export type ApplicationExtensionStateBuilder = (
  applicationStore: GenericLegendApplicationStore,
) => ApplicationExtensionState | undefined;

export type LegendApplicationSetup = (
  applicationStore: GenericLegendApplicationStore,
) => Promise<void>;

export type ApplicationPageEntry = {
  key: string;
  addressPatterns: string[];
  renderer: () => React.ReactNode;
};

export type VirtualAssistantViewConfiguration = {
  key: string;
  title: string;
  icon?: React.ReactNode | undefined;
  autoExpandOnOpen?: boolean | undefined;
  renderer: () => React.ReactNode | undefined;
};

export abstract class LegendApplicationPlugin extends AbstractPlugin {
  /**
   * Get the list of extension state builders for application store.
   *
   * This is a mechanism to have the store holds references to extension states
   * so that we can refer back to these states when needed or do cross-extensions
   * operations
   */
  getExtraApplicationExtensionStateBuilders?(): ApplicationExtensionStateBuilder[];

  /**
   * Get the list of setup procedures to be run when booting up the application.
   *
   * NOTE: The application will call the setup procedures from all extensions concurrently.
   * These procedures should be idempotent and should not depend on each other.
   * They will be called just before the application is rendered.
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

  /**
   * Get the list of configurations of views for virtual assistant
   */
  getExtraVirtualAssistantViewConfigurations?(): VirtualAssistantViewConfiguration[];
}
