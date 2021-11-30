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

import Fastify from 'fastify';
import FastifyCORS from 'fastify-cors';
import TAXONOMY_TREE_DATA from './TEST_DATA__TaxonomyTreeData.json';

const PORT = 60001;
const BASE_URL = '/api/';

const fastify = Fastify({
  logger: true,
});

// eslint-disable-next-line @typescript-eslint/no-floating-promises
fastify.register(FastifyCORS, {
  methods: ['OPTIONS'],
  origin: [/localhost/],
  credentials: true,
});

fastify.get(`${BASE_URL}taxonomy-tree`, async (request, reply) => {
  await reply.send(TAXONOMY_TREE_DATA);
});

fastify.listen(PORT, (error, address) => {
  if (error) {
    throw error;
  }
});
