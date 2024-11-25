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

export const TEST_DATA__dependencyMainGraphEntities = [
  {
    path: 'model::MainAssociation',
    content: {
      _type: 'association',
      name: 'MainAssociation',
      properties: [
        {
          name: 'mainFirm',
          type: 'model::Firm',
          multiplicity: { lowerBound: 1, upperBound: 1 },
          stereotypes: [],
          taggedValues: [],
        },
        {
          name: 'mainPerson',
          genericType: {
            rawType: {
              _type: 'packageableType',
              fullPath: 'model::Person',
            },
            typeArguments: [],
            typeVariableValues: [],
          },
          multiplicity: { lowerBound: 1, upperBound: 1 },
          stereotypes: [],
          taggedValues: [],
        },
      ],
      originalMilestonedProperties: [],
      qualifiedProperties: [],
      stereotypes: [],
      taggedValues: [],
      package: 'model',
    },
    classifierPath: 'meta::pure::metamodel::relationship::Association',
  },
];

export const TEST_DATA__dependencyMainGraphEntities2 = [
  {
    path: 'model::MainAssociation',
    content: {
      _type: 'association',
      name: 'MainAssociation',
      properties: [
        {
          name: 'mainFirm',
          type: 'model::Firm',
          multiplicity: { lowerBound: 1, upperBound: 1 },
          stereotypes: [],
          taggedValues: [],
        },
        {
          name: 'mainPerson',
          genericType: {
            rawType: {
              _type: 'packageableType',
              fullPath: 'model::Person',
            },
            typeArguments: [],
            typeVariableValues: [],
          },
          multiplicity: { lowerBound: 1, upperBound: 1 },
          stereotypes: [],
          taggedValues: [],
        },
      ],
      originalMilestonedProperties: [],
      qualifiedProperties: [],
      stereotypes: [],
      taggedValues: [],
      package: 'model',
    },
    classifierPath: 'meta::pure::metamodel::relationship::Association',
  },
  {
    path: 'model::MainAssociation2',
    content: {
      _type: 'association',
      name: 'MainAssociation2',
      properties: [
        {
          name: 'mainFirm2',
          type: 'model::Firm',
          multiplicity: { lowerBound: 1, upperBound: 1 },
          stereotypes: [],
          taggedValues: [],
        },
        {
          name: 'mainPerson2',
          genericType: {
            rawType: {
              _type: 'packageableType',
              fullPath: 'model::Person',
            },
            typeArguments: [],
            typeVariableValues: [],
          },
          multiplicity: { lowerBound: 1, upperBound: 1 },
          stereotypes: [],
          taggedValues: [],
        },
      ],
      originalMilestonedProperties: [],
      qualifiedProperties: [],
      stereotypes: [],
      taggedValues: [],
      package: 'model',
    },
    classifierPath: 'meta::pure::metamodel::relationship::Association',
  },
];

export const TEST_DATA__projectsData = [
  {
    groupId: 'org.finos.legend.query',
    artifactId: 'legend-query-core-team',
    id: '62e7e9a2e6a91279c49aef42',
    projectId: 'UAT-29851090',
    versions: ['1.0.0', '2.0.0', '3.0.0', '4.0.0', '4.1.0', '5.0.0'],
    dependencies: [],
    properties: [],
    latestVersion: '5.0.0',
  },
];

