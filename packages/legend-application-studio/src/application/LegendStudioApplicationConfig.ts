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
  list,
  object,
  optional,
  primitive,
} from 'serializr';
import {
  type PlainObject,
  type RequestHeaders,
  assertNonNullable,
  guaranteeNonEmptyString,
  SerializationFactory,
} from '@finos/legend-shared';
import {
  LegendApplicationConfig,
  type LegendApplicationConfigurationInput,
  type LegendApplicationConfigurationData,
} from '@finos/legend-application';

export class ServiceRegistrationEnvironmentConfig {
  env!: string;
  executionUrl!: string;
  modes: string[] = [];
  managementUrl!: string;

  static readonly serialization = new SerializationFactory(
    createModelSchema(ServiceRegistrationEnvironmentConfig, {
      env: primitive(),
      executionUrl: primitive(),
      managementUrl: primitive(),
      modes: list(primitive()),
    }),
  );
}

class LegendStudioApplicationCoreOptions {
  /**
   * Indicates if we should enable strict-mode for graph builder
   *
   * Default to `false`
   */
  enableGraphBuilderStrictMode = false;
  projectCreationGroupIdSuggestion = 'org.finos.legend.*';

  /**
   * Indicates if we should keep section index and do not rewrite/flatten the paths shortened by section
   * imports.
   *
   * This flag will be kept until we have full support for section index
   * See https://github.com/finos/legend-studio/issues/1067
   */
  TEMPORARY__preserveSectionIndex = false;

  /**
   * This flag can be removed when the support for function activator is official
   * See https://github.com/finos/legend-engine/pull/1815
   */
  TEMPORARY__enableFunctionActivatorSupport = false;

  /**
   * Indicates whether we should render the new mapping testable editor or the deprecated legacy editor.
   * This flag will be removed once the editor for testable editor is agreed on.
   */
  TEMPORARY__enableMappingTestableEditor = false;

  /**
   * Provides service registration environment configs.
   *
   * TODO: when we modularize service, we can move this config to DSL Service preset. Then, we can remove
   * the TEMPORARY__ prefix.
   *
   * @modularize
   * See https://github.com/finos/legend-studio/issues/65
   */
  TEMPORARY__serviceRegistrationConfig: ServiceRegistrationEnvironmentConfig[] =
    [];

  /**
   * Indicates whether we should use new ParameterValues for service test data generation
   * This flag will be removed once the backend code is deployed.
   */
  TEMPORARY__enableTestDataGenerationNewFlow = false;

  private static readonly serialization = new SerializationFactory(
    createModelSchema(LegendStudioApplicationCoreOptions, {
      enableGraphBuilderStrictMode: optional(primitive()),
      projectCreationGroupIdSuggestion: optional(primitive()),
      TEMPORARY__preserveSectionIndex: optional(primitive()),
      TEMPORARY__enableFunctionActivatorSupport: optional(primitive()),
      TEMPORARY__enableMappingTestableEditor: optional(primitive()),
      TEMPORARY__enableTestDataGenerationNewFlow: optional(primitive()),
      TEMPORARY__serviceRegistrationConfig: list(
        object(ServiceRegistrationEnvironmentConfig),
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

export interface LegendStudioApplicationConfigurationData
  extends LegendApplicationConfigurationData {
  sdlc: { url: string; baseHeaders?: RequestHeaders };
  depot: { url: string };
  engine: {
    url: string;
    queryUrl?: string;
  };
  query?: { url: string };
}

export class LegendStudioApplicationConfig extends LegendApplicationConfig {
  readonly options = new LegendStudioApplicationCoreOptions();

  readonly engineServerUrl: string;
  readonly engineQueryServerUrl?: string | undefined;
  readonly depotServerUrl: string;
  readonly sdlcServerUrl: string;
  readonly SDLCServerBaseHeaders?: RequestHeaders | undefined;
  readonly queryApplicationUrl: string | undefined;

  constructor(
    input: LegendApplicationConfigurationInput<LegendStudioApplicationConfigurationData>,
  ) {
    super(input);

    // engine
    assertNonNullable(
      input.configData.engine,
      `Can't configure application: 'engine' field is missing`,
    );
    this.engineServerUrl = LegendApplicationConfig.resolveAbsoluteUrl(
      guaranteeNonEmptyString(
        input.configData.engine.url,
        `Can't configure application: 'engine.url' field is missing or empty`,
      ),
    );
    if (input.configData.engine.queryUrl) {
      this.engineQueryServerUrl = LegendApplicationConfig.resolveAbsoluteUrl(
        input.configData.engine.queryUrl,
      );
    }

    // depot
    assertNonNullable(
      input.configData.depot,
      `Can't configure application: 'depot' field is missing`,
    );
    this.depotServerUrl = LegendApplicationConfig.resolveAbsoluteUrl(
      guaranteeNonEmptyString(
        input.configData.depot.url,
        `Can't configure application: 'depot.url' field is missing or empty`,
      ),
    );

    // sdlc
    assertNonNullable(
      input.configData.sdlc,
      `Can't configure application: 'sdlc' field is missing`,
    );
    this.sdlcServerUrl = LegendApplicationConfig.resolveAbsoluteUrl(
      guaranteeNonEmptyString(
        input.configData.sdlc.url,
        `Can't configure application: 'sdlc.url' field is missing or empty`,
      ),
    );
    this.SDLCServerBaseHeaders = input.configData.sdlc.baseHeaders;

    // query
    if (input.configData.query?.url) {
      this.queryApplicationUrl = LegendApplicationConfig.resolveAbsoluteUrl(
        input.configData.query.url,
      );
    }

    // options
    this.options = LegendStudioApplicationCoreOptions.create(
      (input.configData.extensions?.core ??
        {}) as PlainObject<LegendStudioApplicationCoreOptions>,
    );
  }

  override getDefaultApplicationStorageKey(): string {
    return 'legend-studio';
  }
}
