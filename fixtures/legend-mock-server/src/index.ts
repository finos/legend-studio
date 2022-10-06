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

/**
 * Previously, these exports rely on ES module interop to expose `default` export
 * properly. But since we use `ESM` for Typescript resolution now, we lose this
 *
 * TODO: remove these when the package properly work with Typescript's nodenext
 * module resolution
 *
 * @workaround ESM
 * See https://github.com/microsoft/TypeScript/issues/49298
 * See https://github.com/microsoft/TypeScript/issues/50690
 */
import { default as Fastify } from 'fastify';
import { default as FastifyCORS } from '@fastify/cors';
import TAXONOMY_TREE_DATA from './TEST_DATA__TaxonomyTreeData.json' assert { type: 'json' };
import DOCUMENTATION_DATA from './DummyDocumentationData.json' assert { type: 'json' };

const PORT = 9999;
const API_BASE_URL = '/api';
const STUDIO_BASE_URL = '/studio';

const fastify = Fastify.default({
  logger: true,
});

// eslint-disable-next-line @typescript-eslint/no-floating-promises
fastify.register(FastifyCORS.default, {
  methods: ['OPTIONS'],
  origin: [/localhost/],
  credentials: true,
});

fastify.get(
  `${API_BASE_URL}/taxonomy/taxonomy-tree`,
  async (request, reply) => {
    await reply.send(TAXONOMY_TREE_DATA);
  },
);

fastify.get(`${STUDIO_BASE_URL}/documentation.json`, async (request, reply) => {
  await reply.send(DOCUMENTATION_DATA);
});

fastify.listen(PORT, (error, address) => {
  if (error) {
    throw error;
  }
});
