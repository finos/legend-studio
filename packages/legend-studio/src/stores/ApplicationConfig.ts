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
  createModelSchema,
  custom,
  list,
  optional,
  primitive,
  SKIP,
} from 'serializr';
import type { PlainObject } from '@finos/legend-studio-shared';
import {
  AssertionError,
  assertNonNullable,
  guaranteeNonEmptyString,
  guaranteeNonNullable,
  SerializationFactory,
} from '@finos/legend-studio-shared';
import { makeObservable, observable, action, computed } from 'mobx';
import { URL_PATH_PLACEHOLDER } from './Router';

export class ServiceRegistrationEnvInfo {
  env!: string;
  url!: string;
  modes: string[] = [];

  static readonly serialization = new SerializationFactory(
    createModelSchema(ServiceRegistrationEnvInfo, {
      env: primitive(),
      url: primitive(),
      modes: list(primitive()),
    }),
  );
}

class ApplicationCoreOptions {
  /**
   * Allows enabling additional runtime check to ensure the application works as intended.
   *
   * This flag is highly recommended for DEVELOPMENT mode.
   * It is a runtime check which impacts performance of the app, hence should be
   * disabled in `production` environment.
   */
  DEV__enableStrictRuntimeChecks = false;
  /**
   * Allows enabing a check at runtime that immutable models(system, dependencies, generated) are
   * not modified at all. If any of these aare modified, that signals a bug in the code.
   *
   * This flag is highly recommended for DEVELOPMENT mode.
   * It is a runtime check which impacts performance of the app, hence should be
   * disabled in `production` environment.
   */
  DEV__enableGraphImmutabilityRuntimeCheck = false;
  /**
   * Allows disabling support for relational and flat-data.
   *
   * NOTE: when we properly modularize these DSL stores, we can eliminate this flag.
   */
  TEMPORARY__disableNonModelStoreSupports = false;
  /**
   * Allows disabling support for project structure feature such as pipeline and dependencies.
   *
   * NOTE: when we have proper support for pipeline, we can remove this flag.
   */
  TEMPORARY__disableSDLCProjectStructureSupport = false;
  /**
   * Allows disabling support for project creation.
   *
   * NOTE: when we properly partition Production and Prototype projects, we can remove this flag.
   */
  TEMPORARY__disableSDLCProjectCreation = false;
  /**
   * Allows disabling support for prototype projects as the UAT/QA env for SDLC is sometimes
   * rather unstable
   *
   * NOTE: this flag will potentially be removed when we partition the projects by SDLC instance
   * e.g. prototype projects only show up in UAT/QA environments, and PROD projects only shows up in PROD
   */
  TEMPORARY__useSDLCProductionProjectsOnly = false;
  /**
   * Allows enabling support for section index.
   *
   * NOTE: Grammar import using section index is currently not supported as we are still trying
   * to figure out how we want to store this element in SDLC.
   */
  EXPERIMENTAL__enableFullGrammarImportSupport = false;
  /**
   * Allows disabling of resolving element paths inside a RawLambda
   *
   * NOTE: when we move to save imports as part of the user's project, this feature
   * will no longer be needed and can be removed. This flag will only be relevant if
   * EXPERIMENTAL__enableFullGrammarImportSupport is set to false since full grammar import support
   * will not require a lambda resolver.
   */
  TEMPORARY__disableRawLambdaResolver = false;
  /**
   * Allows disabling service registration as the Legend service operational infrastructure
   * has not been open-sourced yet.
   *
   * NOTE: when we open source Legend Services, we can remove this flag.
   * TODO: when we modularize service, we can move this flag to DSL service preset.
   */
  TEMPORARY__disableServiceRegistration = false;
  /**
   * Provides service registration environment configs.
   *
   * TODO: when we modularize service, we can move this config to DSL Service preset. Then, we can remove
   * the TEMPORARY__ prefix.
   */
  TEMPORARY__serviceRegistrationConfig: ServiceRegistrationEnvInfo[] = [];

  private static readonly serialization = new SerializationFactory(
    createModelSchema(ApplicationCoreOptions, {
      DEV__enableStrictRuntimeChecks: optional(primitive()),
      DEV__enableGraphImmutabilityRuntimeCheck: optional(primitive()),
      TEMPORARY__disableNonModelStoreSupports: optional(primitive()),
      TEMPORARY__disableSDLCProjectStructureSupport: optional(primitive()),
      TEMPORARY__disableSDLCProjectCreation: optional(primitive()),
      TEMPORARY__useSDLCProductionProjectsOnly: optional(primitive()),
      EXPERIMENTAL__enableFullGrammarImportSupport: optional(primitive()),
      TEMPORARY__disableServiceRegistration: optional(primitive()),
      TEMPORARY__disableRawLambdaResolver: optional(primitive()),
      TEMPORARY__serviceRegistrationConfig: list(
        custom(
          (value) => SKIP,
          (value) => ServiceRegistrationEnvInfo.serialization.fromJson(value),
        ),
      ),
    }),
  );

