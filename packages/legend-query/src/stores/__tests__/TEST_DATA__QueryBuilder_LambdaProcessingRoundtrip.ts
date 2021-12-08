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

export const TEST_DATA__simpleAllFunc = {
  _type: 'lambda',
  body: [
    {
      _type: 'func',
      function: 'getAll',
      parameters: [
        {
          _type: 'packageableElementPtr',
          fullPath: 'test::Person',
        },
      ],
    },
  ],
  parameters: [],
};

export const TEST_DATA__allFuncOnBusinessTemporalMilestonedClass = {
  _type: 'lambda',
  body: [
    {
      _type: 'func',
      function: 'getAll',
      parameters: [
        {
          _type: 'packageableElementPtr',
          fullPath: 'test::Person',
        },
        {
          _type: 'var',
          name: 'businessDate',
        },
      ],
    },
  ],
  parameters: [
    {
      _type: 'var',
      class: 'StrictDate',
      name: 'businessDate',
      multiplicity: {
        lowerBound: '1',
        upperBound: '1',
      },
    },
  ],
};

export const TEST_DATA__allFuncOnProcessingTemporalMilestonedClass = {
  _type: 'lambda',
  body: [
    {
      _type: 'func',
      function: 'getAll',
      parameters: [
        {
          _type: 'packageableElementPtr',
          fullPath: 'test::Person',
        },
        {
          _type: 'var',
          name: 'processingDate',
        },
      ],
    },
  ],
  parameters: [
    {
      _type: 'var',
      class: 'StrictDate',
      name: 'processingDate',
      multiplicity: {
        lowerBound: '1',
        upperBound: '1',
      },
    },
  ],
};

export const TEST_DATA__allFuncOnBiTemporalMilestonedClass = {
  _type: 'lambda',
  body: [
    {
      _type: 'func',
      function: 'getAll',
      parameters: [
        {
          _type: 'packageableElementPtr',
          fullPath: 'test::Person',
        },
        {
          _type: 'var',
          name: 'processingDate',
        },
        {
          _type: 'var',
          name: 'businessDate',
        },
      ],
    },
  ],
  parameters: [
    {
      _type: 'var',
      class: 'StrictDate',
      name: 'processingDate',
      multiplicity: {
        lowerBound: '1',
        upperBound: '1',
      },
    },
    {
      _type: 'var',
      class: 'StrictDate',
      name: 'businessDate',
      multiplicity: {
        lowerBound: '1',
        upperBound: '1',
      },
    },
  ],
};

export const TEST_DATA__simpleFilterFunc = {
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
              _type: 'packageableElementPtr',
              fullPath: 'test::Person',
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

export const TEST_DATA__simpleProjection = {
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
              fullPath: 'test::Person',
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

export const TEST_DATA__projectWithCols = {
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
              fullPath: 'test::Person',
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
              _type: 'string',
              multiplicity: {
                lowerBound: 1,
                upperBound: 1,
              },
              values: ['firstName'],
            },
            {
              _type: 'string',
              multiplicity: {
                lowerBound: 1,
                upperBound: 1,
              },
              values: ['Last Name S'],
            },
          ],
        },
      ],
    },
  ],
  parameters: [],
};

