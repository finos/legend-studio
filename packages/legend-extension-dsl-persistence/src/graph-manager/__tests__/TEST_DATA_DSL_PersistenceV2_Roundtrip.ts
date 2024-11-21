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

export const TEST_DATA__roundtrip_append_only_allow_duplicates = [
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
    },
    classifierPath: 'meta::pure::metamodel::type::Class',
  },
  {
    path: 'test::ServiceResult',
    content: {
      _type: 'class',
      name: 'ServiceResult',
      package: 'test',
      properties: [
        {
          multiplicity: {
            lowerBound: 1,
            upperBound: 1,
          },
          name: 'ID',
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
          multiplicity: {
            lowerBound: 1,
            upperBound: 1,
          },
          name: 'NAME',
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
    },
    classifierPath: 'meta::pure::metamodel::type::Class',
  },
  {
    path: 'test::TestDatabase',
    content: {
      _type: 'relational',
      filters: [],
      includedStores: [],
      joins: [],
      name: 'TestDatabase',
      package: 'test',
      schemas: [
        {
          name: 'default',
          tables: [
            {
              columns: [
                {
                  name: 'ID',
                  nullable: true,
                  type: {
                    _type: 'Integer',
                  },
                },
                {
                  name: 'NAME',
                  nullable: true,
                  type: {
                    _type: 'Varchar',
                    size: 100,
                  },
                },
              ],
              name: 'personTable',
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
    path: 'test::Mapping',
    content: {
      _type: 'mapping',
      classMappings: [],
      enumerationMappings: [],
      includedMappings: [],
      name: 'Mapping',
      package: 'test',
      tests: [],
    },
    classifierPath: 'meta::pure::mapping::Mapping',
  },
  {
    path: 'test::Service',
    content: {
      _type: 'service',
      autoActivateUpdates: true,
      documentation: 'test',
      execution: {
        _type: 'pureSingleExecution',
        func: {
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
              property: 'name',
            },
          ],
          parameters: [
            {
              _type: 'var',
              class: 'test::Person',
              multiplicity: {
                lowerBound: 1,
                upperBound: 1,
              },
              name: 'src',
            },
          ],
        },
        mapping: 'test::Mapping',
        runtime: {
          _type: 'engineRuntime',
          connectionStores: [],
          connections: [],
          mappings: [
            {
              path: 'test::Mapping',
              type: 'MAPPING',
            },
          ],
        },
      },
      name: 'Service',
      owners: [],
      package: 'test',
      pattern: 'test',
    },
    classifierPath: 'meta::legend::service::metamodel::Service',
  },
  {
    path: 'test::TestPersistence',
    content: {
      _type: 'persistence',
      documentation: 'This is test documentation.',
      name: 'TestPersistence',
      notifier: {},
      package: 'test',
      serviceOutputTargets: [
        {
          serviceOutput: {
            _type: 'tdsServiceOutput',
            datasetType: {
              _type: 'delta',
              actionIndicator: {
                _type: 'noActionIndicator',
              },
            },
            deduplication: {
              _type: 'noDeduplication',
            },
            keys: [],
          },
          persistenceTarget: {
            _type: 'relationalPersistenceTarget',
            table: 'personTable',
            database: 'test::TestDatabase',
            temporality: {
              _type: 'none',
              auditing: {
                _type: 'noAuditing',
              },
              updatesHandling: {
                _type: 'appendOnly',
                appendStrategy: {
                  _type: 'allowDuplicates',
                },
              },
            },
          },
        },
      ],
      service: 'test::Service',
      tests: [
        {
          _type: 'test',
          id: 'test1',
          isTestDataFromServiceOutput: true,
          testBatches: [
            {
              assertions: [
                {
                  _type: 'equalToJson',
                  expected: {
                    _type: 'externalFormat',
                    contentType: 'application/json',
                    data: '[{"ID":1, "NAME":"ANDY"},{"ID":2, "NAME":"BRAD"}]',
                  },
                  id: 'assert1',
                },
              ],
              id: 'testBatch1',
              testData: {
                connection: {
                  data: {
                    _type: 'externalFormat',
                    contentType: 'application/json',
                    data: '[{"ID":1, "NAME":"ANDY"},{"ID":2, "NAME":"BRAD"}]',
                  },
                },
              },
            },
            {
              assertions: [
                {
                  _type: 'equalToJson',
                  expected: {
                    _type: 'externalFormat',
                    contentType: 'application/json',
                    data: '[{"ID":1, "NAME":"ANDY"},{"ID":2, "NAME":"BRAD"},{"ID":2, "NAME":"BRAD"},{"ID":3, "NAME":"CATHY"},{"ID":4, "NAME":"TOM"}]',
                  },
                  id: 'assert1',
                },
              ],
              id: 'testBatch2',
              testData: {
                connection: {
                  data: {
                    _type: 'externalFormat',
                    contentType: 'application/json',
                    data: '[{"ID":2, "NAME":"BRAD"},{"ID":3, "NAME":"CATHY"},{"ID":4, "NAME":"TOM"}]',
                  },
                },
              },
            },
          ],
        },
      ],
      trigger: {
        _type: 'manualTrigger',
      },
    },
    classifierPath: 'meta::pure::persistence::metamodel::Persistence',
  },
];

export const TEST_DATA__roundtrip_bitemporal_no_del_ind_user_specifies_from = [
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
    },
    classifierPath: 'meta::pure::metamodel::type::Class',
  },
  {
    path: 'test::ServiceResult',
    content: {
      _type: 'class',
      name: 'ServiceResult',
      package: 'test',
      properties: [
        {
          multiplicity: {
            lowerBound: 1,
            upperBound: 1,
          },
          name: 'ID',
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
          multiplicity: {
            lowerBound: 1,
            upperBound: 1,
          },
          name: 'AMOUNT',
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
          name: 'SOURCE_FROM',
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
    },
    classifierPath: 'meta::pure::metamodel::type::Class',
  },
  {
    path: 'test::TestDatabase',
    content: {
      _type: 'relational',
      filters: [],
      includedStores: [],
      joins: [],
      name: 'TestDatabase',
      package: 'test',
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
                  name: 'AMOUNT',
                  nullable: true,
                  type: {
                    _type: 'Integer',
                  },
                },
                {
                  name: 'FROM_Z',
                  nullable: false,
                  type: {
                    _type: 'Timestamp',
                  },
                },
                {
                  name: 'THRU_Z',
                  nullable: true,
                  type: {
                    _type: 'Timestamp',
                  },
                },
                {
                  name: 'IN_Z',
                  nullable: false,
                  type: {
                    _type: 'Timestamp',
                  },
                },
                {
                  name: 'OUT_Z',
                  nullable: true,
                  type: {
                    _type: 'Timestamp',
                  },
                },
              ],
              name: 'personTable',
              primaryKey: ['ID', 'FROM_Z', 'IN_Z'],
            },
          ],
          views: [],
        },
      ],
    },
    classifierPath: 'meta::relational::metamodel::Database',
  },
  {
    path: 'test::Mapping',
    content: {
      _type: 'mapping',
      classMappings: [],
      enumerationMappings: [],
      includedMappings: [],
      name: 'Mapping',
      package: 'test',
      tests: [],
    },
    classifierPath: 'meta::pure::mapping::Mapping',
  },
  {
    path: 'test::Service',
    content: {
      _type: 'service',
      autoActivateUpdates: true,
      documentation: 'test',
      execution: {
        _type: 'pureSingleExecution',
        func: {
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
              property: 'name',
            },
          ],
          parameters: [
            {
              _type: 'var',
              genericType: {
                rawType: {
                  _type: 'packageableType',
                  fullPath: 'test::Person',
                },
                typeArguments: [],
                typeVariableValues: [],
              },
              multiplicity: {
                lowerBound: 1,
                upperBound: 1,
              },
              name: 'src',
            },
          ],
        },
        mapping: 'test::Mapping',
        runtime: {
          _type: 'engineRuntime',
          connectionStores: [],
          connections: [],
          mappings: [
            {
              path: 'test::Mapping',
              type: 'MAPPING',
            },
          ],
        },
      },
      name: 'Service',
      owners: [],
      package: 'test',
      pattern: 'test',
      test: {
        _type: 'singleExecutionTest',
        asserts: [],
        data: 'test',
      },
    },
    classifierPath: 'meta::legend::service::metamodel::Service',
  },
  {
    path: 'test::TestPersistence',
    content: {
      _type: 'persistence',
      documentation: 'This is test documentation.',
      name: 'TestPersistence',
      notifier: {},
      package: 'test',
      serviceOutputTargets: [
        {
          serviceOutput: {
            _type: 'tdsServiceOutput',
            datasetType: {
              _type: 'delta',
              actionIndicator: {
                _type: 'noActionIndicator',
              },
            },
            deduplication: {
              _type: 'noDeduplication',
            },
            keys: ['ID'],
          },
          persistenceTarget: {
            _type: 'relationalPersistenceTarget',
            table: 'personTable',
            database: 'test::TestDatabase',
            temporality: {
              _type: 'bitemporalTemporality',
              processingDimension: {
                _type: 'processingTime',
                timeIn: 'IN_Z',
                timeOut: 'OUT_Z',
              },
              sourceDerivedDimension: {
                _type: 'sourceDerivedTime',
                timeStart: 'FROM_Z',
                timeEnd: 'THRU_Z',
                sourceTimeFields: {
                  _type: 'sourceTimeStartAndEnd',
                  startField: 'SOURCE_FROM',
                },
              },
            },
          },
        },
      ],
      service: 'test::Service',
      tests: [
        {
          _type: 'test',
          id: 'test1',
          isTestDataFromServiceOutput: true,
          testBatches: [
            {
              assertions: [
                {
                  _type: 'equalToJson',
                  expected: {
                    _type: 'externalFormat',
                    contentType: 'application/json',
                    data: '[{"ID":1, "AMOUNT":100,  "FROM_Z": "2022-01-01 00:00:00.0", "THRU_Z": "9999-12-31 23:59:59.0"},{"ID":2, "AMOUNT":200, "FROM_Z": "2022-01-01 00:00:00.0", "THRU_Z": "9999-12-31 23:59:59.0"},{"ID":3, "AMOUNT":400, "FROM_Z": "2022-01-01 00:00:00.0", "THRU_Z": "9999-12-31 23:59:59.0"}]',
                  },
                  id: 'assert1',
                },
              ],
              id: 'testBatch1',
              testData: {
                connection: {
                  data: {
                    _type: 'externalFormat',
                    contentType: 'application/json',
                    data: '[{"ID":1, "AMOUNT":100, "SOURCE_FROM": "2022-01-01 00:00:00.0"},{"ID":2, "AMOUNT":200, "SOURCE_FROM": "2022-01-01 00:00:00.0"},{"ID":3, "AMOUNT":400, "SOURCE_FROM": "2022-01-01 00:00:00.0"}]',
                  },
                },
              },
            },
            {
              assertions: [
                {
                  _type: 'equalToJson',
                  expected: {
                    _type: 'externalFormat',
                    contentType: 'application/json',
                    data: '[{"ID":1,"AMOUNT":100,"THRU_Z":"9999-12-31 23:59:59.0","FROM_Z":"2022-01-01 00:00:00.0"},{"ID":2,"AMOUNT":200,"THRU_Z":"9999-12-31 23:59:59.0","FROM_Z":"2022-01-01 00:00:00.0"},{"ID":3,"AMOUNT":400,"THRU_Z":"9999-12-31 23:59:59.0","FROM_Z":"2022-01-01 00:00:00.0"},{"ID":1,"AMOUNT":200,"THRU_Z":"9999-12-31 23:59:59.0","FROM_Z":"2022-02-01 00:00:00.0"},{"ID":2,"AMOUNT":400,"THRU_Z":"9999-12-31 23:59:59.0","FROM_Z":"2022-02-01 00:00:00.0"},{"ID":3,"AMOUNT":800,"THRU_Z":"9999-12-31 23:59:59.0","FROM_Z":"2022-01-01 00:00:00.0"},{"ID":1,"AMOUNT":100,"THRU_Z":"2022-02-01 00:00:00.0","FROM_Z":"2022-01-01 00:00:00.0"},{"ID":2,"AMOUNT":200,"THRU_Z":"2022-02-01 00:00:00.0","FROM_Z":"2022-01-01 00:00:00.0"}]',
                  },
                  id: 'assert1',
                },
              ],
              id: 'testBatch2',
              testData: {
                connection: {
                  data: {
                    _type: 'externalFormat',
                    contentType: 'application/json',
                    data: '[{"ID":1, "AMOUNT":200, "SOURCE_FROM": "2022-02-01 00:00:00.0"},{"ID":2, "AMOUNT":400, "SOURCE_FROM": "2022-02-01 00:00:00.0"},{"ID":3, "AMOUNT":800, "SOURCE_FROM": "2022-01-01 00:00:00.0"}]',
                  },
                },
              },
            },
          ],
        },
      ],
      trigger: {
        _type: 'manualTrigger',
      },
    },
    classifierPath: 'meta::pure::persistence::metamodel::Persistence',
  },
];

