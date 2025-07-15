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

import { test, describe, expect } from '@jest/globals';
import path from 'path';
import fs from 'fs';
import { deserialize } from 'serializr';
import { LineageModel } from '../../../../graph/metamodel/pure/lineage/LineageModel.js';
import type { PlainObject } from '@finos/legend-shared';

type LineageTestCase = [
  string,
  {
    lineageJSONPath: string;
  },
];

const cases: LineageTestCase[] = [
  [
    'Deserialize lineage JSON into LineageModel',
    {
      lineageJSONPath: path.resolve(__dirname, './lineageRequest.json'),
    },
  ],
];

describe('Lineage deserialization tests', () => {
  test.each(cases)(
    '%s',
    async (testName: LineageTestCase[0], context: LineageTestCase[1]) => {
      const { lineageJSONPath } = context;
      const lineageJsonString = fs.readFileSync(lineageJSONPath, 'utf-8');
      const lineageJSON: PlainObject = JSON.parse(
        lineageJsonString,
      ) as PlainObject;
      const deser = deserialize(LineageModel, lineageJSON);
      const result: LineageModel = Array.isArray(deser)
        ? (deser[0] as LineageModel)
        : deser;

      expect(result.databaseLineage.nodes.length).toBe(3);
      expect(result.databaseLineage.edges.length).toBe(2);
      expect(result.databaseLineage.nodes[0].data.id).toBe('Lambda');
    },
  );
});
