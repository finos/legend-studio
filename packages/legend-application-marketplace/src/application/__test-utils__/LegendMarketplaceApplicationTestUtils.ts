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

import { TEST__getApplicationVersionData } from '@finos/legend-application/test';
import {
  type LegendMarketplaceApplicationConfigurationData,
  LegendMarketplaceApplicationConfig,
} from '../LegendMarketplaceApplicationConfig.js';
import { LegendMarketplaceApplicationPlugin } from '../LegendMarketplaceApplicationPlugin.js';
import type { LegendMarketplaceBaseStore } from '../../stores/LegendMarketplaceBaseStore.js';
import { ProductCardState } from '../../stores/lakehouse/dataProducts/ProductCardState.js';
import { mockProdSearchResultResponse } from '../../components/__test-utils__/TEST_DATA__LakehouseSearchResultData.js';
import { DataProductSearchResult } from '@finos/legend-server-marketplace';
import { guaranteeNonNullable } from '@finos/legend-shared';
import { V1_PureGraphManager } from '@finos/legend-graph';
import { DEFAULT_TAB_SIZE } from '@finos/legend-application';

const TEST_DATA__appConfig: LegendMarketplaceApplicationConfigurationData = {
  appName: 'marketplace',
  env: 'test-env',
  marketplace: {
    url: 'https://testMarketplaceUrl',
    subscriptionUrl: 'https://testSubscriptionUrl',
    dataProductEnv: 'prod',
    userSearchUrl: 'https://testUserSearchUrl',
    userProfileImageUrl: 'https://testUserProfileImageUrl',
  },
  lakehouse: {
    url: 'https://testLakehouseUrl',
    platformUrl: 'https://testLakehousePlatformUrl',
    entitlements: {
      applicationDirectoryUrl: 'https://testApplicationDirectoryUrl',
      applicationIDUrl: 'https://testApplicationIDUrl',
    },
  },
  engine: {
    url: 'https://testEngineUrl',
  },
  depot: {
    url: 'https://testMetadataUrl',
  },
  terminal: {
    url: 'https://testTerminalUrl',
  },
  studio: {
    url: 'https://testStudioUrl',
    instances: [
      {
        sdlcProjectIDPrefix: 'PROD',
        url: 'http://localhost:9000/studio',
      },
    ],
  },
  query: {
    url: 'https://testQueryUrl',
  },
  powerBi: {
    url: 'https://testPowerBiUrl',
  },
  datacube: {
    url: 'https://testDatacubeUrl',
  },
  extensions: {
    core: {
      dataProductConfig: {
        publicStereotype: {
          profile: 'test::profile::EnterpriseDataProduct',
          stereotype: 'enterprise',
        },
        vendorTaggedValue: {
          profile: 'test::profile::VDP',
          value: ['Status', 'Owner'],
        },
      },
      showDevFeatures: true,
    },
  },
  assets: {
    baseUrl: '/fileName',
    productImageMap: {},
  },
};

export const TEST__getTestLegendMarketplaceApplicationConfig = (
  dataProductEnv?: string | undefined,
): LegendMarketplaceApplicationConfig => {
  const config = new LegendMarketplaceApplicationConfig({
    configData: {
      ...TEST_DATA__appConfig,
      marketplace: {
        ...TEST_DATA__appConfig.marketplace,
        dataProductEnv:
          dataProductEnv ?? TEST_DATA__appConfig.marketplace.dataProductEnv,
      },
    },
    versionData: TEST__getApplicationVersionData(),
    baseAddress: '/marketplace/',
  });
  return config;
};

export class TestLegendMarketplaceApplicationPlugin extends LegendMarketplaceApplicationPlugin {
  constructor() {
    super('TestLegendMarketplaceApplicationPlugin', '0.0.0');
  }

  override async getExtraHomePageDataProducts(
    marketplaceBaseStore: LegendMarketplaceBaseStore,
  ): Promise<ProductCardState[] | undefined> {
    // Crete graph manager for parsing ad-hoc deployed data products
    const graphManager = new V1_PureGraphManager(
      marketplaceBaseStore.applicationStore.pluginManager,
      marketplaceBaseStore.applicationStore.logService,
      marketplaceBaseStore.remoteEngine,
    );
    await graphManager.initialize(
      {
        env: marketplaceBaseStore.applicationStore.config.env,
        tabSize: DEFAULT_TAB_SIZE,
        clientConfig: {
          baseUrl: marketplaceBaseStore.applicationStore.config.engineServerUrl,
        },
      },
      { engine: marketplaceBaseStore.remoteEngine },
    );

    const searchResult = DataProductSearchResult.serialization.fromJson(
      guaranteeNonNullable(mockProdSearchResultResponse[0]),
    );
    const testImageMap = new Map<string, string>();
    const dataProductState = new ProductCardState(
      marketplaceBaseStore,
      searchResult,
      graphManager,
      testImageMap,
    );
    return [dataProductState];
  }
}
