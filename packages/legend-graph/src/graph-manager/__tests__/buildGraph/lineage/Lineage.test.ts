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
      const lineageJSON = JSON.parse(fs.readFileSync(lineageJSONPath, 'utf-8'));
      const result = deserialize(LineageModel, lineageJSON);
      expect(result).toBeInstanceOf(LineageModel);
    },
  );
});
