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

/// <reference types="jest-extended" />
import { ApplicationConfig, URL_PATH_PLACEHOLDER } from './ApplicationConfig';
import { ApplicationStore } from './ApplicationStore';
import { createBrowserHistory } from 'history';
import { WebApplicationNavigator } from './WebApplicationNavigator';
import { Log } from '@finos/legend-shared';

export const TEST_DATA__applicationConfig = {
  appName: 'test-app',
  env: 'test-env',
  sdlc: {
    url: 'https://testSdlcUrl',
  },
  engine: {
    url: 'https://testEngineUrl',
  },
  depot: {
    url: 'https://testMetadataUrl',
  },
  documentation: {
    url: 'https://testDocUrl',
  },
};

export const TEST_DATA__applicationVersion = {
  buildTime: '2001-01-01T00:00:00-0000',
  version: 'test-version',
  commitSHA: 'test-commit-id',
};

export const TEST__getTestApplicationConfig = (
  extraConfigData = {},
): ApplicationConfig => {
  const config = new ApplicationConfig(
    {
      ...TEST_DATA__applicationConfig,
      ...extraConfigData,
    },
    TEST_DATA__applicationVersion,
    '/studio/',
  );
  config.setSDLCServerKey(URL_PATH_PLACEHOLDER);
  return config;
};

export const TEST__getTestApplicationStore = (): ApplicationStore =>
  new ApplicationStore(
    TEST__getTestApplicationConfig(),
    new WebApplicationNavigator(createBrowserHistory()),
    new Log(),
  );
