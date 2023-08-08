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

import { type FastifyInstance, type RequestGenericInterface } from 'fastify';
import {
  ShowcaseRegistry,
  type ShowcaseRegistryConfig,
} from './ShowcaseRegistry.js';
import { HttpStatus } from '@finos/legend-shared';

interface GetShowcaseRequest extends RequestGenericInterface {
  Params: {
    path: string;
  };
}

interface TextSearchRequest extends RequestGenericInterface {
  Querystring: {
    searchText: string;
  };
}

export const configureShowcaseRegistryServer = async (
  server: FastifyInstance,
  config: ShowcaseRegistryConfig & {
    apiBaseUrl?: string | undefined;
  },
): Promise<void> => {
  const registry = await ShowcaseRegistry.initialize(config);
  const baseUrl = config.apiBaseUrl ?? '/api';

  server.get(`${baseUrl}/showcases`, async (request, reply) => {
    await reply.send(registry.getShowcases());
  });

  server.get<GetShowcaseRequest>(
    `${baseUrl}/showcase/:path`,
    async (request, reply) => {
      const { path } = request.params;
      const showcase = registry.getShowcase(path);
      if (!showcase) {
        reply.callNotFound();
        return;
      }

      await reply.send(registry.getShowcase(path));
    },
  );

  server.get<TextSearchRequest>(
    `${baseUrl}/showcases/search`,
    async (request, reply) => {
      const { searchText } = request.query;

      await reply.send(await registry.search(searchText));
    },
  );

  server.get(`${baseUrl}/showcases/refresh`, async (request, reply) => {
    await registry.fetchData();
    await reply.status(HttpStatus.NO_CONTENT).send();
  });
};
