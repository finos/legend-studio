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

export const TEST_DATA__roundtrip = [
  {
    path: 'model::Person',
    content: {
      _type: 'class',
      name: 'Person',
      package: 'model',
    },
    classifierPath: 'meta::pure::metamodel::type::Class',
  },
  {
    path: 'test::model::TestMapping',
    content: {
      _type: 'mapping',
      classMappings: [],
      enumerationMappings: [],
      includedMappings: [],
      name: 'TestMapping',
      package: 'test::model',
      tests: [],
    },
    classifierPath: 'meta::pure::mapping::Mapping',
  },
  {
    path: 'test::model::TestRuntime',
    content: {
      _type: 'runtime',
      name: 'TestRuntime',
      package: 'test::model',
      runtimeValue: {
        _type: 'engineRuntime',
        connectionStores: [],
        connections: [],
        mappings: [
          {
            path: 'test::model::TestMapping',
            type: 'MAPPING',
          },
        ],
      },
    },
    classifierPath: 'meta::pure::runtime::PackageableRuntime',
  },
  {
    path: 'test::model::TestDataSpace',
    content: {
      _type: 'dataSpace',
      elements: [
        {
          path: 'model::Person',
        },
      ],
      defaultExecutionContext: 'INT',
      description: 'some description 2',
      executionContexts: [
        {
          defaultRuntime: {
            path: 'test::model::TestRuntime',
            type: 'RUNTIME',
          },
          description: 'some description 1',
          mapping: {
            path: 'test::model::TestMapping',
            type: 'MAPPING',
          },
          name: 'INT',
        },
      ],
      name: 'TestDataSpace',
      package: 'test::model',
      stereotypes: [
        {
          profile: 'meta::pure::profiles::doc',
          value: 'deprecated',
        },
      ],
      supportInfo: {
        _type: 'email',
        address: 'testEmail@test.org',
      },
      taggedValues: [
        {
          tag: {
            profile: 'meta::pure::profiles::doc',
            value: 'doc',
          },
          value: 'test',
        },
      ],
    },
    classifierPath: 'meta::pure::metamodel::dataSpace::DataSpace',
  },
  {
    path: 'test::model::TestMappingWithDataSpaceIncludes',
    content: {
      _type: 'mapping',
      classMappings: [],
      enumerationMappings: [],
      includedMappings: [
        {
          _type: 'mappingIncludeDataSpace',
          includedDataSpace: 'test::model::TestDataSpace',
        },
      ],
      name: 'TestMappingWithDataSpaceIncludes',
      package: 'test::model',
      tests: [],
    },
    classifierPath: 'meta::pure::mapping::Mapping',
  },
];

