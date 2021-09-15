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

export const roundtripTestData = [
  {
    path: 'anything::text',
    content: {
      _type: 'externalFormatSchemaSet',
      format: 'test',
      name: 'text',
      package: 'anything',
      schemas: [],
    },
    classifierPath: 'meta::external::shared::format::metamodel::SchemaSet',
  },
  {
    path: 'anything::text1',
    content: {
      _type: 'externalFormatSchemaSet',
      format: 'test',
      name: 'text1',
      package: 'anything',
      schemas: [
        {
          content: 'test content',
          id: 'id1',
          location: 'location1',
        },
        {
          content: 'test content2',
          id: 'id2',
          location: 'location2',
        },
      ],
    },
    classifierPath: 'meta::external::shared::format::metamodel::SchemaSet',
  },
  {
    path: 'anything::text3',
    content: {
      _type: 'binding',
      contentType: 'test',
      modelUnit: {
        packageableElementExcludes: [],
        packageableElementIncludes: [],
      },
      name: 'text3',
      package: 'anything',
      schemaSet: 'text',
    },
    classifierPath: 'meta::external::shared::format::binding::Binding',
  },
  {
    path: 'anything::tConn',
    content: {
      _type: 'connection',
      connectionValue: {
        _type: 'ExternalFormatConnection',
        element: 'text3',
        externalSource: {
          _type: 'urlStream',
          url: 'test',
        },
      },
      name: 'tConn',
      package: 'anything',
    },
    classifierPath: 'meta::pure::runtime::PackageableConnection',
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
          elements: ['anything::text'],
          parserName: 'ExternalFormat',
        },
        {
          _type: 'importAware',
          imports: [],
          elements: ['anything::text1'],
          parserName: 'ExternalFormat',
        },
        {
          _type: 'importAware',
          imports: ['anything'],
          elements: ['anything::text3'],
          parserName: 'Binding',
        },
        {
          _type: 'importAware',
          imports: ['anything'],
          elements: ['anything::tConn'],
          parserName: 'Connection',
        },
      ],
    },
    classifierPath: 'meta::pure::metamodel::section::SectionIndex',
  },
];
