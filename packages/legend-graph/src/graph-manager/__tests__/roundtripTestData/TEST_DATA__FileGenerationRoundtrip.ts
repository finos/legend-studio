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

// References to resolve in FileGeneration
// - ScopeElement
export const TEST_DATA__FileGenerationRoundtrip = [
  {
    path: 'test::tClass',
    content: {
      _type: 'class',
      name: 'tClass',
      package: 'test',
    },
    classifierPath: 'meta::pure::metamodel::type::Class',
  },
  {
    path: 'test::testPackage::tClass',
    content: {
      _type: 'class',
      name: 'tClass',
      package: 'test::testPackage',
    },
    classifierPath: 'meta::pure::metamodel::type::Class',
  },
  {
    path: 'test::tFileGen',
    content: {
      _type: 'fileGeneration',
      configurationProperties: [
        {
          name: 'includeNamespace',
          value: true,
        },
        {
          name: 'propertyProfile',
          value: ['model::myProfile', 'model::nextProfile'],
        },
      ],
      name: 'tFileGen',
      package: 'test',
      scopeElements: ['tClass', 'testPackage::tClass'],
      type: 'avro',
    },
    classifierPath:
      'meta::pure::generation::metamodel::GenerationConfiguration',
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
          elements: ['test::tClass', 'test::testPackage::tClass'],
          parserName: 'Pure',
        },
        {
          _type: 'importAware',
          imports: ['test'],
          elements: ['test::tFileGen'],
          parserName: 'FileGeneration',
        },
      ],
    },
    classifierPath: 'meta::pure::metamodel::section::SectionIndex',
  },
];

export const TEST_DATA__FileGenerationWithPackageSameAsSystemElement = [
  {
    path: 'test::Firm',
    content: {
      _type: 'class',
      name: 'Firm',
      package: 'test',
      properties: [
        {
          multiplicity: {
            lowerBound: 1,
            upperBound: 1,
          },
          name: 'name',
          genericType: {
            rawType: {
              _type: 'packageableType',
              fullPath: 'String',
            },
          },
        },
      ],
    },
    classifierPath: 'meta::pure::metamodel::type::Class',
  },
  {
    path: 'test::Person',
    content: {
      _type: 'class',
      name: 'Person',
      package: 'test',
      properties: [
        {
          multiplicity: {
            lowerBound: 1,
            upperBound: 1,
          },
          name: 'name',
          genericType: {
            rawType: {
              _type: 'packageableType',
              fullPath: 'String',
            },
          },
        },
      ],
    },
    classifierPath: 'meta::pure::metamodel::type::Class',
  },
];
