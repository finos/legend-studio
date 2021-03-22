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
  buildAliasEntriesFromTsConfigPathMapping,
} = require('../WebpackConfigUtils');
const { unitTest } = require('../JestConfigUtils');

test(unitTest('Build Webpack aliases from Typescript path mapping'), () => {
  const aliases = buildAliasEntriesFromTsConfigPathMapping({
    dirname: __dirname,
    tsConfigPath: path.resolve(
      __dirname,
      './fixtures/testTsConfigPathMapping.json',
    ),
    excludePaths: ['toBeExcluded/*'],
  });
  expect(aliases).toEqual({
    '@something': [path.resolve(__dirname, './src')],
    somePath$: [
      path.resolve(__dirname, './src/somePath'),
      path.resolve(__dirname, './src/somePath1'),
    ],
  });
});

test(
  unitTest(
    'Build Webpack aliases from Typescript path mapping (with `baseUrl`)',
  ),
  () => {
    const aliases = buildAliasEntriesFromTsConfigPathMapping({
      dirname: __dirname,
      tsConfigPath: path.resolve(
        __dirname,
        './fixtures/testTsConfigPathMapping_withBaseUrl.json',
      ),
      excludePaths: ['toBeExcluded/*'],
    });
    expect(aliases).toEqual({
      '@something': [path.resolve(__dirname, '../..', './src')],
      somePath$: [
        path.resolve(__dirname, '../..', './src/somePath'),
        path.resolve(__dirname, '../..', './src/somePath1'),
      ],
    });
  },
);
