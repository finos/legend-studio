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

const globals = require('globals');
const babel_parser = require('@babel/eslint-parser');
const eslint_plugin = require('@eslint/js');

/** @type {import('eslint').Linter.Config} */
const config = {
  rules: {
    ...eslint_plugin.configs.recommended.rules,
  },
  plugins: {
    eslint: eslint_plugin,
  },
  files: ['**/*.{mjs,cjs,js}'],
  languageOptions: {
    parser: babel_parser,
    parserOptions: { sourceType: 'module' },
    globals: {
      ...globals.browser,
      ...globals.node,
      ...globals.es6,
      ...globals.amd,
      ...globals.jest,
    },
  },
};

module.exports = {
  config,
};
