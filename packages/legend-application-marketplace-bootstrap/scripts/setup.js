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

import { existsSync, mkdirSync, writeFileSync } from 'fs';
import { resolve } from 'path';

export const setup = (outputDir) => {
  if (!existsSync(outputDir)) {
    mkdirSync(outputDir);
  }

  writeFileSync(
    resolve(outputDir, 'version.json'),
    JSON.stringify(
      {
        buildTime: new Date().toISOString(),
        version: '0.0.0-local',
        commitSHA: 'local',
      },
      null,
      2,
    ),
  );

  writeFileSync(
    resolve(outputDir, 'config.json'),
    JSON.stringify(
      {
        appName: 'marketplace',
        env: 'local',
        marketplace: {
          url: 'http://localhost:6400/api',
          subscriptionUrl: 'http://localhost:6400/subscriptions/api',
          userSearchUrl: 'http://localhost:6400/user-search/api',
          userProfileImageUrl:
            'http://localhost:6400/user-profile-image/api?userId={userId}',
          oidcConfig: {
            redirectPath: '/callback',
            silentRedirectPath: '/callback?silent=true',
            authProviderProps: {
              authority: 'http://localhost:8080/auth',
              client_id: 'test-client-id',
            },
          },
        },
        lakehouse: {
          url: 'http://localhost:6400/api',
          platformUrl: 'http://localhost:6400/platform/api',
          entitlements: {
            applicationDirectoryUrl: 'http://localhost:2000/api',
            applicationIDUrl: 'http://localhost:2100/api',
          },
        },
        engine: {
          url: 'http://localhost:6300/api',
        },
        depot: {
          url: 'http://localhost:6200/depot/api',
        },
        studio: {
          url: 'http://localhost:9000/studio',
          instances: [
            {
              sdlcProjectIDPrefix: 'PROD',
              url: 'http://localhost:9000/studio',
            },
          ],
        },
        query: {
          url: 'http://localhost:9001/query',
        },
        datacube: {
          url: 'http://localhost:9007/datacube',
        },
        documentation: {
          url: 'https://legend.finos.org',
          registry: [],
        },
        extensions: {
          core: {
            showDevFeatures: true,
          },
        },
      },
      undefined,
      2,
    ),
  );
};
