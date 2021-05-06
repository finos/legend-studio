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

export const simpleDebuggingCase = [
  {
    classifierPath: 'meta::pure::metamodel::type::Class',
    path: 'myPack::BasicPerson',
    content: {
      _type: 'class',
      name: 'BasicPerson',
      package: 'myPack',
      properties: [
        {
          multiplicity: { lowerBound: 0, upperBound: 1 },
          name: 'fullName',
          type: 'String',
        },
        {
          multiplicity: { lowerBound: 0, upperBound: 1 },
          name: 'title',
          type: 'String',
        },
      ],
    },
  },
  {
    classifierPath: 'meta::pure::metamodel::type::Class',
    path: 'myPack::Firm',
    content: {
      _type: 'class',
      constraints: [
        {
          functionDefinition: {
            _type: 'lambda',
            body: [
              {
                _type: 'func',
                function: 'greaterThan',
                parameters: [
                  {
                    _type: 'func',
                    function: 'size',
                    parameters: [
                      {
                        _type: 'property',
                        parameters: [{ _type: 'var', name: 'this' }],
                        property: 'employees',
                      },
                    ],
                  },
                  {
                    _type: 'integer',
                    multiplicity: { lowerBound: 1, upperBound: 1 },
                    values: [2],
                  },
                ],
              },
            ],
            parameters: [{ _type: 'var', name: 'this' }],
          },
          name: 'size',
        },
      ],
      name: 'Firm',
      package: 'myPack',
      properties: [
        {
          multiplicity: { lowerBound: 1, upperBound: 1 },
          name: 'legalName',
          type: 'String',
        },
        {
          multiplicity: { lowerBound: 0 },
          name: 'employees',
          type: 'myPack::Person',
        },
      ],
      qualifiedProperties: [
        {
          body: [
            {
              _type: 'func',
              function: 'first',
              parameters: [
                {
                  _type: 'property',
                  parameters: [{ _type: 'var', name: 'this' }],
                  property: 'employees',
                },
              ],
            },
          ],
          name: 'firstEmployee',
          parameters: [],
          returnMultiplicity: { lowerBound: 0, upperBound: 1 },
          returnType: 'myPack::Person',
        },
      ],
      stereotypes: [{ profile: 'myPack::MyExtenstion', value: 'important' }],
      superTypes: ['myPack::LegalEntity'],
      taggedValues: [
        {
          tag: { profile: 'myPack::MyExtenstion', value: 'doc' },
          value: 'An entity that does stuff',
        },
      ],
    },
  },
  {
    classifierPath: 'meta::pure::metamodel::type::Class',
    path: 'myPack::LegalEntity',
    content: { _type: 'class', name: 'LegalEntity', package: 'myPack' },
  },
  {
    classifierPath: 'meta::pure::metamodel::diagram::Diagram',
    path: 'myPack::MyDiagram',
    content: {
      _type: 'diagram',
      classViews: [
        {
          class: 'myPack::LegalEntity',
          id: 'eb4b7f57-db46-42a0-be3e-d394e97a361f',
          position: { x: 472, y: 225.203125 },
          rectangle: { height: 31, width: 84.67578125 },
        },
        {
          class: 'myPack::Firm',
          id: 'aae4808c-fe94-4ca7-a08e-41e2e04d4101',
          position: { x: 424, y: 318.203125 },
          rectangle: { height: 91, width: 180.892578125 },
        },
        {
          class: 'myPack::Person',
          id: '6283b72c-4052-4bcc-83e8-81138a88ccdd',
          position: { x: 733.3527682843473, y: 313.0133971291866 },
          rectangle: {
            height: 98.72727272727269,
            width: 133.63636363636363,
          },
        },
      ],
      generalizationViews: [
        {
          line: {
            points: [
              { x: 514.4462890625, y: 363.703125 },
              { x: 514.337890625, y: 240.703125 },
            ],
          },
          sourceView: 'aae4808c-fe94-4ca7-a08e-41e2e04d4101',
          targetView: 'eb4b7f57-db46-42a0-be3e-d394e97a361f',
        },
      ],
      name: 'MyDiagram',
      package: 'myPack',
      propertyViews: [
        {
          line: {
            points: [
              { x: 600.08004101162, y: 334.28612440191387 },
              { x: 763.3527682843473, y: 335.377033492823 },
            ],
          },
          property: { class: 'myPack::Firm', property: 'employees' },
          sourceView: 'aae4808c-fe94-4ca7-a08e-41e2e04d4101',
          targetView: '6283b72c-4052-4bcc-83e8-81138a88ccdd',
        },
        {
          line: {
            points: [
              { x: 596.9891319207111, y: 391.5588516746411 },
              { x: 605.5345864661655, y: 392.64976076555024 },
              { x: 749.1709501025292, y: 393.7406698564593 },
            ],
          },
          property: { class: 'myPack::Firm', property: 'firstEmployee' },
          sourceView: 'aae4808c-fe94-4ca7-a08e-41e2e04d4101',
          targetView: '6283b72c-4052-4bcc-83e8-81138a88ccdd',
        },
      ],
    },
  },
  {
    classifierPath: 'meta::pure::metamodel::extension::Profile',
    path: 'myPack::MyExtenstion',
    content: {
      _type: 'profile',
      name: 'MyExtenstion',
      package: 'myPack',
      stereotypes: ['important'],
      tags: ['doc'],
    },
  },
  {
    classifierPath: 'meta::pure::mapping::Mapping',
    path: 'myPack::MyMapping',
    content: {
      _type: 'mapping',
      classMappings: [
        {
          _type: 'pureInstance',
          class: 'myPack::BasicPerson',
          id: 'myPack_BasicPerson',
          propertyMappings: [
            {
              _type: 'purePropertyMapping',
              property: {
                class: 'myPack::BasicPerson',
                property: 'fullName',
              },
              source: '',
              transform: {
                _type: 'lambda',
                body: [
                  {
                    _type: 'func',
                    function: 'plus',
                    parameters: [
                      {
                        _type: 'collection',
                        multiplicity: { lowerBound: 2, upperBound: 2 },
                        values: [
                          {
                            _type: 'func',
                            function: 'toOne',
                            parameters: [
                              {
                                _type: 'property',
                                parameters: [{ _type: 'var', name: 'src' }],
                                property: 'firstName',
                              },
                            ],
                          },
                          {
                            _type: 'func',
                            function: 'toOne',
                            parameters: [
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
                  },
                ],
                parameters: [],
              },
            },
            {
              _type: 'purePropertyMapping',
              property: {
                class: 'myPack::BasicPerson',
                property: 'title',
              },
              source: '',
              transform: {
                _type: 'lambda',
                body: [
                  {
                    _type: 'string',
                    multiplicity: { lowerBound: 1, upperBound: 1 },
                    values: ['phd'],
                  },
                ],
                parameters: [],
              },
            },
          ],
          root: true,
          srcClass: 'myPack::Person',
        },
      ],
      enumerationMappings: [],
      includedMappings: [],
      name: 'MyMapping',
      package: 'myPack',
      tests: [],
    },
  },
  {
    classifierPath: 'meta::pure::metamodel::type::Class',
    path: 'myPack::Person',
    content: {
      _type: 'class',
      name: 'Person',
      package: 'myPack',
      properties: [
        {
          multiplicity: { lowerBound: 0, upperBound: 1 },
          name: 'firstName',
          type: 'String',
        },
        {
          multiplicity: { lowerBound: 0, upperBound: 1 },
          name: 'lastName',
          type: 'String',
        },
      ],
    },
  },
];

export const testAutoImportsWithSystemProfiles = [
  {
    path: 'test::enumeration',
    content: {
      _type: 'Enumeration',
      name: 'enumeration',
      package: 'test',
      values: [
        {
          stereotypes: [
            {
              profile: 'doc',
              value: 'deprecated',
            },
          ],
          taggedValues: [
            {
              tag: {
                profile: 'doc',
                value: 'doc',
              },
              value: 'any',
            },
          ],
          value: 'CITY',
        },
      ],
    },
    classifierPath: 'meta::pure::metamodel::type::Enumeration',
  },
];

export const testAutoImportsWithAny = [
  {
    path: 'test::doc',
    content: {
      _type: 'class',
      name: 'doc',
      package: 'test',
      properties: [
        {
          multiplicity: {
            lowerBound: 1,
            upperBound: 1,
          },
          name: 'prop',
          type: 'Any',
        },
      ],
    },
    classifierPath: 'meta::pure::metamodel::type::Class',
  },
];
