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

// ###DataProduct
// DataProduct <<meta::pure::profiles::temporal.bitemporal>> {meta::pure::profiles::doc.doc = 'value'} x::A
// {
//    title: 'Test title'
//    description: 'Test description'
//    icon: LibraryIcon('react-icons', 'UpArrow')
//    deliveryFrequency: DAILY
//    coverageRegions: [APAC, NAMR]
//    accessPoints: [
//       ap ('Description'): LH(Snowflake, |1)classification1
//    ]
//    supportInfo: {
//        documentation: ['exampleDoc'] 'https://example.org';
//        website: ['exampleDoc'] 'https://example.org';
//        emails:
//        [
//            {
//                title: 'title'
//                address: 'someEmail@test.org'
//            },
//            {
//                title: 'title'
//                address: 'someEmail@test.org'
//            }
//        ];
//    }
// }

export const TEST_DATA__DATAPRODUCT_DELIVERY = [
  {
    path: 'x::A',
    content: {
      _type: 'dataProduct',
      accessPointGroups: [
        {
          accessPoints: [
            {
              _type: 'lakehouseAccessPoint',
              classification: 'classification1',
              description: 'Description',
              func: {
                _type: 'lambda',
                body: [
                  {
                    _type: 'integer',
                    value: 1,
                  },
                ],
                parameters: [],
              },
              id: 'ap',
              reproducible: false,
              targetEnvironment: 'Snowflake',
            },
          ],
          description: 'The default access group',
          id: 'default',
        },
      ],
      coverageRegions: ['apac', 'namr'],
      deliveryFrequency: 'daily',
      description: 'Test description',
      icon: {
        _type: 'libraryIcon',
        iconId: "'UpArrow'",
        libraryId: "'react-icons'",
      },
      name: 'A',
      package: 'x',
      stereotypes: [
        {
          profile: 'meta::pure::profiles::temporal',
          value: 'bitemporal',
        },
      ],
      supportInfo: {
        documentation: {
          label: 'exampleDoc',
          url: 'https://example.org',
        },
        emails: [
          {
            address: 'someEmail@test.org',
            title: 'title',
          },
          {
            address: 'someEmail@test.org',
            title: 'title',
          },
        ],
        website: {
          label: 'exampleDoc',
          url: 'https://example.org',
        },
      },
      taggedValues: [
        {
          tag: {
            profile: 'meta::pure::profiles::doc',
            value: 'doc',
          },
          value: 'value',
        },
      ],
      title: 'Test title',
    },
    classifierPath:
      'meta::external::catalog::dataProduct::specification::metamodel::DataProduct',
  },
  {
    path: '__internal__::SectionIndex',
    content: {
      _type: 'sectionIndex',
      name: 'SectionIndex',
      package: '__internal__',
      sections: [
        {
          _type: 'importAware',
          elements: [],
          imports: [],
          parserName: 'Pure',
        },
        {
          _type: 'importAware',
          elements: ['x::A'],
          imports: [],
          parserName: 'DataProduct',
        },
      ],
    },
    classifierPath: 'meta::pure::metamodel::section::SectionIndex',
  },
];

// ###DataProduct
// DataProduct x::A
// {
//   accessPoints: [
//     group <<meta::pure::profiles::temporal.bitemporal>> ('Group description') [
//       myId ('Id description'): LH(Snowflake, |1)classification1,
//       myOtherId ('Other Id description'): LH(Snowflake, |1)classification1
//     ],
//     group2 [
//       latest : LH(Snowflake, |1)classification1
//     ]
//   ]
// }

