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
  type PlainObject,
} from '@finos/legend-shared';
import {
  type LegendApplicationKeyedDocumentationEntry,
  type LegendApplicationDocumentationEntry,
  collectKeyedDocumnetationEntriesFromConfig,
} from './LegendApplicationDocumentationRegistry';

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
    entries?: Record<string, PlainObject<LegendApplicationDocumentationEntry>>;
  };
  // TODO: when we support vault-like settings
  // See https://github.com/finos/legend-studio/issues/407
  // settingOverrides
  extensions?: Record<PropertyKey, unknown>;
}

export abstract class LegendApplicationConfig {
  readonly appName: string;
  readonly baseUrl: string;
  readonly env: string;

  readonly documentationUrl: string | undefined;
  readonly documentationKeyedEntries: LegendApplicationKeyedDocumentationEntry[] =
    [];

  readonly appVersion: string;
  readonly appVersionBuildTime: string;
  readonly appVersionCommitId: string;

  constructor(
    configData: LegendApplicationConfigurationData,
    versionData: LegendApplicationVersionData,
    baseUrl: string,
  ) {
    this.baseUrl = baseUrl;
    this.appName = guaranteeNonEmptyString(
      configData.appName,
      `Can't configure application: 'appName' field is missing or empty`,
    );
    this.env = guaranteeNonEmptyString(
      configData.env,
      `Can't configure application: 'env' field is missing or empty`,
    );

    // Documentation
    this.documentationUrl = configData.documentation?.url;
    this.documentationKeyedEntries = collectKeyedDocumnetationEntriesFromConfig(
      configData.documentation?.entries ?? {},
    );

    // Version
    this.appVersion = guaranteeNonNullable(
      versionData.version,
      `Can't collect application version: 'version' field is missing`,
    );
    this.appVersionBuildTime = guaranteeNonNullable(
      versionData.buildTime,
      `Can't collect application version: 'buildTime' field is missing`,
    );
    this.appVersionCommitId = guaranteeNonNullable(
      versionData.commitSHA,
      `Can't collect application version: 'commitSHA' field is missing`,
    );
  }
}
