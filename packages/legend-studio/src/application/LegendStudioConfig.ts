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
   * Indicates if we should keep section index and do not rewrite/flatten the paths shortened by section
   * imports.
   *
   * This flag will be kept until we have full support for section index
   * See See https://github.com/finos/legend-studio/issues/1067
   */
  TEMPORARY__preserveSectionIndex = false;
  /**
   * Provides service registration environment configs.
   *
   * TODO: when we modularize service, we can move this config to DSL Service preset. Then, we can remove
   * the TEMPORARY__ prefix.
   */
  TEMPORARY__serviceRegistrationConfig: ServiceRegistrationEnvInfo[] = [];

  private static readonly serialization = new SerializationFactory(
    createModelSchema(LegendStudioApplicationCoreOptions, {
      TEMPORARY__preserveSectionIndex: optional(primitive()),
      TEMPORARY__serviceRegistrationConfig: list(
        object(ServiceRegistrationEnvInfo),
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

export interface LegendStudioConfigurationData
  extends LegendApplicationConfigurationData {
  appName: string;
  env: string;
  sdlc: { url: string; baseHeaders?: RequestHeaders };
  depot: { url: string };
  engine: { url: string; queryUrl?: string };
}

export class LegendStudioConfig extends LegendApplicationConfig {
  readonly options = new LegendStudioApplicationCoreOptions();

  readonly engineServerUrl: string;
  readonly engineQueryServerUrl?: string | undefined;
  readonly depotServerUrl: string;
  readonly sdlcServerUrl: string;
  readonly SDLCServerBaseHeaders?: RequestHeaders | undefined;

  constructor(
    configData: LegendStudioConfigurationData,
    versionData: LegendApplicationVersionData,
    baseUrl: string,
  ) {
    super(configData, versionData, baseUrl);

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

    assertNonNullable(
      configData.sdlc,
      `Can't configure application: 'sdlc' field is missing`,
    );
    this.sdlcServerUrl = guaranteeNonEmptyString(
      configData.sdlc.url,
      `Can't configure application: 'sdlc.url' field is missing or empty`,
    );
    this.SDLCServerBaseHeaders = configData.sdlc.baseHeaders;

    this.options = LegendStudioApplicationCoreOptions.create(
      (configData.extensions?.core ??
        {}) as PlainObject<LegendStudioApplicationCoreOptions>,
    );
  }
}
