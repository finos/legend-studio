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

const OFF = 0;
const WARN = 1;
const ERROR = 2;

const IMPORT_RULES = {
  'import/no-extraneous-dependencies': ERROR,
  // See https://github.com/benmosher/eslint-plugin-import/blob/master/config/warnings.js
  'import/no-named-as-default': ERROR,
  'import/no-named-as-default-member': ERROR,
};

const TYPESCRIPT_RULES = {
  '@typescript-eslint/prefer-nullish-coalescing': [
    ERROR,
    {
      ignoreConditionalTests: true,
      ignoreTernaryTests: true,
      ignoreMixedLogicalExpressions: true,
    },
  ],
  '@typescript-eslint/prefer-optional-chain': ERROR,
  '@typescript-eslint/no-unnecessary-condition': ERROR,
  '@typescript-eslint/no-unnecessary-type-assertion': ERROR,
  '@typescript-eslint/only-throw-error': ERROR,
  '@typescript-eslint/no-unsafe-assignment': ERROR,
  '@typescript-eslint/no-floating-promises': ERROR,
  '@typescript-eslint/no-misused-promises': ERROR,

  '@typescript-eslint/no-implied-eval': ERROR,
  '@typescript-eslint/await-thenable': ERROR,

  '@typescript-eslint/unbound-method': WARN,
  '@typescript-eslint/no-redundant-type-constituents': WARN,

  // NOTE: since we turn on TS option --exactOptionalPropertyTypes, this rule mistakenly flags ?: ... | undefined as violation
  // so we temporarily turn it off
  // See https://github.com/typescript-eslint/typescript-eslint/issues/9203
  '@typescript-eslint/no-duplicate-type-constituents': OFF,

  // The following rules are recommended but we need to disable them since we deem them unecessarily strict
  // See https://github.com/typescript-eslint/typescript-eslint/blob/main/packages/eslint-plugin/src/configs/recommended-type-checked.ts
  '@typescript-eslint/no-unsafe-argument': OFF,
  '@typescript-eslint/no-unsafe-member-access': OFF,
  '@typescript-eslint/no-unsafe-enum-comparison': OFF, // we compare enum with strings a lot for valid reasons so this rule should be disabled
  '@typescript-eslint/no-unsafe-return': OFF, // we use `any` return type a lot for valid reasons so this rule should be disabled
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