export const TEST_DATA__simpleProjectionWithFilter = {
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
                  fullPath: 'test::Person',
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

export const TEST_DATA__complexRelationalModel = [
  {
    path: 'test::Person',
    content: {
      _type: 'class',
      name: 'Person',
      package: 'test',
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
          class: 'test::Person',
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
                class: 'test::Person',
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
                class: 'test::Person',
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

export const TEST_DATA__temporalModel = [
  {
    path: 'test::Person',
    content: {
      _type: 'class',
      name: 'Person',
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
        {
          multiplicity: {
            lowerBound: 1,
            upperBound: 1,
          },
          name: 'firmID',
          type: 'Integer',
        },
        {
          multiplicity: {
            lowerBound: 1,
            upperBound: 1,
          },
          name: 'date',
          type: 'StrictDate',
        },
      ],
      stereotypes: [
        {
          profile: 'temporal',
          value: 'businesstemporal',
        },
      ],
    },
    classifierPath: 'meta::pure::metamodel::type::Class',
  },
  {
    path: 'test::Person1',
    content: {
      _type: 'class',
      name: 'Person1',
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
        {
          multiplicity: {
            lowerBound: 1,
            upperBound: 1,
          },
          name: 'firmID',
          type: 'Integer',
        },
        {
          multiplicity: {
            lowerBound: 1,
            upperBound: 1,
          },
          name: 'date',
          type: 'StrictDate',
        },
      ],
      stereotypes: [
        {
          profile: 'temporal',
          value: 'processingtemporal',
        },
      ],
    },
    classifierPath: 'meta::pure::metamodel::type::Class',
  },
  {
    path: 'test::Person2',
    content: {
      _type: 'class',
      name: 'Person2',
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
        {
          multiplicity: {
            lowerBound: 1,
            upperBound: 1,
          },
          name: 'firmID',
          type: 'Integer',
        },
        {
          multiplicity: {
            lowerBound: 1,
            upperBound: 1,
          },
          name: 'date',
          type: 'StrictDate',
        },
      ],
      stereotypes: [
        {
          profile: 'temporal',
          value: 'bitemporal',
        },
      ],
    },
    classifierPath: 'meta::pure::metamodel::type::Class',
  },
  {
    path: 'my::map',
    content: {
      _type: 'mapping',
      classMappings: [
        {
          _type: 'pureInstance',
          class: 'test::Person',
          propertyMappings: [
            {
              _type: 'purePropertyMapping',
              property: {
                class: 'test::Person',
                property: 'name',
              },
              source: '',
              transform: {
                _type: 'lambda',
                body: [
                  {
                    _type: 'string',
                    multiplicity: {
                      lowerBound: 1,
                      upperBound: 1,
                    },
                    values: ['name'],
                  },
                ],
                parameters: [],
              },
            },
          ],
          root: true,
        },
        {
          _type: 'pureInstance',
          class: 'test::Person1',
          propertyMappings: [
            {
              _type: 'purePropertyMapping',
              property: {
                class: 'test::Person1',
                property: 'name',
              },
              source: '',
              transform: {
                _type: 'lambda',
                body: [
                  {
                    _type: 'string',
                    multiplicity: {
                      lowerBound: 1,
                      upperBound: 1,
                    },
                    values: ['name'],
                  },
                ],
                parameters: [],
              },
            },
          ],
          root: true,
        },
        {
          _type: 'pureInstance',
          class: 'test::Person2',
          propertyMappings: [
            {
              _type: 'purePropertyMapping',
              property: {
                class: 'test::Person2',
                property: 'name',
              },
              source: '',
              transform: {
                _type: 'lambda',
                body: [
                  {
                    _type: 'string',
                    multiplicity: {
                      lowerBound: 1,
                      upperBound: 1,
                    },
                    values: ['name'],
                  },
                ],
                parameters: [],
              },
            },
          ],
          root: true,
        },
      ],
      enumerationMappings: [],
      includedMappings: [],
      name: 'map',
      package: 'my',
      tests: [],
    },
    classifierPath: 'meta::pure::mapping::Mapping',
  },
];

export const TEST_DATA__simpleGraphFetch = {
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

export const TEST_DATA__firmPersonGraphFetch = {
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

export const TEST_DATA__graphFetchWithDerivedProperty = {
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
                  property: 'firstEmployee',
                  subTrees: [
                    {
                      _type: 'propertyGraphFetchTree',
                      parameters: [],
                      property: 'age',
                      subTrees: [],
                    },
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
        },
        {
          _type: 'rootGraphFetchTree',
          class: 'demo::other::NFirm',
          subTrees: [
            {
              _type: 'propertyGraphFetchTree',
              parameters: [],
              property: 'firstEmployee',
              subTrees: [
                {
                  _type: 'propertyGraphFetchTree',
                  parameters: [],
                  property: 'age',
                  subTrees: [],
                },
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
    },
  ],
  parameters: [],
};

export const TEST_DATA__graphFetchWithDerivedPropertyWithParameter = {
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
                  parameters: [
                    {
                      _type: 'string',
                      values: ['My name is '],
                      multiplicity: {
                        lowerBound: 1,
                        upperBound: 1,
                      },
                    },
                    {
                      _type: 'string',
                      values: ['.'],
                      multiplicity: {
                        lowerBound: 1,
                        upperBound: 1,
                      },
                    },
                  ],
                  property: 'myName',
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
              parameters: [
                {
                  _type: 'string',
                  values: ['My name is '],
                  multiplicity: {
                    lowerBound: 1,
                    upperBound: 1,
                  },
                },
                {
                  _type: 'string',
                  values: ['.'],
                  multiplicity: {
                    lowerBound: 1,
                    upperBound: 1,
                  },
                },
              ],
              property: 'myName',
              subTrees: [],
            },
          ],
        },
      ],
    },
  ],
  parameters: [],
};

