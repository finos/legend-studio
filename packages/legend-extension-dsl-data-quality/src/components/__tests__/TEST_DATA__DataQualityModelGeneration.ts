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

// the queries are kept as written: the graph builder stores them raw, so a placeholder body is enough
const TEST_DATA__queryLambda = {
  _type: 'lambda',
  body: [
    {
      _type: 'string',
      value: 'placeholder',
    },
  ],
  parameters: [],
};

export const TEST_DATA__DataQualityModelGeneration = [
  {
    path: 'model::relationValidation',
    content: {
      _type: 'dataqualityRelationValidation',
      name: 'relationValidation',
      package: 'model',
      query: TEST_DATA__queryLambda,
      validations: [],
    },
    classifierPath:
      'meta::external::dataquality::DataQualityRelationValidation',
  },
  {
    path: 'model::relationComparison',
    content: {
      _type: 'dataQualityRelationComparison',
      name: 'relationComparison',
      package: 'model',
      source: TEST_DATA__queryLambda,
      target: TEST_DATA__queryLambda,
      keys: ['id'],
      columnsToCompare: ['name'],
      additionalColumnsToPersist: [],
      strategy: {
        _type: 'md5Hash',
      },
    },
    classifierPath:
      'meta::external::dataquality::DataQualityRelationComparison',
  },
  {
    path: 'model::genSpec',
    content: {
      _type: 'generationSpecification',
      fileGenerations: [],
      generationNodes: [
        {
          generationElement: 'model::relationValidation',
          id: 'validate',
        },
      ],
      name: 'genSpec',
      package: 'model',
    },
    classifierPath:
      'meta::pure::generation::metamodel::GenerationSpecification',
  },
];
