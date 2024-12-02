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

export const TEST_DATA__Milestoning = [
  {
    path: '__internal__::SectionIndex',
    content: {
      _type: 'sectionIndex',
      name: 'SectionIndex',
      package: '__internal__',
      sections: [
        {
          _type: 'importAware',
          elements: ['test::C', 'test::D'],
          imports: ['test'],
          parserName: 'Pure',
        },
      ],
    },
    classifierPath: 'meta::pure::metamodel::section::SectionIndex',
  },
  {
    path: 'test::C',
    content: {
      _type: 'class',
      name: 'C',
      package: 'test',
      properties: [
        {
          multiplicity: {
            lowerBound: 1,
            upperBound: 1,
          },
          name: 'z',
          genericType: {
            rawType: {
              _type: 'packageableType',
              fullPath: 'String',
            },
          },
        },
      ],
      stereotypes: [
        {
          profile: 'temporal',
          value: 'businesstemporal',
        },
      ],
    },
    classifierPath: 'meta::pure::metamodel::type::Class',
  },
  {
    path: 'test::D',
    content: {
      _type: 'class',
      name: 'D',
      package: 'test',
      properties: [
        {
          multiplicity: {
            lowerBound: 1,
            upperBound: 1,
          },
          name: 'z',
          genericType: {
            rawType: {
              _type: 'packageableType',
              fullPath: 'String',
            },
          },
        },
      ],
      superTypes: ['C'],
    },
    classifierPath: 'meta::pure::metamodel::type::Class',
  },
];
