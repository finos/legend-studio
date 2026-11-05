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
 * A specification holding both forms a generation node can be written in: a stage written with the
 * plural `generationElements` and a stage written with the singular `generationElement`.
 */
export const TEST_DATA__GenerationSpecificationStages = [
  {
    path: 'test::tMapping',
    content: {
      _type: 'mapping',
      classMappings: [],
      enumerationMappings: [],
      includedMappings: [],
      name: 'tMapping',
      package: 'test',
      tests: [],
    },
    classifierPath: 'meta::pure::mapping::Mapping',
  },
  {
    path: 'test::tMapping2',
    content: {
      _type: 'mapping',
      classMappings: [],
      enumerationMappings: [],
      includedMappings: [],
      name: 'tMapping2',
      package: 'test',
      tests: [],
    },
    classifierPath: 'meta::pure::mapping::Mapping',
  },
  {
    path: 'test::tMapping3',
    content: {
      _type: 'mapping',
      classMappings: [],
      enumerationMappings: [],
      includedMappings: [],
      name: 'tMapping3',
      package: 'test',
      tests: [],
    },
    classifierPath: 'meta::pure::mapping::Mapping',
  },
  {
    path: 'test::tFileGen',
    content: {
      _type: 'fileGeneration',
      configurationProperties: [],
      name: 'tFileGen',
      package: 'test',
      scopeElements: [],
      type: 'avro',
    },
    classifierPath:
      'meta::pure::generation::metamodel::GenerationConfiguration',
  },
  {
    path: 'test::tGenSpec',
    content: {
      _type: 'generationSpecification',
      fileGenerations: [
        {
          path: 'test::tFileGen',
          type: 'FILE_GENERATION',
        },
      ],
      generationNodes: [
        {
          generationElements: ['test::tMapping', 'test::tMapping2'],
          id: 'theGroup',
        },
        {
          generationElement: 'test::tMapping3',
          id: 'theSingleElement',
        },
      ],
      name: 'tGenSpec',
      package: 'test',
    },
    classifierPath:
      'meta::pure::generation::metamodel::GenerationSpecification',
  },
];
