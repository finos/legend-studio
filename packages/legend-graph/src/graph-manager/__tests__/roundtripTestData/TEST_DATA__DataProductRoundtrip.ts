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

// ###DataProduct
// DataProduct <<meta::pure::profiles::temporal.bitemporal>> {meta::pure::profiles::doc.doc = 'value'} x::A
// {
//    title: 'Test title'
//    description: 'Test description'
//    icon: LibraryIcon('react-icons', 'UpArrow')
//    deliveryFrequency: DAILY
//    coverageRegions: [APAC, NAMR]
//    accessPoints: [
//       ap ('Description'): LH(Snowflake, |1)classification1
//    ]
//    supportInfo: {
//        documentation: ['exampleDoc'] 'https://example.org';
//        website: ['exampleDoc'] 'https://example.org';
//        emails:
//        [
//            {
//                title: 'title'
//                address: 'someEmail@test.org'
//            },
//            {
//                title: 'title'
//                address: 'someEmail@test.org'
//            }
//        ];
//    }
// }

export const TEST_DATA__DATAPRODUCT_DELIVERY = [
  {
    path: 'x::A',
    content: {
      _type: 'dataProduct',
      accessPointGroups: [
        {
          accessPoints: [
            {
              _type: 'lakehouseAccessPoint',
              classification: 'classification1',
              description: 'Description',
              func: {
                _type: 'lambda',
                body: [
                  {
                    _type: 'integer',
                    value: 1,
                  },
                ],
                parameters: [],
              },
              id: 'ap',
              reproducible: false,
              targetEnvironment: 'Snowflake',
            },
          ],
          description: 'The default access group',
          id: 'default',
        },
      ],
      coverageRegions: ['apac', 'namr'],
      deliveryFrequency: 'daily',
      description: 'Test description',
      expertise: [
        {
          description: 'Expertise description',
          expertIds: ['expert1', 'expert2'],
        },
        {
          description: 'Second expertise',
          expertIds: ['user1, user2'],
        },
      ],
      icon: {
        _type: 'libraryIcon',
        iconId: 'UpArrow',
        libraryId: 'react-icons',
      },
      name: 'A',
      package: 'x',
      stereotypes: [
        {
          profile: 'meta::pure::profiles::temporal',
          value: 'bitemporal',
        },
      ],
      supportInfo: {
        documentation: {
          label: 'exampleDoc',
          url: 'https://example.org',
        },
        emails: [
          {
            address: 'someEmail@test.org',
            title: 'title',
          },
          {
            address: 'someEmail@test.org',
            title: 'title',
          },
        ],
        website: {
          label: 'exampleDoc',
          url: 'https://example.org',
        },
      },
      taggedValues: [
        {
          tag: {
            profile: 'meta::pure::profiles::doc',
            value: 'doc',
          },
          value: 'value',
        },
      ],
      title: 'Test title',
    },
    classifierPath:
      'meta::external::catalog::dataProduct::specification::metamodel::DataProduct',
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
          elements: [],
          imports: [],
          parserName: 'Pure',
        },
        {
          _type: 'importAware',
          elements: ['x::A'],
          imports: [],
          parserName: 'DataProduct',
        },
      ],
    },
    classifierPath: 'meta::pure::metamodel::section::SectionIndex',
  },
];

// ###DataProduct
// DataProduct x::A
// {
//   accessPoints: [
//     group <<meta::pure::profiles::temporal.bitemporal>> ('Group description') [
//       myId ('Id description'): LH(Snowflake, |1)classification1,
//       myOtherId ('Other Id description'): LH(Snowflake, |1)classification1
//     ],
//     group2 [
//       latest : LH(Snowflake, |1)classification1
//     ]
//   ]
// }

export const TEST_DATA__DATAPRODUCT_GROUPS = [
  {
    path: 'x::A',
    content: {
      _type: 'dataProduct',
      accessPointGroups: [
        {
          accessPoints: [
            {
              _type: 'lakehouseAccessPoint',
              classification: 'classification1',
              description: 'Id description',
              func: {
                _type: 'lambda',
                body: [
                  {
                    _type: 'integer',
                    value: 1,
                  },
                ],
                parameters: [],
              },
              id: 'myId',
              reproducible: false,
              targetEnvironment: 'Snowflake',
            },
            {
              _type: 'lakehouseAccessPoint',
              classification: 'classification1',
              description: 'Other Id description',
              func: {
                _type: 'lambda',
                body: [
                  {
                    _type: 'integer',
                    value: 1,
                  },
                ],
                parameters: [],
              },
              id: 'myOtherId',
              reproducible: false,
              targetEnvironment: 'Snowflake',
            },
          ],
          description: 'Group description',
          id: 'group',
          stereotypes: [
            {
              profile: 'meta::pure::profiles::temporal',
              value: 'bitemporal',
            },
          ],
        },
        {
          accessPoints: [
            {
              _type: 'lakehouseAccessPoint',
              classification: 'classification1',
              func: {
                _type: 'lambda',
                body: [
                  {
                    _type: 'integer',
                    value: 1,
                  },
                ],
                parameters: [],
              },
              id: 'latest',
              reproducible: false,
              targetEnvironment: 'Snowflake',
            },
          ],
          id: 'group2',
        },
      ],
      name: 'A',
      package: 'x',
    },
    classifierPath:
      'meta::external::catalog::dataProduct::specification::metamodel::DataProduct',
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
          elements: [],
          imports: [],
          parserName: 'Pure',
        },
        {
          _type: 'importAware',
          elements: ['x::A'],
          imports: [],
          parserName: 'DataProduct',
        },
      ],
    },
    classifierPath: 'meta::pure::metamodel::section::SectionIndex',
  },
];

