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

import { unitTest } from '@finos/legend-shared/test';
import { describe, expect, test } from '@jest/globals';
import { validateAndBuildQuerySnapshot } from '../DataCubeQuerySnapshotBuilder.js';
import { assertErrorThrown, type PlainObject } from '@finos/legend-shared';
import { DataCubeQuery } from '../model/DataCubeQuery.js';
import { INTERNAL__DataCubeSource } from '../model/DataCubeSource.js';
import { DataCubeConfiguration } from '../model/DataCubeConfiguration.js';
import { TEST__DataCubeEngine } from './DataCubeTestUtils.js';
import type {
  DataCubeQuerySnapshot,
  DataCubeQuerySnapshotFilterCondition,
} from '../DataCubeQuerySnapshot.js';
import { DataCubeQueryFilterOperator } from '../DataCubeQueryEngine.js';

type TestCase = [
  string, // name
  string, // partial query
  { name: string; type: string }[], // source columns
  PlainObject | undefined, // configuration
  string | undefined, // error
  ((snapshot: DataCubeQuerySnapshot) => void) | undefined, // extra checks on snapshot
];

function _case(
  name: string,
  data: {
    query: string;
    columns?: string[] | undefined;
    configuration?: PlainObject | undefined;
    error?: string | undefined;
    validator?: ((snapshot: DataCubeQuerySnapshot) => void) | undefined;
  },
): TestCase {
  return [
    name,
    data.query,
    data.columns?.map((entry) => {
      const parts = entry.split(':');
      return {
        name: parts[0] as string,
        type: parts[1] as string,
      };
    }) ?? [],
    data.configuration,
    data.error,
    data.validator,
  ];
}

function _checkFilterOperator(operator: DataCubeQueryFilterOperator) {
  return (snapshot: DataCubeQuerySnapshot) => {
    expect(
      (
        snapshot.data.filter
          ?.conditions[0] as DataCubeQuerySnapshotFilterCondition
      ).operator,
    ).toBe(operator);
  };
}

const FOCUSED_TESTS: string[] = [
  // tests added here will be the only tests run
];

