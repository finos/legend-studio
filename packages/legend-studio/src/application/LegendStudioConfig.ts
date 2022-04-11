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
import {
  type PlainObject,
  type RequestHeaders,
  AssertionError,
  assertNonNullable,
  guaranteeNonEmptyString,
  guaranteeNonNullable,
  SerializationFactory,
} from '@finos/legend-shared';
import { makeObservable, observable, action, computed } from 'mobx';
import {
  LegendApplicationConfig,
  type LegendApplicationConfigurationData,
  type LegendApplicationVersionData,
} from '@finos/legend-application';

export class ServiceRegistrationEnvInfo {
  env!: string;
  executionUrl!: string;
  modes: string[] = [];
  managementUrl!: string;

  static readonly serialization = new SerializationFactory(
    createModelSchema(ServiceRegistrationEnvInfo, {
      env: primitive(),
      executionUrl: primitive(),
      managementUrl: primitive(),
      modes: list(primitive()),
    }),
  );
}

class LegendStudioApplicationCoreOptions {
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
   * `EXPERIMENTAL__enableFullGrammarImportSupport` is set to false since full grammar import support
   * will not require a lambda resolver.
   */
  TEMPORARY__disableRawLambdaResolver = false;
  /**
   * Provides service registration environment configs.
   *
   * TODO: when we modularize service, we can move this config to DSL Service preset. Then, we can remove
   * the TEMPORARY__ prefix.
   */
  TEMPORARY__serviceRegistrationConfig: ServiceRegistrationEnvInfo[] = [];

  private static readonly serialization = new SerializationFactory(
    createModelSchema(LegendStudioApplicationCoreOptions, {
      EXPERIMENTAL__enableFullGrammarImportSupport: optional(primitive()),
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
    configData: PlainObject<LegendStudioApplicationCoreOptions>,
  ): LegendStudioApplicationCoreOptions {
    return LegendStudioApplicationCoreOptions.serialization.fromJson(
      configData,
    );
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
  sdlc:
    | { url: string; baseHeaders?: RequestHeaders }
    | PlainObject<SDLCServerOption>[];
  depot: { url: string };
  engine: { url: string; queryUrl?: string };
}

export class LegendStudioConfig extends LegendApplicationConfig {
  readonly options = new LegendStudioApplicationCoreOptions();

  readonly engineServerUrl: string;
  readonly engineQueryServerUrl?: string | undefined;
  readonly depotServerUrl: string;

  currentSDLCServerOption!: SDLCServerOption;
  SDLCServerOptions: SDLCServerOption[] = [];
  SDLCServerBaseHeaders?: RequestHeaders | undefined;

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
      this.SDLCServerBaseHeaders = configData.sdlc.baseHeaders;
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
    assertNonNullable(
      configData.depot,
      `Can't configure application: 'depot' field is missing`,
    );
    this.depotServerUrl = guaranteeNonEmptyString(
      configData.depot.url,
      `Can't configure application: 'depot.url' field is missing or empty`,
    );
    this.options = LegendStudioApplicationCoreOptions.create(
      (configData.extensions?.core ??
        {}) as PlainObject<LegendStudioApplicationCoreOptions>,
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
