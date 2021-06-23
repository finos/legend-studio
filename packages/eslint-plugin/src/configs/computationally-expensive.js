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

const ERROR = 2;

const IMPORT_RULES = {
  // NOTE: this rule prevents using dependencies not listed in `package.json`
  // We temporarily disable it due to the following issue
  // See https://github.com/benmosher/eslint-plugin-import/issues/2120
  // See https://github.com/benmosher/eslint-plugin-import/pull/2121
  // 'import/no-extraneous-dependencies': ERROR,
  // See https://github.com/benmosher/eslint-plugin-import/blob/master/config/warnings.js
  'import/no-named-as-default': ERROR,
  'import/no-named-as-default-member': ERROR,
  'import/no-duplicates': ERROR,
};

const TYPESCRIPT_RULES = {
  // NOTE: following rules are classified as `type-aware` linting rule, which has huge initial performance impact on linting
  // They require parserServices to be generated so we have to specify 'parserOptions.project' property for @typescript-esint/parser
  '@typescript-eslint/prefer-nullish-coalescing': ERROR,
  '@typescript-eslint/prefer-optional-chain': ERROR,
  '@typescript-eslint/no-unnecessary-condition': ERROR,
  '@typescript-eslint/no-unnecessary-type-assertion': ERROR,
  '@typescript-eslint/no-throw-literal': ERROR,
  '@typescript-eslint/no-unsafe-assignment': ERROR,
  '@typescript-eslint/no-floating-promises': ERROR,
  '@typescript-eslint/no-misused-promises': ERROR,
};

/**
 * The following rules are computationally expensive and should be turned off during development for better DX.
 *
 * There are a few major sources of performance hit for ESLint:
 * 1. Typescript type-ware check
 * 2. Import plugin
 * 3. Indentation rule
 * 4. Wide file scope (e.g. accidentally include `node_modules`)
 * See https://github.com/typescript-eslint/typescript-eslint/blob/master/docs/getting-started/linting/FAQ.md#my-linting-feels-really-slow
 */
const rules = {
  ...IMPORT_RULES,
  ...TYPESCRIPT_RULES,
};

const config = {
  parser: '@typescript-eslint/parser',
  parserOptions: { sourceType: 'module' },
  plugins: ['@typescript-eslint'],
  rules,
};

module.exports = {
  rules,
  config,
};
