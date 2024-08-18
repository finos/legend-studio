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

const COMPUTATIONALLY_EXPENSIVE_RULES =
  require('./computationally-expensive.js').rules;
const RECOMMENDED_RULES = require('./recommended.js').recommendedRules;

const OFF = 0;

const config = {
  overrides: [
    {
      // relax linting rules for scripts
      files: ['**.{mjs,cjs,js}'],
      parser: '@babel/eslint-parser', // use this parser for non-ts files so it does not require `parserOptions.project` config like `@typescript-eslint/parser`
      rules: {
        'no-console': OFF,
        'no-process-env': OFF,
        'no-process-exit': OFF,
        'import/no-default-export': OFF, // export default from script so we can use `require()` syntax
        '@typescript-eslint/no-require-imports': OFF,
        ...[
          ...Object.keys(RECOMMENDED_RULES.react),
          ...Object.keys(RECOMMENDED_RULES.studio),
          ...Object.keys(RECOMMENDED_RULES.typescript),
          ...Object.keys(COMPUTATIONALLY_EXPENSIVE_RULES),
        ].reduce((acc, val) => {
          acc[val] = OFF;
          return acc;
        }, {}),
      },
    },
  ],
};

module.exports = {
  config,
};
