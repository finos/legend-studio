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

export const TEST_DATA__PreviewData_entities = [
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
        {
          multiplicity: {
            lowerBound: 1,
            upperBound: 1,
          },
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
                          name: 'this',
                        },
                      ],
                      property: 'firstName',
                    },
                    {
                      _type: 'string',

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
    path: 'model::MyDatabase',
    content: {
      _type: 'relational',
      filters: [],
      includedStores: [],
      joins: [],
      name: 'MyDatabase',
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
                  name: 'age',
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
    path: 'model::RelationalMapping',
    content: {
      _type: 'mapping',
      classMappings: [
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
              property: {
                owner: 'model::Person',
                property: 'firstName',
              },
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
              property: {
                owner: 'model::Person',
                property: 'lastName',
              },
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
              property: {
                owner: 'model::Person',
                property: 'age',
              },
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
      enumerationMappings: [],
      includedMappings: [],
      name: 'RelationalMapping',
      package: 'model',
      tests: [],
    },
    classifierPath: 'meta::pure::mapping::Mapping',
  },
  {
    path: 'model::Runtime',
    content: {
      _type: 'runtime',
      name: 'Runtime',
      package: 'model',
      runtimeValue: {
        _type: 'engineRuntime',
        connections: [
          {
            store: {
              path: 'model::MyDatabase',
              type: 'STORE',
            },
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
        mappings: [
          {
            path: 'model::RelationalMapping',
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
        },
        element: 'model::MyDatabase',
        quoteIdentifiers: false,
        type: 'H2',
      },
      name: 'MyConnection',
      package: 'model',
    },
    classifierPath: 'meta::pure::runtime::PackageableConnection',
  },
];

export const TEST_DATA__PreviewData_modelCoverageAnalysisResult = {
  mappedEntities: [
    {
      path: 'model::Person',
      properties: [
        {
          _type: 'MappedProperty',
          name: 'age',
        },
        {
          _type: 'MappedProperty',
          name: 'firstName',
        },
        {
          _type: 'MappedProperty',
          name: 'lastName',
        },
      ],
    },
  ],
};

export const TEST_DATA__PreviewData_lambda_non_numeric = {
  _type: 'lambda',
  body: [
    {
      _type: 'func',
      function: 'take',
      parameters: [
        {
          _type: 'func',
          function: 'sort',
          parameters: [
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
                      fullPath: 'model::Person',
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
                          property: 'lastName',
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
                      _type: 'func',
                      function: 'agg',
                      parameters: [
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
                        {
                          _type: 'lambda',
                          body: [
                            {
                              _type: 'func',
                              function: 'count',
                              parameters: [{ _type: 'var', name: 'x' }],
                            },
                          ],
                          parameters: [{ _type: 'var', name: 'x' }],
                        },
                      ],
                    },
                  ],
                },
                {
                  _type: 'collection',
                  multiplicity: { lowerBound: 2, upperBound: 2 },
                  values: [
                    {
                      _type: 'string',
                      value: 'Value',
                    },
                    {
                      _type: 'string',
                      value: 'Count',
                    },
                  ],
                },
              ],
            },
            {
              _type: 'collection',
              multiplicity: { lowerBound: 2, upperBound: 2 },
              values: [
                {
                  _type: 'func',
                  function: 'desc',
                  parameters: [
                    {
                      _type: 'string',
                      value: 'Count',
                    },
                  ],
                },
                {
                  _type: 'func',
                  function: 'asc',
                  parameters: [
                    {
                      _type: 'string',
                      value: 'Value',
                    },
                  ],
                },
              ],
            },
          ],
        },
        {
          _type: 'integer',
          value: 10,
        },
      ],
    },
  ],
  parameters: [],
};

