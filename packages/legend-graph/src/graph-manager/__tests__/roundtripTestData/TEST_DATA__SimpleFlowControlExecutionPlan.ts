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

export const TEST_DATA__simpleFlowControlExecutionPlan = {
  plan: {
    _type: 'simple',
    authDependent: false,
    rootExecutionNode: {
      _type: 'sequence',
      executionNodes: [
        {
          _type: 'allocation',
          executionNodes: [
            {
              _type: 'constant',
              resultType: {
                _type: 'dataType',
                dataType: 'String',
              },
              values: {
                _type: 'string',
                value: 'FirmA',
              },
            },
          ],
          realizeInMemory: false,
          resultSizeRange: {
            lowerBound: 1,
            upperBound: 1,
          },
          resultType: {
            _type: 'dataType',
            dataType: 'String',
          },
          varName: 'legalName',
        },
        {
          _type: 'relationalTdsInstantiation',
          executionNodes: [
            {
              _type: 'sql',
              connection: {
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
              resultColumns: [
                {
                  dataType: 'VARCHAR(200)',
                  label: '"Legal Name"',
                },
              ],
              resultType: {
                _type: 'dataType',
                dataType: 'meta::pure::metamodel::type::Any',
              },
              sqlQuery:
                'select "root".legal_name as "Legal Name" from FirmTable as "root" where "root".legal_name = \'${legalName?replace("\'", "\'\'")}\'',
            },
          ],
          resultType: {
            _type: 'tds',
            tdsColumns: [
              {
                name: 'Legal Name',
                relationalType: 'VARCHAR(200)',
                type: 'String',
              },
            ],
          },
        },
      ],
      resultType: {
        _type: 'tds',
        tdsColumns: [
          {
            name: 'Legal Name',
            relationalType: 'VARCHAR(200)',
            type: 'String',
          },
        ],
      },
    },
    serializer: {
      name: 'pure',
      version: 'vX_X_X',
    },
    templateFunctions: [
      '<#function renderCollection collection separator prefix suffix replacementMap defaultValue><#if collection?size == 0><#return defaultValue></#if><#assign newCollection = collection><#list replacementMap as oldValue, newValue>   <#assign newCollection = collection?map(ele -> ele?replace(oldValue, newValue))></#list><#return prefix + newCollection?join(suffix + separator + prefix) + suffix></#function>',
      '<#function collectionSize collection> <#return collection?size?c> </#function>',
      '<#function optionalVarPlaceHolderOperationSelector optionalParameter trueClause falseClause><#if optionalParameter?has_content || optionalParameter?is_string><#return trueClause><#else><#return falseClause></#if></#function>',
      '<#function varPlaceHolderToString optionalParameter prefix suffix replacementMap defaultValue><#if optionalParameter?is_enumerable && !optionalParameter?has_content><#return defaultValue><#else><#assign newParam = optionalParameter><#list replacementMap as oldValue, newValue>   <#assign newParam = newParam?replace(oldValue, newValue)></#list><#return prefix + newParam + suffix></#if></#function>',
      '<#function equalEnumOperationSelector enumVal inDyna equalDyna><#assign enumList = enumVal?split(",")><#if enumList?size = 1><#return equalDyna><#else><#return inDyna></#if></#function>',
    ],
  },
  entities: [
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
              lowerBound: 0,
            },
            name: 'employees',
            genericType: {
              rawType: {
                _type: 'packageableType',
                fullPath: 'model::Person',
              },
              typeArguments: [],
              typeVariableValues: [],
            },
          },
        ],
      },
      classifierPath: 'meta::pure::metamodel::type::Class',
    },
    {
      path: 'entity::model::LegalEntity',
      content: {
        _type: 'class',
        name: 'LegalEntity',
        package: 'entity::model',
        properties: [
          {
            multiplicity: {
              lowerBound: 1,
              upperBound: 1,
            },
            name: 'identifier',
            type: 'String',
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
      path: 'model::class',
      content: {
        _type: 'class',
        name: 'class',
        package: 'model',
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
            multiplicity: {
              lowerBound: 1,
              upperBound: 1,
            },
            name: 'ticker',
            type: 'String',
          },
          {
            multiplicity: {
              lowerBound: 1,
              upperBound: 1,
            },
            name: 'quantity',
            genericType: {
              rawType: {
                _type: 'packageableType',
                fullPath: 'Integer',
              },
              typeArguments: [],
              typeVariableValues: [],
            },
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
            multiplicity: {
              lowerBound: 1,
              upperBound: 1,
            },
            name: 'client',
            type: 'entity::model::LegalEntity',
          },
          {
            multiplicity: {
              lowerBound: 0,
            },
            name: 'trades',
            type: 'trade::model::Trade',
          },
        ],
      },
      classifierPath: 'meta::pure::metamodel::relationship::Association',
    },
    {
      path: 'trade::store::TradeDatabase',
      content: {
        _type: 'relational',
        filters: [],
        includedStores: [],
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
      path: 'entity::store::LegalEntityDatabase',
      content: {
        _type: 'relational',
        filters: [],
        includedStores: [],
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
      path: 'trade::mapping::TradeMapping',
      content: {
        _type: 'mapping',
        associationMappings: [
          {
            _type: 'xStore',
            association: 'trade::model::Trade_LegalEntity',
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
                          property: 'clientIdentifier',
                          parameters: [
                            {
                              _type: 'var',
                              name: 'this',
                            },
                          ],
                        },
                        {
                          _type: 'property',
                          property: 'identifier',
                          parameters: [
                            {
                              _type: 'var',
                              name: 'that',
                            },
                          ],
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
                source: 'trade',
                target: 'legal_entity',
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
                          property: 'identifier',
                          parameters: [
                            {
                              _type: 'var',
                              name: 'this',
                            },
                          ],
                        },
                        {
                          _type: 'property',
                          property: 'clientIdentifier',
                          parameters: [
                            {
                              _type: 'var',
                              name: 'that',
                            },
                          ],
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
                source: 'legal_entity',
                target: 'trade',
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
            _type: 'mappingIncludeDataSpace',
            includedDataSpace: 'entity::dataspace::LegalEntityDataSpace',
          },
        ],
        name: 'TradeMapping',
        package: 'trade::mapping',
        tests: [],
      },
      classifierPath: 'meta::pure::mapping::Mapping',
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
      path: 'service::SimpleRelationalServiceWithFunctionParameterValidationExecutionNode',
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
                    function: 'filter',
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
                        _type: 'lambda',
                        body: [
                          {
                            _type: 'func',
                            function: 'exists',
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
                              {
                                _type: 'lambda',
                                body: [
                                  {
                                    _type: 'func',
                                    function: 'equal',
                                    parameters: [
                                      {
                                        _type: 'property',
                                        property: 'firstName',
                                        parameters: [
                                          {
                                            _type: 'var',
                                            name: 'x_1',
                                          },
                                        ],
                                      },
                                      {
                                        _type: 'var',
                                        name: 'employeeNames',
                                      },
                                    ],
                                  },
                                ],
                                parameters: [
                                  {
                                    _type: 'var',
                                    name: 'x_1',
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
            parameters: [
              {
                _type: 'var',
                name: 'employeeNames',
                multiplicity: {
                  lowerBound: 1,
                  upperBound: 1,
                },
                class: 'String',
              },
            ],
          },
          mapping: 'execution::RelationalMapping',
          runtime: {
            _type: 'runtimePointer',
            runtime: 'execution::Runtime',
          },
        },
        name: 'SimpleRelationalServiceWithFunctionParameterValidationExecutionNode',
        owners: [],
        package: 'service',
        pattern: '/d2c48a9c-70fa-46e3-8173-c355e774004f',
      },
      classifierPath: 'meta::legend::service::metamodel::Service',
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
                          subTrees: [
                            {
                              _type: 'propertyGraphFetchTree',
                              subTrees: [],
                              subTypeTrees: [],
                              property: 'quantity',
                              parameters: [],
                            },
                            {
                              _type: 'propertyGraphFetchTree',
                              subTrees: [],
                              subTypeTrees: [],
                              property: 'ticker',
                              parameters: [],
                            },
                            {
                              _type: 'propertyGraphFetchTree',
                              subTrees: [
                                {
                                  _type: 'propertyGraphFetchTree',
                                  subTrees: [],
                                  subTypeTrees: [],
                                  property: 'legalName',
                                  parameters: [],
                                },
                                {
                                  _type: 'propertyGraphFetchTree',
                                  subTrees: [],
                                  subTypeTrees: [],
                                  property: 'identifier',
                                  parameters: [],
                                },
                              ],
                              subTypeTrees: [],
                              property: 'client',
                              parameters: [],
                            },
                          ],
                          subTypeTrees: [],
                          _type: 'rootGraphFetchTree',
                          class: 'trade::model::Trade',
                        },
                      },
                    ],
                  },
                  {
                    _type: 'classInstance',
                    type: 'rootGraphFetchTree',
                    value: {
                      subTrees: [
                        {
                          _type: 'propertyGraphFetchTree',
                          subTrees: [],
                          subTypeTrees: [],
                          property: 'quantity',
                          parameters: [],
                        },
                        {
                          _type: 'propertyGraphFetchTree',
                          subTrees: [],
                          subTypeTrees: [],
                          property: 'ticker',
                          parameters: [],
                        },
                        {
                          _type: 'propertyGraphFetchTree',
                          subTrees: [
                            {
                              _type: 'propertyGraphFetchTree',
                              subTrees: [],
                              subTypeTrees: [],
                              property: 'legalName',
                              parameters: [],
                            },
                            {
                              _type: 'propertyGraphFetchTree',
                              subTrees: [],
                              subTypeTrees: [],
                              property: 'identifier',
                              parameters: [],
                            },
                          ],
                          subTypeTrees: [],
                          property: 'client',
                          parameters: [],
                        },
                      ],
                      subTypeTrees: [],
                      _type: 'rootGraphFetchTree',
                      class: 'trade::model::Trade',
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
                        values:
                          'TICKER,QUANTITY,CLIENT_IDENTIFIER\nAPPL,10,1\n',
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
      path: 'service::GRAPH',
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
                        _type: 'classInstance',
                        type: 'rootGraphFetchTree',
                        value: {
                          subTrees: [
                            {
                              _type: 'propertyGraphFetchTree',
                              subTrees: [],
                              subTypeTrees: [],
                              property: 'legalName',
                              parameters: [],
                            },
                            {
                              _type: 'propertyGraphFetchTree',
                              subTrees: [
                                {
                                  _type: 'propertyGraphFetchTree',
                                  subTrees: [],
                                  subTypeTrees: [],
                                  property: 'firstName',
                                  parameters: [],
                                },
                              ],
                              subTypeTrees: [],
                              property: 'employees',
                              parameters: [],
                            },
                          ],
                          subTypeTrees: [],
                          _type: 'rootGraphFetchTree',
                          class: 'model::Firm',
                        },
                      },
                    ],
                  },
                  {
                    _type: 'classInstance',
                    type: 'rootGraphFetchTree',
                    value: {
                      subTrees: [
                        {
                          _type: 'propertyGraphFetchTree',
                          subTrees: [],
                          subTypeTrees: [],
                          property: 'legalName',
                          parameters: [],
                        },
                        {
                          _type: 'propertyGraphFetchTree',
                          subTrees: [
                            {
                              _type: 'propertyGraphFetchTree',
                              subTrees: [],
                              subTypeTrees: [],
                              property: 'firstName',
                              parameters: [],
                            },
                          ],
                          subTypeTrees: [],
                          property: 'employees',
                          parameters: [],
                        },
                      ],
                      subTypeTrees: [],
                      _type: 'rootGraphFetchTree',
                      class: 'model::Firm',
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
        name: 'GRAPH',
        owners: ['bhorep'],
        package: 'service',
        pattern: '/15833c56-537c-4985-9592-58caeaf576e0',
      },
      classifierPath: 'meta::legend::service::metamodel::Service',
    },
    {
      path: 'service::SimpleRelationalServiceWithAllocationAndSequenceNode',
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
                function: 'letFunction',
                parameters: [
                  {
                    _type: 'string',
                    value: 'legalName',
                  },
                  {
                    _type: 'string',
                    value: 'FirmA',
                  },
                ],
              },
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
                            fullPath: 'model::Firm',
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
                                property: 'legalName',
                                parameters: [
                                  {
                                    _type: 'var',
                                    name: 'x',
                                  },
                                ],
                              },
                              {
                                _type: 'var',
                                name: 'legalName',
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
        name: 'SimpleRelationalServiceWithAllocationAndSequenceNode',
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
                ],
                id: 'test1',
                keys: [],
                parameters: [
                  {
                    name: 'var_1',
                    value: {
                      _type: 'strictDate',
                      sourceInformation: {
                        sourceId: '',
                        startLine: 55,
                        startColumn: 21,
                        endLine: 55,
                        endColumn: 31,
                      },
                      value: '2022-08-12',
                    },
                  },
                ],
                serializationFormat: 'PURE_TDSOBJECT',
              },
            ],
          },
        ],
      },
      classifierPath: 'meta::legend::service::metamodel::Service',
    },
    {
      path: 'service::SimpleRelationalServiceWithSQLExecutionNode',
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
        name: 'SimpleRelationalServiceWithSQLExecutionNode',
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
                ],
                id: 'test1',
                keys: [],
                parameters: [
                  {
                    name: 'var_1',
                    value: {
                      _type: 'strictDate',
                      sourceInformation: {
                        sourceId: '',
                        startLine: 55,
                        startColumn: 21,
                        endLine: 55,
                        endColumn: 31,
                      },
                      value: '2022-08-12',
                    },
                  },
                ],
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
      path: 'trade::runtime::TradeRuntime',
      content: {
        _type: 'runtime',
        name: 'TradeRuntime',
        package: 'trade::runtime',
        runtimeValue: {
          _type: 'engineRuntime',
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
    {
      path: 'entity::dataspace::LegalEntityDataSpace',
      content: {
        _type: 'dataSpace',
        defaultExecutionContext: 'default',
        executionContexts: [
          {
            defaultRuntime: {
              path: 'entity::runtime::LegalEntityRuntime',
              type: 'RUNTIME',
            },
            mapping: {
              path: 'entity::mapping::LegalEntityMapping',
              type: 'MAPPING',
            },
            name: 'default',
          },
        ],
        name: 'LegalEntityDataSpace',
        package: 'entity::dataspace',
      },
      classifierPath: 'meta::pure::metamodel::dataSpace::DataSpace',
    },
  ],
};