export const TEST_DATA__DATAPRODUCT__MODEL_ACCESS_GROUPS = [
  {
    path: 'x::A',
    content: {
      _type: 'dataProduct',
      accessPointGroups: [
        {
          _type: 'modelAccessPointGroup',
          accessPoints: [
            {
              _type: 'lakehouseAccessPoint',
              classification: 'classification1',
              func: {
                _type: 'lambda',
                body: [
                  {
                    _type: 'integer',
                    value: 1,
                  },
                ],
                parameters: [],
              },
              id: 'myId',
              reproducible: false,
              targetEnvironment: 'Snowflake',
            },
          ],
          compatibleRuntimes: [
            {
              description: 'desc',
              id: 'runtimeId',
              runtime: {
                path: 'model::dummyRuntime',
              },
            },
          ],
          featuredElements: [
            {
              element: {
                path: 'model',
              },
              exclude: false,
            },
            {
              element: {
                path: 'model',
              },
              exclude: true,
            },
            {
              element: {
                path: 'model',
              },
            },
          ],
          defaultRuntime: 'runtimeId',
          description: 'des',
          id: 'grp',
          mapping: {
            path: 'model::dummyMapping',
          },
        },
      ],
      name: 'A',
      package: 'x',
    },
    classifierPath:
      'meta::external::catalog::dataProduct::specification::metamodel::DataProduct',
  },
  {
    path: 'model::dummyMapping',
    content: {
      _type: 'mapping',
      classMappings: [],
      enumerationMappings: [],
      includedMappings: [],
      name: 'dummyMapping',
      package: 'model',
      tests: [],
    },
    classifierPath: 'meta::pure::mapping::Mapping',
  },
  {
    path: 'model::dummyRuntime',
    content: {
      _type: 'runtime',
      name: 'dummyRuntime',
      package: 'model',
      runtimeValue: {
        _type: 'engineRuntime',
        connectionStores: [],
        connections: [],
        mappings: [
          {
            path: 'model::dummyMapping',
            type: 'MAPPING',
          },
        ],
      },
    },
    classifierPath: 'meta::pure::runtime::PackageableRuntime',
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
          elements: [],
          imports: [],
          parserName: 'Pure',
        },
        {
          _type: 'importAware',
          elements: ['x::A'],
          imports: [],
          parserName: 'DataProduct',
        },
      ],
    },
    classifierPath: 'meta::pure::metamodel::section::SectionIndex',
  },
];

export const TEST_DATA__DATAPRODUCT__FUNCTION_ACCESS_POINT = [
  {
    path: 'x::A',
    content: {
      _type: 'dataProduct',
      accessPointGroups: [
        {
          _type: 'modelAccessPointGroup',
          accessPoints: [
            {
              _type: 'functionAccessPoint',
              id: 'myId',
              query: {
                _type: 'lambda',
                body: [
                  {
                    _type: 'integer',
                    value: 1,
                  },
                ],
                parameters: [],
              },
            },
          ],
          compatibleRuntimes: [
            {
              description: 'desc',
              id: 'runtimeId',
              runtime: {
                path: 'model::dummyRuntime',
              },
            },
          ],
          featuredElements: [
            {
              element: {
                path: 'model',
              },
              exclude: false,
            },
            {
              element: {
                path: 'model',
              },
              exclude: true,
            },
            {
              element: {
                path: 'model',
              },
            },
          ],
          defaultRuntime: 'runtimeId',
          description: 'des',
          id: 'grp',
          mapping: {
            path: 'model::dummyMapping',
          },
        },
      ],
      name: 'A',
      package: 'x',
    },
    classifierPath:
      'meta::external::catalog::dataProduct::specification::metamodel::DataProduct',
  },
  {
    path: 'model::dummyMapping',
    content: {
      _type: 'mapping',
      classMappings: [],
      enumerationMappings: [],
      includedMappings: [],
      name: 'dummyMapping',
      package: 'model',
      tests: [],
    },
    classifierPath: 'meta::pure::mapping::Mapping',
  },
  {
    path: 'model::dummyRuntime',
    content: {
      _type: 'runtime',
      name: 'dummyRuntime',
      package: 'model',
      runtimeValue: {
        _type: 'engineRuntime',
        connectionStores: [],
        connections: [],
        mappings: [
          {
            path: 'model::dummyMapping',
            type: 'MAPPING',
          },
        ],
      },
    },
    classifierPath: 'meta::pure::runtime::PackageableRuntime',
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
          elements: [],
          imports: [],
          parserName: 'Pure',
        },
        {
          _type: 'importAware',
          elements: ['x::A'],
          imports: [],
          parserName: 'DataProduct',
        },
      ],
    },
    classifierPath: 'meta::pure::metamodel::section::SectionIndex',
  },
];

