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

import * as yargs from 'yargs';
import { hideBin } from 'yargs/helpers';
import { resolve, dirname } from 'path';
import { fileURLToPath } from 'url';
import { existsSync, mkdirSync, writeFileSync } from 'fs';

const __dirname = dirname(fileURLToPath(import.meta.url));

const argv = yargs.default(hideBin(process.argv)).argv;

const setup = (outputDir) => {
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
        appName: 'ide',
        env: 'local',
        pure: {
          url: 'http://localhost:9200',
          dynamic: argv['use-dynamic-pure-server'] ? true : undefined,
        },
        documentation: {
          url: 'https://legend.finos.org',
          registry: [
            /**
             * NOTE: the end-point must enable CORS and allow origin from everywhere (ideally)
             * Or, we would need to use a CORS proxy. Note that we usually need to deploy these
             * `cors-anywhere` has a nice live deployment which requires temporarily access
             *
             * See https://github.com/Rob--W/cors-anywhere
             * See https://cors-anywhere.herokuapp.com/
             * See https://gist.github.com/jimmywarting/ac1be6ea0297c16c477e17f8fbe51347
             */
            // { url: 'https://cors-anywhere.herokuapp.com/https://raw.githubusercontent.com/finos/legend/master/website/static/resource/studio/documentation/shared.json' },
            /**
             * Use this end-point when developing documentation locally
             */
            // { url: 'http://localhost:9999/resource/documentation.json' },
            {
              url: 'https://legend.finos.org/resource/studio/documentation/pure-ide.json',
              simple: true,
            },
          ],
        },
      },
      undefined,
      2,
    ),
  );
};

setup(resolve(__dirname, `../${argv.dir}`));
