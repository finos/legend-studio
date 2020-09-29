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

export const testTextRoundtrip = [
  {
    'path': 'anything::class',
    'content': {
      '_type': 'text',
      'content': 'this is just for context',
      'name': 'class',
      'package': 'anything',
      'type': 'plainText'
    },
    'classifierPath': 'meta::pure::metamodel::text::Text'
  },
  {
    'path': '__internal__::SectionIndex',
    'content': {
      '_type': 'sectionIndex',
      'name': 'SectionIndex',
      'package': '__internal__',
      'sections': [
        {
          '_type': 'importAware',
          'imports': [],
          'elements': [],
          'parserName': 'Pure'
        },
        {
          '_type': 'default',
          'elements': [
            'anything::class'
          ],
          'parserName': 'Text'
        }
      ]
    },
    'classifierPath': 'meta::pure::metamodel::section::SectionIndex'
  }
];
