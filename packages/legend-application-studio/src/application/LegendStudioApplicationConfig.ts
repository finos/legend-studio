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
  usingModelSchema,
} from '@finos/legend-shared';
import {
  LegendApplicationConfig,
  type LegendApplicationConfigurationInput,
  type LegendApplicationConfigurationData,
} from '@finos/legend-application';
import { QueryBuilderConfig } from '@finos/legend-query-builder';
import {
  LegendIngestionConfiguration,
  validateIngestionDeploymentConfiguration,
} from './LegendIngestionConfiguration.js';

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

export class DataProductConfig {
  classifications: string[] = [];
  publicClassifications: string[] = [];
  classificationDoc!: string;
  publicStereotype!: StereotypeConfig;

  static readonly serialization = new SerializationFactory(
    createModelSchema(DataProductConfig, {
      classifications: list(primitive()),
      publicClassifications: list(primitive()),
      classificationDoc: primitive(),
      publicStereotype: usingModelSchema(StereotypeConfig.serialization.schema),
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
  /**
   * Indicates whether we enable type ahead in all editors.
   *
   * Default to `false` because of performance reasons for large models.
   */
  typeAheadEnabled = false;

  projectCreationGroupIdSuggestion = 'org.finos.legend.*';

  /**
   * This flag is for any feature that is not production ready.
   * Used to iterate over features until they are ready for production.
   */
  NonProductionFeatureFlag = false;

  /**
   * Indicates if we should keep section index and do not rewrite/flatten the paths shortened by section
   * imports.
   *
   * This flag will be kept until we have full support for section index
   * See https://github.com/finos/legend-studio/issues/1067
   */
  TEMPORARY__preserveSectionIndex = false;

  /**
   * This flag can be removed when the support for local connection is official
   * Right now it's done to support the SnowflakeApp creation demo
   * See https://github.com/finos/legend-engine/pull/1819
   */
  TEMPORARY__enableLocalConnectionBuilder = false;

  /**
   * This flag enables creating a sandbox project via engine.
   * Remove this flag once workflow is finalized.
   */
  TEMPORARY__enableCreationOfSandboxProjects = false;

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
   * Config specific to query builder
   */
  queryBuilderConfig: QueryBuilderConfig | undefined;

  ingestDeploymentConfig: LegendIngestionConfiguration | undefined;

  dataProductConfig: DataProductConfig | undefined;

  /**
   * Indicates if we should enable oauth flow
   *
   * Default to `false`
   */
  enableOauthFlow = false;

  private static readonly serialization = new SerializationFactory(
    createModelSchema(LegendStudioApplicationCoreOptions, {
      enableGraphBuilderStrictMode: optional(primitive()),
      typeAheadEnabled: optional(primitive()),
      projectCreationGroupIdSuggestion: optional(primitive()),
      TEMPORARY__preserveSectionIndex: optional(primitive()),
      TEMPORARY__enableCreationOfSandboxProjects: optional(primitive()),
      TEMPORARY__enableLocalConnectionBuilder: optional(primitive()),
      NonProductionFeatureFlag: optional(primitive()),
      TEMPORARY__serviceRegistrationConfig: list(
        object(ServiceRegistrationEnvironmentConfig),
      ),
      queryBuilderConfig: optional(
        usingModelSchema(QueryBuilderConfig.serialization.schema),
      ),
      ingestDeploymentConfig: optional(
        usingModelSchema(LegendIngestionConfiguration.serialization.schema),
      ),
      dataProductConfig: optional(
        usingModelSchema(DataProductConfig.serialization.schema),
      ),
      enableOauthFlow: optional(primitive()),
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
  showcase?: { url: string };
  pct?: { reportUrl: string };
}

export class LegendStudioApplicationConfig extends LegendApplicationConfig {
  readonly options = new LegendStudioApplicationCoreOptions();

  readonly engineServerUrl: string;
  readonly engineQueryServerUrl?: string | undefined;
  readonly depotServerUrl: string;
  readonly sdlcServerUrl: string;
  readonly sdlcServerBaseHeaders?: RequestHeaders | undefined;
  readonly queryApplicationUrl?: string | undefined;
  readonly showcaseServerUrl?: string | undefined;
  readonly pctReportUrl?: string | undefined;

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
    this.sdlcServerBaseHeaders = input.configData.sdlc.baseHeaders;

    // query
    if (input.configData.query?.url) {
      this.queryApplicationUrl = LegendApplicationConfig.resolveAbsoluteUrl(
        input.configData.query.url,
      );
    }

    // showcase
    if (input.configData.showcase?.url) {
      this.showcaseServerUrl = LegendApplicationConfig.resolveAbsoluteUrl(
        input.configData.showcase.url,
      );
    }

    // pct
    if (input.configData.pct?.reportUrl) {
      this.pctReportUrl = LegendApplicationConfig.resolveAbsoluteUrl(
        input.configData.pct.reportUrl,
      );
    }

    // options
    this.options = LegendStudioApplicationCoreOptions.create(
      input.configData.extensions?.core ?? {},
    );
    if (this.options.ingestDeploymentConfig) {
      validateIngestionDeploymentConfiguration(
        this.options.ingestDeploymentConfig,
      );
    }
  }

  override getDefaultApplicationStorageKey(): string {
    return 'legend-studio';
  }
}