export const TEST_DATA__DATAPRODUCT_GROUPS = [
  {
    path: 'x::A',
    content: {
      _type: 'dataProduct',
      accessPointGroups: [
        {
          accessPoints: [
            {
              _type: 'lakehouseAccessPoint',
              classification: 'classification1',
              description: 'Id description',
              func: {
                _type: 'lambda',
                body: [
                  {
                    _type: 'integer',
                    value: 1,
                  },
                ],
                parameters: [],
              },
              id: 'myId',
              reproducible: false,
              targetEnvironment: 'Snowflake',
            },
            {
              _type: 'lakehouseAccessPoint',
              classification: 'classification1',
              description: 'Other Id description',
              func: {
                _type: 'lambda',
                body: [
                  {
                    _type: 'integer',
                    value: 1,
                  },
                ],
                parameters: [],
              },
              id: 'myOtherId',
              reproducible: false,
              targetEnvironment: 'Snowflake',
            },
          ],
          description: 'Group description',
          id: 'group',
          stereotypes: [
            {
              profile: 'meta::pure::profiles::temporal',
              value: 'bitemporal',
            },
          ],
        },
        {
          accessPoints: [
            {
              _type: 'lakehouseAccessPoint',
              classification: 'classification1',
              func: {
                _type: 'lambda',
                body: [
                  {
                    _type: 'integer',
                    value: 1,
                  },
                ],
                parameters: [],
              },
              id: 'latest',
              reproducible: false,
              targetEnvironment: 'Snowflake',
            },
          ],
          id: 'group2',
        },
      ],
      name: 'A',
      package: 'x',
    },
    classifierPath:
      'meta::external::catalog::dataProduct::specification::metamodel::DataProduct',
  },
  {
    path: '__internal__::SectionIndex',
    content: {
      _type: 'sectionIndex',
      name: 'SectionIndex',
      package: '__internal__',
      sections: [
        {
          _type: 'importAware',
          elements: [],
          imports: [],
          parserName: 'Pure',
        },
        {
          _type: 'importAware',
          elements: ['x::A'],
          imports: [],
          parserName: 'DataProduct',
        },
      ],
    },
    classifierPath: 'meta::pure::metamodel::section::SectionIndex',
  },
];

export const TEST_DATA__DATAPRODUCT__MODEL_ACCESS_GROUPS = [
  {
    path: 'x::A',
    content: {
      _type: 'dataProduct',
      accessPointGroups: [
        {
          _type: 'modelAccessPointGroup',
          accessPoints: [
            {
              _type: 'lakehouseAccessPoint',
              classification: 'classification1',
              func: {
                _type: 'lambda',
                body: [
                  {
                    _type: 'integer',
                    value: 1,
                  },
                ],
                parameters: [],
              },
              id: 'myId',
              reproducible: false,
              targetEnvironment: 'Snowflake',
            },
          ],
          compatibleRuntimes: [
            {
              description: 'desc',
              id: 'runtimeId',
              runtime: {
                path: 'model::dummyRuntime',
              },
            },
          ],
          featuredElements: [
            {
              element: {
                path: 'model',
              },
              exclude: false,
            },
            {
              element: {
                path: 'model',
              },
              exclude: true,
            },
            {
              element: {
                path: 'model',
              },
            },
          ],
          defaultRuntime: 'runtimeId',
          description: 'des',
          id: 'grp',
          mapping: {
            path: 'model::dummyMapping',
          },
        },
      ],
      name: 'A',
      package: 'x',
    },
    classifierPath:
      'meta::external::catalog::dataProduct::specification::metamodel::DataProduct',
  },
  {
    path: 'model::dummyMapping',
    content: {
      _type: 'mapping',
      classMappings: [],
      enumerationMappings: [],
      includedMappings: [],
      name: 'dummyMapping',
      package: 'model',
      tests: [],
    },
    classifierPath: 'meta::pure::mapping::Mapping',
  },
  {
    path: 'model::dummyRuntime',
    content: {
      _type: 'runtime',
      name: 'dummyRuntime',
      package: 'model',
      runtimeValue: {
        _type: 'engineRuntime',
        connectionStores: [],
        connections: [],
        mappings: [
          {
            path: 'model::dummyMapping',
            type: 'MAPPING',
          },
        ],
      },
    },
    classifierPath: 'meta::pure::runtime::PackageableRuntime',
  },
  {
    path: '__internal__::SectionIndex',
    content: {
      _type: 'sectionIndex',
      name: 'SectionIndex',
      package: '__internal__',
      sections: [
        {
          _type: 'importAware',
          elements: [],
          imports: [],
          parserName: 'Pure',
        },
        {
          _type: 'importAware',
          elements: ['x::A'],
          imports: [],
          parserName: 'DataProduct',
        },
      ],
    },
    classifierPath: 'meta::pure::metamodel::section::SectionIndex',
  },
];
