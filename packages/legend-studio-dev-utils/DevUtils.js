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
const { cosmiconfigSync } = require('cosmiconfig');

const getFileContent = (file) => fs.readFileSync(file, { encoding: 'utf-8' });
const createRegExp = (pattern) => new RegExp(pattern);

const exit = (msg, code) => {
  console.log(msg);
  process.exit(code);
};
const exitWithError = (msg) => exit(msg, 1);
const exitWithSuccess = (msg) => exit(msg, 0);
const exitOrThrowError = (msg, throwError = true) => {
  if (throwError) {
    throw new Error(msg);
  } else {
    exitWithError(msg);
  }
};

const getConfigLoader = (configName) =>
  cosmiconfigSync(configName, {
    searchPlaces: [
      'package.json',
      `.${configName}rc`,
      `.${configName}rc.json`,
      `.${configName}rc.js`,
      `${configName}.config.js`,
    ],
  });

module.exports = {
  exitOrThrowError,
  exitWithError,
  exitWithSuccess,
  getConfigLoader,
  getFileContent,
  createRegExp,
};
