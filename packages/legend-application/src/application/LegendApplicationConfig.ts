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
  type ExtensionsConfigurationData,
  URL_SEPARATOR,
  SerializationFactory,
  usingModelSchema,
} from '@finos/legend-shared';
import type { LegendApplicationConfigurationInput } from './LegendApplication.js';
import {
  collectKeyedDocumentationEntriesFromConfig,
  collectContextualDocumentationEntries,
  type KeyedDocumentationEntry,
  type DocumentationEntryData,
  type ContextualDocumentationConfig,
  type ContextualDocumentationEntry,
  type DocumentationRegistryEntry,
  type DocumentationLinkEntry,
  collectDocumentationLinkEntryFromConfig,
} from '../stores/DocumentationService.js';
import type { SettingOverrideConfigData } from '../stores/SettingService.js';
import { createModelSchema, list, primitive } from 'serializr';

export interface LegendApplicationVersionData {
  buildTime?: string;
  version: string;
  commitSHA?: string;
}

export interface LegendApplicationLink {
  url: string;
  label: string;
}

export class StereotypeConfig {
  profile!: string;
  stereotype!: string;

  static readonly serialization = new SerializationFactory(
    createModelSchema(StereotypeConfig, {
      profile: primitive(),
      stereotype: primitive(),
    }),
  );
}

export class DataProductImageConfig {
  /**
   * Indicates the maximum dimension (width or height) of the image in pixels.
   * Images larger than this will be resized (maintaining aspect ratio)
   * to fit within this dimension.
   */
  maxDimension!: number;
  /**
   * Indicates the maximum size of the image in KB that a user can upload.
   * Images larger than this will not be accepted and the user must upload
   * a smaller image.
   */
  maxUploadSizeKB!: number;
  /**
   * Indicates the maximum size of the image in KB.
   * Images larger than this will be compressed.
   */
  maxSizeKB!: number;

  static readonly serialization = new SerializationFactory(
    createModelSchema(DataProductImageConfig, {
      maxDimension: primitive(),
      maxUploadSizeKB: primitive(),
      maxSizeKB: primitive(),
    }),
  );
}

export class DataProductConfig {
  classifications: string[] = [];
  publicClassifications: string[] = [];
  classificationDoc!: string;
  publicStereotype!: StereotypeConfig;
  imageConfig!: DataProductImageConfig;

  static readonly serialization = new SerializationFactory(
    createModelSchema(DataProductConfig, {
      classifications: list(primitive()),
      publicClassifications: list(primitive()),
      classificationDoc: primitive(),
      publicStereotype: usingModelSchema(StereotypeConfig.serialization.schema),
      imageConfig: usingModelSchema(
        DataProductImageConfig.serialization.schema,
      ),
    }),
  );
}

export interface LegendApplicationConfigurationData {
  appName: string;
  env: string;
  documentation?: {
    url: string;
    links?: Record<string, LegendApplicationLink>;
    registry?: DocumentationRegistryEntry[];
    entries?: Record<string, DocumentationEntryData>;
    contextualEntries?: ContextualDocumentationConfig;
  };
  application?: {
    storageKey?: string;
    settingsOverrides?: SettingOverrideConfigData;
  };
  // TODO: when we support vault-like settings, we could support `settingOverrides`
  // See https://github.com/finos/legend-studio/issues/407
  // settingOverrides
  extensions?: ExtensionsConfigurationData;
}

export abstract class LegendApplicationConfig {
  readonly appName: string;
  readonly baseAddress: string | undefined;
  readonly env: string;
  readonly applicationStorageKey: string;

  // documentation
  readonly documentationUrl?: string | undefined;
  readonly documentationLinkEntries?: DocumentationLinkEntry[] = [];
  readonly documentationRegistryEntries: DocumentationRegistryEntry[] = [];
  readonly keyedDocumentationEntries: KeyedDocumentationEntry[] = [];
  readonly contextualDocEntries: ContextualDocumentationEntry[] = [];

  // version
  readonly appVersion: string;
  readonly appVersionBuildTime: string | undefined;
  readonly appVersionCommitId: string | undefined;

  constructor(
    input: LegendApplicationConfigurationInput<LegendApplicationConfigurationData>,
  ) {
    this.baseAddress = input.baseAddress;
    this.appName = guaranteeNonEmptyString(
      input.configData.appName,
      `Can't configure application: 'appName' field is missing or empty`,
    );
    this.env = guaranteeNonEmptyString(
      input.configData.env,
      `Can't configure application: 'env' field is missing or empty`,
    );
    this.applicationStorageKey =
      input.configData.application?.storageKey ??
      this.getDefaultApplicationStorageKey();

    // Documentation
    this.documentationUrl = input.configData.documentation?.url;
    this.documentationLinkEntries = collectDocumentationLinkEntryFromConfig(
      input.configData.documentation?.links ?? {},
    );
    this.documentationRegistryEntries =
      input.configData.documentation?.registry ?? [];
    this.keyedDocumentationEntries = collectKeyedDocumentationEntriesFromConfig(
      input.configData.documentation?.entries ?? {},
    );
    this.contextualDocEntries = collectContextualDocumentationEntries(
      input.configData.documentation?.contextualEntries ?? {},
    );

    // Version
    this.appVersion = guaranteeNonNullable(
      input.versionData.version,
      `Can't collect application version: 'version' field is missing`,
    );
    this.appVersionBuildTime = input.versionData.buildTime;
    this.appVersionCommitId = input.versionData.commitSHA;
  }

  protected static resolveAbsoluteUrl(url: string): string {
    if (url.trim().startsWith(URL_SEPARATOR)) {
      return window.location.origin + url;
    }
    return url;
  }

  abstract getDefaultApplicationStorageKey(): string;
}