export const TEST_DATA__DATAPRODUCT__INCLUDE = [
  {
    path: 'model::lakehouse::Firm',
    content: {
      _type: 'class',
      name: 'Firm',
      package: 'model::lakehouse',
      properties: [
        {
          genericType: {
            rawType: {
              _type: 'packageableType',
              fullPath: 'Integer',
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
            lowerBound: 1,
            upperBound: 1,
          },
          name: 'legalName',
        },
        {
          genericType: {
            rawType: {
              _type: 'packageableType',
              fullPath: 'model::lakehouse::Person',
            },
          },
          multiplicity: {
            lowerBound: 0,
          },
          name: 'employees',
        },
      ],
    },
    classifierPath: 'meta::pure::metamodel::type::Class',
  },
  {
    path: 'model::lakehouse::Person',
    content: {
      _type: 'class',
      name: 'Person',
      package: 'model::lakehouse',
      properties: [
        {
          genericType: {
            rawType: {
              _type: 'packageableType',
              fullPath: 'Integer',
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
              fullPath: 'Integer',
            },
          },
          multiplicity: {
            lowerBound: 1,
            upperBound: 1,
          },
          name: 'firmId',
        },
        {
          genericType: {
            rawType: {
              _type: 'packageableType',
              fullPath: 'String',
            },
          },
          multiplicity: {
            lowerBound: 1,
            upperBound: 1,
          },
          name: 'lastName',
        },
      ],
    },
    classifierPath: 'meta::pure::metamodel::type::Class',
  },
  {
    path: 'my::relational::db1',
    content: {
      _type: 'relational',
      filters: [
        {
          _type: 'filter',
          name: 'Ingest_Filter',
          operation: {
            _type: 'dynaFunc',
            funcName: 'equal',
            parameters: [
              {
                _type: 'column',
                column: 'id',
                table: {
                  _type: 'Table',
                  database: 'my::lakehouse::PersonIngest',
                  mainTableDb: 'my::lakehouse::PersonIngest',
                  schema: 'ALLOY_PERSON_GROUP',
                  table: 'Person',
                },
                tableAlias: 'Person',
              },
              {
                _type: 'literal',
                value: 123,
              },
            ],
          },
        },
      ],
      includedStoreSpecifications: [
        {
          packageableElementPointer: {
            path: 'my::lakehouse::FirmIngest',
          },
          storeType: 'Ingest',
        },
        {
          packageableElementPointer: {
            path: 'my::lakehouse::PersonIngest',
          },
          storeType: 'Ingest',
        },
        {
          packageableElementPointer: {
            path: 'my::lakehouse::PersonDataProduct',
          },
          storeType: 'DataProduct',
        },
      ],
      joins: [
        {
          name: 'FirmPersonLakehouse',
          operation: {
            _type: 'dynaFunc',
            funcName: 'equal',
            parameters: [
              {
                _type: 'column',
                column: 'id',
                table: {
                  _type: 'Table',
                  database: 'my::lakehouse::FirmIngest',
                  mainTableDb: 'my::lakehouse::FirmIngest',
                  schema: 'ALLOY_FIRM_GROUP',
                  table: 'Firm',
                },
                tableAlias: 'Firm',
              },
              {
                _type: 'column',
                column: 'firm_id',
                table: {
                  _type: 'Table',
                  database: 'my::lakehouse::PersonDataProduct',
                  mainTableDb: 'my::lakehouse::PersonDataProduct',
                  schema: 'default',
                  table: 'ap1_PersonLatest',
                },
                tableAlias: 'ap1_PersonLatest',
              },
            ],
          },
        },
        {
          name: 'SelfPerson',
          operation: {
            _type: 'dynaFunc',
            funcName: 'equal',
            parameters: [
              {
                _type: 'column',
                column: 'id',
                table: {
                  _type: 'Table',
                  database: 'my::lakehouse::PersonIngest',
                  mainTableDb: 'my::lakehouse::PersonIngest',
                  schema: 'ALLOY_PERSON_GROUP',
                  table: 'Person',
                },
                tableAlias: 'Person',
              },
              {
                _type: 'column',
                column: 'firm_id',
                table: {
                  _type: 'Table',
                  database: 'my::lakehouse::PersonIngest',
                  mainTableDb: 'my::lakehouse::PersonIngest',
                  schema: 'default',
                  table: '{target}',
                },
                tableAlias: '{target}',
              },
            ],
          },
        },
      ],
      name: 'db1',
      package: 'my::relational',
      schemas: [
        {
          name: 'ALLOY_FIRM_GROUP',
          tables: [],
          views: [],
        },
      ],
    },
    classifierPath: 'meta::relational::metamodel::Database',
  },
  {
    path: 'my::relational::db',
    content: {
      _type: 'relational',
      filters: [
        {
          _type: 'filter',
          name: 'AccessPoint_Filter',
          operation: {
            _type: 'dynaFunc',
            funcName: 'equal',
            parameters: [
              {
                _type: 'column',
                column: 'firm_id',
                table: {
                  _type: 'Table',
                  database: 'my::relational::db1',
                  mainTableDb: 'my::relational::db1',
                  schema: 'PersonDataProduct',
                  table: 'ap1_PersonLatest',
                },
                tableAlias: 'ap1_PersonLatest',
              },
              {
                _type: 'literal',
                value: 234,
              },
            ],
          },
        },
      ],
      includedStores: [
        {
          path: 'my::relational::db1',
          type: 'STORE',
        },
      ],
      joins: [
        {
          name: 'FirmPersonLakehouse2',
          operation: {
            _type: 'dynaFunc',
            funcName: 'equal',
            parameters: [
              {
                _type: 'column',
                column: 'id',
                table: {
                  _type: 'Table',
                  database: 'my::relational::db1',
                  mainTableDb: 'my::relational::db1',
                  schema: 'ALLOY_FIRM_GROUP',
                  table: 'Firm',
                },
                tableAlias: 'Firm',
              },
              {
                _type: 'column',
                column: 'id',
                table: {
                  _type: 'Table',
                  database: 'my::relational::db1',
                  mainTableDb: 'my::relational::db1',
                  schema: 'ALLOY_FIRM_GROUP',
                  table: 'Firm_V1',
                },
                tableAlias: 'Firm_V1',
              },
            ],
          },
        },
      ],
      name: 'db',
      package: 'my::relational',
      schemas: [],
    },
    classifierPath: 'meta::relational::metamodel::Database',
  },
  {
    path: 'my::lakehouse::PersonDataProduct',
    content: {
      _type: 'dataProduct',
      accessPointGroups: [
        {
          accessPoints: [
            {
              _type: 'lakehouseAccessPoint',
              classification: 'DP00',
              func: {
                _type: 'lambda',
                body: [
                  {
                    _type: 'func',
                    function: 'filter',
                    parameters: [
                      {
                        _type: 'classInstance',
                        type: 'I',
                        value: {
                          metadata: false,
                          path: ['my::lakehouse::PersonIngest', 'Person'],
                        },
                      },
                      {
                        _type: 'lambda',
                        body: [
                          {
                            _type: 'func',
                            function: 'equal',
                            parameters: [
                              {
                                _type: 'property',
                                parameters: [
                                  {
                                    _type: 'var',
                                    name: 'p',
                                  },
                                ],
                                property: 'LAKE_OUT_ID',
                              },
                              {
                                _type: 'integer',
                                value: 99999999,
                              },
                            ],
                          },
                        ],
                        parameters: [
                          {
                            _type: 'var',
                            name: 'p',
                          },
                        ],
                      },
                    ],
                  },
                ],
                parameters: [],
              },
              id: 'ap1_PersonLatest',
              reproducible: false,
              targetEnvironment: 'Snowflake',
            },
          ],
          id: 'OrgGroup',
        },
      ],
      name: 'PersonDataProduct',
      package: 'my::lakehouse',
      type: {
        _type: 'internalDataProductType',
      },
    },
    classifierPath:
      'meta::external::catalog::dataProduct::specification::metamodel::DataProduct',
  },
  {
    path: 'my::lakehouse::PersonIngest',
    content: {
      _type: 'ingestDefinition',
      datasetGroup: 'ALLOY_PERSON_GROUP',
      datasets: [
        {
          ingestPartitionColumns: [],
          name: 'Person',
          preprocessors: [],
          primaryKey: ['id'],
          privacyClassification: {
            sensitivity: 'DP10',
          },
          source: {
            _type: 'serializedSource',
            schema: {
              _type: 'relationType',
              columns: [
                {
                  genericType: {
                    multiplicityArguments: [],
                    rawType: {
                      _type: 'packageableType',
                      fullPath: 'Int',
                      sourceInformation: {
                        endColumn: 13,
                        endLine: 32,
                        sourceId: '',
                        startColumn: 11,
                        startLine: 32,
                      },
                    },
                    typeArguments: [],
                    typeVariableValues: [],
                  },
                  multiplicity: {
                    lowerBound: 1,
                    upperBound: 1,
                  },
                  name: 'id',
                  sourceInformation: {
                    endColumn: 16,
                    endLine: 32,
                    sourceId: '',
                    startColumn: 7,
                    startLine: 32,
                  },
                },
                {
                  genericType: {
                    multiplicityArguments: [],
                    rawType: {
                      _type: 'packageableType',
                      fullPath: 'Varchar',
                      sourceInformation: {
                        endColumn: 29,
                        endLine: 33,
                        sourceId: '',
                        startColumn: 18,
                        startLine: 33,
                      },
                    },
                    typeArguments: [],
                    typeVariableValues: [
                      {
                        _type: 'integer',
                        sourceInformation: {
                          endColumn: 28,
                          endLine: 33,
                          sourceId: '',
                          startColumn: 26,
                          startLine: 33,
                        },
                        value: 200,
                      },
                    ],
                  },
                  multiplicity: {
                    lowerBound: 1,
                    upperBound: 1,
                  },
                  name: 'last_name',
                  sourceInformation: {
                    endColumn: 32,
                    endLine: 33,
                    sourceId: '',
                    startColumn: 7,
                    startLine: 33,
                  },
                },
                {
                  genericType: {
                    multiplicityArguments: [],
                    rawType: {
                      _type: 'packageableType',
                      fullPath: 'Int',
                      sourceInformation: {
                        endColumn: 18,
                        endLine: 34,
                        sourceId: '',
                        startColumn: 16,
                        startLine: 34,
                      },
                    },
                    typeArguments: [],
                    typeVariableValues: [],
                  },
                  multiplicity: {
                    lowerBound: 1,
                    upperBound: 1,
                  },
                  name: 'firm_id',
                  sourceInformation: {
                    endColumn: 21,
                    endLine: 34,
                    sourceId: '',
                    startColumn: 7,
                    startLine: 34,
                  },
                },
              ],
            },
          },
          storageLayoutClusterColumns: [],
          storageLayoutPartitionColumns: [],
        },
      ],
      name: 'PersonIngest',
      owner: {
        _type: 'appDir',
        prodParallel: {
          appDirId: 1,
          level: 'DEPLOYMENT',
        },
      },
      package: 'my::lakehouse',
      readMode: {
        _type: 'Snapshot',
        format: {
          _type: 'CSV',
          fieldDelimiter: ',',
          headerRowsToSkipCount: 0,
          recordDelimiter: '\n',
        },
      },
      sourceInformation: {
        endColumn: 1,
        endLine: 38,
        sourceId: '',
        startColumn: 1,
        startLine: 29,
      },
      stereotypes: [],
      taggedValues: [],
      writeMode: {
        _type: 'batch_milestoned',
      },
    },
    classifierPath:
      'meta::external::ingest::specification::metamodel::IngestDefinition',
  },
  {
    path: 'my::lakehouse::FirmIngest',
    content: {
      _type: 'ingestDefinition',
      datasetGroup: 'ALLOY_FIRM_GROUP',
      datasets: [
        {
          ingestPartitionColumns: [],
          name: 'Firm',
          preprocessors: [],
          primaryKey: [],
          privacyClassification: {
            sensitivity: 'DP10',
          },
          source: {
            _type: 'serializedSource',
            schema: {
              _type: 'relationType',
              columns: [
                {
                  genericType: {
                    multiplicityArguments: [],
                    rawType: {
                      _type: 'packageableType',
                      fullPath: 'Int',
                      sourceInformation: {
                        endColumn: 13,
                        endLine: 44,
                        sourceId: '',
                        startColumn: 11,
                        startLine: 44,
                      },
                    },
                    typeArguments: [],
                    typeVariableValues: [],
                  },
                  multiplicity: {
                    lowerBound: 1,
                    upperBound: 1,
                  },
                  name: 'id',
                  sourceInformation: {
                    endColumn: 16,
                    endLine: 44,
                    sourceId: '',
                    startColumn: 7,
                    startLine: 44,
                  },
                },
                {
                  genericType: {
                    multiplicityArguments: [],
                    rawType: {
                      _type: 'packageableType',
                      fullPath: 'Varchar',
                      sourceInformation: {
                        endColumn: 30,
                        endLine: 45,
                        sourceId: '',
                        startColumn: 19,
                        startLine: 45,
                      },
                    },
                    typeArguments: [],
                    typeVariableValues: [
                      {
                        _type: 'integer',
                        sourceInformation: {
                          endColumn: 29,
                          endLine: 45,
                          sourceId: '',
                          startColumn: 27,
                          startLine: 45,
                        },
                        value: 200,
                      },
                    ],
                  },
                  multiplicity: {
                    lowerBound: 0,
                    upperBound: 1,
                  },
                  name: 'legal_name',
                  sourceInformation: {
                    endColumn: 30,
                    endLine: 45,
                    sourceId: '',
                    startColumn: 7,
                    startLine: 45,
                  },
                },
              ],
            },
          },
          storageLayoutClusterColumns: [],
          storageLayoutPartitionColumns: [],
        },
        {
          ingestPartitionColumns: [],
          name: 'Firm_V1',
          preprocessors: [],
          primaryKey: [],
          privacyClassification: {
            sensitivity: 'DP10',
          },
          source: {
            _type: 'serializedSource',
            schema: {
              _type: 'relationType',
              columns: [
                {
                  genericType: {
                    multiplicityArguments: [],
                    rawType: {
                      _type: 'packageableType',
                      fullPath: 'Int',
                      sourceInformation: {
                        endColumn: 13,
                        endLine: 50,
                        sourceId: '',
                        startColumn: 11,
                        startLine: 50,
                      },
                    },
                    typeArguments: [],
                    typeVariableValues: [],
                  },
                  multiplicity: {
                    lowerBound: 1,
                    upperBound: 1,
                  },
                  name: 'id',
                  sourceInformation: {
                    endColumn: 16,
                    endLine: 50,
                    sourceId: '',
                    startColumn: 7,
                    startLine: 50,
                  },
                },
                {
                  genericType: {
                    multiplicityArguments: [],
                    rawType: {
                      _type: 'packageableType',
                      fullPath: 'Varchar',
                      sourceInformation: {
                        endColumn: 30,
                        endLine: 51,
                        sourceId: '',
                        startColumn: 19,
                        startLine: 51,
                      },
                    },
                    typeArguments: [],
                    typeVariableValues: [
                      {
                        _type: 'integer',
                        sourceInformation: {
                          endColumn: 29,
                          endLine: 51,
                          sourceId: '',
                          startColumn: 27,
                          startLine: 51,
                        },
                        value: 200,
                      },
                    ],
                  },
                  multiplicity: {
                    lowerBound: 0,
                    upperBound: 1,
                  },
                  name: 'legal_name',
                  sourceInformation: {
                    endColumn: 30,
                    endLine: 51,
                    sourceId: '',
                    startColumn: 7,
                    startLine: 51,
                  },
                },
              ],
            },
          },
          storageLayoutClusterColumns: [],
          storageLayoutPartitionColumns: [],
        },
      ],
      name: 'FirmIngest',
      owner: {
        _type: 'appDir',
        prodParallel: {
          appDirId: 1,
          level: 'DEPLOYMENT',
        },
      },
      package: 'my::lakehouse',
      readMode: {
        _type: 'Undefined',
        format: {
          _type: 'CSV',
          fieldDelimiter: ',',
          headerRowsToSkipCount: 0,
          recordDelimiter: '\n',
        },
      },
      sourceInformation: {
        endColumn: 1,
        endLine: 54,
        sourceId: '',
        startColumn: 1,
        startLine: 41,
      },
      stereotypes: [],
      taggedValues: [],
      writeMode: {
        _type: 'append_only',
      },
    },
    classifierPath:
      'meta::external::ingest::specification::metamodel::IngestDefinition',
  },
];

export const TEST_DATA__DATAPRODUCT__MAPPING__INCLUDE = [
  {
    path: 'entity::model::LegalEntity',
    content: {
      _type: 'class',
      name: 'LegalEntity',
      package: 'entity::model',
      properties: [
        {
          genericType: {
            rawType: {
              _type: 'packageableType',
              fullPath: 'String',
            },
          },
          multiplicity: {
            lowerBound: 1,
            upperBound: 1,
          },
          name: 'identifier',
        },
        {
          genericType: {
            rawType: {
              _type: 'packageableType',
              fullPath: 'String',
            },
          },
          multiplicity: {
            lowerBound: 1,
            upperBound: 1,
          },
          name: 'legalName',
        },
      ],
    },
    classifierPath: 'meta::pure::metamodel::type::Class',
  },
  {
    path: 'trade::model::Trade',
    content: {
      _type: 'class',
      name: 'Trade',
      package: 'trade::model',
      properties: [
        {
          genericType: {
            rawType: {
              _type: 'packageableType',
              fullPath: 'String',
            },
          },
          multiplicity: {
            lowerBound: 1,
            upperBound: 1,
          },
          name: 'ticker',
        },
        {
          genericType: {
            rawType: {
              _type: 'packageableType',
              fullPath: 'Integer',
            },
          },
          multiplicity: {
            lowerBound: 1,
            upperBound: 1,
          },
          name: 'quantity',
        },
      ],
    },
    classifierPath: 'meta::pure::metamodel::type::Class',
  },
  {
    path: 'trade::model::Trade_LegalEntity',
    content: {
      _type: 'association',
      name: 'Trade_LegalEntity',
      package: 'trade::model',
      properties: [
        {
          genericType: {
            rawType: {
              _type: 'packageableType',
              fullPath: 'entity::model::LegalEntity',
            },
          },
          multiplicity: {
            lowerBound: 1,
            upperBound: 1,
          },
          name: 'client',
        },
        {
          genericType: {
            rawType: {
              _type: 'packageableType',
              fullPath: 'trade::model::Trade',
            },
          },
          multiplicity: {
            lowerBound: 0,
          },
          name: 'trades',
        },
      ],
    },
    classifierPath: 'meta::pure::metamodel::relationship::Association',
  },
  {
    path: 'entity::store::LegalEntityDatabase',
    content: {
      _type: 'relational',
      filters: [],
      joins: [],
      name: 'LegalEntityDatabase',
      package: 'entity::store',
      schemas: [
        {
          name: 'LEGAL_ENTITY_SCHEMA',
          tables: [
            {
              columns: [
                {
                  name: 'LEGAL_ENTITY_ID',
                  nullable: false,
                  type: {
                    _type: 'Varchar',
                    size: 100,
                  },
                },
                {
                  name: 'LEGAL_NAME',
                  nullable: true,
                  type: {
                    _type: 'Varchar',
                    size: 100,
                  },
                },
              ],
              name: 'LEGAL_ENTITY_TABLE',
              primaryKey: ['LEGAL_ENTITY_ID'],
            },
          ],
          views: [],
        },
      ],
    },
    classifierPath: 'meta::relational::metamodel::Database',
  },
  {
    path: 'trade::store::TradeDatabase',
    content: {
      _type: 'relational',
      filters: [],
      joins: [],
      name: 'TradeDatabase',
      package: 'trade::store',
      schemas: [
        {
          name: 'TRADE_SCHEMA',
          tables: [
            {
              columns: [
                {
                  name: 'TICKER',
                  nullable: false,
                  type: {
                    _type: 'Varchar',
                    size: 100,
                  },
                },
                {
                  name: 'QUANTITY',
                  nullable: true,
                  type: {
                    _type: 'Integer',
                  },
                },
                {
                  name: 'CLIENT_IDENTIFIER',
                  nullable: true,
                  type: {
                    _type: 'Varchar',
                    size: 100,
                  },
                },
              ],
              name: 'TRADE_TABLE',
              primaryKey: ['TICKER'],
            },
          ],
          views: [],
        },
      ],
    },
    classifierPath: 'meta::relational::metamodel::Database',
  },
  {
    path: 'entity::mapping::LegalEntityMapping',
    content: {
      _type: 'mapping',
      classMappings: [
        {
          _type: 'relational',
          class: 'entity::model::LegalEntity',
          distinct: false,
          id: 'legal_entity',
          mainTable: {
            _type: 'Table',
            database: 'entity::store::LegalEntityDatabase',
            mainTableDb: 'entity::store::LegalEntityDatabase',
            schema: 'LEGAL_ENTITY_SCHEMA',
            table: 'LEGAL_ENTITY_TABLE',
          },
          primaryKey: [
            {
              _type: 'column',
              column: 'LEGAL_ENTITY_ID',
              table: {
                _type: 'Table',
                database: 'entity::store::LegalEntityDatabase',
                mainTableDb: 'entity::store::LegalEntityDatabase',
                schema: 'LEGAL_ENTITY_SCHEMA',
                table: 'LEGAL_ENTITY_TABLE',
              },
              tableAlias: 'LEGAL_ENTITY_TABLE',
            },
          ],
          propertyMappings: [
            {
              _type: 'relationalPropertyMapping',
              property: {
                class: 'entity::model::LegalEntity',
                property: 'identifier',
              },
              relationalOperation: {
                _type: 'column',
                column: 'LEGAL_ENTITY_ID',
                table: {
                  _type: 'Table',
                  database: 'entity::store::LegalEntityDatabase',
                  mainTableDb: 'entity::store::LegalEntityDatabase',
                  schema: 'LEGAL_ENTITY_SCHEMA',
                  table: 'LEGAL_ENTITY_TABLE',
                },
                tableAlias: 'LEGAL_ENTITY_TABLE',
              },
              source: 'legal_entity',
            },
            {
              _type: 'relationalPropertyMapping',
              property: {
                class: 'entity::model::LegalEntity',
                property: 'legalName',
              },
              relationalOperation: {
                _type: 'column',
                column: 'LEGAL_NAME',
                table: {
                  _type: 'Table',
                  database: 'entity::store::LegalEntityDatabase',
                  mainTableDb: 'entity::store::LegalEntityDatabase',
                  schema: 'LEGAL_ENTITY_SCHEMA',
                  table: 'LEGAL_ENTITY_TABLE',
                },
                tableAlias: 'LEGAL_ENTITY_TABLE',
              },
              source: 'legal_entity',
            },
          ],
          root: true,
        },
      ],
      enumerationMappings: [],
      includedMappings: [],
      name: 'LegalEntityMapping',
      package: 'entity::mapping',
      tests: [],
    },
    classifierPath: 'meta::pure::mapping::Mapping',
  },
  {
    path: 'trade::mapping::TradeMapping',
    content: {
      _type: 'mapping',
      associationMappings: [
        {
          _type: 'xStore',
          association: {
            path: 'trade::model::Trade_LegalEntity',
            type: 'ASSOCIATION',
          },
          propertyMappings: [
            {
              _type: 'xStorePropertyMapping',
              crossExpression: {
                _type: 'lambda',
                body: [
                  {
                    _type: 'func',
                    function: 'equal',
                    parameters: [
                      {
                        _type: 'property',
                        parameters: [
                          {
                            _type: 'var',
                            name: 'this',
                          },
                        ],
                        property: 'clientIdentifier',
                      },
                      {
                        _type: 'property',
                        parameters: [
                          {
                            _type: 'var',
                            name: 'that',
                          },
                        ],
                        property: 'identifier',
                      },
                    ],
                  },
                ],
                parameters: [],
              },
              property: {
                class: 'trade::model::Trade_LegalEntity',
                property: 'client',
              },
              source: '',
              target: '',
            },
            {
              _type: 'xStorePropertyMapping',
              crossExpression: {
                _type: 'lambda',
                body: [
                  {
                    _type: 'func',
                    function: 'equal',
                    parameters: [
                      {
                        _type: 'property',
                        parameters: [
                          {
                            _type: 'var',
                            name: 'this',
                          },
                        ],
                        property: 'identifier',
                      },
                      {
                        _type: 'property',
                        parameters: [
                          {
                            _type: 'var',
                            name: 'that',
                          },
                        ],
                        property: 'clientIdentifier',
                      },
                    ],
                  },
                ],
                parameters: [],
              },
              property: {
                class: 'trade::model::Trade_LegalEntity',
                property: 'trades',
              },
              source: '',
              target: '',
            },
          ],
          stores: [],
        },
      ],
      classMappings: [
        {
          _type: 'relational',
          class: 'trade::model::Trade',
          distinct: false,
          id: 'trade',
          mainTable: {
            _type: 'Table',
            database: 'trade::store::TradeDatabase',
            mainTableDb: 'trade::store::TradeDatabase',
            schema: 'TRADE_SCHEMA',
            table: 'TRADE_TABLE',
          },
          primaryKey: [
            {
              _type: 'column',
              column: 'TICKER',
              table: {
                _type: 'Table',
                database: 'trade::store::TradeDatabase',
                mainTableDb: 'trade::store::TradeDatabase',
                schema: 'TRADE_SCHEMA',
                table: 'TRADE_TABLE',
              },
              tableAlias: 'TRADE_TABLE',
            },
            {
              _type: 'column',
              column: 'QUANTITY',
              table: {
                _type: 'Table',
                database: 'trade::store::TradeDatabase',
                mainTableDb: 'trade::store::TradeDatabase',
                schema: 'TRADE_SCHEMA',
                table: 'TRADE_TABLE',
              },
              tableAlias: 'TRADE_TABLE',
            },
            {
              _type: 'column',
              column: 'CLIENT_IDENTIFIER',
              table: {
                _type: 'Table',
                database: 'trade::store::TradeDatabase',
                mainTableDb: 'trade::store::TradeDatabase',
                schema: 'TRADE_SCHEMA',
                table: 'TRADE_TABLE',
              },
              tableAlias: 'TRADE_TABLE',
            },
          ],
          propertyMappings: [
            {
              _type: 'relationalPropertyMapping',
              property: {
                class: 'trade::model::Trade',
                property: 'ticker',
              },
              relationalOperation: {
                _type: 'column',
                column: 'TICKER',
                table: {
                  _type: 'Table',
                  database: 'trade::store::TradeDatabase',
                  mainTableDb: 'trade::store::TradeDatabase',
                  schema: 'TRADE_SCHEMA',
                  table: 'TRADE_TABLE',
                },
                tableAlias: 'TRADE_TABLE',
              },
              source: 'trade',
            },
            {
              _type: 'relationalPropertyMapping',
              property: {
                class: 'trade::model::Trade',
                property: 'quantity',
              },
              relationalOperation: {
                _type: 'column',
                column: 'QUANTITY',
                table: {
                  _type: 'Table',
                  database: 'trade::store::TradeDatabase',
                  mainTableDb: 'trade::store::TradeDatabase',
                  schema: 'TRADE_SCHEMA',
                  table: 'TRADE_TABLE',
                },
                tableAlias: 'TRADE_TABLE',
              },
              source: 'trade',
            },
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
                property: 'clientIdentifier',
              },
              relationalOperation: {
                _type: 'column',
                column: 'CLIENT_IDENTIFIER',
                table: {
                  _type: 'Table',
                  database: 'trade::store::TradeDatabase',
                  mainTableDb: 'trade::store::TradeDatabase',
                  schema: 'TRADE_SCHEMA',
                  table: 'TRADE_TABLE',
                },
                tableAlias: 'TRADE_TABLE',
              },
              source: 'trade',
            },
          ],
          root: true,
        },
      ],
      enumerationMappings: [],
      includedMappings: [
        {
          _type: 'mappingIncludeDataProduct',
          includedDataProduct: 'entity::dataproduct::LegalEntityDataProduct',
        },
      ],
      name: 'TradeMapping',
      package: 'trade::mapping',
      tests: [],
    },
    classifierPath: 'meta::pure::mapping::Mapping',
  },
  {
    path: 'trade::service::TradeService',
    content: {
      _type: 'service',
      autoActivateUpdates: true,
      documentation: '',
      execution: {
        _type: 'pureSingleExecution',
        func: {
          _type: 'lambda',
          body: [
            {
              _type: 'func',
              function: 'serialize',
              parameters: [
                {
                  _type: 'func',
                  function: 'graphFetch',
                  parameters: [
                    {
                      _type: 'func',
                      function: 'getAll',
                      parameters: [
                        {
                          _type: 'packageableElementPtr',
                          fullPath: 'trade::model::Trade',
                        },
                      ],
                    },
                    {
                      _type: 'classInstance',
                      type: 'rootGraphFetchTree',
                      value: {
                        _type: 'rootGraphFetchTree',
                        class: 'trade::model::Trade',
                        subTrees: [
                          {
                            _type: 'propertyGraphFetchTree',
                            parameters: [],
                            property: 'quantity',
                            subTrees: [],
                            subTypeTrees: [],
                          },
                          {
                            _type: 'propertyGraphFetchTree',
                            parameters: [],
                            property: 'ticker',
                            subTrees: [],
                            subTypeTrees: [],
                          },
                          {
                            _type: 'propertyGraphFetchTree',
                            parameters: [],
                            property: 'client',
                            subTrees: [
                              {
                                _type: 'propertyGraphFetchTree',
                                parameters: [],
                                property: 'legalName',
                                subTrees: [],
                                subTypeTrees: [],
                              },
                              {
                                _type: 'propertyGraphFetchTree',
                                parameters: [],
                                property: 'identifier',
                                subTrees: [],
                                subTypeTrees: [],
                              },
                            ],
                            subTypeTrees: [],
                          },
                        ],
                        subTypeTrees: [],
                      },
                    },
                  ],
                },
                {
                  _type: 'classInstance',
                  type: 'rootGraphFetchTree',
                  value: {
                    _type: 'rootGraphFetchTree',
                    class: 'trade::model::Trade',
                    subTrees: [
                      {
                        _type: 'propertyGraphFetchTree',
                        parameters: [],
                        property: 'quantity',
                        subTrees: [],
                        subTypeTrees: [],
                      },
                      {
                        _type: 'propertyGraphFetchTree',
                        parameters: [],
                        property: 'ticker',
                        subTrees: [],
                        subTypeTrees: [],
                      },
                      {
                        _type: 'propertyGraphFetchTree',
                        parameters: [],
                        property: 'client',
                        subTrees: [
                          {
                            _type: 'propertyGraphFetchTree',
                            parameters: [],
                            property: 'legalName',
                            subTrees: [],
                            subTypeTrees: [],
                          },
                          {
                            _type: 'propertyGraphFetchTree',
                            parameters: [],
                            property: 'identifier',
                            subTrees: [],
                            subTypeTrees: [],
                          },
                        ],
                        subTypeTrees: [],
                      },
                    ],
                    subTypeTrees: [],
                  },
                },
              ],
            },
          ],
          parameters: [],
        },
        mapping: 'trade::mapping::TradeMapping',
        runtime: {
          _type: 'runtimePointer',
          runtime: 'trade::runtime::TradeRuntime',
        },
      },
      name: 'TradeService',
      owners: ['anonymous'],
      package: 'trade::service',
      pattern: '/aeadc3bd-27ac-46ae-8989-073ea134aceb',
      testSuites: [
        {
          _type: 'serviceTestSuite',
          id: 'testSuite_1',
          testData: {
            connectionsTestData: [
              {
                data: {
                  _type: 'relationalCSVData',
                  tables: [
                    {
                      schema: 'LEGAL_ENTITY_SCHEMA',
                      table: 'LEGAL_ENTITY_TABLE',
                      values: 'LEGAL_ENTITY_ID,LEGAL_NAME\n1,Tesla\n',
                    },
                  ],
                },
                id: 'connection_2',
              },
              {
                data: {
                  _type: 'relationalCSVData',
                  tables: [
                    {
                      schema: 'TRADE_SCHEMA',
                      table: 'TRADE_TABLE',
                      values: 'TICKER,QUANTITY,CLIENT_IDENTIFIER\nAPPL,10,1\n',
                    },
                  ],
                },
                id: 'connection_1',
              },
            ],
          },
          tests: [
            {
              _type: 'serviceTest',
              assertions: [
                {
                  _type: 'equalToJson',
                  expected: {
                    _type: 'externalFormat',
                    contentType: 'application/json',
                    data: '{\n  "quantity": 10,\n  "ticker": "APPL",\n  "client": {\n    "legalName": "Tesla",\n    "identifier": "1"\n  }\n}',
                  },
                  id: 'assertion_1',
                },
              ],
              id: 'test_1',
              keys: [],
              serializationFormat: 'PURE',
            },
          ],
        },
      ],
    },
    classifierPath: 'meta::legend::service::metamodel::Service',
  },
  {
    path: 'trade::runtime::TradeRuntime',
    content: {
      _type: 'runtime',
      name: 'TradeRuntime',
      package: 'trade::runtime',
      runtimeValue: {
        _type: 'engineRuntime',
        connectionStores: [],
        connections: [
          {
            store: {
              path: 'trade::store::TradeDatabase',
              type: 'STORE',
            },
            storeConnections: [
              {
                connection: {
                  _type: 'RelationalDatabaseConnection',
                  authenticationStrategy: {
                    _type: 'h2Default',
                  },
                  databaseType: 'H2',
                  datasourceSpecification: {
                    _type: 'h2Local',
                  },
                  element: 'trade::store::TradeDatabase',
                  type: 'H2',
                },
                id: 'connection_1',
              },
            ],
          },
          {
            store: {
              path: 'entity::store::LegalEntityDatabase',
              type: 'STORE',
            },
            storeConnections: [
              {
                connection: {
                  _type: 'RelationalDatabaseConnection',
                  authenticationStrategy: {
                    _type: 'h2Default',
                  },
                  databaseType: 'H2',
                  datasourceSpecification: {
                    _type: 'h2Local',
                  },
                  element: 'entity::store::LegalEntityDatabase',
                  type: 'H2',
                },
                id: 'connection_2',
              },
            ],
          },
        ],
        mappings: [
          {
            path: 'trade::mapping::TradeMapping',
            type: 'MAPPING',
          },
        ],
      },
    },
    classifierPath: 'meta::pure::runtime::PackageableRuntime',
  },
  {
    path: 'entity::runtime::LegalEntityRuntime',
    content: {
      _type: 'runtime',
      name: 'LegalEntityRuntime',
      package: 'entity::runtime',
      runtimeValue: {
        _type: 'engineRuntime',
        connectionStores: [],
        connections: [
          {
            store: {
              path: 'entity::store::LegalEntityDatabase',
              type: 'STORE',
            },
            storeConnections: [
              {
                connection: {
                  _type: 'RelationalDatabaseConnection',
                  authenticationStrategy: {
                    _type: 'h2Default',
                  },
                  databaseType: 'H2',
                  datasourceSpecification: {
                    _type: 'h2Local',
                  },
                  element: 'entity::store::LegalEntityDatabase',
                  type: 'H2',
                },
                id: 'connection_1',
              },
            ],
          },
        ],
        mappings: [
          {
            path: 'entity::mapping::LegalEntityMapping',
            type: 'MAPPING',
          },
        ],
      },
    },
    classifierPath: 'meta::pure::runtime::PackageableRuntime',
  },
  {
    path: 'entity::dataproduct::LegalEntityDataProduct',
    content: {
      _type: 'dataProduct',
      accessPointGroups: [
        {
          _type: 'modelAccessPointGroup',
          compatibleRuntimes: [
            {
              id: 'entityRuntime',
              runtime: {
                path: 'entity::runtime::LegalEntityRuntime',
              },
            },
          ],
          defaultRuntime: 'entityRuntime',
          description:
            'Entity Data model access point group for sharing data models with consumers',
          id: 'modelAccessPointGroup',
          mapping: {
            path: 'entity::mapping::LegalEntityMapping',
          },
        },
      ],
      name: 'LegalEntityDataProduct',
      package: 'entity::dataproduct',
      type: {
        _type: 'internalDataProductType',
      },
    },
    classifierPath:
      'meta::external::catalog::dataProduct::specification::metamodel::DataProduct',
  },
];
