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
 * Test data for analyzeDataProductAndBuildMinimalGraph.
 *
 * This artifact contains:
 *   - A data product at path 'test::MyDataProduct'
 *   - Two model access point groups, each with a different mapping:
 *     - 'test::MappingA' which maps 'test::PersonClass'
 *     - 'test::MappingB' which maps 'test::FirmClass'
 *   - Each mapping generation info contains a model with the mapped class
 *     and mappedEntities referencing that class
 */
export const TEST_DATA__DataProductArtifact = {
  dataProduct: {
    path: 'test::MyDataProduct',
    deploymentId: 'deployment-1',
    title: 'My Test Data Product',
    description: 'A data product for testing',
  },
  accessPointGroups: [
    {
      _type: 'modelAccessPointGroup',
      id: 'group-a',
      description: 'Group A',
      accessPointImplementations: [],
      mappingGeneration: {
        path: 'test::MappingA',
        model: {
          _type: 'data',
          serializer: {
            name: 'pure',
            version: 'vX_X_X',
          },
          elements: [
            {
              _type: 'class',
              name: 'PersonClass',
              package: 'test',
              properties: [
                {
                  multiplicity: { lowerBound: 1, upperBound: 1 },
                  name: 'name',
                  type: 'String',
                },
                {
                  multiplicity: { lowerBound: 1, upperBound: 1 },
                  name: 'age',
                  type: 'Integer',
                },
              ],
            },
          ],
        },
        mappedEntities: [
          {
            path: 'test::PersonClass',
            properties: [{ name: 'name' }, { name: 'age' }],
            info: {
              classPath: 'test::PersonClass',
              isRootEntity: true,
              subClasses: [],
            },
          },
        ],
      },
      diagrams: [],
      model: {
        _type: 'data',
        serializer: {
          name: 'pure',
          version: 'vX_X_X',
        },
        elements: [],
      },
      elements: [],
      elementDocs: [],
    },
    {
      _type: 'modelAccessPointGroup',
      id: 'group-b',
      description: 'Group B',
      accessPointImplementations: [],
      mappingGeneration: {
        path: 'test::MappingB',
        model: {
          _type: 'data',
          serializer: {
            name: 'pure',
            version: 'vX_X_X',
          },
          elements: [
            {
              _type: 'class',
              name: 'FirmClass',
              package: 'test',
              properties: [
                {
                  multiplicity: { lowerBound: 1, upperBound: 1 },
                  name: 'legalName',
                  type: 'String',
                },
              ],
            },
          ],
        },
        mappedEntities: [
          {
            path: 'test::FirmClass',
            properties: [{ name: 'legalName' }],
            info: {
              classPath: 'test::FirmClass',
              isRootEntity: true,
              subClasses: [],
            },
          },
        ],
      },
      diagrams: [],
      model: {
        _type: 'data',
        serializer: {
          name: 'pure',
          version: 'vX_X_X',
        },
        elements: [],
      },
      elements: [],
      elementDocs: [],
    },
  ],
};
