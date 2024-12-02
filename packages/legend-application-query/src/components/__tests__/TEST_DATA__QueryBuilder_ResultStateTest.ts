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

export const TEST_DATA__result = {
  builder: {
    _type: 'tdsBuilder',
    columns: [
      {
        name: 'Employees/First Name',
        genericType: {
          rawType: {
            _type: 'packageableType',
            fullPath: 'String',
          },
        },
        relationalType: 'VARCHAR(200)',
      },
      {
        name: 'Employees/Last Name',
        genericType: {
          rawType: {
            _type: 'packageableType',
            fullPath: 'String',
          },
        },
        relationalType: 'VARCHAR(200)',
      },
      {
        name: 'Legal Namer',
        genericType: {
          rawType: {
            _type: 'packageableType',
            fullPath: 'String',
          },
        },
        relationalType: 'VARCHAR(200)',
      },
    ],
  },
  activities: [
    {
      _type: 'relational',
      sql: 'select top 1000 "persontable_0".firstName as "Employees/First Name", "persontable_0".lastName as "Employees/Last Name", "root".legal_name as "Legal Namer" from FirmTable as "root" left outer join PersonTable as "persontable_0" on ("persontable_0".firm_id = "root".id)',
    },
  ],
  result: {
    columns: ['Employees/First Name', 'Employees/Last Name', 'Legal Namer'],
    rows: [
      { values: ['Doe', 'John', 'FirmA'] },
      { values: ['Smith', 'Tim', 'Apple'] },
    ],
  },
};

export const TEST_DATA__simpleProjectionQuery = {
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
            {
              _type: 'strictDate',
              value: '2021-11-12',
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
              value: 'Employees/First Name',
            },
            {
              _type: 'string',
              value: 'Employees/Last Name',
            },
            {
              _type: 'string',
              value: 'Legal Namer',
            },
          ],
        },
      ],
    },
  ],
  parameters: [],
};

export const TEST_DATA__UnSupportedSimpleProjectionQuery = {
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
              _type: 'func',
              function: 'col',
              parameters: [
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
                  _type: 'string',
                  value: 'Employees/First Name',
                },
              ],
            },
            {
              _type: 'func',
              function: 'col',
              parameters: [
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
                  _type: 'string',
                  value: 'Employees/Last Name',
                },
              ],
            },
            {
              _type: 'func',
              function: 'col',
              parameters: [
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
                {
                  _type: 'string',
                  value: 'Legal Name',
                },
              ],
            },
          ],
        },
      ],
    },
  ],
  parameters: [
    {
      _type: 'var',
      class: 'StrictDate',
      multiplicity: {
        lowerBound: 1,
        upperBound: 1,
      },
      name: 'var_1',
    },
  ],
};

export const TEST_DATA__ResultState_entities = [
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
      stereotypes: [
        {
          profile: 'meta::pure::profiles::temporal',
          value: 'businesstemporal',
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
      stereotypes: [
        {
          profile: 'meta::pure::profiles::temporal',
          value: 'businesstemporal',
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
      tests: [],
    },
    classifierPath: 'meta::pure::mapping::Mapping',
  },
  {
    path: 'service::SimpleRelationalPassWithSpecialEmbeddedData',
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
                    {
                      _type: 'strictDate',
                      value: '2021-11-12',
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
                      value: 'Employees/First Name',
                    },
                    {
                      _type: 'string',
                      value: 'Employees/Last Name',
                    },
                    {
                      _type: 'string',
                      value: 'Legal Name',
                    },
                  ],
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
      name: 'SimpleRelationalPassWithSpecialEmbeddedData',
      owners: [],
      package: 'service',
      pattern: '/d2c48a9c-70fa-46e3-8173-c355e774004f',
      testSuites: [
        {
          _type: 'serviceTestSuite',
          id: 'testSuite1',
          testData: {
            connectionsTestData: [
              {
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
                      values: 'id,legal_name\n1,Finos\n2,Apple\n',
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
                    data: '[\n  {\n    "Employees/First Name": "John",\n    "Employees/Last Name": "Doe",\n    "Legal Name": "Finos"\n  },\n  {\n    "Employees/First Name": "Nicole",\n    "Employees/Last Name": "Smith",\n    "Legal Name": "Finos"\n  },\n  {\n    "Employees/First Name": "Time",\n    "Employees/Last Name": "Smith",\n    "Legal Name": "Apple"\n  }\n]',
                  },
                  id: 'shouldPass',
                },
                {
                  _type: 'equalToJson',
                  expected: {
                    _type: 'externalFormat',
                    contentType: 'application/json',
                    data: '[\n  {\n    "Employees/First Name": "John",\n    "Employees/Last Name": "Doe",\n    "Legal Name": "Fino"\n  },\n  {\n    "Employees/First Name": "Nicole",\n    "Employees/Last Name": "Smith",\n    "Legal Name": "Finos"\n  },\n  {\n    "Employees/First Name": "Time",\n    "Employees/Last Name": "Smith",\n    "Legal Name": "Apple"\n  }\n]',
                  },
                  id: 'shouldFail',
                },
              ],
              id: 'test1',
              keys: [],
              serializationFormat: 'PURE_TDSOBJECT',
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
            values: 'id,legal_name\n1,Finos\n2,Apple\n',
          },
        ],
      },
      name: 'RelationalData',
      package: 'data',
    },
    classifierPath: 'meta::pure::data::DataElement',
  },
];

export const TEST_DATA__modelCoverageAnalysisResult = {
  mappedEntities: [
    {
      path: 'model::Firm',
      properties: [
        { _type: 'entity', entityPath: 'model::Person', name: 'employees' },
        { _type: 'MappedProperty', name: 'legalName' },
      ],
    },
    {
      path: 'model::Person',
      properties: [
        { _type: 'MappedProperty', name: 'firstName' },
        { _type: 'MappedProperty', name: 'lastName' },
      ],
    },
    {
      path: 'model_Person_milestoning',
      properties: [
        { _type: 'MappedProperty', name: 'from' },
        { _type: 'MappedProperty', name: 'thru' },
      ],
    },
    {
      path: 'model_Firm_milestoning',
      properties: [
        { _type: 'MappedProperty', name: 'from' },
        { _type: 'MappedProperty', name: 'thru' },
      ],
    },
  ],
};
