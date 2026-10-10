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
  SerializationFactory,
  type PlainObject,
  usingModelSchema,
} from '@finos/legend-shared';
import {
  LegendApplicationConfig,
  type LegendApplicationConfigurationInput,
  type LegendApplicationConfigurationData,
  StereotypeConfig,
} from '@finos/legend-application';
import {
  createModelSchema,
  primitive,
  list,
  object,
  optional,
  raw,
} from 'serializr';
import { QueryBuilderConfig } from '@finos/legend-query-builder';
import type { AuthProviderProps } from 'react-oidc-context';

export class LegendQueryOIDCConfiguration {
  redirectPath!: string;
  silentRedirectPath!: string;
  authProviderProps!: AuthProviderProps;

  static readonly serialization = new SerializationFactory(
    createModelSchema(LegendQueryOIDCConfiguration, {
      redirectPath: primitive(),
      silentRedirectPath: primitive(),
      authProviderProps: raw(),
    }),
  );
}

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

/**
 * Data products, as Legend Studio and Legend Marketplace configure them:
 * Query reads only the stereotype that marks access point groups open to
 * everyone in the organization, which Legend Cube's access badges use
 */
export class LegendQueryDataProductConfig {
  publicStereotype: StereotypeConfig | undefined;

  static readonly serialization = new SerializationFactory(
    createModelSchema(LegendQueryDataProductConfig, {
      publicStereotype: optional(
        usingModelSchema(StereotypeConfig.serialization.schema),
      ),
    }),
  );
}

class LegendQueryApplicationCoreOptions {
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
   * This flag is for any feature that is not production ready.
   * Used to iterate over features until they are ready for production.
   */
  NonProductionFeatureFlag = false;

  TEMPORARY__enableMinimalGraph = false;

  /**
   * Config specific to query builder
   */
  queryBuilderConfig: QueryBuilderConfig | undefined;

  /**
   * OIDC configuration for the Query application.
   * When provided, the application will be wrapped in a `LegendTokenProvider`
   * to enable automatic access-token syncing.
   */
  oidcConfig: LegendQueryOIDCConfiguration | undefined;

  /**
   * Indicates if we should enable oauth flow
   *
   * Default to `false`
   */
  enableOauthFlow = false;

  /** Data products, as Studio and Marketplace configure them (`options.dataProductConfig`) */
  dataProductConfig: LegendQueryDataProductConfig | undefined;