export const TEST_DATA__roundtrip_non_temporal_snapshot_date_time_audit = [
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
    },
    classifierPath: 'meta::pure::metamodel::type::Class',
  },
  {
    path: 'test::ServiceResult',
    content: {
      _type: 'class',
      name: 'ServiceResult',
      package: 'test',
      properties: [
        {
          multiplicity: {
            lowerBound: 1,
            upperBound: 1,
          },
          name: 'ID',
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
          multiplicity: {
            lowerBound: 1,
            upperBound: 1,
          },
          name: 'NAME',
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
    },
    classifierPath: 'meta::pure::metamodel::type::Class',
  },
  {
    path: 'test::TestDatabase',
    content: {
      _type: 'relational',
      filters: [],
      includedStores: [],
      joins: [],
      name: 'TestDatabase',
      package: 'test',
      schemas: [
        {
          name: 'default',
          tables: [
            {
              columns: [
                {
                  name: 'ID',
                  nullable: true,
                  type: {
                    _type: 'Integer',
                  },
                },
                {
                  name: 'NAME',
                  nullable: true,
                  type: {
                    _type: 'Varchar',
                    size: 100,
                  },
                },
                {
                  name: 'BATCH_TIME_IN',
                  nullable: true,
                  type: {
                    _type: 'Timestamp',
                  },
                },
              ],
              name: 'personTable',
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
    path: 'test::Mapping',
    content: {
      _type: 'mapping',
      classMappings: [],
      enumerationMappings: [],
      includedMappings: [],
      name: 'Mapping',
      package: 'test',
      tests: [],
    },
    classifierPath: 'meta::pure::mapping::Mapping',
  },
  {
    path: 'test::Service',
    content: {
      _type: 'service',
      autoActivateUpdates: true,
      documentation: 'test',
      execution: {
        _type: 'pureSingleExecution',
        func: {
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
              property: 'name',
            },
          ],
          parameters: [
            {
              _type: 'var',
              genericType: {
                rawType: {
                  _type: 'packageableType',
                  fullPath: 'test::Person',
                },
                typeArguments: [],
                typeVariableValues: [],
              },
              multiplicity: {
                lowerBound: 1,
                upperBound: 1,
              },
              name: 'src',
            },
          ],
        },
        mapping: 'test::Mapping',
        runtime: {
          _type: 'engineRuntime',
          connectionStores: [],
          connections: [],
          mappings: [
            {
              path: 'test::Mapping',
              type: 'MAPPING',
            },
          ],
        },
      },
      name: 'Service',
      owners: [],
      package: 'test',
      pattern: 'test',
      test: {
        _type: 'singleExecutionTest',
        asserts: [],
        data: 'test',
      },
    },
    classifierPath: 'meta::legend::service::metamodel::Service',
  },
  {
    path: 'test::TestPersistence',
    content: {
      _type: 'persistence',
      documentation: 'This is test documentation.',
      name: 'TestPersistence',
      notifier: {},
      package: 'test',
      serviceOutputTargets: [
        {
          serviceOutput: {
            _type: 'tdsServiceOutput',
            datasetType: {
              _type: 'snapshot',
              partitioning: {
                _type: 'noPartitioning',
                emptyDatasetHandling: {
                  _type: 'noOp',
                },
              },
            },
            deduplication: {
              _type: 'noDeduplication',
            },
            keys: [],
          },
          persistenceTarget: {
            _type: 'relationalPersistenceTarget',
            table: 'personTable',
            database: 'test::TestDatabase',
            temporality: {
              _type: 'none',
              auditing: {
                _type: 'auditingDateTime',
                auditingDateTimeName: 'BATCH_TIME_IN',
              },
              updatesHandling: {
                _type: 'overwrite',
              },
            },
          },
        },
      ],
      service: 'test::Service',
      tests: [
        {
          _type: 'test',
          id: 'test1',
          isTestDataFromServiceOutput: true,
          testBatches: [
            {
              assertions: [
                {
                  _type: 'equalToJson',
                  expected: {
                    _type: 'externalFormat',
                    contentType: 'application/json',
                    data: '[{"ID":1, "NAME":"ANDY"},{"ID":2, "NAME":"BRAD"}]',
                  },
                  id: 'assert1',
                },
              ],
              id: 'testBatch1',
              testData: {
                connection: {
                  data: {
                    _type: 'externalFormat',
                    contentType: 'application/json',
                    data: '[{"ID":1, "NAME":"ANDY"},{"ID":2, "NAME":"BRAD"}]',
                  },
                },
              },
            },
            {
              assertions: [
                {
                  _type: 'equalToJson',
                  expected: {
                    _type: 'externalFormat',
                    contentType: 'application/json',
                    data: '[{"ID":2, "NAME":"BRADLEY"},{"ID":3, "NAME":"CATHY"}]',
                  },
                  id: 'assert1',
                },
              ],
              id: 'testBatch2',
              testData: {
                connection: {
                  data: {
                    _type: 'externalFormat',
                    contentType: 'application/json',
                    data: '[{"ID":2, "NAME":"BRADLEY"},{"ID":3, "NAME":"CATHY"}]',
                  },
                },
              },
            },
          ],
        },
      ],
      trigger: {
        _type: 'manualTrigger',
      },
    },
    classifierPath: 'meta::pure::persistence::metamodel::Persistence',
  },
];

export const TEST_DATA__roundtrip_graph_fetch_basic = [
  {
    path: 'test::model::Firm',
    content: {
      _type: 'class',
      name: 'Firm',
      package: 'test::model',
      properties: [
        {
          multiplicity: {
            lowerBound: 1,
          },
          name: 'employees',
          genericType: {
            rawType: {
              _type: 'packageableType',
              fullPath: 'test::model::Person',
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
          name: 'legalName',
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
    },
    classifierPath: 'meta::pure::metamodel::type::Class',
  },
  {
    path: 'test::model::Person',
    content: {
      _type: 'class',
      name: 'Person',
      package: 'test::model',
      properties: [
        {
          multiplicity: {
            lowerBound: 1,
            upperBound: 1,
          },
          name: 'firstName',
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
          multiplicity: {
            lowerBound: 1,
            upperBound: 1,
          },
          name: 'lastName',
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
          multiplicity: {
            lowerBound: 1,
            upperBound: 1,
          },
          name: 'isDeleted',
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
    },
    classifierPath: 'meta::pure::metamodel::type::Class',
  },
  {
    path: 'test::store::S_Firm',
    content: {
      _type: 'class',
      name: 'S_Firm',
      package: 'test::store',
      properties: [
        {
          multiplicity: {
            lowerBound: 1,
          },
          name: 'employees',
          genericType: {
            rawType: {
              _type: 'packageableType',
              fullPath: 'test::store::S_Person',
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
          name: 'legalName',
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
    },
    classifierPath: 'meta::pure::metamodel::type::Class',
  },
  {
    path: 'test::store::S_Person',
    content: {
      _type: 'class',
      name: 'S_Person',
      package: 'test::store',
      properties: [
        {
          multiplicity: {
            lowerBound: 1,
            upperBound: 1,
          },
          name: 'firstName',
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
          multiplicity: {
            lowerBound: 1,
            upperBound: 1,
          },
          name: 'lastName',
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
    },
    classifierPath: 'meta::pure::metamodel::type::Class',
  },
  {
    path: 'test::myDatabase',
    content: {
      _type: 'relational',
      filters: [],
      includedStores: [],
      joins: [],
      name: 'myDatabase',
      package: 'test',
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
                  name: 'NAME',
                  nullable: true,
                  type: {
                    _type: 'Varchar',
                    size: 100,
                  },
                },
                {
                  name: 'startTime',
                  nullable: true,
                  type: {
                    _type: 'Timestamp',
                  },
                },
                {
                  name: 'endTime',
                  nullable: true,
                  type: {
                    _type: 'Timestamp',
                  },
                },
                {
                  name: 'batchIdIn',
                  nullable: true,
                  type: {
                    _type: 'Integer',
                  },
                },
                {
                  name: 'batchIdOut',
                  nullable: true,
                  type: {
                    _type: 'Integer',
                  },
                },
              ],
              name: 'bitempPersonTable',
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
    path: 'test::mapping::FirmMapping',
    content: {
      _type: 'mapping',
      classMappings: [
        {
          _type: 'pureInstance',
          class: 'test::model::Firm',
          propertyMappings: [
            {
              _type: 'purePropertyMapping',
              explodeProperty: false,
              property: {
                class: 'test::model::Firm',
                property: 'legalName',
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
              explodeProperty: false,
              property: {
                class: 'test::model::Firm',
                property: 'employees',
              },
              source: '',
              target: 'test_model_Person',
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
          ],
          root: true,
          srcClass: 'test::store::S_Firm',
        },
        {
          _type: 'pureInstance',
          class: 'test::model::Person',
          propertyMappings: [
            {
              _type: 'purePropertyMapping',
              explodeProperty: false,
              property: {
                class: 'test::model::Person',
                property: 'firstName',
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
                    property: 'firstName',
                  },
                ],
                parameters: [],
              },
            },
            {
              _type: 'purePropertyMapping',
              explodeProperty: false,
              property: {
                class: 'test::model::Person',
                property: 'lastName',
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
                    property: 'lastName',
                  },
                ],
                parameters: [],
              },
            },
          ],
          root: true,
          srcClass: 'test::store::S_Person',
        },
      ],
      enumerationMappings: [],
      includedMappings: [],
      name: 'FirmMapping',
      package: 'test::mapping',
      tests: [],
    },
    classifierPath: 'meta::pure::mapping::Mapping',
  },
  {
    path: 'test::service::FirmService',
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
                      function: 'filter',
                      parameters: [
                        {
                          _type: 'func',
                          function: 'getAll',
                          parameters: [
                            {
                              _type: 'packageableElementPtr',
                              fullPath: 'test::model::Firm',
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
                                      name: 'f',
                                    },
                                  ],
                                  property: 'legalName',
                                },
                                {
                                  _type: 'var',
                                  name: 'name',
                                },
                              ],
                            },
                          ],
                          parameters: [
                            {
                              _type: 'var',
                              name: 'f',
                            },
                          ],
                        },
                      ],
                    },
                    {
                      _type: 'classInstance',
                      type: 'rootGraphFetchTree',
                      value: {
                        _type: 'rootGraphFetchTree',
                        class: 'test::model::Firm',
                        subTrees: [
                          {
                            _type: 'propertyGraphFetchTree',
                            parameters: [],
                            property: 'employees',
                            subTrees: [
                              {
                                _type: 'propertyGraphFetchTree',
                                parameters: [],
                                property: 'firstName',
                                subTrees: [],
                                subTypeTrees: [],
                              },
                              {
                                _type: 'propertyGraphFetchTree',
                                parameters: [],
                                property: 'lastName',
                                subTrees: [],
                                subTypeTrees: [],
                              },
                            ],
                            subTypeTrees: [],
                          },
                          {
                            _type: 'propertyGraphFetchTree',
                            parameters: [],
                            property: 'legalName',
                            subTrees: [],
                            subTypeTrees: [],
                          },
                        ],
                        subTypeTrees: [],
                      },
                    },
                  ],
                },
                {
                  _type: 'classInstance',
                  type: 'rootGraphFetchTree',
                  value: {
                    _type: 'rootGraphFetchTree',
                    class: 'test::model::Firm',
                    subTrees: [
                      {
                        _type: 'propertyGraphFetchTree',
                        parameters: [],
                        property: 'employees',
                        subTrees: [
                          {
                            _type: 'propertyGraphFetchTree',
                            parameters: [],
                            property: 'firstName',
                            subTrees: [],
                            subTypeTrees: [],
                          },
                          {
                            _type: 'propertyGraphFetchTree',
                            parameters: [],
                            property: 'lastName',
                            subTrees: [],
                            subTypeTrees: [],
                          },
                        ],
                        subTypeTrees: [],
                      },
                      {
                        _type: 'propertyGraphFetchTree',
                        parameters: [],
                        property: 'legalName',
                        subTrees: [],
                        subTypeTrees: [],
                      },
                    ],
                    subTypeTrees: [],
                  },
                },
              ],
            },
          ],
          parameters: [
            {
              _type: 'var',
              genericType: {
                rawType: {
                  _type: 'packageableType',
                  fullPath: 'String',
                },
                typeArguments: [],
                typeVariableValues: [],
              },
              multiplicity: {
                lowerBound: 1,
                upperBound: 1,
              },
              name: 'name',
            },
          ],
        },
        mapping: 'test::mapping::FirmMapping',
        runtime: {
          _type: 'runtimePointer',
          runtime: 'test::runtime::SFirmRuntime',
        },
      },
      name: 'FirmService',
      owners: ['owner1', 'owner2'],
      package: 'test::service',
      pattern: '/testFirmService',
    },
    classifierPath: 'meta::legend::service::metamodel::Service',
  },
  {
    path: 'test::runtime::SFirmRuntime',
    content: {
      _type: 'runtime',
      name: 'SFirmRuntime',
      package: 'test::runtime',
      runtimeValue: {
        _type: 'engineRuntime',
        connectionStores: [],
        connections: [
          {
            store: {
              path: 'ModelStore',
              type: 'STORE',
            },
            storeConnections: [
              {
                connection: {
                  _type: 'connectionPointer',
                  connection: 'test::runtime::SFirmConnection',
                },
                id: 'connection1',
              },
            ],
          },
        ],
        mappings: [
          {
            path: 'test::mapping::FirmMapping',
            type: 'MAPPING',
          },
        ],
      },
    },
    classifierPath: 'meta::pure::runtime::PackageableRuntime',
  },
  {
    path: 'test::runtime::SFirmAndSPersonRuntime',
    content: {
      _type: 'runtime',
      name: 'SFirmAndSPersonRuntime',
      package: 'test::runtime',
      runtimeValue: {
        _type: 'engineRuntime',
        connectionStores: [],
        connections: [
          {
            store: {
              path: 'ModelStore',
              type: 'STORE',
            },
            storeConnections: [
              {
                connection: {
                  _type: 'connectionPointer',
                  connection: 'test::runtime::SFirmConnection',
                },
                id: 'connection1',
              },
              {
                connection: {
                  _type: 'connectionPointer',
                  connection: 'test::runtime::SPersonConnection',
                },
                id: 'connection2',
              },
            ],
          },
        ],
        mappings: [
          {
            path: 'test::mapping::FirmMapping',
            type: 'MAPPING',
          },
        ],
      },
    },
    classifierPath: 'meta::pure::runtime::PackageableRuntime',
  },
  {
    path: 'test::runtime::SFirmConnection',
    content: {
      _type: 'connection',
      connectionValue: {
        _type: 'JsonModelConnection',
        class: 'test::store::S_Firm',
        element: 'ModelStore',
        url: 'executor:default',
      },
      name: 'SFirmConnection',
      package: 'test::runtime',
    },
    classifierPath: 'meta::pure::runtime::PackageableConnection',
  },
  {
    path: 'test::runtime::SPersonConnection',
    content: {
      _type: 'connection',
      connectionValue: {
        _type: 'JsonModelConnection',
        class: 'test::store::S_Person',
        element: 'ModelStore',
        url: 'executor:default',
      },
      name: 'SPersonConnection',
      package: 'test::runtime',
    },
    classifierPath: 'meta::pure::runtime::PackageableConnection',
  },
  {
    path: 'test::TestPersistence',
    content: {
      _type: 'persistence',
      documentation: 'This is test documentation.',
      name: 'TestPersistence',
      notifier: {},
      package: 'test',
      service: 'test::service::FirmService',
      serviceOutputTargets: [
        {
          persistenceTarget: {
            _type: 'relationalPersistenceTarget',
            database: 'test::myDatabase',
            table: 'bitempPersonTable',
            temporality: {
              _type: 'bitemporalTemporality',
              processingDimension: {
                _type: 'batchId',
                batchIdIn: 'batchIdIn',
                batchIdOut: 'batchIdOut',
              },
              sourceDerivedDimension: {
                _type: 'sourceDerivedTime',
                sourceTimeFields: {
                  _type: 'sourceTimeStartAndEnd',
                  endField: 'timeThru',
                  startField: 'timeFrom',
                },
                timeEnd: 'endTime',
                timeStart: 'startTime',
              },
            },
          },
          serviceOutput: {
            _type: 'graphFetchServiceOutput',
            datasetType: {
              _type: 'delta',
              actionIndicator: {
                _type: 'deleteIndicatorForGraphFetch',
                deleteFieldPath: {
                  path: [
                    {
                      _type: 'propertyPath',
                      parameters: [],
                      property: 'employees',
                    },
                    {
                      _type: 'propertyPath',
                      parameters: [],
                      property: 'isDeleted',
                    },
                  ],
                  startType: 'test::model::Firm',
                },
                deleteValues: ['Yes', 'true', '1'],
              },
            },
            deduplication: {
              _type: 'noDeduplication',
            },
            keys: [
              {
                path: [
                  {
                    _type: 'propertyPath',
                    parameters: [],
                    property: 'employees',
                  },
                  {
                    _type: 'propertyPath',
                    parameters: [],
                    property: 'lastName',
                  },
                ],
                startType: 'test::model::Firm',
              },
            ],
            path: {
              path: [
                {
                  _type: 'propertyPath',
                  parameters: [],
                  property: 'employees',
                },
              ],
              startType: 'test::model::Firm',
            },
          },
        },
      ],
      trigger: {
        _type: 'manualTrigger',
      },
    },
    classifierPath: 'meta::pure::persistence::metamodel::Persistence',
  },
];
