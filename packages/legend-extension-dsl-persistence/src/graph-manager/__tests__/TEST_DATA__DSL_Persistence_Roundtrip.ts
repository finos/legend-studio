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

export const TEST_DATA__roundtrip_case1 = [
  {
    classifierPath: 'meta::pure::metamodel::type::Class',
    content: {
      _type: 'class',
      name: 'Zoo',
      package: 'org::dxl',
      properties: [
        {
          multiplicity: { lowerBound: 1, upperBound: 1 },
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
        {
          multiplicity: { lowerBound: 1, upperBound: 1 },
          name: 'zookeeper',
          genericType: {
            rawType: {
              _type: 'packageableType',
              fullPath: 'org::dxl::Person',
            },
            typeArguments: [],
            typeVariableValues: [],
          },
        },
        {
          multiplicity: { lowerBound: 1, upperBound: 1 },
          name: 'owner',
          genericType: {
            rawType: {
              _type: 'packageableType',
              fullPath: 'org::dxl::Person',
            },
            typeArguments: [],
            typeVariableValues: [],
          },
        },
        {
          multiplicity: { lowerBound: 1, upperBound: 1 },
          name: 'admin',
          genericType: {
            rawType: {
              _type: 'packageableType',
              fullPath: 'org::dxl::Person',
            },
            typeArguments: [],
            typeVariableValues: [],
          },
        },
        {
          multiplicity: { lowerBound: 0 },
          name: 'animals',
          genericType: {
            rawType: {
              _type: 'packageableType',
              fullPath: 'org::dxl::Animal',
            },
            typeArguments: [],
            typeVariableValues: [],
          },
        },
      ],
    },
    path: 'org::dxl::Zoo',
  },
  {
    classifierPath: 'meta::pure::metamodel::type::Class',
    content: {
      _type: 'class',
      name: 'Person',
      package: 'org::dxl',
      properties: [
        {
          multiplicity: { lowerBound: 1, upperBound: 1 },
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
        {
          multiplicity: { lowerBound: 1, upperBound: 1 },
          name: 'effectiveDateFrom',
          genericType: {
            rawType: {
              _type: 'packageableType',
              fullPath: 'DateTime',
            },
            typeArguments: [],
            typeVariableValues: [],
          },
        },
        {
          multiplicity: { lowerBound: 1, upperBound: 1 },
          name: 'effectiveDateThru',
          genericType: {
            rawType: {
              _type: 'packageableType',
              fullPath: 'DateTime',
            },
            typeArguments: [],
            typeVariableValues: [],
          },
        },
      ],
    },
    path: 'org::dxl::Person',
  },
  {
    classifierPath: 'meta::pure::metamodel::type::Class',
    content: {
      _type: 'class',
      name: 'Animal',
      package: 'org::dxl',
      properties: [
        {
          multiplicity: { lowerBound: 1, upperBound: 1 },
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
    path: 'org::dxl::Animal',
  },
  {
    classifierPath: 'meta::external::format::shared::binding::Binding',
    content: {
      _type: 'binding',
      contentType: 'application/json',
      modelUnit: {
        packageableElementExcludes: [],
        packageableElementIncludes: ['org::dxl::Person'],
      },
      name: 'ZooBinding',
      package: 'org::dxl',
      schemaSet: undefined,
    },
    path: 'org::dxl::ZooBinding',
  },
  {
    classifierPath: 'meta::relational::metamodel::Database',
    content: {
      _type: 'relational',
      filters: [],
      includedStores: [],
      joins: [],
      name: 'ZooDb',
      package: 'org::dxl',
      schemas: [],
    },
    path: 'org::dxl::ZooDb',
  },
  {
    classifierPath: 'meta::pure::mapping::Mapping',
    content: {
      _type: 'mapping',
      classMappings: [],
      enumerationMappings: [],
      includedMappings: [],
      name: 'Mapping',
      package: 'org::dxl',
      tests: [],
    },
    path: 'org::dxl::Mapping',
  },
  {
    classifierPath: 'meta::legend::service::metamodel::Service',
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
              parameters: [{ _type: 'var', name: 'src' }],
              property: 'name',
            },
          ],
          parameters: [
            {
              _type: 'var',
              genericType: {
                rawType: {
                  _type: 'packageableType',
                  fullPath: 'org::dxl::Zoo',
                },
                typeArguments: [],
                typeVariableValues: [],
              },
              multiplicity: { lowerBound: 1, upperBound: 1 },
              name: 'src',
            },
          ],
        },
        mapping: 'org::dxl::Mapping',
        runtime: {
          _type: 'engineRuntime',
          connectionStores: [],
          connections: [],
          mappings: [{ path: 'org::dxl::Mapping', type: 'MAPPING' }],
        },
      },
      name: 'ZooService',
      owners: [],
      package: 'org::dxl',
      pattern: 'test',
      test: { _type: 'singleExecutionTest', asserts: [], data: 'test' },
    },
    path: 'org::dxl::ZooService',
  },
  {
    classifierPath: 'meta::pure::runtime::PackageableConnection',
    content: {
      _type: 'connection',
      connectionValue: {
        _type: 'RelationalDatabaseConnection',
        authenticationStrategy: { _type: 'h2Default' },
        databaseType: 'H2',
        datasourceSpecification: { _type: 'h2Local' },
        element: 'org::dxl::ZooDb',
        type: 'H2',
      },
      name: 'ZooDbConnection',
      package: 'org::dxl',
    },
    path: 'org::dxl::ZooDbConnection',
  },
  {
    classifierPath: 'meta::pure::persistence::metamodel::Persistence',
    content: {
      _type: 'persistence',
      documentation: 'A persistence specification for Zoos.',
      name: 'ZooPersistence',
      notifier: {
        notifyees: [
          { _type: 'emailNotifyee', address: 'abc@xyz.com' },
          { _type: 'pagerDutyNotifyee', url: 'https://xyz.com' },
        ],
      },
      package: 'org::dxl',
      persister: {
        _type: 'batchPersister',
        ingestMode: {
          _type: 'bitemporalSnapshot',
          transactionMilestoning: {
            _type: 'batchIdAndDateTimeTransactionMilestoning',
            batchIdInName: 'batchIdIn',
            batchIdOutName: 'batchIdOut',
            dateTimeInName: 'IN_Z',
            dateTimeOutName: 'OUT_Z',
            derivation: {
              _type: 'sourceSpecifiesInAndOutDateTime',
              sourceDateTimeInField: 'systemIn',
              sourceDateTimeOutField: 'systemOut',
            },
          },
          validityMilestoning: {
            _type: 'dateTimeValidityMilestoning',
            dateTimeFromName: 'FROM_Z',
            dateTimeThruName: 'THRU_Z',
            derivation: {
              _type: 'sourceSpecifiesFromAndThruDateTime',
              sourceDateTimeFromField: 'effectiveFrom',
              sourceDateTimeThruField: 'effectiveThru',
            },
          },
        },
        sink: { _type: 'objectStorageSink', binding: 'org::dxl::ZooBinding' },
        targetShape: {
          _type: 'multiFlatTarget',
          modelClass: 'org::dxl::Zoo',
          parts: [
            {
              deduplicationStrategy: { _type: 'noDeduplicationStrategy' },
              modelProperty: 'zookeeper',
              partitionFields: [],
              targetName: 'PersonDataset1',
            },
            {
              deduplicationStrategy: {
                _type: 'maxVersionDeduplicationStrategy',
                versionField: 'version',
              },
              modelProperty: 'admin',
              partitionFields: [],
              targetName: 'PersonDataset2',
            },
            {
              deduplicationStrategy: {
                _type: 'duplicateCountDeduplicationStrategy',
                duplicateCountName: 'DUP_COUNT',
              },
              modelProperty: 'owner',
              partitionFields: [],
              targetName: 'PersonDataset3',
            },
          ],
          transactionScope: 'ALL_TARGETS',
        },
      },
      service: 'org::dxl::ZooService',
      trigger: { _type: 'manualTrigger' },
    },
    path: 'org::dxl::ZooPersistence',
  },
  {
    classifierPath: 'meta::pure::persistence::metamodel::PersistenceContext',
    content: {
      _type: 'persistenceContext',
      name: 'ZooPersistenceContext',
      package: 'org::dxl',
      persistence: 'org::dxl::ZooPersistence',
      platform: { _type: 'default' },
      serviceParameters: [
        {
          name: 'connection',
          value: {
            _type: 'connectionValue',
            connection: {
              _type: 'connectionPointer',
              connection: 'org::dxl::ZooDbConnection',
            },
          },
        },
        {
          name: 'foo',
          value: {
            _type: 'primitiveTypeValue',
            primitiveType: { _type: 'string', value: 'Hello' },
          },
        },
        {
          name: 'bar',
          value: {
            _type: 'primitiveTypeValue',
            primitiveType: { _type: 'integer', value: 29 },
          },
        },
        {
          name: 'qux',
          value: {
            _type: 'primitiveTypeValue',
            primitiveType: { _type: 'float', value: 27.5 },
          },
        },
      ],
      sinkConnection: {
        _type: 'RelationalDatabaseConnection',
        authenticationStrategy: { _type: 'h2Default' },
        databaseType: 'H2',
        datasourceSpecification: { _type: 'h2Local' },
        element: 'org::dxl::ZooDb',
        type: 'H2',
      },
    },
    path: 'org::dxl::ZooPersistenceContext',
  },
];

