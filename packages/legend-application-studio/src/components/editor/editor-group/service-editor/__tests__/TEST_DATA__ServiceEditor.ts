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

export const TEST_DATA__serviceEntities = [
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
    path: 'model::RealtionalDatabase',
    content: {
      _type: 'relational',
      filters: [],
      includedStores: [],
      joins: [],
      name: 'RealtionalDatabase',
      package: 'model',
      schemas: [
        {
          name: 'default',
          tables: [
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
                  name: 'FIRSTNAME',
                  nullable: true,
                  type: {
                    _type: 'Varchar',
                    size: 200,
                  },
                },
              ],
              name: 'personTable',
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
    path: 'model::RelationalMapping',
    content: {
      _type: 'mapping',
      classMappings: [
        {
          _type: 'relational',
          class: 'model::Person',
          distinct: false,
          id: 'apps_pure_studio_tests_model_simple_Person',
          mainTable: {
            _type: 'Table',
            database: 'model::RealtionalDatabase',
            mainTableDb: 'model::RealtionalDatabase',
            schema: 'default',
            table: 'personTable',
          },
          primaryKey: [
            {
              _type: 'column',
              column: 'ID',
              table: {
                _type: 'Table',
                database: 'model::RealtionalDatabase',
                mainTableDb: 'model::RealtionalDatabase',
                schema: 'default',
                table: 'personTable',
              },
              tableAlias: 'personTable',
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
                column: 'FIRSTNAME',
                table: {
                  _type: 'Table',
                  database: 'model::RealtionalDatabase',
                  mainTableDb: 'model::RealtionalDatabase',
                  schema: 'default',
                  table: 'personTable',
                },
                tableAlias: 'personTable',
              },
              source: 'apps_pure_studio_tests_model_simple_Person',
            },
          ],
          root: true,
        },
      ],
      enumerationMappings: [],
      includedMappings: [],
      name: 'RelationalMapping',
      package: 'model',
      tests: [],
    },
    classifierPath: 'meta::pure::mapping::Mapping',
  },
  {
    path: 'model::M2MMapping',
    content: {
      _type: 'mapping',
      classMappings: [
        {
          _type: 'pureInstance',
          class: 'model::Person',
          propertyMappings: [],
          root: true,
          srcClass: 'model::Person',
        },
      ],
      enumerationMappings: [],
      includedMappings: [],
      name: 'M2MMapping',
      package: 'model',
      tests: [],
    },
    classifierPath: 'meta::pure::mapping::Mapping',
  },
  {
    path: 'model::RelationalService',
    content: {
      _type: 'service',
      autoActivateUpdates: true,
      documentation: 'my service documentation',
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
                          property: 'firstName',
                          parameters: [
                            {
                              _type: 'var',
                              name: 't',
                            },
                          ],
                        },
                      ],
                      parameters: [
                        {
                          _type: 'var',
                          name: 't',
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
                      value: 'firstName',
                    },
                  ],
                },
              ],
            },
          ],
          parameters: [],
        },
        mapping: 'model::RelationalMapping',
        runtime: {
          _type: 'engineRuntime',
          connections: [
            {
              store: {
                path: 'model::RealtionalDatabase',
                type: 'STORE',
              },
              storeConnections: [
                {
                  connection: {
                    _type: 'connectionPointer',
                    connection: 'model::H2Connection',
                  },
                  id: 'id1',
                },
              ],
            },
          ],
          mappings: [
            {
              path: 'model::RelationalMapping',
              type: 'MAPPING',
            },
          ],
        },
      },
      name: 'RelationalService',
      owners: ['owner1', 'owner2'],
      package: 'model',
      pattern: '/example/myTestUrl/{myParam}',
    },
    classifierPath: 'meta::legend::service::metamodel::Service',
  },
  {
    path: 'model::M2MMappingService',
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
                          fullPath: 'model::Person',
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
                            property: 'firstName',
                            parameters: [],
                          },
                          {
                            _type: 'propertyGraphFetchTree',
                            subTrees: [],
                            subTypeTrees: [],
                            property: 'lastName',
                            parameters: [],
                          },
                        ],
                        subTypeTrees: [],
                        _type: 'rootGraphFetchTree',
                        class: 'model::Person',
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
                        property: 'firstName',
                        parameters: [],
                      },
                      {
                        _type: 'propertyGraphFetchTree',
                        subTrees: [],
                        subTypeTrees: [],
                        property: 'lastName',
                        parameters: [],
                      },
                    ],
                    subTypeTrees: [],
                    _type: 'rootGraphFetchTree',
                    class: 'model::Person',
                  },
                },
              ],
            },
          ],
          parameters: [
            {
              _type: 'var',
              name: 'dateParam',
              multiplicity: {
                lowerBound: 1,
                upperBound: 1,
              },
              class: 'Date',
            },
          ],
        },
        mapping: 'model::M2MMapping',
        runtime: {
          _type: 'engineRuntime',
          connections: [
            {
              store: {
                path: 'ModelStore',
                type: 'STORE',
              },
              storeConnections: [
                {
                  connection: {
                    _type: 'JsonModelConnection',
                    class: 'model::Person',
                    url: 'data:application/json,%7B%22firstName%22%3A%22firstName%2073%22%2C%22lastName%22%3A%22lastName%2085%22%7D',
                  },
                  id: 'connection_1',
                },
              ],
            },
          ],
          mappings: [
            {
              path: 'model::M2MMapping',
              type: 'MAPPING',
            },
          ],
        },
      },
      name: 'M2MMappingService',
      owners: [],
      package: 'model',
      pattern: '/c2e1bc8d-ab51-456c-8826-fb51eca31914',
    },
    classifierPath: 'meta::legend::service::metamodel::Service',
  },
  {
    path: 'model::H2Connection',
    content: {
      _type: 'connection',
      connectionValue: {
        _type: 'RelationalDatabaseConnection',
        authenticationStrategy: {
          _type: 'h2Default',
        },
        databaseType: 'H2',
        datasourceSpecification: {
          _type: 'static',
          databaseName: 'myDb',
          host: 'somehost',
          port: 999,
        },
        element: 'model::RealtionalDatabase',
        type: 'H2',
      },
      name: 'H2Connection',
      package: 'model',
    },
    classifierPath: 'meta::pure::runtime::PackageableConnection',
  },
];

