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

/**
 * Test data containing a diverse mix of element types that exercises
 * the parallelized build phases in buildGraphFromInputs:
 * - classes, enumerations, profiles (types phase)
 * - mappings (mappings phase)
 * - connections and runtimes (connections & runtimes phase)
 * - services (services phase — parallelized)
 *
 * This ensures that elements built in parallel resolve their cross-references
 * correctly (e.g., a service references a mapping and runtime that were built
 * in an earlier sequential phase).
 */
export const TEST_DATA__DiverseGraph = [
  // ─── Profile ───────────────────────────────────────────────
  {
    path: 'test::diverse::MyProfile',
    content: {
      _type: 'profile',
      name: 'MyProfile',
      package: 'test::diverse',
      stereotypes: [{ value: 'important' }],
      tags: [{ value: 'doc' }],
    },
    classifierPath: 'meta::pure::metamodel::extension::Profile',
  },
  // ─── Enumeration ───────────────────────────────────────────
  {
    path: 'test::diverse::Status',
    content: {
      _type: 'Enumeration',
      name: 'Status',
      package: 'test::diverse',
      values: [{ value: 'Active' }, { value: 'Inactive' }],
    },
    classifierPath: 'meta::pure::metamodel::type::Enumeration',
  },
  // ─── Source Class ──────────────────────────────────────────
  {
    path: 'test::diverse::SourcePerson',
    content: {
      _type: 'class',
      name: 'SourcePerson',
      package: 'test::diverse',
      properties: [
        {
          multiplicity: { lowerBound: 1, upperBound: 1 },
          name: 'firstName',
          type: 'String',
        },
        {
          multiplicity: { lowerBound: 1, upperBound: 1 },
          name: 'lastName',
          type: 'String',
        },
      ],
    },
    classifierPath: 'meta::pure::metamodel::type::Class',
  },
  // ─── Target Class ─────────────────────────────────────────
  {
    path: 'test::diverse::TargetPerson',
    content: {
      _type: 'class',
      name: 'TargetPerson',
      package: 'test::diverse',
      properties: [
        {
          multiplicity: { lowerBound: 1, upperBound: 1 },
          name: 'fullName',
          type: 'String',
        },
      ],
    },
    classifierPath: 'meta::pure::metamodel::type::Class',
  },
  // ─── Mapping ──────────────────────────────────────────────
  {
    path: 'test::diverse::MyMapping',
    content: {
      _type: 'mapping',
      name: 'MyMapping',
      package: 'test::diverse',
      includedMappings: [],
      classMappings: [
        {
          _type: 'pureInstance',
          class: 'test::diverse::TargetPerson',
          propertyMappings: [
            {
              _type: 'purePropertyMapping',
              property: {
                class: 'test::diverse::TargetPerson',
                property: 'fullName',
              },
              source: 'test_diverse_TargetPerson',
              transform: {
                _type: 'lambda',
                body: [
                  {
                    _type: 'func',
                    function: 'plus',
                    parameters: [
                      {
                        _type: 'collection',
                        multiplicity: { lowerBound: 3, upperBound: 3 },
                        values: [
                          {
                            _type: 'property',
                            parameters: [{ _type: 'var', name: 'src' }],
                            property: 'firstName',
                          },
                          {
                            _type: 'string',
                            multiplicity: { lowerBound: 1, upperBound: 1 },
                            values: [' '],
                          },
                          {
                            _type: 'property',
                            parameters: [{ _type: 'var', name: 'src' }],
                            property: 'lastName',
                          },
                        ],
                      },
                    ],
                  },
                ],
                parameters: [],
              },
              explodeProperty: false,
            },
          ],
          root: true,
          srcClass: 'test::diverse::SourcePerson',
        },
      ],
      enumerationMappings: [],
      tests: [],
    },
    classifierPath: 'meta::pure::mapping::Mapping',
  },
  // ─── Connection ───────────────────────────────────────────
  {
    path: 'test::diverse::MyConnection',
    content: {
      _type: 'connection',
      name: 'MyConnection',
      package: 'test::diverse',
      connectionValue: {
        _type: 'JsonModelConnection',
        class: 'test::diverse::SourcePerson',
        url: 'data:application/json,{}',
      },
    },
    classifierPath: 'meta::pure::runtime::PackageableConnection',
  },
  // ─── Runtime ──────────────────────────────────────────────
  {
    path: 'test::diverse::MyRuntime',
    content: {
      _type: 'runtime',
      name: 'MyRuntime',
      package: 'test::diverse',
      runtimeValue: {
        _type: 'engineRuntime',
        mappings: [{ path: 'test::diverse::MyMapping', type: 'MAPPING' }],
        connections: [
          {
            store: { path: 'ModelStore', type: 'STORE' },
            storeConnections: [
              {
                connection: {
                  _type: 'connectionPointer',
                  connection: 'test::diverse::MyConnection',
                },
                id: 'connection_1',
              },
            ],
          },
        ],
      },
    },
    classifierPath: 'meta::pure::runtime::PackageableRuntime',
  },
  // ─── Service ──────────────────────────────────────────────
  {
    path: 'test::diverse::MyService',
    content: {
      _type: 'service',
      name: 'MyService',
      package: 'test::diverse',
      autoActivateUpdates: true,
      documentation: 'A test service',
      execution: {
        _type: 'pureSingleExecution',
        func: {
          _type: 'lambda',
          body: [
            {
              _type: 'func',
              function: 'getAll',
              parameters: [
                {
                  _type: 'packageableElementPtr',
                  fullPath: 'test::diverse::TargetPerson',
                },
              ],
            },
          ],
          parameters: [],
        },
        mapping: 'test::diverse::MyMapping',
        runtime: {
          _type: 'runtimePointer',
          runtime: 'test::diverse::MyRuntime',
        },
      },
      owners: [],
      pattern: '/api/test',
    },
    classifierPath: 'meta::legend::service::metamodel::Service',
  },
];
