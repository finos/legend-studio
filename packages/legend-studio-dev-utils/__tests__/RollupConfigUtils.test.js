/**
 * Copyright 2020 Goldman Sachs
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
const { unitTest } = require('../JestConfigUtils');

const {
  buildAliasEntriesFromTsConfigPathMapping,
} = require('../RollupConfigUtils');

test(
  unitTest('Build Rollup alias entries from Typescript path mapping'),
  () => {
    const aliases = buildAliasEntriesFromTsConfigPathMapping({
      dirname: __dirname,
      tsConfigPath: path.resolve(
        __dirname,
        './fixtures/testTsConfigPathMapping_noArrayValues.json',
      ),
      excludePaths: ['toBeExcluded/*'],
    });
    expect(aliases).toEqual([
      {
        find: new RegExp('^@something\\/(.*)$'), // eslint-disable-line prefer-named-capture-group
        replacement: path.resolve(__dirname, './src/$1'),
      },
      {
        find: new RegExp('^somePath$'),
        replacement: path.resolve(__dirname, './src/somePath'),
      },
    ]);
  },
);

test(
  unitTest(
    'Build Rollup alias entries from Typescript path mapping (with array value)',
  ),
  () => {
    const mockedConsole = jest.spyOn(console, 'log').mockImplementation();
    const aliases = buildAliasEntriesFromTsConfigPathMapping({
      dirname: __dirname,
      tsConfigPath: path.resolve(
        __dirname,
        './fixtures/testTsConfigPathMapping.json',
      ),
      excludePaths: ['toBeExcluded/*'],
    });
    expect(aliases).toEqual([
      {
        find: new RegExp('^@something\\/(.*)$'), // eslint-disable-line prefer-named-capture-group
        replacement: path.resolve(__dirname, './src/$1'),
      },
      {
        find: new RegExp('^somePath$'),
        replacement: path.resolve(__dirname, './src/somePath'),
      },
    ]);
    expect(mockedConsole).toHaveBeenCalledTimes(1);
    expect(mockedConsole.mock.calls[0][0]).toContain(
      'Typescript path-mapping contains array value which is not supported by',
    );
  },
);

test(
  unitTest(
    'Build Rollup alias entries from Typescript path mapping (with `baseUrl`)',
  ),
  () => {
    const mockedConsole = jest.spyOn(console, 'log').mockImplementation();
    const aliases = buildAliasEntriesFromTsConfigPathMapping({
      dirname: __dirname,
      tsConfigPath: path.resolve(
        __dirname,
        './fixtures/testTsConfigPathMapping_withBaseUrl.json',
      ),
      excludePaths: ['toBeExcluded/*'],
    });
    expect(aliases).toEqual([
      {
        find: new RegExp('^@something\\/(.*)$'), // eslint-disable-line prefer-named-capture-group
        replacement: path.resolve(__dirname, '../..', './src/$1'),
      },
      {
        find: new RegExp('^somePath$'),
        replacement: path.resolve(__dirname, '../..', './src/somePath'),
      },
    ]);
    expect(mockedConsole).toHaveBeenCalledTimes(1);
    expect(mockedConsole.mock.calls[0][0]).toContain(
      'Typescript path-mapping contains array value which is not supported by',
    );
  },
);
