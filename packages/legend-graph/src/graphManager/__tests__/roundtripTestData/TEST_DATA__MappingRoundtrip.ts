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
                owner: 'tClass',
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
                owner: 'tClass',
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
                owner: 'tClass',
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
                owner: 'test::Person',
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
                owner: 'test::FiscalCalendar',
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
                owner: 'test::FiscalCalendar',
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
                owner: 'test::FiscalCalendar',
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
                owner: 'test::FiscalCalendar',
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
                      owner: 'test::Sales',
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
                      owner: 'test::Sales',
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
                  owner: 'test::Sales',
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
                  owner: 'test::Sales',
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
                owner: 'test::Sales',
                property: 'salesDate',
              },
              source: 'a',
              target: 'b',
            },
            {
              _type: 'AggregationAwarePropertyMapping',
              property: {
                owner: 'test::Sales',
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
          type: 'String',
        },
        {
          multiplicity: {
            lowerBound: 1,
            upperBound: 1,
          },
          name: 'productName',
          type: 'String',
        },
        {
          multiplicity: {
            lowerBound: 1,
            upperBound: 1,
          },
          name: 'description',
          type: 'String',
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
                owner: 'my::models::Product',
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
                owner: 'my::models::Product',
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
                owner: 'my::models::Product',
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
