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
                        function: 'equal',
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
                values: [{ _type: 'string', value: 'Age' }],
              },
            ],
          },
          { _type: 'integer', value: 1000 },
        ],
      },
    ],
    parameters: [
      {
        _type: 'var',
        class: 'Integer',
        multiplicity: { lowerBound: 1, upperBound: 1 },
        name: 'var',
      },
    ],
  },
  mapping: 'model::RelationalMapping',
  model: {
    elements: [
      {
        package: 'model',
        name: 'MyExtension',
        stereotypes: ['important'],
        tags: ['doc'],
      },
      {
        package: 'model',
        name: 'IncType',
        values: [
          { value: 'Corp', stereotypes: [], taggedValues: [] },
          { value: 'LLC', stereotypes: [], taggedValues: [] },
        ],
        stereotypes: [],
        taggedValues: [],
      },
      {
        package: 'model',
        name: 'LegalEntity',
        superTypes: [],
        properties: [
          {
            name: 'legalName',
            type: 'String',
            multiplicity: { lowerBound: 1, upperBound: 1 },
            stereotypes: [],
            taggedValues: [],
          },
        ],
        derivedProperties: [],
        stereotypes: [],
        taggedValues: [],
        constraints: [],
      },
      {
        package: 'model',
        name: 'Firm',
        superTypes: ['model::LegalEntity'],
        properties: [
          {
            name: 'employees',
            type: 'model::Person',
            multiplicity: { lowerBound: 1 },
            stereotypes: [],
            taggedValues: [],
          },
          {
            name: 'incType',
            type: 'model::IncType',
            multiplicity: { lowerBound: 1, upperBound: 1 },
            stereotypes: [],
            taggedValues: [],
          },
          {
            name: 'isApple',
            type: 'Boolean',
            multiplicity: { lowerBound: 1, upperBound: 1 },
            stereotypes: [],
            taggedValues: [],
          },
        ],
        derivedProperties: [
          {
            name: 'employeeSize',
            returnType: 'Number',
            returnMultiplicity: { lowerBound: 1, upperBound: 1 },
            stereotypes: [],
            taggedValues: [],
            body: [
              {
                _type: 'func',
                function: 'count',
                parameters: [
                  {
                    _type: 'property',
                    property: 'employees',
                    parameters: [{ _type: 'var', name: 'this' }],
                  },
                ],
              },
            ],
            parameters: [],
          },
        ],
        stereotypes: [{ profile: 'model::MyExtension', value: 'important' }],
        taggedValues: [
          {
            tag: { profile: 'model::MyExtension', value: 'doc' },
            value: 'This is a model of a firm',
          },
        ],
        constraints: [
          {
            name: 'validName',
            functionDefinition: {
              body: [
                {
                  _type: 'func',
                  function: 'startsWith',
                  parameters: [
                    {
                      _type: 'property',
                      property: 'legalName',
                      parameters: [{ _type: 'var', name: 'this' }],
                    },
                    { _type: 'string', value: '_' },
                  ],
                },
              ],
              parameters: [],
            },
          },
        ],
      },
      {
        package: 'model',
        name: 'Person',
        superTypes: [],
        properties: [
          {
            name: 'firstName',
            type: 'String',
            multiplicity: { lowerBound: 1, upperBound: 1 },
            stereotypes: [],
            taggedValues: [],
          },
          {
            name: 'lastName',
            type: 'String',
            multiplicity: { lowerBound: 1, upperBound: 1 },
            stereotypes: [],
            taggedValues: [],
          },
          {
            name: 'age',
            type: 'Integer',
            multiplicity: { lowerBound: 1, upperBound: 1 },
            stereotypes: [],
            taggedValues: [],
          },
        ],
        derivedProperties: [
          {
            name: 'fullName',
            returnType: 'String',
            returnMultiplicity: { lowerBound: 1, upperBound: 1 },
            stereotypes: [],
            taggedValues: [],
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
                        property: 'firstName',
                        parameters: [{ _type: 'var', name: 'this' }],
                      },
                      { _type: 'string', value: ' ' },
                      {
                        _type: 'property',
                        property: 'lastName',
                        parameters: [{ _type: 'var', name: 'this' }],
                      },
                    ],
                  },
                ],
              },
            ],
            parameters: [],
          },
        ],
        stereotypes: [],
        taggedValues: [],
        constraints: [],
      },
      {
        package: 'model',
        name: 'MyDatabase',
        includedStores: [],
        schemas: [
          {
            name: 'default',
            tables: [
              {
                name: 'FirmTable',
                columns: [
                  { name: 'id', nullable: false, type: {} },
                  { name: 'Legal_name', nullable: true, type: { size: 200 } },
                  { name: 'Inc', nullable: true, type: { size: 200 } },
                ],
                primaryKey: ['id'],
                milestoning: [],
              },
              {
                name: 'PersonTable',
                columns: [
                  { name: 'id', nullable: false, type: {} },
                  { name: 'firm_id', nullable: true, type: {} },
                  { name: 'firstName', nullable: true, type: { size: 200 } },
                  { name: 'lastName', nullable: true, type: { size: 200 } },
                  { name: 'age', nullable: true, type: {} },
                ],
                primaryKey: ['id'],
                milestoning: [],
              },
            ],
            views: [],
          },
        ],
        joins: [
          {
            name: 'FirmPerson',
            operation: {
              funcName: 'equal',
              parameters: [
                {
                  table: {
                    table: 'PersonTable',
                    schema: 'default',
                    database: 'model::MyDatabase',
                    mainTableDb: 'model::MyDatabase',
                  },
                  tableAlias: 'PersonTable',
                  column: 'firm_id',
                },
                {
                  table: {
                    table: 'FirmTable',
                    schema: 'default',
                    database: 'model::MyDatabase',
                    mainTableDb: 'model::MyDatabase',
                  },
                  tableAlias: 'FirmTable',
                  column: 'id',
                },
              ],
            },
          },
        ],
        filters: [],
      },
      {
        package: 'model',
        name: 'RelationalMapping',
        includedMappings: [],
        enumerationMappings: [
          {
            enumeration: 'model::IncType',
            enumValueMappings: [
              {
                enumValue: 'Corp',
                sourceValues: [{ value: 'Corp' }, { value: 'CORP' }],
              },
              { enumValue: 'LLC', sourceValues: [{ value: 'LLC' }] },
            ],
          },
        ],
        classMappings: [
          {
            class: 'model::Firm',
            root: true,
            primaryKey: [
              {
                table: {
                  table: 'FirmTable',
                  schema: 'default',
                  database: 'model::MyDatabase',
                  mainTableDb: 'model::MyDatabase',
                },
                tableAlias: 'FirmTable',
                column: 'id',
              },
            ],
            propertyMappings: [
              {
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
                property: { class: 'model::Firm', property: 'employees' },
                target: 'model_Person',
                relationalOperation: {
                  _type: 'elemtWithJoins',
                  joins: [{ db: 'model::MyDatabase', name: 'FirmPerson' }],
                },
              },
              {
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
                property: { class: 'model::Firm', property: 'incType' },
                enumMappingId: 'model_IncType',
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
            mainTable: {
              table: 'FirmTable',
              schema: 'default',
              database: 'model::MyDatabase',
              mainTableDb: 'model::MyDatabase',
            },
            distinct: false,
            groupBy: [],
          },
          {
            class: 'model::Person',
            root: true,
            primaryKey: [
              {
                table: {
                  table: 'PersonTable',
                  schema: 'default',
                  database: 'model::MyDatabase',
                  mainTableDb: 'model::MyDatabase',
                },
                tableAlias: 'PersonTable',
                column: 'id',
              },
            ],
            propertyMappings: [
              {
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
            mainTable: {
              table: 'PersonTable',
              schema: 'default',
              database: 'model::MyDatabase',
              mainTableDb: 'model::MyDatabase',
            },
            distinct: false,
            groupBy: [],
          },
        ],
        associationMappings: [],
        tests: [],
        testSuites: [],
      },
      {
        package: 'model',
        name: 'Runtime',
        runtimeValue: {
          mappings: [{ type: 'MAPPING', path: 'model::RelationalMapping' }],
          connections: [
            {
              store: { type: 'STORE', path: 'model::MyDatabase' },
              storeConnections: [
                {
                  id: 'my_connection',
                  connection: { connection: 'model::MyConnection' },
                },
              ],
            },
          ],
        },
      },
      {
        package: 'model',
        name: 'MyConnection',
        connectionValue: {
          store: 'model::MyDatabase',
          type: 'H2',
          databaseType: 'H2',
          postProcessorWithParameter: [],
          datasourceSpecification: {
            testDataSetupSqls: [
              "Drop table if exists FirmTable;\nDrop table if exists PersonTable;\nCreate Table FirmTable(id INT, Legal_Name VARCHAR(200), Inc VARCHAR(200));\nCreate Table PersonTable(id INT, firm_id INT, lastName VARCHAR(200), firstName VARCHAR(200), age INT);\nInsert into FirmTable (id, Legal_Name, Inc) values (1, 'Finos', 'CORP');\nInsert into FirmTable (id, Legal_Name, Inc) values (2, 'Apple', 'Corp');\nInsert into FirmTable (id, Legal_Name, Inc) values (3, 'GS', 'Corp');\nInsert into FirmTable (id, Legal_Name, Inc) values (4, 'Google', 'Corp');\nInsert into FirmTable (id, Legal_Name, Inc) values (5, 'Alphabet', 'LLC');\nInsert into PersonTable (id, firm_id, lastName, firstName, age) values (1, 3, 'X1', 'Mauricio', 10);\nInsert into PersonTable (id, firm_id, lastName, firstName, age) values (2, 3, 'X2', 'An', 20);\nInsert into PersonTable (id, firm_id, lastName, firstName, age) values (3, 3, 'X3', 'Anne', 30);\nInsert into PersonTable (id, firm_id, lastName, firstName, age) values (4, 3, 'X4', 'Gayathri', 40);\nInsert into PersonTable (id, firm_id, lastName, firstName, age) values (5, 3, 'X5', 'Yannan', 50);\nInsert into PersonTable (id, firm_id, lastName, firstName, age) values (6, 3, 'X6', 'Dave', 60);\nInsert into PersonTable (id, firm_id, lastName, firstName, age) values (7, 3, 'X7', 'Mo', 70);\nInsert into PersonTable (id, firm_id, lastName, firstName, age) values (8, 3, 'X9', 'Teddy', 80);\nInsert into PersonTable (id, firm_id, lastName, firstName, age) values (9, 2, 'X8', 'Teddy', 90);\nInsert into PersonTable (id, firm_id, lastName, firstName, age) values (10, 2, 'X8', 'Teddy', 100);\n\n",
            ],
          },
          authenticationStrategy: {},
          postProcessors: [],
        },
      },
    ],
  },
  runtime: { runtime: 'model::Runtime' },
  context: { queryTimeOutInSeconds: null, enableConstraints: true },
  parameterValues: [{ name: 'var', value: { _type: 'integer', value: 20 } }],
};

export const TEST_DATA_QueryExecution_MappingAnalysisResult = {
  mappedEntities: [
    {
      path: 'model::Firm',
      properties: [
        { _type: 'entity', entityPath: 'model::Person', name: 'employees' },
        { _type: 'enum', enumPath: 'model::IncType', name: 'incType' },
        { _type: 'MappedProperty', name: 'isApple' },
        { _type: 'MappedProperty', name: 'legalName' },
        { _type: 'MappedProperty', name: 'employeeSizes' },
      ],
    },
    {
      path: 'model::Person',
      properties: [
        { _type: 'MappedProperty', name: 'age' },
        { _type: 'MappedProperty', name: 'firstName' },
        { _type: 'MappedProperty', name: 'lastName' },
        { _type: 'MappedProperty', name: 'fullName' },
      ],
    },
  ],
};
