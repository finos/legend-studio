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
import { LegendDataCubeApplicationConfig } from '../LegendDataCubeApplicationConfig.js';

const TEST_DATA__appConfig = {
  appName: 'datacube',
  env: 'test-env',
  engine: {
    url: 'https://testEngineUrl',
    queryUrl: 'https://testEngineQueryUrl',
  },
  depot: {
    url: 'https://testMetadataUrl',
  },
  studio: {
    url: 'https://testStudioUrl',
    instances: [],
  },
  query: {
    url: 'https://testStudioUrl',
    instances: [],
  },
};

export const TEST__getTestLegendDataCubeApplicationConfig = (
  extraConfigData = {},
): LegendDataCubeApplicationConfig => {
  const config = new LegendDataCubeApplicationConfig({
    configData: {
      ...TEST_DATA__appConfig,
      ...extraConfigData,
    },
    versionData: TEST__getApplicationVersionData(),
    baseAddress: '/datacube/',
  });
  return config;
};
