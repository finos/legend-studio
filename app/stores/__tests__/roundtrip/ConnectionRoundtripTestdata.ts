/**
 * Copyright 2020 Goldman Sachs
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *      http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */

// References to resolve in Connection
// - JsonModel - class
// - XMLModel - class
// - Connection - store
export const testConnectionRoundtrip = [
  {
    'path': '__internal__::SectionIndex',
    'content': {
      '_type': 'sectionIndex',
      'name': 'SectionIndex',
      'package': '__internal__',
      'sections': [
        {
          '_type': 'importAware',
          'elements': [
            'test::tClass'
          ],
          'imports': [],
          'parserName': 'Pure'
        },
        {
          '_type': 'importAware',
          'elements': [
            'test::tConnJSON',
            'test::tConnXML'
          ],
          'imports': [
            'test'
          ],
          'parserName': 'Connection'
        }
      ]
    },
    'classifierPath': 'meta::pure::metamodel::section::SectionIndex'
  },
  {
    'path': 'test::tClass',
    'content': {
      '_type': 'class',
      'name': 'tClass',
      'package': 'test',
      'properties': [
        {
          'multiplicity': {
            'lowerBound': 1,
            'upperBound': 1
          },
          'name': 'name',
          'type': 'String'
        }
      ]
    },
    'classifierPath': 'meta::pure::metamodel::type::Class'
  },
  {
    'path': 'test::tConnJSON',
    'content': {
      '_type': 'connection',
      'connectionValue': {
        '_type': 'JsonModelConnection',
        'class': 'tClass',
        'element': 'ModelStore',
        'url': 'my_url'
      },
      'name': 'tConnJSON',
      'package': 'test'
    },
    'classifierPath': 'meta::pure::runtime::PackageableConnection'
  },
  {
    'path': 'test::tConnXML',
    'content': {
      '_type': 'connection',
      'connectionValue': {
        '_type': 'XmlModelConnection',
        'class': 'tClass',
        'element': 'ModelStore',
        'url': 'my_url'
      },
      'name': 'tConnXML',
      'package': 'test'
    },
    'classifierPath': 'meta::pure::runtime::PackageableConnection'
  }
];