const cases: TestCase[] = [
  // --------------------------------- LEAF-LEVEL EXTEND ---------------------------------

  _case(`Leaf-level Extend: with simple expression`, {
    query: `extend(~[a:x|1])`,
  }),
  _case(`Leaf-level Extend: with complex expression`, {
    query: `extend(~[name:c|$c.val->toOne() + 1])`,
    columns: ['val:Integer'],
  }),
  _case(`Leaf-level Extend: multiple columns`, {
    query:
      "extend(~[name:c|$c.val->toOne() + 1])->extend(~[other:x|$x.str->toOne() + '_ext'])->extend(~[other2:x|$x.str->toOne() + '_1'])",
    columns: ['val:Integer', 'str:String'],
  }),
  _case(`Leaf-level Extend: ERROR - name clash with source columns`, {
    query: `extend(~[name:c|$c.val->toOne() + 1])`,
    columns: ['name:Integer', 'val:Integer'],
    error: `Can't process extend() expression: failed to retrieve type information for columns. Error: The relation contains duplicates: [name]`,
  }),
  _case(
    `Leaf-level Extend: ERROR - name clash among leaf-level extended columns`,
    {
      query: `extend(~[name:c|$c.val->toOne() + 1])->extend(~[name:c|$c.val->toOne() + 1])`,
      columns: ['val:Integer'],
      error: `Can't process extend() expression: failed to retrieve type information for columns. Error: The relation contains duplicates: [name]`,
    },
  ),
  _case(
    `Leaf-level Extend: ERROR - multiple columns within the same extend() expression`,
    {
      query: `extend(~[a:x|1, b:x|1])`,
      error: `Can't process extend() expression: Expected 1 column specification, got 2`,
    },
  ),
  _case(`Leaf-level Extend: ERROR - missing column's function expression`, {
    query: `extend(~[a])`,
    error: `Can't process extend() expression: Expected a transformation function expression for column 'a'`,
  }),
  _case(`Leaf-level Extend: ERROR - expression with compilation issue`, {
    query: `extend(~[a:x|$x.val + '_123'])`,
    columns: ['val:Integer'],
    error: `Can't process extend() expression: failed to retrieve type information for columns. Error: Can't find a match for function 'plus(Any[2])'`,
  }),

  // --------------------------------- FILTER ---------------------------------

  _case(`Filter: ==`, {
    query: `filter(x|$x.Age == 27)`,
    columns: ['Age:Integer'],
    validator: _checkFilterOperator(DataCubeQueryFilterOperator.EQUAL),
  }),
  _case(`Filter: == : NOT`, {
    query: `filter(x|$x.Age != 27)`,
    columns: ['Age:Integer'],
    validator: _checkFilterOperator(DataCubeQueryFilterOperator.NOT_EQUAL), // higher precendence than its non-negation counterpart
  }),
  _case(`Filter: == (case-insensitive)`, {
    query: `filter(x|$x.Name->toLower() == toLower('Asd'))`,
    columns: ['Name:String'],
    validator: _checkFilterOperator(
      DataCubeQueryFilterOperator.EQUAL_CASE_INSENSITIVE,
    ),
  }),
  _case(`Filter: == (case-insensitive) : NOT`, {
    query: `filter(x|$x.Name->toLower() != toLower('Asd'))`,
    columns: ['Name:String'],
    validator: _checkFilterOperator(
      DataCubeQueryFilterOperator.NOT_EQUAL_CASE_INSENSITIVE, // higher precendence than its non-negation counterpart
    ),
  }),
  _case(`Filter: == (case-insensitive) : ERROR - incompatible column`, {
    query: `filter(x|$x.Age->toLower() != toLower('Asd'))`,
    columns: ['Age:Integer'],
    error: `Can't process filter condition: no matching operator found`,
  }),
  _case(`Filter: == (case-insensitive) : ERROR - incompatible value`, {
    query: `filter(x|$x.Name->toLower() != toLower(2))`,
    columns: ['Name:String'],
    error: `Can't process filter condition: no matching operator found`,
  }),
  _case(`Filter: == column`, {
    query: `filter(x|$x.Name == $x.Name2)`,
    columns: ['Name:String', 'Name2:String'],
    validator: _checkFilterOperator(DataCubeQueryFilterOperator.EQUAL_COLUMN),
  }),
  _case(`Filter: == column : NOT`, {
    query: `filter(x|$x.Name != $x.Name2)`,
    columns: ['Name:String', 'Name2:String'],
    validator: _checkFilterOperator(
      DataCubeQueryFilterOperator.NOT_EQUAL_COLUMN,
    ), // higher precendence than its non-negation counterpart
  }),
  _case(`Filter: == column : ERROR - RHS column not found`, {
    query: `filter(x|!($x.Age == $x.Name))`,
    columns: ['Age:Integer'],
    error: `Can't find column 'Name'`,
  }),
  _case(`Filter: == column : ERROR - incompatible columns`, {
    query: `filter(x|$x.Name != $x.Age)`,
    columns: ['Name:String', 'Age:Integer'],
    error: `Can't process filter condition: no matching operator found`,
  }),
  _case(`Filter: == column (case-insensitive)`, {
    query: `filter(x|$x.Name->toLower() == $x.Name2->toLower())`,
    columns: ['Name:String', 'Name2:String'],
    validator: _checkFilterOperator(
      DataCubeQueryFilterOperator.EQUAL_CASE_INSENSITIVE_COLUMN,
    ),
  }),
  _case(`Filter: == column (case-insensitive) : NOT`, {
    query: `filter(x|$x.Name->toLower() != $x.Name2->toLower())`,
    columns: ['Name:String', 'Name2:String'],
    validator: _checkFilterOperator(
      DataCubeQueryFilterOperator.NOT_EQUAL_CASE_INSENSITIVE_COLUMN,
    ), // higher precendence than its non-negation counterpart
  }),
  _case(`Filter: > column : ERROR - RHS column not found`, {
    query: `filter(x|!($x.Name->toLower() == $x.Name2->toLower()))`,
    columns: ['Name:String'],
    error: `Can't find column 'Name2'`,
  }),
  _case(`Filter: == column (case-insensitive) : ERROR - incompatible columns`, {
    query: `filter(x|$x.Name->toLower() != $x.Name2->toLower())`,
    columns: ['Name:Integer', 'Name2:String'],
    error: `Can't process filter condition: no matching operator found`,
  }),
  _case(`Filter: contains()`, {
    query: `filter(x|$x.Name->contains('asd'))`,
    columns: ['Name:String'],
    validator: _checkFilterOperator(DataCubeQueryFilterOperator.CONTAIN),
  }),
  _case(`Filter: contains() : NOT`, {
    query: `filter(x|!$x.Name->contains('asd'))`,
    columns: ['Name:String'],
    validator: _checkFilterOperator(DataCubeQueryFilterOperator.NOT_CONTAIN), // higher precendence than its non-negation counterpart
  }),
  _case(`Filter: contains() : ERROR - incompatible column`, {
    query: `filter(x|!$x.Age->contains('asd'))`,
    columns: ['Age:Integer'],
    error: `Can't process filter condition: no matching operator found`,
  }),
  _case(`Filter: contains() : ERROR - incompatible value`, {
    query: `filter(x|!$x.Name->contains(2))`,
    columns: ['Name:String'],
    error: `Can't process filter condition: no matching operator found`,
  }),
  _case(`Filter: contains() (case-insensitive)`, {
    query: `filter(x|$x.Name->toLower()->contains(toLower('Asd')))`,
    columns: ['Name:String'],
    validator: _checkFilterOperator(
      DataCubeQueryFilterOperator.CONTAIN_CASE_INSENSITIVE,
    ),
  }),
  _case(`Filter: contains() (case-insensitive) : NOT`, {
    query: `filter(x|!$x.Name->toLower()->contains(toLower('Asd')))`,
    columns: ['Name:String'],
    validator: _checkFilterOperator(
      DataCubeQueryFilterOperator.CONTAIN_CASE_INSENSITIVE,
    ),
  }),
  _case(`Filter: contains() (case-insensitive) : ERROR - incompatible column`, {
    query: `filter(x|!$x.Age->toLower()->contains(toLower('Asd')))`,
    columns: ['Age:Integer'],
    error: `Can't process filter condition: no matching operator found`,
  }),
  _case(`Filter: contains() (case-insensitive) : ERROR - incompatible value`, {
    query: `filter(x|!$x.Name->toLower()->contains(toLower(2)))`,
    columns: ['Name:String'],
    error: `Can't process filter condition: no matching operator found`,
  }),
  _case(`Filter: endsWith()`, {
    query: `filter(x|$x.Name->endsWith('asd'))`,
    columns: ['Name:String'],
    validator: _checkFilterOperator(DataCubeQueryFilterOperator.END_WITH),
  }),
  _case(`Filter: endsWith() : NOT`, {
    query: `filter(x|!$x.Name->endsWith('asd'))`,
    columns: ['Name:String'],
    validator: _checkFilterOperator(DataCubeQueryFilterOperator.NOT_END_WITH), // higher precendence than its non-negation counterpart
  }),
  _case(`Filter: endsWith() : ERROR - incompatible column`, {
    query: `filter(x|!$x.Age->endsWith('asd'))`,
    columns: ['Age:Integer'],
    error: `Can't process filter condition: no matching operator found`,
  }),
  _case(`Filter: endsWith() : ERROR - incompatible value`, {
    query: `filter(x|!$x.Name->endsWith(2))`,
    columns: ['Name:String'],
    error: `Can't process filter condition: no matching operator found`,
  }),
  _case(`Filter: endsWith() (case-insensitive)`, {
    query: `filter(x|$x.Name->toLower()->endsWith(toLower('Asd')))`,
    columns: ['Name:String'],
    validator: _checkFilterOperator(
      DataCubeQueryFilterOperator.END_WITH_CASE_INSENSITIVE,
    ),
  }),
  _case(`Filter: endsWith() (case-insensitive) : NOT`, {
    query: `filter(x|!$x.Name->toLower()->endsWith(toLower('Asd')))`,
    columns: ['Name:String'],
    validator: _checkFilterOperator(
      DataCubeQueryFilterOperator.END_WITH_CASE_INSENSITIVE,
    ),
  }),
  _case(`Filter: endsWith() (case-insensitive) : ERROR - incompatible column`, {
    query: `filter(x|!$x.Age->toLower()->endsWith(toLower('Asd')))`,
    columns: ['Age:Integer'],
    error: `Can't process filter condition: no matching operator found`,
  }),
  _case(`Filter: endsWith() (case-insensitive) : ERROR - incompatible value`, {
    query: `filter(x|!$x.Name->toLower()->endsWith(toLower(2)))`,
    columns: ['Name:String'],
    error: `Can't process filter condition: no matching operator found`,
  }),
  _case(`Filter: startsWith()`, {
    query: `filter(x|$x.Name->startsWith('asd'))`,
    columns: ['Name:String'],
    validator: _checkFilterOperator(DataCubeQueryFilterOperator.START_WITH),
  }),
  _case(`Filter: startsWith() : NOT`, {
    query: `filter(x|!$x.Name->startsWith('asd'))`,
    columns: ['Name:String'],
    validator: _checkFilterOperator(DataCubeQueryFilterOperator.NOT_START_WITH), // higher precendence than its non-negation counterpart
  }),
  _case(`Filter: startsWith() : ERROR - incompatible column`, {
    query: `filter(x|!$x.Age->startsWith('asd'))`,
    columns: ['Age:Integer'],
    error: `Can't process filter condition: no matching operator found`,
  }),
  _case(`Filter: startsWith() : ERROR - incompatible value`, {
    query: `filter(x|!$x.Name->startsWith(2))`,
    columns: ['Name:String'],
    error: `Can't process filter condition: no matching operator found`,
  }),
  _case(`Filter: startsWith() (case-insensitive)`, {
    query: `filter(x|$x.Name->toLower()->startsWith(toLower('Asd')))`,
    columns: ['Name:String'],
    validator: _checkFilterOperator(
      DataCubeQueryFilterOperator.START_WITH_CASE_INSENSITIVE,
    ),
  }),
  _case(`Filter: startsWith() (case-insensitive) : NOT`, {
    query: `filter(x|!$x.Name->toLower()->startsWith(toLower('Asd')))`,
    columns: ['Name:String'],
    validator: _checkFilterOperator(
      DataCubeQueryFilterOperator.START_WITH_CASE_INSENSITIVE,
    ),
  }),
  _case(
    `Filter: startsWith() (case-insensitive) : ERROR - incompatible column`,
    {
      query: `filter(x|!$x.Age->toLower()->startsWith(toLower('Asd')))`,
      columns: ['Age:Integer'],
      error: `Can't process filter condition: no matching operator found`,
    },
  ),
  _case(
    `Filter: startsWith() (case-insensitive) : ERROR - incompatible value`,
    {
      query: `filter(x|!$x.Name->toLower()->startsWith(toLower(2)))`,
      columns: ['Name:String'],
      error: `Can't process filter condition: no matching operator found`,
    },
  ),
  _case(`Filter: isEmpty()`, {
    query: `filter(x|$x.Name->isEmpty())`,
    columns: ['Name:String'],
    validator: _checkFilterOperator(DataCubeQueryFilterOperator.IS_NULL),
  }),
  _case(`Filter: isEmpty() : NOT`, {
    query: `filter(x|!$x.Name->isEmpty())`,
    columns: ['Name:String'],
    validator: _checkFilterOperator(DataCubeQueryFilterOperator.IS_NOT_NULL), // higher precendence than its non-negation counterpart
  }),
  _case(`Filter: >`, {
    query: `filter(x|$x.Age > 27)`,
    columns: ['Age:Integer'],
    validator: _checkFilterOperator(DataCubeQueryFilterOperator.GREATER_THAN),
  }),
  _case(`Filter: > : NOT`, {
    query: `filter(x|!($x.Age > 27))`,
    columns: ['Age:Integer'],
    validator: _checkFilterOperator(DataCubeQueryFilterOperator.GREATER_THAN),
  }),
  _case(`Filter: > : ERROR - incompatible column`, {
    query: `filter(x|!($x.Name > 27))`,
    columns: ['Name:String'],
    error: `Can't process filter condition: no matching operator found`,
  }),
  _case(`Filter: > : ERROR - incompatible value`, {
    query: `filter(x|!($x.Age > 'asd'))`,
    columns: ['Age:Integer'],
    error: `Can't process filter condition: no matching operator found`,
  }),
  _case(`Filter: > column`, {
    query: `filter(x|$x.Age > $x.Age2)`,
    columns: ['Age:Integer', 'Age2:Integer'],
    validator: _checkFilterOperator(
      DataCubeQueryFilterOperator.GREATER_THAN_COLUMN,
    ),
  }),
  _case(`Filter: > column : NOT`, {
    query: `filter(x|!($x.Age > $x.Age2))`,
    columns: ['Age:Integer', 'Age2:Integer'],
    validator: _checkFilterOperator(
      DataCubeQueryFilterOperator.GREATER_THAN_COLUMN,
    ),
  }),
  _case(`Filter: > column : ERROR - RHS column not found`, {
    query: `filter(x|!($x.Age > $x.Name))`,
    columns: ['Age:Integer'],
    error: `Can't find column 'Name'`,
  }),
  _case(`Filter: > column : ERROR - incompatible columns`, {
    query: `filter(x|!($x.Age > $x.Name))`,
    columns: ['Age:Integer', 'Name:String'],
    error: `Can't process filter condition: no matching operator found`,
  }),
  _case(`Filter: >=`, {
    query: `filter(x|$x.Age >= 27)`,
    columns: ['Age:Integer'],
    validator: _checkFilterOperator(
      DataCubeQueryFilterOperator.GREATER_THAN_OR_EQUAL,
    ),
  }),
  _case(`Filter: >= : NOT`, {
    query: `filter(x|!($x.Age >= 27))`,
    columns: ['Age:Integer'],
    validator: _checkFilterOperator(
      DataCubeQueryFilterOperator.GREATER_THAN_OR_EQUAL,
    ),
  }),
  _case(`Filter: >= : ERROR - incompatible column`, {
    query: `filter(x|!($x.Name >= 27))`,
    columns: ['Name:String'],
    error: `Can't process filter condition: no matching operator found`,
  }),
  _case(`Filter: >= : ERROR - incompatible value`, {
    query: `filter(x|!($x.Age >= 'asd'))`,
    columns: ['Age:Integer'],
    error: `Can't process filter condition: no matching operator found`,
  }),
  _case(`Filter: >= column`, {
    query: `filter(x|$x.Age >= $x.Age2)`,
    columns: ['Age:Integer', 'Age2:Integer'],
    validator: _checkFilterOperator(
      DataCubeQueryFilterOperator.GREATER_THAN_OR_EQUAL_COLUMN,
    ),
  }),
  _case(`Filter: >= column : NOT`, {
    query: `filter(x|!($x.Age >= $x.Age2))`,
    columns: ['Age:Integer', 'Age2:Integer'],
    validator: _checkFilterOperator(
      DataCubeQueryFilterOperator.GREATER_THAN_OR_EQUAL_COLUMN,
    ),
  }),
  _case(`Filter: >= column : ERROR - RHS column not found`, {
    query: `filter(x|!($x.Age >= $x.Name))`,
    columns: ['Age:Integer'],
    error: `Can't find column 'Name'`,
  }),
  _case(`Filter: >= column : ERROR - incompatible columns`, {
    query: `filter(x|!($x.Age >= $x.Name))`,
    columns: ['Age:Integer', 'Name:String'],
    error: `Can't process filter condition: no matching operator found`,
  }),
  _case(`Filter: <`, {
    query: `filter(x|$x.Age < 27)`,
    columns: ['Age:Integer'],
    validator: _checkFilterOperator(DataCubeQueryFilterOperator.LESS_THAN),
  }),
  _case(`Filter: < : NOT`, {
    query: `filter(x|!($x.Age < 27))`,
    columns: ['Age:Integer'],
    validator: _checkFilterOperator(DataCubeQueryFilterOperator.LESS_THAN),
  }),
  _case(`Filter: < : ERROR - incompatible column`, {
    query: `filter(x|!($x.Name < 27))`,
    columns: ['Name:String'],
    error: `Can't process filter condition: no matching operator found`,
  }),
  _case(`Filter: < : ERROR - incompatible value`, {
    query: `filter(x|!($x.Age < 'asd'))`,
    columns: ['Age:Integer'],
    error: `Can't process filter condition: no matching operator found`,
  }),
  _case(`Filter: < column`, {
    query: `filter(x|$x.Age < $x.Age2)`,
    columns: ['Age:Integer', 'Age2:Integer'],
    validator: _checkFilterOperator(
      DataCubeQueryFilterOperator.LESS_THAN_COLUMN,
    ),
  }),
  _case(`Filter: < column : NOT`, {
    query: `filter(x|!($x.Age < $x.Age2))`,
    columns: ['Age:Integer', 'Age2:Integer'],
    validator: _checkFilterOperator(
      DataCubeQueryFilterOperator.LESS_THAN_COLUMN,
    ),
  }),
  _case(`Filter: < column : ERROR - RHS column not found`, {
    query: `filter(x|!($x.Age < $x.Name))`,
    columns: ['Age:Integer'],
    error: `Can't find column 'Name'`,
  }),
  _case(`Filter: < column : ERROR - incompatible columns`, {
    query: `filter(x|!($x.Age < $x.Name))`,
    columns: ['Age:Integer', 'Name:String'],
    error: `Can't process filter condition: no matching operator found`,
  }),
  _case(`Filter: <=`, {
    query: `filter(x|$x.Age <= 27)`,
    columns: ['Age:Integer'],
    validator: _checkFilterOperator(
      DataCubeQueryFilterOperator.LESS_THAN_OR_EQUAL,
    ),
  }),
  _case(`Filter: <= : NOT`, {
    query: `filter(x|!($x.Age <= 27))`,
    columns: ['Age:Integer'],
    validator: _checkFilterOperator(
      DataCubeQueryFilterOperator.LESS_THAN_OR_EQUAL,
    ),
  }),
  _case(`Filter: <= : ERROR - incompatible column`, {
    query: `filter(x|!($x.Name <= 27))`,
    columns: ['Name:String'],
    error: `Can't process filter condition: no matching operator found`,
  }),
  _case(`Filter: <= : ERROR - incompatible value`, {
    query: `filter(x|!($x.Age <= 'asd'))`,
    columns: ['Age:Integer'],
    error: `Can't process filter condition: no matching operator found`,
  }),
  _case(`Filter: <= column`, {
    query: `filter(x|$x.Age <= $x.Age2)`,
    columns: ['Age:Integer', 'Age2:Integer'],
    validator: _checkFilterOperator(
      DataCubeQueryFilterOperator.LESS_THAN_OR_EQUAL_COLUMN,
    ),
  }),
  _case(`Filter: <= column : NOT`, {
    query: `filter(x|!($x.Age <= $x.Age2))`,
    columns: ['Age:Integer', 'Age2:Integer'],
    validator: _checkFilterOperator(
      DataCubeQueryFilterOperator.LESS_THAN_OR_EQUAL_COLUMN,
    ),
  }),
  _case(`Filter: <= column : ERROR - RHS column not found`, {
    query: `filter(x|!($x.Age <= $x.Name))`,
    columns: ['Age:Integer'],
    error: `Can't find column 'Name'`,
  }),
  _case(`Filter: <= column : ERROR - incompatible columns`, {
    query: `filter(x|!($x.Age <= $x.Name))`,
    columns: ['Age:Integer', 'Name:String'],
    error: `Can't process filter condition: no matching operator found`,
  }),
  _case(`Filter: !=`, {
    query: `filter(x|$x.Age != 27)`,
    columns: ['Age:Integer'],
    validator: _checkFilterOperator(DataCubeQueryFilterOperator.NOT_EQUAL),
  }),
  _case(`Filter: != : NOT`, {
    query: `filter(x|!($x.Age != 27))`,
    columns: ['Age:Integer'],
    validator: _checkFilterOperator(DataCubeQueryFilterOperator.NOT_EQUAL),
  }),
  _case(`Filter: != (case-insensitive)`, {
    query: `filter(x|$x.Name->toLower() != toLower('Asd'))`,
    columns: ['Name:String'],
    validator: _checkFilterOperator(
      DataCubeQueryFilterOperator.NOT_EQUAL_CASE_INSENSITIVE,
    ),
  }),
  _case(`Filter: != (case-insensitive) : NOT`, {
    query: `filter(x|!($x.Name->toLower() != toLower('Asd')))`,
    columns: ['Name:String'],
    validator: _checkFilterOperator(
      DataCubeQueryFilterOperator.NOT_EQUAL_CASE_INSENSITIVE,
    ),
  }),
  _case(`Filter: != (case-insensitive) : ERROR - incompatible column`, {
    query: `filter(x|!($x.Age->toLower() != toLower('Asd')))`,
    columns: ['Age:Integer'],
    error: `Can't process filter condition: no matching operator found`,
  }),
  _case(`Filter: != (case-insensitive) : ERROR - incompatible value`, {
    query: `filter(x|!($x.Name->toLower() != toLower(2)))`,
    columns: ['Name:String'],
    error: `Can't process filter condition: no matching operator found`,
  }),
  _case(`Filter: != column`, {
    query: `filter(x|$x.Name != $x.Name2)`,
    columns: ['Name:String', 'Name2:String'],
    validator: _checkFilterOperator(
      DataCubeQueryFilterOperator.NOT_EQUAL_COLUMN,
    ),
  }),
  _case(`Filter: != column : NOT`, {
    query: `filter(x|!($x.Name != $x.Name2))`,
    columns: ['Name:String', 'Name2:String'],
    validator: _checkFilterOperator(
      DataCubeQueryFilterOperator.NOT_EQUAL_COLUMN,
    ),
  }),
  _case(`Filter: != column : ERROR - RHS column not found`, {
    query: `filter(x|!($x.Name != $x.Age))`,
    columns: ['Name:String'],
    error: `Can't find column 'Age'`,
  }),
  _case(`Filter: != column : ERROR - incompatible columns`, {
    query: `filter(x|!($x.Name != $x.Age))`,
    columns: ['Name:String', 'Age:Integer'],
    error: `Can't process filter condition: no matching operator found`,
  }),
  _case(`Filter: != column (case-insensitive)`, {
    query: `filter(x|$x.Name->toLower() != $x.Name2->toLower())`,
    columns: ['Name:String', 'Name2:String'],
    validator: _checkFilterOperator(
      DataCubeQueryFilterOperator.NOT_EQUAL_CASE_INSENSITIVE_COLUMN,
    ),
  }),
  _case(`Filter: != column (case-insensitive) : NOT`, {
    query: `filter(x|!($x.Name->toLower() != $x.Name2->toLower()))`,
    columns: ['Name:String', 'Name2:String'],
    validator: _checkFilterOperator(
      DataCubeQueryFilterOperator.NOT_EQUAL_CASE_INSENSITIVE_COLUMN,
    ),
  }),
  _case(`Filter: != column : ERROR - RHS column not found`, {
    query: `filter(x|!($x.Name->toLower() != $x.Name2->toLower()))`,
    columns: ['Name:String'],
    error: `Can't find column 'Name2'`,
  }),
  _case(`Filter: != column (case-insensitive) : ERROR - incompatible columns`, {
    query: `filter(x|!($x.Name->toLower() != $x.Age->toLower()))`,
    columns: ['Name:String', 'Age:Integer'],
    error: `Can't process filter condition: no matching operator found`,
  }),
  _case(`Filter: !contains()`, {
    query: `filter(x|!$x.Name->contains('asd'))`,
    columns: ['Name:String'],
    validator: _checkFilterOperator(DataCubeQueryFilterOperator.NOT_CONTAIN),
  }),
  _case(`Filter: !contains() : NOT`, {
    query: `filter(x|!!$x.Name->contains('asd'))`,
    columns: ['Name:String'],
    validator: _checkFilterOperator(DataCubeQueryFilterOperator.NOT_CONTAIN),
  }),
  _case(`Filter: !contains() : ERROR - incompatible column`, {
    query: `filter(x|!!$x.Age->contains('asd'))`,
    columns: ['Age:Integer'],
    error: `Can't process filter condition: no matching operator found`,
  }),
  _case(`Filter: !contains() : ERROR - incompatible value`, {
    query: `filter(x|!!$x.Name->contains(2))`,
    columns: ['Name:String'],
    error: `Can't process filter condition: no matching operator found`,
  }),
  _case(`Filter: !endsWith()`, {
    query: `filter(x|!$x.Name->endsWith('asd'))`,
    columns: ['Name:String'],
    validator: _checkFilterOperator(DataCubeQueryFilterOperator.NOT_END_WITH),
  }),
  _case(`Filter: !endsWith() : NOT`, {
    query: `filter(x|!!$x.Name->endsWith('asd'))`,
    columns: ['Name:String'],
    validator: _checkFilterOperator(DataCubeQueryFilterOperator.NOT_END_WITH),
  }),
  _case(`Filter: !endsWith() : ERROR - incompatible column`, {
    query: `filter(x|!!$x.Age->endsWith('asd'))`,
    columns: ['Age:Integer'],
    error: `Can't process filter condition: no matching operator found`,
  }),
  _case(`Filter: !endsWith() : ERROR - incompatible value`, {
    query: `filter(x|!!$x.Name->endsWith(2))`,
    columns: ['Name:String'],
    error: `Can't process filter condition: no matching operator found`,
  }),
  _case(`Filter: !startsWith()`, {
    query: `filter(x|!$x.Name->startsWith('asd'))`,
    columns: ['Name:String'],
    validator: _checkFilterOperator(DataCubeQueryFilterOperator.NOT_START_WITH),
  }),
  _case(`Filter: !startsWith() : NOT`, {
    query: `filter(x|!!$x.Name->startsWith('asd'))`,
    columns: ['Name:String'],
    validator: _checkFilterOperator(DataCubeQueryFilterOperator.NOT_START_WITH),
  }),
  _case(`Filter: !startsWith() : ERROR - incompatible column`, {
    query: `filter(x|!!$x.Age->startsWith('asd'))`,
    columns: ['Age:Integer'],
    error: `Can't process filter condition: no matching operator found`,
  }),
  _case(`Filter: !startsWith() : ERROR - incompatible value`, {
    query: `filter(x|!!$x.Name->startsWith(2))`,
    columns: ['Name:String'],
    error: `Can't process filter condition: no matching operator found`,
  }),
  _case(`Filter: !isEmpty()`, {
    query: `filter(x|!$x.Name->isEmpty())`,
    columns: ['Name:String'],
    validator: _checkFilterOperator(DataCubeQueryFilterOperator.IS_NOT_NULL),
  }),
  _case(`Filter: !isEmpty() : NOT`, {
    query: `filter(x|!!$x.Name->isEmpty())`,
    columns: ['Name:String'],
    validator: _checkFilterOperator(DataCubeQueryFilterOperator.IS_NOT_NULL),
  }),

  // filter tree grouping
  _case(`Filter: OR group`, {
    query: `filter(x|($x.Age != 27) || ($x.Name->toLower() != toLower('Michael Phelps')))`,
    columns: ['Age:Integer', 'Name:String'],
  }),
  _case(`Filter: OR group : NOT`, {
    query: `filter(x|!(($x.Age != 27) || ($x.Name->toLower() != toLower('Michael Phelps'))))`,
    columns: ['Age:Integer', 'Name:String'],
  }),
  _case(`Filter: AND group`, {
    query: `filter(x|($x.Age != 27) && ($x.Name == 'Michael Phelps'))`,
    columns: ['Age:Integer', 'Name:String'],
  }),
  _case(`Filter: AND group : NOT`, {
    query: `filter(x|!(($x.Age != 27) && ($x.Name == 'Michael Phelps')))`,
    columns: ['Age:Integer', 'Name:String'],
  }),
  _case(`Filter: simple grouping`, {
    query: `filter(x|$x.Name->toLower()->endsWith(toLower('Phelps')) || !(($x.Age != 27) && ($x.Name == 'Michael Phelps')))`,
    columns: ['Age:Integer', 'Name:String'],
  }),
  _case(`Filter: complex grouping`, {
    query: `filter(x|!(($x.Age != 27) && ($x.Name == 'Michael Phelps')) && ($x.Country->startsWith('united') || ($x.Country == 'test')))`,
    columns: ['Age:Integer', 'Name:String', 'Country:String'],
  }),
  _case(`Filter: with leaf-level extended column`, {
    query: `extend(~[name:c|$c.val->toOne() + 1])->filter(x|$x.name != 27)`,
    columns: ['val:Integer'],
  }),

  _case(`Filter: ERROR - LHS column not found`, {
    query: `filter(x|$x.Age > 1)`,
    error: `Can't find column 'Age'`,
  }),
  _case(`Filter: ERROR - bad argument: non-lambda provided`, {
    query: `filter('2')`,
    error: `Can't process filter() expression: Expected parameter at index 0 to be a lambda expression`,
  }),
  _case(`Filter: ERROR - bad argument: complex lambda provided`, {
    query: `filter({x|let a = 1; $x.Age == 24;})`,
    error: `Can't process filter() expression: Expected lambda body to have exactly 1 expression`,
  }),
  _case(`Filter: ERROR - Unsupported operator`, {
    query: `filter(x|$x.Age + 27 > 1)`,
    error: `Can't process filter condition: no matching operator found`,
  }),

  // --------------------------------- SELECT ---------------------------------

  _case(`Select: single column`, {
    query: `select(~[a])`,
    columns: ['a:Integer', 'c:String'],
  }),
  _case(`Select: multiple columns`, {
    query: `select(~[a, b])`,
    columns: ['a:Integer', 'b:String'],
  }),
  _case(`Select: ERROR - selected column not found`, {
    query: `select(~[a, c])`,
    columns: ['a:Integer', 'b:String'],
    error: `Can't find column 'c'`,
  }),

  // --------------------------------- PIVOT ---------------------------------

  // _case(`GENERIC: Bad composition pivot()`, {
  //   query: `pivot(~a, ~b:x|$x.a:x|$x->sum())`,
  //   error: `Unsupported function composition pivot() (supported composition: extend()->filter()->select()->[sort()->pivot()->cast()]->[groupBy()->sort()]->extend()->sort()->limit())`,
  // }),
  // _case(`Valid: Usage - Pivot: pivot()->cast()->sort()->limit()`, {
  //   query: `pivot(~a, ~b:x|$x.a:x|$x->sum())->cast(@meta::pure::metamodel::relation::Relation<(a:Integer)>)->sort([ascending(~a)])->limit(10)`,
  //   columns: ['a:Integer'],
  // }),
  // _case(`Valid: pivot()`, {
  //   query: `pivot(~a, ~b:x|$x.a:x|$x->sum())->cast(@meta::pure::metamodel::relation::Relation<(a:Integer)>)`,
  // }),
  _case(`Pivot: ERROR - casting used without dynamic function pivot()`, {
    query: `cast(@meta::pure::metamodel::relation::Relation<(a:Integer)>)`,
    error: `Can't process expression: Unsupported function composition cast() (supported composition: extend()->filter()->select()->[sort()->pivot()->cast()]->[groupBy()->sort()]->extend()->sort()->limit())`,
  }),

  // --------------------------------- GROUP BY ---------------------------------

  _case(`GroupBy: BASIC`, {
    query: `select(~[a, b])->groupBy(~[a], ~[b:x|$x.b:x|$x->sum()])->sort([~a->ascending()])`,
    columns: ['a:String', 'b:Integer'],
  }),
  _case(`GroupBy: ERROR - group by column not found`, {
    query: `select(~[b])->groupBy(~[a], ~[b:x|$x.b:x|$x->sum()])->sort([~a->ascending()])`,
    columns: ['a:String', 'b:Integer'],
    error: `Can't find column 'a'`,
  }),

  // --------------------------------- GROUP-LEVEL EXTEND ---------------------------------

  _case(`Group-level Extend: with simple expression`, {
    query: `select(~[b])->extend(~[a:x|1])`,
    columns: ['b:Integer'],
  }),
  _case(`Group-level Extend: with complex expression`, {
    query: `select(~[val])->extend(~[name:c|$c.val->toOne() + 1])`,
    columns: ['val:Integer'],
  }),
  _case(`Group-level Extend: multiple columns`, {
    query:
      "select(~[val, str])->extend(~[name:c|$c.val->toOne() + 1])->extend(~[other:x|$x.str->toOne() + '_ext'])->extend(~[other2:x|$x.str->toOne() + '_1'])",
    columns: ['val:Integer', 'str:String'],
  }),
  _case(`Group-level Extend: ERROR - name clash with source columns`, {
    query: `select(~[name, val])->extend(~[name:c|$c.val->toOne() + 1])`,
    columns: ['name:Integer', 'val:Integer'],
    error: `Can't process extend() expression: failed to retrieve type information for columns. Error: The relation contains duplicates: [name]`,
  }),
  _case(
    `Group-level Extend: ERROR - name clash with leaf-level extended columns`,
    {
      query: `extend(~[name:c|$c.val->toOne() + 1])->select(~[name, val])->extend(~[name:c|$c.val->toOne() + 1])`,
      columns: ['val:Integer'],
      error: `Can't process extend() expression: failed to retrieve type information for columns. Error: The relation contains duplicates: [name]`,
    },
  ),
  _case(
    `Group-level Extend: ERROR - name clash among group-level extended columns`,
    {
      query: `select(~[val])->extend(~[name:c|$c.val->toOne() + 1])->extend(~[name:c|$c.val->toOne() + 1])`,
      columns: ['val:Integer'],
      error: `Can't process extend() expression: failed to retrieve type information for columns. Error: The relation contains duplicates: [name]`,
    },
  ),
  _case(
    `Group-level Extend: ERROR - multiple columns within the same extend() expression`,
    {
      query: `select(~[val])->extend(~[a:x|1, b:x|1])`,
      columns: ['val:Integer'],
      error: `Can't process extend() expression: Expected 1 column specification, got 2`,
    },
  ),
  _case(`Group-level Extend: ERROR - missing column's function expression`, {
    query: `select(~[val])->extend(~[a])`,
    columns: ['val:Integer'],
    error: `Can't process extend() expression: Expected a transformation function expression for column 'a'`,
  }),
  _case(`Group-level Extend: ERROR - expression with compilation issue`, {
    query: `select(~[val])->extend(~[a:x|$x.val + '_123'])`,
    columns: ['val:Integer'],
    error: `Can't process extend() expression: failed to retrieve type information for columns. Error: Can't find a match for function 'plus(Any[2])'`,
  }),

  // --------------------------------- SORT ---------------------------------

  _case(`Sort: single column ascending`, {
    query: `select(~[a])->sort([~a->ascending()])`,
    columns: ['a:Integer'],
  }),
  _case(`Sort: single column descending`, {
    query: `select(~[a])->sort([~a->descending()])`,
    columns: ['a:String'],
  }),
  _case(`Sort: multiple columns ascending`, {
    query: `select(~[a, b])->sort([~a->ascending(), ~b->ascending()])`,
    columns: ['a:Integer', 'b:Integer'],
  }),
  _case(`Sort: multiple columns descending`, {
    query: `select(~[a, b])->sort([~a->descending(), ~b->descending()])`,
    columns: ['a:Integer', 'b:Integer'],
  }),
  _case(`Sort: multiple columns mixed directions`, {
    query: `select(~[a, b])->sort([~a->ascending(), ~b->descending()])`,
    columns: ['a:Integer', 'b:Integer'],
  }),
  _case(`Sort: ERROR - bad argument: non-collection provided`, {
    query: `select(~[a])->sort(~a->something())`,
    columns: ['a:Integer'],
    error: `Can't process sort() expression: Expected parameter at index 0 to be a collection`,
  }),
  _case(`Sort: ERROR - unsupported function`, {
    query: `select(~[a])->sort([~a->something()])`,
    columns: ['a:Integer'],
    error: `Can't process function: Expected function to be one of [ascending, descending]`,
  }),
  _case(`Sort: ERROR - column not found`, {
    query: `select(~[a])->sort([~b->ascending()])`,
    columns: ['a:Integer'],
    error: `Can't find column 'b'`,
  }),

  // --------------------------------- LIMIT ---------------------------------

  _case(`Limit: with integer number`, {
    query: `limit(10)`,
  }),
  _case(`Limit: ERROR - bad argument: decimal number provided`, {
    query: `limit(15.5)`,
    error: `Can't process limit() expression: Expected limit to be a non-negative integer value`,
  }),
  _case(`Limit: ERROR - bad argument: non-negative number provided`, {
    query: `limit(-10)`,
    error: `Can't process limit() expression: Expected limit to be a non-negative integer value`,
  }),
  _case(`Limit: ERROR - bad argument: non-integer provided`, {
    query: `limit('asd')`,
    error: `Can't process limit() expression: Expected limit to be a non-negative integer value`,
  }),

  // --------------------------------- COMPOSITION ---------------------------------

  _case(`GENERIC: Composition - extend()->filter()->sort()->limit()`, {
    query: `extend(~[a:x|1])->filter(x|$x.a == 1)->select(~[a])->sort([~a->ascending()])->limit(10)`,
  }),
  _case(
    `GENERIC: Composition - extend()->filter()->select()->sort()->limit()`,
    {
      query: `extend(~[a:x|1])->filter(x|$x.a == 1)->select(~[a])->sort([~a->ascending()])->limit(10)`,
    },
  ),
  _case(
    `GENERIC: Composition - extend()->groupBy()->extend()->sort()->limit()`,
    {
      query: `extend(~[a:x|1])->select(~[a, b])->groupBy(~[a], ~[b:x|$x.b:x|$x->sum()])->sort([~a->ascending()])->extend(~[c:x|2])->limit(10)`,
      columns: ['b:Integer'],
    },
  ),
  _case(
    `GENERIC: Composition - extend()->groupBy()->extend()->extend()->sort()->limit()`,
    {
      query: `extend(~[a:x|1])->select(~[a, b])->groupBy(~[a], ~[b:x|$x.b:x|$x->sum()])->sort([~a->ascending()])->extend(~[c:x|2])->extend(~[d:x|2])->limit(10)`,
      columns: ['b:Integer'],
    },
  ),
  _case(
    `GENERIC: Composition - extend()->filter()->groupBy()->extend()->sort()->limit()`,
    {
      query: `extend(~[a:x|1])->filter(x|$x.a == 1)->select(~[a, b])->groupBy(~[a], ~[b:x|$x.b:x|$x->sum()])->sort([~a->ascending()])->extend(~[c:x|2])->limit(10)`,
      columns: ['b:Integer'],
    },
  ),
  _case(
    `GENERIC: Composition - extend()->filter()->groupBy()->sort()->limit()`,
    {
      query: `extend(~[a:x|1])->filter(x|$x.a == 1)->select(~[a, b])->groupBy(~[a], ~[b:x|$x.b:x|$x->sum()])->sort([~a->ascending()])->limit(10)`,
      columns: ['b:Integer'],
    },
  ),

  // --------------------------------- VALIDATION ---------------------------------

  _case(`GENERIC: ERROR - not a function expression`, {
    query: `2`,
    error: `Can't process expression: Expected a function expression`,
  }),
  _case(`GENERIC: ERROR - not a chain of function calls`, {
    query: `select(~[a, b], 'something')`,
    columns: ['a:Integer', 'b:Integer'],
    error: `Can't process expression: Expected a sequence of function calls (e.g. x()->y()->z())`,
  }),
  _case(`GENERIC: ERROR - unsupported function`, {
    query: `sort([~asd->ascending()])->something()`,
    error: `Can't process expression: Found unsupported function something()`,
  }),
  _case(`GENERIC: ERROR - wrong number of paramters provided`, {
    query: `select(~[a, b], 2, 'asd')`,
    columns: ['a:Integer', 'b:Integer'],
    error: `Can't process select() expression: Expected at most 2 parameters provided, got 3`,
  }),
  _case(`GENERIC: ERROR - bad GENERIC: Composition - select()->filter()`, {
    query: `select(~a)->filter(x|$x.a==1)`,
    columns: ['a:Integer'],
    error: `Can't process expression: Unsupported function composition select()->filter() (supported composition: extend()->filter()->select()->[sort()->pivot()->cast()]->[groupBy()->sort()]->extend()->sort()->limit())`,
  }),
  _case(`GENERIC: ERROR - name clash among source columns`, {
    query: `select(~[a, b])`,
    columns: ['a:Integer', 'a:Integer', 'b:Integer'],
    error: `Can't process source column 'a': another column with the same name is already registered`,
  }),
  // TODO: vaidation against configuration
];

