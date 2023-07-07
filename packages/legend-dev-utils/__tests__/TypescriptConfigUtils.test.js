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

import { test, expect } from '@jest/globals';
import { resolve } from 'path';
import {
  getTsConfigJSON,
  resolveFullTsConfig,
  resolveFullTsConfigWithoutValidation,
} from '../TypescriptConfigUtils.js';
import { unitTest } from '../jest/testUtils.js';

test(
  unitTest('Resolve full Typescript config through inheritance chain'),
  () => {
    expect(
      resolveFullTsConfig(
        resolve(__dirname, './fixtures/testTsConfigExtend.json'),
      ),
    ).toEqual({
      // compiler options is merged and overwritten
      compilerOptions: {
        emitDeclarationOnly: true,
        jsx: 'react-jsx',
        outDir: './lib',
        paths: { somePath: 'somePath' },
        rootDir: './src',
        strictNullChecks: true,
      },
      // `files`, `exclude`, `include` are simply overwritten
      files: ['./src/dummy.ts'], // files are automatically added by `tsc`
      exclude: ['excludeParent'],
      include: ['src/**/*.ts', 'src/**/*.tsx', 'src/**/*.json'],
      // references are not inherited
    });
  },
);

test(
  unitTest(
    'Resolve full Typescript config without validation through inheritance chain',
  ),
  () => {
    expect(
      // This invalid config doesn't have `files` nor `include`
      // would fail `tsc --showConfig`
      resolveFullTsConfigWithoutValidation(
        resolve(__dirname, './fixtures/testTsConfigExtend_invalid.json'),
      ),
    ).toEqual({
      // compiler options is merged and overwritten
      compilerOptions: {
        emitDeclarationOnly: true,
        jsx: 'react-jsx',
        outDir: 'lib',
        paths: { somePath: 'somePath' },
        rootDir: 'src',
        strictNullChecks: true,
      },
      // extends is removed as we have fully resolved the config
      extends: undefined,
      // `files`, `exclude`, `include` are simply overwritten
      exclude: ['excludeParent'],
      // references are not inherited
    });
  },
);

test(unitTest('Parse Typescript config non-recursively'), () => {
  expect(
    getTsConfigJSON(
      resolve(__dirname, './fixtures/testTsConfigWithTrailingCommas.json'),
    ),
  ).toEqual({
    compilerOptions: {
      paths: {
        '@something/*': './src/*',
        somePath: ['./src/somePath', './src/somePath1'],
        'toBeExcluded/*': 'nothing',
      },
    },
    include: ['src/**/*.ts', 'src/**/*.tsx', 'src/**/*.json'],
  });
  expect(() =>
    getTsConfigJSON(
      resolve(__dirname, './fixtures/testTsConfigWithTrailingCommas.json'),
      true,
    ),
  ).toThrow();
});
