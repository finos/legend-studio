/**
 * Copyright (c) 2026-present, Goldman Sachs
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

import { describe, expect, test } from '@jest/globals';
import { CUBE_ENGINE_TEST__sqlToJson } from '../../../../../__test-utils__/CubeEngineTestSupport.js';
import TREES from '../../../../__tests__/CubeSqlTrees.json' with { type: 'json' };

// The trees Cube's tests read an island's SQL from (`CubeSqlTrees.json`) are
// the engine's own: its SQL grammar still parses each SQL into the tree
// beside it, so a change of the engine's tree fails here first

describe("The engine's tree of the SQL of Cube's tests", () => {
  test.each(Object.entries(TREES))(
    'The engine parses %s into the tree the tests read',
    async (_name, { sql, tree }) => {
      expect(await CUBE_ENGINE_TEST__sqlToJson(sql)).toEqual(tree);
    },
  );
});
