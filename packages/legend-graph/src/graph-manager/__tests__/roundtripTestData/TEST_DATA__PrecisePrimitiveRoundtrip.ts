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

/**
 * Class properties, a derived property and a function typed with precise primitive
 * types, some of which take type variable values (e.g. `Varchar(200)`, `Numeric(10,2)`).
 * The class `Address` is referenced through a section import to check that the raw type
 * keeps its input spelling.
 *
 * ```pure
 * import test::*;
 * Class test::Address
 * {
 *   street: Varchar(100)[1];
 * }
 *
 * Class test::PrecisePerson
 * {
 *   name: Varchar(200)[1];
 *   balance: Numeric(10,2)[0..1];
 *   createdAt: Timestamp[1];
 *   id: BigInt[1];
 *   nickname: String[0..1];
 *   address: Address[0..1];
 *   displayName() {$this.name}: Varchar(200)[1];
 * }
 *
 * function test::currencyCode(): Varchar(3)[1]
 * {
 *   'USD'->cast(@Varchar(3))
 * }
 * ```
 */
export const TEST_DATA__PrecisePrimitiveRoundtrip = [
  {
    path: '__internal__::SectionIndex',
    content: {
      _type: 'sectionIndex',
      name: 'SectionIndex',
      package: '__internal__',
      sections: [
        {
          _type: 'importAware',
          elements: [
            'test::Address',
            'test::PrecisePerson',
            'test::currencyCode__Varchar_1_',
          ],
          imports: ['test'],
          parserName: 'Pure',
        },
      ],
    },
    classifierPath: 'meta::pure::metamodel::section::SectionIndex',
  },
  {
    path: 'test::Address',
    content: {
      _type: 'class',
      name: 'Address',
      package: 'test',
      properties: [
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
            lowerBound: 1,
            upperBound: 1,
          },
          name: 'street',
        },
      ],
    },
    classifierPath: 'meta::pure::metamodel::type::Class',
  },
  {
    path: 'test::PrecisePerson',
    content: {
      _type: 'class',
      name: 'PrecisePerson',
      package: 'test',
      properties: [
        {
          genericType: {
            rawType: {
              _type: 'packageableType',
              fullPath: 'Varchar',
            },
            typeVariableValues: [
              {
                _type: 'integer',
                value: 200,
              },
            ],
          },
          multiplicity: {
            lowerBound: 1,
            upperBound: 1,
          },
          name: 'name',
        },
        {
          genericType: {
            rawType: {
              _type: 'packageableType',
              fullPath: 'Numeric',
            },
            typeVariableValues: [
              {
                _type: 'integer',
                value: 10,
              },
              {
                _type: 'integer',
                value: 2,
              },
            ],
          },
          multiplicity: {
            lowerBound: 0,
            upperBound: 1,
          },
          name: 'balance',
        },
        {
          genericType: {
            rawType: {
              _type: 'packageableType',
              fullPath: 'Timestamp',
            },
          },
          multiplicity: {
            lowerBound: 1,
            upperBound: 1,
          },
          name: 'createdAt',
        },
        {
          genericType: {
            rawType: {
              _type: 'packageableType',
              fullPath: 'BigInt',
            },
          },
          multiplicity: {
            lowerBound: 1,
            upperBound: 1,
          },
          name: 'id',
        },
        {
          genericType: {
            rawType: {
              _type: 'packageableType',
              fullPath: 'String',
            },
          },
          multiplicity: {
            lowerBound: 0,
            upperBound: 1,
          },
          name: 'nickname',
        },
        {
          genericType: {
            rawType: {
              _type: 'packageableType',
              fullPath: 'Address',
            },
          },
          multiplicity: {
            lowerBound: 0,
            upperBound: 1,
          },
          name: 'address',
        },
      ],
      qualifiedProperties: [
        {
          body: [
            {
              _type: 'property',
              parameters: [
                {
                  _type: 'var',
                  name: 'this',
                },
              ],
              property: 'name',
            },
          ],
          name: 'displayName',
          parameters: [],
          returnGenericType: {
            rawType: {
              _type: 'packageableType',
              fullPath: 'Varchar',
            },
            typeVariableValues: [
              {
                _type: 'integer',
                value: 200,
              },
            ],
          },
          returnMultiplicity: {
            lowerBound: 1,
            upperBound: 1,
          },
        },
      ],
    },
    classifierPath: 'meta::pure::metamodel::type::Class',
  },
  {
    path: 'test::currencyCode__Varchar_1_',
    content: {
      _type: 'function',
      body: [
        {
          _type: 'func',
          function: 'cast',
          parameters: [
            {
              _type: 'string',
              value: 'USD',
            },
            {
              _type: 'genericTypeInstance',
              genericType: {
                multiplicityArguments: [],
                rawType: {
                  _type: 'packageableType',
                  fullPath: 'Varchar',
                },
                typeArguments: [],
                typeVariableValues: [
                  {
                    _type: 'integer',
                    value: 3,
                  },
                ],
              },
            },
          ],
        },
      ],
      name: 'currencyCode__Varchar_1_',
      package: 'test',
      parameters: [],
      postConstraints: [],
      preConstraints: [],
      returnGenericType: {
        rawType: {
          _type: 'packageableType',
          fullPath: 'Varchar',
        },
        typeVariableValues: [
          {
            _type: 'integer',
            value: 3,
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
];
