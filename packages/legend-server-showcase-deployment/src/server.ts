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

import { existsSync, readFileSync } from 'fs';
import { fastify } from 'fastify';
import { fastifyCors } from '@fastify/cors';
import { configureShowcaseRegistryServer } from './ShowcaseRegistryServer.js';
import type { ShowcaseRegistryConfig } from './ShowcaseRegistry.js';

const API_BASE_URL = '/api';

const configFilePath = process.argv[2] ?? './config.json';
if (!existsSync(configFilePath)) {
  throw new Error(`Can't find config file at path '${configFilePath}'`);
}
const config = JSON.parse(
  readFileSync(configFilePath, { encoding: 'utf-8' }),
) as ShowcaseRegistryConfig & { port: number };

const server = fastify({
  logger: true,
});

server.register(fastifyCors, {});

await configureShowcaseRegistryServer(server, {
  apiBaseUrl: API_BASE_URL,
  datasources: (config as ShowcaseRegistryConfig).datasources.map(
    (datasource) => {
      if (datasource.path) {
        return {
          path: datasource.path,
        };
      }
      return datasource;
    },
  ),
});

server.listen(
  {
    port: config.port,
    // NOTE: this is required to expose the server to the host machine
    host: '0.0.0.0',
  },
  (error, address) => {
    if (error) {
      throw error;
    }
  },
);
