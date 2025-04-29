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
    oidcConfig?: LegendMarketplaceOidcConfig | undefined;
  };
  depot: { url: string };
  engine: {
    url: string;
  };
  lakehouse?: {
    url: string;
  };
  studio?: {
    url: string;
  };
}

export class LegendMarketplaceApplicationConfig extends LegendApplicationConfig {
  readonly options = new LegendMarketplaceApplicationCoreOptions();

  readonly marketplaceServerUrl: string;
  readonly marketplaceOidcConfig?: LegendMarketplaceOidcConfig | undefined;
  readonly engineServerUrl: string;
  readonly depotServerUrl: string;
  readonly lakehouseServerUrl?: string;
  readonly studioServerUrl?: string;

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

    if (input.configData.lakehouse) {
      this.lakehouseServerUrl = LegendApplicationConfig.resolveAbsoluteUrl(
        guaranteeNonEmptyString(
          input.configData.depot.url,
          `Can't configure application: 'lakehouse.url' field is missing or empty`,
        ),
      );
    }
    // studio
    if (input.configData.studio) {
      this.studioServerUrl = LegendApplicationConfig.resolveAbsoluteUrl(
        guaranteeNonEmptyString(
          input.configData.studio.url,
          `Can't configure application: 'studio.url' field is missing or empty`,
        ),
      );
    }

    // options
    this.options = LegendMarketplaceApplicationCoreOptions.create(
      input.configData.extensions?.core ?? {},
    );
  }

  override getDefaultApplicationStorageKey(): string {
    return 'legend-marketplace';
  }
}
