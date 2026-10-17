/**
 * Copyright (c) 2026-present, Goldman Sachs
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
  SerializationFactory,
  type PlainObject,
  usingModelSchema,
} from '@finos/legend-shared';
import {
  LegendApplicationConfig,
  type LegendApplicationConfigurationData,
  type LegendApplicationConfigurationInput,
  StereotypeConfig,
} from '@finos/legend-application';
import { createModelSchema, optional, primitive, raw } from 'serializr';
import type { AuthProviderProps } from 'react-oidc-context';

/** Signing in through OIDC, as Legend Query configures it (`extensions.core.oidcConfig`) */
export class LegendAnalyticsOIDCConfiguration {
  redirectPath!: string;
  silentRedirectPath!: string;
  authProviderProps!: AuthProviderProps;

  static readonly serialization = new SerializationFactory(
    createModelSchema(LegendAnalyticsOIDCConfiguration, {
      redirectPath: primitive(),
      silentRedirectPath: primitive(),
      authProviderProps: raw(),
    }),
  );
}

/**
 * The producers of data products, as Legend Marketplace configures them:
 * Analytics reads only the engine path of the Legend user service naming
 * producer deployments, which Legend Cube's Ingest tab labels its producers
 * with
 */
export class LegendAnalyticsDataProductProducerConfig {
  deploymentLegendServiceUrl: string | undefined;

  static readonly serialization = new SerializationFactory(
    createModelSchema(LegendAnalyticsDataProductProducerConfig, {
      deploymentLegendServiceUrl: optional(primitive()),
    }),
  );
}

/**
 * Data products, as Legend Studio, Marketplace and Query configure them:
 * Analytics reads only the stereotype that marks access point groups open to
 * everyone in the organization, which Legend Cube's access badges use
 */
export class LegendAnalyticsDataProductConfig {
  publicStereotype: StereotypeConfig | undefined;
  producer: LegendAnalyticsDataProductProducerConfig | undefined;

  static readonly serialization = new SerializationFactory(
    createModelSchema(LegendAnalyticsDataProductConfig, {
      publicStereotype: optional(
        usingModelSchema(StereotypeConfig.serialization.schema),
      ),
      producer: optional(
        usingModelSchema(
          LegendAnalyticsDataProductProducerConfig.serialization.schema,
        ),
      ),
    }),
  );
}

class LegendAnalyticsApplicationCoreOptions {
  /**
   * OIDC configuration: when provided, the application signs in through it
   * and keeps the access token in sync (`LegendTokenSync`)
   */
  oidcConfig: LegendAnalyticsOIDCConfiguration | undefined;

  /**
   * Whether the application requires signing in before it shows anything
   *
   * Default to `false`
   */
  enableOauthFlow = false;

  /** Data products, as Studio and Marketplace configure them (`options.dataProductConfig`) */
  dataProductConfig: LegendAnalyticsDataProductConfig | undefined;

  private static readonly serialization = new SerializationFactory(
    createModelSchema(LegendAnalyticsApplicationCoreOptions, {
      oidcConfig: optional(
        usingModelSchema(LegendAnalyticsOIDCConfiguration.serialization.schema),
      ),
      enableOauthFlow: optional(primitive()),
      dataProductConfig: optional(
        usingModelSchema(LegendAnalyticsDataProductConfig.serialization.schema),
      ),
    }),
  );

  static create(
    configData: PlainObject<LegendAnalyticsApplicationCoreOptions>,
  ): LegendAnalyticsApplicationCoreOptions {
    return LegendAnalyticsApplicationCoreOptions.serialization.fromJson(
      configData,
    );
  }
}

/**
 * The servers Legend Analytics reads (PLAN §11.18): the engine, which it
 * needs, and the others only where the deployment has them, as Legend Cube
 * offers their sources only then
 */
export interface LegendAnalyticsApplicationConfigurationData
  extends LegendApplicationConfigurationData {
  engine: {
    url: string;
    queryUrl?: string;
    useCookieAuthOnly?: boolean;
    queryClientName?: string;
  };
  /** Published projects and, with a lakehouse, data products */
  depot?: {
    url: string;
  };
  lakehouse?: {
    url: string;
    /** The lakehouse platform, which names the ingest servers: ingest data sets need it */
    platformUrl?: string;
  };
  marketplace?: {
    /** Legend Marketplace, which a production data product links to */
    url?: string;
    /** Legend Marketplace's production-parallel deployment */
    productionParallelUrl?: string;
    /** The marketplace server, whose search the data product tab uses */
    serverUrl?: string;
  };
}

export class LegendAnalyticsApplicationConfig extends LegendApplicationConfig {
  readonly options = new LegendAnalyticsApplicationCoreOptions();

  readonly engineServerUrl: string;
  readonly engineQueryServerUrl?: string | undefined;
  readonly engineUseCookieAuthOnly: boolean;
  readonly engineQueryClientName?: string | undefined;
  readonly depotServerUrl?: string | undefined;
  readonly lakehouseContractUrl?: string | undefined;
  readonly lakehousePlatformUrl?: string | undefined;
  readonly marketplaceApplicationUrl?: string | undefined;
  readonly marketplaceProductionParallelUrl?: string | undefined;
  readonly marketplaceServerUrl?: string | undefined;

  constructor(
    input: LegendApplicationConfigurationInput<LegendAnalyticsApplicationConfigurationData>,
  ) {
    super(input);
    const { configData } = input;

    // engine
    assertNonNullable(
      configData.engine,
      `Can't configure application: 'engine' field is missing`,
    );
    this.engineServerUrl = LegendApplicationConfig.resolveAbsoluteUrl(
      guaranteeNonEmptyString(
        configData.engine.url,
        `Can't configure application: 'engine.url' field is missing or empty`,
      ),
    );
    this.engineQueryServerUrl = configData.engine.queryUrl
      ? LegendApplicationConfig.resolveAbsoluteUrl(configData.engine.queryUrl)
      : undefined;
    this.engineUseCookieAuthOnly = Boolean(configData.engine.useCookieAuthOnly);
    this.engineQueryClientName = configData.engine.queryClientName;

    // the others, each only where the deployment has it
    const resolve = (url: string | undefined): string | undefined =>
      url ? LegendApplicationConfig.resolveAbsoluteUrl(url) : undefined;
    this.depotServerUrl = resolve(configData.depot?.url);
    this.lakehouseContractUrl = resolve(configData.lakehouse?.url);
    this.lakehousePlatformUrl = resolve(configData.lakehouse?.platformUrl);
    this.marketplaceApplicationUrl = resolve(configData.marketplace?.url);
    this.marketplaceProductionParallelUrl = resolve(
      configData.marketplace?.productionParallelUrl,
    );
    this.marketplaceServerUrl = resolve(configData.marketplace?.serverUrl);

    // options
    this.options = LegendAnalyticsApplicationCoreOptions.create(
      configData.extensions?.core ?? {},
    );
  }

  override getDefaultApplicationStorageKey(): string {
    return 'legend-analytics';
  }
}
