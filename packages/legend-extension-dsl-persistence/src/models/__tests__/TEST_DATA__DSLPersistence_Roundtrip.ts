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
    path: 'org::dxl::ZooPipe',
    classifierPath: 'meta::pure::persistence::metamodel::PersistencePipe',
    content: {
      _type: 'persistencePipe',
      name: 'ZooPipe',
      documentation: 'A persistence pipe for Zoos.',
      owners: [],
      package: 'org::dxl',
      persister: {
        _type: 'batchPersister',
        targetSpecification: {
          _type: 'groupedFlatTargetSpecification',
          components: [
            {
              property: 'zookeeper',
              targetSpecification: {
                _type: 'flatTargetSpecification',
                batchMode: {
                  _type: 'appendOnly',
                  auditing: {
                    _type: 'noAuditing',
                  },
                  filterDuplicates: false,
                },
                deduplicationStrategy: {
                  _type: 'noDeduplicationStrategy',
                },
                modelClass: 'org::dxl::Person',
                partitionProperties: [],
                targetName: 'PersonDataset1',
              },
            },
            {
              property: 'owner',
              targetSpecification: {
                _type: 'flatTargetSpecification',
                batchMode: {
                  _type: 'bitemporalSnapshot',
                  transactionMilestoning: {
                    _type: 'batchIdAndDateTimeTransactionMilestoning',
                    batchIdInName: 'BATCH_ID_IN',
                    batchIdOutName: 'BATCH_ID_OUT',
                    dateTimeInName: 'IN_Z',
                    dateTimeOutName: 'OUT_Z',
                  },
                  validityMilestoning: {
                    _type: 'dateTimeValidityMilestoning',
                    dateTimeFromName: 'IN_Z',
                    dateTimeThruName: 'OUT_Z',
                  },
                  validityDerivation: {
                    _type: 'sourceSpecifiesFromAndThruDateTime',
                    sourceDateTimeFromProperty: 'effectiveDateFrom',
                    sourceDateTimeThruProperty: 'effectiveDateThru',
                  },
                },
                deduplicationStrategy: {
                  _type: 'noDeduplicationStrategy',
                },
                modelClass: 'org::dxl::Person',
                partitionProperties: [],
                targetName: 'PersonDataset2',
              },
            },
          ],
          modelClass: 'org::dxl::Zoo',
          transactionScope: 'ALL_TARGETS',
        },
      },
      reader: {
        _type: 'serviceReader',
        service: 'org::dxl::ZooService',
      },
      trigger: {
        _type: 'opaqueTrigger',
      },
    },
  },
];