export const TEST_DATA__DSL_DataSpace_Model = [
  {
    path: 'domain::Demographics',
    content: {
      _type: 'class',
      name: 'Demographics',
      package: 'domain',
      properties: [
        {
          multiplicity: {
            lowerBound: 0,
            upperBound: 1,
          },
          name: 'fips',
          type: 'String',
        },
        {
          multiplicity: {
            lowerBound: 0,
            upperBound: 1,
          },
          name: 'state',
          type: 'String',
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
          type: 'Integer',
        },
        {
          multiplicity: {
            lowerBound: 0,
            upperBound: 1,
          },
          name: 'fips',
          type: 'String',
        },
        {
          multiplicity: {
            lowerBound: 0,
            upperBound: 1,
          },
          name: 'date',
          type: 'StrictDate',
        },
        {
          multiplicity: {
            lowerBound: 0,
            upperBound: 1,
          },
          name: 'caseType',
          type: 'String',
        },
        {
          multiplicity: {
            lowerBound: 0,
            upperBound: 1,
          },
          name: 'cases',
          type: 'Float',
        },
        {
          multiplicity: {
            lowerBound: 0,
            upperBound: 1,
          },
          name: 'lastReportedFlag',
          type: 'Boolean',
        },
        {
          multiplicity: {
            lowerBound: 0,
            upperBound: 1,
          },
          name: 'demographics',
          type: 'domain::Demographics',
        },
      ],
    },
    classifierPath: 'meta::pure::metamodel::type::Class',
  },
  {
    path: 'domain::COVIDData_QueryFunction__TabularDataSet_1_',
    content: {
      _type: 'function',
      body: [
        {
          _type: 'func',
          function: 'from',
          parameters: [
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
                      fullPath: 'domain::COVIDData',
                      sourceInformation: {
                        endColumn: 19,
                        endLine: 110,
                        sourceId: '',
                        startColumn: 3,
                        startLine: 110,
                      },
                    },
                  ],
                  sourceInformation: {
                    endColumn: 25,
                    endLine: 110,
                    sourceId: '',
                    startColumn: 20,
                    startLine: 110,
                  },
                },
                {
                  _type: 'collection',
                  multiplicity: {
                    lowerBound: 1,
                    upperBound: 1,
                  },
                  sourceInformation: {
                    endColumn: 5,
                    endLine: 113,
                    sourceId: '',
                    startColumn: 5,
                    startLine: 111,
                  },
                  values: [
                    {
                      _type: 'lambda',
                      body: [
                        {
                          _type: 'property',
                          parameters: [
                            {
                              _type: 'var',
                              name: 'x',
                              sourceInformation: {
                                endColumn: 10,
                                endLine: 112,
                                sourceId: '',
                                startColumn: 9,
                                startLine: 112,
                              },
                            },
                          ],
                          property: 'cases',
                          sourceInformation: {
                            endColumn: 16,
                            endLine: 112,
                            sourceId: '',
                            startColumn: 12,
                            startLine: 112,
                          },
                        },
                      ],
                      parameters: [
                        {
                          _type: 'var',
                          name: 'x',
                        },
                      ],
                      sourceInformation: {
                        endColumn: 16,
                        endLine: 112,
                        sourceId: '',
                        startColumn: 8,
                        startLine: 112,
                      },
                    },
                  ],
                },
                {
                  _type: 'collection',
                  multiplicity: {
                    lowerBound: 1,
                    upperBound: 1,
                  },
                  sourceInformation: {
                    endColumn: 13,
                    endLine: 114,
                    sourceId: '',
                    startColumn: 5,
                    startLine: 114,
                  },
                  values: [
                    {
                      _type: 'string',
                      sourceInformation: {
                        endColumn: 12,
                        endLine: 114,
                        sourceId: '',
                        startColumn: 6,
                        startLine: 114,
                      },
                      value: 'Cases',
                    },
                  ],
                },
              ],
              sourceInformation: {
                endColumn: 34,
                endLine: 110,
                sourceId: '',
                startColumn: 28,
                startLine: 110,
              },
            },
            {
              _type: 'packageableElementPtr',
              fullPath: 'mapping::CovidDataMapping',
              sourceInformation: {
                endColumn: 29,
                endLine: 116,
                sourceId: '',
                startColumn: 5,
                startLine: 116,
              },
            },
            {
              _type: 'packageableElementPtr',
              fullPath: 'runtime::H2Runtime',
              sourceInformation: {
                endColumn: 22,
                endLine: 117,
                sourceId: '',
                startColumn: 5,
                startLine: 117,
              },
            },
          ],
          sourceInformation: {
            endColumn: 9,
            endLine: 115,
            sourceId: '',
            startColumn: 6,
            startLine: 115,
          },
        },
      ],
      name: 'COVIDData_QueryFunction__TabularDataSet_1_',
      package: 'domain',
      parameters: [],
      postConstraints: [],
      preConstraints: [],
      returnMultiplicity: {
        lowerBound: 1,
        upperBound: 1,
      },
      returnType: 'meta::pure::tds::TabularDataSet',
    },
    classifierPath:
      'meta::pure::metamodel::function::ConcreteFunctionDefinition',
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
                    _type: 'Float',
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
          class: 'domain::Demographics',
          distinct: false,
          mainTable: {
            _type: 'Table',
            database: 'store::CovidDataStore',
            mainTableDb: 'store::CovidDataStore',
            schema: 'default',
            table: 'DEMOGRAPHICS',
          },
          primaryKey: [
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
          ],
          propertyMappings: [
            {
              _type: 'relationalPropertyMapping',
              property: {
                class: 'domain::Demographics',
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
                  table: 'DEMOGRAPHICS',
                },
                tableAlias: 'DEMOGRAPHICS',
              },
            },
            {
              _type: 'relationalPropertyMapping',
              property: {
                class: 'domain::Demographics',
                property: 'state',
              },
              relationalOperation: {
                _type: 'column',
                column: 'STATE',
                table: {
                  _type: 'Table',
                  database: 'store::CovidDataStore',
                  mainTableDb: 'store::CovidDataStore',
                  schema: 'default',
                  table: 'DEMOGRAPHICS',
                },
                tableAlias: 'DEMOGRAPHICS',
              },
            },
          ],
          root: false,
        },
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
              _type: 'relationalPropertyMapping',
              property: {
                class: 'domain::COVIDData',
                property: 'demographics',
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
  {
    path: 'mapping::CovidDataMappingService',
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
              function: 'project',
              parameters: [
                {
                  _type: 'func',
                  function: 'getAll',
                  parameters: [
                    {
                      _type: 'packageableElementPtr',
                      fullPath: 'domain::COVIDData',
                    },
                  ],
                },
                {
                  _type: 'collection',
                  multiplicity: {
                    lowerBound: 1,
                    upperBound: 1,
                  },
                  values: [
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
                          property: 'caseType',
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
                    lowerBound: 1,
                    upperBound: 1,
                  },
                  values: [
                    {
                      _type: 'string',
                      value: 'Case Type',
                    },
                  ],
                },
              ],
            },
          ],
          parameters: [],
        },
        mapping: 'mapping::CovidDataMapping',
        runtime: {
          _type: 'runtimePointer',
          runtime: 'runtime::H2Runtime',
        },
      },
      name: 'CovidDataMappingService',
      owners: [],
      ownership: {
        _type: 'deploymentOwnership',
        identifier: '',
      },
      package: 'mapping',
      pattern: '/f5dc285f-6886-4b97-9f37-749289917c6a',
    },
    classifierPath: 'meta::legend::service::metamodel::Service',
  },
  {
    path: 'runtime::H2Runtime',
    content: {
      _type: 'runtime',
      name: 'H2Runtime',
      package: 'runtime',
      runtimeValue: {
        _type: 'engineRuntime',
        connectionStores: [],
        connections: [
          {
            store: {
              path: 'store::CovidDataStore',
              type: 'STORE',
            },
            storeConnections: [
              {
                connection: {
                  _type: 'connectionPointer',
                  connection: 'runtime::connection::H2Connection',
                },
                id: 'connection_1',
              },
            ],
          },
        ],
        mappings: [
          {
            path: 'mapping::CovidDataMapping',
            type: 'MAPPING',
          },
        ],
      },
    },
    classifierPath: 'meta::pure::runtime::PackageableRuntime',
  },
  {
    path: 'runtime::connection::H2Connection',
    content: {
      _type: 'connection',
      connectionValue: {
        _type: 'RelationalDatabaseConnection',
        authenticationStrategy: {
          _type: 'h2Default',
        },
        databaseType: 'H2',
        datasourceSpecification: {
          _type: 'h2Local',
          testDataSetupSqls: [
            "DROP TABLE IF EXISTS COVID_DATA;\nDROP TABLE IF EXISTS DEMOGRAPHICS;\n\nCREATE TABLE DEMOGRAPHICS(\n  FIPS VARCHAR(200) PRIMARY KEY,\n  STATE VARCHAR(200)\n);\n\nCREATE TABLE COVID_DATA(\n  ID INT PRIMARY KEY,\n  FIPS VARCHAR(200),\n  DATE DATE,\n  CASE_TYPE VARCHAR(200),\n  CASES FLOAT,\n  LAST_REPORTED_FLAG BIT,\n  FOREIGN KEY (FIPS) REFERENCES DEMOGRAPHICS(FIPS)\n);\n\nINSERT INTO DEMOGRAPHICS VALUES('1', 'NY');\nINSERT INTO DEMOGRAPHICS VALUES('2', 'NJ');\nINSERT INTO DEMOGRAPHICS VALUES('3', 'CA');\n\nINSERT INTO COVID_DATA VALUES(1, '1', '2021-04-01', 'Confirmed', 405.34343, 0);\nINSERT INTO COVID_DATA VALUES(2, '2', '2021-04-01', 'Active', 290.2332233333, 1);\n",
          ],
        },
        element: 'store::CovidDataStore',
        type: 'H2',
      },
      name: 'H2Connection',
      package: 'runtime::connection',
    },
    classifierPath: 'meta::pure::runtime::PackageableConnection',
  },
  {
    path: 'domain::COVIDDatapace',
    content: {
      _type: 'dataSpace',
      defaultExecutionContext: 'dummyContext',
      description: 'Not over yet?',
      executables: [
        {
          _type: 'dataSpacePackageableElementExecutable',
          description: 'Some more exec description',
          title: 'templateWithFunctionPointer',
          executable: {
            path: 'domain::COVIDData_QueryFunction():TabularDataSet[1]',
            type: 'FUNCTION',
          },
        },
        {
          _type: 'dataSpacePackageableElementExecutable',
          description: 'Some more exec description',
          title: 'templateWithService',
          executable: {
            path: 'mapping::CovidDataMappingService',
          },
        },
        {
          _type: 'dataSpaceTemplateExecutable',
          title: 'templateWithInlineQuery',
          id: '2',
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
                        fullPath: 'domain::COVIDData',
                      },
                    ],
                  },
                  {
                    _type: 'collection',
                    multiplicity: {
                      lowerBound: 1,
                      upperBound: 1,
                    },
                    values: [
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
                            property: 'fips',
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
                      lowerBound: 1,
                      upperBound: 1,
                    },
                    values: [
                      {
                        _type: 'string',
                        value: 'Fips',
                      },
                    ],
                  },
                ],
              },
            ],
            parameters: [],
          },
          executionContextKey: 'dummyContext',
        },
      ],
      executionContexts: [
        {
          defaultRuntime: {
            path: 'runtime::H2Runtime',
            type: 'RUNTIME',
          },
          mapping: {
            path: 'mapping::CovidDataMapping',
            type: 'MAPPING',
          },
          name: 'dummyContext',
        },
        {
          defaultRuntime: {
            path: 'runtime::H2Runtime',
            type: 'RUNTIME',
          },
          mapping: {
            path: 'mapping::CovidDataMapping',
            type: 'MAPPING',
          },
          name: 'dummyContext2',
        },
      ],
      name: 'COVIDDatapace',
      package: 'domain',
      title: 'COVID Sample Data',
    },
    classifierPath: 'meta::pure::metamodel::dataSpace::DataSpace',
  },
];
