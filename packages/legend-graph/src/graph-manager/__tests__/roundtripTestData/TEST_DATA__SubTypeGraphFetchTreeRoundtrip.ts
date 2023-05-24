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
export const TEST_DATA__SubTypeGraphFetchTreeRoundtrip = [
  {
    path: 'test::City',
    content: {
      _type: 'class',
      name: 'City',
      package: 'test',
      properties: [
        {
          multiplicity: {
            lowerBound: 1,
            upperBound: 1,
          },
          name: 'name',
          type: 'String',
        },
      ],
      superTypes: ['test::Address'],
    },
    classifierPath: 'meta::pure::metamodel::type::Class',
  },
  {
    path: 'test::Address',
    content: {
      _type: 'class',
      name: 'Address',
      package: 'test',
      properties: [
        {
          multiplicity: {
            lowerBound: 1,
            upperBound: 1,
          },
          name: 'Id',
          type: 'Integer',
        },
        {
          multiplicity: {
            lowerBound: 1,
            upperBound: 1,
          },
          name: 'landmark',
          type: 'test::LandMark',
        },
      ],
    },
    classifierPath: 'meta::pure::metamodel::type::Class',
  },
  {
    path: 'test::Coordinate',
    content: {
      _type: 'class',
      name: 'Coordinate',
      package: 'test',
      properties: [
        {
          multiplicity: {
            lowerBound: 1,
            upperBound: 1,
          },
          name: 'streetId',
          type: 'Integer',
        },
        {
          multiplicity: {
            lowerBound: 1,
            upperBound: 1,
          },
          name: 'latitude',
          type: 'String',
        },
        {
          multiplicity: {
            lowerBound: 1,
            upperBound: 1,
          },
          name: 'longitude',
          type: 'String',
        },
      ],
    },
    classifierPath: 'meta::pure::metamodel::type::Class',
  },
  {
    path: 'test::Street',
    content: {
      _type: 'class',
      name: 'Street',
      package: 'test',
      properties: [
        {
          multiplicity: {
            lowerBound: 1,
            upperBound: 1,
          },
          name: 'street',
          type: 'String',
        },
        {
          multiplicity: {
            lowerBound: 1,
            upperBound: 1,
          },
          name: 'coordinate',
          type: 'test::Coordinate',
        },
      ],
      superTypes: ['test::Address'],
    },
    classifierPath: 'meta::pure::metamodel::type::Class',
  },
  {
    path: 'test::LandMark',
    content: {
      _type: 'class',
      name: 'LandMark',
      package: 'test',
      properties: [
        {
          multiplicity: {
            lowerBound: 1,
            upperBound: 1,
          },
          name: 'addId',
          type: 'String',
        },
        {
          multiplicity: {
            lowerBound: 1,
            upperBound: 1,
          },
          name: 'lmName',
          type: 'String',
        },
      ],
    },
    classifierPath: 'meta::pure::metamodel::type::Class',
  },
  {
    path: 'test::db',
    content: {
      _type: 'relational',
      filters: [
        {
          _type: 'filter',
          name: 'street_filter',
          operation: {
            _type: 'dynaFunc',
            funcName: 'equal',
            parameters: [
              {
                _type: 'column',
                column: 'type',
                table: {
                  _type: 'Table',
                  database: 'test::db',
                  mainTableDb: 'test::db',
                  schema: 'default',
                  table: 'addressTable',
                },
                tableAlias: 'addressTable',
              },
              {
                _type: 'literal',
                value: 'street',
              },
            ],
          },
        },
        {
          _type: 'filter',
          name: 'address_filter',
          operation: {
            _type: 'dynaFunc',
            funcName: 'equal',
            parameters: [
              {
                _type: 'column',
                column: 'type',
                table: {
                  _type: 'Table',
                  database: 'test::db',
                  mainTableDb: 'test::db',
                  schema: 'default',
                  table: 'addressTable',
                },
                tableAlias: 'addressTable',
              },
              {
                _type: 'literal',
                value: 'address',
              },
            ],
          },
        },
        {
          _type: 'filter',
          name: 'city_filter',
          operation: {
            _type: 'dynaFunc',
            funcName: 'equal',
            parameters: [
              {
                _type: 'column',
                column: 'type',
                table: {
                  _type: 'Table',
                  database: 'test::db',
                  mainTableDb: 'test::db',
                  schema: 'default',
                  table: 'addressTable',
                },
                tableAlias: 'addressTable',
              },
              {
                _type: 'literal',
                value: 'city',
              },
            ],
          },
        },
      ],
      includedStores: [],
      joins: [
        {
          name: 'st_l',
          operation: {
            _type: 'dynaFunc',
            funcName: 'equal',
            parameters: [
              {
                _type: 'column',
                column: 'Id',
                table: {
                  _type: 'Table',
                  database: 'test::db',
                  mainTableDb: 'test::db',
                  schema: 'default',
                  table: 'streetTable',
                },
                tableAlias: 'streetTable',
              },
              {
                _type: 'column',
                column: 'addId',
                table: {
                  _type: 'Table',
                  database: 'test::db',
                  mainTableDb: 'test::db',
                  schema: 'default',
                  table: 'landmarkTable',
                },
                tableAlias: 'landmarkTable',
              },
            ],
          },
        },
        {
          name: 'st_co',
          operation: {
            _type: 'dynaFunc',
            funcName: 'equal',
            parameters: [
              {
                _type: 'column',
                column: 'Id',
                table: {
                  _type: 'Table',
                  database: 'test::db',
                  mainTableDb: 'test::db',
                  schema: 'default',
                  table: 'streetTable',
                },
                tableAlias: 'streetTable',
              },
              {
                _type: 'column',
                column: 'streetId',
                table: {
                  _type: 'Table',
                  database: 'test::db',
                  mainTableDb: 'test::db',
                  schema: 'default',
                  table: 'coordinateTable',
                },
                tableAlias: 'coordinateTable',
              },
            ],
          },
        },
        {
          name: 'c_l',
          operation: {
            _type: 'dynaFunc',
            funcName: 'equal',
            parameters: [
              {
                _type: 'column',
                column: 'Id',
                table: {
                  _type: 'Table',
                  database: 'test::db',
                  mainTableDb: 'test::db',
                  schema: 'default',
                  table: 'cityTable',
                },
                tableAlias: 'cityTable',
              },
              {
                _type: 'column',
                column: 'addId',
                table: {
                  _type: 'Table',
                  database: 'test::db',
                  mainTableDb: 'test::db',
                  schema: 'default',
                  table: 'landmarkTable',
                },
                tableAlias: 'landmarkTable',
              },
            ],
          },
        },
        {
          name: 'ad_l',
          operation: {
            _type: 'dynaFunc',
            funcName: 'equal',
            parameters: [
              {
                _type: 'column',
                column: 'Id',
                table: {
                  _type: 'Table',
                  database: 'test::db',
                  mainTableDb: 'test::db',
                  schema: 'default',
                  table: 'addressTable',
                },
                tableAlias: 'addressTable',
              },
              {
                _type: 'column',
                column: 'addId',
                table: {
                  _type: 'Table',
                  database: 'test::db',
                  mainTableDb: 'test::db',
                  schema: 'default',
                  table: 'landmarkTable',
                },
                tableAlias: 'landmarkTable',
              },
            ],
          },
        },
        {
          name: 'ad_st',
          operation: {
            _type: 'dynaFunc',
            funcName: 'equal',
            parameters: [
              {
                _type: 'column',
                column: 'Id',
                table: {
                  _type: 'Table',
                  database: 'test::db',
                  mainTableDb: 'test::db',
                  schema: 'default',
                  table: 'addressTable',
                },
                tableAlias: 'addressTable',
              },
              {
                _type: 'column',
                column: 'Id',
                table: {
                  _type: 'Table',
                  database: 'test::db',
                  mainTableDb: 'test::db',
                  schema: 'default',
                  table: 'streetTable',
                },
                tableAlias: 'streetTable',
              },
            ],
          },
        },
        {
          name: 'ad_city',
          operation: {
            _type: 'dynaFunc',
            funcName: 'equal',
            parameters: [
              {
                _type: 'column',
                column: 'Id',
                table: {
                  _type: 'Table',
                  database: 'test::db',
                  mainTableDb: 'test::db',
                  schema: 'default',
                  table: 'addressTable',
                },
                tableAlias: 'addressTable',
              },
              {
                _type: 'column',
                column: 'Id',
                table: {
                  _type: 'Table',
                  database: 'test::db',
                  mainTableDb: 'test::db',
                  schema: 'default',
                  table: 'cityTable',
                },
                tableAlias: 'cityTable',
              },
            ],
          },
        },
        {
          name: 'ad_co',
          operation: {
            _type: 'dynaFunc',
            funcName: 'equal',
            parameters: [
              {
                _type: 'column',
                column: 'Id',
                table: {
                  _type: 'Table',
                  database: 'test::db',
                  mainTableDb: 'test::db',
                  schema: 'default',
                  table: 'addressTable',
                },
                tableAlias: 'addressTable',
              },
              {
                _type: 'column',
                column: 'streetId',
                table: {
                  _type: 'Table',
                  database: 'test::db',
                  mainTableDb: 'test::db',
                  schema: 'default',
                  table: 'coordinateTable',
                },
                tableAlias: 'coordinateTable',
              },
            ],
          },
        },
      ],
      name: 'db',
      package: 'test',
      schemas: [
        {
          name: 'default',
          tables: [
            {
              columns: [
                {
                  name: 'Id',
                  nullable: false,
                  type: {
                    _type: 'Integer',
                  },
                },
                {
                  name: 'type',
                  nullable: true,
                  type: {
                    _type: 'Varchar',
                    size: 200,
                  },
                },
              ],
              name: 'addressTable',
              primaryKey: ['Id'],
            },
            {
              columns: [
                {
                  name: 'Id',
                  nullable: false,
                  type: {
                    _type: 'Integer',
                  },
                },
                {
                  name: 'street',
                  nullable: true,
                  type: {
                    _type: 'Varchar',
                    size: 200,
                  },
                },
              ],
              name: 'streetTable',
              primaryKey: ['Id'],
            },
            {
              columns: [
                {
                  name: 'Id',
                  nullable: false,
                  type: {
                    _type: 'Integer',
                  },
                },
                {
                  name: 'name',
                  nullable: true,
                  type: {
                    _type: 'Varchar',
                    size: 200,
                  },
                },
              ],
              name: 'cityTable',
              primaryKey: ['Id'],
            },
            {
              columns: [
                {
                  name: 'addId',
                  nullable: false,
                  type: {
                    _type: 'Integer',
                  },
                },
                {
                  name: 'lmName',
                  nullable: true,
                  type: {
                    _type: 'Varchar',
                    size: 200,
                  },
                },
              ],
              name: 'landmarkTable',
              primaryKey: ['addId'],
            },
            {
              columns: [
                {
                  name: 'streetId',
                  nullable: false,
                  type: {
                    _type: 'Integer',
                  },
                },
                {
                  name: 'latitude',
                  nullable: true,
                  type: {
                    _type: 'Varchar',
                    size: 200,
                  },
                },
                {
                  name: 'longitude',
                  nullable: true,
                  type: {
                    _type: 'Varchar',
                    size: 200,
                  },
                },
              ],
              name: 'coordinateTable',
              primaryKey: ['streetId'],
            },
          ],
          views: [],
        },
      ],
    },
    classifierPath: 'meta::relational::metamodel::Database',
  },
  {
    path: 'test::testMapping',
    content: {
      _type: 'mapping',
      classMappings: [
        {
          _type: 'relational',
          class: 'test::Address',
          distinct: false,
          filter: {
            filter: {
              db: 'test::db',
              name: 'address_filter',
            },
            joins: [],
          },
          id: 'a',
          mainTable: {
            _type: 'Table',
            database: 'test::db',
            mainTableDb: 'test::db',
            schema: 'default',
            table: 'addressTable',
          },
          primaryKey: [
            {
              _type: 'column',
              column: 'Id',
              table: {
                _type: 'Table',
                database: 'test::db',
                mainTableDb: 'test::db',
                schema: 'default',
                table: 'addressTable',
              },
              tableAlias: 'addressTable',
            },
          ],
          propertyMappings: [
            {
              _type: 'relationalPropertyMapping',
              property: {
                class: 'test::Address',
                property: 'Id',
              },
              relationalOperation: {
                _type: 'column',
                column: 'Id',
                table: {
                  _type: 'Table',
                  database: 'test::db',
                  mainTableDb: 'test::db',
                  schema: 'default',
                  table: 'addressTable',
                },
                tableAlias: 'addressTable',
              },
              source: 'a',
            },
            {
              _type: 'relationalPropertyMapping',
              property: {
                class: 'test::Address',
                property: 'landmark',
              },
              relationalOperation: {
                _type: 'elemtWithJoins',
                joins: [
                  {
                    db: 'test::db',
                    name: 'ad_l',
                  },
                ],
              },
              source: 'a',
            },
          ],
          root: false,
        },
        {
          _type: 'relational',
          class: 'test::Street',
          distinct: false,
          extendsClassMappingId: 'a',
          filter: {
            filter: {
              db: 'test::db',
              name: 'street_filter',
            },
            joins: [],
          },
          primaryKey: [],
          propertyMappings: [
            {
              _type: 'relationalPropertyMapping',
              property: {
                class: 'test::Street',
                property: 'street',
              },
              relationalOperation: {
                _type: 'elemtWithJoins',
                joins: [
                  {
                    db: 'test::db',
                    name: 'ad_st',
                  },
                ],
                relationalElement: {
                  _type: 'column',
                  column: 'street',
                  table: {
                    _type: 'Table',
                    database: 'test::db',
                    mainTableDb: 'test::db',
                    schema: 'default',
                    table: 'streetTable',
                  },
                  tableAlias: 'streetTable',
                },
              },
            },
            {
              _type: 'relationalPropertyMapping',
              property: {
                class: 'test::Street',
                property: 'coordinate',
              },
              relationalOperation: {
                _type: 'elemtWithJoins',
                joins: [
                  {
                    db: 'test::db',
                    name: 'ad_co',
                  },
                ],
              },
            },
          ],
          root: false,
        },
        {
          _type: 'relational',
          class: 'test::City',
          distinct: false,
          extendsClassMappingId: 'a',
          filter: {
            filter: {
              db: 'test::db',
              name: 'city_filter',
            },
            joins: [],
          },
          primaryKey: [],
          propertyMappings: [
            {
              _type: 'relationalPropertyMapping',
              property: {
                class: 'test::City',
                property: 'name',
              },
              relationalOperation: {
                _type: 'elemtWithJoins',
                joins: [
                  {
                    db: 'test::db',
                    name: 'ad_city',
                  },
                ],
                relationalElement: {
                  _type: 'column',
                  column: 'name',
                  table: {
                    _type: 'Table',
                    database: 'test::db',
                    mainTableDb: 'test::db',
                    schema: 'default',
                    table: 'cityTable',
                  },
                  tableAlias: 'cityTable',
                },
              },
            },
          ],
          root: false,
        },
        {
          _type: 'relational',
          class: 'test::Coordinate',
          distinct: false,
          mainTable: {
            _type: 'Table',
            database: 'test::db',
            mainTableDb: 'test::db',
            schema: 'default',
            table: 'coordinateTable',
          },
          primaryKey: [
            {
              _type: 'column',
              column: 'streetId',
              table: {
                _type: 'Table',
                database: 'test::db',
                mainTableDb: 'test::db',
                schema: 'default',
                table: 'coordinateTable',
              },
              tableAlias: 'coordinateTable',
            },
          ],
          propertyMappings: [
            {
              _type: 'relationalPropertyMapping',
              property: {
                class: 'test::Coordinate',
                property: 'streetId',
              },
              relationalOperation: {
                _type: 'column',
                column: 'streetId',
                table: {
                  _type: 'Table',
                  database: 'test::db',
                  mainTableDb: 'test::db',
                  schema: 'default',
                  table: 'coordinateTable',
                },
                tableAlias: 'coordinateTable',
              },
            },
            {
              _type: 'relationalPropertyMapping',
              property: {
                class: 'test::Coordinate',
                property: 'latitude',
              },
              relationalOperation: {
                _type: 'column',
                column: 'latitude',
                table: {
                  _type: 'Table',
                  database: 'test::db',
                  mainTableDb: 'test::db',
                  schema: 'default',
                  table: 'coordinateTable',
                },
                tableAlias: 'coordinateTable',
              },
            },
            {
              _type: 'relationalPropertyMapping',
              property: {
                class: 'test::Coordinate',
                property: 'longitude',
              },
              relationalOperation: {
                _type: 'column',
                column: 'longitude',
                table: {
                  _type: 'Table',
                  database: 'test::db',
                  mainTableDb: 'test::db',
                  schema: 'default',
                  table: 'coordinateTable',
                },
                tableAlias: 'coordinateTable',
              },
            },
          ],
          root: false,
        },
        {
          _type: 'relational',
          class: 'test::LandMark',
          distinct: false,
          mainTable: {
            _type: 'Table',
            database: 'test::db',
            mainTableDb: 'test::db',
            schema: 'default',
            table: 'landmarkTable',
          },
          primaryKey: [
            {
              _type: 'column',
              column: 'addId',
              table: {
                _type: 'Table',
                database: 'test::db',
                mainTableDb: 'test::db',
                schema: 'default',
                table: 'landmarkTable',
              },
              tableAlias: 'landmarkTable',
            },
          ],
          propertyMappings: [
            {
              _type: 'relationalPropertyMapping',
              property: {
                class: 'test::LandMark',
                property: 'addId',
              },
              relationalOperation: {
                _type: 'column',
                column: 'addId',
                table: {
                  _type: 'Table',
                  database: 'test::db',
                  mainTableDb: 'test::db',
                  schema: 'default',
                  table: 'landmarkTable',
                },
                tableAlias: 'landmarkTable',
              },
            },
            {
              _type: 'relationalPropertyMapping',
              property: {
                class: 'test::LandMark',
                property: 'lmName',
              },
              relationalOperation: {
                _type: 'column',
                column: 'lmName',
                table: {
                  _type: 'Table',
                  database: 'test::db',
                  mainTableDb: 'test::db',
                  schema: 'default',
                  table: 'landmarkTable',
                },
                tableAlias: 'landmarkTable',
              },
            },
          ],
          root: false,
        },
      ],
      enumerationMappings: [],
      includedMappings: [],
      name: 'testMapping',
      package: 'test',
      tests: [],
    },
    classifierPath: 'meta::pure::mapping::Mapping',
  },
  {
    path: 'test::testservice',
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
                          fullPath: 'test::Address',
                        },
                      ],
                    },
                    {
                      _type: 'classInstance',
                      type: 'rootGraphFetchTree',
                      value: {
                        _type: 'rootGraphFetchTree',
                        class: 'test::Address',
                        subTrees: [
                          {
                            _type: 'propertyGraphFetchTree',
                            parameters: [],
                            property: 'Id',
                            subTrees: [],
                            subTypeTrees: [],
                          },
                        ],
                        subTypeTrees: [
                          {
                            _type: 'subTypeGraphFetchTree',
                            subTrees: [
                              {
                                _type: 'propertyGraphFetchTree',
                                parameters: [],
                                property: 'street',
                                subTrees: [],
                                subTypeTrees: [],
                              },
                            ],
                            subTypeClass: 'test::Street',
                            subTypeTrees: [],
                          },
                        ],
                      },
                    },
                  ],
                },
                {
                  _type: 'classInstance',
                  type: 'rootGraphFetchTree',
                  value: {
                    _type: 'rootGraphFetchTree',
                    class: 'test::Address',
                    subTrees: [
                      {
                        _type: 'propertyGraphFetchTree',
                        parameters: [],
                        property: 'Id',
                        subTrees: [],
                        subTypeTrees: [],
                      },
                    ],
                    subTypeTrees: [
                      {
                        _type: 'subTypeGraphFetchTree',
                        subTrees: [
                          {
                            _type: 'propertyGraphFetchTree',
                            parameters: [],
                            property: 'street',
                            subTrees: [],
                            subTypeTrees: [],
                          },
                        ],
                        subTypeClass: 'test::Street',
                        subTypeTrees: [],
                      },
                    ],
                  },
                },
              ],
            },
          ],
          parameters: [],
        },
        mapping: 'test::testMapping',
        runtime: {
          _type: 'runtimePointer',
          runtime: 'test::testRuntime',
        },
      },
      name: 'testservice',
      owners: ['siaka'],
      package: 'test',
      pattern: '/64325176-20cd-4051-b594-84061fceacc6',
    },
    classifierPath: 'meta::legend::service::metamodel::Service',
  },
  {
    path: 'test::testRuntime',
    content: {
      _type: 'runtime',
      name: 'testRuntime',
      package: 'test',
      runtimeValue: {
        _type: 'engineRuntime',
        connections: [
          {
            store: {
              path: 'test::db',
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
                    testDataSetupSqls: [
                      "Drop table if exists addressTable;\n                                                                                                                                  Drop table if exists landmarkTable;\n                                                                                                                                  Drop table if exists landmarkTable2;\n                                                                                                                                  Drop table if exists streetTable; \n                                                                                                                                Drop table if exists coordinateTable;\n                                                                                                                                  Drop table if exists cityTable;\n                                                                                                                                  Create Table addressTable(Id INT PRIMARY KEY, type VARCHAR(200));\n                                                                                                                                  insert into addressTable(Id, type) values (1, 'street');\n                                                                                                                                  insert into addressTable(Id, type) values (2, 'street');\n                                                                                                                                  insert into addressTable(Id, type) values (3, 'street');\n                                                                                                                                   insert into addressTable(Id, type) values (4, 'city');\n                                                                                                                                  insert into addressTable(Id, type) values (5, 'city');\n                                                                                                                                   insert into addressTable(Id, type) values (6, 'city');\n                                                                                                                                  insert into addressTable(Id, type) values (7, 'address');\n                                                                                                                                  Create Table streetTable(Id INT PRIMARY KEY, street VARCHAR(200));\n                                                                                                                                  insert into streetTable(ID, street) values(1, 'str1');\n                                                                                                                                  insert into streetTable(ID, street) values(2, 'str2');\n                                                                                                                                  insert into streetTable(ID, street) values(3, 'str3') ;\n                                                                                                                                  Create Table landmarkTable(addId INT PRIMARY KEY, lmName VARCHAR(200));\n                                                                                                                                  insert into landmarkTable(addId, lmName) values(1, 'lm1');\n                                                                                                                                  insert into landmarkTable(addId, lmName) values(2, 'lm2');\n                                                                                                                                  insert into landmarkTable(addId, lmName) values(3, 'lm3');\n                                                                                                                                   Create Table landmarkTable2(addId INT PRIMARY KEY, lmName VARCHAR(200));\n                                                                                                                                  insert into landmarkTable2(addId, lmName) values(4, 'lm4');\n                                                                                                                                  insert into landmarkTable2(addId, lmName) values(5, 'l5');\n                                                                                                                                  insert into landmarkTable2(addId, lmName) values(6, 'lm6');\n                                                                                                                                   insert into landmarkTable(addId, lmName) values(4, 'lm4');\n                                                                                                                                   insert into landmarkTable(addId, lmName) values(5, 'lm5');\n                                                                                                                                  insert into landmarkTable(addId, lmName) values(6, 'lm6') ;    \n                                                                                                                                  insert into landmarkTable(addId,lmName)values(7,'lm7');                                                                                                                             \n                                                                                                                                  Create Table coordinateTable(streetId INT PRIMARY KEY, latitude VARCHAR(200), longitude VARCHAR(200));\n                                                                                                                                 insert into coordinateTable(streetId, latitude, longitude) values(1, '38.8951', ' -77.0364');\n                                                                                                                                  insert into coordinateTable(streetId, latitude, longitude) values(2, '32.8951', ' -75.0364');\n                                                                                                                                  insert into coordinateTable(streetId, latitude, longitude) values(3, '37.8951', ' -72.0364');\n                                                                                                                                  Create Table cityTable(Id INT PRIMARY KEY, name VARCHAR(200));\n                                                                                                                                  insert into cityTable(Id, name) values(4, 'City1');\n                                                                                                                                  insert into cityTable(Id, name) values(5, 'City2');\n                                                                                                                                  insert into cityTable(Id, name) values(6, 'City3');",
                    ],
                  },
                  element: 'test::db',
                  type: 'H2',
                },
                id: 'connection_1',
              },
            ],
          },
        ],
        mappings: [
          {
            path: 'test::testMapping',
            type: 'MAPPING',
          },
        ],
      },
    },
    classifierPath: 'meta::pure::runtime::PackageableRuntime',
  },
];
