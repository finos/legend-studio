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

export const TEST_DATA__InferenceDefaultMappingElementID = [
  {
    path: 'test::A',
    content: {
      _type: 'class',
      name: 'A',
      package: 'test',
    },
    classifierPath: 'meta::pure::metamodel::type::Class',
  },
  {
    path: 'test::M',
    content: {
      _type: 'mapping',
      classMappings: [
        {
          _type: 'pureInstance',
          class: 'test::A',
          propertyMappings: [],
          root: false,
        },
      ],
      enumerationMappings: [],
      includedMappings: [],
      name: 'M',
      package: 'test',
      tests: [],
    },
    classifierPath: 'meta::pure::mapping::Mapping',
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
          elements: ['test::A'],
          parserName: 'Pure',
        },
        {
          _type: 'importAware',
          imports: [],
          elements: ['test::M'],
          parserName: 'Mapping',
        },
      ],
    },
    classifierPath: 'meta::pure::metamodel::section::SectionIndex',
  },
];

export const TEST_DATA__ImportResolutionMultipleMatchesFound = [
  {
    path: 'test::A',
    content: {
      _type: 'class',
      name: 'A',
      package: 'test',
    },
    classifierPath: 'meta::pure::metamodel::type::Class',
  },
  {
    path: 'test2::A',
    content: {
      _type: 'class',
      name: 'A',
      package: 'test2',
    },
    classifierPath: 'meta::pure::metamodel::type::Class',
  },
  {
    path: 'test::B',
    content: {
      _type: 'class',
      name: 'B',
      package: 'test',
      superTypes: ['A'],
    },
    classifierPath: 'meta::pure::metamodel::type::Class',
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
          imports: ['test', 'test2'],
          elements: ['test::A', 'test2::A', 'test::B'],
          parserName: 'Pure',
        },
      ],
    },
    classifierPath: 'meta::pure::metamodel::section::SectionIndex',
  },
];

export const TEST_DATA__ReferenceWithoutSection = {
  original: [
    {
      path: '__internal__::SectionIndex',
      content: {
        _type: 'sectionIndex',
        name: 'SectionIndex',
        package: '__internal__',
        sections: [
          {
            _type: 'importAware',
            elements: ['test::tEnum', 'test::tProf'],
            imports: ['test'],
            parserName: 'Pure',
          },
        ],
      },
      classifierPath: 'meta::pure::metamodel::section::SectionIndex',
    },
    {
      path: 'test::tEnum',
      content: {
        _type: 'Enumeration',
        name: 'tEnum',
        package: 'test',
        stereotypes: [
          {
            profile: 'tProf',
            value: 'test',
          },
        ],
        taggedValues: [
          {
            tag: {
              profile: 'tProf',
              value: 'doc',
            },
            value: 'bla',
          },
        ],
        values: [
          {
            stereotypes: [
              {
                profile: 'tProf',
                value: 'test',
              },
            ],
            taggedValues: [
              {
                tag: {
                  profile: 'tProf',
                  value: 'doc',
                },
                value: 'Tag Value for enum Value',
              },
            ],
            value: 'a',
          },
          {
            stereotypes: [
              {
                profile: 'tProf',
                value: 'test',
              },
              {
                profile: 'tProf',
                value: 'test',
              },
            ],
            taggedValues: [
              {
                tag: {
                  profile: 'tProf',
                  value: 'doc',
                },
                value: 'Tag Value for enum Value',
              },
            ],
            value: 'b',
          },
          {
            value: 'c',
          },
        ],
      },
      classifierPath: 'meta::pure::metamodel::type::Enumeration',
    },
    {
      path: 'test::tProf',
      content: {
        _type: 'profile',
        name: 'tProf',
        package: 'test',
        stereotypes: [
          {
            value: 'test',
          },
        ],
        tags: [
          {
            value: 'doc',
          },
          {
            value: 'todo',
          },
        ],
      },
      classifierPath: 'meta::pure::metamodel::extension::Profile',
    },
  ],
  withoutSection: [
    {
      path: 'test::tEnum',
      content: {
        _type: 'Enumeration',
        name: 'tEnum',
        package: 'test',
        stereotypes: [
          {
            profile: 'test::tProf',
            value: 'test',
          },
        ],
        taggedValues: [
          {
            tag: {
              profile: 'test::tProf',
              value: 'doc',
            },
            value: 'bla',
          },
        ],
        values: [
          {
            stereotypes: [
              {
                profile: 'test::tProf',
                value: 'test',
              },
            ],
            taggedValues: [
              {
                tag: {
                  profile: 'test::tProf',
                  value: 'doc',
                },
                value: 'Tag Value for enum Value',
              },
            ],
            value: 'a',
          },
          {
            stereotypes: [
              {
                profile: 'test::tProf',
                value: 'test',
              },
              {
                profile: 'test::tProf',
                value: 'test',
              },
            ],
            taggedValues: [
              {
                tag: {
                  profile: 'test::tProf',
                  value: 'doc',
                },
                value: 'Tag Value for enum Value',
              },
            ],
            value: 'b',
          },
          {
            value: 'c',
          },
        ],
      },
      classifierPath: 'meta::pure::metamodel::type::Enumeration',
    },
    {
      path: 'test::tProf',
      content: {
        _type: 'profile',
        name: 'tProf',
        package: 'test',
        stereotypes: [
          {
            value: 'test',
          },
        ],
        tags: [
          {
            value: 'doc',
          },
          {
            value: 'todo',
          },
        ],
      },
      classifierPath: 'meta::pure::metamodel::extension::Profile',
    },
  ],
};

