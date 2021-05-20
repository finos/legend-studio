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

// References to resolve in Mapping
// - Class mapping - targetClass
// - PropertyMapping - Property
// - Pure Instance - source class `OPTIONAL`
// - Enumeration mapping - targetEnumeration
// - Enumeration mapping - sourceType `OPTIONAL`
// - Association mapping - targetAssociation
// - Association mapping - stores
// - MappingTest - inputData - flatdata
// - MappingTest - inputData - class
export const testMappingRoundtrip = [
  {
    path: 'test::tClass',
    content: {
      _type: 'class',
      name: 'tClass',
      package: 'test',
      properties: [
        {
          multiplicity: {
            lowerBound: 1,
            upperBound: 1,
          },
          name: 'fullName',
          type: 'String',
        },
        {
          multiplicity: {
            lowerBound: 0,
          },
          name: 'name',
          type: 'String',
        },
      ],
    },
    classifierPath: 'meta::pure::metamodel::type::Class',
  },
  {
    path: 'test::tEnum',
    content: {
      _type: 'Enumeration',
      name: 'tEnum',
      package: 'test',
      values: [
        {
          value: 'b',
        },
      ],
    },
    classifierPath: 'meta::pure::metamodel::type::Enumeration',
  },
  {
    path: 'test::tMapping1',
    content: {
      _type: 'mapping',
      classMappings: [
        {
          _type: 'operation',
          class: 'tClass',
          id: 'tiec',
          operation: 'STORE_UNION',
          parameters: ['tiec', 'tiec'],
          root: true,
        },
      ],
      enumerationMappings: [],
      includedMappings: [],
      name: 'tMapping1',
      package: 'test',
      tests: [],
    },
    classifierPath: 'meta::pure::mapping::Mapping',
  },
  {
    path: 'test::tMapping2',
    content: {
      _type: 'mapping',
      classMappings: [
        {
          _type: 'operation',
          class: 'tClass',
          id: 'test_tClass',
          operation: 'STORE_UNION',
          parameters: ['test_tClass'],
          root: true,
        },
        {
          _type: 'pureInstance',
          class: 'tClass',
          id: 'cay',
          propertyMappings: [
            {
              _type: 'purePropertyMapping',
              property: {
                class: 'tClass',
                property: 'fullName',
              },
              explodeProperty: false,
              source: '',
              transform: {
                _type: 'lambda',
                body: [
                  {
                    _type: 'func',
                    function: 'substring',
                    parameters: [
                      {
                        _type: 'property',
                        parameters: [
                          {
                            _type: 'var',
                            name: 'src',
                            sourceInformation: {
                              endColumn: 18,
                              endLine: 32,
                              sourceId: 'test::tMapping2',
                              startColumn: 15,
                              startLine: 32,
                            },
                          },
                        ],
                        property: 'fullName',
                        sourceInformation: {
                          endColumn: 27,
                          endLine: 32,
                          sourceId: 'test::tMapping2',
                          startColumn: 20,
                          startLine: 32,
                        },
                      },
                      {
                        _type: 'integer',
                        multiplicity: {
                          lowerBound: 1,
                          upperBound: 1,
                        },
                        sourceInformation: {
                          endColumn: 40,
                          endLine: 32,
                          sourceId: 'test::tMapping2',
                          startColumn: 40,
                          startLine: 32,
                        },
                        values: [0],
                      },
                      {
                        _type: 'func',
                        function: 'indexOf',
                        parameters: [
                          {
                            _type: 'property',
                            parameters: [
                              {
                                _type: 'var',
                                name: 'src',
                                sourceInformation: {
                                  endColumn: 46,
                                  endLine: 32,
                                  sourceId: 'test::tMapping2',
                                  startColumn: 43,
                                  startLine: 32,
                                },
                              },
                            ],
                            property: 'fullName',
                            sourceInformation: {
                              endColumn: 55,
                              endLine: 32,
                              sourceId: 'test::tMapping2',
                              startColumn: 48,
                              startLine: 32,
                            },
                          },
                          {
                            _type: 'string',
                            multiplicity: {
                              lowerBound: 1,
                              upperBound: 1,
                            },
                            sourceInformation: {
                              endColumn: 68,
                              endLine: 32,
                              sourceId: 'test::tMapping2',
                              startColumn: 66,
                              startLine: 32,
                            },
                            values: [' '],
                          },
                        ],
                        sourceInformation: {
                          endColumn: 64,
                          endLine: 32,
                          sourceId: 'test::tMapping2',
                          startColumn: 58,
                          startLine: 32,
                        },
                      },
                    ],
                    sourceInformation: {
                      endColumn: 38,
                      endLine: 32,
                      sourceId: 'test::tMapping2',
                      startColumn: 30,
                      startLine: 32,
                    },
                  },
                ],
                parameters: [],
              },
            },
            {
              _type: 'purePropertyMapping',
              property: {
                class: 'tClass',
                property: 'fullName',
              },
              source: '',
              transform: {
                _type: 'lambda',
                body: [
                  {
                    _type: 'func',
                    function: 'substring',
                    parameters: [
                      {
                        _type: 'property',
                        parameters: [
                          {
                            _type: 'var',
                            name: 'src',
                            sourceInformation: {
                              endColumn: 18,
                              endLine: 32,
                              sourceId: 'test::tMapping3',
                              startColumn: 15,
                              startLine: 32,
                            },
                          },
                        ],
                        property: 'fullName',
                        sourceInformation: {
                          endColumn: 17,
                          endLine: 32,
                          sourceId: 'test::tMapping3',
                          startColumn: 20,
                          startLine: 32,
                        },
                      },
                      {
                        _type: 'integer',
                        multiplicity: {
                          lowerBound: 1,
                          upperBound: 1,
                        },
                        sourceInformation: {
                          endColumn: 40,
                          endLine: 32,
                          sourceId: 'test::tMapping3',
                          startColumn: 40,
                          startLine: 32,
                        },
                        values: [0],
                      },
                      {
                        _type: 'func',
                        function: 'indexOf',
                        parameters: [
                          {
                            _type: 'property',
                            parameters: [
                              {
                                _type: 'var',
                                name: 'src',
                                sourceInformation: {
                                  endColumn: 46,
                                  endLine: 32,
                                  sourceId: 'test::tMapping3',
                                  startColumn: 43,
                                  startLine: 32,
                                },
                              },
                            ],
                            property: 'fullName',
                            sourceInformation: {
                              endColumn: 55,
                              endLine: 32,
                              sourceId: 'test::tMapping3',
                              startColumn: 48,
                              startLine: 32,
                            },
                          },
                          {
                            _type: 'string',
                            multiplicity: {
                              lowerBound: 1,
                              upperBound: 1,
                            },
                            sourceInformation: {
                              endColumn: 68,
                              endLine: 32,
                              sourceId: 'test::tMapping3',
                              startColumn: 66,
                              startLine: 32,
                            },
                            values: [' '],
                          },
                        ],
                        sourceInformation: {
                          endColumn: 64,
                          endLine: 32,
                          sourceId: 'test::tMapping3',
                          startColumn: 58,
                          startLine: 32,
                        },
                      },
                    ],
                    sourceInformation: {
                      endColumn: 38,
                      endLine: 32,
                      sourceId: 'test::tMapping3',
                      startColumn: 30,
                      startLine: 32,
                    },
                  },
                ],
                parameters: [],
              },
            },
            {
              _type: 'purePropertyMapping',
              property: {
                class: 'tClass',
                property: 'name',
              },
              source: '',
              explodeProperty: true,
              transform: {
                _type: 'lambda',
                body: [
                  {
                    _type: 'func',
                    function: 'substring',
                    parameters: [
                      {
                        _type: 'property',
                        parameters: [
                          {
                            _type: 'func',
                            function: 'cast',
                            parameters: [
                              {
                                _type: 'var',
                                name: 'src',
                                sourceInformation: {
                                  endColumn: 14,
                                  endLine: 33,
                                  sourceId: 'test::tMapping2',
                                  startColumn: 11,
                                  startLine: 33,
                                },
                              },
                              {
                                _type: 'hackedClass',
                                fullPath: 'tClass',
                                sourceInformation: {
                                  endColumn: 28,
                                  endLine: 33,
                                  sourceId: 'test::tMapping2',
                                  startColumn: 23,
                                  startLine: 33,
                                },
                              },
                            ],
                            sourceInformation: {
                              endColumn: 20,
                              endLine: 33,
                              sourceId: 'test::tMapping2',
                              startColumn: 17,
                              startLine: 33,
                            },
                          },
                        ],
                        property: 'fullName',
                        sourceInformation: {
                          endColumn: 38,
                          endLine: 33,
                          sourceId: 'test::tMapping2',
                          startColumn: 31,
                          startLine: 33,
                        },
                      },
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
                            sourceInformation: {
                              endColumn: 81,
                              endLine: 33,
                              sourceId: 'test::tMapping2',
                              startColumn: 79,
                              startLine: 33,
                            },
                            values: [
                              {
                                _type: 'func',
                                function: 'indexOf',
                                parameters: [
                                  {
                                    _type: 'property',
                                    parameters: [
                                      {
                                        _type: 'var',
                                        name: 'src',
                                        sourceInformation: {
                                          endColumn: 54,
                                          endLine: 33,
                                          sourceId: 'test::tMapping2',
                                          startColumn: 51,
                                          startLine: 33,
                                        },
                                      },
                                    ],
                                    property: 'fullName',
                                    sourceInformation: {
                                      endColumn: 63,
                                      endLine: 33,
                                      sourceId: 'test::tMapping2',
                                      startColumn: 56,
                                      startLine: 33,
                                    },
                                  },
                                  {
                                    _type: 'string',
                                    multiplicity: {
                                      lowerBound: 1,
                                      upperBound: 1,
                                    },
                                    sourceInformation: {
                                      endColumn: 76,
                                      endLine: 33,
                                      sourceId: 'test::tMapping2',
                                      startColumn: 74,
                                      startLine: 33,
                                    },
                                    values: [' '],
                                  },
                                ],
                                sourceInformation: {
                                  endColumn: 72,
                                  endLine: 33,
                                  sourceId: 'test::tMapping2',
                                  startColumn: 66,
                                  startLine: 33,
                                },
                              },
                              {
                                _type: 'integer',
                                multiplicity: {
                                  lowerBound: 1,
                                  upperBound: 1,
                                },
                                sourceInformation: {
                                  endColumn: 81,
                                  endLine: 33,
                                  sourceId: 'test::tMapping2',
                                  startColumn: 81,
                                  startLine: 33,
                                },
                                values: [1],
                              },
                            ],
                          },
                        ],
                        sourceInformation: {
                          endColumn: 81,
                          endLine: 33,
                          sourceId: 'test::tMapping2',
                          startColumn: 79,
                          startLine: 33,
                        },
                      },
                      {
                        _type: 'func',
                        function: 'length',
                        parameters: [
                          {
                            _type: 'property',
                            parameters: [
                              {
                                _type: 'var',
                                name: 'src',
                                sourceInformation: {
                                  endColumn: 87,
                                  endLine: 33,
                                  sourceId: 'test::tMapping2',
                                  startColumn: 84,
                                  startLine: 33,
                                },
                              },
                            ],
                            property: 'fullName',
                            sourceInformation: {
                              endColumn: 96,
                              endLine: 33,
                              sourceId: 'test::tMapping2',
                              startColumn: 89,
                              startLine: 33,
                            },
                          },
                        ],
                        sourceInformation: {
                          endColumn: 104,
                          endLine: 33,
                          sourceId: 'test::tMapping2',
                          startColumn: 99,
                          startLine: 33,
                        },
                      },
                    ],
                    sourceInformation: {
                      endColumn: 49,
                      endLine: 33,
                      sourceId: 'test::tMapping2',
                      startColumn: 41,
                      startLine: 33,
                    },
                  },
                ],
                parameters: [],
              },
            },
          ],
          root: false,
          srcClass: 'tClass',
        },
      ],
      enumerationMappings: [
        {
          enumValueMappings: [
            {
              enumValue: 'b',
              sourceValues: [
                {
                  _type: 'enumSourceValue',
                  enumeration: 'test::tEnum',
                  value: 'b',
                },
              ],
            },
          ],
          enumeration: 'tEnum',
          id: 'TargetTradeTypeMapping2',
        },
      ],
      includedMappings: [],
      name: 'tMapping2',
      package: 'test',
      tests: [
        {
          assert: {
            _type: 'expectedOutputMappingTestAssert',
            expectedOutput:
              '{"defects":[],"value":{"name":"oneName 99"},"source":{"defects":[],"value":{"oneName":"oneName 99"},"source":{"number":1,"record":"{\\"oneName\\":\\"oneName 99\\",\\"anotherName\\":\\"anotherName 17\\",\\"oneDate\\":\\"2020-04-13\\",\\"anotherDate\\":\\"2020-02-25\\",\\"oneNumber\\":27,\\"anotherNumber\\":28}"}}}',
          },
          inputData: [
            {
              _type: 'object',
              data: '{"oneName":"oneName 2","anotherName":"anotherName 16","oneDate":"2020-02-05","anotherDate":"2020-04-13","oneNumber":24,"anotherNumber":29}',
              inputType: 'JSON',
              sourceClass: 'tClass',
            },
            {
              _type: 'object',
              data: '{"oneName":"oneName 2","anotherName":"anotherName 16","oneDate":"2020-02-05","anotherDate":"2020-04-13","oneNumber":24,"anotherNumber":29}',
              inputType: 'XML',
              sourceClass: 'tClass',
            },
          ],
          name: 'test2',
          query: {
            _type: 'lambda',
            body: [
              {
                _type: 'func',
                function: 'serialize',
                parameters: [
                  {
                    _type: 'func',
                    function: 'graphFetchChecked',
                    parameters: [
                      {
                        _type: 'func',
                        function: 'getAll',
                        parameters: [
                          {
                            _type: 'class',
                            fullPath: 'tClass',
                            sourceInformation: {
                              endColumn: 20,
                              endLine: 45,
                              sourceId: 'test::tMapping2',
                              startColumn: 15,
                              startLine: 45,
                            },
                          },
                        ],
                        sourceInformation: {
                          endColumn: 26,
                          endLine: 45,
                          sourceId: 'test::tMapping2',
                          startColumn: 21,
                          startLine: 45,
                        },
                      },
                      {
                        _type: 'rootGraphFetchTree',
                        class: 'tClass',
                        sourceInformation: {
                          endColumn: 54,
                          endLine: 45,
                          sourceId: 'test::tMapping2',
                          startColumn: 49,
                          startLine: 45,
                        },
                        subTrees: [
                          {
                            _type: 'propertyGraphFetchTree',
                            parameters: [],
                            property: 'name',
                            sourceInformation: {
                              endColumn: 59,
                              endLine: 45,
                              sourceId: 'test::tMapping2',
                              startColumn: 56,
                              startLine: 45,
                            },
                            subTrees: [],
                          },
                        ],
                      },
                    ],
                    sourceInformation: {
                      endColumn: 45,
                      endLine: 45,
                      sourceId: 'test::tMapping2',
                      startColumn: 29,
                      startLine: 45,
                    },
                  },
                  {
                    _type: 'rootGraphFetchTree',
                    class: 'tClass',
                    sourceInformation: {
                      endColumn: 83,
                      endLine: 45,
                      sourceId: 'test::tMapping2',
                      startColumn: 78,
                      startLine: 45,
                    },
                    subTrees: [
                      {
                        _type: 'propertyGraphFetchTree',
                        parameters: [],
                        property: 'name',
                        sourceInformation: {
                          endColumn: 88,
                          endLine: 45,
                          sourceId: 'test::tMapping2',
                          startColumn: 85,
                          startLine: 45,
                        },
                        subTrees: [],
                      },
                    ],
                  },
                ],
                sourceInformation: {
                  endColumn: 74,
                  endLine: 45,
                  sourceId: 'test::tMapping2',
                  startColumn: 66,
                  startLine: 45,
                },
              },
            ],
            parameters: [],
          },
        },
      ],
    },
    classifierPath: 'meta::pure::mapping::Mapping',
  },
  {
    path: '__internal__::SectionIndex',
    content: {
      _type: 'sectionIndex',
      name: 'SectionIndex',
      package: '__internal__',
      sections: [
        {
          _type: 'importAware',
          imports: [],
          elements: ['test::tClass', 'test::tEnum'],
          parserName: 'Pure',
        },
        {
          _type: 'importAware',
          imports: ['test'],
          elements: ['test::tMapping1', 'test::tMapping2'],
          parserName: 'Mapping',
        },
      ],
    },
    classifierPath: 'meta::pure::metamodel::section::SectionIndex',
  },
];