export const TEST_DATA__projectVersionDependencyEntities = [
  {
    groupId: 'org.finos.legend.query',
    artifactId: 'legend-query-core-team',
    versionId: '1.0.0',
    versionedEntity: false,
    entities: [
      {
        path: 'model::MyService',
        classifierPath: 'meta::legend::service::metamodel::Service',
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
                          fullPath: 'model::Person',
                        },
                      ],
                    },
                    {
                      _type: 'collection',
                      multiplicity: { lowerBound: 2, upperBound: 2 },
                      values: [
                        {
                          _type: 'lambda',
                          body: [
                            {
                              _type: 'property',
                              parameters: [{ _type: 'var', name: 'x' }],
                              property: 'firstName',
                            },
                          ],
                          parameters: [{ _type: 'var', name: 'x' }],
                        },
                        {
                          _type: 'lambda',
                          body: [
                            {
                              _type: 'property',
                              parameters: [{ _type: 'var', name: 'x' }],
                              property: 'lastName',
                            },
                          ],
                          parameters: [{ _type: 'var', name: 'x' }],
                        },
                      ],
                    },
                    {
                      _type: 'collection',
                      multiplicity: { lowerBound: 2, upperBound: 2 },
                      values: [
                        {
                          _type: 'string',
                          multiplicity: { lowerBound: 1, upperBound: 1 },
                          values: ['First Name'],
                        },
                        {
                          _type: 'string',
                          multiplicity: { lowerBound: 1, upperBound: 1 },
                          values: ['Last Name'],
                        },
                      ],
                    },
                  ],
                },
              ],
              parameters: [],
            },
            mapping: 'model::NewMapping',
            runtime: {
              _type: 'runtimePointer',
              runtime: 'model::Runtime',
            },
          },
          name: 'MyService',
          owners: [],
          package: 'model',
          pattern: '/d2c48a9c-70fa-46e3-8173-c355e774004f',
          stereotypes: [],
          taggedValues: [],
        },
      },
      {
        path: 'model::Person',
        classifierPath: 'meta::pure::metamodel::type::Class',
        content: {
          _type: 'class',
          constraints: [],
          name: 'Person',
          originalMilestonedProperties: [],
          package: 'model',
          properties: [
            {
              multiplicity: { lowerBound: 1, upperBound: 1 },
              name: 'firstName',
              stereotypes: [],
              taggedValues: [],
              genericType: {
                rawType: {
                  _type: 'packageableType',
                  fullPath: 'String',
                },
                typeArguments: [],
                typeVariableValues: [],
              },
            },
            {
              multiplicity: { lowerBound: 1, upperBound: 1 },
              name: 'lastName',
              stereotypes: [],
              taggedValues: [],
              genericType: {
                rawType: {
                  _type: 'packageableType',
                  fullPath: 'String',
                },
                typeArguments: [],
                typeVariableValues: [],
              },
            },
          ],
          qualifiedProperties: [],
          stereotypes: [],
          superTypes: [],
          taggedValues: [],
        },
      },
      {
        path: 'model::MyC',
        classifierPath: 'meta::pure::runtime::PackageableConnection',
        content: {
          _type: 'connection',
          connectionValue: {
            _type: 'RelationalDatabaseConnection',
            authenticationStrategy: { _type: 'h2Default' },
            databaseType: 'H2',
            datasourceSpecification: {
              _type: 'h2Local',
              testDataSetupSqls: [
                "Drop table if exists FirmTable;\nDrop table if exists PersonTable;\nCreate Table FirmTable(id INT, Legal_Name VARCHAR(200));\nCreate Table PersonTable(id INT, firm_id INT, lastName VARCHAR(200), firstName VARCHAR(200));\nInsert into FirmTable (id, Legal_Name) values (1, 'FirmA');\nInsert into FirmTable (id, Legal_Name) values (2, 'Apple');\nInsert into PersonTable (id, firm_id, lastName, firstName) values (1, 1, 'John', 'Doe');\n",
              ],
            },
            element: 'model::Test',
            postProcessorWithParameter: [],
            type: 'H2',
          },
          name: 'MyC',
          package: 'model',
        },
      },
      {
        path: 'model::LegalEntity',
        classifierPath: 'meta::pure::metamodel::type::Class',
        content: {
          _type: 'class',
          constraints: [],
          name: 'LegalEntity',
          originalMilestonedProperties: [],
          package: 'model',
          properties: [
            {
              multiplicity: { lowerBound: 1, upperBound: 1 },
              name: 'legalName',
              stereotypes: [],
              taggedValues: [],
              genericType: {
                rawType: {
                  _type: 'packageableType',
                  fullPath: 'String',
                },
                typeArguments: [],
                typeVariableValues: [],
              },
            },
          ],
          qualifiedProperties: [],
          stereotypes: [],
          superTypes: [],
          taggedValues: [],
        },
      },
      {
        path: 'model::Firm',
        classifierPath: 'meta::pure::metamodel::type::Class',
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
          originalMilestonedProperties: [],
          package: 'model',
          properties: [
            {
              multiplicity: { lowerBound: 1 },
              name: 'employees',
              stereotypes: [],
              taggedValues: [],
              genericType: {
                rawType: {
                  _type: 'packageableType',
                  fullPath: 'model::Person',
                },
                typeArguments: [],
                typeVariableValues: [],
              },
            },
            {
              multiplicity: { lowerBound: 1, upperBound: 1 },
              name: 'incType',
              stereotypes: [],
              taggedValues: [],
              type: 'model::IncType',
            },
            {
              multiplicity: { lowerBound: 1, upperBound: 1 },
              name: 'isApple',
              stereotypes: [],
              taggedValues: [],
              genericType: {
                rawType: {
                  _type: 'packageableType',
                  fullPath: 'Boolean',
                },
                typeArguments: [],
                typeVariableValues: [],
              },
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
                      parameters: [{ _type: 'var', name: 'this' }],
                      property: 'employees',
                    },
                  ],
                },
              ],
              name: 'employeeSize',
              parameters: [],
              returnMultiplicity: { lowerBound: 1, upperBound: 1 },
              returnType: 'Number',
              stereotypes: [],
              taggedValues: [],
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
      },
      {
        path: 'model::MyExtension',
        classifierPath: 'meta::pure::metamodel::extension::Profile',
        content: {
          _type: 'profile',
          name: 'MyExtension',
          package: 'model',
          stereotypes: ['important'],
          tags: ['doc'],
        },
      },
      {
        path: 'model::Runtime',
        classifierPath: 'meta::pure::runtime::PackageableRuntime',
        content: {
          _type: 'runtime',
          name: 'Runtime',
          package: 'model',
          runtimeValue: {
            _type: 'engineRuntime',
            connections: [
              {
                store: { path: 'model::Test', type: 'STORE' },
                storeConnections: [
                  {
                    connection: {
                      _type: 'connectionPointer',
                      connection: 'model::MyC',
                    },
                    id: 'connection_1',
                  },
                ],
              },
            ],
            mappings: [{ path: 'model::NewMapping', type: 'MAPPING' }],
          },
        },
      },
      {
        path: 'model::IncType',
        classifierPath: 'meta::pure::metamodel::type::Enumeration',
        content: {
          _type: 'Enumeration',
          name: 'IncType',
          package: 'model',
          stereotypes: [],
          taggedValues: [],
          values: [
            { stereotypes: [], taggedValues: [], value: 'Corp' },
            { stereotypes: [], taggedValues: [], value: 'LLC' },
          ],
        },
      },
      {
        path: 'model::Test',
        classifierPath: 'meta::relational::metamodel::Database',
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
                      type: { _type: 'Integer' },
                    },
                    {
                      name: 'Legal_name',
                      nullable: true,
                      type: { _type: 'Varchar', size: 200 },
                    },
                  ],
                  milestoning: [],
                  name: 'FirmTable',
                  primaryKey: ['id'],
                },
                {
                  columns: [
                    {
                      name: 'id',
                      nullable: false,
                      type: { _type: 'Integer' },
                    },
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
                  ],
                  milestoning: [],
                  name: 'PersonTable',
                  primaryKey: ['id'],
                },
              ],
              views: [],
            },
          ],
        },
      },
      {
        path: 'model::NewMapping',
        classifierPath: 'meta::pure::mapping::Mapping',
        content: {
          _type: 'mapping',
          associationMappings: [],
          classMappings: [
            {
              _type: 'relational',
              class: 'model::Firm',
              distinct: false,
              groupBy: [],
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
                      { _type: 'literal', value: '_LTD' },
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
                    joins: [{ db: 'model::Test', name: 'FirmPerson' }],
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
                              database: 'model::Test',
                              mainTableDb: 'model::Test',
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
              ],
              root: true,
            },
            {
              _type: 'relational',
              class: 'model::Person',
              distinct: false,
              groupBy: [],
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
          tests: [
            {
              assert: {
                _type: 'expectedOutputMappingTestAssert',
                expectedOutput: '[{"values":[1,"FirmX_LTD","Doe","John"]}]',
              },
              inputData: [
                {
                  _type: 'relational',
                  data: "Drop table if exists FirmTable;\nDrop table if exists PersonTable;\nCreate Table FirmTable(id INT, Legal_Name VARCHAR(200));\nCreate Table PersonTable(id INT, firm_id INT, lastName VARCHAR(200), firstName VARCHAR(200));\nInsert into FirmTable (id, Legal_Name) values (1, 'FirmX');\nInsert into PersonTable (id, firm_id, lastName, firstName) values (1, 1, 'John', 'Doe');\n",
                  database: 'model::Test',
                  inputType: 'SQL',
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
                        multiplicity: { lowerBound: 4, upperBound: 4 },
                        values: [
                          {
                            _type: 'lambda',
                            body: [
                              {
                                _type: 'property',
                                parameters: [{ _type: 'var', name: 'x' }],
                                property: 'employeeSize',
                              },
                            ],
                            parameters: [{ _type: 'var', name: 'x' }],
                          },
                          {
                            _type: 'lambda',
                            body: [
                              {
                                _type: 'property',
                                parameters: [{ _type: 'var', name: 'x' }],
                                property: 'legalName',
                              },
                            ],
                            parameters: [{ _type: 'var', name: 'x' }],
                          },
                          {
                            _type: 'lambda',
                            body: [
                              {
                                _type: 'property',
                                parameters: [
                                  {
                                    _type: 'property',
                                    parameters: [{ _type: 'var', name: 'x' }],
                                    property: 'employees',
                                  },
                                ],
                                property: 'firstName',
                              },
                            ],
                            parameters: [{ _type: 'var', name: 'x' }],
                          },
                          {
                            _type: 'lambda',
                            body: [
                              {
                                _type: 'property',
                                parameters: [
                                  {
                                    _type: 'property',
                                    parameters: [{ _type: 'var', name: 'x' }],
                                    property: 'employees',
                                  },
                                ],
                                property: 'lastName',
                              },
                            ],
                            parameters: [{ _type: 'var', name: 'x' }],
                          },
                        ],
                      },
                      {
                        _type: 'collection',
                        multiplicity: { lowerBound: 4, upperBound: 4 },
                        values: [
                          {
                            _type: 'string',
                            multiplicity: {
                              lowerBound: 1,
                              upperBound: 1,
                            },
                            values: ['Employee Size'],
                          },
                          {
                            _type: 'string',
                            multiplicity: {
                              lowerBound: 1,
                              upperBound: 1,
                            },
                            values: ['Legal Name'],
                          },
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
                        ],
                      },
                    ],
                  },
                ],
                parameters: [],
              },
            },
            {
              assert: {
                _type: 'expectedOutputMappingTestAssert',
                expectedOutput: '[{"values":[" John","Doe"]}]',
              },
              inputData: [
                {
                  _type: 'relational',
                  data: 'default\nPersonTable\nid,firm_id,lastName, firstName\n1,2,Doe, John\n\n\n\n',
                  database: 'model::Test',
                  inputType: 'CSV',
                },
              ],
              name: 'test_2',
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
                            fullPath: 'model::Person',
                          },
                        ],
                      },
                      {
                        _type: 'collection',
                        multiplicity: { lowerBound: 2, upperBound: 2 },
                        values: [
                          {
                            _type: 'lambda',
                            body: [
                              {
                                _type: 'property',
                                parameters: [{ _type: 'var', name: 'x' }],
                                property: 'firstName',
                              },
                            ],
                            parameters: [{ _type: 'var', name: 'x' }],
                          },
                          {
                            _type: 'lambda',
                            body: [
                              {
                                _type: 'property',
                                parameters: [{ _type: 'var', name: 'x' }],
                                property: 'lastName',
                              },
                            ],
                            parameters: [{ _type: 'var', name: 'x' }],
                          },
                        ],
                      },
                      {
                        _type: 'collection',
                        multiplicity: { lowerBound: 2, upperBound: 2 },
                        values: [
                          {
                            _type: 'string',
                            multiplicity: {
                              lowerBound: 1,
                              upperBound: 1,
                            },
                            values: ['First Name'],
                          },
                          {
                            _type: 'string',
                            multiplicity: {
                              lowerBound: 1,
                              upperBound: 1,
                            },
                            values: ['Last Name'],
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
      },
    ],
  },
];
