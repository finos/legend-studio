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

import { dirname, resolve } from 'path';
import { fileURLToPath } from 'url';
import { readFileSync } from 'fs';
import { fastify } from 'fastify';
import { fastifyCors } from '@fastify/cors';

const __dirname = dirname(fileURLToPath(import.meta.url));

const getFileContent = (file: string): string =>
  readFileSync(file, { encoding: 'utf-8' });

const PORT = 9999;
const RESOURCE_BASE_URL = '/resource';

const server = fastify({
  logger: true,
});

server.register(fastifyCors, {
  methods: ['OPTIONS'],
  origin: [/localhost/],
  credentials: true,
});

server.get(
  `${RESOURCE_BASE_URL}/documentation.json`,
  async (request, reply) => {
    await reply.send(
      JSON.parse(
        getFileContent(
          resolve(__dirname, '../data/documentationRegistry/dummy.json'),
        ),
      ),
    );
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
