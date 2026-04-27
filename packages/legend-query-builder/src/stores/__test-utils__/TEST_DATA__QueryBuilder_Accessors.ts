/**
 * Copyright (c) 2026-present, Goldman Sachs
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

export const TEST_DATA__QueryBuilder_Accessors_SimpleProjection_WithFilter = {
  _type: 'lambda',
  body: [
    {
      _type: 'func',
      function: 'from',
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
                  _type: 'classInstance',
                  multiplicity: {
                    lowerBound: 1,
                    upperBound: 1,
                  },
                  type: '>',
                  value: {
                    path: ['database::TestDatabase', 'default', 'TEST0'],
                  },
                },
                {
                  _type: 'lambda',
                  body: [
                    {
                      _type: 'func',
                      function: 'and',
                      parameters: [
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
                              property: 'FIRSTNAME',
                            },
                            {
                              _type: 'string',
                              value: 'John',
                            },
                          ],
                        },
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
                              property: 'LASTNAME',
                            },
                            {
                              _type: 'string',
                              value: 'Doe',
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
              _type: 'classInstance',
              multiplicity: {
                lowerBound: 1,
                upperBound: 1,
              },
              type: 'colSpecArray',
              value: {
                colSpecs: [
                  {
                    function1: {
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
                          property: 'FIRSTNAME',
                        },
                      ],
                      parameters: [
                        {
                          _type: 'var',
                          name: 'x',
                        },
                      ],
                    },
                    name: 'Firstname',
                  },
                  {
                    function1: {
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
                          property: 'LASTNAME',
                        },
                      ],
                      parameters: [
                        {
                          _type: 'var',
                          name: 'x',
                        },
                      ],
                    },
                    name: 'Lastname',
                  },
                ],
              },
            },
          ],
        },
        {
          _type: 'packageableElementPtr',
          fullPath: 'runtime::TestRuntime',
        },
      ],
    },
  ],
  parameters: [],
};

export const TEST_DATA__QueryBuilder_Accessors_SimpleProjection_WithPostFilter =
  {
    _type: 'lambda',
    body: [
      {
        _type: 'func',
        function: 'from',
        parameters: [
          {
            _type: 'func',
            function: 'filter',
            parameters: [
              {
                _type: 'func',
                function: 'project',
                parameters: [
                  {
                    _type: 'classInstance',
                    multiplicity: {
                      lowerBound: 1,
                      upperBound: 1,
                    },
                    type: 'I',
                    value: {
                      path: [
                        'ingestion::CARBON_DIOXIDE_EMISSIONS',
                        'CARBON_DIOXIDE_EMISSIONS',
                      ],
                      metadata: false,
                    },
                  },
                  {
                    _type: 'classInstance',
                    multiplicity: {
                      lowerBound: 1,
                      upperBound: 1,
                    },
                    type: 'colSpecArray',
                    value: {
                      colSpecs: [
                        {
                          function1: {
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
                                property: 'country',
                              },
                            ],
                            parameters: [
                              {
                                _type: 'var',
                                name: 'x',
                              },
                            ],
                          },
                          name: 'Country',
                        },
                        {
                          function1: {
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
                                property: 'year',
                              },
                            ],
                            parameters: [
                              {
                                _type: 'var',
                                name: 'x',
                              },
                            ],
                          },
                          name: 'Year',
                        },
                        {
                          function1: {
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
                                property: 'iso_code',
                              },
                            ],
                            parameters: [
                              {
                                _type: 'var',
                                name: 'x',
                              },
                            ],
                          },
                          name: 'Iso code',
                        },
                        {
                          function1: {
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
                                property: 'population',
                              },
                            ],
                            parameters: [
                              {
                                _type: 'var',
                                name: 'x',
                              },
                            ],
                          },
                          name: 'Population',
                        },
                        {
                          function1: {
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
                                property: 'gdp',
                              },
                            ],
                            parameters: [
                              {
                                _type: 'var',
                                name: 'x',
                              },
                            ],
                          },
                          name: 'Gdp',
                        },
                        {
                          function1: {
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
                                property: 'trade_co2_share',
                              },
                            ],
                            parameters: [
                              {
                                _type: 'var',
                                name: 'x',
                              },
                            ],
                          },
                          name: 'Trade co 2 share',
                        },
                      ],
                    },
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
                            name: 'row',
                          },
                        ],
                        property: 'Gdp',
                      },
                      {
                        _type: 'string',
                        value: 'test',
                      },
                    ],
                  },
                ],
                parameters: [
                  {
                    _type: 'var',
                    name: 'row',
                  },
                ],
              },
            ],
          },
          {
            _type: 'packageableElementPtr',
            fullPath: 'runtime::LakehouseRuntime',
          },
        ],
      },
    ],
    parameters: [],
  };

export const TEST_DATA__QueryBuilder_Accessors_SimpleProjectionWithDatabase_WithPostFilter =
  {
    _type: 'lambda',
    body: [
      {
        _type: 'func',
        function: 'from',
        parameters: [
          {
            _type: 'func',
            function: 'project',
            parameters: [
              {
                _type: 'classInstance',
                multiplicity: {
                  lowerBound: 1,
                  upperBound: 1,
                },
                type: '>',
                value: {
                  path: ['database::TestDatabase', 'default', 'TEST0'],
                },
              },
              {
                _type: 'classInstance',
                multiplicity: {
                  lowerBound: 1,
                  upperBound: 1,
                },
                type: 'colSpecArray',
                value: {
                  colSpecs: [
                    {
                      function1: {
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
                            property: 'FIRSTNAME',
                          },
                        ],
                        parameters: [
                          {
                            _type: 'var',
                            name: 'x',
                          },
                        ],
                      },
                      name: 'Firstname',
                    },
                    {
                      function1: {
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
                            property: 'LASTNAME',
                          },
                        ],
                        parameters: [
                          {
                            _type: 'var',
                            name: 'x',
                          },
                        ],
                      },
                      name: 'Lastname',
                    },
                  ],
                },
              },
            ],
          },
          {
            _type: 'packageableElementPtr',
            fullPath: 'runtime::LakehouseRuntime',
          },
        ],
      },
    ],
    parameters: [],
  };

export const TEST_DATA__QueryBuilder_Accessors = [
  {
    path: 'database::TestDatabase',
    content: {
      _type: 'relational',
      filters: [],
      joins: [],
      name: 'TestDatabase',
      package: 'database',
      schemas: [
        {
          name: 'default',
          tables: [
            {
              columns: [
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
              name: 'TEST0',
              primaryKey: [],
            },
          ],
          views: [],
        },
      ],
    },
    classifierPath: 'meta::relational::metamodel::Database',
  },
  {
    path: 'runtime::LakehouseRuntime',
    content: {
      _type: 'runtime',
      name: 'LakehouseRuntime',
      package: 'runtime',
      runtimeValue: {
        _type: 'LakehouseRuntime',
        connectionStores: [],
        connections: [],
        mappings: [],
        environment: 'dataeng-pp',
        warehouse: 'LAKEHOUSE_CONSUMER_DEFAULT_WH',
      },
    },
    classifierPath: 'meta::pure::runtime::PackageableRuntime',
  },
  {
    path: 'runtime::TestRuntime',
    content: {
      _type: 'runtime',
      name: 'TestRuntime',
      package: 'runtime',
      runtimeValue: {
        _type: 'engineRuntime',
        connectionStores: [],
        connections: [
          {
            store: {
              path: 'database::TestDatabase',
              type: 'STORE',
            },
            storeConnections: [
              {
                connection: {
                  _type: 'connectionPointer',
                  connection: 'runtime::TestConnection',
                },
                id: 'connection',
              },
            ],
          },
        ],
        mappings: [],
      },
    },
    classifierPath: 'meta::pure::runtime::PackageableRuntime',
  },
  {
    path: 'runtime::TestConnection',
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
          testDataSetupSqls: [''],
        },
        element: 'database::TestDatabase',
        type: 'H2',
      },
      name: 'TestConnection',
      package: 'runtime',
    },
    classifierPath: 'meta::pure::runtime::PackageableConnection',
  },
  {
    path: 'ingestion::CARBON_DIOXIDE_EMISSIONS',
    content: {
      _type: 'ingestDefinition',
      name: 'CARBON_DIOXIDE_EMISSIONS',
      readMode: {
        _type: 'Snapshot',
      },
      writeMode: {
        _type: 'batch_milestoned',
      },
      datasets: [
        {
          name: 'CARBON_DIOXIDE_EMISSIONS',
          primaryKey: ['country', 'year'],
          ingestPartitionColumns: [],
          storageLayoutClusterColumns: [],
          storageLayoutPartitionColumns: [],
          source: {
            _type: 'serializedSource',
            schema: {
              _type: 'relationType',
              columns: [
                {
                  name: 'country',
                  genericType: {
                    rawType: {
                      _type: 'packageableType',
                      fullPath: 'Varchar',
                    },
                    typeArguments: [],
                    multiplicityArguments: [],
                    typeVariableValues: [
                      {
                        _type: 'integer',
                        value: 255,
                      },
                    ],
                  },
                  multiplicity: {
                    lowerBound: 1,
                    upperBound: 1,
                  },
                },
                {
                  name: 'year',
                  genericType: {
                    rawType: {
                      _type: 'packageableType',
                      fullPath: 'BigInt',
                    },
                    typeArguments: [],
                    multiplicityArguments: [],
                    typeVariableValues: [],
                  },
                  multiplicity: {
                    lowerBound: 1,
                    upperBound: 1,
                  },
                },
                {
                  name: 'iso_code',
                  genericType: {
                    rawType: {
                      _type: 'packageableType',
                      fullPath: 'Varchar',
                    },
                    typeArguments: [],
                    multiplicityArguments: [],
                    typeVariableValues: [
                      {
                        _type: 'integer',
                        value: 255,
                      },
                    ],
                  },
                  multiplicity: {
                    lowerBound: 0,
                    upperBound: 0,
                  },
                },
                {
                  name: 'population',
                  genericType: {
                    rawType: {
                      _type: 'packageableType',
                      fullPath: 'Double',
                    },
                    typeArguments: [],
                    multiplicityArguments: [],
                    typeVariableValues: [],
                  },
                  multiplicity: {
                    lowerBound: 0,
                    upperBound: 0,
                  },
                },
                {
                  name: 'gdp',
                  genericType: {
                    rawType: {
                      _type: 'packageableType',
                      fullPath: 'Varchar',
                    },
                    typeArguments: [],
                    multiplicityArguments: [],
                    typeVariableValues: [
                      {
                        _type: 'integer',
                        value: 255,
                      },
                    ],
                  },
                  multiplicity: {
                    lowerBound: 0,
                    upperBound: 0,
                  },
                },
                {
                  name: 'trade_co2_share',
                  genericType: {
                    rawType: {
                      _type: 'packageableType',
                      fullPath: 'Varchar',
                    },
                    typeArguments: [],
                    multiplicityArguments: [],
                    typeVariableValues: [
                      {
                        _type: 'integer',
                        value: 255,
                      },
                    ],
                  },
                  multiplicity: {
                    lowerBound: 0,
                    upperBound: 0,
                  },
                },
              ],
            },
            format: {
              _type: 'CSV',
              fieldDelimiter: '\u001f',
              headerRowsToSkipCount: 0,
              recordDelimiter: '\u001e\n',
              parseHeader: false,
            },
          },
          privacyClassification: {
            sensitivity: 'DP10',
          },
          preprocessors: [],
        },
      ],
      datasetGroup: 'VLF_DEMO_DATA',
      owner: {
        _type: 'appDir',
        prodParallel: {
          appDirId: 270520,
          level: 'DEPLOYMENT',
        },
        production: {
          appDirId: 270523,
          level: 'DEPLOYMENT',
        },
      },
      stereotypes: [],
      taggedValues: [],
      package: 'ingestion',
    },
    classifierPath:
      'meta::external::ingest::specification::metamodel::IngestDefinition',
  },
];