export const testLocalPropertyMapping = [
  {
    path: 'test::Firm',
    content: {
      _type: 'class',
      name: 'Firm',
      package: 'test',
      properties: [
        {
          multiplicity: {
            lowerBound: 1,
            upperBound: 1,
          },
          name: 'id',
          type: 'Integer',
        },
        {
          multiplicity: {
            lowerBound: 1,
            upperBound: 1,
          },
          name: 'legalName',
          type: 'String',
        },
      ],
    },
    classifierPath: 'meta::pure::metamodel::type::Class',
  },
  {
    path: 'test::Person',
    content: {
      _type: 'class',
      name: 'Person',
      package: 'test',
      properties: [
        {
          multiplicity: {
            lowerBound: 1,
            upperBound: 1,
          },
          name: 'name',
          type: 'String',
        },
      ],
    },
    classifierPath: 'meta::pure::metamodel::type::Class',
  },
  {
    path: 'test::Firm_Person',
    content: {
      _type: 'association',
      name: 'Firm_Person',
      package: 'test',
      properties: [
        {
          multiplicity: {
            lowerBound: 1,
            upperBound: 1,
          },
          name: 'employer',
          type: 'test::Firm',
        },
        {
          multiplicity: {
            lowerBound: 0,
          },
          name: 'employees',
          type: 'test::Person',
        },
      ],
    },
    classifierPath: 'meta::pure::metamodel::relationship::Association',
  },
  {
    path: 'test::crossPropertyMappingWithLocalProperties',
    content: {
      _type: 'mapping',
      classMappings: [
        {
          _type: 'pureInstance',
          class: 'test::Person',
          id: 'p',
          propertyMappings: [
            {
              _type: 'purePropertyMapping',
              explodeProperty: false,
              localMappingProperty: {
                multiplicity: {
                  lowerBound: 1,
                  upperBound: 1,
                },
                type: 'Integer',
              },
              property: {
                class:
                  'test::crossPropertyMappingWithLocalProperties_[object Object]firmId',
                property: 'firmId',
              },
              source: '',
              transform: {
                _type: 'lambda',
                body: [
                  {
                    _type: 'integer',
                    multiplicity: {
                      lowerBound: 1,
                      upperBound: 1,
                    },
                    values: [1],
                  },
                ],
                parameters: [],
              },
            },
            {
              _type: 'purePropertyMapping',
              explodeProperty: false,
              property: {
                class: 'test::Person',
                property: 'name',
              },
              source: '',
              transform: {
                _type: 'lambda',
                body: [
                  {
                    _type: 'property',
                    parameters: [
                      {
                        _type: 'var',
                        name: 'src',
                      },
                    ],
                    property: 'name',
                  },
                ],
                parameters: [],
              },
            },
          ],
          root: false,
          srcClass: 'test::Person',
        },
      ],
      enumerationMappings: [],
      includedMappings: [],
      name: 'crossPropertyMappingWithLocalProperties',
      package: 'test',
      tests: [],
    },
    classifierPath: 'meta::pure::mapping::Mapping',
  },
];

