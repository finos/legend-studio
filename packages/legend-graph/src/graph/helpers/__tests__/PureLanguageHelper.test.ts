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

import { jest, test, expect, afterEach } from '@jest/globals';
import TEST_DATA__simpleGraphEntities from './TEST_DATA__FunctionSignatureGeneration.json' with { type: 'json' };
import { unitTest } from '@finos/legend-shared/test';
import type { Entity } from '@finos/legend-storage';
import {
  generateFunctionCallString,
  generateFunctionPrettyName,
} from '../PureLanguageHelper.js';
import { TEST__getTestGraph } from '../../__test-utils__/GraphTestUtils.js';
import { getFunctionSignature } from '../DomainHelper.js';

afterEach(() => {
  // running all pending timers and switching to real timers using Jest
  // See https://testing-library.com/docs/using-fake-timers/
  jest.runOnlyPendingTimers();
  // NOTE: since `jest.useFakeTimers()` is global, it can leak across tests, we need to reset after every test
  jest.useRealTimers();
});

test(unitTest('Generate default parameter value for type'), async () => {
  const graph = await TEST__getTestGraph(
    TEST_DATA__simpleGraphEntities as Entity[],
  );
  // NOTE: this could leak
  jest.useFakeTimers();
  jest.setSystemTime(new Date(2020, 10, 1));
  const setFunction = graph.getFunction(
    'model::functions::set_String_1__IncType_1__Date_1__DateTime_1__String_1_',
  );
  expect(generateFunctionCallString(setFunction)).toBe(
    "model::functions::set('', model::IncType.Corp, %2020-11-01, %2020-11-01T00:00:00)",
  );
  expect(
    generateFunctionPrettyName(setFunction, { fullPath: true, spacing: true }),
  ).toBe(
    'model::functions::set(name: String[1], type: IncType[1], date: Date[1], dateTime: DateTime[1]): String[1]',
  );
  expect(getFunctionSignature(setFunction)).toBe(
    '_String_1__IncType_1__Date_1__DateTime_1__String_1_',
  );

  const relationFunction = graph.getFunction(
    'model::functions::relationFunction__Relation_$0_1$_',
  );
  expect(
    generateFunctionPrettyName(relationFunction, {
      fullPath: true,
      spacing: true,
    }),
  ).toBe('model::functions::relationFunction(): Relation<Any>[0..1]');
  expect(getFunctionSignature(relationFunction)).toBe('__Relation_$0_1$_');
});