describe(unitTest('Analyze and build base snapshot'), () => {
  test.each(cases)(
    '%s',
    async (
      testName: TestCase[0],
      code: TestCase[1],
      columns: TestCase[2],
      configuration: TestCase[3],
      error: TestCase[4],
      validator: TestCase[5],
    ) => {
      if (FOCUSED_TESTS.length && !FOCUSED_TESTS.includes(testName)) {
        return;
      }

      const engine = new TEST__DataCubeEngine();
      const partialQuery = await engine.parseValueSpecification(code);
      const baseQuery = new DataCubeQuery();
      baseQuery.configuration = configuration
        ? DataCubeConfiguration.serialization.fromJson(configuration)
        : undefined;
      const source = new INTERNAL__DataCubeSource();
      source.columns = columns;
      let snapshot: DataCubeQuerySnapshot | undefined;

      try {
        snapshot = await validateAndBuildQuerySnapshot(
          partialQuery,
          source,
          baseQuery,
          engine,
        );
      } catch (err) {
        assertErrorThrown(err);
        expect(err.message).toEqual(error);
      }

      if (snapshot) {
        validator?.(snapshot);
        expect(error).toBeUndefined();
        expect(await engine.getPartialQueryCode(snapshot)).toEqual(code);
      }
    },
  );
});
