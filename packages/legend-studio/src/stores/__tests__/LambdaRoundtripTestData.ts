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

export const simpleAllFunc = {
  _type: 'lambda',
  body: [
    {
      _type: 'func',
      function: 'getAll',
      parameters: [
        {
          _type: 'class',
          fullPath: 'apps::pure::studio::tests::model::simple::Person',
        },
      ],
    },
  ],
  parameters: [],
};

export const simpleFilterFunc = {
  _type: 'lambda',
  body: [
    {
      _type: 'func',
      function: 'filter',
      parameters: [
        {
          _type: 'func',
          function: 'getAll',
          parameters: [
            {
              _type: 'class',
              fullPath: 'apps::pure::studio::tests::model::simple::Person',
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
                  parameters: [
                    {
                      _type: 'var',
                      name: 'p',
                    },
                  ],
                  property: 'firstName',
                },
                {
                  _type: 'string',
                  multiplicity: {
                    lowerBound: 1,
                    upperBound: 1,
                  },
                  values: ['PersonA'],
                },
              ],
            },
          ],
          parameters: [
            {
              _type: 'var',
              name: 'p',
            },
          ],
        },
      ],
    },
  ],
  parameters: [],
};

export const simpleProjection = {
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
              _type: 'class',
              fullPath: 'apps::pure::studio::tests::model::simple::Person',
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
                      name: 't',
                    },
                  ],
                  property: 'firstName',
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
              multiplicity: {
                lowerBound: 1,
                upperBound: 1,
              },
              values: ['firstName'],
            },
          ],
        },
      ],
    },
  ],
  parameters: [],
};

export const projectWithCols = {
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
              _type: 'class',
              fullPath: 'apps::pure::studio::tests::model::simple::Person',
            },
          ],
        },
        {
          _type: 'collection',
          multiplicity: {
            lowerBound: 2,
            upperBound: 2,
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
                          _type: 'var',
                          name: 'x',
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
                  multiplicity: {
                    lowerBound: 1,
                    upperBound: 1,
                  },
                  values: ['firstName'],
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
                  multiplicity: {
                    lowerBound: 1,
                    upperBound: 1,
                  },
                  values: ['last Name S'],
                },
              ],
            },
          ],
        },
      ],
    },
  ],
  parameters: [],
};

export const simpleProjectionWithFilter = {
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
                  _type: 'class',
                  fullPath: 'apps::pure::studio::tests::model::simple::Person',
                },
              ],
            },
            {
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
                          name: 'p',
                        },
                      ],
                      property: 'firstName',
                    },
                    {
                      _type: 'string',
                      multiplicity: {
                        lowerBound: 1,
                        upperBound: 1,
                      },
                      values: ['Person'],
                    },
                  ],
                },
              ],
              parameters: [
                {
                  _type: 'var',
                  name: 'p',
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
                  parameters: [
                    {
                      _type: 'var',
                      name: 't',
                    },
                  ],
                  property: 'firstName',
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
              multiplicity: {
                lowerBound: 1,
                upperBound: 1,
              },
              values: ['firstName'],
            },
          ],
        },
      ],
    },
  ],
  parameters: [],
};

