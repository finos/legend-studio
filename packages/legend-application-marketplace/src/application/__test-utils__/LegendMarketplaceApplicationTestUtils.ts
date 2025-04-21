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

const TEST_DATA__appConfig: LegendMarketplaceApplicationConfigurationData = {
  appName: 'marketplace',
  env: 'test-env',
  marketplace: {
    url: 'https://testMarketplaceUrl',
  },
  engine: {
    url: 'https://testEngineUrl',
  },
  depot: {
    url: 'https://testMetadataUrl',
  },
};

export const TEST__getTestLegendMarketplaceApplicationConfig = (
  extraConfigData = {},
): LegendMarketplaceApplicationConfig => {
  const config = new LegendMarketplaceApplicationConfig({
    configData: {
      ...TEST_DATA__appConfig,
      ...extraConfigData,
    },
    versionData: TEST__getApplicationVersionData(),
    baseAddress: '/marketplace/',
  });
  return config;
};