export const TEST_DATA__roundtrip_case2 = [
  {
    path: 'org::dxl::Zoo',
    classifierPath: 'meta::pure::metamodel::type::Class',
    content: {
      _type: 'class',
      name: 'Zoo',
      package: 'org::dxl',
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
  },
  {
    path: 'org::legend::ServiceResult',
    classifierPath: 'meta::pure::metamodel::type::Class',
    content: {
      _type: 'class',
      name: 'ServiceResult',
      package: 'org::legend',
      properties: [
        {
          multiplicity: {
            lowerBound: 1,
            upperBound: 1,
          },
          name: 'deleted',
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
          name: 'dateTimeIn',
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
  },
  {
    classifierPath: 'meta::relational::metamodel::Database',
    path: 'org::legend::TestDatabase',
    content: {
      _type: 'relational',
      filters: [],
      includedStores: [],
      joins: [],
      name: 'TestDatabase',
      package: 'org::legend',
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
                  name: 'firstName',
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
                  name: 'firstName',
                  nullable: true,
                  type: {
                    _type: 'Varchar',
                    size: 100,
                  },
                },
              ],
              name: 'personTable_staging',
              primaryKey: [],
            },
          ],
          views: [],
        },
      ],
    },
  },
  {
    path: 'org::dxl::Mapping',
    classifierPath: 'meta::pure::mapping::Mapping',
    content: {
      _type: 'mapping',
      classMappings: [],
      enumerationMappings: [],
      includedMappings: [],
      name: 'Mapping',
      package: 'org::dxl',
      tests: [],
    },
  },
  {
    path: 'org::dxl::ZooService',
    classifierPath: 'meta::legend::service::metamodel::Service',
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
                  fullPath: 'org::dxl::Zoo',
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
        mapping: 'org::dxl::Mapping',
        runtime: {
          _type: 'engineRuntime',
          connectionStores: [],
          connections: [],
          mappings: [
            {
              path: 'org::dxl::Mapping',
              type: 'MAPPING',
            },
          ],
        },
      },
      name: 'ZooService',
      owners: [],
      package: 'org::dxl',
      pattern: 'test',
      test: {
        _type: 'singleExecutionTest',
        asserts: [],
        data: 'test',
      },
    },
  },
  {
    path: 'org::dxl::PersistenceWithTest',
    classifierPath: 'meta::pure::persistence::metamodel::Persistence',
    content: {
      _type: 'persistence',
      documentation: 'A persistence specification for Zoos with test.',
      name: 'PersistenceWithTest',
      notifier: {},
      package: 'org::dxl',
      persister: {
        _type: 'batchPersister',
        ingestMode: {
          _type: 'appendOnly',
          auditing: {
            _type: 'noAuditing',
          },
          filterDuplicates: false,
        },
        sink: {
          _type: 'relationalSink',
          database: 'org::legend::TestDatabase',
        },
        targetShape: {
          _type: 'flatTarget',
          deduplicationStrategy: {
            _type: 'noDeduplicationStrategy',
          },
          modelClass: 'org::legend::ServiceResult',
          partitionFields: [],
          targetName: 'personTable',
        },
      },
      service: 'org::dxl::ZooService',
      trigger: {
        _type: 'manualTrigger',
      },
      tests: [
        {
          _type: 'test',
          id: 'success_test',
          testBatches: [
            {
              testData: {
                connection: {
                  data: {
                    _type: 'externalFormat',
                    contentType: 'application/json',
                    data: '[{"ID":1, "NAME":"ANDY"},{"ID":2, "NAME":"BRAD"}]',
                  },
                },
              },
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
            },
            {
              testData: {
                connection: {
                  data: {
                    _type: 'externalFormat',
                    contentType: 'application/json',
                    data: '[{"ID":2, "NAME":"BRAD"},{"ID":3, "NAME":"CATHY"},{"ID":4, "NAME":"TOM"}]',
                  },
                },
              },
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
            },
          ],
          isTestDataFromServiceOutput: true,
        },
      ],
    },
  },
];

