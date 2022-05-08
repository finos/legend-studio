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

module.exports = (api) => {
  // `cache.invalidate()`: The config is cache based on the value of NODE_ENV.
  // Any time the using callback returns a value other than the one that was expected,
  // the overall config function will be called again and all entries in the cache will
  // be **replaced** with the result.
  // See https://babeljs.io/docs/en/config-files#apicache
  api.cache.invalidate(() => process.env.NODE_ENV);
  const isEnvDevelopment = api.env('development');

  return {
    presets: [
      [
        '@finos/babel-preset-legend-studio',
        {
          development: isEnvDevelopment,
          useTypescript: true,
          useReact: true,
          useReactFastRefresh: true,
        },
      ],
    ],
  };
};
