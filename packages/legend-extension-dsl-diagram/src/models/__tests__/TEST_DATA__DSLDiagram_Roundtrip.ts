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

// References to resolve in Diagram
// - ClassView - class
// - PropertyView - property
// - AssociationView - association
export const TEST_DATA__roundtrip = [
  {
    path: 'test::tClass2',
    content: {
      _type: 'class',
      name: 'tClass2',
      package: 'test',
    },
    classifierPath: 'meta::pure::metamodel::type::Class',
  },
  {
    path: 'test::tClass',
    content: {
      _type: 'class',
      name: 'tClass',
      package: 'test',
      properties: [
        {
          multiplicity: {
            lowerBound: 0,
          },
          name: 'prop1',
          type: 'test::tClass2',
        },
      ],
      superTypes: ['test::tClass2'],
    },
    classifierPath: 'meta::pure::metamodel::type::Class',
  },
  {
    path: 'test::tDiag',
    content: {
      _type: 'diagram',
      classViews: [
        {
          class: 'tClass',
          id: '709b74cb-2605-4f4d-bf5d-8996b543279b',
          position: {
            x: 338,
            y: 114,
          },
          rectangle: {
            height: 44,
            width: 109.8583984375,
          },
        },
        {
          class: 'tClass2',
          id: '1841211c-09d7-4293-ab87-f8155377cdf9',
          position: {
            x: 191,
            y: 311,
          },
          rectangle: {
            height: 30,
            width: 62.69140625,
          },
        },
      ],
      generalizationViews: [
        {
          line: {
            points: [
              {
                x: 392.92919921875,
                y: 136,
              },
              {
                x: 418,
                y: 311,
              },
              {
                x: 222.345703125,
                y: 326,
              },
            ],
          },
          sourceView: '709b74cb-2605-4f4d-bf5d-8996b543279b',
          targetView: '1841211c-09d7-4293-ab87-f8155377cdf9',
        },
      ],
      name: 'tDiag',
      package: 'test',
      propertyViews: [
        {
          line: {
            points: [
              {
                x: 392.92919921875,
                y: 136,
              },
              {
                x: 222.345703125,
                y: 326,
              },
            ],
          },
          property: {
            class: 'tClass',
            property: 'prop1',
          },
          sourceView: '709b74cb-2605-4f4d-bf5d-8996b543279b',
          targetView: '1841211c-09d7-4293-ab87-f8155377cdf9',
        },
      ],
    },
    classifierPath: 'meta::pure::metamodel::diagram::Diagram',
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
          elements: ['test::tClass2', 'test::tClass'],
          parserName: 'Pure',
        },
        {
          _type: 'importAware',
          imports: ['test'],
          elements: ['test::tDiag'],
          parserName: 'Diagram',
        },
      ],
    },
    classifierPath: 'meta::pure::metamodel::section::SectionIndex',
  },
];
