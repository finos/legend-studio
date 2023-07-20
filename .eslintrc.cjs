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
const isIDE = process.env.NODE_ENV === undefined;

// For debugging
// console.log(`Environment: ${process.env.NODE_ENV}`);
// console.log(`IDE (mode): ${isIDE}`);

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
    project: !isIDE
      ? ['./packages/*/tsconfig.json', './fixtures/*/tsconfig.json']
      : // this is required for VSCode ESLint extension to work properly
        true,
    tsconfigRootDir: !isIDE ? undefined : __dirname,
    /**
     * ESLint (and therefore typescript-eslint) is used in both "single run"/one-time contexts,
     * such as an ESLint CLI invocation, and long-running sessions (such as continuous feedback
     * on a file in an IDE).
     *
     * When typescript-eslint handles TypeScript Program management behind the scenes, this distinction
     * is important because there is significant overhead to managing the so called Watch Programs
     * needed for the long-running use-case.
     *
     * When allowAutomaticSingleRunInference is enabled, we will use common heuristics to infer
     * whether or not ESLint is being used as part of a single run.
     */
    allowAutomaticSingleRunInference: !isIDE,
    // Use this experimental flag to improve memory usage while using Typescript project reference
    // NOTE: Causes TS to use the source files for referenced projects instead of the compiled .d.ts files.
    // This feature is not yet optimized, and is likely to cause OOMs for medium to large projects.
    // See https://github.com/typescript-eslint/typescript-eslint/issues/2094
    EXPERIMENTAL_useSourceOfProjectReferenceRedirect: false,
  },
  plugins: ['@finos/legend-studio'],
  extends: [
    'plugin:@finos/legend-studio/recommended',
    !isIDE && 'plugin:@finos/legend-studio/computationally-expensive',
    'plugin:@finos/legend-studio/scripts-override', // must be called last to turn off rules which are not applicable for scripts
  ].filter(Boolean),
  rules: {
    // turn off the prettier format check when running this in CI (i.e. production environment) to speed up pipeline
    'prettier/prettier': !isIDE ? OFF : ERROR,
  },
};
