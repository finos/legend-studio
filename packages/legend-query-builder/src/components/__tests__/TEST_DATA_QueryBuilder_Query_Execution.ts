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

export const TEST_DATA_QueryExecution_ExecutionInput = {
  clientVersion: 'vX_X_X',
  function: {
    _type: 'lambda',
    body: [
      {
        _type: 'func',
        function: 'take',
        parameters: [
          {
            _type: 'func',
            function: 'project',
            parameters: [
              {
                _type: 'func',
                function: 'filter',
                parameters: [
                  {
                    _type: 'func',
                    function: 'getAll',
                    parameters: [
                      {
                        _type: 'packageableElementPtr',
                        fullPath: 'model::Person',
                      },
                    ],
                  },
                  {
                    _type: 'lambda',
                    body: [
                      {
                        _type: 'func',
                        function: 'in',
                        parameters: [
                          {
                            _type: 'property',
                            parameters: [{ _type: 'var', name: 'x' }],
                            property: 'age',
                          },
                          { _type: 'var', name: 'var' },
                        ],
                      },
                    ],
                    parameters: [{ _type: 'var', name: 'x' }],
                  },
                ],
              },
              {
                _type: 'collection',
                multiplicity: { lowerBound: 1, upperBound: 1 },
                values: [
                  {
                    _type: 'lambda',
                    body: [
                      {
                        _type: 'property',
                        parameters: [{ _type: 'var', name: 'x' }],
                        property: 'age',
                      },
                    ],
                    parameters: [{ _type: 'var', name: 'x' }],
                  },
                ],
              },
              {
                _type: 'collection',
                multiplicity: { lowerBound: 1, upperBound: 1 },
                values: [
                  {
                    _type: 'string',
                    multiplicity: { lowerBound: 1, upperBound: 1 },
                    values: ['Age'],
                  },
                ],
              },
            ],
          },
          {
            _type: 'integer',
            multiplicity: { lowerBound: 1, upperBound: 1 },
            values: [1000],
          },
        ],
      },
    ],
    parameters: [
      {
        _type: 'var',
        class: 'Integer',
        multiplicity: { lowerBound: 0, upperBound: 1 },
        name: 'var',
      },
    ],
  },
  mapping: 'model::RelationalMapping',
  model: {
    _type: 'data',
    elements: [
      {
        _type: 'profile',
        name: 'MyExtension',
        package: 'model',
        stereotypes: ['important'],
        tags: ['doc'],
      },
      {
        _type: 'Enumeration',
        name: 'IncType',
        package: 'model',
        values: [{ value: 'Corp' }, { value: 'LLC' }],
      },
      {
        _type: 'class',
        name: 'LegalEntity',
        package: 'model',
        properties: [
          {
            multiplicity: { lowerBound: 1, upperBound: 1 },
            name: 'legalName',
            type: 'String',
          },
        ],
      },
      {
        _type: 'class',
        constraints: [
          {
            functionDefinition: {
              _type: 'lambda',
              body: [
                {
                  _type: 'func',
                  function: 'startsWith',
                  parameters: [
                    {
                      _type: 'property',
                      parameters: [{ _type: 'var', name: 'this' }],
                      property: 'legalName',
                    },
                    {
                      _type: 'string',
                      multiplicity: { lowerBound: 1, upperBound: 1 },
                      values: ['_'],
                    },
                  ],
                },
              ],
              parameters: [],
            },
            name: 'validName',
          },
        ],
        name: 'Firm',
        package: 'model',
        properties: [
          {
            multiplicity: { lowerBound: 1 },
            name: 'employees',
            type: 'model::Person',
          },
          {
            multiplicity: { lowerBound: 1, upperBound: 1 },
            name: 'incType',
            type: 'model::IncType',
          },
          {
            multiplicity: { lowerBound: 1, upperBound: 1 },
            name: 'isApple',
            type: 'Boolean',
          },
        ],
        qualifiedProperties: [
          {
            body: [
              {
                _type: 'func',
                function: 'count',
                parameters: [
                  {
                    _type: 'property',
                    parameters: [
                      {
                        _type: 'var',
                        name: 'this',
                      },
                    ],
                    property: 'employees',
                  },
                ],
              },
            ],
            name: 'employeeSize',
            parameters: [],
            returnMultiplicity: { lowerBound: 1, upperBound: 1 },
            returnType: 'Number',
          },
        ],
        stereotypes: [{ profile: 'model::MyExtension', value: 'important' }],
        superTypes: ['model::LegalEntity'],
        taggedValues: [
          {
            tag: { profile: 'model::MyExtension', value: 'doc' },
            value: 'This is a model of a firm',
          },
        ],
      },
      {
        _type: 'class',
        name: 'Person',
        package: 'model',
        properties: [
          {
            multiplicity: { lowerBound: 1, upperBound: 1 },
            name: 'firstName',
            type: 'String',
          },
          {
            multiplicity: { lowerBound: 1, upperBound: 1 },
            name: 'lastName',
            type: 'String',
          },
          {
            multiplicity: { lowerBound: 1, upperBound: 1 },
            name: 'age',
            type: 'Integer',
          },
        ],
        qualifiedProperties: [
          {
            body: [
              {
                _type: 'func',
                function: 'plus',
                parameters: [
                  {
                    _type: 'collection',
                    multiplicity: { lowerBound: 3, upperBound: 3 },
                    values: [
                      {
                        _type: 'property',
                        parameters: [
                          {
                            _type: 'var',
                            name: 'this',
                          },
                        ],
                        property: 'firstName',
                      },
                      {
                        _type: 'string',
                        multiplicity: { lowerBound: 1, upperBound: 1 },
                        values: [' '],
                      },
                      {
                        _type: 'property',
                        parameters: [
                          {
                            _type: 'var',
                            name: 'this',
                          },
                        ],
                        property: 'lastName',
                      },
                    ],
                  },
                ],
              },
            ],
            name: 'fullName',
            parameters: [],
            returnMultiplicity: { lowerBound: 1, upperBound: 1 },
            returnType: 'String',
          },
        ],
      },
      {
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
                    database: 'model::MyDatabase',
                    mainTableDb: 'model::MyDatabase',
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
                    database: 'model::MyDatabase',
                    mainTableDb: 'model::MyDatabase',
                    schema: 'default',
                    table: 'FirmTable',
                  },
                  tableAlias: 'FirmTable',
                },
              ],
            },
          },
        ],
        name: 'MyDatabase',
        package: 'model',
        schemas: [
          {
            name: 'default',
            tables: [
              {
                columns: [
                  { name: 'id', nullable: false, type: { _type: 'Integer' } },
                  {
                    name: 'Legal_name',
                    nullable: true,
                    type: { _type: 'Varchar', size: 200 },
                  },
                  {
                    name: 'Inc',
                    nullable: true,
                    type: { _type: 'Varchar', size: 200 },
                  },
                ],
                name: 'FirmTable',
                primaryKey: ['id'],
              },
              {
                columns: [
                  { name: 'id', nullable: false, type: { _type: 'Integer' } },
                  {
                    name: 'firm_id',
                    nullable: true,
                    type: { _type: 'Integer' },
                  },
                  {
                    name: 'firstName',
                    nullable: true,
                    type: { _type: 'Varchar', size: 200 },
                  },
                  {
                    name: 'lastName',
                    nullable: true,
                    type: { _type: 'Varchar', size: 200 },
                  },
                  { name: 'age', nullable: true, type: { _type: 'Integer' } },
                ],
                name: 'PersonTable',
                primaryKey: ['id'],
              },
            ],
            views: [],
          },
        ],
      },
      {
        _type: 'mapping',
        classMappings: [
          {
            _type: 'relational',
            class: 'model::Firm',
            distinct: false,
            mainTable: {
              _type: 'Table',
              database: 'model::MyDatabase',
              mainTableDb: 'model::MyDatabase',
              schema: 'default',
              table: 'FirmTable',
            },
            primaryKey: [
              {
                _type: 'column',
                column: 'id',
                table: {
                  _type: 'Table',
                  database: 'model::MyDatabase',
                  mainTableDb: 'model::MyDatabase',
                  schema: 'default',
                  table: 'FirmTable',
                },
                tableAlias: 'FirmTable',
              },
            ],
            propertyMappings: [
              {
                _type: 'relationalPropertyMapping',
                property: { class: 'model::Firm', property: 'legalName' },
                relationalOperation: {
                  _type: 'dynaFunc',
                  funcName: 'concat',
                  parameters: [
                    {
                      _type: 'column',
                      column: 'Legal_name',
                      table: {
                        _type: 'Table',
                        database: 'model::MyDatabase',
                        mainTableDb: 'model::MyDatabase',
                        schema: 'default',
                        table: 'FirmTable',
                      },
                      tableAlias: 'FirmTable',
                    },
                    { _type: 'literal', value: '_LTD' },
                  ],
                },
              },
              {
                _type: 'relationalPropertyMapping',
                property: { class: 'model::Firm', property: 'employees' },
                relationalOperation: {
                  _type: 'elemtWithJoins',
                  joins: [{ db: 'model::MyDatabase', name: 'FirmPerson' }],
                },
                target: 'model_Person',
              },
              {
                _type: 'relationalPropertyMapping',
                property: { class: 'model::Firm', property: 'isApple' },
                relationalOperation: {
                  _type: 'dynaFunc',
                  funcName: 'case',
                  parameters: [
                    {
                      _type: 'dynaFunc',
                      funcName: 'equal',
                      parameters: [
                        {
                          _type: 'column',
                          column: 'Legal_name',
                          table: {
                            _type: 'Table',
                            database: 'model::MyDatabase',
                            mainTableDb: 'model::MyDatabase',
                            schema: 'default',
                            table: 'FirmTable',
                          },
                          tableAlias: 'FirmTable',
                        },
                        { _type: 'literal', value: 'Apple' },
                      ],
                    },
                    { _type: 'literal', value: 'true' },
                    { _type: 'literal', value: 'false' },
                  ],
                },
              },
              {
                _type: 'relationalPropertyMapping',
                enumMappingId: 'model_IncType',
                property: { class: 'model::Firm', property: 'incType' },
                relationalOperation: {
                  _type: 'column',
                  column: 'Inc',
                  table: {
                    _type: 'Table',
                    database: 'model::MyDatabase',
                    mainTableDb: 'model::MyDatabase',
                    schema: 'default',
                    table: 'FirmTable',
                  },
                  tableAlias: 'FirmTable',
                },
              },
            ],
            root: true,
          },
          {
            _type: 'relational',
            class: 'model::Person',
            distinct: false,
            mainTable: {
              _type: 'Table',
              database: 'model::MyDatabase',
              mainTableDb: 'model::MyDatabase',
              schema: 'default',
              table: 'PersonTable',
            },
            primaryKey: [
              {
                _type: 'column',
                column: 'id',
                table: {
                  _type: 'Table',
                  database: 'model::MyDatabase',
                  mainTableDb: 'model::MyDatabase',
                  schema: 'default',
                  table: 'PersonTable',
                },
                tableAlias: 'PersonTable',
              },
            ],
            propertyMappings: [
              {
                _type: 'relationalPropertyMapping',
                property: { class: 'model::Person', property: 'firstName' },
                relationalOperation: {
                  _type: 'column',
                  column: 'firstName',
                  table: {
                    _type: 'Table',
                    database: 'model::MyDatabase',
                    mainTableDb: 'model::MyDatabase',
                    schema: 'default',
                    table: 'PersonTable',
                  },
                  tableAlias: 'PersonTable',
                },
              },
              {
                _type: 'relationalPropertyMapping',
                property: { class: 'model::Person', property: 'lastName' },
                relationalOperation: {
                  _type: 'column',
                  column: 'lastName',
                  table: {
                    _type: 'Table',
                    database: 'model::MyDatabase',
                    mainTableDb: 'model::MyDatabase',
                    schema: 'default',
                    table: 'PersonTable',
                  },
                  tableAlias: 'PersonTable',
                },
              },
              {
                _type: 'relationalPropertyMapping',
                property: { class: 'model::Person', property: 'age' },
                relationalOperation: {
                  _type: 'column',
                  column: 'age',
                  table: {
                    _type: 'Table',
                    database: 'model::MyDatabase',
                    mainTableDb: 'model::MyDatabase',
                    schema: 'default',
                    table: 'PersonTable',
                  },
                  tableAlias: 'PersonTable',
                },
              },
            ],
            root: true,
          },
        ],
        enumerationMappings: [
          {
            enumValueMappings: [
              {
                enumValue: 'Corp',
                sourceValues: [
                  { _type: 'stringSourceValue', value: 'Corp' },
                  { _type: 'stringSourceValue', value: 'CORP' },
                ],
              },
              {
                enumValue: 'LLC',
                sourceValues: [{ _type: 'stringSourceValue', value: 'LLC' }],
              },
            ],
            enumeration: 'model::IncType',
          },
        ],
        includedMappings: [],
        name: 'RelationalMapping',
        package: 'model',
        tests: [],
      },
      {
        _type: 'runtime',
        name: 'Runtime',
        package: 'model',
        runtimeValue: {
          _type: 'engineRuntime',
          connections: [
            {
              store: { path: 'model::MyDatabase', type: 'STORE' },
              storeConnections: [
                {
                  connection: {
                    _type: 'connectionPointer',
                    connection: 'model::MyConnection',
                  },
                  id: 'my_connection',
                },
              ],
            },
          ],
          mappings: [{ path: 'model::RelationalMapping', type: 'MAPPING' }],
        },
      },
      {
        _type: 'connection',
        connectionValue: {
          _type: 'RelationalDatabaseConnection',
          authenticationStrategy: { _type: 'h2Default' },
          databaseType: 'H2',
          datasourceSpecification: {
            _type: 'h2Local',
            testDataSetupSqls: [
              "Drop table if exists FirmTable;\nDrop table if exists PersonTable;\nCreate Table FirmTable(id INT, Legal_Name VARCHAR(200), Inc VARCHAR(200));\nCreate Table PersonTable(id INT, firm_id INT, lastName VARCHAR(200), firstName VARCHAR(200), age INT);\nInsert into FirmTable (id, Legal_Name, Inc) values (1, 'Finos', 'CORP');\nInsert into FirmTable (id, Legal_Name, Inc) values (2, 'Apple', 'Corp');\nInsert into FirmTable (id, Legal_Name, Inc) values (3, 'GS', 'Corp');\nInsert into FirmTable (id, Legal_Name, Inc) values (4, 'Google', 'Corp');\nInsert into FirmTable (id, Legal_Name, Inc) values (5, 'Alphabet', 'LLC');\nInsert into PersonTable (id, firm_id, lastName, firstName, age) values (1, 3, 'X1', 'Mauricio', 10);\nInsert into PersonTable (id, firm_id, lastName, firstName, age) values (2, 3, 'X2', 'An', 20);\nInsert into PersonTable (id, firm_id, lastName, firstName, age) values (3, 3, 'X3', 'Anne', 30);\nInsert into PersonTable (id, firm_id, lastName, firstName, age) values (4, 3, 'X4', 'Gayathri', 40);\nInsert into PersonTable (id, firm_id, lastName, firstName, age) values (5, 3, 'X5', 'Yannan', 50);\nInsert into PersonTable (id, firm_id, lastName, firstName, age) values (6, 3, 'X6', 'Dave', 60);\nInsert into PersonTable (id, firm_id, lastName, firstName, age) values (7, 3, 'X7', 'Mo', 70);\nInsert into PersonTable (id, firm_id, lastName, firstName, age) values (8, 3, 'X9', 'Teddy', 80);\nInsert into PersonTable (id, firm_id, lastName, firstName, age) values (9, 2, 'X8', 'Teddy', 90);\nInsert into PersonTable (id, firm_id, lastName, firstName, age) values (10, 2, 'X8', 'Teddy', 100);\n\n",
            ],
          },
          element: 'model::MyDatabase',
          type: 'H2',
        },
        name: 'MyConnection',
        package: 'model',
      },
    ],
  },
  runtime: { _type: 'runtimePointer', runtime: 'model::Runtime' },
  context: {
    _type: 'BaseExecutionContext',
    queryTimeOutInSeconds: null,
    enableConstraints: true,
  },
  parameterValues: [
    {
      name: 'var',
      value: {
        _type: 'integer',
        multiplicity: { lowerBound: 0, upperBound: 1 },
        values: [20],
      },
    },
  ],
};

export const TEST_DATA_QueryExecution_ExecutionResult = {
  builder: {
    _type: 'tdsBuilder',
    columns: [{ name: 'Age', type: 'Integer', relationalType: 'INTEGER' }],
  },
  activities: [
    {
      _type: 'relational',
      sql: 'select top 1000 "root".age as "Age" from PersonTable as "root" where "root".age in (20)',
    },
  ],
  result: { columns: ['Age'], rows: [{ values: [20] }] },
};
