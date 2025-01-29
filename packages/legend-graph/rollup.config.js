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

import { babel } from '@rollup/plugin-babel';
import resolve from '@rollup/plugin-node-resolve';
import terser from '@rollup/plugin-terser';
import json from '@rollup/plugin-json';
import flow from 'rollup-plugin-flow';
import commonjs from '@rollup/plugin-commonjs';
import postcss from 'rollup-plugin-postcss';
import url from 'postcss-url';
import path from 'path';

const extensions = ['.js', '.ts', '.jsx', '.tsx'];

export default {
  input: 'src/index.ts',
  external: ['@jest/globals', 'react-dom/server', 'react'],
  output: [
    {
      file: 'lib/bundles/bundle.cjs.js',
      format: 'cjs',
      sourcemap: false,
      inlineDynamicImports: true,
      // plugins: [terser()],
      globals: {
        'react/jsx-runtime': 'jsxRuntime',
        'react-dom/client': 'ReactDOM',
        react: 'React',
      },
    },
  ],
  plugins: [
    postcss({
      use: ['sass'],
      extensions: ['.css', '.scss'],
      extract: path.resolve('lib/bundles/style/bundle.css'),
      minimize: true,
      plugins: [
        url({
          url: 'inline',
          fallback: 'copy',
          maxSize: Infinity,
        }),
      ],
    }),
    flow({ pretty: true }),
    resolve({ extensions }),
    commonjs(),
    babel({
      babelHelpers: 'bundled',
      include: ['src/**/*.ts', 'src/**/*.tsx', 'src/**/*.json'],
      extensions,
      exclude: [
        /node_modules/,
        'src/**/__tests__/**/*.*',
        'src/**/__mocks__/**/*.*',
      ],
      plugins: [
        [
          '@babel/plugin-syntax-import-attributes',
          { deprecatedAssertSyntax: true },
        ],
      ],
      presets: [
        [
          '@babel/preset-env',
          {
            modules: false,
            loose: true,
          },
        ],
        ['@babel/preset-react', { runtime: 'automatic' }],
        [
          '@babel/typescript',
          {
            allowDeclareFields: true,
            isTSX: true,
            allExtensions: true,
          },
        ],
      ],
    }),
    json(),
  ],
};
