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

const path = require('path');
const { declare } = require('@babel/helper-plugin-utils');

const isJSXSourceFile = (filename) =>
  /\.(?:j|t)sx$/.test(filename) &&
  !filename.includes(path.normalize('/__tests__/')) && // exclude tests
  !filename.includes(path.normalize('/__mocks__/')); // exclude mocks

module.exports = declare((api, opts) => {
  api.assertVersion(7); // assert Babel version

  const {
    development = false,
    useTypescript = false,
    useReact = false,
    useReactFastRefresh = false,
  } = opts;

  /** @type {import('@babel/core').TransformOptions} */
  const config = {
    presets: [
      [
        '@babel/preset-env',
        {
          debug: false, // use `debug` option to see the lists of plugins being selected
        },
      ],
      useReact && [
        '@babel/preset-react',
        {
          development,
          runtime: 'automatic', // use React@17 JSX transform
        },
      ],
      useTypescript && [
        '@babel/preset-typescript',
        {
          onlyRemoveTypeImports: true,
          // Allow using `declare` keyword for class fields.
          // `allowDeclareFields` will be `true` by default in babel 8
          // See https://babeljs.io/docs/en/babel-preset-typescript#allowdeclarefields
          allowDeclareFields: true,
        },
      ],
    ].filter(Boolean),
    plugins: [
      useTypescript && [
        '@babel/plugin-syntax-import-attributes',
        {
          // NOTE: when import attribute is official support in Typescript, then we could move the `assert` syntax to `with`
          // See https://github.com/microsoft/TypeScript/issues/53656
          deprecatedAssertSyntax: true,
        },
      ],
    ].filter(Boolean),
    overrides: [
      {
        test: (filename) => filename && isJSXSourceFile(filename),
        plugins: [
          // This plugin provides `react-refresh` capability, but it MUST be DISABLED for PROD
          // NOTE: as of now, this strictly works with React related files (i.e. TSX/JSX) so we have to isolate it from non-jsx files as it will cause a few issues:
          //  1. Throw error while processing indirection (i.e. web-workers or JS template - this seems to have been resolved when using webpack@5 worker support)
          //  See https://github.com/pmmmwh/react-refresh-webpack-plugin/blob/main/docs/TROUBLESHOOTING.md#usage-with-indirection-like-workers-and-js-templates
          //  2. When we allow this to process non-jsx files, it would throw errors like the following potentially because we force HMR on modules that HMR does not support (?):
          //  `[HMR] Error: Aborted because something.js is not accepted`
          //  See https://github.com/pmmmwh/react-refresh-webpack-plugin/issues/24#issuecomment-672816401
          useReact &&
            useReactFastRefresh &&
            development &&
            'react-refresh/babel',
        ].filter(Boolean),
      },
    ],
  };

  return config;
});
