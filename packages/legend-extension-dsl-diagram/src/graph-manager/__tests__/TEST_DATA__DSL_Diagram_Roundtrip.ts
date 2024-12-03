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
          genericType: {
            rawType: {
              _type: 'packageableType',
              fullPath: 'test::tClass2',
            },
          },
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

export const TEST_DATA__diagramWithAssociationProperty = [
  {
    path: 'test::class1',
    content: {
      _type: 'class',
      name: 'class1',
      package: 'test',
    },
    classifierPath: 'meta::pure::metamodel::type::Class',
  },
  {
    path: 'test::class2',
    content: {
      _type: 'class',
      name: 'class2',
      package: 'test',
    },
    classifierPath: 'meta::pure::metamodel::type::Class',
  },
  {
    path: 'test::association',
    content: {
      _type: 'association',
      name: 'association',
      package: 'test',
      properties: [
        {
          multiplicity: {
            lowerBound: 1,
            upperBound: 1,
          },
          name: 'class1',
          genericType: {
            rawType: {
              _type: 'packageableType',
              fullPath: 'test::class1',
            },
          },
        },
        {
          multiplicity: {
            lowerBound: 1,
            upperBound: 1,
          },
          name: 'class2',
          genericType: {
            rawType: {
              _type: 'packageableType',
              fullPath: 'test::class2',
            },
          },
        },
      ],
    },
    classifierPath: 'meta::pure::metamodel::relationship::Association',
  },
  {
    path: 'test::diagram',
    content: {
      _type: 'diagram',
      classViews: [
        {
          class: 'test::class1',
          id: '08428815-419f-46ea-926c-cf06202e7beb',
          position: {
            x: 550,
            y: 363,
          },
          rectangle: {
            height: 44,
            width: 109.29443359375,
          },
        },
        {
          class: 'test::class2',
          id: 'd0702ef8-133c-4224-b897-5f13c89846ec',
          position: {
            x: 645,
            y: 443,
          },
          rectangle: {
            height: 30,
            width: 56.703125,
          },
        },
      ],
      generalizationViews: [],
      name: 'diagram',
      package: 'test',
      propertyViews: [
        {
          line: {
            points: [
              {
                x: 673.3515625,
                y: 458,
              },
              {
                x: 604.647216796875,
                y: 385,
              },
            ],
          },
          property: {
            class: 'test::association',
            property: 'class1',
          },
          sourceView: 'd0702ef8-133c-4224-b897-5f13c89846ec',
          targetView: '08428815-419f-46ea-926c-cf06202e7beb',
        },
        {
          line: {
            points: [
              {
                x: 604.647216796875,
                y: 385,
              },
              {
                x: 673.3515625,
                y: 458,
              },
            ],
          },
          property: {
            class: 'test::association',
            property: 'class2',
          },
          sourceView: '08428815-419f-46ea-926c-cf06202e7beb',
          targetView: 'd0702ef8-133c-4224-b897-5f13c89846ec',
        },
      ],
    },
    classifierPath: 'meta::pure::metamodel::diagram::Diagram',
  },
];

export const TEST_DATA__diagramWithOverlappingConnectedClassViews = [
  {
    classifierPath: 'meta::pure::metamodel::type::Class',
    content: {
      _type: 'class',
      name: 'Person',
      package: 'model',
      properties: [
        {
          genericType: {
            rawType: {
              _type: 'packageableType',
              fullPath: 'String',
            },
          },
          multiplicity: { lowerBound: 1, upperBound: 1 },
          name: 'firstName',
        },
      ],
    },
    path: 'model::Person',
  },
  {
    classifierPath: 'meta::pure::metamodel::type::Class',
    content: {
      _type: 'class',
      name: 'Firm',
      package: 'model',
      properties: [
        {
          multiplicity: { lowerBound: 0 },
          name: 'employees',
          genericType: {
            rawType: {
              _type: 'packageableType',
              fullPath: 'model::Person',
            },
          },
        },
      ],
    },
    path: 'model::Firm',
  },
  {
    classifierPath: 'meta::pure::metamodel::diagram::Diagram',
    content: {
      _type: 'diagram',
      classViews: [
        {
          class: 'model::Firm',
          id: '59da4d7e-9e7a-4a90-812a-96feeed9d6c8',
          position: { x: 705, y: 279 },
          rectangle: { height: 44, width: 134.32373046875 },
        },
        {
          class: 'model::Person',
          id: '6fbb5b43-ad37-43bd-8c62-05b124df7fca',
          position: { x: 708, y: 279 },
          rectangle: { height: 44, width: 124.521484375 },
        },
      ],
      generalizationViews: [],
      name: 'MyDiagram',
      package: 'model',
      propertyViews: [
        {
          line: {
            points: [
              { x: 770.2607421875, y: 301 },
              { x: 772.161865234375, y: 301 },
            ],
          },
          property: { class: 'model::Firm', property: 'employees' },
          sourceView: '59da4d7e-9e7a-4a90-812a-96feeed9d6c8',
          targetView: '6fbb5b43-ad37-43bd-8c62-05b124df7fca',
        },
      ],
    },
    path: 'model::MyDiagram',
  },
];
