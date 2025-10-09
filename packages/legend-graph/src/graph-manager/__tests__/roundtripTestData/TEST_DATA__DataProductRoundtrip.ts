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

export const TEST_DATA__DATAPRODUCT__INCLUDE = [
  {
    path: 'my::relational::db',
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
                  database: 'my::lakehouse::FirmIngest',
                  mainTableDb: 'my::lakehouse::FirmIngest',
                  schema: 'ALLOY_FIRM_GROUP',
                  table: 'Firm',
                },
                tableAlias: 'Firm',
              },
              {
                _type: 'literal',
                value: 123,
              },
            ],
          },
        },
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
                  database: 'my::lakehouse::PersonDataProduct',
                  mainTableDb: 'my::lakehouse::PersonDataProduct',
                  schema: 'default',
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
      includedStoreSpecifications: [
        {
          packageableElementPointer: {
            path: 'my::lakehouse::FirmIngest',
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
                  database: 'my::lakehouse::PersonDataProduct',
                  mainTableDb: 'my::lakehouse::PersonDataProduct',
                  schema: 'default',
                  table: 'ap1_PersonLatest',
                },
                tableAlias: 'ap1_PersonLatest',
              },
              {
                _type: 'column',
                column: 'firm_id',
                table: {
                  _type: 'Table',
                  database: 'my::lakehouse::PersonDataProduct',
                  mainTableDb: 'my::lakehouse::PersonDataProduct',
                  schema: 'default',
                  table: '{target}',
                },
                tableAlias: '{target}',
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
                        endLine: 20,
                        sourceId: '',
                        startColumn: 11,
                        startLine: 20,
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
                    endLine: 20,
                    sourceId: '',
                    startColumn: 7,
                    startLine: 20,
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
                        endLine: 21,
                        sourceId: '',
                        startColumn: 18,
                        startLine: 21,
                      },
                    },
                    typeArguments: [],
                    typeVariableValues: [
                      {
                        _type: 'integer',
                        sourceInformation: {
                          endColumn: 28,
                          endLine: 21,
                          sourceId: '',
                          startColumn: 26,
                          startLine: 21,
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
                    endLine: 21,
                    sourceId: '',
                    startColumn: 7,
                    startLine: 21,
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
                        endLine: 22,
                        sourceId: '',
                        startColumn: 16,
                        startLine: 22,
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
                    endLine: 22,
                    sourceId: '',
                    startColumn: 7,
                    startLine: 22,
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
        endLine: 26,
        sourceId: '',
        startColumn: 1,
        startLine: 17,
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
                        endColumn: 30,
                        endLine: 33,
                        sourceId: '',
                        startColumn: 19,
                        startLine: 33,
                      },
                    },
                    typeArguments: [],
                    typeVariableValues: [
                      {
                        _type: 'integer',
                        sourceInformation: {
                          endColumn: 29,
                          endLine: 33,
                          sourceId: '',
                          startColumn: 27,
                          startLine: 33,
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
                    endLine: 33,
                    sourceId: '',
                    startColumn: 7,
                    startLine: 33,
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
        endLine: 36,
        sourceId: '',
        startColumn: 1,
        startLine: 29,
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
