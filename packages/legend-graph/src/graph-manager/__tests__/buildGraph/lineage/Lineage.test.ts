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
      const lineageJSON = JSON.parse(
        fs.readFileSync(lineageJSONPath, 'utf-8'),
      ) as unknown[];
      const result = deserialize(LineageModel, lineageJSON);
      expect(result).toBeInstanceOf(LineageModel);
      expect(result.databaseLineage.nodes).toHaveLength(3);
      expect(result.databaseLineage.edges).toHaveLength(2);
      expect(result.databaseLineage.nodes[0].data.id).toBe('Lambda');
      expect(result.databaseLineage.edges[0].data.type).toBe('DataSet');

      // Assert classLineage
      expect(result.classLineage.nodes).toHaveLength(3);
      expect(result.classLineage.edges).toHaveLength(2);
      expect(result.classLineage.nodes[1].data.id).toBe('demo::trade::Trade');
      expect(result.classLineage.edges[1].data.type).toBe('Registered');

      // Assert functionTrees
      expect(result.functionTrees).toHaveLength(1);
      expect(result.functionTrees[0].display).toBe('root');
      expect(result.functionTrees[0].children[0].display).toBe('Trade');
      expect(result.functionTrees[0].children[0].children[0].display).toBe(
        'id',
      );

      // Assert reportLineage
      expect(result.reportLineage.columns).toHaveLength(2);
      expect(result.reportLineage.columns[0].name).toBe('id');
      expect(result.reportLineage.columns[0].propertyTree.display).toBe('root');
      expect(result.reportLineage.columns[1].name).toBe('value');
      expect(
        result.reportLineage.columns[1].propertyTree.children[0].display,
      ).toBe('Trade');
    },
  );
});
