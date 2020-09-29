/**
 * Copyright 2020 Goldman Sachs
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *      http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */

/**
 * Rules in this advanced config are expensive and thus, should be turned off for better DX
 * However, some of them enforces best practices we want to follow so we make them throw error
 * rather than warning during production build, and prompt developers to check before pushing code.
 * 
 * There are a few major sources of performance hit for ESLint:
 * 1. Typescript type-ware check
 * 2. Import plugin
 * 3. Indentation rule (we don't include this one here since it does not show to be too expensive for now)
 * 4. Wide file scope (e.g. accidentally include `node_modules`)
 * See https://github.com/typescript-eslint/typescript-eslint/blob/master/docs/getting-started/linting/FAQ.md#my-linting-feels-really-slow
 */
const path = require('path');

const OFF = 0;
const ERROR = 2;

const IMPORT_RULES = {
  'import/no-extraneous-dependencies': ERROR,
  // See https://github.com/benmosher/eslint-plugin-import/blob/master/config/warnings.js
  'import/no-named-as-default': ERROR,
  'import/no-named-as-default-member': ERROR,
  'import/no-duplicates': ERROR,
};

const TYPE_INFORMATION_REQUIRED_RULES = {
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

module.exports = {
  // Turn off typescript linting for JS files, e.g. webpack.config.js, etc.
  // NOTE: we could have put them in .eslintignore but we choose to still be able to lint them using `eslint`
  plugins: [
    '@typescript-eslint'
  ],
  overrides: [{
    files: ['**.js'],
    parser: 'babel-eslint',
    rules: Object.keys(TYPE_INFORMATION_REQUIRED_RULES).reduce((acc, val) => { acc[val] = OFF; return acc; }, {})
  }],
  // Parser option is required for generating parserService to run specific rules like
  // `prefer-nullish-coalescing`, and `prefer-optional-chain`
  // This seems like a problem with either `vscode-eslint` or `@typescript-eslint/parser`
  // See https://github.com/typescript-eslint/typescript-eslint/issues/251
  // See https://github.com/microsoft/vscode-eslint/issues/605
  parserOptions: {
    project: path.resolve(__dirname, './tsconfig.json'),
  },
  extends: [
    path.resolve(__dirname, './.eslintrc.js'),
  ],
  rules: { ...TYPE_INFORMATION_REQUIRED_RULES, ...IMPORT_RULES }
};
