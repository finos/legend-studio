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
          type: 'String',
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
          type: 'String',
        },
        {
          multiplicity: {
            lowerBound: 1,
            upperBound: 1,
          },
          name: 'NAME',
          type: 'String',
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
          type: 'String',
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
          type: 'String',
        },
        {
          multiplicity: {
            lowerBound: 1,
            upperBound: 1,
          },
          name: 'AMOUNT',
          type: 'Integer',
        },
        {
          multiplicity: {
            lowerBound: 1,
            upperBound: 1,
          },
          name: 'SOURCE_FROM',
          type: 'String',
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
          type: 'String',
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
          type: 'String',
        },
        {
          multiplicity: {
            lowerBound: 1,
            upperBound: 1,
          },
          name: 'NAME',
          type: 'String',
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
