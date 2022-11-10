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

export const TEST_DATA__RelationalServiceTestable = [
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
          type: 'String',
        },
        {
          multiplicity: {
            lowerBound: 1,
            upperBound: 1,
          },
          name: 'lastName',
          type: 'String',
        },
      ],
    },
    classifierPath: 'meta::pure::metamodel::type::Class',
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
          type: 'String',
        },
        {
          multiplicity: {
            lowerBound: 1,
            upperBound: 1,
          },
          name: 'employees',
          type: 'model::Person',
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
                owner: 'model::Person',
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
                owner: 'model::Person',
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
                owner: 'model::Firm',
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
                owner: 'model::Firm',
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
      tests: [
        {
          assert: {
            _type: 'expectedOutputMappingTestAssert',
            expectedOutput:
              '[{"values":["John","Doe","Finos"]},{"values":["Nicole","Smith","Finos"]},{"values":["Tim","Smith","Apple"]}]',
          },
          inputData: [
            {
              _type: 'relational',
              data: 'default\nPersonTable\nid,firm_id,firstName,lastName\n1,1,John,Doe\n2,1,Nicole,Smith\n3,2,Tim,Smith\n----\ndefault\nFirmTable\nid,legal_Name\n1,Finos\n2,Apple\n\n\n\n',
              database: 'store::TestDB',
              inputType: 'CSV',
            },
          ],
          name: 'test_1',
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
                    values: [
                      {
                        _type: 'lambda',
                        body: [
                          {
                            _type: 'property',
                            property: 'firstName',
                            parameters: [
                              {
                                _type: 'property',
                                property: 'employees',
                                parameters: [
                                  {
                                    _type: 'var',
                                    name: 'x',
                                  },
                                ],
                              },
                            ],
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
                            property: 'lastName',
                            parameters: [
                              {
                                _type: 'property',
                                property: 'employees',
                                parameters: [
                                  {
                                    _type: 'var',
                                    name: 'x',
                                  },
                                ],
                              },
                            ],
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
                            property: 'legalName',
                            parameters: [
                              {
                                _type: 'var',
                                name: 'x',
                              },
                            ],
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
                    multiplicity: {
                      lowerBound: 3,
                      upperBound: 3,
                    },
                  },
                  {
                    _type: 'collection',
                    values: [
                      {
                        _type: 'string',
                        values: ['Employees/First Name'],
                        multiplicity: {
                          lowerBound: 1,
                          upperBound: 1,
                        },
                      },
                      {
                        _type: 'string',
                        values: ['Employees/Last Name'],
                        multiplicity: {
                          lowerBound: 1,
                          upperBound: 1,
                        },
                      },
                      {
                        _type: 'string',
                        values: ['Legal Name'],
                        multiplicity: {
                          lowerBound: 1,
                          upperBound: 1,
                        },
                      },
                    ],
                    multiplicity: {
                      lowerBound: 3,
                      upperBound: 3,
                    },
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
    path: 'execution::service::MyErroredService',
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
                          fullPath: 'model::Firm',
                        },
                      ],
                    },
                    {
                      _type: 'rootGraphFetchTree',
                      subTrees: [
                        {
                          _type: 'propertyGraphFetchTree',
                          subTrees: [
                            {
                              _type: 'propertyGraphFetchTree',
                              subTrees: [],
                              property: 'firstName',
                              parameters: [],
                            },
                            {
                              _type: 'propertyGraphFetchTree',
                              subTrees: [],
                              property: 'lastName',
                              parameters: [],
                            },
                          ],
                          property: 'employees',
                          parameters: [],
                        },
                        {
                          _type: 'propertyGraphFetchTree',
                          subTrees: [],
                          property: 'legalName',
                          parameters: [],
                        },
                      ],
                      class: 'model::Firm',
                    },
                  ],
                },
                {
                  _type: 'rootGraphFetchTree',
                  subTrees: [
                    {
                      _type: 'propertyGraphFetchTree',
                      subTrees: [
                        {
                          _type: 'propertyGraphFetchTree',
                          subTrees: [],
                          property: 'firstName',
                          parameters: [],
                        },
                        {
                          _type: 'propertyGraphFetchTree',
                          subTrees: [],
                          property: 'lastName',
                          parameters: [],
                        },
                      ],
                      property: 'employees',
                      parameters: [],
                    },
                    {
                      _type: 'propertyGraphFetchTree',
                      subTrees: [],
                      property: 'legalName',
                      parameters: [],
                    },
                  ],
                  class: 'model::Firm',
                },
              ],
            },
          ],
          parameters: [],
        },
        mapping: 'execution::RelationalMapping',
        runtime: {
          _type: 'runtimePointer',
          runtime: 'execution::Runtime',
        },
      },
      name: 'MyErroredService',
      owners: [],
      package: 'execution::service',
      pattern: '/d2c48a9c-70fa-46e3-8173-c355e774004f',
      testSuites: [
        {
          _type: 'serviceTestSuite',
          id: 'errorSuite',
          testData: {
            connectionsTestData: [
              {
                data: {
                  _type: 'reference',
                  dataElement: 'data::RelationalData',
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
                    data: '[{"Employees/First Name":"John","Employees/Last Name":"Doe","Legal Name":"Finos"},{"Employees/First Name":"Nicole","Employees/Last Name":"Smith","Legal Name":"Finos"},{"Employees/First Name":"Time","Employees/Last Name":"Smith","Legal Name":"Apple"}]\n',
                  },
                  id: 'shouldErrorOut',
                },
              ],
              id: 'errorTest',
            },
          ],
        },
      ],
    },
    classifierPath: 'meta::legend::service::metamodel::Service',
  },
  {
    path: 'execution::service::MySuccessfulService',
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
                      fullPath: 'model::Firm',
                    },
                  ],
                },
                {
                  _type: 'collection',
                  values: [
                    {
                      _type: 'lambda',
                      body: [
                        {
                          _type: 'property',
                          property: 'firstName',
                          parameters: [
                            {
                              _type: 'property',
                              property: 'employees',
                              parameters: [
                                {
                                  _type: 'var',
                                  name: 'x',
                                },
                              ],
                            },
                          ],
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
                          property: 'lastName',
                          parameters: [
                            {
                              _type: 'property',
                              property: 'employees',
                              parameters: [
                                {
                                  _type: 'var',
                                  name: 'x',
                                },
                              ],
                            },
                          ],
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
                          property: 'legalName',
                          parameters: [
                            {
                              _type: 'var',
                              name: 'x',
                            },
                          ],
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
                  multiplicity: {
                    lowerBound: 3,
                    upperBound: 3,
                  },
                },
                {
                  _type: 'collection',
                  values: [
                    {
                      _type: 'string',
                      values: ['Employees/First Name'],
                      multiplicity: {
                        lowerBound: 1,
                        upperBound: 1,
                      },
                    },
                    {
                      _type: 'string',
                      values: ['Employees/Last Name'],
                      multiplicity: {
                        lowerBound: 1,
                        upperBound: 1,
                      },
                    },
                    {
                      _type: 'string',
                      values: ['Legal Name'],
                      multiplicity: {
                        lowerBound: 1,
                        upperBound: 1,
                      },
                    },
                  ],
                  multiplicity: {
                    lowerBound: 3,
                    upperBound: 3,
                  },
                },
              ],
            },
          ],
          parameters: [],
        },
        mapping: 'execution::RelationalMapping',
        runtime: {
          _type: 'runtimePointer',
          runtime: 'execution::Runtime',
        },
      },
      name: 'MySuccessfulService',
      owners: [],
      package: 'execution::service',
      pattern: '/d2c48a9c-70fa-46e3-8173-c355e774004f',
      testSuites: [
        {
          _type: 'serviceTestSuite',
          id: 'successfulSuite',
          testData: {
            connectionsTestData: [
              {
                data: {
                  _type: 'reference',
                  dataElement: 'data::RelationalData',
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
                    data: '[{"Employees/First Name":"John","Employees/Last Name":"Doe","Legal Name":"Finos"},{"Employees/First Name":"Nicole","Employees/Last Name":"Smith","Legal Name":"Finos"},{"Employees/First Name":"Time","Employees/Last Name":"Smith","Legal Name":"Apple"}]\n',
                  },
                  id: 'successfulAssert',
                },
              ],
              id: 'successfulTest',
            },
          ],
        },
      ],
    },
    classifierPath: 'meta::legend::service::metamodel::Service',
  },
  {
    path: 'execution::service::MyFailedService',
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
                      fullPath: 'model::Firm',
                    },
                  ],
                },
                {
                  _type: 'collection',
                  values: [
                    {
                      _type: 'lambda',
                      body: [
                        {
                          _type: 'property',
                          property: 'firstName',
                          parameters: [
                            {
                              _type: 'property',
                              property: 'employees',
                              parameters: [
                                {
                                  _type: 'var',
                                  name: 'x',
                                },
                              ],
                            },
                          ],
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
                          property: 'lastName',
                          parameters: [
                            {
                              _type: 'property',
                              property: 'employees',
                              parameters: [
                                {
                                  _type: 'var',
                                  name: 'x',
                                },
                              ],
                            },
                          ],
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
                          property: 'legalName',
                          parameters: [
                            {
                              _type: 'var',
                              name: 'x',
                            },
                          ],
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
                  multiplicity: {
                    lowerBound: 3,
                    upperBound: 3,
                  },
                },
                {
                  _type: 'collection',
                  values: [
                    {
                      _type: 'string',
                      values: ['Employees/First Name'],
                      multiplicity: {
                        lowerBound: 1,
                        upperBound: 1,
                      },
                    },
                    {
                      _type: 'string',
                      values: ['Employees/Last Name'],
                      multiplicity: {
                        lowerBound: 1,
                        upperBound: 1,
                      },
                    },
                    {
                      _type: 'string',
                      values: ['Legal Name'],
                      multiplicity: {
                        lowerBound: 1,
                        upperBound: 1,
                      },
                    },
                  ],
                  multiplicity: {
                    lowerBound: 3,
                    upperBound: 3,
                  },
                },
              ],
            },
          ],
          parameters: [],
        },
        mapping: 'execution::RelationalMapping',
        runtime: {
          _type: 'runtimePointer',
          runtime: 'execution::Runtime',
        },
      },
      name: 'MyFailedService',
      owners: [],
      package: 'execution::service',
      pattern: '/d2c48a9c-70fa-46e3-8173-c355e774004f',
      testSuites: [
        {
          _type: 'serviceTestSuite',
          id: 'failedSuite',
          testData: {
            connectionsTestData: [
              {
                data: {
                  _type: 'reference',
                  dataElement: 'data::RelationalData',
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
                    data: '[{"Employees/First Name":"John","Employees/Last Name":"Doe","Legal Name":"Finos"},{"Employees/First Name":"Nicole","Employees/Last Name":"Smith","Legal Name":"Finos"},{"Employees/First Name":"Time","Employees/Last Name":"Smith","Legal Name":"Apple"}]\n',
                  },
                  id: 'shouldPass',
                },
                {
                  _type: 'equalToJson',
                  expected: {
                    _type: 'externalFormat',
                    contentType: 'application/json',
                    data: '[{"Employees/First Name":"JohnWW","Employees/Last Name":"Doe","Legal Name":"Finos"},{"Employees/First Name":"Nicole","Employees/Last Name":"Smith","Legal Name":"Finos"},{"Employees/First Name":"Time","Employees/Last Name":"Smith","Legal Name":"Apple"}]\n',
                  },
                  id: 'shouldFail',
                },
              ],
              id: 'failedTest',
            },
          ],
        },
      ],
    },
    classifierPath: 'meta::legend::service::metamodel::Service',
  },
  {
    path: 'execution::Runtime',
    content: {
      _type: 'runtime',
      name: 'Runtime',
      package: 'execution',
      runtimeValue: {
        _type: 'engineRuntime',
        connections: [
          {
            store: {
              path: 'store::TestDB',
              type: 'STORE',
            },
            storeConnections: [
              {
                connection: {
                  _type: 'connectionPointer',
                  connection: 'model::MyConnection',
                },
                id: 'connection_1',
              },
            ],
          },
        ],
        mappings: [
          {
            path: 'execution::RelationalMapping',
            type: 'MAPPING',
          },
        ],
      },
    },
    classifierPath: 'meta::pure::runtime::PackageableRuntime',
  },
  {
    path: 'model::MyConnection',
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
            "Drop table if exists FirmTable;\nDrop table if exists PersonTable;\nCreate Table FirmTable(id INT, Legal_Name VARCHAR(200));\nCreate Table PersonTable(id INT, firm_id INT, lastName VARCHAR(200), firstName VARCHAR(200));\nInsert into FirmTable (id, Legal_Name) values (1, 'FirmA');\nInsert into FirmTable (id, Legal_Name) values (2, 'Apple');\nInsert into PersonTable (id, firm_id, lastName, firstName) values (1, 1, 'John', 'Doe');\nInsert into PersonTable (id, firm_id, lastName, firstName) values (2, 2, 'Tim', 'Smith');\nInsert into PersonTable (id, firm_id, lastName, firstName) values (3, 3, 'Nicole', 'Doe');\n\n",
          ],
        },
        element: 'store::TestDB',
        type: 'H2',
      },
      name: 'MyConnection',
      package: 'model',
    },
    classifierPath: 'meta::pure::runtime::PackageableConnection',
  },
  {
    path: 'data::RelationalData',
    content: {
      _type: 'dataElement',
      data: {
        _type: 'relationalData',
        tables: [
          {
            columns: [
              {
                value: 'id',
              },
              {
                value: 'firm_id',
              },
              {
                value: 'firstName',
              },
              {
                value: 'lastName',
              },
            ],
            rows: [
              {
                values: '1,1,John,Doe',
              },
              {
                values: '2,1,Nicole,Smith',
              },
              {
                values: '3,2,Time,Smith',
              },
            ],
            tableName: 'PersonTable',
          },
          {
            columns: [
              {
                value: 'id',
              },
              {
                value: 'legal_name',
              },
            ],
            rows: [
              {
                values: '1,Finos',
              },
              {
                values: '2,Apple',
              },
            ],
            tableName: 'FirmTable',
          },
        ],
      },
      name: 'RelationalData',
      package: 'data',
    },
    classifierPath: 'meta::pure::data::DataElement',
  },
];
