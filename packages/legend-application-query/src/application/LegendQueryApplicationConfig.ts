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
  assertNonNullable,
  guaranteeNonEmptyString,
  guaranteeNonNullable,
  type RequestHeaders,
  SerializationFactory,
  type PlainObject,
} from '@finos/legend-shared';
import {
  LegendApplicationConfig,
  type LegendApplicationConfigurationInput,
  type LegendApplicationConfigurationData,
} from '@finos/legend-application';
import {
  createModelSchema,
  list,
  object,
  optional,
  primitive,
} from 'serializr';

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

class LegendQueryApplicationCoreOptions {
  /**
   * Indicates if we should enable theme switcher.
   *
   * NOTE: support for theme switcher is fairly basic at the moment, so we really should
   * just keep this feature as a beta.
   *
   * This flag will be kept until we have full support for themeing
   * See https://github.com/finos/legend-studio/issues/264
   */
  TEMPORARY__enableThemeSwitcher = false;

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

  private static readonly serialization = new SerializationFactory(
    createModelSchema(LegendQueryApplicationCoreOptions, {
      TEMPORARY__enableThemeSwitcher: optional(primitive()),
      TEMPORARY__serviceRegistrationConfig: list(
        object(ServiceRegistrationEnvironmentConfig),
      ),
    }),
  );

  static create(
    configData: PlainObject<LegendQueryApplicationCoreOptions>,
  ): LegendQueryApplicationCoreOptions {
    return LegendQueryApplicationCoreOptions.serialization.fromJson(configData);
  }
}

type LegendStudioApplicationInstanceConfigurationData = {
  sdlcProjectIDPrefix: string;
  url: string;
};

export interface LegendQueryApplicationConfigurationData
  extends LegendApplicationConfigurationData {
  sdlc: { url: string; baseHeaders?: RequestHeaders };
  depot: {
    url: string;
  };
  engine: { url: string; queryUrl?: string };
  studio: {
    url: string;
    instances: LegendStudioApplicationInstanceConfigurationData[];
  };
  taxonomy: {
    url: string;
  };
}

export class LegendQueryApplicationConfig extends LegendApplicationConfig {
  readonly options = new LegendQueryApplicationCoreOptions();

  readonly engineServerUrl: string;
  readonly engineQueryServerUrl?: string | undefined;
  readonly depotServerUrl: string;
  readonly studioUrl: string;
  readonly studioInstances: LegendStudioApplicationInstanceConfigurationData[] =
    [];
  readonly taxonomyUrl: string;
  readonly sdlcServerUrl: string;
  readonly SDLCServerBaseHeaders?: RequestHeaders | undefined;

  constructor(
    input: LegendApplicationConfigurationInput<LegendQueryApplicationConfigurationData>,
  ) {
    super(input);

    // engine
    assertNonNullable(
      input.configData.engine,
      `Can't configure application: 'engine' field is missing`,
    );
    this.engineServerUrl = guaranteeNonEmptyString(
      input.configData.engine.url,
      `Can't configure application: 'engine.url' field is missing or empty`,
    );
    this.engineQueryServerUrl = input.configData.engine.queryUrl;

    // depot
    assertNonNullable(
      input.configData.depot,
      `Can't configure application: 'depot' field is missing`,
    );
    this.depotServerUrl = guaranteeNonEmptyString(
      input.configData.depot.url,
      `Can't configure application: 'depot.url' field is missing or empty`,
    );

    // studio
    assertNonNullable(
      input.configData.studio,
      `Can't configure application: 'studio' field is missing`,
    );
    this.studioUrl = guaranteeNonEmptyString(
      input.configData.studio.url,
      `Can't configure application: 'studio.url' field is missing or empty`,
    );
    this.studioInstances = guaranteeNonNullable(
      input.configData.studio.instances,
      `Can't configure application: 'studio.instances' field is missing`,
    );

    // taxonomy
    assertNonNullable(
      input.configData.taxonomy,
      `Can't configure application: 'taxonomy' field is missing`,
    );
    this.taxonomyUrl = guaranteeNonEmptyString(
      input.configData.taxonomy.url,
      `Can't configure application: 'taxonomy.url' field is missing or empty`,
    );

    // sdlc
    assertNonNullable(
      input.configData.sdlc,
      `Can't configure application: 'sdlc' field is missing`,
    );
    this.sdlcServerUrl = guaranteeNonEmptyString(
      input.configData.sdlc.url,
      `Can't configure application: 'sdlc.url' field is missing or empty`,
    );
    this.SDLCServerBaseHeaders = input.configData.sdlc.baseHeaders;

    // options
    this.options = LegendQueryApplicationCoreOptions.create(
      (input.configData.extensions?.core ??
        {}) as PlainObject<LegendQueryApplicationCoreOptions>,
    );
  }
}