export const ComplexRelationalModel = [
  {
    path: 'apps::pure::studio::tests::model::simple::Person',
    content: {
      _type: 'class',
      name: 'Person',
      package: 'apps::pure::studio::tests::model::simple',
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
    path: 'apps::pure::studio::relational::tests::dbInc',
    content: {
      _type: 'relational',
      filters: [],
      includedStores: [],
      joins: [],
      name: 'dbInc',
      package: 'apps::pure::studio::relational::tests',
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
                {
                  name: 'LASTNAME',
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
    path: 'apps::pure::studio::relational::tests::simpleRelationalMappingInc',
    content: {
      _type: 'mapping',
      classMappings: [
        {
          _type: 'relational',
          class: 'apps::pure::studio::tests::model::simple::Person',
          distinct: false,
          id: 'apps_pure_studio_tests_model_simple_Person',
          mainTable: {
            _type: 'Table',
            database: 'apps::pure::studio::relational::tests::dbInc',
            mainTableDb: 'apps::pure::studio::relational::tests::dbInc',
            schema: 'default',
            table: 'personTable',
          },
          primaryKey: [
            {
              _type: 'column',
              column: 'ID',
              table: {
                _type: 'Table',
                database: 'apps::pure::studio::relational::tests::dbInc',
                mainTableDb: 'apps::pure::studio::relational::tests::dbInc',
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
                class: 'apps::pure::studio::tests::model::simple::Person',
                property: 'firstName',
              },
              relationalOperation: {
                _type: 'column',
                column: 'FIRSTNAME',
                table: {
                  _type: 'Table',
                  database: 'apps::pure::studio::relational::tests::dbInc',
                  mainTableDb: 'apps::pure::studio::relational::tests::dbInc',
                  schema: 'default',
                  table: 'personTable',
                },
                tableAlias: 'personTable',
              },
            },
            {
              _type: 'relationalPropertyMapping',
              property: {
                class: 'apps::pure::studio::tests::model::simple::Person',
                property: 'lastName',
              },
              relationalOperation: {
                _type: 'column',
                column: 'LASTNAME',
                table: {
                  _type: 'Table',
                  database: 'apps::pure::studio::relational::tests::dbInc',
                  mainTableDb: 'apps::pure::studio::relational::tests::dbInc',
                  schema: 'default',
                  table: 'personTable',
                },
                tableAlias: 'personTable',
              },
            },
          ],
          root: true,
        },
      ],
      enumerationMappings: [],
      includedMappings: [],
      name: 'simpleRelationalMappingInc',
      package: 'apps::pure::studio::relational::tests',
      tests: [],
    },
    classifierPath: 'meta::pure::mapping::Mapping',
  },
  {
    path: 'simple::H2Connection',
    content: {
      _type: 'connection',
      connectionValue: {
        _type: 'RelationalDatabaseConnection',
        authenticationStrategy: {
          _type: 'h2Default',
        },
        datasourceSpecification: {
          _type: 'static',
          databaseName: 'myDb',
          host: 'somehost',
          port: 999,
        },
        element: 'apps::pure::studio::relational::tests::dbInc',
        type: 'H2',
      },
      name: 'H2Connection',
      package: 'simple',
    },
    classifierPath: 'meta::pure::runtime::PackageableConnection',
  },
];

export const simpleGraphFetch = {
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
                  _type: 'class',
                  fullPath: 'demo::other::NPerson',
                },
              ],
            },
            {
              _type: 'rootGraphFetchTree',
              class: 'demo::other::NPerson',
              subTrees: [
                {
                  _type: 'propertyGraphFetchTree',
                  parameters: [],
                  property: 'fullName',
                  subTrees: [],
                },
              ],
            },
          ],
        },
        {
          _type: 'rootGraphFetchTree',
          class: 'demo::other::NPerson',
          subTrees: [
            {
              _type: 'propertyGraphFetchTree',
              parameters: [],
              property: 'fullName',
              subTrees: [],
            },
          ],
        },
      ],
    },
  ],
  parameters: [],
};

