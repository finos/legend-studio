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

import { createModelSchema } from 'serializr';
import {
  type PlainObject,
  assertNonNullable,
  guaranteeNonEmptyString,
  SerializationFactory,
} from '@finos/legend-shared';
import {
  type LegendApplicationConfigurationData,
  type LegendApplicationConfigurationInput,
  LegendApplicationConfig,
} from '@finos/legend-application';
import type { AuthProviderProps } from 'react-oidc-context';

class LegendMarketplaceApplicationCoreOptions {
  private static readonly serialization = new SerializationFactory(
    createModelSchema(LegendMarketplaceApplicationCoreOptions, {}),
  );

  static create(
    configData: PlainObject<LegendMarketplaceApplicationCoreOptions>,
  ): LegendMarketplaceApplicationCoreOptions {
    return LegendMarketplaceApplicationCoreOptions.serialization.fromJson(
      configData,
    );
  }
}

export interface LegendMarketplaceOidcConfig {
  redirectPath: string;
  silentRedirectPath: string;
  authProviderProps: AuthProviderProps;
}

export interface LegendMarketplaceApplicationConfigurationData
  extends LegendApplicationConfigurationData {
  marketplace: {
    url: string;
    subscriptionUrl: string;
    userSearchUrl?: string | undefined;
    userProfileImageUrl?: string | undefined;
    oidcConfig?: LegendMarketplaceOidcConfig | undefined;
  };
  depot: { url: string };
  engine: {
    url: string;
  };
  lakehouse?: {
    url: string;
    platformUrl: string;
    entitlements: {
      applicationDirectoryUrl: string;
      applicationIDUrl: string;
    };
  };
  studio: {
    url: string;
  };
}

export class LegendLakehouseEntitlementsConfig {
  applicationDirectoryUrl: string;
  applicationIDUrl: string;
  constructor(applicationDirectoryUrl: string, applicationIDUrl: string) {
    this.applicationDirectoryUrl = applicationDirectoryUrl;
    this.applicationIDUrl = applicationIDUrl;
  }
}
export class LegendMarketplaceApplicationConfig extends LegendApplicationConfig {
  readonly options = new LegendMarketplaceApplicationCoreOptions();

  readonly marketplaceServerUrl: string;
  readonly marketplaceSubscriptionUrl: string;
  readonly marketplaceUserSearchUrl?: string | undefined;
  readonly marketplaceUserProfileImageUrl?: string | undefined;
  readonly marketplaceOidcConfig?: LegendMarketplaceOidcConfig | undefined;
  readonly engineServerUrl: string;
  readonly depotServerUrl: string;
  readonly lakehouseServerUrl: string;
  readonly lakehousePlatformUrl: string;
  readonly lakehouseEntitlementsConfig:
    | LegendLakehouseEntitlementsConfig
    | undefined;
  readonly studioServerUrl: string;

  constructor(
    input: LegendApplicationConfigurationInput<LegendMarketplaceApplicationConfigurationData>,
  ) {
    super(input);

    // marketplace
    assertNonNullable(
      input.configData.marketplace,
      `Can't configure application: 'marketplace' field is missing`,
    );
    this.marketplaceServerUrl = LegendApplicationConfig.resolveAbsoluteUrl(
      guaranteeNonEmptyString(
        input.configData.marketplace.url,
        `Can't configure application: 'marketplace.url' field is missing or empty`,
      ),
    );
    this.marketplaceSubscriptionUrl =
      LegendApplicationConfig.resolveAbsoluteUrl(
        guaranteeNonEmptyString(
          input.configData.marketplace.subscriptionUrl,
          `Can't configure application: 'marketplace.marketplaceSubscriptionUrl' field is missing or empty`,
        ),
      );
    if (input.configData.marketplace.userSearchUrl) {
      this.marketplaceUserSearchUrl =
        LegendApplicationConfig.resolveAbsoluteUrl(
          guaranteeNonEmptyString(
            input.configData.marketplace.userSearchUrl,
            `Can't configure application: 'marketplace.userSearchUrl' field is missing or empty`,
          ),
        );
    }
    if (input.configData.marketplace.userProfileImageUrl) {
      this.marketplaceUserProfileImageUrl =
        LegendApplicationConfig.resolveAbsoluteUrl(
          guaranteeNonEmptyString(
            input.configData.marketplace.userProfileImageUrl,
            `Can't configure application: 'marketplace.userProfileImageUrl' field is missing or empty`,
          ),
        );
    }
    this.marketplaceOidcConfig = input.configData.marketplace.oidcConfig;

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

    // lakehouse
    assertNonNullable(
      input.configData.lakehouse,
      `Can't configure application: 'lakehouse' field is missing`,
    );
    this.lakehouseServerUrl = LegendApplicationConfig.resolveAbsoluteUrl(
      guaranteeNonEmptyString(
        input.configData.lakehouse.url,
        `Can't configure application: 'lakehouse.url' field is missing or empty`,
      ),
    );
    this.lakehousePlatformUrl = LegendApplicationConfig.resolveAbsoluteUrl(
      guaranteeNonEmptyString(
        input.configData.lakehouse.platformUrl,
        `Can't configure application: 'lakehouse.platformUrl' field is missing or empty`,
      ),
    );
    this.lakehouseEntitlementsConfig = new LegendLakehouseEntitlementsConfig(
      guaranteeNonEmptyString(
        input.configData.lakehouse.entitlements.applicationDirectoryUrl,
        `Can't configure application: 'lakehouse.entitlements.applicationDirectoryUrl' field is missing or empty`,
      ),
      guaranteeNonEmptyString(
        input.configData.lakehouse.entitlements.applicationIDUrl,
        `Can't configure application: 'lakehouse.entitlements.applicationIDUrl' field is missing or empty`,
      ),
    );

    // studio
    assertNonNullable(
      input.configData.studio,
      `Can't configure application: 'studio' field is missing`,
    );
    this.studioServerUrl = LegendApplicationConfig.resolveAbsoluteUrl(
      guaranteeNonEmptyString(
        input.configData.studio.url,
        `Can't configure application: 'studio.url' field is missing or empty`,
      ),
    );

    // options
    this.options = LegendMarketplaceApplicationCoreOptions.create(
      input.configData.extensions?.core ?? {},
    );
  }

  override getDefaultApplicationStorageKey(): string {
    return 'legend-marketplace';
  }
}