export const TEST_DATA__personWithParameter = {
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
                  fullPath: 'test::Person',
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
                          name: 'x',
                        },
                      ],
                      property: 'firstName',
                    },
                    {
                      _type: 'var',
                      name: 'firstName',
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
          values: [
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
          ],
          multiplicity: {
            lowerBound: 2,
            upperBound: 2,
          },
        },
        {
          _type: 'collection',
          values: [
            {
              _type: 'string',
              values: ['First Name'],
              multiplicity: {
                lowerBound: 1,
                upperBound: 1,
              },
            },
            {
              _type: 'string',
              values: ['Last Name'],
              multiplicity: {
                lowerBound: 1,
                upperBound: 1,
              },
            },
          ],
          multiplicity: {
            lowerBound: 2,
            upperBound: 2,
          },
        },
      ],
    },
  ],
  parameters: [
    {
      _type: 'var',
      class: 'String',
      name: 'firstName',
      multiplicity: {
        lowerBound: 1,
        upperBound: 1,
      },
    },
  ],
};

export const TEST_DATA__M2MModel = [
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
                        property: 'employees',
                        parameters: [
                          {
                            _type: 'var',
                            name: 'this',
                          },
                        ],
                      },
                    ],
                  },
                  {
                    _type: 'integer',
                    values: [2],
                    multiplicity: {
                      lowerBound: 1,
                      upperBound: 1,
                    },
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
                  property: 'employees',
                  parameters: [
                    {
                      _type: 'var',
                      name: 'this',
                    },
                  ],
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
                    property: 'name',
                    parameters: [
                      {
                        _type: 'var',
                        name: 'this',
                      },
                    ],
                  },
                  {
                    _type: 'string',
                    values: ['MC'],
                    multiplicity: {
                      lowerBound: 1,
                      upperBound: 1,
                    },
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
                  property: 'nEmployees',
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
          returnType: 'demo::other::NPerson',
        },
        {
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
                      _type: 'var',
                      name: 'prefix',
                    },
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
                      _type: 'var',
                      name: 'suffix',
                    },
                  ],
                },
              ],
            },
          ],
          name: 'myName',
          parameters: [
            {
              _type: 'var',
              class: 'String',
              multiplicity: {
                lowerBound: 1,
                upperBound: 1,
              },
              name: 'suffix',
            },
            {
              _type: 'var',
              class: 'String',
              multiplicity: {
                lowerBound: 1,
                upperBound: 1,
              },
              name: 'prefix',
            },
          ],
          returnMultiplicity: {
            lowerBound: 1,
            upperBound: 1,
          },
          returnType: 'String',
        },
      ],
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
                        values: [
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
                          {
                            _type: 'string',
                            values: [' '],
                            multiplicity: {
                              lowerBound: 1,
                              upperBound: 1,
                            },
                          },
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
                    property: 'employees',
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
                class: 'demo::other::NFirm',
                property: 'name',
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
                    property: 'incType',
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

export const TEST_DATA__simpleGroupBy = {
  _type: 'lambda',
  body: [
    {
      _type: 'func',
      function: 'groupBy',
      parameters: [
        {
          _type: 'func',
          function: 'getAll',
          parameters: [
            {
              _type: 'packageableElementPtr',
              fullPath: 'test::Person',
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
          ],
          multiplicity: {
            lowerBound: 1,
            upperBound: 1,
          },
        },
        {
          _type: 'collection',
          values: [
            {
              _type: 'func',
              function: 'agg',
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
                  _type: 'lambda',
                  body: [
                    {
                      _type: 'func',
                      function: 'uniqueValueOnly',
                      parameters: [
                        {
                          _type: 'var',
                          name: 'y',
                        },
                      ],
                    },
                  ],
                  parameters: [
                    {
                      _type: 'var',
                      name: 'y',
                    },
                  ],
                },
              ],
            },
          ],
          multiplicity: {
            lowerBound: 1,
            upperBound: 1,
          },
        },
        {
          _type: 'collection',
          values: [
            {
              _type: 'string',
              values: ['Last Name'],
              multiplicity: {
                lowerBound: 1,
                upperBound: 1,
              },
            },
            {
              _type: 'string',
              values: ['Last Name2'],
              multiplicity: {
                lowerBound: 1,
                upperBound: 1,
              },
            },
            {
              _type: 'string',
              values: ['Last Name3'],
              multiplicity: {
                lowerBound: 1,
                upperBound: 1,
              },
            },
          ],
          multiplicity: {
            lowerBound: 1,
            upperBound: 1,
          },
        },
      ],
    },
  ],
  parameters: [],
};
