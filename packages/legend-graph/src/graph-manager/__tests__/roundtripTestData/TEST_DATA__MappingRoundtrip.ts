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
// - MappingStoreTestData - mappingStoreTestData - class
export const TEST_DATA__MappingRoundtrip = [
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
          genericType: {
            rawType: {
              _type: 'packageableType',
              fullPath: 'String',
            },
          },
        },
        {
          multiplicity: {
            lowerBound: 0,
          },
          name: 'name',
          genericType: {
            rawType: {
              _type: 'packageableType',
              fullPath: 'String',
            },
          },
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
                          },
                        ],
                        property: 'fullName',
                      },
                      {
                        _type: 'integer',
                        multiplicity: {
                          lowerBound: 1,
                          upperBound: 1,
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
                              },
                            ],
                            property: 'fullName',
                          },
                          {
                            _type: 'string',
                            multiplicity: {
                              lowerBound: 1,
                              upperBound: 1,
                            },
                            values: [' '],
                          },
                        ],
                      },
                    ],
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
                          },
                        ],
                        property: 'fullName',
                      },
                      {
                        _type: 'integer',
                        multiplicity: {
                          lowerBound: 1,
                          upperBound: 1,
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
                              },
                            ],
                            property: 'fullName',
                          },
                          {
                            _type: 'string',
                            multiplicity: {
                              lowerBound: 1,
                              upperBound: 1,
                            },
                            values: [' '],
                          },
                        ],
                      },
                    ],
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
                              },
                              {
                                _type: 'packageableElementPtr',
                                fullPath: 'tClass',
                              },
                            ],
                          },
                        ],
                        property: 'fullName',
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
                                      },
                                    ],
                                    property: 'fullName',
                                  },
                                  {
                                    _type: 'string',
                                    multiplicity: {
                                      lowerBound: 1,
                                      upperBound: 1,
                                    },
                                    values: [' '],
                                  },
                                ],
                              },
                              {
                                _type: 'integer',
                                multiplicity: {
                                  lowerBound: 1,
                                  upperBound: 1,
                                },
                                values: [1],
                              },
                            ],
                          },
                        ],
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
                              },
                            ],
                            property: 'fullName',
                          },
                        ],
                      },
                    ],
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
      includedMappings: [
        {
          _type: 'mappingIncludeMapping',
          includedMapping: 'test::tMapping1',
        },
      ],
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
                            _type: 'packageableElementPtr',
                            fullPath: 'tClass',
                          },
                        ],
                      },
                      {
                        _type: 'rootGraphFetchTree',
                        class: 'tClass',
                        subTrees: [
                          {
                            _type: 'propertyGraphFetchTree',
                            parameters: [],
                            property: 'name',
                            subTrees: [],
                          },
                        ],
                      },
                    ],
                  },
                  {
                    _type: 'rootGraphFetchTree',
                    class: 'tClass',
                    subTrees: [
                      {
                        _type: 'propertyGraphFetchTree',
                        parameters: [],
                        property: 'name',
                        subTrees: [],
                      },
                    ],
                  },
                ],
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