export const TEST_DATA__ReferenceModification = {
  original: [
    {
      path: 'test::tEnum',
      content: {
        _type: 'Enumeration',
        name: 'tEnum',
        package: 'test',
        taggedValues: [
          {
            tag: {
              profile: 'tProf',
              value: 's3',
            },
            value: 'asd',
          },
        ],
        values: [],
      },
      classifierPath: 'meta::pure::metamodel::type::Enumeration',
    },
    {
      path: 'test2::tProf',
      content: {
        _type: 'profile',
        name: 'tProf',
        package: 'test2',

        tags: [
          {
            value: 's1',
          },
          {
            value: 's2',
          },
        ],
      },
      classifierPath: 'meta::pure::metamodel::extension::Profile',
    },
    {
      path: 'test::tProf',
      content: {
        _type: 'profile',
        name: 'tProf',
        package: 'test',

        tags: [
          {
            value: 's3',
          },
          {
            value: 's4',
          },
        ],
      },
      classifierPath: 'meta::pure::metamodel::extension::Profile',
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
            imports: ['test'],
            elements: ['test::tEnum', 'test2::tProf', 'test::tProf'],
            parserName: 'Pure',
          },
        ],
      },
      classifierPath: 'meta::pure::metamodel::section::SectionIndex',
    },
  ],
  sameProfileModification: [
    {
      path: 'test::tEnum',
      content: {
        _type: 'Enumeration',
        name: 'tEnum',
        package: 'test',
        taggedValues: [
          {
            tag: {
              profile: 'tProf',
              value: 's4',
            },
            value: 'asd',
          },
        ],
        values: [],
      },
      classifierPath: 'meta::pure::metamodel::type::Enumeration',
    },
    {
      path: 'test2::tProf',
      content: {
        _type: 'profile',
        name: 'tProf',
        package: 'test2',
        tags: [
          {
            value: 's1',
          },
          {
            value: 's2',
          },
        ],
      },
      classifierPath: 'meta::pure::metamodel::extension::Profile',
    },
    {
      path: 'test::tProf',
      content: {
        _type: 'profile',
        name: 'tProf',
        package: 'test',
        tags: [
          {
            value: 's3',
          },
          {
            value: 's4',
          },
        ],
      },
      classifierPath: 'meta::pure::metamodel::extension::Profile',
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
            imports: ['test'],
            elements: ['test::tEnum', 'test2::tProf', 'test::tProf'],
            parserName: 'Pure',
          },
        ],
      },
      classifierPath: 'meta::pure::metamodel::section::SectionIndex',
    },
  ],
  differentProfileModification: [
    {
      path: 'test::tEnum',
      content: {
        _type: 'Enumeration',
        name: 'tEnum',
        package: 'test',
        taggedValues: [
          {
            tag: {
              profile: 'test2::tProf',
              value: 's1',
            },
            value: 'asd',
          },
        ],
        values: [],
      },
      classifierPath: 'meta::pure::metamodel::type::Enumeration',
    },
    {
      path: 'test2::tProf',
      content: {
        _type: 'profile',
        name: 'tProf',
        package: 'test2',
        tags: [
          {
            value: 's1',
          },
          {
            value: 's2',
          },
        ],
      },
      classifierPath: 'meta::pure::metamodel::extension::Profile',
    },
    {
      path: 'test::tProf',
      content: {
        _type: 'profile',
        name: 'tProf',
        package: 'test',
        tags: [
          {
            value: 's3',
          },
          {
            value: 's4',
          },
        ],
      },
      classifierPath: 'meta::pure::metamodel::extension::Profile',
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
            imports: ['test'],
            elements: ['test::tEnum', 'test2::tProf', 'test::tProf'],
            parserName: 'Pure',
          },
        ],
      },
      classifierPath: 'meta::pure::metamodel::section::SectionIndex',
    },
  ],
};
