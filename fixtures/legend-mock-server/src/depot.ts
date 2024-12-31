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

import { fastify, type RequestGenericInterface } from 'fastify';
import { fastifyCors } from '@fastify/cors';
import {
  DATA_SPACE_ANALYTICS_FILE_CONTENT,
  DATA_SPACE_STORED_ENTITIES,
  ENTITIES,
  PMCD,
  PROJECT_DATA,
} from './depot-data.js';

const PORT = 6200;
const API_BASE_URL = '/depot/api';

const server = fastify({
  logger: true,
});

server.register(fastifyCors, {
  methods: ['OPTIONS'],
  origin: [/localhost/],
  credentials: true,
});

server.get(`${API_BASE_URL}/info`, async (request, reply) => {
  await reply.send({ status: 'ok' });
});

server.get<
  RequestGenericInterface & {
    Params: {
      groupId: string;
      artifactId: string;
    };
  }
>(
  `${API_BASE_URL}/project-configurations/:groupId/:artifactId`,
  async (request, reply) => {
    await reply.send(PROJECT_DATA);
  },
);

server.get<
  RequestGenericInterface & {
    Params: {
      groupId: string;
      artifactId: string;
    };
  }
>(
  `${API_BASE_URL}/versions/:groupId/:artifactId/latest`,
  async (request, reply) => {
    await reply.send(PROJECT_DATA);
  },
);

server.get<
  RequestGenericInterface & {
    Params: {
      groupId: string;
      artifactId: string;
      versionId: string;
    };
  }
>(
  `${API_BASE_URL}/projects/:groupId/:artifactId/versions/:versionId/dependencies`,
  async (request, reply) => {
    await reply.send([]);
  },
);

server.get<
  RequestGenericInterface & {
    Params: {
      groupId: string;
      artifactId: string;
      versionId: string;
    };
  }
>(
  `${API_BASE_URL}/projects/:groupId/:artifactId/versions/:versionId`,
  async (request, reply) => {
    await reply.send(ENTITIES);
  },
);

server.get<
  RequestGenericInterface & {
    Params: {
      groupId: string;
      artifactId: string;
      versionId: string;
    };
  }
>(
  `${API_BASE_URL}/projects/:groupId/:artifactId/versions/:versionId/pureModelContextData`,
  async (request, reply) => {
    await reply.send(PMCD);
  },
);

server.get<
  RequestGenericInterface & {
    Params: {
      classifier: string;
    };
  }
>(
  `${API_BASE_URL}/classifiers/:classifier/entities`,
  async (request, reply) => {
    await reply.send(DATA_SPACE_STORED_ENTITIES);
  },
);

server.get<
  RequestGenericInterface & {
    Params: {
      groupId: string;
      artifactId: string;
      versionId: string;
      filePath: string;
    };
  }
>(
  `${API_BASE_URL}/generationFileContent/:groupId/:artifactId/versions/:versionId/file/:filePath`,
  async (request, reply) => {
    await reply.send(JSON.stringify(DATA_SPACE_ANALYTICS_FILE_CONTENT));
  },
);

server.listen(
  {
    port: PORT,
  },
  (error, address) => {
    if (error) {
      throw error;
    }
  },
);