export const TEST_DATA__LocalPropertyMapping = [
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
          genericType: {
            rawType: {
              _type: 'packageableType',
              fullPath: 'Integer',
            },
          },
        },
        {
          multiplicity: {
            lowerBound: 1,
            upperBound: 1,
          },
          name: 'legalName',
          genericType: {
            rawType: {
              _type: 'packageableType',
              fullPath: 'String',
            },
          },
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
          genericType: {
            rawType: {
              _type: 'packageableType',
              fullPath: 'String',
            },
          },
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
          genericType: {
            rawType: {
              _type: 'packageableType',
              fullPath: 'test::Firm',
            },
          },
        },
        {
          multiplicity: {
            lowerBound: 0,
          },
          name: 'employees',
          genericType: {
            rawType: {
              _type: 'packageableType',
              fullPath: 'test::Person',
            },
          },
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

export const TEST_DATA__AggregationAwareMappingRoundtrip = [
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
          genericType: {
            rawType: {
              _type: 'packageableType',
              fullPath: 'Date',
            },
          },
        },
        {
          multiplicity: {
            lowerBound: 1,
            upperBound: 1,
          },
          name: 'fiscalYear',
          genericType: {
            rawType: {
              _type: 'packageableType',
              fullPath: 'Integer',
            },
          },
        },
        {
          multiplicity: {
            lowerBound: 1,
            upperBound: 1,
          },
          name: 'fiscalMonth',
          genericType: {
            rawType: {
              _type: 'packageableType',
              fullPath: 'Integer',
            },
          },
        },
        {
          multiplicity: {
            lowerBound: 1,
            upperBound: 1,
          },
          name: 'fiscalQtr',
          genericType: {
            rawType: {
              _type: 'packageableType',
              fullPath: 'Integer',
            },
          },
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
          genericType: {
            rawType: {
              _type: 'packageableType',
              fullPath: 'Integer',
            },
          },
        },
        {
          multiplicity: {
            lowerBound: 1,
            upperBound: 1,
          },
          name: 'salesDate',
          genericType: {
            rawType: {
              _type: 'packageableType',
              fullPath: 'test::FiscalCalendar',
            },
          },
        },
        {
          multiplicity: {
            lowerBound: 1,
            upperBound: 1,
          },
          name: 'revenue',
          genericType: {
            rawType: {
              _type: 'packageableType',
              fullPath: 'Float',
            },
          },
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
          genericType: {
            rawType: {
              _type: 'packageableType',
              fullPath: 'test::FiscalCalendar',
            },
          },
        },
        {
          multiplicity: {
            lowerBound: 1,
            upperBound: 1,
          },
          name: 'netRevenue',
          genericType: {
            rawType: {
              _type: 'packageableType',
              fullPath: 'Float',
            },
          },
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

export const TEST_DATA__Relational_LocalPropertyMappingRoundtrip = [
  {
    path: 'my::models::Product',
    content: {
      _type: 'class',
      name: 'Product',
      package: 'my::models',
      properties: [
        {
          multiplicity: {
            lowerBound: 1,
            upperBound: 1,
          },
          name: 'productId',
          genericType: {
            rawType: {
              _type: 'packageableType',
              fullPath: 'String',
            },
          },
        },
        {
          multiplicity: {
            lowerBound: 1,
            upperBound: 1,
          },
          name: 'productName',
          genericType: {
            rawType: {
              _type: 'packageableType',
              fullPath: 'String',
            },
          },
        },
        {
          multiplicity: {
            lowerBound: 1,
            upperBound: 1,
          },
          name: 'description',
          genericType: {
            rawType: {
              _type: 'packageableType',
              fullPath: 'String',
            },
          },
        },
      ],
    },
    classifierPath: 'meta::pure::metamodel::type::Class',
  },
  {
    path: 'my::database::inMemoryAndRelationalDb',
    content: {
      _type: 'relational',
      filters: [],
      includedStores: [],
      joins: [],
      name: 'inMemoryAndRelationalDb',
      package: 'my::database',
      schemas: [
        {
          name: 'default',
          tables: [
            {
              columns: [
                {
                  name: 'productId',
                  nullable: false,
                  type: {
                    _type: 'Varchar',
                    size: 100,
                  },
                },
                {
                  name: 'productName',
                  nullable: true,
                  type: {
                    _type: 'Varchar',
                    size: 100,
                  },
                },
                {
                  name: 'description',
                  nullable: true,
                  type: {
                    _type: 'Varchar',
                    size: 1000,
                  },
                },
              ],
              name: 'productTable',
              primaryKey: ['productId'],
            },
          ],
          views: [],
        },
      ],
    },
    classifierPath: 'meta::relational::metamodel::Database',
  },
  {
    path: 'my::mappings::InMemoryAndRelationalCrossStoreMapping1',
    content: {
      _type: 'mapping',
      classMappings: [
        {
          _type: 'relational',
          class: 'my::models::Product',
          distinct: false,
          id: 'prod_set',
          mainTable: {
            _type: 'Table',
            database: 'my::database::inMemoryAndRelationalDb',
            mainTableDb: 'my::database::inMemoryAndRelationalDb',
            schema: 'default',
            table: 'productTable',
          },
          primaryKey: [
            {
              _type: 'column',
              column: 'productId',
              table: {
                _type: 'Table',
                database: 'my::database::inMemoryAndRelationalDb',
                mainTableDb: 'my::database::inMemoryAndRelationalDb',
                schema: 'default',
                table: 'productTable',
              },
              tableAlias: 'productTable',
            },
          ],
          propertyMappings: [
            {
              _type: 'relationalPropertyMapping',
              localMappingProperty: {
                multiplicity: {
                  lowerBound: 1,
                  upperBound: 1,
                },
                type: 'String',
              },
              property: {
                property: 'local',
              },
              relationalOperation: {
                _type: 'column',
                column: 'productName',
                table: {
                  _type: 'Table',
                  database: 'my::database::inMemoryAndRelationalDb',
                  mainTableDb: 'my::database::inMemoryAndRelationalDb',
                  schema: 'default',
                  table: 'productTable',
                },
                tableAlias: 'productTable',
              },
            },
            {
              _type: 'relationalPropertyMapping',
              property: {
                class: 'my::models::Product',
                property: 'productId',
              },
              relationalOperation: {
                _type: 'column',
                column: 'productId',
                table: {
                  _type: 'Table',
                  database: 'my::database::inMemoryAndRelationalDb',
                  mainTableDb: 'my::database::inMemoryAndRelationalDb',
                  schema: 'default',
                  table: 'productTable',
                },
                tableAlias: 'productTable',
              },
            },
            {
              _type: 'relationalPropertyMapping',
              property: {
                class: 'my::models::Product',
                property: 'productName',
              },
              relationalOperation: {
                _type: 'column',
                column: 'productName',
                table: {
                  _type: 'Table',
                  database: 'my::database::inMemoryAndRelationalDb',
                  mainTableDb: 'my::database::inMemoryAndRelationalDb',
                  schema: 'default',
                  table: 'productTable',
                },
                tableAlias: 'productTable',
              },
            },
            {
              _type: 'relationalPropertyMapping',
              property: {
                class: 'my::models::Product',
                property: 'description',
              },
              relationalOperation: {
                _type: 'column',
                column: 'description',
                table: {
                  _type: 'Table',
                  database: 'my::database::inMemoryAndRelationalDb',
                  mainTableDb: 'my::database::inMemoryAndRelationalDb',
                  schema: 'default',
                  table: 'productTable',
                },
                tableAlias: 'productTable',
              },
            },
          ],
          root: false,
        },
      ],
      enumerationMappings: [],
      includedMappings: [],
      name: 'InMemoryAndRelationalCrossStoreMapping1',
      package: 'my::mappings',
      tests: [],
    },
    classifierPath: 'meta::pure::mapping::Mapping',
  },
];

export const TEST_DATA__MappingTestSuiteRoundtrip = [
  {
    path: 'data::RelationalData',
    content: {
      _type: 'dataElement',
      data: {
        _type: 'relationalCSVData',
        tables: [
          {
            schema: 'default',
            table: 'PersonTable',
            values:
              'id,firm_id,firstName,lastName\n1,1,John,Doe\n2,1,Nicole,Smith\n3,2,Time,Smith\n',
          },
          {
            schema: 'default',
            table: 'FirmTable',
            values: 'id,legal_name\n1,Finos\n2,Apple',
          },
        ],
      },
      name: 'RelationalData',
      package: 'data',
    },
    classifierPath: 'meta::pure::data::DataElement',
  },
  {
    path: 'execution::RelationalMapping',
    content: {
      _type: 'mapping',
      classMappings: [
        {
          _type: 'relational',
          class: 'model::Person',
          distinct: false,
          mainTable: {
            _type: 'Table',
            database: 'store::TestDB',
            mainTableDb: 'store::TestDB',
            schema: 'default',
            table: 'PersonTable',
          },
          primaryKey: [
            {
              _type: 'column',
              column: 'id',
              table: {
                _type: 'Table',
                database: 'store::TestDB',
                mainTableDb: 'store::TestDB',
                schema: 'default',
                table: 'PersonTable',
              },
              tableAlias: 'PersonTable',
            },
          ],
          propertyMappings: [
            {
              _type: 'relationalPropertyMapping',
              property: {
                class: 'model::Person',
                property: 'firstName',
              },
              relationalOperation: {
                _type: 'column',
                column: 'firstName',
                table: {
                  _type: 'Table',
                  database: 'store::TestDB',
                  mainTableDb: 'store::TestDB',
                  schema: 'default',
                  table: 'PersonTable',
                },
                tableAlias: 'PersonTable',
              },
            },
            {
              _type: 'relationalPropertyMapping',
              property: {
                class: 'model::Person',
                property: 'lastName',
              },
              relationalOperation: {
                _type: 'column',
                column: 'lastName',
                table: {
                  _type: 'Table',
                  database: 'store::TestDB',
                  mainTableDb: 'store::TestDB',
                  schema: 'default',
                  table: 'PersonTable',
                },
                tableAlias: 'PersonTable',
              },
            },
          ],
          root: true,
        },
        {
          _type: 'relational',
          class: 'model::Firm',
          distinct: false,
          mainTable: {
            _type: 'Table',
            database: 'store::TestDB',
            mainTableDb: 'store::TestDB',
            schema: 'default',
            table: 'FirmTable',
          },
          primaryKey: [
            {
              _type: 'column',
              column: 'id',
              table: {
                _type: 'Table',
                database: 'store::TestDB',
                mainTableDb: 'store::TestDB',
                schema: 'default',
                table: 'FirmTable',
              },
              tableAlias: 'FirmTable',
            },
          ],
          propertyMappings: [
            {
              _type: 'relationalPropertyMapping',
              property: {
                class: 'model::Firm',
                property: 'legalName',
              },
              relationalOperation: {
                _type: 'column',
                column: 'legal_name',
                table: {
                  _type: 'Table',
                  database: 'store::TestDB',
                  mainTableDb: 'store::TestDB',
                  schema: 'default',
                  table: 'FirmTable',
                },
                tableAlias: 'FirmTable',
              },
            },
            {
              _type: 'relationalPropertyMapping',
              property: {
                class: 'model::Firm',
                property: 'employees',
              },
              relationalOperation: {
                _type: 'elemtWithJoins',
                joins: [
                  {
                    db: 'store::TestDB',
                    name: 'FirmPerson',
                  },
                ],
              },
              target: 'model_Person',
            },
          ],
          root: true,
        },
      ],
      enumerationMappings: [],
      includedMappings: [],
      name: 'RelationalMapping',
      package: 'execution',
      testSuites: [
        {
          _type: 'mappingTestSuite',
          id: 'testSuite1',
          mappingStoreTestDatas: [
            {
              data: {
                _type: 'reference',
                dataElement: 'data::RelationalData',
              },
              store: 'store::TestDB',
            },
          ],
          tests: [
            {
              _type: 'mappingTest',
              assertions: [
                {
                  _type: 'equalToJson',
                  expected: {
                    _type: 'externalFormat',
                    contentType: 'application/json',
                    data: '{"columns":[{"name":"Employees/First Name","type":"String"},{"name":"Employees/Last Name","type":"String"},{"name":"Legal Name","type":"String"}],"rows":[{"values":["John","Doe","Finos"]},{"values":["Nicole","Smith","Finos"]},{"values":["Time","Smith","Apple"]}]}',
                  },
                  id: 'shouldPass',
                },
              ],
              id: 'test1',
              query: {
                _type: 'lambda',
                body: [
                  {
                    _type: 'func',
                    function: 'project',
                    parameters: [
                      {
                        _type: 'func',
                        function: 'getAll',
                        parameters: [
                          {
                            _type: 'packageableElementPtr',
                            fullPath: 'model::Firm',
                          },
                        ],
                      },
                      {
                        _type: 'collection',
                        multiplicity: {
                          lowerBound: 3,
                          upperBound: 3,
                        },
                        values: [
                          {
                            _type: 'lambda',
                            body: [
                              {
                                _type: 'property',
                                parameters: [
                                  {
                                    _type: 'property',
                                    parameters: [
                                      {
                                        _type: 'var',
                                        name: 'x',
                                      },
                                    ],
                                    property: 'employees',
                                  },
                                ],
                                property: 'firstName',
                              },
                            ],
                            parameters: [
                              {
                                _type: 'var',
                                name: 'x',
                              },
                            ],
                          },
                          {
                            _type: 'lambda',
                            body: [
                              {
                                _type: 'property',
                                parameters: [
                                  {
                                    _type: 'property',
                                    parameters: [
                                      {
                                        _type: 'var',
                                        name: 'x',
                                      },
                                    ],
                                    property: 'employees',
                                  },
                                ],
                                property: 'lastName',
                              },
                            ],
                            parameters: [
                              {
                                _type: 'var',
                                name: 'x',
                              },
                            ],
                          },
                          {
                            _type: 'lambda',
                            body: [
                              {
                                _type: 'property',
                                parameters: [
                                  {
                                    _type: 'var',
                                    name: 'x',
                                  },
                                ],
                                property: 'legalName',
                              },
                            ],
                            parameters: [
                              {
                                _type: 'var',
                                name: 'x',
                              },
                            ],
                          },
                        ],
                      },
                      {
                        _type: 'collection',
                        multiplicity: {
                          lowerBound: 3,
                          upperBound: 3,
                        },
                        values: [
                          {
                            _type: 'string',
                            multiplicity: {
                              lowerBound: 1,
                              upperBound: 1,
                            },
                            values: ['Employees/First Name'],
                          },
                          {
                            _type: 'string',
                            multiplicity: {
                              lowerBound: 1,
                              upperBound: 1,
                            },
                            values: ['Employees/Last Name'],
                          },
                          {
                            _type: 'string',
                            multiplicity: {
                              lowerBound: 1,
                              upperBound: 1,
                            },
                            values: ['Legal Name'],
                          },
                        ],
                      },
                    ],
                  },
                ],
                parameters: [],
              },
            },
          ],
        },
      ],
      tests: [],
    },
    classifierPath: 'meta::pure::mapping::Mapping',
  },
  {
    path: 'model::Firm',
    content: {
      _type: 'class',
      name: 'Firm',
      package: 'model',
      properties: [
        {
          multiplicity: {
            lowerBound: 1,
            upperBound: 1,
          },
          name: 'legalName',
          genericType: {
            rawType: {
              _type: 'packageableType',
              fullPath: 'String',
            },
          },
        },
        {
          multiplicity: {
            lowerBound: 0,
          },
          name: 'employees',
          genericType: {
            rawType: {
              _type: 'packageableType',
              fullPath: 'model::Person',
            },
          },
        },
      ],
    },
    classifierPath: 'meta::pure::metamodel::type::Class',
  },
  {
    path: 'model::Person',
    content: {
      _type: 'class',
      name: 'Person',
      package: 'model',
      properties: [
        {
          multiplicity: {
            lowerBound: 1,
            upperBound: 1,
          },
          name: 'firstName',
          genericType: {
            rawType: {
              _type: 'packageableType',
              fullPath: 'String',
            },
          },
        },
        {
          multiplicity: {
            lowerBound: 1,
            upperBound: 1,
          },
          name: 'lastName',
          genericType: {
            rawType: {
              _type: 'packageableType',
              fullPath: 'String',
            },
          },
        },
      ],
    },
    classifierPath: 'meta::pure::metamodel::type::Class',
  },
  {
    path: 'store::TestDB',
    content: {
      _type: 'relational',
      filters: [],
      includedStores: [],
      joins: [
        {
          name: 'FirmPerson',
          operation: {
            _type: 'dynaFunc',
            funcName: 'equal',
            parameters: [
              {
                _type: 'column',
                column: 'firm_id',
                table: {
                  _type: 'Table',
                  database: 'store::TestDB',
                  mainTableDb: 'store::TestDB',
                  schema: 'default',
                  table: 'PersonTable',
                },
                tableAlias: 'PersonTable',
              },
              {
                _type: 'column',
                column: 'id',
                table: {
                  _type: 'Table',
                  database: 'store::TestDB',
                  mainTableDb: 'store::TestDB',
                  schema: 'default',
                  table: 'FirmTable',
                },
                tableAlias: 'FirmTable',
              },
            ],
          },
        },
      ],
      name: 'TestDB',
      package: 'store',
      schemas: [
        {
          name: 'default',
          tables: [
            {
              columns: [
                {
                  name: 'id',
                  nullable: false,
                  type: {
                    _type: 'Integer',
                  },
                },
                {
                  name: 'legal_name',
                  nullable: true,
                  type: {
                    _type: 'Varchar',
                    size: 200,
                  },
                },
              ],
              name: 'FirmTable',
              primaryKey: ['id'],
            },
            {
              columns: [
                {
                  name: 'id',
                  nullable: false,
                  type: {
                    _type: 'Integer',
                  },
                },
                {
                  name: 'firm_id',
                  nullable: true,
                  type: {
                    _type: 'Integer',
                  },
                },
                {
                  name: 'firstName',
                  nullable: true,
                  type: {
                    _type: 'Varchar',
                    size: 200,
                  },
                },
                {
                  name: 'lastName',
                  nullable: true,
                  type: {
                    _type: 'Varchar',
                    size: 200,
                  },
                },
              ],
              name: 'PersonTable',
              primaryKey: ['id'],
            },
          ],
          views: [],
        },
      ],
    },
    classifierPath: 'meta::relational::metamodel::Database',
  },
];

export const TEST_DATA__MappingOtherwisePropertyRoundtrip = [
  {
    path: 'domain::ComplexClassTypeOfPropertyBelongs',
    content: {
      _type: 'class',
      name: 'ComplexClassTypeOfPropertyBelongs',
      package: 'domain',
      properties: [
        {
          multiplicity: {
            lowerBound: 1,
            upperBound: 1,
          },
          name: 'complexProperty',
          genericType: {
            rawType: {
              _type: 'packageableType',
              fullPath: 'String',
            },
          },
        },
      ],
    },
    classifierPath: 'meta::pure::metamodel::type::Class',
  },
  {
    path: 'domain::ComplicatedDemographics',
    content: {
      _type: 'class',
      name: 'ComplicatedDemographics',
      package: 'domain',
      properties: [
        {
          multiplicity: {
            lowerBound: 1,
            upperBound: 1,
          },
          name: 'fips',
          genericType: {
            rawType: {
              _type: 'packageableType',
              fullPath: 'String',
            },
          },
        },
        {
          multiplicity: {
            lowerBound: 1,
            upperBound: 1,
          },
          name: 'state',
          genericType: {
            rawType: {
              _type: 'packageableType',
              fullPath: 'String',
            },
          },
        },
        {
          multiplicity: {
            lowerBound: 1,
            upperBound: 1,
          },
          name: 'propertyBelongsinDemographicsAndNotComplexxClass',
          genericType: {
            rawType: {
              _type: 'packageableType',
              fullPath: 'domain::ComplexClassTypeOfPropertyBelongs',
            },
          },
        },
      ],
    },
    classifierPath: 'meta::pure::metamodel::type::Class',
  },
  {
    path: 'domain::COVIDData',
    content: {
      _type: 'class',
      name: 'COVIDData',
      package: 'domain',
      properties: [
        {
          multiplicity: {
            lowerBound: 1,
            upperBound: 1,
          },
          name: 'id',
          genericType: {
            rawType: {
              _type: 'packageableType',
              fullPath: 'Integer',
            },
          },
        },
        {
          multiplicity: {
            lowerBound: 0,
            upperBound: 1,
          },
          name: 'fips',
          genericType: {
            rawType: {
              _type: 'packageableType',
              fullPath: 'String',
            },
          },
        },
        {
          multiplicity: {
            lowerBound: 0,
            upperBound: 1,
          },
          name: 'date',
          genericType: {
            rawType: {
              _type: 'packageableType',
              fullPath: 'StrictDate',
            },
          },
        },
        {
          multiplicity: {
            lowerBound: 0,
            upperBound: 1,
          },
          name: 'caseType',
          genericType: {
            rawType: {
              _type: 'packageableType',
              fullPath: 'String',
            },
          },
        },
        {
          multiplicity: {
            lowerBound: 0,
            upperBound: 1,
          },
          name: 'cases',
          genericType: {
            rawType: {
              _type: 'packageableType',
              fullPath: 'Float',
            },
          },
        },
        {
          multiplicity: {
            lowerBound: 0,
            upperBound: 1,
          },
          name: 'lastReportedFlag',
          genericType: {
            rawType: {
              _type: 'packageableType',
              fullPath: 'Boolean',
            },
          },
        },
        {
          multiplicity: {
            lowerBound: 0,
            upperBound: 1,
          },
          name: 'demographicsPropertyInCovidData',
          genericType: {
            rawType: {
              _type: 'packageableType',
              fullPath: 'domain::ComplicatedDemographics',
            },
          },
        },
      ],
    },
    classifierPath: 'meta::pure::metamodel::type::Class',
  },
  {
    path: 'store::CovidDataStore',
    content: {
      _type: 'relational',
      filters: [],
      includedStores: [],
      joins: [
        {
          name: 'CovidDataDemographicsJoin',
          operation: {
            _type: 'dynaFunc',
            funcName: 'equal',
            parameters: [
              {
                _type: 'column',
                column: 'FIPS',
                table: {
                  _type: 'Table',
                  database: 'store::CovidDataStore',
                  mainTableDb: 'store::CovidDataStore',
                  schema: 'default',
                  table: 'DEMOGRAPHICS',
                },
                tableAlias: 'DEMOGRAPHICS',
              },
              {
                _type: 'column',
                column: 'FIPS',
                table: {
                  _type: 'Table',
                  database: 'store::CovidDataStore',
                  mainTableDb: 'store::CovidDataStore',
                  schema: 'default',
                  table: 'COVID_DATA',
                },
                tableAlias: 'COVID_DATA',
              },
            ],
          },
        },
      ],
      name: 'CovidDataStore',
      package: 'store',
      schemas: [
        {
          name: 'default',
          tables: [
            {
              columns: [
                {
                  name: 'FIPS',
                  nullable: true,
                  type: {
                    _type: 'Varchar',
                    size: 200,
                  },
                },
                {
                  name: 'STATE',
                  nullable: true,
                  type: {
                    _type: 'Varchar',
                    size: 200,
                  },
                },
              ],
              name: 'DEMOGRAPHICS',
              primaryKey: [],
            },
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
                  name: 'FIPS',
                  nullable: true,
                  type: {
                    _type: 'Varchar',
                    size: 200,
                  },
                },
                {
                  name: 'DATE',
                  nullable: true,
                  type: {
                    _type: 'Date',
                  },
                },
                {
                  name: 'CASE_TYPE',
                  nullable: true,
                  type: {
                    _type: 'Varchar',
                    size: 200,
                  },
                },
                {
                  name: 'CASES',
                  nullable: true,
                  type: {
                    _type: 'Integer',
                  },
                },
                {
                  name: 'LAST_REPORTED_FLAG',
                  nullable: true,
                  type: {
                    _type: 'Bit',
                  },
                },
              ],
              name: 'COVID_DATA',
              primaryKey: ['ID'],
            },
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
                  name: 'NAME',
                  nullable: true,
                  type: {
                    _type: 'Varchar',
                    size: 200,
                  },
                },
              ],
              name: 'PERSON',
              primaryKey: ['ID'],
            },
          ],
          views: [],
        },
      ],
    },
    classifierPath: 'meta::relational::metamodel::Database',
  },
  {
    path: 'mapping::CovidDataMapping',
    content: {
      _type: 'mapping',
      classMappings: [
        {
          _type: 'relational',
          class: 'domain::COVIDData',
          distinct: false,
          mainTable: {
            _type: 'Table',
            database: 'store::CovidDataStore',
            mainTableDb: 'store::CovidDataStore',
            schema: 'default',
            table: 'COVID_DATA',
          },
          primaryKey: [
            {
              _type: 'column',
              column: 'ID',
              table: {
                _type: 'Table',
                database: 'store::CovidDataStore',
                mainTableDb: 'store::CovidDataStore',
                schema: 'default',
                table: 'COVID_DATA',
              },
              tableAlias: 'COVID_DATA',
            },
          ],
          propertyMappings: [
            {
              _type: 'relationalPropertyMapping',
              property: {
                class: 'domain::COVIDData',
                property: 'id',
              },
              relationalOperation: {
                _type: 'column',
                column: 'ID',
                table: {
                  _type: 'Table',
                  database: 'store::CovidDataStore',
                  mainTableDb: 'store::CovidDataStore',
                  schema: 'default',
                  table: 'COVID_DATA',
                },
                tableAlias: 'COVID_DATA',
              },
            },
            {
              _type: 'relationalPropertyMapping',
              property: {
                class: 'domain::COVIDData',
                property: 'fips',
              },
              relationalOperation: {
                _type: 'column',
                column: 'FIPS',
                table: {
                  _type: 'Table',
                  database: 'store::CovidDataStore',
                  mainTableDb: 'store::CovidDataStore',
                  schema: 'default',
                  table: 'COVID_DATA',
                },
                tableAlias: 'COVID_DATA',
              },
            },
            {
              _type: 'relationalPropertyMapping',
              property: {
                class: 'domain::COVIDData',
                property: 'date',
              },
              relationalOperation: {
                _type: 'column',
                column: 'DATE',
                table: {
                  _type: 'Table',
                  database: 'store::CovidDataStore',
                  mainTableDb: 'store::CovidDataStore',
                  schema: 'default',
                  table: 'COVID_DATA',
                },
                tableAlias: 'COVID_DATA',
              },
            },
            {
              _type: 'relationalPropertyMapping',
              property: {
                class: 'domain::COVIDData',
                property: 'caseType',
              },
              relationalOperation: {
                _type: 'column',
                column: 'CASE_TYPE',
                table: {
                  _type: 'Table',
                  database: 'store::CovidDataStore',
                  mainTableDb: 'store::CovidDataStore',
                  schema: 'default',
                  table: 'COVID_DATA',
                },
                tableAlias: 'COVID_DATA',
              },
            },
            {
              _type: 'relationalPropertyMapping',
              property: {
                class: 'domain::COVIDData',
                property: 'cases',
              },
              relationalOperation: {
                _type: 'column',
                column: 'CASES',
                table: {
                  _type: 'Table',
                  database: 'store::CovidDataStore',
                  mainTableDb: 'store::CovidDataStore',
                  schema: 'default',
                  table: 'COVID_DATA',
                },
                tableAlias: 'COVID_DATA',
              },
            },
            {
              _type: 'relationalPropertyMapping',
              property: {
                class: 'domain::COVIDData',
                property: 'lastReportedFlag',
              },
              relationalOperation: {
                _type: 'column',
                column: 'LAST_REPORTED_FLAG',
                table: {
                  _type: 'Table',
                  database: 'store::CovidDataStore',
                  mainTableDb: 'store::CovidDataStore',
                  schema: 'default',
                  table: 'COVID_DATA',
                },
                tableAlias: 'COVID_DATA',
              },
            },
            {
              _type: 'embeddedPropertyMapping',
              classMapping: {
                _type: 'embedded',
                primaryKey: [],
                propertyMappings: [
                  {
                    _type: 'otherwiseEmbeddedPropertyMapping',
                    classMapping: {
                      _type: 'embedded',
                      primaryKey: [],
                      propertyMappings: [
                        {
                          _type: 'relationalPropertyMapping',
                          property: {
                            property: 'complexProperty',
                          },
                          relationalOperation: {
                            _type: 'column',
                            column: 'FIPS',
                            table: {
                              _type: 'Table',
                              database: 'store::CovidDataStore',
                              mainTableDb: 'store::CovidDataStore',
                              schema: 'default',
                              table: 'COVID_DATA',
                            },
                            tableAlias: 'COVID_DATA',
                          },
                        },
                      ],
                      root: false,
                    },
                    otherwisePropertyMapping: {
                      _type: 'relationalPropertyMapping',
                      property: {
                        property:
                          'propertyBelongsinDemographicsAndNotComplexxClass',
                      },
                      relationalOperation: {
                        _type: 'elemtWithJoins',
                        joins: [
                          {
                            db: 'store::CovidDataStore',
                            name: 'CovidDataDemographicsJoin',
                          },
                        ],
                      },
                      target: 'domain_Demographics',
                    },
                    property: {
                      property:
                        'propertyBelongsinDemographicsAndNotComplexxClass',
                    },
                  },
                ],
                root: false,
              },
              property: {
                class: 'domain::COVIDData',
                property: 'demographicsPropertyInCovidData',
              },
            },
          ],
          root: false,
        },
      ],
      enumerationMappings: [],
      includedMappings: [],
      name: 'CovidDataMapping',
      package: 'mapping',
      tests: [],
    },
    classifierPath: 'meta::pure::mapping::Mapping',
  },
];
