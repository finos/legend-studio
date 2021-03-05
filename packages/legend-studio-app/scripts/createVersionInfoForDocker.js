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
const { execSync } = require('child_process');

const webContentDir = path.resolve(__dirname, '../dist/studio');

if (!fs.existsSync(webContentDir)) {
  throw Error(
    'Make sure to build the web application before running this script',
  );
}

const time = new Date();

fs.writeFileSync(
  path.resolve(webContentDir, 'version.json'),
  JSON.stringify(
    {
      'git.build.time': time.toISOString(),
      'git.build.version': `${time.getFullYear()}${(time.getMonth() + 1)
        .toString()
        .padStart(2, '0')}${time.getDate().toString().padStart(2, '0')}`,
      'git.commit.id': execSync(`git rev-parse HEAD`, {
        encoding: 'utf-8',
      }).trim(),
    },
    null,
    2,
  ),
);
