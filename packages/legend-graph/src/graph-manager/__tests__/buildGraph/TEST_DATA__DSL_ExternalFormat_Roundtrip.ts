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
    path: 'anything::schemaSet1',
    content: {
      _type: 'externalFormatSchemaSet',
      format: 'FlatData',
      name: 'schemaSet1',
      package: 'anything',
      schemas: [],
    },
    classifierPath: 'meta::external::format::shared::metamodel::SchemaSet',
  },
  {
    path: 'anything::schemaSet2',
    content: {
      _type: 'externalFormatSchemaSet',
      format: 'FlatData',
      name: 'schemaSet2',
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
    classifierPath: 'meta::external::format::shared::metamodel::SchemaSet',
  },
  {
    path: 'anything::binding1',
    content: {
      _type: 'binding',
      contentType: 'application/json',
      modelUnit: {
        packageableElementExcludes: [],
        packageableElementIncludes: [],
      },
      name: 'binding1',
      package: 'anything',
      schemaSet: 'anything::schemaSet1',
    },
    classifierPath: 'meta::external::format::shared::binding::Binding',
  },
  {
    path: 'anything::tConn',
    content: {
      _type: 'connection',
      connectionValue: {
        _type: 'ExternalFormatConnection',
        element: 'binding1',
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
          elements: ['anything::schemaSet1'],
          parserName: 'ExternalFormat',
        },
        {
          _type: 'importAware',
          imports: [],
          elements: ['anything::schemaSet2'],
          parserName: 'ExternalFormat',
        },
        {
          _type: 'importAware',
          imports: ['anything'],
          elements: ['anything::binding1'],
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
