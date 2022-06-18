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

export const TEST_DATA__roundtrip = [
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
          type: 'String',
        },
        {
          multiplicity: {
            lowerBound: 1,
            upperBound: 1,
          },
          name: 'zookeeper',
          type: 'org::dxl::Person',
        },
        {
          multiplicity: {
            lowerBound: 1,
            upperBound: 1,
          },
          name: 'owner',
          type: 'org::dxl::Person',
        },
        {
          multiplicity: {
            lowerBound: 1,
            upperBound: 1,
          },
          name: 'admin',
          type: 'org::dxl::Person',
        },
        {
          multiplicity: {
            lowerBound: 0,
          },
          name: 'animals',
          type: 'org::dxl::Animal',
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
          type: 'String',
        },
        {
          multiplicity: {
            lowerBound: 1,
            upperBound: 1,
          },
          name: 'effectiveDateFrom',
          type: 'DateTime',
        },
        {
          multiplicity: {
            lowerBound: 1,
            upperBound: 1,
          },
          name: 'effectiveDateThru',
          type: 'DateTime',
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
          type: 'String',
        },
      ],
    },
  },
  {
    path: 'org::dxl::ZooBinding',
    classifierPath: 'meta::external::shared::format::binding::Binding',
    content: {
      _type: 'binding',
      contentType: 'application/json',
      includedStores: [],
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
              class: 'org::dxl::Zoo',
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
          connection: {
            _type: 'JsonModelConnection',
            class: 'org::dxl::Animal',
            url: 'file:///foo',
          },
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
];