export const TEST_DATA__multiEXecutionService = [
  {
    path: 'testModelStoreTestSuites::model::sPerson_TBL',
    content: {
      _type: 'class',
      name: 'sPerson_TBL',
      package: 'testModelStoreTestSuites::model',
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
        {
          multiplicity: {
            lowerBound: 1,
            upperBound: 1,
          },
          name: 'age',
          genericType: {
            rawType: {
              _type: 'packageableType',
              fullPath: 'Integer',
            },
            typeArguments: [],
            typeVariableValues: [],
          },
        },
        {
          multiplicity: {
            lowerBound: 1,
            upperBound: 1,
          },
          name: 'id',
          genericType: {
            rawType: {
              _type: 'packageableType',
              fullPath: 'Integer',
            },
            typeArguments: [],
            typeVariableValues: [],
          },
        },
        {
          multiplicity: {
            lowerBound: 1,
            upperBound: 1,
          },
          name: 'addressId',
          genericType: {
            rawType: {
              _type: 'packageableType',
              fullPath: 'Integer',
            },
            typeArguments: [],
            typeVariableValues: [],
          },
        },
        {
          multiplicity: {
            lowerBound: 1,
            upperBound: 1,
          },
          name: 'firmId',
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
    path: 'testModelStoreTestSuites::model::Person_TBL',
    content: {
      _type: 'class',
      name: 'Person_TBL',
      package: 'testModelStoreTestSuites::model',
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
        {
          multiplicity: {
            lowerBound: 1,
            upperBound: 1,
          },
          name: 'age',
          genericType: {
            rawType: {
              _type: 'packageableType',
              fullPath: 'Integer',
            },
            typeArguments: [],
            typeVariableValues: [],
          },
        },
        {
          multiplicity: {
            lowerBound: 1,
            upperBound: 1,
          },
          name: 'id',
          stereotypes: [
            {
              profile: 'equality',
              value: 'Key',
            },
          ],
          genericType: {
            rawType: {
              _type: 'packageableType',
              fullPath: 'Integer',
            },
            typeArguments: [],
            typeVariableValues: [],
          },
        },
        {
          multiplicity: {
            lowerBound: 1,
            upperBound: 1,
          },
          name: 'addressId',
          genericType: {
            rawType: {
              _type: 'packageableType',
              fullPath: 'Integer',
            },
            typeArguments: [],
            typeVariableValues: [],
          },
        },
        {
          multiplicity: {
            lowerBound: 1,
            upperBound: 1,
          },
          name: 'firmId',
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
    path: 'testModelStoreTestSuites::model::sDoc',
    content: {
      _type: 'class',
      name: 'sDoc',
      package: 'testModelStoreTestSuites::model',
      properties: [
        {
          multiplicity: {
            lowerBound: 1,
            upperBound: 1,
          },
          name: 'sFirm_tbl',
          type: 'testModelStoreTestSuites::model::sFirm_TBL',
        },
        {
          multiplicity: {
            lowerBound: 1,
            upperBound: 1,
          },
          name: 'sPerson_tbl',
          type: 'testModelStoreTestSuites::model::sPerson_TBL',
        },
      ],
    },
    classifierPath: 'meta::pure::metamodel::type::Class',
  },
  {
    path: 'testModelStoreTestSuites::model::sFirm_TBL',
    content: {
      _type: 'class',
      name: 'sFirm_TBL',
      package: 'testModelStoreTestSuites::model',
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
          name: 'firmId',
          genericType: {
            rawType: {
              _type: 'packageableType',
              fullPath: 'Integer',
            },
            typeArguments: [],
            typeVariableValues: [],
          },
        },
        {
          multiplicity: {
            lowerBound: 1,
            upperBound: 1,
          },
          name: 'ceoId',
          genericType: {
            rawType: {
              _type: 'packageableType',
              fullPath: 'Integer',
            },
            typeArguments: [],
            typeVariableValues: [],
          },
        },
        {
          multiplicity: {
            lowerBound: 1,
            upperBound: 1,
          },
          name: 'addressId',
          genericType: {
            rawType: {
              _type: 'packageableType',
              fullPath: 'Integer',
            },
            typeArguments: [],
            typeVariableValues: [],
          },
        },
        {
          multiplicity: {
            lowerBound: 1,
            upperBound: 1,
          },
          name: 'employees',
          type: 'testModelStoreTestSuites::model::sPerson_TBL',
        },
      ],
    },
    classifierPath: 'meta::pure::metamodel::type::Class',
  },
  {
    path: 'testModelStoreTestSuites::model::Doc',
    content: {
      _type: 'class',
      name: 'Doc',
      package: 'testModelStoreTestSuites::model',
      properties: [
        {
          multiplicity: {
            lowerBound: 1,
            upperBound: 1,
          },
          name: 'firm_tbl',
          type: 'testModelStoreTestSuites::model::Firm_TBL',
        },
        {
          multiplicity: {
            lowerBound: 1,
            upperBound: 1,
          },
          name: 'person_tbl',
          type: 'testModelStoreTestSuites::model::Person_TBL',
        },
      ],
    },
    classifierPath: 'meta::pure::metamodel::type::Class',
  },
  {
    path: 'testModelStoreTestSuites::model::Firm_TBL',
    content: {
      _type: 'class',
      name: 'Firm_TBL',
      package: 'testModelStoreTestSuites::model',
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
          name: 'firmId',
          stereotypes: [
            {
              profile: 'equality',
              value: 'Key',
            },
          ],
          genericType: {
            rawType: {
              _type: 'packageableType',
              fullPath: 'Integer',
            },
            typeArguments: [],
            typeVariableValues: [],
          },
        },
        {
          multiplicity: {
            lowerBound: 1,
            upperBound: 1,
          },
          name: 'ceoId',
          genericType: {
            rawType: {
              _type: 'packageableType',
              fullPath: 'Integer',
            },
            typeArguments: [],
            typeVariableValues: [],
          },
        },
        {
          multiplicity: {
            lowerBound: 1,
            upperBound: 1,
          },
          name: 'addressId',
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
    path: 'testModelStoreTestSuites::mapping::DocM2MMapping',
    content: {
      _type: 'mapping',
      classMappings: [
        {
          _type: 'pureInstance',
          class: 'testModelStoreTestSuites::model::Doc',
          propertyMappings: [
            {
              _type: 'purePropertyMapping',
              explodeProperty: false,
              property: {
                class: 'testModelStoreTestSuites::model::Doc',
                property: 'firm_tbl',
              },
              source: '',
              target: 'testModelStoreTestSuites_model_Firm_TBL',
              transform: {
                _type: 'lambda',
                body: [
                  {
                    _type: 'property',
                    property: 'sFirm_tbl',
                    parameters: [
                      {
                        _type: 'var',
                        name: 'src',
                      },
                    ],
                  },
                ],
                parameters: [],
              },
            },
            {
              _type: 'purePropertyMapping',
              explodeProperty: false,
              property: {
                class: 'testModelStoreTestSuites::model::Doc',
                property: 'person_tbl',
              },
              source: '',
              target: 'testModelStoreTestSuites_model_Person_TBL',
              transform: {
                _type: 'lambda',
                body: [
                  {
                    _type: 'property',
                    property: 'sPerson_tbl',
                    parameters: [
                      {
                        _type: 'var',
                        name: 'src',
                      },
                    ],
                  },
                ],
                parameters: [],
              },
            },
          ],
          root: true,
          srcClass: 'testModelStoreTestSuites::model::sDoc',
        },
        {
          _type: 'pureInstance',
          class: 'testModelStoreTestSuites::model::Firm_TBL',
          propertyMappings: [
            {
              _type: 'purePropertyMapping',
              explodeProperty: false,
              property: {
                class: 'testModelStoreTestSuites::model::Firm_TBL',
                property: 'legalName',
              },
              source: '',
              transform: {
                _type: 'lambda',
                body: [
                  {
                    _type: 'property',
                    property: 'legalName',
                    parameters: [
                      {
                        _type: 'var',
                        name: 'src',
                      },
                    ],
                  },
                ],
                parameters: [],
              },
            },
            {
              _type: 'purePropertyMapping',
              explodeProperty: false,
              property: {
                class: 'testModelStoreTestSuites::model::Firm_TBL',
                property: 'firmId',
              },
              source: '',
              transform: {
                _type: 'lambda',
                body: [
                  {
                    _type: 'property',
                    property: 'firmId',
                    parameters: [
                      {
                        _type: 'var',
                        name: 'src',
                      },
                    ],
                  },
                ],
                parameters: [],
              },
            },
            {
              _type: 'purePropertyMapping',
              explodeProperty: false,
              property: {
                class: 'testModelStoreTestSuites::model::Firm_TBL',
                property: 'ceoId',
              },
              source: '',
              transform: {
                _type: 'lambda',
                body: [
                  {
                    _type: 'property',
                    property: 'ceoId',
                    parameters: [
                      {
                        _type: 'var',
                        name: 'src',
                      },
                    ],
                  },
                ],
                parameters: [],
              },
            },
            {
              _type: 'purePropertyMapping',
              explodeProperty: false,
              property: {
                class: 'testModelStoreTestSuites::model::Firm_TBL',
                property: 'addressId',
              },
              source: '',
              transform: {
                _type: 'lambda',
                body: [
                  {
                    _type: 'property',
                    property: 'addressId',
                    parameters: [
                      {
                        _type: 'var',
                        name: 'src',
                      },
                    ],
                  },
                ],
                parameters: [],
              },
            },
          ],
          root: true,
          srcClass: 'testModelStoreTestSuites::model::sFirm_TBL',
        },
        {
          _type: 'pureInstance',
          class: 'testModelStoreTestSuites::model::Person_TBL',
          propertyMappings: [
            {
              _type: 'purePropertyMapping',
              explodeProperty: false,
              property: {
                class: 'testModelStoreTestSuites::model::Person_TBL',
                property: 'firstName',
              },
              source: '',
              transform: {
                _type: 'lambda',
                body: [
                  {
                    _type: 'property',
                    property: 'firstName',
                    parameters: [
                      {
                        _type: 'var',
                        name: 'src',
                      },
                    ],
                  },
                ],
                parameters: [],
              },
            },
            {
              _type: 'purePropertyMapping',
              explodeProperty: false,
              property: {
                class: 'testModelStoreTestSuites::model::Person_TBL',
                property: 'lastName',
              },
              source: '',
              transform: {
                _type: 'lambda',
                body: [
                  {
                    _type: 'property',
                    property: 'lastName',
                    parameters: [
                      {
                        _type: 'var',
                        name: 'src',
                      },
                    ],
                  },
                ],
                parameters: [],
              },
            },
            {
              _type: 'purePropertyMapping',
              explodeProperty: false,
              property: {
                class: 'testModelStoreTestSuites::model::Person_TBL',
                property: 'age',
              },
              source: '',
              transform: {
                _type: 'lambda',
                body: [
                  {
                    _type: 'property',
                    property: 'age',
                    parameters: [
                      {
                        _type: 'var',
                        name: 'src',
                      },
                    ],
                  },
                ],
                parameters: [],
              },
            },
            {
              _type: 'purePropertyMapping',
              explodeProperty: false,
              property: {
                class: 'testModelStoreTestSuites::model::Person_TBL',
                property: 'id',
              },
              source: '',
              transform: {
                _type: 'lambda',
                body: [
                  {
                    _type: 'property',
                    property: 'id',
                    parameters: [
                      {
                        _type: 'var',
                        name: 'src',
                      },
                    ],
                  },
                ],
                parameters: [],
              },
            },
            {
              _type: 'purePropertyMapping',
              explodeProperty: false,
              property: {
                class: 'testModelStoreTestSuites::model::Person_TBL',
                property: 'addressId',
              },
              source: '',
              transform: {
                _type: 'lambda',
                body: [
                  {
                    _type: 'property',
                    property: 'addressId',
                    parameters: [
                      {
                        _type: 'var',
                        name: 'src',
                      },
                    ],
                  },
                ],
                parameters: [],
              },
            },
            {
              _type: 'purePropertyMapping',
              explodeProperty: false,
              property: {
                class: 'testModelStoreTestSuites::model::Person_TBL',
                property: 'firmId',
              },
              source: '',
              transform: {
                _type: 'lambda',
                body: [
                  {
                    _type: 'property',
                    property: 'firmId',
                    parameters: [
                      {
                        _type: 'var',
                        name: 'src',
                      },
                    ],
                  },
                ],
                parameters: [],
              },
            },
          ],
          root: true,
          srcClass: 'testModelStoreTestSuites::model::sPerson_TBL',
        },
      ],
      enumerationMappings: [],
      includedMappings: [],
      name: 'DocM2MMapping',
      package: 'testModelStoreTestSuites::mapping',
      tests: [],
    },
    classifierPath: 'meta::pure::mapping::Mapping',
  },
  {
    path: 'testModelStoreTestSuites::service::DocM2MService',
    content: {
      _type: 'service',
      autoActivateUpdates: true,
      documentation: 'Service to test refiner flow',
      execution: {
        _type: 'pureMultiExecution',
        executionKey: 'env',
        executionParameters: [
          {
            key: 'QA',
            mapping: 'testModelStoreTestSuites::mapping::DocM2MMapping',
            runtime: {
              _type: 'runtimePointer',
              runtime: 'testModelStoreTestSuites::runtime::DocM2MRuntime',
            },
          },
          {
            key: 'UAT',
            mapping: 'testModelStoreTestSuites::mapping::DocM2MMapping',
            runtime: {
              _type: 'runtimePointer',
              runtime: 'testModelStoreTestSuites::runtime::DocM2MRuntime3',
            },
          },
        ],
        func: {
          _type: 'lambda',
          body: [
            {
              _type: 'func',
              function: 'serialize',
              parameters: [
                {
                  _type: 'func',
                  function: 'graphFetchChecked',
                  parameters: [
                    {
                      _type: 'func',
                      function: 'getAll',
                      parameters: [
                        {
                          _type: 'packageableElementPtr',
                          fullPath: 'testModelStoreTestSuites::model::Doc',
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
                            subTrees: [
                              {
                                _type: 'propertyGraphFetchTree',
                                subTrees: [],
                                property: 'addressId',
                                parameters: [],
                              },
                              {
                                _type: 'propertyGraphFetchTree',
                                subTrees: [],
                                property: 'firmId',
                                parameters: [],
                              },
                              {
                                _type: 'propertyGraphFetchTree',
                                subTrees: [],
                                property: 'legalName',
                                parameters: [],
                              },
                              {
                                _type: 'propertyGraphFetchTree',
                                subTrees: [],
                                property: 'ceoId',
                                parameters: [],
                              },
                            ],
                            property: 'firm_tbl',
                            parameters: [],
                          },
                          {
                            _type: 'propertyGraphFetchTree',
                            subTrees: [
                              {
                                _type: 'propertyGraphFetchTree',
                                subTrees: [],
                                property: 'addressId',
                                parameters: [],
                              },
                              {
                                _type: 'propertyGraphFetchTree',
                                subTrees: [],
                                property: 'age',
                                parameters: [],
                              },
                              {
                                _type: 'propertyGraphFetchTree',
                                subTrees: [],
                                property: 'firmId',
                                parameters: [],
                              },
                              {
                                _type: 'propertyGraphFetchTree',
                                subTrees: [],
                                property: 'firstName',
                                parameters: [],
                              },
                              {
                                _type: 'propertyGraphFetchTree',
                                subTrees: [],
                                property: 'id',
                                parameters: [],
                              },
                              {
                                _type: 'propertyGraphFetchTree',
                                subTrees: [],
                                property: 'lastName',
                                parameters: [],
                              },
                            ],
                            property: 'person_tbl',
                            parameters: [],
                          },
                        ],
                        _type: 'rootGraphFetchTree',
                        class: 'testModelStoreTestSuites::model::Doc',
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
                        subTrees: [
                          {
                            _type: 'propertyGraphFetchTree',
                            subTrees: [],
                            property: 'addressId',
                            parameters: [],
                          },
                          {
                            _type: 'propertyGraphFetchTree',
                            subTrees: [],
                            property: 'firmId',
                            parameters: [],
                          },
                          {
                            _type: 'propertyGraphFetchTree',
                            subTrees: [],
                            property: 'legalName',
                            parameters: [],
                          },
                          {
                            _type: 'propertyGraphFetchTree',
                            subTrees: [],
                            property: 'ceoId',
                            parameters: [],
                          },
                        ],
                        property: 'firm_tbl',
                        parameters: [],
                      },
                      {
                        _type: 'propertyGraphFetchTree',
                        subTrees: [
                          {
                            _type: 'propertyGraphFetchTree',
                            subTrees: [],
                            property: 'addressId',
                            parameters: [],
                          },
                          {
                            _type: 'propertyGraphFetchTree',
                            subTrees: [],
                            property: 'age',
                            parameters: [],
                          },
                          {
                            _type: 'propertyGraphFetchTree',
                            subTrees: [],
                            property: 'firmId',
                            parameters: [],
                          },
                          {
                            _type: 'propertyGraphFetchTree',
                            subTrees: [],
                            property: 'firstName',
                            parameters: [],
                          },
                          {
                            _type: 'propertyGraphFetchTree',
                            subTrees: [],
                            property: 'id',
                            parameters: [],
                          },
                          {
                            _type: 'propertyGraphFetchTree',
                            subTrees: [],
                            property: 'lastName',
                            parameters: [],
                          },
                        ],
                        property: 'person_tbl',
                        parameters: [],
                      },
                    ],
                    _type: 'rootGraphFetchTree',
                    class: 'testModelStoreTestSuites::model::Doc',
                  },
                },
              ],
            },
          ],
          parameters: [],
        },
      },
      name: 'DocM2MService',
      owners: ['dummy', 'dummy1'],
      package: 'testModelStoreTestSuites::service',
      pattern: '/testModelStoreTestSuites/service',
    },
    classifierPath: 'meta::legend::service::metamodel::Service',
  },
  {
    path: 'testModelStoreTestSuites::runtime::DocM2MRuntime3',
    content: {
      _type: 'runtime',
      name: 'DocM2MRuntime3',
      package: 'testModelStoreTestSuites::runtime',
      runtimeValue: {
        _type: 'engineRuntime',
        connections: [
          {
            store: {
              path: 'ModelStore',
              type: 'STORE',
            },
            storeConnections: [
              {
                connection: {
                  _type: 'JsonModelConnection',
                  class: 'testModelStoreTestSuites::model::sDoc',
                  url: 'executor:default',
                },
                id: 'connection_2',
              },
            ],
          },
        ],
        mappings: [
          {
            path: 'testModelStoreTestSuites::mapping::DocM2MMapping',
            type: 'MAPPING',
          },
        ],
      },
    },
    classifierPath: 'meta::pure::runtime::PackageableRuntime',
  },
  {
    path: 'testModelStoreTestSuites::runtime::DocM2MRuntime2',
    content: {
      _type: 'runtime',
      name: 'DocM2MRuntime2',
      package: 'testModelStoreTestSuites::runtime',
      runtimeValue: {
        _type: 'engineRuntime',
        connections: [
          {
            store: {
              path: 'ModelStore',
              type: 'STORE',
            },
            storeConnections: [
              {
                connection: {
                  _type: 'JsonModelConnection',
                  class: 'testModelStoreTestSuites::model::sDoc',
                  url: 'executor:default',
                },
                id: 'connection_1',
              },
            ],
          },
        ],
        mappings: [
          {
            path: 'testModelStoreTestSuites::mapping::DocM2MMapping',
            type: 'MAPPING',
          },
        ],
      },
    },
    classifierPath: 'meta::pure::runtime::PackageableRuntime',
  },
  {
    path: 'testModelStoreTestSuites::runtime::DocM2MRuntime',
    content: {
      _type: 'runtime',
      name: 'DocM2MRuntime',
      package: 'testModelStoreTestSuites::runtime',
      runtimeValue: {
        _type: 'engineRuntime',
        connections: [
          {
            store: {
              path: 'ModelStore',
              type: 'STORE',
            },
            storeConnections: [
              {
                connection: {
                  _type: 'JsonModelConnection',
                  class: 'testModelStoreTestSuites::model::sDoc',
                  url: 'executor:default',
                },
                id: 'connection_1',
              },
            ],
          },
        ],
        mappings: [
          {
            path: 'testModelStoreTestSuites::mapping::DocM2MMapping',
            type: 'MAPPING',
          },
        ],
      },
    },
    classifierPath: 'meta::pure::runtime::PackageableRuntime',
  },
];
