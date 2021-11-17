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
import type { PlainObject } from '@finos/legend-shared';
import {
  AssertionError,
  assertNonNullable,
  guaranteeNonEmptyString,
  guaranteeNonNullable,
  SerializationFactory,
} from '@finos/legend-shared';
import { makeObservable, observable, action, computed } from 'mobx';
import type {
  LegendApplicationConfigurationData,
  LegendApplicationVersionData,
} from '@finos/legend-application';
import { LegendApplicationConfig } from '@finos/legend-application';

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
      // do nothing
    }
    return config;
  }
}

export class SDLCServerOption {
  label!: string;
  key!: string;
  url!: string;
  default?: boolean;

  static readonly serialization = new SerializationFactory(
    createModelSchema(SDLCServerOption, {
      default: optional(primitive()),
      label: primitive(),
      key: primitive(),
      url: primitive(),
    }),
  );
}

export interface LegendStudioConfigurationData
  extends LegendApplicationConfigurationData {
  appName: string;
  env: string;
  sdlc: { url: string } | PlainObject<SDLCServerOption>[];
  depot: { url: string };
  engine: { url: string; queryUrl?: string };
  documentation: { url: string };
}

export class LegendStudioConfig extends LegendApplicationConfig {
  readonly options = new ApplicationCoreOptions();

  readonly documentationUrl: string;
  currentSDLCServerOption!: SDLCServerOption;
  SDLCServerOptions: SDLCServerOption[] = [];
  readonly engineServerUrl: string;
  readonly engineQueryServerUrl?: string | undefined;
  readonly depotServerUrl: string;

  constructor(
    configData: LegendStudioConfigurationData,
    versionData: LegendApplicationVersionData,
    baseUrl: string,
  ) {
    super(configData, versionData, baseUrl);

    makeObservable(this, {
      currentSDLCServerOption: observable,
      defaultSDLCServerOption: computed,
      sdlcServerUrl: computed,
      setCurrentSDLCServerOption: action,
    });
    assertNonNullable(
      configData.sdlc,
      `Can't configure application: 'sdlc' field is missing`,
    );
    if (Array.isArray(configData.sdlc)) {
      const options = configData.sdlc.map((optionData) =>
        SDLCServerOption.serialization.fromJson(optionData),
      );
      if (options.length === 0) {
        throw new AssertionError(
          `Can't configure application: 'sdlc' field configured in list form but has no entry`,
        );
      }
      // Make sure the specified instances are unique by key
      if (
        new Set(options.map((instance) => instance.key)).size !== options.length
      ) {
        throw new AssertionError(
          `Can't configure application: 'sdlc' field consists of entries with duplicated keys`,
        );
      }
      // Make sure default option is set properly
      if (options.filter((instance) => instance.default).length === 0) {
        throw new AssertionError(
          `Can't configure application: 'sdlc' field consists of no default entry`,
        );
      }
      if (options.filter((instance) => instance.default).length > 1) {
        throw new AssertionError(
          `Can't configure application: 'sdlc' field consists of multiple default entries`,
        );
      }
      this.SDLCServerOptions = options;
    } else {
      this.SDLCServerOptions = [
        SDLCServerOption.serialization.fromJson({
          key: 'default',
          url: guaranteeNonEmptyString(
            configData.sdlc.url,
            `Can't configure application: 'sdlc.url' field is missing`,
          ),
          label: '(default)',
          default: true,
        }),
      ];
    }
    this.currentSDLCServerOption = this.defaultSDLCServerOption;
    assertNonNullable(
      configData.engine,
      `Can't configure application: 'engine' field is missing`,
    );
    this.engineServerUrl = guaranteeNonEmptyString(
      configData.engine.url,
      `Can't configure application: 'engine.url' field is missing or empty`,
    );
    this.engineQueryServerUrl = configData.engine.queryUrl;
    this.depotServerUrl = guaranteeNonEmptyString(
      configData.depot.url,
      `Can't configure application: 'depot.url' field is missing or empty`,
    );
    assertNonNullable(
      configData.documentation,
      `Can't configure application: 'documentation' field is missing`,
    );
    this.documentationUrl = guaranteeNonEmptyString(
      configData.documentation.url,
      `Can't configure application: 'documentation.url' field is missing or empty`,
    );
    this.options = ApplicationCoreOptions.create(
      (configData.extensions?.core ??
        {}) as PlainObject<ApplicationCoreOptions>,
    );
  }

  get defaultSDLCServerOption(): SDLCServerOption {
    return guaranteeNonNullable(
      this.SDLCServerOptions.find((option) => option.default),
      `Can't find a default SDLC server option`,
    );
  }

  get sdlcServerUrl(): string {
    return this.currentSDLCServerOption.url;
  }

  setCurrentSDLCServerOption(val: SDLCServerOption): void {
    this.currentSDLCServerOption = val;
  }
}
