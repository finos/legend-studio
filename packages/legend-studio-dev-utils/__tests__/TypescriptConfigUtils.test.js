/**
 * Copyright Goldman Sachs
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
const {
  resolveFullTsConfig,
  resolveFullTsConfigWithoutValidation,
} = require('../TypescriptConfigUtils');
const { unitTest } = require('../JestConfigUtils');

test(
  unitTest('Resolve full Typescript config through inheritance chain'),
  () => {
    expect(
      resolveFullTsConfig(
        path.resolve(__dirname, './fixtures/testTsConfigExtend.json'),
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
        path.resolve(__dirname, './fixtures/testTsConfigExtend_invalid.json'),
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
