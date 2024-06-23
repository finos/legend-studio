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

import { execSync } from 'child_process';
import { dirname, resolve } from 'path';
import { fileURLToPath } from 'url';
import { rimrafSync } from 'rimraf';
import { mkdirSync } from 'fs';

const __dirname = dirname(fileURLToPath(import.meta.url));

const ANTLR_VERSION = '4.13.1';

// Download the ANTLR jar to generate grammars
// See https://github.com/antlr/antlr4/blob/master/doc/getting-started.md#unix
execSync(
  `curl -o build/antlr.jar https://www.antlr.org/download/antlr-${ANTLR_VERSION}-complete.jar`,
);

// Flush the content of the current generated content directory
rimrafSync(resolve(__dirname, 'parser/generated'));
mkdirSync(resolve(__dirname, 'parser/generated'));

// ANTLR generation targeting Typescript
// See https://github.com/antlr/antlr4/blob/master/doc/typescript-target.md
['datacube_filter__lexer.g4', 'datacube_filter__parser.g4'].forEach((file) => {
  execSync(
    `java -jar ${resolve(__dirname, '../build/antlr.jar')} -Dlanguage=TypeScript -no-listener ${resolve(__dirname, file)} -o ${resolve(__dirname, 'parser/generated')}`,
  );
});