const FUNCTION_GENERIC_TYPE = [
  {
    path: 'my::firmFunction__Relation_1_',
    content: {
      _type: 'function',
      body: [
        {
          _type: 'func',
          function: 'select',
          parameters: [
            {
              _type: 'func',
              function: 'limit',
              parameters: [
                {
                  _type: 'classInstance',
                  sourceInformation: {
                    endColumn: 29,
                    endLine: 21,
                    sourceId: '',
                    startColumn: 3,
                    startLine: 21,
                  },
                  type: '>',
                  value: {
                    path: ['my::testDB', 'personTable'],
                    sourceInformation: {
                      endColumn: 29,
                      endLine: 21,
                      sourceId: '',
                      startColumn: 3,
                      startLine: 21,
                    },
                  },
                },
                {
                  _type: 'integer',
                  sourceInformation: {
                    endColumn: 39,
                    endLine: 21,
                    sourceId: '',
                    startColumn: 38,
                    startLine: 21,
                  },
                  value: 10,
                },
              ],
              sourceInformation: {
                endColumn: 36,
                endLine: 21,
                sourceId: '',
                startColumn: 32,
                startLine: 21,
              },
            },
            {
              _type: 'classInstance',
              sourceInformation: {
                endColumn: 6,
                endLine: 29,
                sourceId: '',
                startColumn: 6,
                startLine: 22,
              },
              type: 'colSpecArray',
              value: {
                colSpecs: [
                  {
                    name: 'FIRSTNAME',
                    sourceInformation: {
                      endColumn: 16,
                      endLine: 23,
                      sourceId: '',
                      startColumn: 8,
                      startLine: 23,
                    },
                  },
                  {
                    name: 'ID',
                    sourceInformation: {
                      endColumn: 9,
                      endLine: 24,
                      sourceId: '',
                      startColumn: 8,
                      startLine: 24,
                    },
                  },
                  {
                    name: 'DOB',
                    sourceInformation: {
                      endColumn: 10,
                      endLine: 25,
                      sourceId: '',
                      startColumn: 8,
                      startLine: 25,
                    },
                  },
                  {
                    name: '_BIG_INT',
                    sourceInformation: {
                      endColumn: 15,
                      endLine: 26,
                      sourceId: '',
                      startColumn: 8,
                      startLine: 26,
                    },
                  },
                  {
                    name: '_SMALL_INT',
                    sourceInformation: {
                      endColumn: 17,
                      endLine: 27,
                      sourceId: '',
                      startColumn: 8,
                      startLine: 27,
                    },
                  },
                  {
                    name: '_TINY_INT',
                    sourceInformation: {
                      endColumn: 16,
                      endLine: 28,
                      sourceId: '',
                      startColumn: 8,
                      startLine: 28,
                    },
                  },
                ],
              },
            },
          ],
          sourceInformation: {
            endColumn: 48,
            endLine: 21,
            sourceId: '',
            startColumn: 43,
            startLine: 21,
          },
        },
      ],
      name: 'firmFunction__Relation_1_',
      package: 'my',
      parameters: [],
      postConstraints: [],
      preConstraints: [],
      returnGenericType: {
        rawType: {
          _type: 'packageableType',
          fullPath: 'meta::pure::metamodel::relation::Relation',
        },
        typeArguments: [
          {
            rawType: {
              _type: 'relationType',
              columns: [
                {
                  genericType: {
                    rawType: {
                      _type: 'packageableType',
                      fullPath: 'Varchar',
                    },
                    typeVariableValues: [
                      {
                        _type: 'integer',
                        value: 100,
                      },
                    ],
                  },
                  multiplicity: {
                    lowerBound: 0,
                    upperBound: 1,
                  },
                  name: 'FIRSTNAME',
                },
                {
                  genericType: {
                    rawType: {
                      _type: 'packageableType',
                      fullPath: 'Integer',
                    },
                  },
                  multiplicity: {
                    lowerBound: 0,
                    upperBound: 1,
                  },
                  name: 'ID',
                },
                {
                  genericType: {
                    rawType: {
                      _type: 'packageableType',
                      fullPath: 'Timestamp',
                    },
                  },
                  multiplicity: {
                    lowerBound: 0,
                    upperBound: 1,
                  },
                  name: 'DOB',
                },
                {
                  genericType: {
                    rawType: {
                      _type: 'packageableType',
                      fullPath: 'BigInt',
                    },
                  },
                  multiplicity: {
                    lowerBound: 0,
                    upperBound: 1,
                  },
                  name: '_BIG_INT',
                },
                {
                  genericType: {
                    rawType: {
                      _type: 'packageableType',
                      fullPath: 'SmallInt',
                    },
                  },
                  multiplicity: {
                    lowerBound: 0,
                    upperBound: 1,
                  },
                  name: '_SMALL_INT',
                },
                {
                  genericType: {
                    rawType: {
                      _type: 'packageableType',
                      fullPath: 'TinyInt',
                    },
                  },
                  multiplicity: {
                    lowerBound: 0,
                    upperBound: 1,
                  },
                  name: '_TINY_INT',
                },
              ],
            },
          },
        ],
      },
      returnMultiplicity: {
        lowerBound: 1,
        upperBound: 1,
      },
    },
    classifierPath:
      'meta::pure::metamodel::function::ConcreteFunctionDefinition',
  },
  {
    path: 'my::testDB',
    content: {
      _type: 'relational',
      filters: [],
      joins: [],
      name: 'testDB',
      package: 'my',
      schemas: [
        {
          name: 'default',
          tables: [
            {
              columns: [
                {
                  name: 'ID',
                  nullable: false,
                  type: {
                    _type: 'Integer',
                  },
                },
                {
                  name: 'FIRSTNAME',
                  nullable: true,
                  type: {
                    _type: 'Varchar',
                    size: 100,
                  },
                },
                {
                  name: 'AGE',
                  nullable: true,
                  type: {
                    _type: 'Integer',
                  },
                },
                {
                  name: 'FIRMID',
                  nullable: true,
                  type: {
                    _type: 'Integer',
                  },
                },
                {
                  name: 'DOB',
                  nullable: true,
                  type: {
                    _type: 'Timestamp',
                  },
                },
                {
                  name: '_BIG_INT',
                  nullable: true,
                  type: {
                    _type: 'BigInt',
                  },
                },
                {
                  name: '_SMALL_INT',
                  nullable: true,
                  type: {
                    _type: 'SmallInt',
                  },
                },
                {
                  name: '_TINY_INT',
                  nullable: true,
                  type: {
                    _type: 'TinyInt',
                  },
                },
              ],
              name: 'personTable',
              primaryKey: ['ID'],
            },
          ],
          views: [],
        },
      ],
    },
    classifierPath: 'meta::relational::metamodel::Database',
  },
];
test(
  unitTest('Generate pretty name for FUNCTION_GENERIC_TYPE entities'),
  async () => {
    const graph = await TEST__getTestGraph(FUNCTION_GENERIC_TYPE as Entity[]);
    const firmFunction = graph.getFunction('my::firmFunction__Relation_1_');
    expect(
      generateFunctionPrettyName(firmFunction, {
        fullPath: true,
        spacing: true,
      }),
    ).toBe('my::firmFunction(): Relation<RelationType>[1]');
  },
);
