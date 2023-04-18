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

// References to resolve in GenerationSpecification
// - GenerationTreeNode - generation element
// - FileGeneration pointer
export const TEST_DATA__GenerationSpecificationRoundtrip = [
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
          path: 'tFileGen',
          type: 'FILE_GENERATION',
        },
      ],
      generationNodes: [],
      name: 'tGenSpec',
      package: 'test',
    },
    classifierPath:
      'meta::pure::generation::metamodel::GenerationSpecification',
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
          imports: [],
          elements: [],
          parserName: 'Pure',
        },
        {
          _type: 'importAware',
          imports: [],
          elements: ['test::tFileGen'],
          parserName: 'FileGeneration',
        },
        {
          _type: 'importAware',
          imports: [],
          elements: ['test::tMapping'],
          parserName: 'Mapping',
        },
        {
          _type: 'importAware',
          imports: ['test'],
          elements: ['test::tGenSpec'],
          parserName: 'GenerationSpecification',
        },
      ],
    },
    classifierPath: 'meta::pure::metamodel::section::SectionIndex',
  },
];
