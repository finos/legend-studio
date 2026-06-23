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

/**
 * A minimal ingest definition with no test suites. The `content` is stored as
 * an opaque blob and must round-trip unchanged.
 */
export const TEST_DATA__INGEST_DEFINITION = [
  {
    path: 'model::PersonIngest',
    content: {
      _type: 'ingestDefinition',
      datasets: [
        {
          name: 'Person',
          primaryKey: ['id'],
          source: {
            _type: 'serializedSource',
            schema: {
              _type: 'relationType',
              columns: [
                {
                  genericType: {
                    multiplicityArguments: [],
                    rawType: {
                      _type: 'packageableType',
                      fullPath: 'Integer',
                    },
                    typeArguments: [],
                    typeVariableValues: [],
                  },
                  multiplicity: { lowerBound: 1, upperBound: 1 },
                  name: 'id',
                },
                {
                  genericType: {
                    multiplicityArguments: [],
                    rawType: {
                      _type: 'packageableType',
                      fullPath: 'String',
                    },
                    typeArguments: [],
                    typeVariableValues: [],
                  },
                  multiplicity: { lowerBound: 1, upperBound: 1 },
                  name: 'name',
                },
              ],
            },
          },
        },
      ],
      name: 'PersonIngest',
      package: 'model',
    },
    classifierPath:
      'meta::external::ingest::specification::metamodel::IngestDefinition',
  },
];

/**
 * An ingest definition with a test suite covering both embedded and reference
 * test data resolvers.
 */
export const TEST_DATA__INGEST_DEFINITION__TEST_SUITES = [
  {
    path: 'model::PersonIngest',
    content: {
      _type: 'ingestDefinition',
      datasets: [
        {
          name: 'Person',
          primaryKey: ['id'],
          source: {
            _type: 'serializedSource',
            schema: {
              _type: 'relationType',
              columns: [
                {
                  genericType: {
                    multiplicityArguments: [],
                    rawType: {
                      _type: 'packageableType',
                      fullPath: 'Integer',
                    },
                    typeArguments: [],
                    typeVariableValues: [],
                  },
                  multiplicity: { lowerBound: 1, upperBound: 1 },
                  name: 'id',
                },
                {
                  genericType: {
                    multiplicityArguments: [],
                    rawType: {
                      _type: 'packageableType',
                      fullPath: 'String',
                    },
                    typeArguments: [],
                    typeVariableValues: [],
                  },
                  multiplicity: { lowerBound: 1, upperBound: 1 },
                  name: 'name',
                },
              ],
            },
          },
        },
      ],
      name: 'PersonIngest',
      package: 'model',
      testSuites: [
        {
          id: 'suite_1',
          testData: [
            {
              _type: 'baseDataResolver',
              data: {
                _type: 'relationElementsData',
                relationElements: [
                  {
                    _type: 'relationElement',
                    columns: ['id', 'name'],
                    paths: ['Person'],
                    rows: [
                      {
                        values: ['1', 'Alice'],
                      },
                    ],
                  },
                ],
              },
              elementPointer: {
                path: 'model::PersonIngest',
              },
            },
            {
              _type: 'referenceDataResolver',
              elementPointer: {
                path: 'model::PersonIngest',
              },
            },
          ],
          tests: [
            {
              assertions: [
                {
                  _type: 'equalToRelation',
                  expected: {
                    columns: ['id', 'name'],
                    paths: ['Person'],
                    rows: [
                      {
                        values: ['1', 'Alice'],
                      },
                    ],
                  },
                  id: 'assert_1',
                },
              ],
              datasetId: 'Person',
              id: 'test_1',
            },
          ],
        },
      ],
    },
    classifierPath:
      'meta::external::ingest::specification::metamodel::IngestDefinition',
  },
];