export const TEST_DATA__cloud__roundtrip = [
  {
    path: 'org::dxl::Zoo',
    classifierPath: 'meta::pure::metamodel::type::Class',
    content: {
      _type: 'class',
      name: 'Zoo',
      package: 'org::dxl',
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
        {
          multiplicity: {
            lowerBound: 1,
            upperBound: 1,
          },
          name: 'zookeeper',
          genericType: {
            rawType: {
              _type: 'packageableType',
              fullPath: 'org::dxl::Person',
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
          name: 'owner',
          genericType: {
            rawType: {
              _type: 'packageableType',
              fullPath: 'org::dxl::Person',
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
          name: 'admin',
          genericType: {
            rawType: {
              _type: 'packageableType',
              fullPath: 'org::dxl::Person',
            },
            typeArguments: [],
            typeVariableValues: [],
          },
        },
        {
          multiplicity: {
            lowerBound: 0,
          },
          name: 'animals',
          genericType: {
            rawType: {
              _type: 'packageableType',
              fullPath: 'org::dxl::Animal',
            },
            typeArguments: [],
            typeVariableValues: [],
          },
        },
      ],
    },
  },
  {
    path: 'org::dxl::Person',
    classifierPath: 'meta::pure::metamodel::type::Class',
    content: {
      _type: 'class',
      name: 'Person',
      package: 'org::dxl',
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
        {
          multiplicity: {
            lowerBound: 1,
            upperBound: 1,
          },
          name: 'effectiveDateFrom',
          genericType: {
            rawType: {
              _type: 'packageableType',
              fullPath: 'DateTime',
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
          name: 'effectiveDateThru',
          genericType: {
            rawType: {
              _type: 'packageableType',
              fullPath: 'DateTime',
            },
            typeArguments: [],
            typeVariableValues: [],
          },
        },
      ],
    },
  },
  {
    path: 'org::dxl::Animal',
    classifierPath: 'meta::pure::metamodel::type::Class',
    content: {
      _type: 'class',
      name: 'Animal',
      package: 'org::dxl',
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
  },
  {
    path: 'org::dxl::ZooBinding',
    classifierPath: 'meta::external::format::shared::binding::Binding',
    content: {
      _type: 'binding',
      contentType: 'application/json',
      modelUnit: {
        packageableElementExcludes: [],
        packageableElementIncludes: ['org::dxl::Person'],
      },
      name: 'ZooBinding',
      package: 'org::dxl',
      schemaSet: undefined,
    },
  },
  {
    classifierPath: 'meta::relational::metamodel::Database',
    path: 'org::dxl::ZooDb',
    content: {
      _type: 'relational',
      filters: [],
      includedStores: [],
      joins: [],
      name: 'ZooDb',
      package: 'org::dxl',
      schemas: [],
    },
  },
  {
    path: 'org::dxl::Mapping',
    classifierPath: 'meta::pure::mapping::Mapping',
    content: {
      _type: 'mapping',
      classMappings: [],
      enumerationMappings: [],
      includedMappings: [],
      name: 'Mapping',
      package: 'org::dxl',
      tests: [],
    },
  },
  {
    path: 'org::dxl::ZooService',
    classifierPath: 'meta::legend::service::metamodel::Service',
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
                  fullPath: 'org::dxl::Zoo',
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
        mapping: 'org::dxl::Mapping',
        runtime: {
          _type: 'engineRuntime',
          connectionStores: [],
          connections: [],
          mappings: [
            {
              path: 'org::dxl::Mapping',
              type: 'MAPPING',
            },
          ],
        },
      },
      name: 'ZooService',
      owners: [],
      package: 'org::dxl',
      pattern: 'test',
      test: {
        _type: 'singleExecutionTest',
        asserts: [],
        data: 'test',
      },
    },
  },
  {
    classifierPath: 'meta::pure::runtime::PackageableConnection',
    path: 'org::dxl::ZooDbConnection',
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
        element: 'org::dxl::ZooDb',
        type: 'H2',
      },
      name: 'ZooDbConnection',
      package: 'org::dxl',
    },
  },
  {
    path: 'org::dxl::ZooPersistence',
    classifierPath: 'meta::pure::persistence::metamodel::Persistence',
    content: {
      _type: 'persistence',
      documentation: 'A persistence specification for Zoos.',
      name: 'ZooPersistence',
      notifier: {
        notifyees: [
          {
            _type: 'emailNotifyee',
            address: 'abc@xyz.com',
          },
          {
            _type: 'pagerDutyNotifyee',
            url: 'https://xyz.com',
          },
        ],
      },
      package: 'org::dxl',
      persister: {
        _type: 'batchPersister',
        ingestMode: {
          _type: 'bitemporalSnapshot',
          transactionMilestoning: {
            _type: 'batchIdAndDateTimeTransactionMilestoning',
            batchIdInName: 'batchIdIn',
            batchIdOutName: 'batchIdOut',
            dateTimeInName: 'IN_Z',
            dateTimeOutName: 'OUT_Z',
            derivation: {
              _type: 'sourceSpecifiesInAndOutDateTime',
              sourceDateTimeInField: 'systemIn',
              sourceDateTimeOutField: 'systemOut',
            },
          },
          validityMilestoning: {
            _type: 'dateTimeValidityMilestoning',
            dateTimeFromName: 'FROM_Z',
            dateTimeThruName: 'THRU_Z',
            derivation: {
              _type: 'sourceSpecifiesFromAndThruDateTime',
              sourceDateTimeFromField: 'effectiveFrom',
              sourceDateTimeThruField: 'effectiveThru',
            },
          },
        },
        sink: {
          _type: 'objectStorageSink',
          binding: 'org::dxl::ZooBinding',
        },
        targetShape: {
          _type: 'multiFlatTarget',
          modelClass: 'org::dxl::Zoo',
          parts: [
            {
              deduplicationStrategy: {
                _type: 'noDeduplicationStrategy',
              },
              modelProperty: 'zookeeper',
              partitionFields: [],
              targetName: 'PersonDataset1',
            },
            {
              deduplicationStrategy: {
                _type: 'maxVersionDeduplicationStrategy',
                versionField: 'version',
              },
              modelProperty: 'admin',
              partitionFields: [],
              targetName: 'PersonDataset2',
            },
            {
              deduplicationStrategy: {
                _type: 'duplicateCountDeduplicationStrategy',
                duplicateCountName: 'DUP_COUNT',
              },
              modelProperty: 'owner',
              partitionFields: [],
              targetName: 'PersonDataset3',
            },
          ],
          transactionScope: 'ALL_TARGETS',
        },
      },
      service: 'org::dxl::ZooService',
      trigger: {
        _type: 'manualTrigger',
      },
    },
  },
  {
    path: 'org::dxl::ZooPersistenceContext',
    classifierPath: 'meta::pure::persistence::metamodel::PersistenceContext',
    content: {
      _type: 'persistenceContext',
      name: 'ZooPersistenceContext',
      package: 'org::dxl',
      persistence: 'org::dxl::ZooPersistence',
      platform: {
        _type: 'awsGlue',
        dataProcessingUnits: 10,
      },
      sinkConnection: {
        _type: 'RelationalDatabaseConnection',
        authenticationStrategy: {
          _type: 'h2Default',
        },
        databaseType: 'H2',
        datasourceSpecification: {
          _type: 'h2Local',
        },
        element: 'org::dxl::ZooDb',
        type: 'H2',
      },
    },
  },
];
