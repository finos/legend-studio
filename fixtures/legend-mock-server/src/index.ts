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

import { fastify } from 'fastify';
import { fastifyCors } from '@fastify/cors';
import DOCUMENTATION_DATA from './DummyDocumentationData.json' assert { type: 'json' };

const PORT = 9999;
// const API_BASE_URL = '/api';

const server = fastify({
  logger: true,
});

// eslint-disable-next-line @typescript-eslint/no-floating-promises
server.register(fastifyCors, {
  methods: ['OPTIONS'],
  origin: [/localhost/],
  credentials: true,
});

server.get(`/documentation.json`, async (request, reply) => {
  await reply.send(DOCUMENTATION_DATA);
});

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
