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
  guaranteeNonEmptyString,
  guaranteeNonNullable,
} from '@finos/legend-shared';
import type { LegendApplicationConfigurationInput } from './LegendApplication.js';
import {
  collectKeyedDocumnetationEntriesFromConfig,
  collectContextualDocumnetationEntries,
  type KeyedDocumentationEntry,
  type DocumentationConfigEntry,
  type ContextualDocumentationConfig,
  type ContextualDocumentationEntry,
  type DocumentationRegistryEntry,
} from '../stores/DocumentationService.js';

export interface LegendApplicationVersionData {
  buildTime: string;
  version: string;
  commitSHA: string;
}

export interface LegendApplicationConfigurationData {
  appName: string;
  env: string;
  documentation?: {
    url: string;
    registry?: DocumentationRegistryEntry[];
    entries?: Record<string, DocumentationConfigEntry>;
    contextualEntries?: ContextualDocumentationConfig;
  };
  // TODO: when we support vault-like settings, we could support `settingOverrides`
  // See https://github.com/finos/legend-studio/issues/407
  // settingOverrides
  extensions?: Record<PropertyKey, unknown>;
}

export abstract class LegendApplicationConfig {
  readonly appName: string;
  readonly baseUrl: string;
  readonly env: string;

  // documentation
  readonly documentationUrl: string | undefined;
  readonly documentationRegistryEntries: DocumentationRegistryEntry[] = [];
  readonly keyedDocumentationEntries: KeyedDocumentationEntry[] = [];
  readonly contextualDocEntries: ContextualDocumentationEntry[] = [];

  // version
  readonly appVersion: string;
  readonly appVersionBuildTime: string;
  readonly appVersionCommitId: string;

  constructor(
    input: LegendApplicationConfigurationInput<LegendApplicationConfigurationData>,
  ) {
    this.baseUrl = input.baseUrl;
    this.appName = guaranteeNonEmptyString(
      input.configData.appName,
      `Can't configure application: 'appName' field is missing or empty`,
    );
    this.env = guaranteeNonEmptyString(
      input.configData.env,
      `Can't configure application: 'env' field is missing or empty`,
    );

    // Documentation
    this.documentationUrl = input.configData.documentation?.url;
    this.documentationRegistryEntries =
      input.configData.documentation?.registry ?? [];
    this.keyedDocumentationEntries = collectKeyedDocumnetationEntriesFromConfig(
      input.configData.documentation?.entries ?? {},
    );
    this.contextualDocEntries = collectContextualDocumnetationEntries(
      input.configData.documentation?.contextualEntries ?? {},
    );

    // Version
    this.appVersion = guaranteeNonNullable(
      input.versionData.version,
      `Can't collect application version: 'version' field is missing`,
    );
    this.appVersionBuildTime = guaranteeNonNullable(
      input.versionData.buildTime,
      `Can't collect application version: 'buildTime' field is missing`,
    );
    this.appVersionCommitId = guaranteeNonNullable(
      input.versionData.commitSHA,
      `Can't collect application version: 'commitSHA' field is missing`,
    );
  }
}