export const TEST_DATA__PreviewData_lambda_numeric = {
  _type: 'lambda',
  body: [
    {
      _type: 'func',
      function: 'take',
      parameters: [
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
                  fullPath: 'model::Person',
                },
              ],
            },
            {
              _type: 'collection',
              multiplicity: { lowerBound: 0, upperBound: 0 },
              values: [],
            },
            {
              _type: 'collection',
              multiplicity: { lowerBound: 8, upperBound: 8 },
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
                          parameters: [{ _type: 'var', name: 'x' }],
                          property: 'age',
                        },
                      ],
                      parameters: [{ _type: 'var', name: 'x' }],
                    },
                    {
                      _type: 'lambda',
                      body: [
                        {
                          _type: 'func',
                          function: 'count',
                          parameters: [{ _type: 'var', name: 'x' }],
                        },
                      ],
                      parameters: [{ _type: 'var', name: 'x' }],
                    },
                  ],
                },
                {
                  _type: 'func',
                  function: 'agg',
                  parameters: [
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
                    {
                      _type: 'lambda',
                      body: [
                        {
                          _type: 'func',
                          function: 'count',
                          parameters: [
                            {
                              _type: 'func',
                              function: 'distinct',
                              parameters: [{ _type: 'var', name: 'x' }],
                            },
                          ],
                        },
                      ],
                      parameters: [{ _type: 'var', name: 'x' }],
                    },
                  ],
                },
                {
                  _type: 'func',
                  function: 'agg',
                  parameters: [
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
                    {
                      _type: 'lambda',
                      body: [
                        {
                          _type: 'func',
                          function: 'sum',
                          parameters: [{ _type: 'var', name: 'x' }],
                        },
                      ],
                      parameters: [{ _type: 'var', name: 'x' }],
                    },
                  ],
                },
                {
                  _type: 'func',
                  function: 'agg',
                  parameters: [
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
                    {
                      _type: 'lambda',
                      body: [
                        {
                          _type: 'func',
                          function: 'min',
                          parameters: [{ _type: 'var', name: 'x' }],
                        },
                      ],
                      parameters: [{ _type: 'var', name: 'x' }],
                    },
                  ],
                },
                {
                  _type: 'func',
                  function: 'agg',
                  parameters: [
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
                    {
                      _type: 'lambda',
                      body: [
                        {
                          _type: 'func',
                          function: 'max',
                          parameters: [{ _type: 'var', name: 'x' }],
                        },
                      ],
                      parameters: [{ _type: 'var', name: 'x' }],
                    },
                  ],
                },
                {
                  _type: 'func',
                  function: 'agg',
                  parameters: [
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
                    {
                      _type: 'lambda',
                      body: [
                        {
                          _type: 'func',
                          function: 'average',
                          parameters: [{ _type: 'var', name: 'x' }],
                        },
                      ],
                      parameters: [{ _type: 'var', name: 'x' }],
                    },
                  ],
                },
                {
                  _type: 'func',
                  function: 'agg',
                  parameters: [
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
                    {
                      _type: 'lambda',
                      body: [
                        {
                          _type: 'func',
                          function: 'stdDevPopulation',
                          parameters: [{ _type: 'var', name: 'x' }],
                        },
                      ],
                      parameters: [{ _type: 'var', name: 'x' }],
                    },
                  ],
                },
                {
                  _type: 'func',
                  function: 'agg',
                  parameters: [
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
                    {
                      _type: 'lambda',
                      body: [
                        {
                          _type: 'func',
                          function: 'stdDevSample',
                          parameters: [{ _type: 'var', name: 'x' }],
                        },
                      ],
                      parameters: [{ _type: 'var', name: 'x' }],
                    },
                  ],
                },
              ],
            },
            {
              _type: 'collection',
              multiplicity: { lowerBound: 8, upperBound: 8 },
              values: [
                {
                  _type: 'string',
                  value: 'Count',
                },
                {
                  _type: 'string',
                  value: 'Distinct Count',
                },
                {
                  _type: 'string',
                  value: 'Sum',
                },
                {
                  _type: 'string',
                  value: 'Min',
                },
                {
                  _type: 'string',
                  value: 'Max',
                },
                {
                  _type: 'string',
                  value: 'Average',
                },
                {
                  _type: 'string',
                  value: 'Std Dev (Population)',
                },
                {
                  _type: 'string',
                  value: 'Std Dev (Sample)',
                },
              ],
            },
          ],
        },
        {
          _type: 'integer',
          value: 1000,
        },
      ],
    },
  ],
  parameters: [],
};