  private static readonly serialization = new SerializationFactory(
    createModelSchema(LegendQueryApplicationCoreOptions, {
      TEMPORARY__serviceRegistrationConfig: list(
        object(ServiceRegistrationEnvironmentConfig),
      ),
      queryBuilderConfig: optional(
        usingModelSchema(QueryBuilderConfig.serialization.schema),
      ),
      NonProductionFeatureFlag: optional(primitive()),
      TEMPORARY__enableMinimalGraph: optional(primitive()),
      oidcConfig: optional(
        usingModelSchema(LegendQueryOIDCConfiguration.serialization.schema),
      ),
      enableOauthFlow: optional(primitive()),
      dataProductConfig: optional(
        usingModelSchema(LegendQueryDataProductConfig.serialization.schema),
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
  depot: {
    url: string;
  };
  engine: {
    url: string;
    queryUrl?: string;
    useCookieAuthOnly?: boolean;
    queryClientName?: string;
  };
  studio: {
    url: string;
    instances: LegendStudioApplicationInstanceConfigurationData[];
  };
  dataCube?: {
    url: string;
  };
  marketplace?: {
    url: string;
    productionParallelUrl: string;
    /**
     * The marketplace server, whose search Legend Cube's data product tab
     * uses: the URL Legend Marketplace's own config names `marketplace.url`
     */
    serverUrl?: string;
  };
  lakehouse?: {
    url: string;
    /**
     * The lakehouse platform, which names the ingest servers: Legend Cube's
     * ingest data sets need it, as Data Cube's and Marketplace's do
     */
    platformUrl?: string;
  };
  legendAI?: {
    url?: string;
    agentURL?: string;
  };
}

export class LegendQueryApplicationConfig extends LegendApplicationConfig {
  readonly options = new LegendQueryApplicationCoreOptions();

  readonly engineServerUrl: string;
  readonly engineQueryServerUrl?: string | undefined;
  readonly engineUseCookieAuthOnly: boolean;
  readonly engineQueryClientName?: string | undefined;
  readonly depotServerUrl: string;
  readonly studioApplicationUrl: string;
  readonly dataCubeApplicationUrl?: string;
  readonly marketplaceApplicationUrl?: string;
  readonly marketplaceProductionParallelUrl?: string;
  readonly marketplaceServerUrl?: string;
  readonly lakehouseContractUrl?: string;
  readonly lakehousePlatformUrl?: string;
  readonly legendAIUrl?: string;
  readonly legendAIAgentUrl?: string;
  readonly studioInstances: LegendStudioApplicationInstanceConfigurationData[] =
    [];

  constructor(
    input: LegendApplicationConfigurationInput<LegendQueryApplicationConfigurationData>,
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
    this.engineQueryServerUrl = input.configData.engine.queryUrl
      ? LegendApplicationConfig.resolveAbsoluteUrl(
          input.configData.engine.queryUrl,
        )
      : undefined;
    this.engineUseCookieAuthOnly = Boolean(
      input.configData.engine.useCookieAuthOnly,
    );
    this.engineQueryClientName = input.configData.engine.queryClientName;

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

    // studio
    assertNonNullable(
      input.configData.studio,
      `Can't configure application: 'studio' field is missing`,
    );
    this.studioApplicationUrl = LegendApplicationConfig.resolveAbsoluteUrl(
      guaranteeNonEmptyString(
        input.configData.studio.url,
        `Can't configure application: 'studio.url' field is missing or empty`,
      ),
    );
    this.studioInstances = guaranteeNonNullable(
      input.configData.studio.instances,
      `Can't configure application: 'studio.instances' field is missing`,
    );

    // datacube
    if (input.configData.dataCube?.url) {
      this.dataCubeApplicationUrl = LegendApplicationConfig.resolveAbsoluteUrl(
        input.configData.dataCube.url,
      );
    }

    // marketplace
    if (input.configData.marketplace?.url) {
      this.marketplaceApplicationUrl =
        LegendApplicationConfig.resolveAbsoluteUrl(
          input.configData.marketplace.url,
        );
    }
    if (input.configData.marketplace?.productionParallelUrl) {
      this.marketplaceProductionParallelUrl =
        LegendApplicationConfig.resolveAbsoluteUrl(
          input.configData.marketplace.productionParallelUrl,
        );
    }
    if (input.configData.marketplace?.serverUrl) {
      this.marketplaceServerUrl = LegendApplicationConfig.resolveAbsoluteUrl(
        input.configData.marketplace.serverUrl,
      );
    }

    // lakehouse
    if (input.configData.lakehouse?.url) {
      this.lakehouseContractUrl = LegendApplicationConfig.resolveAbsoluteUrl(
        input.configData.lakehouse.url,
      );
    }
    if (input.configData.lakehouse?.platformUrl) {
      this.lakehousePlatformUrl = LegendApplicationConfig.resolveAbsoluteUrl(
        input.configData.lakehouse.platformUrl,
      );
    }

    // legend AI (AI-assisted features such as query title/description suggester)
    if (input.configData.legendAI?.url) {
      this.legendAIUrl = LegendApplicationConfig.resolveAbsoluteUrl(
        input.configData.legendAI.url,
      );
    }

    // legend AI agent chat
    if (input.configData.legendAI?.agentURL) {
      this.legendAIAgentUrl = LegendApplicationConfig.resolveAbsoluteUrl(
        input.configData.legendAI.agentURL,
      );
    }

    // options
    this.options = LegendQueryApplicationCoreOptions.create(
      input.configData.extensions?.core ?? {},
    );
  }

  override getDefaultApplicationStorageKey(): string {
    return 'legend-query';
  }
}
