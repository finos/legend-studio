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
        connections: [
          {
            connection: {
              _type: 'JsonModelConnection',
              class: 'org::dxl::Animal',
              url: 'file:///foo',
            },
            id: 'c1',
          },
        ],
        targetShape: {
          _type: 'multiFlatTarget',
          modelClass: 'org::dxl::Zoo',
          parts: [
            {
              property: 'zookeeper',
              flatTarget: {
                _type: 'flatTarget',
                deduplicationStrategy: {
                  _type: 'noDeduplicationStrategy',
                },
                ingestMode: {
                  _type: 'appendOnly',
                  auditing: {
                    _type: 'noAuditing',
                  },
                  filterDuplicates: false,
                },
                modelClass: 'org::dxl::Person',
                partitionProperties: [],
                targetName: 'PersonDataset1',
              },
            },
            {
              property: 'admin',
              flatTarget: {
                _type: 'flatTarget',
                deduplicationStrategy: {
                  _type: 'maxVersionDeduplicationStrategy',
                  versionProperty: 'version',
                },
                ingestMode: {
                  _type: 'unitemporalDelta',
                  mergeStrategy: {
                    _type: 'deleteIndicatorMergeStrategy',
                    deleteProperty: 'deleted',
                    deleteValues: ['T'],
                  },
                  transactionMilestoning: {
                    _type: 'batchIdTransactionMilestoning',
                    batchIdInFieldName: 'BATCH_IN_Z',
                    batchIdOutFieldName: 'BATCH_OUT_Z',
                  },
                },
                modelClass: 'org::dxl::Person',
                partitionProperties: [],
                targetName: 'PersonDataset2',
              },
            },
            {
              property: 'owner',
              flatTarget: {
                _type: 'flatTarget',
                deduplicationStrategy: {
                  _type: 'noDeduplicationStrategy',
                },
                ingestMode: {
                  _type: 'bitemporalSnapshot',
                  transactionMilestoning: {
                    _type: 'batchIdAndDateTimeTransactionMilestoning',
                    batchIdInFieldName: 'batchIdIn',
                    batchIdOutFieldName: 'batchIdOut',
                    dateTimeInFieldName: 'IN_Z',
                    dateTimeOutFieldName: 'OUT_Z',
                  },
                  validityMilestoning: {
                    _type: 'dateTimeValidityMilestoning',
                    dateTimeFromFieldName: 'FROM_Z',
                    dateTimeThruFieldName: 'THRU_Z',
                    derivation: {
                      _type: 'sourceSpecifiesFromAndThruDateTime',
                      sourceDateTimeFromProperty: 'effectiveFrom',
                      sourceDateTimeThruProperty: 'effectiveThru',
                    },
                  },
                },
                modelClass: 'org::dxl::Person',
                partitionProperties: [],
                targetName: 'PersonDataset3',
              },
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
