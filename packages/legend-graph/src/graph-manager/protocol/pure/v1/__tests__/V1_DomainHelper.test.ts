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

import { test, expect, describe } from '@jest/globals';
import { unitTest } from '@finos/legend-shared/test';
import { type V1_ConcreteFunctionDefinition } from '../model/packageableElements/function/V1_ConcreteFunctionDefinition.js';
import { deserialize } from 'serializr';
import { V1_functionModelSchema } from '../transformation/pureProtocol/serializationHelpers/V1_DomainSerializationHelper.js';
import { V1_getFunctionNameWithoutSignature } from '../helpers/V1_DomainHelper.js';

describe('V1_DomainHelper', () => {
  describe('V1_getFunctionNameWithoutSignature', () => {
    test(unitTest('return function name if no signature is appended'), () => {
      const func: V1_ConcreteFunctionDefinition = deserialize(
        V1_functionModelSchema([]),
        {
          _type: 'function',
          name: 'MyFunc',
          preConstraints: [],
          postConstraints: [],
          parameters: [
            {
              _type: 'var',
              name: 'testParam',
              multiplicity: {
                lowerBound: 1,
                upperBound: 1,
              },
              class: 'Integer',
            },
          ],
          returnType: 'Integer',
          returnMultiplicity: {
            lowerBound: 1,
            upperBound: 1,
          },
          stereotypes: [],
          taggedValues: [],
          body: [
            {
              _type: 'func',
              function: 'plus',
              parameters: [
                {
                  _type: 'collection',
                  multiplicity: {
                    lowerBound: 2,
                    upperBound: 2,
                  },
                  values: [
                    {
                      _type: 'integer',
                      value: 10,
                    },
                    {
                      _type: 'var',
                      name: 'testParam',
                    },
                  ],
                },
              ],
            },
          ],
          package: 'showcase::northwind::function',
        },
      );

      expect(V1_getFunctionNameWithoutSignature(func)).toBe('MyFunc');
    });

    test(
      unitTest('return base function name when name contains signature'),
      () => {
        const func: V1_ConcreteFunctionDefinition = deserialize(
          V1_functionModelSchema([]),
          {
            _type: 'function',
            name: 'MyFunc_Integer_1__Integer_1_',
            preConstraints: [],
            postConstraints: [],
            parameters: [
              {
                _type: 'var',
                name: 'testParam',
                multiplicity: {
                  lowerBound: 1,
                  upperBound: 1,
                },
                class: 'Integer',
              },
            ],
            returnType: 'Integer',
            returnMultiplicity: {
              lowerBound: 1,
              upperBound: 1,
            },
            stereotypes: [],
            taggedValues: [],
            body: [
              {
                _type: 'func',
                function: 'plus',
                parameters: [
                  {
                    _type: 'collection',
                    multiplicity: {
                      lowerBound: 2,
                      upperBound: 2,
                    },
                    values: [
                      {
                        _type: 'integer',
                        value: 10,
                      },
                      {
                        _type: 'var',
                        name: 'testParam',
                      },
                    ],
                  },
                ],
              },
            ],
            package: 'showcase::northwind::function',
          },
        );

        expect(V1_getFunctionNameWithoutSignature(func)).toBe('MyFunc');
      },
    );
  });
});