export const firmPersonGraphFetch = {
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
                  _type: 'class',
                  fullPath: 'demo::other::NFirm',
                },
              ],
            },
            {
              _type: 'rootGraphFetchTree',
              class: 'demo::other::NFirm',
              subTrees: [
                {
                  _type: 'propertyGraphFetchTree',
                  parameters: [],
                  property: 'nEmployees',
                  subTrees: [
                    {
                      _type: 'propertyGraphFetchTree',
                      parameters: [],
                      property: 'fullName',
                      subTrees: [],
                    },
                  ],
                },
                {
                  _type: 'propertyGraphFetchTree',
                  parameters: [],
                  property: 'incType',
                  subTrees: [],
                },
                {
                  _type: 'propertyGraphFetchTree',
                  parameters: [],
                  property: 'name',
                  subTrees: [],
                },
              ],
            },
          ],
        },
        {
          _type: 'rootGraphFetchTree',
          class: 'demo::other::NFirm',
          subTrees: [
            {
              _type: 'propertyGraphFetchTree',
              parameters: [],
              property: 'nEmployees',
              subTrees: [
                {
                  _type: 'propertyGraphFetchTree',
                  parameters: [],
                  property: 'fullName',
                  subTrees: [],
                },
              ],
            },
            {
              _type: 'propertyGraphFetchTree',
              parameters: [],
              property: 'incType',
              subTrees: [],
            },
            {
              _type: 'propertyGraphFetchTree',
              parameters: [],
              property: 'name',
              subTrees: [],
            },
          ],
        },
      ],
    },
  ],
  parameters: [],
};

