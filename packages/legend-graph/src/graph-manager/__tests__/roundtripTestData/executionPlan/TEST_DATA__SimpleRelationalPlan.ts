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

export const TEST_DATA__simpleRelationalPlan = {
  plan: {
    serializer: {
      name: 'pure',
      version: 'vX_X_X',
    },
    templateFunctions: [
      '<#function renderCollection collection separator><#return collection?join(separator)></#function>',
      '<#function collectionSize collection> <#return collection?size?c> </#function>',
    ],
    rootExecutionNode: {
      _type: 'relationalTdsInstantiation',
      resultType: {
        tdsColumns: [
          {
            name: 'Legal Name',
            type: 'String',
            relationalType: 'VARCHAR(204)',
          },
          {
            name: 'Employee Size',
            type: 'Number',
          },
          {
            name: 'Employees/First Name',
            type: 'String',
            relationalType: 'VARCHAR(200)',
          },
          {
            name: 'Employees/Last Name',
            type: 'String',
            relationalType: 'VARCHAR(200)',
          },
        ],
        _type: 'tds',
      },
      executionNodes: [
        {
          sqlQuery:
            'select concat("root".Legal_name, \'_LTD\') as "Legal Name", "firmtable_1".aggCol as "Employee Size", "persontable_1".firstName as "Employees/First Name", "persontable_1".lastName as "Employees/Last Name" from FirmTable as "root" left outer join (select "firmtable_2".id as id, count(*) as aggCol from FirmTable as "firmtable_2" left outer join PersonTable as "persontable_0" on ("persontable_0".firm_id = "firmtable_2".id) group by "firmtable_2".id) as "firmtable_1" on ("root".id = "firmtable_1".id) left outer join PersonTable as "persontable_1" on ("persontable_1".firm_id = "root".id)',
          resultColumns: [
            {
              label: '"Legal Name"',
              dataType: '',
            },
            {
              label: '"Employee Size"',
              dataType: 'INTEGER',
            },
            {
              label: '"Employees/First Name"',
              dataType: 'VARCHAR(200)',
            },
            {
              label: '"Employees/Last Name"',
              dataType: 'VARCHAR(200)',
            },
          ],
          connection: {
            datasourceSpecification: {
              testDataSetupSqls: [
                "Drop table if exists FirmTable;\nDrop table if exists PersonTable;\nCreate Table FirmTable(id INT, Legal_Name VARCHAR(200));\nCreate Table PersonTable(id INT, firm_id INT, lastName VARCHAR(200), firstName VARCHAR(200));\nInsert into FirmTable (id, Legal_Name) values (1, 'FirmX');\nInsert into PersonTable (id, firm_id, lastName, firstName) values (1, 1, 'John', 'Doe');\n",
              ],
              _type: 'h2Local',
            },
            authenticationStrategy: {
              _type: 'h2Default',
            },
            type: 'H2',
            databaseType: 'H2',
            _type: 'RelationalDatabaseConnection',
            element: 'model::Test',
          },
          _type: 'sql',
          resultType: {
            dataType: 'meta::pure::metamodel::type::Any',
            _type: 'dataType',
          },
        },
      ],
    },
    authDependent: false,
  },
  entities: [
    {
      path: 'model::IncType',
      content: {
        _type: 'Enumeration',
        name: 'IncType',
        package: 'model',
        values: [
          {
            value: 'Corp',
          },
          {
            value: 'LLC',
          },
        ],
      },
      classifierPath: 'meta::pure::metamodel::type::Enumeration',
    },
    {
      path: 'model::Firm',
      content: {
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
                      parameters: [
                        {
                          _type: 'var',
                          name: 'this',
                        },
                      ],
                      property: 'legalName',
                    },
                    {
                      _type: 'string',
                      multiplicity: {
                        lowerBound: 1,
                        upperBound: 1,
                      },
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
            multiplicity: {
              lowerBound: 1,
            },
            name: 'employees',
            type: 'model::Person',
          },
          {
            multiplicity: {
              lowerBound: 1,
              upperBound: 1,
            },
            name: 'incType',
            type: 'model::IncType',
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
            returnMultiplicity: {
              lowerBound: 1,
              upperBound: 1,
            },
            returnType: 'Number',
          },
        ],
        superTypes: ['model::LegalEntity'],
      },
      classifierPath: 'meta::pure::metamodel::type::Class',
    },
    {
      path: 'model::LegalEntity',
      content: {
        _type: 'class',
        name: 'LegalEntity',
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
      path: 'model::Test',
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
                    database: 'model::Test',
                    mainTableDb: 'model::Test',
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
                    database: 'model::Test',
                    mainTableDb: 'model::Test',
                    schema: 'default',
                    table: 'FirmTable',
                  },
                  tableAlias: 'FirmTable',
                },
              ],
            },
          },
        ],
        name: 'Test',
        package: 'model',
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
                    name: 'Legal_name',
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
      path: 'model::NewMapping',
      content: {
        _type: 'mapping',
        classMappings: [
          {
            _type: 'relational',
            class: 'model::Firm',
            distinct: false,
            mainTable: {
              _type: 'Table',
              database: 'model::Test',
              mainTableDb: 'model::Test',
              schema: 'default',
              table: 'FirmTable',
            },
            primaryKey: [
              {
                _type: 'column',
                column: 'id',
                table: {
                  _type: 'Table',
                  database: 'model::Test',
                  mainTableDb: 'model::Test',
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
                  _type: 'dynaFunc',
                  funcName: 'concat',
                  parameters: [
                    {
                      _type: 'column',
                      column: 'Legal_name',
                      table: {
                        _type: 'Table',
                        database: 'model::Test',
                        mainTableDb: 'model::Test',
                        schema: 'default',
                        table: 'FirmTable',
                      },
                      tableAlias: 'FirmTable',
                    },
                    {
                      _type: 'literal',
                      value: '_LTD',
                    },
                  ],
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
                      db: 'model::Test',
                      name: 'FirmPerson',
                    },
                  ],
                },
                target: 'model_Person',
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
              database: 'model::Test',
              mainTableDb: 'model::Test',
              schema: 'default',
              table: 'PersonTable',
            },
            primaryKey: [
              {
                _type: 'column',
                column: 'id',
                table: {
                  _type: 'Table',
                  database: 'model::Test',
                  mainTableDb: 'model::Test',
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
                    database: 'model::Test',
                    mainTableDb: 'model::Test',
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
                    database: 'model::Test',
                    mainTableDb: 'model::Test',
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
        enumerationMappings: [],
        includedMappings: [],
        name: 'NewMapping',
        package: 'model',
        tests: [],
      },
      classifierPath: 'meta::pure::mapping::Mapping',
    },
  ],
};
