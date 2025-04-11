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

export default {
  /**
   * `favicon` [string, optional]
   * Relative path to the favicon file
   * e.g. './assets/favicon.ico'
   */
  faviconPath: './assets/favicon.ico',
  /**
   * `baseUrl` [string, required]
   * Base URL for your site. This can also be considered the path after the host.
   * e.g. `/something/` is the `baseUrl` of https://www.example.org/something/
   * For URLs that have no path, use '/'.
   */
  baseUrl: '/marketplace/',
  /**
   * `devServerOptions` [object, optional]
   * Options to override `webpack-dev-server` configs.
   * See https://webpack.js.org/configuration/dev-server/
   */
  devServerOptions: {
    // NOTE: for development from within a Docker container, it's best to update this to 0.0.0.0
    host: 'localhost',
    port: 9008,
  },
};