export const M2MModel = [
  {
    path: 'demo::other::IncType',
    content: {
      _type: 'Enumeration',
      name: 'IncType',
      package: 'demo::other',
      values: [
        {
          value: 'LLC',
        },
        {
          value: 'CORP',
        },
      ],
    },
    classifierPath: 'meta::pure::metamodel::type::Enumeration',
  },
  {
    path: 'demo::Firm',
    content: {
      _type: 'class',
      constraints: [
        {
          functionDefinition: {
            _type: 'lambda',
            body: [
              {
                _type: 'func',
                function: 'greaterThan',
                parameters: [
                  {
                    _type: 'func',
                    function: 'size',
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
                  {
                    _type: 'integer',
                    multiplicity: {
                      lowerBound: 1,
                      upperBound: 1,
                    },
                    values: [2],
                  },
                ],
              },
            ],
            parameters: [],
          },
          name: 'constraintSize',
        },
      ],
      name: 'Firm',
      package: 'demo',
      properties: [
        {
          multiplicity: {
            lowerBound: 1,
          },
          name: 'employees',
          type: 'demo::Person',
        },
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
          name: 'incType',
          type: 'String',
        },
      ],
      qualifiedProperties: [
        {
          body: [
            {
              _type: 'func',
              function: 'first',
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
          name: 'firstEmployee',
          parameters: [],
          returnMultiplicity: {
            lowerBound: 0,
            upperBound: 1,
          },
          returnType: 'demo::Person',
        },
      ],
      superTypes: ['demo::LegalEntity'],
    },
    classifierPath: 'meta::pure::metamodel::type::Class',
  },
  {
    path: 'demo::LegalEntity',
    content: {
      _type: 'class',
      name: 'LegalEntity',
      package: 'demo',
    },
    classifierPath: 'meta::pure::metamodel::type::Class',
  },
  {
    path: 'demo::Person',
    content: {
      _type: 'class',
      name: 'Person',
      package: 'demo',
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
    path: 'demo::other::NFirm',
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
                    property: 'name',
                  },
                  {
                    _type: 'string',
                    multiplicity: {
                      lowerBound: 1,
                      upperBound: 1,
                    },
                    values: ['MC'],
                  },
                ],
              },
            ],
            parameters: [],
          },
          name: 'namePrefix',
        },
      ],
      name: 'NFirm',
      package: 'demo::other',
      properties: [
        {
          multiplicity: {
            lowerBound: 1,
          },
          name: 'nEmployees',
          type: 'demo::other::NPerson',
        },
        {
          multiplicity: {
            lowerBound: 1,
            upperBound: 1,
          },
          name: 'name',
          type: 'String',
        },
        {
          multiplicity: {
            lowerBound: 1,
            upperBound: 1,
          },
          name: 'incType',
          type: 'demo::other::IncType',
        },
      ],
    },
    classifierPath: 'meta::pure::metamodel::type::Class',
  },
  {
    path: 'demo::other::NPerson',
    content: {
      _type: 'class',
      name: 'NPerson',
      package: 'demo::other',
      properties: [
        {
          multiplicity: {
            lowerBound: 1,
            upperBound: 1,
          },
          name: 'fullName',
          type: 'String',
        },
        {
          multiplicity: {
            lowerBound: 0,
            upperBound: 1,
          },
          name: 'age',
          type: 'Integer',
        },
      ],
    },
    classifierPath: 'meta::pure::metamodel::type::Class',
  },
  {
    path: 'demo::MyMapping',
    content: {
      _type: 'mapping',
      classMappings: [
        {
          _type: 'pureInstance',
          class: 'demo::other::NPerson',
          propertyMappings: [
            {
              _type: 'purePropertyMapping',
              explodeProperty: false,
              property: {
                class: 'demo::other::NPerson',
                property: 'fullName',
              },
              source: '',
              transform: {
                _type: 'lambda',
                body: [
                  {
                    _type: 'func',
                    function: 'plus',
                    parameters: [
                      {
                        _type: 'collection',
                        multiplicity: {
                          lowerBound: 3,
                          upperBound: 3,
                        },
                        values: [
                          {
                            _type: 'property',
                            parameters: [
                              {
                                _type: 'var',
                                name: 'src',
                              },
                            ],
                            property: 'firstName',
                          },
                          {
                            _type: 'string',
                            multiplicity: {
                              lowerBound: 1,
                              upperBound: 1,
                            },
                            values: [' '],
                          },
                          {
                            _type: 'property',
                            parameters: [
                              {
                                _type: 'var',
                                name: 'src',
                              },
                            ],
                            property: 'lastName',
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
          root: true,
          srcClass: 'demo::Person',
        },
        {
          _type: 'pureInstance',
          class: 'demo::other::NFirm',
          propertyMappings: [
            {
              _type: 'purePropertyMapping',
              explodeProperty: false,
              property: {
                class: 'demo::other::NFirm',
                property: 'nEmployees',
              },
              source: '',
              target: 'demo_other_NPerson',
              transform: {
                _type: 'lambda',
                body: [
                  {
                    _type: 'property',
                    parameters: [
                      {
                        _type: 'var',
                        name: 'src',
                      },
                    ],
                    property: 'employees',
                  },
                ],
                parameters: [],
              },
            },
            {
              _type: 'purePropertyMapping',
              explodeProperty: false,
              property: {
                class: 'demo::other::NFirm',
                property: 'name',
              },
              source: '',
              transform: {
                _type: 'lambda',
                body: [
                  {
                    _type: 'property',
                    parameters: [
                      {
                        _type: 'var',
                        name: 'src',
                      },
                    ],
                    property: 'legalName',
                  },
                ],
                parameters: [],
              },
            },
            {
              _type: 'purePropertyMapping',
              enumMappingId: 'demo_other_IncType',
              explodeProperty: false,
              property: {
                class: 'demo::other::NFirm',
                property: 'incType',
              },
              source: '',
              transform: {
                _type: 'lambda',
                body: [
                  {
                    _type: 'property',
                    parameters: [
                      {
                        _type: 'var',
                        name: 'src',
                      },
                    ],
                    property: 'incType',
                  },
                ],
                parameters: [],
              },
            },
          ],
          root: true,
          srcClass: 'demo::Firm',
        },
      ],
      enumerationMappings: [
        {
          enumValueMappings: [
            {
              enumValue: 'LLC',
              sourceValues: [
                {
                  _type: 'stringSourceValue',
                  value: 'llc',
                },
              ],
            },
            {
              enumValue: 'CORP',
              sourceValues: [
                {
                  _type: 'stringSourceValue',
                  value: 'Corporation',
                },
              ],
            },
          ],
          enumeration: 'demo::other::IncType',
        },
      ],
      includedMappings: [],
      name: 'MyMapping',
      package: 'demo',
      tests: [],
    },
    classifierPath: 'meta::pure::mapping::Mapping',
  },
];
