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
import { parseLosslessJSON } from '@finos/legend-shared';
import { V1_readCubeExpression } from '../V1_CubeExpression.js';

const AT = (column: number) => ({
  sourceId: 'extend101:0',
  startLine: 1,
  startColumn: column,
  endLine: 1,
  endColumn: column,
});

describe('Cube expression reader', () => {
  test("Keeps a number literal's digits as text, makes every other number a number, and gives the lambda without locations", () => {
    const text = JSON.stringify({
      _type: 'lambda',
      parameters: [{ _type: 'var', name: 'x', sourceInformation: AT(1) }],
      body: [
        {
          _type: 'collection',
          multiplicity: { lowerBound: 3, upperBound: 3 },
          sourceInformation: AT(5),
          values: [
            { _type: 'integer', value: 1, sourceInformation: AT(6) },
            { _type: 'float', value: 2.5, sourceInformation: AT(9) },
            { _type: 'string', value: '12', sourceInformation: AT(14) },
          ],
        },
      ],
    }).replace('"value":1,', '"value":9007199254740993,');
    const { lambda, located } = V1_readCubeExpression(parseLosslessJSON(text));
    expect(JSON.stringify(lambda)).toBe(
      JSON.stringify({
        _type: 'lambda',
        parameters: [{ _type: 'var', name: 'x' }],
        body: [
          {
            _type: 'collection',
            multiplicity: { lowerBound: 3, upperBound: 3 },
            values: [
              { _type: 'integer', value: '9007199254740993' },
              { _type: 'float', value: '2.5' },
              { _type: 'string', value: '12' },
            ],
          },
        ],
      }),
    );
    expect(JSON.stringify(located)).toContain(
      '"sourceInformation":{"sourceId":"extend101:0","startLine":1,"startColumn":6,"endLine":1,"endColumn":6}',
    );
  });

  test('Refuses anything but an object', () => {
    expect(() => V1_readCubeExpression(parseLosslessJSON('[]'))).toThrow(
      'The engine parsed the expression as no object',
    );
  });
});
