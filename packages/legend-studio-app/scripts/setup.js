/**
 * Copyright 2020 Goldman Sachs
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

const fs = require('fs');
const path = require('path');

const devDir = path.resolve(__dirname, '../dev');

if (!fs.existsSync(devDir)) {
  fs.mkdirSync(devDir);
}

fs.writeFileSync(
  path.resolve(devDir, 'version.json'),
  JSON.stringify(
    {
      'git.build.time': new Date().toISOString(),
      'git.build.version': 'LOCAL',
      'git.commit.id': 'LOCAL',
    },
    null,
    2,
  ),
);

fs.writeFileSync(
  path.resolve(devDir, 'config.json'),
  JSON.stringify(
    {
      appName: 'studio',
      env: 'local',
      sdlc: {
        url: 'https://legend.finos.org/sdlc/api',
      },
      engine: {
        url: 'https://legend.finos.org/exec',
      },
      tracer: {
        serviceName: 'legend studio',
        url: 'https://legend.finos.org/zipkin',
      },
      documentation: {
        url: 'https://legend.finos.org',
      },
    },
    null,
    2,
  ),
);