export const testAggregationAwareMappingRoundtrip = [
  {
    classifierPath: 'meta::pure::metamodel::type::Class',
    content: {
      _type: 'class',
      name: 'FiscalCalendar',
      package: 'test',
      properties: [
        {
          multiplicity: {
            lowerBound: 1,
            upperBound: 1,
          },
          name: 'date',
          type: 'Date',
        },
        {
          multiplicity: {
            lowerBound: 1,
            upperBound: 1,
          },
          name: 'fiscalYear',
          type: 'Integer',
        },
        {
          multiplicity: {
            lowerBound: 1,
            upperBound: 1,
          },
          name: 'fiscalMonth',
          type: 'Integer',
        },
        {
          multiplicity: {
            lowerBound: 1,
            upperBound: 1,
          },
          name: 'fiscalQtr',
          type: 'Integer',
        },
      ],
    },
    path: 'test::FiscalCalendar',
  },
  {
    classifierPath: 'meta::pure::metamodel::type::Class',
    content: {
      _type: 'class',
      name: 'Sales',
      package: 'test',
      properties: [
        {
          multiplicity: {
            lowerBound: 1,
            upperBound: 1,
          },
          name: 'id',
          type: 'Integer',
        },
        {
          multiplicity: {
            lowerBound: 1,
            upperBound: 1,
          },
          name: 'salesDate',
          type: 'test::FiscalCalendar',
        },
        {
          multiplicity: {
            lowerBound: 1,
            upperBound: 1,
          },
          name: 'revenue',
          type: 'Float',
        },
      ],
    },
    path: 'test::Sales',
  },
  {
    classifierPath: 'meta::pure::metamodel::type::Class',
    content: {
      _type: 'class',
      name: 'Sales_By_Date',
      package: 'test',
      properties: [
        {
          multiplicity: {
            lowerBound: 1,
            upperBound: 1,
          },
          name: 'salesDate',
          type: 'test::FiscalCalendar',
        },
        {
          multiplicity: {
            lowerBound: 1,
            upperBound: 1,
          },
          name: 'netRevenue',
          type: 'Float',
        },
      ],
    },
    path: 'test::Sales_By_Date',
  },
  {
    classifierPath: 'meta::pure::mapping::Mapping',
    content: {
      _type: 'mapping',
      classMappings: [
        {
          _type: 'pureInstance',
          class: 'test::FiscalCalendar',
          id: 'b',
          propertyMappings: [
            {
              _type: 'purePropertyMapping',
              explodeProperty: false,
              property: {
                class: 'test::FiscalCalendar',
                property: 'date',
              },
              source: '',
              transform: {
                _type: 'lambda',
                body: [
                  {
                    _type: 'property',
                    parameters: [
                      {
                        _type: 'var',
                        name: 'src',
                      },
                    ],
                    property: 'date',
                  },
                ],
                parameters: [],
              },
            },
            {
              _type: 'purePropertyMapping',
              explodeProperty: false,
              property: {
                class: 'test::FiscalCalendar',
                property: 'fiscalYear',
              },
              source: '',
              transform: {
                _type: 'lambda',
                body: [
                  {
                    _type: 'property',
                    parameters: [
                      {
                        _type: 'var',
                        name: 'src',
                      },
                    ],
                    property: 'fiscalYear',
                  },
                ],
                parameters: [],
              },
            },
            {
              _type: 'purePropertyMapping',
              explodeProperty: false,
              property: {
                class: 'test::FiscalCalendar',
                property: 'fiscalMonth',
              },
              source: '',
              transform: {
                _type: 'lambda',
                body: [
                  {
                    _type: 'property',
                    parameters: [
                      {
                        _type: 'var',
                        name: 'src',
                      },
                    ],
                    property: 'fiscalMonth',
                  },
                ],
                parameters: [],
              },
            },
            {
              _type: 'purePropertyMapping',
              explodeProperty: false,
              property: {
                class: 'test::FiscalCalendar',
                property: 'fiscalQtr',
              },
              source: '',
              transform: {
                _type: 'lambda',
                body: [
                  {
                    _type: 'property',
                    parameters: [
                      {
                        _type: 'var',
                        name: 'src',
                      },
                    ],
                    property: 'fiscalQtr',
                  },
                ],
                parameters: [],
              },
            },
          ],
          root: false,
          srcClass: 'test::FiscalCalendar',
        },
        {
          _type: 'aggregationAware',
          aggregateSetImplementations: [
            {
              aggregateSpecification: {
                aggregateValues: [
                  {
                    aggregateFn: {
                      _type: 'lambda',
                      body: [
                        {
                          _type: 'func',
                          function: 'sum',
                          parameters: [
                            {
                              _type: 'var',
                              name: 'mapped',
                            },
                          ],
                        },
                      ],
                      parameters: [],
                    },
                    mapFn: {
                      _type: 'lambda',
                      body: [
                        {
                          _type: 'property',
                          parameters: [
                            {
                              _type: 'var',
                              name: 'this',
                            },
                          ],
                          property: 'revenue',
                        },
                      ],
                      parameters: [],
                    },
                  },
                ],
                canAggregate: true,
                groupByFunctions: [
                  {
                    groupByFn: {
                      _type: 'lambda',
                      body: [
                        {
                          _type: 'property',
                          parameters: [
                            {
                              _type: 'var',
                              name: 'this',
                            },
                          ],
                          property: 'salesDate',
                        },
                      ],
                      parameters: [],
                    },
                  },
                ],
              },
              index: 0,
              setImplementation: {
                _type: 'pureInstance',
                class: 'test::Sales',
                id: 'a_Aggregate_0',
                propertyMappings: [
                  {
                    _type: 'purePropertyMapping',
                    explodeProperty: false,
                    property: {
                      class: 'test::Sales',
                      property: 'salesDate',
                    },
                    source: '',
                    target: 'b',
                    transform: {
                      _type: 'lambda',
                      body: [
                        {
                          _type: 'property',
                          parameters: [
                            {
                              _type: 'var',
                              name: 'src',
                            },
                          ],
                          property: 'salesDate',
                        },
                      ],
                      parameters: [],
                    },
                  },
                  {
                    _type: 'purePropertyMapping',
                    explodeProperty: false,
                    property: {
                      class: 'test::Sales',
                      property: 'revenue',
                    },
                    source: '',
                    transform: {
                      _type: 'lambda',
                      body: [
                        {
                          _type: 'property',
                          parameters: [
                            {
                              _type: 'var',
                              name: 'src',
                            },
                          ],
                          property: 'netRevenue',
                        },
                      ],
                      parameters: [],
                    },
                  },
                ],
                root: false,
                srcClass: 'test::Sales_By_Date',
              },
            },
          ],
          class: 'test::Sales',
          id: 'a',
          mainSetImplementation: {
            _type: 'pureInstance',
            class: 'test::Sales',
            id: 'a_Main',
            propertyMappings: [
              {
                _type: 'purePropertyMapping',
                explodeProperty: false,
                property: {
                  class: 'test::Sales',
                  property: 'salesDate',
                },
                source: '',
                target: 'b',
                transform: {
                  _type: 'lambda',
                  body: [
                    {
                      _type: 'property',
                      parameters: [
                        {
                          _type: 'var',
                          name: 'src',
                        },
                      ],
                      property: 'salesDate',
                    },
                  ],
                  parameters: [],
                },
              },
              {
                _type: 'purePropertyMapping',
                explodeProperty: false,
                property: {
                  class: 'test::Sales',
                  property: 'revenue',
                },
                source: '',
                transform: {
                  _type: 'lambda',
                  body: [
                    {
                      _type: 'property',
                      parameters: [
                        {
                          _type: 'var',
                          name: 'src',
                        },
                      ],
                      property: 'revenue',
                    },
                  ],
                  parameters: [],
                },
              },
            ],
            root: false,
            srcClass: 'test::Sales',
          },
          propertyMappings: [
            {
              _type: 'AggregationAwarePropertyMapping',
              property: {
                class: 'test::Sales',
                property: 'salesDate',
              },
              source: 'a',
              target: 'b',
            },
            {
              _type: 'AggregationAwarePropertyMapping',
              property: {
                class: 'test::Sales',
                property: 'revenue',
              },
              source: 'a',
            },
          ],
          root: false,
        },
      ],
      enumerationMappings: [],
      includedMappings: [],
      name: 'map',
      package: 'test',
      tests: [],
    },
    path: 'test::map',
  },
  {
    path: '__internal__::SectionIndex',
    content: {
      _type: 'sectionIndex',
      name: 'SectionIndex',
      package: '__internal__',
      sections: [
        {
          _type: 'importAware',
          imports: [],
          elements: [
            'test::FiscalCalendar',
            'test::Sales',
            'test::Sales_By_Date',
          ],
          parserName: 'Pure',
        },
        {
          _type: 'importAware',
          imports: [],
          elements: ['test::map'],
          parserName: 'Mapping',
        },
      ],
    },
    classifierPath: 'meta::pure::metamodel::section::SectionIndex',
  },
];
