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
const ERROR = 2;

/**
 * We need to detect environment for ESLint CLI because there are rules
 * which are computationally expensive to perform during development.
 * Therefore, for each environments, we will enable/disable these rules according:
 *  - For `development` mode (when watching for changes and re-compile): DISABLE
 *  - For `IDE` ESLint process (to keep the IDE snappy): DISABLE
 *  - For `production` mode (to produce bundled code): ENABLE
 *  - For `linting` process (to check code quality in CI): ENABLE
 */
const enableFastMode =
  process.env.NODE_ENV === undefined || // IDE ESLint process runs without setting a NODE environment
  (process.env.NODE_ENV === 'development' &&
    process.env.DEVELOPMENT_MODE !== 'advanced');

/**
 * NOTE: this config is supposed to be used for both the IDE ESLint process
 * and the CI ESLint process. However, since we have many Typescript projects,
 * `typescript-eslint` does not seem to handle this well enough as it can end up
 * throwing Out-Of-Memory error if we just call `eslint` from the root directory.
 * As such, for CI, we will call `eslint` from each package separately as this is
 * the only rules that runs the expensive linting rules
 *
 * See https://github.com/typescript-eslint/typescript-eslint/issues/1192
 */

module.exports = {
  root: true, // tell ESLint to stop looking further up in directory tree to resolve for parent configs
  parserOptions: {
    // `parserOptions.project` is required for generating parser service to run specific rules like
    // `prefer-nullish-coalescing`, and `prefer-optional-chain`
    project: ['./packages/*/tsconfig.json', './fixtures/*/tsconfig.json'],
    // Use this experimental flag to improve memory usage while using Typescript project reference
    // See https://github.com/typescript-eslint/typescript-eslint/issues/2094
    EXPERIMENTAL_useSourceOfProjectReferenceRedirect: true,
  },
  plugins: ['@finos/legend-studio'],
  extends: [
    'plugin:@finos/legend-studio/recommended',
    !enableFastMode && 'plugin:@finos/legend-studio/computationally-expensive',
    'plugin:@finos/legend-studio/scripts-override', // must be called last to turn off rules which are not applicable for scripts
  ].filter(Boolean),
  rules: {
    // turn off the prettier format check when running this in CI (i.e. production environment)
    // to speed up pipeline
    'prettier/prettier': process.env.NODE_ENV === 'production' ? OFF : ERROR,
  },
};
