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
  type MarkdownText,
  deserializeMarkdownText,
} from '@finos/legend-shared';
import { LegendApplicationDocumentationRegistry } from './LegendApplicationDocumentationRegistry';

export interface LegendApplicationVersionData {
  buildTime: string;
  version: string;
  commitSHA: string;
}

export interface LegendApplicationDocumentationEntry {
  markdownText?: MarkdownText | undefined;
  title?: string | undefined;
  text?: string | undefined;
  url?: string | undefined;
}

const deserializeDocumentationEntry = (
  val: PlainObject<LegendApplicationDocumentationEntry>,
): LegendApplicationDocumentationEntry => {
  let markdownText: MarkdownText | undefined;
  if (val.markdownText) {
    markdownText = deserializeMarkdownText(
      val.markdownText as PlainObject<MarkdownText>,
    );
  }

  return { ...val, markdownText };
};

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

  readonly docRegistry: LegendApplicationDocumentationRegistry;

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
    this.docRegistry = new LegendApplicationDocumentationRegistry();
    this.docRegistry.url = configData.documentation?.url;
    Object.entries(configData.documentation?.entries ?? []).forEach((entry) =>
      this.docRegistry.registerEntry(
        entry[0],
        deserializeDocumentationEntry(entry[1]),
      ),
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
