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

import { LegendQueryConfig } from '../application/LegendQueryConfig.js';
import { TEST_DATA__applicationVersion } from '@finos/legend-application';

export const TEST_DATA__queryConfig = {
  appName: 'test-query-app',
  env: 'test-env',
  engine: {
    url: 'https://testEngineUrl',
  },
  depot: {
    url: 'https://testMetadataUrl',
  },
  studio: {
    url: 'http://testStudioUrl',
  },
};

export const TEST__getTestQueryConfig = (
  extraConfigData = {},
): LegendQueryConfig => {
  const config = new LegendQueryConfig(
    {
      ...TEST_DATA__queryConfig,
      ...extraConfigData,
    },
    TEST_DATA__applicationVersion,
    '/query/',
  );
  return config;
};
