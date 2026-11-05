/**
 * Copyright (c) 2026-present, Goldman Sachs
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

import { test, expect } from '@jest/globals';
import { unitTest } from '@finos/legend-shared/test';
import { getGrammarElementDeclarations } from '../GrammarTextEditorOutline.js';

const GRAMMAR = `###Pure
import meta::pure::profiles::*;

Profile model::Annotations
{
  stereotypes: [important];
  tags: [owner];
}

Class <<model::Annotations.important>> {model::Annotations.owner = 'Ops {team}'} model::Person
{
  name: String[1];
  {meta::pure::profiles::doc.doc = 'Full name'} fullName() {$this.name}: String[1];
}

function model::greet(name: String[1]): String[1]
{
  'Hello ' + $name
}


###Mapping
Mapping model::PersonMapping
(
  *model::Person: Pure
  {
    ~src model::Person
    name: $src.name
  }
)
`;

test(unitTest('Finds element declarations and where each one ends'), () => {
  expect(getGrammarElementDeclarations(GRAMMAR.split('\n'))).toEqual([
    {
      keyword: 'Profile',
      path: 'model::Annotations',
      startLine: 4,
      endLine: 8,
    },
    // stereotypes and tagged values (with a brace inside a quoted value) before the path
    {
      keyword: 'Class',
      path: 'model::Person',
      startLine: 10,
      endLine: 14,
    },
    // parameters after the path; trailing blank lines are not part of the element
    {
      keyword: 'function',
      path: 'model::greet',
      startLine: 16,
      endLine: 19,
    },
    // a section marker ends the previous element; a mapping body uses parentheses
    {
      keyword: 'Mapping',
      path: 'model::PersonMapping',
      startLine: 23,
      endLine: 30,
    },
  ]);
});

test(unitTest('Ignores imports and anything that is not at column 0'), () => {
  expect(
    getGrammarElementDeclarations([
      'import model::*;',
      '  Class model::Indented',
      '  *model::Person: Pure',
    ]),
  ).toEqual([]);
});