  static create(
    configData: PlainObject<ApplicationCoreOptions>,
  ): ApplicationCoreOptions {
    const config = ApplicationCoreOptions.serialization.fromJson(configData);
    if (config.DEV__enableStrictRuntimeChecks) {
      config.DEV__enableGraphImmutabilityRuntimeCheck = true;
    }
    return config;
  }
}

export interface SDLCServerOption {
  label: string;
  key: string;
  url: string;
}

export interface ConfigurationData {
  appName: string;
  env: string;
  sdlc: { url: string } | SDLCServerOption[];
  metadata: { url: string };
  engine: { url: string };
  documentation: { url: string };
  options?: Record<PropertyKey, unknown>;
}

export interface VersionData {
  buildTime: string;
  version: string;
  commitSHA: string;
}

export class ApplicationConfig {
  readonly appName: string;
  readonly baseUrl: string;
  readonly env: string;
  readonly documentationUrl: string;
  _sdlcServerKey: string | undefined;
  sdlcServerOptions: SDLCServerOption[] = [];
  readonly engineServerUrl: string;
  readonly metadataServerUrl: string;
  readonly options = new ApplicationCoreOptions();

  // TODO: consider modifying and/or moving this out when we refactor `version.json`
  readonly appVersion: string;
  readonly appVersionBuildTime: string;
  readonly appVersionCommitId: string;

  isConfigured = false;

  constructor(
    configData: ConfigurationData,
    versionData: VersionData,
    baseUrl: string,
  ) {
    makeObservable(this, {
      _sdlcServerKey: observable,
      sdlcServerKey: computed,
      sdlcServerUrl: computed,
      isConfigured: observable,
      setSDLCServerKey: action,
      setConfigured: action,
    });
    this.baseUrl = baseUrl;
    this.appName = guaranteeNonEmptyString(
      configData.appName,
      `Application configuration failure: 'appName' field is missing or empty`,
    );
    this.env = guaranteeNonEmptyString(
      configData.env,
      `Application configuration failure: 'env' field is missing or empty`,
    );
    assertNonNullable(
      configData.sdlc,
      `Application configuration failure: 'sdlc' field is missing`,
    );
    if (Array.isArray(configData.sdlc)) {
      if (configData.sdlc.length === 0) {
        throw new AssertionError(
          `Application configuration failure: 'sdlc' field configured in list form but has no entry`,
        );
      }
      // Make sure the specified instances are unique by key
      if (
        new Set(configData.sdlc.map((instance) => instance.key)).size !==
        configData.sdlc.length
      ) {
        throw new AssertionError(
          `Application configuration failure: 'sdlc' is configured with duplicated entries`,
        );
      }
      this.sdlcServerOptions = configData.sdlc;
    } else {
      this.sdlcServerOptions = [
        {
          key: URL_PATH_PLACEHOLDER,
          url: guaranteeNonEmptyString(
            configData.sdlc.url,
            `Application configuration failure: 'sdlc.url' field is missing`,
          ),
          label: '(default)',
        },
      ];
    }
    assertNonNullable(
      configData.engine,
      `Application configuration failure: 'engine' field is missing`,
    );
    this.engineServerUrl = guaranteeNonEmptyString(
      configData.engine.url,
      `Application configuration failure: 'engine.url' field is missing or empty`,
    );
    assertNonNullable(
      configData.metadata,
      `Application configuration failure: 'metadata' field is missing`,
    );
    this.metadataServerUrl = guaranteeNonEmptyString(
      configData.metadata.url,
      `Application configuration failure: 'metadata.url' field is missing or empty`,
    );
    assertNonNullable(
      configData.documentation,
      `Application configuration failure: 'documentation' field is missing`,
    );
    this.documentationUrl = guaranteeNonEmptyString(
      configData.documentation.url,
      `Application configuration failure: 'documentation.url' field is missing or empty`,
    );
    this.options = ApplicationCoreOptions.create(
      (configData.options?.core ?? {}) as PlainObject<ApplicationCoreOptions>,
    );

    // Version
    this.appVersion = guaranteeNonNullable(
      versionData.version,
      'Application version is missing',
    );
    this.appVersionBuildTime = guaranteeNonNullable(
      versionData.buildTime,
      'Application build time is missing',
    );
    this.appVersionCommitId = guaranteeNonNullable(
      versionData.commitSHA,
      'Application build source commit SHA is mising',
    );
  }

  get sdlcServerKey(): string {
    return guaranteeNonNullable(
      this._sdlcServerKey,
      'SDLC server is not setup properly',
    );
  }

  get sdlcServerUrl(): string {
    return guaranteeNonNullable(
      this.sdlcServerOptions.find(
        (option) => option.key === this.sdlcServerKey,
      ),
      'SDLC server is not setup properly',
    ).url;
  }

  setSDLCServerKey(val: string): void {
    this._sdlcServerKey = val;
  }

  setConfigured(val: boolean): void {
    this.isConfigured = val;
  }
}
