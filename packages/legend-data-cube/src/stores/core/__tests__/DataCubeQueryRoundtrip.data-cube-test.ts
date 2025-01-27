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

import { integrationTest } from '@finos/legend-shared/test';
import { describe, expect, test } from '@jest/globals';
import { validateAndBuildQuerySnapshot } from '../DataCubeQuerySnapshotBuilder.js';
import {
  assertErrorThrown,
  at,
  guaranteeNonNullable,
  isString,
} from '@finos/legend-shared';
import { DataCubeQuery } from '../model/DataCubeQuery.js';
import { INTERNAL__DataCubeSource } from '../model/DataCubeSource.js';
import {
  DataCubeColumnConfiguration,
  DataCubeConfiguration,
} from '../model/DataCubeConfiguration.js';
import { TEST__DataCubeEngine } from './DataCubeTestUtils.js';
import type {
  DataCubeQuerySnapshot,
  DataCubeQuerySnapshotFilterCondition,
} from '../DataCubeQuerySnapshot.js';
import {
  DataCubeColumnKind,
  DataCubeOperationAdvancedValueType,
  DataCubeQueryAggregateOperator,
  DataCubeQueryFilterOperator,
  DataCubeQuerySortDirection,
} from '../DataCubeQueryEngine.js';
import type { DataCubeColumn } from '../model/DataCubeColumn.js';
import {
  PRIMITIVE_TYPE,
  type V1_ValueSpecification,
} from '@finos/legend-graph';

const FOCUSED_TESTS: unknown[] = [
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
  _case(`Leaf-level Extend: ERROR - duplicate leaf-level extended columns`, {
    query: `extend(~[name:c|$c.val->toOne() + 1])->extend(~[name:c|$c.val->toOne() + 1])`,
    columns: ['val:Integer'],
    error: `Can't process extend() expression: failed to retrieve type information for columns. Error: The relation contains duplicates: [name]`,
  }),
  _case(
    `Leaf-level Extend: ERROR - multiple columns within the same extend() expression`,
    {
      query: `extend(~[a:x|1, b:x|1])`,
      error: `Can't process extend() expression: expected 1 column specification, got 2`,
    },
  ),
  _case(`Leaf-level Extend: ERROR - missing column's function expression`, {
    query: `extend(~[a])`,
    error: `Can't process extend() expression: expected a transformation function expression for column 'a'`,
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
    error: `Can't process filter condition: no matching operator found`,
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
    error: `Can't process filter condition: no matching operator found`,
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
    error: `Can't process filter condition: no matching operator found`,
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
    error: `Can't process filter condition: no matching operator found`,
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
    error: `Can't process filter condition: no matching operator found`,
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
    error: `Can't process filter condition: no matching operator found`,
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
    error: `Can't process filter condition: no matching operator found`,
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
    error: `Can't process filter condition: no matching operator found`,
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

  _case(`Filter: ERROR - LHS column not found`, {
    query: `filter(x|$x.Age > 1)`,
    error: `Can't process filter condition: no matching operator found`,
  }),
  _case(`Filter: ERROR - non-standard variable name in root`, {
    query: `filter(y|$x.Age > 1)`,
    error: `Can't process variable 'y': expected variable name to be 'x'`,
  }),
  _case(`Filter: ERROR - non-standard variable name in condition LHS`, {
    query: `filter(x|$y.Age == 27)`,
    columns: ['Age:Integer'],
    error: `Can't process filter condition: no matching operator found`,
  }),
  _case(`Filter: ERROR - non-standard variable name in condition RHS`, {
    query: `filter(x|$x.Age == $y.Age2)`,
    columns: ['Age:Integer', 'Age2:Integer'],
    error: `Can't process filter condition: no matching operator found`,
  }),
  _case(`Filter: ERROR - non-standard variable name within tree`, {
    query: `filter(x|$x.Name->toLower()->endsWith(toLower('Phelps')) || !(($y.Age != 27) && ($x.Name == 'Michael Phelps')))`,
    columns: ['Age:Integer', 'Name:String'],
    error: `Can't process filter condition: no matching operator found`,
  }),
  _case(`Filter: ERROR - bad argument: non-lambda provided`, {
    query: `filter('2')`,
    error: `Can't process filter() expression: expected parameter at index 0 to be a lambda expression`,
  }),
  _case(`Filter: ERROR - bad argument: complex lambda provided`, {
    query: `filter({x|let a = 1; $x.Age == 24;})`,
    error: `Can't process filter() expression: expected lambda body to have exactly 1 expression`,
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
  _case(`Select: ERROR - duplicate select columns`, {
    query: `select(~[a, a])`,
    columns: ['a:Integer', 'b:String'],
    error: `Can't process select() expression: found duplicate select columns 'a'`,
  }),

  // --------------------------------- AGGREGATION ---------------------------------

  _case(`Aggregation: sum()`, {
    query: `select(~[a, b])->groupBy(~[a], ~[b:x|$x.b:x|$x->sum()])->sort([~a->ascending()])`,
    columns: ['a:String', 'b:Integer'],
  }),
  _case(`Aggregation: sum() : ERROR - column not found`, {
    query: `select(~[a])->groupBy(~[a], ~[b:x|$x.b:x|$x->sum()])->sort([~a->ascending()])`,
    columns: ['a:String', 'b:Integer'],
    error: `Can't process aggregate column 'b': no matching operator found`,
  }),
  _case(`Aggregation: sum() : ERROR - incompatible column`, {
    query: `select(~[a, b])->groupBy(~[a], ~[b:x|$x.b:x|$x->sum()])->sort([~a->ascending()])`,
    columns: ['a:String', 'b:String'],
    error: `Can't process aggregate column 'b': no matching operator found`,
  }),
  _case(`Aggregation: sum() : ERROR - incompatible parameters`, {
    query: `select(~[a, b])->groupBy(~[a], ~[b:x|$x.b:x|$x->sum('asd')])->sort([~a->ascending()])`,
    columns: ['a:String', 'b:Integer'],
    error: `Can't process aggregate column 'b': no matching operator found`,
  }),
  _case(`Aggregation: average()`, {
    query: `select(~[a, b])->groupBy(~[a], ~[b:x|$x.b:x|$x->average()])->sort([~a->ascending()])`,
    columns: ['a:String', 'b:Integer'],
  }),
  _case(`Aggregation: average() : ERROR - column not found`, {
    query: `select(~[a])->groupBy(~[a], ~[b:x|$x.b:x|$x->average()])->sort([~a->ascending()])`,
    columns: ['a:String', 'b:Integer'],
    error: `Can't process aggregate column 'b': no matching operator found`,
  }),
  _case(`Aggregation: average() : ERROR - incompatible column`, {
    query: `select(~[a, b])->groupBy(~[a], ~[b:x|$x.b:x|$x->average()])->sort([~a->ascending()])`,
    columns: ['a:String', 'b:String'],
    error: `Can't process aggregate column 'b': no matching operator found`,
  }),
  _case(`Aggregation: average() : ERROR - incompatible parameters`, {
    query: `select(~[a, b])->groupBy(~[a], ~[b:x|$x.b:x|$x->average('asd')])->sort([~a->ascending()])`,
    columns: ['a:String', 'b:Integer'],
    error: `Can't process aggregate column 'b': no matching operator found`,
  }),
  _case(`Aggregation: count()`, {
    query: `select(~[a, b])->groupBy(~[a], ~[b:x|$x.b:x|$x->count()])->sort([~a->ascending()])`,
    columns: ['a:String', 'b:Integer'],
  }),
  _case(`Aggregation: count() : ERROR - column not found`, {
    query: `select(~[a])->groupBy(~[a], ~[b:x|$x.b:x|$x->count()])->sort([~a->ascending()])`,
    columns: ['a:String', 'b:Integer'],
    error: `Can't process aggregate column 'b': no matching operator found`,
  }),
  _case(`Aggregation: count() : ERROR - incompatible column`, {
    query: `select(~[a, b])->groupBy(~[a], ~[b:x|$x.b:x|$x->count()])->sort([~a->ascending()])`,
    columns: ['a:String', 'b:String'],
    error: `Can't process aggregate column 'b': no matching operator found`,
  }),
  _case(`Aggregation: count() : ERROR - incompatible parameters`, {
    query: `select(~[a, b])->groupBy(~[a], ~[b:x|$x.b:x|$x->count('asd')])->sort([~a->ascending()])`,
    columns: ['a:String', 'b:Integer'],
    error: `Can't process aggregate column 'b': no matching operator found`,
  }),
  _case(`Aggregation: min()`, {
    query: `select(~[a, b])->groupBy(~[a], ~[b:x|$x.b:x|$x->min()])->sort([~a->ascending()])`,
    columns: ['a:String', 'b:Integer'],
  }),
  _case(`Aggregation: min() : ERROR - column not found`, {
    query: `select(~[a])->groupBy(~[a], ~[b:x|$x.b:x|$x->min()])->sort([~a->ascending()])`,
    columns: ['a:String', 'b:Integer'],
    error: `Can't process aggregate column 'b': no matching operator found`,
  }),
  _case(`Aggregation: min() : ERROR - incompatible column`, {
    query: `select(~[a, b])->groupBy(~[a], ~[b:x|$x.b:x|$x->min()])->sort([~a->ascending()])`,
    columns: ['a:String', 'b:String'],
    error: `Can't process aggregate column 'b': no matching operator found`,
  }),
  _case(`Aggregation: min() : ERROR - incompatible parameters`, {
    query: `select(~[a, b])->groupBy(~[a], ~[b:x|$x.b:x|$x->min('asd')])->sort([~a->ascending()])`,
    columns: ['a:String', 'b:Integer'],
    error: `Can't process aggregate column 'b': no matching operator found`,
  }),
  _case(`Aggregation: max()`, {
    query: `select(~[a, b])->groupBy(~[a], ~[b:x|$x.b:x|$x->max()])->sort([~a->ascending()])`,
    columns: ['a:String', 'b:Integer'],
  }),
  _case(`Aggregation: max() : ERROR - column not found`, {
    query: `select(~[a])->groupBy(~[a], ~[b:x|$x.b:x|$x->max()])->sort([~a->ascending()])`,
    columns: ['a:String', 'b:Integer'],
    error: `Can't process aggregate column 'b': no matching operator found`,
  }),
  _case(`Aggregation: max() : ERROR - incompatible column`, {
    query: `select(~[a, b])->groupBy(~[a], ~[b:x|$x.b:x|$x->max()])->sort([~a->ascending()])`,
    columns: ['a:String', 'b:String'],
    error: `Can't process aggregate column 'b': no matching operator found`,
  }),
  _case(`Aggregation: max() : ERROR - incompatible parameters`, {
    query: `select(~[a, b])->groupBy(~[a], ~[b:x|$x.b:x|$x->max('asd')])->sort([~a->ascending()])`,
    columns: ['a:String', 'b:Integer'],
    error: `Can't process aggregate column 'b': no matching operator found`,
  }),
  _case(`Aggregation: uniqueValueOnly()`, {
    query: `select(~[a, b])->groupBy(~[a], ~[b:x|$x.b:x|$x->uniqueValueOnly()])->sort([~a->ascending()])`,
    columns: ['a:String', 'b:String'],
  }),
  _case(`Aggregation: uniqueValueOnly() : ERROR - column not found`, {
    query: `select(~[a])->groupBy(~[a], ~[b:x|$x.b:x|$x->uniqueValueOnly()])->sort([~a->ascending()])`,
    columns: ['a:String', 'b:String'],
    error: `Can't process aggregate column 'b': no matching operator found`,
  }),
  _case(`Aggregation: uniqueValueOnly() : ERROR - incompatible parameters`, {
    query: `select(~[a, b])->groupBy(~[a], ~[b:x|$x.b:x|$x->uniqueValueOnly('asd')])->sort([~a->ascending()])`,
    columns: ['a:String', 'b:Integer'],
    error: `Can't process aggregate column 'b': no matching operator found`,
  }),
  _case(`Aggregation: first()`, {
    query: `select(~[a, b])->groupBy(~[a], ~[b:x|$x.b:x|$x->first()])->sort([~a->ascending()])`,
    columns: ['a:String', 'b:String'],
  }),
  _case(`Aggregation: first() : ERROR - column not found`, {
    query: `select(~[a])->groupBy(~[a], ~[b:x|$x.b:x|$x->first()])->sort([~a->ascending()])`,
    columns: ['a:String', 'b:String'],
    error: `Can't process aggregate column 'b': no matching operator found`,
  }),
  _case(`Aggregation: first() : ERROR - incompatible parameters`, {
    query: `select(~[a, b])->groupBy(~[a], ~[b:x|$x.b:x|$x->first('asd')])->sort([~a->ascending()])`,
    columns: ['a:String', 'b:Integer'],
    error: `Can't process aggregate column 'b': no matching operator found`,
  }),
  _case(`Aggregation: last()`, {
    query: `select(~[a, b])->groupBy(~[a], ~[b:x|$x.b:x|$x->last()])->sort([~a->ascending()])`,
    columns: ['a:String', 'b:String'],
  }),
  _case(`Aggregation: last() : ERROR - column not found`, {
    query: `select(~[a])->groupBy(~[a], ~[b:x|$x.b:x|$x->last()])->sort([~a->ascending()])`,
    columns: ['a:String', 'b:String'],
    error: `Can't process aggregate column 'b': no matching operator found`,
  }),
  _case(`Aggregation: last() : ERROR - incompatible parameters`, {
    query: `select(~[a, b])->groupBy(~[a], ~[b:x|$x.b:x|$x->last('asd')])->sort([~a->ascending()])`,
    columns: ['a:String', 'b:Integer'],
    error: `Can't process aggregate column 'b': no matching operator found`,
  }),
  _case(`Aggregation: variancePopulation()`, {
    query: `select(~[a, b])->groupBy(~[a], ~[b:x|$x.b:x|$x->variancePopulation()])->sort([~a->ascending()])`,
    columns: ['a:String', 'b:Integer'],
  }),
  _case(`Aggregation: variancePopulation() : ERROR - column not found`, {
    query: `select(~[a])->groupBy(~[a], ~[b:x|$x.b:x|$x->variancePopulation()])->sort([~a->ascending()])`,
    columns: ['a:String', 'b:Integer'],
    error: `Can't process aggregate column 'b': no matching operator found`,
  }),
  _case(`Aggregation: variancePopulation() : ERROR - incompatible column`, {
    query: `select(~[a, b])->groupBy(~[a], ~[b:x|$x.b:x|$x->variancePopulation()])->sort([~a->ascending()])`,
    columns: ['a:String', 'b:String'],
    error: `Can't process aggregate column 'b': no matching operator found`,
  }),
  _case(`Aggregation: variancePopulation() : ERROR - incompatible parameters`, {
    query: `select(~[a, b])->groupBy(~[a], ~[b:x|$x.b:x|$x->variancePopulation('asd')])->sort([~a->ascending()])`,
    columns: ['a:String', 'b:Integer'],
    error: `Can't process aggregate column 'b': no matching operator found`,
  }),
  _case(`Aggregation: varianceSample()`, {
    query: `select(~[a, b])->groupBy(~[a], ~[b:x|$x.b:x|$x->varianceSample()])->sort([~a->ascending()])`,
    columns: ['a:String', 'b:Integer'],
  }),
  _case(`Aggregation: varianceSample() : ERROR - column not found`, {
    query: `select(~[a])->groupBy(~[a], ~[b:x|$x.b:x|$x->varianceSample()])->sort([~a->ascending()])`,
    columns: ['a:String', 'b:Integer'],
    error: `Can't process aggregate column 'b': no matching operator found`,
  }),
  _case(`Aggregation: varianceSample() : ERROR - incompatible column`, {
    query: `select(~[a, b])->groupBy(~[a], ~[b:x|$x.b:x|$x->varianceSample()])->sort([~a->ascending()])`,
    columns: ['a:String', 'b:String'],
    error: `Can't process aggregate column 'b': no matching operator found`,
  }),
  _case(`Aggregation: varianceSample() : ERROR - incompatible parameters`, {
    query: `select(~[a, b])->groupBy(~[a], ~[b:x|$x.b:x|$x->varianceSample('asd')])->sort([~a->ascending()])`,
    columns: ['a:String', 'b:Integer'],
    error: `Can't process aggregate column 'b': no matching operator found`,
  }),
  _case(`Aggregation: stdDevPopulation()`, {
    query: `select(~[a, b])->groupBy(~[a], ~[b:x|$x.b:x|$x->stdDevPopulation()])->sort([~a->ascending()])`,
    columns: ['a:String', 'b:Integer'],
  }),
  _case(`Aggregation: stdDevPopulation() : ERROR - column not found`, {
    query: `select(~[a])->groupBy(~[a], ~[b:x|$x.b:x|$x->stdDevPopulation()])->sort([~a->ascending()])`,
    columns: ['a:String', 'b:Integer'],
    error: `Can't process aggregate column 'b': no matching operator found`,
  }),
  _case(`Aggregation: stdDevPopulation() : ERROR - incompatible column`, {
    query: `select(~[a, b])->groupBy(~[a], ~[b:x|$x.b:x|$x->stdDevPopulation()])->sort([~a->ascending()])`,
    columns: ['a:String', 'b:String'],
    error: `Can't process aggregate column 'b': no matching operator found`,
  }),
  _case(`Aggregation: stdDevPopulation() : ERROR - incompatible parameters`, {
    query: `select(~[a, b])->groupBy(~[a], ~[b:x|$x.b:x|$x->stdDevPopulation('asd')])->sort([~a->ascending()])`,
    columns: ['a:String', 'b:Integer'],
    error: `Can't process aggregate column 'b': no matching operator found`,
  }),
  _case(`Aggregation: stdDevSample()`, {
    query: `select(~[a, b])->groupBy(~[a], ~[b:x|$x.b:x|$x->stdDevSample()])->sort([~a->ascending()])`,
    columns: ['a:String', 'b:Integer'],
  }),
  _case(`Aggregation: stdDevSample() : ERROR - column not found`, {
    query: `select(~[a])->groupBy(~[a], ~[b:x|$x.b:x|$x->stdDevSample()])->sort([~a->ascending()])`,
    columns: ['a:String', 'b:Integer'],
    error: `Can't process aggregate column 'b': no matching operator found`,
  }),
  _case(`Aggregation: stdDevSample() : ERROR - incompatible column`, {
    query: `select(~[a, b])->groupBy(~[a], ~[b:x|$x.b:x|$x->stdDevSample()])->sort([~a->ascending()])`,
    columns: ['a:String', 'b:String'],
    error: `Can't process aggregate column 'b': no matching operator found`,
  }),
  _case(`Aggregation: stdDevSample() : ERROR - incompatible parameters`, {
    query: `select(~[a, b])->groupBy(~[a], ~[b:x|$x.b:x|$x->stdDevSample('asd')])->sort([~a->ascending()])`,
    columns: ['a:String', 'b:Integer'],
    error: `Can't process aggregate column 'b': no matching operator found`,
  }),
  _case(`Aggregation: joinStrings()`, {
    query: `select(~[a, b])->groupBy(~[a], ~[b:x|$x.b:x|$x->joinStrings(',')])->sort([~a->ascending()])`,
    columns: ['a:String', 'b:String'],
  }),
  _case(`Aggregation: joinStrings() : ERROR - column not found`, {
    query: `select(~[a])->groupBy(~[a], ~[b:x|$x.b:x|$x->joinStrings(',')])->sort([~a->ascending()])`,
    columns: ['a:String', 'b:String'],
    error: `Can't process aggregate column 'b': no matching operator found`,
  }),
  _case(`Aggregation: joinStrings() : ERROR - incompatible parameters`, {
    query: `select(~[a, b])->groupBy(~[a], ~[b:x|$x.b:x|$x->joinStrings(2)])->sort([~a->ascending()])`,
    columns: ['a:String', 'b:Integer'],
    error: `Can't process aggregate column 'b': no matching operator found`,
  }),

  // --------------------------------- PIVOT ---------------------------------

  _case(`Pivot: single pivot column and single aggregate column`, {
    query: `select(~[a, b])->sort([~a->ascending()])->pivot(~[a], ~[b:x|$x.b:x|$x->sum()])->cast(@meta::pure::metamodel::relation::Relation<(dummy:String)>)`,
    columns: ['a:String', 'b:Integer'],
  }),
  _case(`Pivot: single pivot column and multiple aggregate columns`, {
    query: `select(~[a, b, c])->sort([~a->ascending()])->pivot(~[a], ~[b:x|$x.b:x|$x->sum(), c:x|$x.c:x|$x->max()])->cast(@meta::pure::metamodel::relation::Relation<(dummy:String)>)`,
    columns: ['a:String', 'b:Integer', 'c:Integer'],
  }),
  _case(`Pivot: multiple pivot columns and single aggregate column`, {
    query: `select(~[a, b, c])->sort([~a->ascending(), ~c->ascending()])->pivot(~[a, c], ~[b:x|$x.b:x|$x->sum()])->cast(@meta::pure::metamodel::relation::Relation<(dummy:String)>)`,
    columns: ['a:String', 'b:Integer', 'c:String'],
  }),
  _case(`Pivot: multiple pivot columns and multiple aggregate columns`, {
    query: `select(~[a, b, c, d])->sort([~a->ascending(), ~d->ascending()])->pivot(~[a, d], ~[b:x|$x.b:x|$x->sum(), c:x|$x.c:x|$x->max()])->cast(@meta::pure::metamodel::relation::Relation<(dummy:String)>)`,
    columns: ['a:String', 'b:Integer', 'c:Integer', 'd:String'],
  }),
  _case(`Pivot: cast covering group columns`, {
    query: `select(~[a, b, c, d])->sort([~a->ascending()])->pivot(~[a], ~[b:x|$x.b:x|$x->sum()])->cast(@meta::pure::metamodel::relation::Relation<(c:Integer, d:String)>)`,
    columns: ['a:String', 'b:Integer', 'c:Integer', 'd:String'],
  }),
  _case(`Pivot: ERROR - pivot column not found`, {
    query: `select(~[b])->sort([~a->ascending()])->pivot(~[a], ~[b:x|$x.b:x|$x->sum()])->cast(@meta::pure::metamodel::relation::Relation<(dummy:String)>)`,
    columns: ['a:String', 'b:Integer'],
    error: `Can't find column 'a'`,
  }),
  _case(`Pivot: ERROR - unmatched mapped column name`, {
    query: `select(~[a, b, c])->sort([~a->ascending()])->pivot(~[a], ~[b:x|$x.c:x|$x->sum()])->cast(@meta::pure::metamodel::relation::Relation<(dummy:String)>)`,
    columns: ['a:String', 'b:Integer', 'c:Integer'],
    error: `Can't process aggregate column 'b': no matching operator found`,
  }),
  _case(`Pivot: ERROR - non-standard variable name in mapper`, {
    query: `select(~[a])->sort([~a->ascending()])->pivot(~[a], ~[b:y|$y.b:x|$x->sum()])->cast(@meta::pure::metamodel::relation::Relation<(dummy:String)>)`,
    columns: ['a:String', 'b:Integer'],
    error: `Can't process aggregate column 'b': no matching operator found`,
  }),
  _case(`Pivot: ERROR - non-standard variable name in reducer`, {
    query: `select(~[a])->sort([~a->ascending()])->pivot(~[a], ~[b:x|$x.b:y|$y->sum()])->cast(@meta::pure::metamodel::relation::Relation<(dummy:String)>)`,
    columns: ['a:String', 'b:Integer'],
    error: `Can't process aggregate column 'b': no matching operator found`,
  }),
  _case(`Pivot: ERROR - duplicate group columns`, {
    query: `select(~[a, b])->sort([~a->ascending()])->pivot(~[a, a], ~[b:x|$x.b:x|$x->sum()])->cast(@meta::pure::metamodel::relation::Relation<(dummy:String)>)`,
    columns: ['a:String', 'b:Integer'],
    error: `Can't process pivot() expression: found duplicate pivot columns 'a'`,
  }),
  _case(`Pivot: ERROR - duplicate aggregate columns`, {
    query: `select(~[a, b])->sort([~a->ascending()])->pivot(~[a], ~[b:x|$x.b:x|$x->sum(), b:x|$x.b:x|$x->max()])->cast(@meta::pure::metamodel::relation::Relation<(dummy:String)>)`,
    columns: ['a:String', 'b:Integer'],
    error: `Can't process pivot() expression: found duplicate aggregate columns 'b'`,
  }),
  _case(`Pivot: ERROR - duplicate sort columns`, {
    query: `select(~[a, b])->sort([~a->ascending(), ~a->ascending()])->pivot(~[a], ~[b:x|$x.b:x|$x->sum()])->cast(@meta::pure::metamodel::relation::Relation<(dummy:String)>)`,
    columns: ['a:String', 'b:Integer'],
    error: `Can't process pivot() expression: found duplicate sort columns 'a'`,
  }),
  _case(`Pivot: ERROR - sorted non-group columns`, {
    query: `select(~[a, b])->sort([~b->ascending()])->pivot(~[a], ~[b:x|$x.b:x|$x->sum()])->cast(@meta::pure::metamodel::relation::Relation<(dummy:String)>)`,
    columns: ['a:String', 'b:Integer'],
    error: `Can't process pivot() expression: sort column 'b' must be a pivot column`,
  }),
  _case(`Pivot: ERROR - unsorted group columns`, {
    query: `select(~[a, b])->sort([])->pivot(~[a], ~[b:x|$x.b:x|$x->sum()])->cast(@meta::pure::metamodel::relation::Relation<(dummy:String)>)`,
    columns: ['a:String', 'b:Integer'],
    error: `Can't process pivot() expression: found unsorted pivot column(s) ('a')`,
  }),
  _case(`Pivot: ERROR - aggregated on pivot column`, {
    query: `select(~[a, b])->sort([~a->ascending()])->pivot(~[a], ~[b:x|$x.b:x|$x->sum(), a:x|$x.a:x|$x->uniqueValueOnly()])->cast(@meta::pure::metamodel::relation::Relation<(dummy:String)>)`,
    columns: ['a:String', 'b:Integer'],
    error: `Can't process pivot() expression: pivot column 'a' must not be aggregated on`,
  }),
  _case(`Pivot: ERROR - casting used without dynamic function pivot()`, {
    query: `cast(@meta::pure::metamodel::relation::Relation<(a:Integer)>)`,
    error: `Can't process expression: unsupported function composition cast() (supported composition: extend()->filter()->select()->[sort()->pivot()->cast()]->[groupBy()->sort()]->extend()->sort()->limit())`,
  }),
  _case(`Pivot: ERROR - pivot group column not found in cast columns`, {
    query: `select(~[a, b, c, d])->sort([~a->ascending()])->pivot(~[a], ~[b:x|$x.b:x|$x->sum()])->cast(@meta::pure::metamodel::relation::Relation<(dummy:String)>)`,
    columns: ['a:String', 'b:Integer', 'c:Integer', 'd:String'],
    error: `Can't process pivot() expression: expected pivot group column 'c' in cast columns`,
  }),
  _case(`Pivot: ERROR - pivot column found in cast columns`, {
    query: `select(~[a, b, c, d])->sort([~a->ascending()])->pivot(~[a], ~[b:x|$x.b:x|$x->sum()])->cast(@meta::pure::metamodel::relation::Relation<(a:String, c:Integer, d:String)>)`,
    columns: ['a:String', 'b:Integer', 'c:Integer', 'd:String'],
    error: `Can't process pivot() expression: expected pivot column 'a' to not present in cast columns`,
  }),
  _case(`Pivot: ERROR - pivot aggregate column found in cast columns`, {
    query: `select(~[a, b, c, d])->sort([~a->ascending()])->pivot(~[a], ~[b:x|$x.b:x|$x->sum()])->cast(@meta::pure::metamodel::relation::Relation<(b:String, c:Integer, d:String)>)`,
    columns: ['a:String', 'b:Integer', 'c:Integer', 'd:String'],
    error: `Can't process pivot() expression: expected pivot aggregate column 'b' to not present in cast columns`,
  }),
  _case(`Pivot: ERROR - aggregate columns mismatch implied by cast columns`, {
    query: `select(~[a, b])->sort([~a->ascending()])->pivot(~[a], ~[b:x|$x.b:x|$x->sum()])->cast(@meta::pure::metamodel::relation::Relation<('val1__|__c':String)>)`,
    columns: ['a:String', 'b:Integer'],
    error: `Can't process pivot() expression: fail to match cast column 'val1__|__c' to a specified aggregate column`,
  }),

  // --------------------------------- GROUP BY ---------------------------------

  _case(`GroupBy: single group column and single aggregate column`, {
    query: `select(~[a, b])->groupBy(~[a], ~[b:x|$x.b:x|$x->sum()])->sort([~a->ascending()])`,
    columns: ['a:String', 'b:Integer'],
  }),
  _case(`GroupBy: single group column and multiple aggregate columns`, {
    query: `select(~[a, b, c])->groupBy(~[a], ~[b:x|$x.b:x|$x->sum(), c:x|$x.c:x|$x->max()])->sort([~a->ascending()])`,
    columns: ['a:String', 'b:Integer', 'c:Integer'],
  }),
  _case(`GroupBy: multiple group columns and single aggregate column`, {
    query: `select(~[a, b, c])->groupBy(~[a, c], ~[b:x|$x.b:x|$x->sum()])->sort([~a->ascending(), ~c->ascending()])`,
    columns: ['a:String', 'b:Integer', 'c:String'],
  }),
  _case(`GroupBy: multiple group columns and multiple aggregate columns`, {
    query: `select(~[a, b, c, d])->groupBy(~[a, d], ~[b:x|$x.b:x|$x->sum(), c:x|$x.c:x|$x->max()])->sort([~a->ascending(), ~d->ascending()])`,
    columns: ['a:String', 'b:Integer', 'c:Integer', 'd:String'],
  }),
  _case(`GroupBy: following pivot() expression`, {
    query: `select(~[a, b, c, d])->sort([~c->ascending()])->pivot(~[c], ~[b:x|$x.b:x|$x->sum()])->cast(@meta::pure::metamodel::relation::Relation<(d:String, a:Integer, 'val1__|__b':Integer)>)->groupBy(~[d], ~['val1__|__b':x|$x.'val1__|__b':x|$x->sum(), a:x|$x.a:x|$x->sum()])->sort([~d->ascending()])`,
    columns: ['a:Integer', 'c:String', 'b:Integer', 'd:String'],
  }),
  _case(`GroupBy: ERROR - group column not found`, {
    query: `select(~[b])->groupBy(~[a], ~[b:x|$x.b:x|$x->sum()])->sort([~a->ascending()])`,
    columns: ['a:String', 'b:Integer'],
    error: `Can't find column 'a'`,
  }),
  _case(`GroupBy: ERROR - unmatched mapped column name`, {
    query: `select(~[a, b, c])->groupBy(~[a], ~[b:x|$x.c:x|$x->sum()])->sort([~a->ascending()])`,
    columns: ['a:String', 'b:Integer', 'c:Integer'],
    error: `Can't process aggregate column 'b': no matching operator found`,
  }),
  _case(`GroupBy: ERROR - non-standard variable name in mapper`, {
    query: `select(~[a])->groupBy(~[a], ~[b:y|$y.b:x|$x->sum()])->sort([~a->ascending()])`,
    columns: ['a:String', 'b:Integer'],
    error: `Can't process aggregate column 'b': no matching operator found`,
  }),
  _case(`GroupBy: ERROR - non-standard variable name in reducer`, {
    query: `select(~[a])->groupBy(~[a, a], ~[b:x|$x.b:y|$y->sum()])->sort([~a->ascending()])`,
    columns: ['a:String', 'b:Integer'],
    error: `Can't process aggregate column 'b': no matching operator found`,
  }),
  _case(`GroupBy: ERROR - duplicate group columns`, {
    query: `select(~[a, b])->groupBy(~[a, a], ~[b:x|$x.b:x|$x->sum()])->sort([~a->ascending()])`,
    columns: ['a:String', 'b:Integer'],
    error: `Can't process groupBy() expression: found duplicate group columns 'a'`,
  }),
  _case(`GroupBy: ERROR - duplicate aggregate columns`, {
    query: `select(~[a, b])->groupBy(~[a], ~[b:x|$x.b:x|$x->sum(), b:x|$x.b:x|$x->sum()])->sort([~a->ascending()])`,
    columns: ['a:String', 'b:Integer'],
    error: `Can't process groupBy() expression: found duplicate aggregate columns 'b'`,
  }),
  _case(`GroupBy: ERROR - duplicate sort columns`, {
    query: `select(~[a, b])->groupBy(~[a], ~[b:x|$x.b:x|$x->sum()])->sort([~a->ascending(), ~a->ascending()])`,
    columns: ['a:String', 'b:Integer'],
    error: `Can't process groupBy() expression: found duplicate sort columns 'a'`,
  }),
  _case(`GroupBy: ERROR - sorted non-group columns`, {
    query: `select(~[a, b])->groupBy(~[a], ~[b:x|$x.b:x|$x->sum()])->sort([~b->descending()])`,
    columns: ['a:String', 'b:Integer'],
    error: `Can't process groupBy() expression: sort column 'b' must be a group column`,
  }),
  _case(`GroupBy: ERROR - mixed sort directions`, {
    query: `select(~[a, b, c])->groupBy(~[a, c], ~[b:x|$x.b:x|$x->sum()])->sort([~a->descending(), ~c->ascending()])`,
    columns: ['a:String', 'b:Integer', 'c:String'],
    error: `Can't process groupBy() expression: all group columns must be sorted in the same direction`,
  }),
  _case(`GroupBy: ERROR - unsorted group columns`, {
    query: `select(~[a, b])->groupBy(~[a], ~[b:x|$x.b:x|$x->sum()])->sort([])`,
    columns: ['a:String', 'b:Integer'],
    error: `Can't process groupBy() expression: found unsorted group column(s) ('a')`,
  }),
  _case(`GroupBy: ERROR - aggregated on group column`, {
    query: `select(~[a, b])->groupBy(~[a], ~[b:x|$x.b:x|$x->sum(), a:x|$x.a:x|$x->uniqueValueOnly()])->sort([~a->ascending()])`,
    columns: ['a:String', 'b:Integer'],
    error: `Can't process groupBy() expression: group column 'a' must not be aggregated on`,
  }),
  _case(`GroupBy: ERROR - column not grouped nor aggregated`, {
    query: `select(~[a, b, c])->groupBy(~[a], ~[b:x|$x.b:x|$x->sum()])->sort([~a->ascending()])`,
    columns: ['a:String', 'b:Integer', 'c:Integer'],
    error: `Can't process groupBy() expression: column 'c' is neither grouped nor aggregated on`,
  }),
  _case(
    `GroupBy: ERROR - conflicting aggregation specifications within groupBy() expression`,
    {
      query: `select(~[a, b, c, d])->sort([~c->ascending()])->pivot(~[c], ~[b:x|$x.b:x|$x->sum()])->cast(@meta::pure::metamodel::relation::Relation<(d:String, a:Integer, 'val1__|__b':Integer, 'val2__|__b':Integer)>)->groupBy(~[d], ~['val1__|__b':x|$x.'val1__|__b':x|$x->sum(), 'val2__|__b':x|$x.'val2__|__b':x|$x->max(), a:x|$x.a:x|$x->sum()])->sort([~d->ascending()])`,
      columns: ['a:Integer', 'c:String', 'b:Integer', 'd:String'],
      error: `Can't process groupBy() expression: found conflicting aggregation specification for column 'b'`,
    },
  ),
  _case(
    `GroupBy: ERROR - conflicting aggregation specifications between groupBy() and pivot() expression`,
    {
      query: `select(~[a, b, c, d])->sort([~c->ascending()])->pivot(~[c], ~[b:x|$x.b:x|$x->sum()])->cast(@meta::pure::metamodel::relation::Relation<(d:String, a:Integer, 'val1__|__b':Integer)>)->groupBy(~[d], ~['val1__|__b':x|$x.'val1__|__b':x|$x->max(), a:x|$x.a:x|$x->sum()])->sort([~d->ascending()])`,
      columns: ['a:Integer', 'c:String', 'b:Integer', 'd:String'],
      error: `Can't process groupBy() expression: found conflicting aggregation specification for column 'b'`,
    },
  ),
  _case(
    `GroupBy: ERROR - column aggregated in pivot() but not in groupBy() expression`,
    {
      query: `select(~[a, b, c, d])->sort([~c->ascending()])->pivot(~[c], ~[b:x|$x.b:x|$x->sum(), a:x|$x.a:x|$x->sum()])->cast(@meta::pure::metamodel::relation::Relation<(d:String, 'val1__|__b':Integer)>)->groupBy(~[d], ~['val1__|__b':x|$x.'val1__|__b':x|$x->sum()])->sort([~d->ascending()])`,
      columns: ['a:Integer', 'c:String', 'b:Integer', 'd:String'],
      error: `Can't process groupBy() expression: column 'a' is aggregated in pivot() expression but not in groupBy() expression`,
    },
  ),
  _case(
    `GroupBy: ERROR - column pivoted but aggregated in groupBy() expression`,
    {
      query: `select(~[a, b, c, d])->sort([~c->ascending()])->pivot(~[c], ~[b:x|$x.b:x|$x->sum(), a:x|$x.a:x|$x->sum()])->cast(@meta::pure::metamodel::relation::Relation<(d:String, 'val1__|__b':Integer)>)->groupBy(~[d], ~['val1__|__b':x|$x.'val1__|__b':x|$x->sum()])->sort([~d->ascending()])`,
      columns: ['a:Integer', 'c:String', 'b:Integer', 'd:String'],
      error: `Can't process groupBy() expression: column 'a' is aggregated in pivot() expression but not in groupBy() expression`,
    },
  ),

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
  _case(`Group-level Extend: ERROR - duplicate group-level extended columns`, {
    query: `select(~[val])->extend(~[name:c|$c.val->toOne() + 1])->extend(~[name:c|$c.val->toOne() + 1])`,
    columns: ['val:Integer'],
    error: `Can't process extend() expression: failed to retrieve type information for columns. Error: The relation contains duplicates: [name]`,
  }),
  _case(
    `Group-level Extend: ERROR - multiple columns within the same extend() expression`,
    {
      query: `select(~[val])->extend(~[a:x|1, b:x|1])`,
      columns: ['val:Integer'],
      error: `Can't process extend() expression: expected 1 column specification, got 2`,
    },
  ),
  _case(`Group-level Extend: ERROR - missing column's function expression`, {
    query: `select(~[val])->extend(~[a])`,
    columns: ['val:Integer'],
    error: `Can't process extend() expression: expected a transformation function expression for column 'a'`,
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
    error: `Can't process sort() expression: expected parameter at index 0 to be a collection`,
  }),
  _case(`Sort: ERROR - unsupported function`, {
    query: `select(~[a])->sort([~a->something()])`,
    columns: ['a:Integer'],
    error: `Can't process function: expected function to be one of [ascending, descending]`,
  }),
  _case(`Sort: ERROR - column not found`, {
    query: `select(~[a])->sort([~b->ascending()])`,
    columns: ['a:Integer'],
    error: `Can't find column 'b'`,
  }),
  _case(`Sort: ERROR - duplicate columns`, {
    query: `select(~[a])->sort([~a->ascending(), ~a->ascending()])`,
    columns: ['a:Integer'],
    error: `Can't process sort() expression: found duplicate sort columns 'a'`,
  }),

  // --------------------------------- LIMIT ---------------------------------

  _case(`Limit: with integer number`, {
    query: `limit(10)`,
  }),
  _case(`Limit: ERROR - bad argument: decimal number provided`, {
    query: `limit(15.5)`,
    error: `Can't process limit() expression: expected limit to be a non-negative integer value`,
  }),
  _case(`Limit: ERROR - bad argument: non-negative number provided`, {
    query: `limit(-10)`,
    error: `Can't process limit() expression: expected limit to be a non-negative integer value`,
  }),
  _case(`Limit: ERROR - bad argument: non-integer provided`, {
    query: `limit('asd')`,
    error: `Can't process limit() expression: expected limit to be a non-negative integer value`,
  }),

  // --------------------------------- CONFIGURATION ---------------------------------

  _case(`Configuration: generated configuration`, {
    query: `select(~[a, b])`,
    columns: ['a:String', 'b:Integer', 'c:Date'],
    // the assertions make sure the generated configurations have correct default values
    // computed based on query processing metadata
    validator: (snapshot) => {
      const config = DataCubeConfiguration.serialization.fromJson(
        snapshot.data.configuration,
      );

      expect(config.treeColumnSortDirection).toEqual(
        DataCubeQuerySortDirection.ASCENDING,
      );

      const colA = at(config.columns, 0);
      expect(colA.name).toEqual('a');
      expect(colA.kind).toEqual(DataCubeColumnKind.DIMENSION);
      expect(colA.aggregateOperator).toEqual(
        DataCubeQueryAggregateOperator.UNIQUE,
      );
      expect(colA.isSelected).toEqual(true);
      expect(colA.excludedFromPivot).toEqual(true);
      expect(colA.pivotSortDirection).toBeUndefined();

      const colB = at(config.columns, 1);
      expect(colB.name).toEqual('b');
      expect(colB.kind).toEqual(DataCubeColumnKind.MEASURE);
      expect(colB.aggregateOperator).toEqual(
        DataCubeQueryAggregateOperator.SUM,
      );
      expect(colB.isSelected).toEqual(true);
      expect(colB.excludedFromPivot).toEqual(false);
      expect(colB.pivotSortDirection).toBeUndefined();

      const colC = at(config.columns, 2);
      expect(colC.name).toEqual('c');
      expect(colC.kind).toEqual(DataCubeColumnKind.DIMENSION);
      expect(colC.aggregateOperator).toEqual(
        DataCubeQueryAggregateOperator.UNIQUE,
      );
      expect(colC.isSelected).toEqual(false);
      expect(colC.excludedFromPivot).toEqual(true);
      expect(colC.pivotSortDirection).toBeUndefined();
    },
  }),
  _case(`Configuration: generated configuration with extended columns`, {
    query: `extend(~[d:x|1])->extend(~[f:x|1])->select(~[c, d, a])->extend(~[e:x|'asd'])`,
    columns: ['a:String', 'b:Integer', 'c:Date'],
    // the assertions make sure the generated configurations have columns arranged
    // in the right order (i.e. accounted for extended columns and respected selection order)
    validator: (snapshot) => {
      const config = DataCubeConfiguration.serialization.fromJson(
        snapshot.data.configuration,
      );
      expect(at(config.columns, 0).name).toEqual('c');
      expect(at(config.columns, 1).name).toEqual('d');
      expect(at(config.columns, 2).name).toEqual('a');
      expect(at(config.columns, 3).name).toEqual('e');
      expect(at(config.columns, 4).name).toEqual('b');
      expect(at(config.columns, 5).name).toEqual('f');

      // do some basic checks on the extended columns
      const colD = at(config.columns, 1);
      expect(colD.type).toEqual(PRIMITIVE_TYPE.INTEGER);
      expect(colD.kind).toEqual(DataCubeColumnKind.MEASURE);

      const colE = at(config.columns, 3);
      expect(colE.type).toEqual(PRIMITIVE_TYPE.STRING);
      expect(colE.kind).toEqual(DataCubeColumnKind.DIMENSION);

      const colF = at(config.columns, 5);
      expect(colF.type).toEqual(PRIMITIVE_TYPE.INTEGER);
      expect(colF.kind).toEqual(DataCubeColumnKind.MEASURE);
    },
  }),
  _case(`Configuration: without aggregation`, {
    query: `select(~[a, b, c, d, e])`,
    columns: ['a:String', 'b:String', 'c:Integer', 'd:Float', 'e:Date'],
    configurationBuilder: async (query, columns) => {
      const config = await _generateDefaultConfiguration(query, columns);

      config.treeColumnSortDirection = DataCubeQuerySortDirection.DESCENDING;

      const colA = at(config.columns, 0);
      colA.blur = true;

      const colB = at(config.columns, 1);
      colB.kind = DataCubeColumnKind.MEASURE;
      colB.aggregateOperator = DataCubeQueryAggregateOperator.LAST;

      const colC = at(config.columns, 2);
      colC.displayName = 'Column C';

      const colD = at(config.columns, 3);
      colD.kind = DataCubeColumnKind.DIMENSION;
      colD.excludedFromPivot = true;
      colD.aggregateOperator = DataCubeQueryAggregateOperator.UNIQUE;

      const colE = at(config.columns, 4);
      colE.fontSize = 100;

      return config;
    },
    // when no aggregation is present, a few column properties are freely set
    // i.e. they are not checked, since there is no query processing metadata
    // to verify against
    validator: (snapshot) => {
      const config = DataCubeConfiguration.serialization.fromJson(
        snapshot.data.configuration,
      );

      expect(config.treeColumnSortDirection).toEqual(
        DataCubeQuerySortDirection.DESCENDING,
      );

      const colA = at(config.columns, 0);
      expect(colA.name).toEqual('a');
      expect(colA.kind).toEqual(DataCubeColumnKind.DIMENSION);
      expect(colA.aggregateOperator).toEqual(
        DataCubeQueryAggregateOperator.UNIQUE,
      );
      expect(colA.excludedFromPivot).toEqual(true);
      expect(colA.pivotSortDirection).toBeUndefined();
      expect(colA.blur).toEqual(true);

      const colB = at(config.columns, 1);
      expect(colB.name).toEqual('b');
      expect(colB.kind).toEqual(DataCubeColumnKind.MEASURE);
      expect(colB.aggregateOperator).toEqual(
        DataCubeQueryAggregateOperator.LAST,
      );
      expect(colB.excludedFromPivot).toEqual(true);
      expect(colB.pivotSortDirection).toBeUndefined();

      const colC = at(config.columns, 2);
      expect(colC.name).toEqual('c');
      expect(colC.kind).toEqual(DataCubeColumnKind.MEASURE);
      expect(colC.aggregateOperator).toEqual(
        DataCubeQueryAggregateOperator.SUM,
      );
      expect(colC.excludedFromPivot).toEqual(false);
      expect(colC.pivotSortDirection).toBeUndefined();
      expect(colC.displayName).toEqual('Column C');

      const colD = at(config.columns, 3);
      expect(colD.name).toEqual('d');
      expect(colD.kind).toEqual(DataCubeColumnKind.DIMENSION);
      expect(colD.aggregateOperator).toEqual(
        DataCubeQueryAggregateOperator.UNIQUE,
      );
      expect(colD.excludedFromPivot).toEqual(true);
      expect(colD.pivotSortDirection).toBeUndefined();

      const colE = at(config.columns, 4);
      expect(colE.name).toEqual('e');
      expect(colE.kind).toEqual(DataCubeColumnKind.DIMENSION);
      expect(colE.aggregateOperator).toEqual(
        DataCubeQueryAggregateOperator.UNIQUE,
      );
      expect(colE.excludedFromPivot).toEqual(true);
      expect(colE.pivotSortDirection).toBeUndefined();
      expect(colE.fontSize).toEqual(100);
    },
  }),
  _case(`Configuration: with groupBy() expression`, {
    query: `select(~[a, b, c, d])->groupBy(~[d, c, b], ~[a:x|$x.a:x|$x->average()])->sort([~d->descending(), ~c->descending(), ~b->descending()])`,
    columns: ['a:Integer', 'b:Integer', 'c:String', 'd:Date'],
    configurationBuilder: _generateDefaultConfiguration,
    validator: (snapshot) => {
      const config = DataCubeConfiguration.serialization.fromJson(
        snapshot.data.configuration,
      );

      expect(config.treeColumnSortDirection).toEqual(
        DataCubeQuerySortDirection.DESCENDING,
      );

      const colA = at(config.columns, 0);
      expect(colA.name).toEqual('a');
      expect(colA.kind).toEqual(DataCubeColumnKind.MEASURE);
      expect(colA.aggregateOperator).toEqual(
        DataCubeQueryAggregateOperator.AVERAGE,
      );

      const colB = at(config.columns, 1);
      expect(colB.name).toEqual('b');
      expect(colB.kind).toEqual(DataCubeColumnKind.DIMENSION);
      expect(colB.aggregateOperator).toEqual(
        DataCubeQueryAggregateOperator.SUM,
      );

      const colC = at(config.columns, 2);
      expect(colC.name).toEqual('c');
      expect(colC.kind).toEqual(DataCubeColumnKind.DIMENSION);
      expect(colC.aggregateOperator).toEqual(
        DataCubeQueryAggregateOperator.UNIQUE,
      );

      const colD = at(config.columns, 3);
      expect(colD.name).toEqual('d');
      expect(colD.kind).toEqual(DataCubeColumnKind.DIMENSION);
      expect(colD.aggregateOperator).toEqual(
        DataCubeQueryAggregateOperator.UNIQUE,
      );
    },
  }),
  _case(
    `Configuration: with aggregation on dimension column in pivot() expression`,
    {
      query: `select(~[a, b, c])->sort([~a->ascending()])->pivot(~[a], ~[c:x|$x.c:x|$x->sum()])->cast(@meta::pure::metamodel::relation::Relation<(b:Integer)>)`,
      columns: ['a:String', 'b:Integer', 'c:Integer'],
      configurationBuilder: async (query, columns) => {
        const config = await _generateDefaultConfiguration(query, columns);

        const colB = at(config.columns, 1);
        colB.kind = DataCubeColumnKind.DIMENSION;
        colB.excludedFromPivot = true;

        return config;
      },
    },
  ),
  _case(
    `Configuration: with aggregation on dimension column in groupBy() expression`,
    {
      query: `select(~[a, b])->groupBy(~[a], ~[b:x|$x.b:x|$x->average()])->sort([~a->ascending()])`,
      columns: ['a:String', 'b:Integer'],
      configurationBuilder: async (query, columns) => {
        const config = await _generateDefaultConfiguration(query, columns);

        const colB = at(config.columns, 1);
        colB.kind = DataCubeColumnKind.DIMENSION;
        colB.excludedFromPivot = true;

        return config;
      },
    },
  ),
  _case(`Configuration: with pivot() expression`, {
    query: `select(~[a, b, c, d])->sort([~c->ascending(), ~d->descending()])->pivot(~[c, d], ~[b:x|$x.b:x|$x->count()])->cast(@meta::pure::metamodel::relation::Relation<(a:Integer, 'val1__|__val2__|__b':Integer)>)`,
    columns: ['a:Integer', 'c:String', 'b:Integer', 'd:String'],
    configurationBuilder: _generateDefaultConfiguration,
    validator: (snapshot) => {
      const config = DataCubeConfiguration.serialization.fromJson(
        snapshot.data.configuration,
      );

      const colA = at(config.columns, 0);
      expect(colA.name).toEqual('a');
      expect(colA.kind).toEqual(DataCubeColumnKind.MEASURE);
      expect(colA.aggregateOperator).toEqual(
        DataCubeQueryAggregateOperator.SUM,
      );
      expect(colA.excludedFromPivot).toEqual(true);
      expect(colA.pivotSortDirection).toBeUndefined();

      const colB = at(config.columns, 1);
      expect(colB.name).toEqual('b');
      expect(colB.kind).toEqual(DataCubeColumnKind.MEASURE);
      expect(colB.aggregateOperator).toEqual(
        DataCubeQueryAggregateOperator.COUNT,
      );
      expect(colB.excludedFromPivot).toEqual(false);
      expect(colB.pivotSortDirection).toBeUndefined();

      const colC = at(config.columns, 2);
      expect(colC.name).toEqual('c');
      expect(colC.kind).toEqual(DataCubeColumnKind.DIMENSION);
      expect(colC.aggregateOperator).toEqual(
        DataCubeQueryAggregateOperator.UNIQUE,
      );
      expect(colC.excludedFromPivot).toEqual(true);
      expect(colC.pivotSortDirection).toEqual(
        DataCubeQuerySortDirection.ASCENDING,
      );

      const colD = at(config.columns, 3);
      expect(colD.name).toEqual('d');
      expect(colD.kind).toEqual(DataCubeColumnKind.DIMENSION);
      expect(colD.aggregateOperator).toEqual(
        DataCubeQueryAggregateOperator.UNIQUE,
      );
      expect(colD.excludedFromPivot).toEqual(true);
      expect(colD.pivotSortDirection).toEqual(
        DataCubeQuerySortDirection.DESCENDING,
      );
    },
  }),
  _case(`Configuration: with both pivot() and groupBy() expression`, {
    query: `select(~[a, b, c, d])->sort([~c->descending()])->pivot(~[c], ~[b:x|$x.b:x|$x->average()])->cast(@meta::pure::metamodel::relation::Relation<(d:String, a:Integer, 'val1__|__b':Integer)>)->groupBy(~[d], ~['val1__|__b':x|$x.'val1__|__b':x|$x->average(), a:x|$x.a:x|$x->count()])->sort([~d->ascending()])`,
    columns: ['a:Integer', 'c:String', 'b:Integer', 'd:String'],
    configurationBuilder: _generateDefaultConfiguration,
    validator: (snapshot) => {
      const config = DataCubeConfiguration.serialization.fromJson(
        snapshot.data.configuration,
      );

      const colA = at(config.columns, 0);
      expect(colA.name).toEqual('a');
      expect(colA.kind).toEqual(DataCubeColumnKind.MEASURE);
      expect(colA.aggregateOperator).toEqual(
        DataCubeQueryAggregateOperator.COUNT,
      );
      expect(colA.excludedFromPivot).toEqual(true);
      expect(colA.pivotSortDirection).toBeUndefined();

      const colB = at(config.columns, 1);
      expect(colB.name).toEqual('b');
      expect(colB.kind).toEqual(DataCubeColumnKind.MEASURE);
      expect(colB.aggregateOperator).toEqual(
        DataCubeQueryAggregateOperator.AVERAGE,
      );
      expect(colB.excludedFromPivot).toEqual(false);
      expect(colB.pivotSortDirection).toBeUndefined();

      const colC = at(config.columns, 2);
      expect(colC.name).toEqual('c');
      expect(colC.kind).toEqual(DataCubeColumnKind.DIMENSION);
      expect(colC.aggregateOperator).toEqual(
        DataCubeQueryAggregateOperator.UNIQUE,
      );
      expect(colC.excludedFromPivot).toEqual(true);
      expect(colC.pivotSortDirection).toEqual(
        DataCubeQuerySortDirection.DESCENDING,
      );

      const colD = at(config.columns, 3);
      expect(colD.name).toEqual('d');
      expect(colD.kind).toEqual(DataCubeColumnKind.DIMENSION);
      expect(colD.aggregateOperator).toEqual(
        DataCubeQueryAggregateOperator.UNIQUE,
      );
      expect(colD.excludedFromPivot).toEqual(true);
      expect(colD.pivotSortDirection).toBeUndefined();
    },
  }),

  _case(`Configuration: ERROR - tree column sort direction mismatch`, {
    query: `select(~[a, b])->groupBy(~[b], ~[a:x|$x.a:x|$x->average()])->sort([~b->ascending()])`,
    columns: ['a:Integer', 'b:String'],
    configurationBuilder: async (query, columns) => {
      const config = await _generateDefaultConfiguration(query, columns);
      config.treeColumnSortDirection = DataCubeQuerySortDirection.DESCENDING;
      return config;
    },
    error: `Can't process configuration: tree column sort direction mismatch (expected: 'ascending', found: 'descending')`,
  }),
  _case(`Configuration: ERROR - duplicate columns`, {
    query: `select(~[a, b])`,
    columns: ['a:Integer', 'b:String'],
    configurationBuilder: async (query, columns) => {
      const config = await _generateDefaultConfiguration(query, columns);
      config.columns.push(at(config.columns, 1));
      return config;
    },
    error: `Can't process configuration: found duplicate columns 'b'`,
  }),
  _case(`Configuration: ERROR - found extra column`, {
    query: `select(~[a, b])`,
    columns: ['a:Integer', 'b:String'],
    configurationBuilder: async (query, columns) => {
      const config = await _generateDefaultConfiguration(query, columns);
      const extraCol = DataCubeColumnConfiguration.serialization.fromJson(
        DataCubeColumnConfiguration.serialization.toJson(at(config.columns, 1)),
      );
      extraCol.name = 'c';
      config.columns.push(extraCol);
      return config;
    },
    error: `Can't process configuration: found extra column 'c'`,
  }),
  _case(`Configuration: ERROR - found missing column`, {
    query: `select(~[a, b])`,
    columns: ['a:Integer', 'b:String'],
    configurationBuilder: async (query, columns) => {
      const config = await _generateDefaultConfiguration(query, columns);
      config.columns.splice(0, 1);
      return config;
    },
    error: `Can't process configuration: missing column 'a'`,
  }),
  _case(`Configuration: ERROR - column ordering mismatch`, {
    query: `extend(~[d:x|1])->extend(~[f:x|1])->select(~[c, d, a])->extend(~[e:x|'asd'])`,
    columns: ['a:String', 'b:Integer', 'c:Date'],
    configurationBuilder: async (query, columns) => {
      const config = await _generateDefaultConfiguration(query, columns);
      const [col] = config.columns.splice(0, 1);
      config.columns.push(guaranteeNonNullable(col));
      return config;
    },
    error: `Can't process configuration: column ordering mismatch at index 0 (expected: 'c', found: 'd)', expected ordering: c, d, a, e, b, f`,
  }),
  _case(`Configuration: ERROR - column type mismatch`, {
    query: `select(~[a, b])->groupBy(~[b], ~[a:x|$x.a:x|$x->average()])->sort([~b->ascending()])`,
    columns: ['a:Integer', 'b:String'],
    configurationBuilder: async (query, columns) => {
      const config = await _generateDefaultConfiguration(query, columns);
      at(config.columns, 0).type = PRIMITIVE_TYPE.STRING;
      return config;
    },
    error: `Can't process configuration: type mismatch for column 'a' (expected: 'Integer', found: 'String')`,
  }),
  _case(`Configuration: ERROR - column selection mismatch`, {
    query: `select(~[a, b])->groupBy(~[b], ~[a:x|$x.a:x|$x->average()])->sort([~b->ascending()])`,
    columns: ['a:Integer', 'b:String'],
    configurationBuilder: async (query, columns) => {
      const config = await _generateDefaultConfiguration(query, columns);
      at(config.columns, 0).isSelected = false;
      return config;
    },
    error: `Can't process configuration: selection mismatch for column 'a' (expected: 'true', found: 'false')`,
  }),
  _case(`Configuration: ERROR - column kind mismatch (pivot column)`, {
    query: `select(~[a, b])->sort([~a->ascending()])->pivot(~[a], ~[b:x|$x.b:x|$x->sum()])->cast(@meta::pure::metamodel::relation::Relation<(dummy:String)>)`,
    columns: ['a:String', 'b:Integer'],
    configurationBuilder: async (query, columns) => {
      const config = await _generateDefaultConfiguration(query, columns);
      at(config.columns, 0).kind = DataCubeColumnKind.MEASURE;
      return config;
    },
    error: `Can't process configuration: kind mismatch for column 'a' (expected: 'dimension', found: 'measure')`,
  }),
  _case(
    `Configuration: ERROR - column kind mismatch (group column in groupBy() expression)`,
    {
      query: `select(~[a, b])->groupBy(~[a], ~[b:x|$x.b:x|$x->average()])->sort([~a->ascending()])`,
      columns: ['a:String', 'b:Integer'],
      configurationBuilder: async (query, columns) => {
        const config = await _generateDefaultConfiguration(query, columns);
        at(config.columns, 0).kind = DataCubeColumnKind.MEASURE;
        return config;
      },
      error: `Can't process configuration: kind mismatch for column 'a' (expected: 'dimension', found: 'measure')`,
    },
  ),
  _case(
    `Configuration: ERROR - column aggregation operator mismatch (aggregate column in pivot() expression)`,
    {
      query: `select(~[a, b])->sort([~a->ascending()])->pivot(~[a], ~[b:x|$x.b:x|$x->average()])->cast(@meta::pure::metamodel::relation::Relation<(dummy:String)>)`,
      columns: ['a:String', 'b:Integer'],
      configurationBuilder: async (query, columns) => {
        const config = await _generateDefaultConfiguration(query, columns);
        at(config.columns, 1).aggregateOperator =
          DataCubeQueryAggregateOperator.SUM;
        return config;
      },
      error: `Can't process configuration: aggregation operator mismatch for column 'b' (expected: 'avg', found: 'sum')`,
    },
  ),
  _case(
    `Configuration: ERROR - column aggregation operator mismatch (aggregate column in groupBy() expression)`,
    {
      query: `select(~[a, b])->groupBy(~[a], ~[b:x|$x.b:x|$x->average()])->sort([~a->ascending()])`,
      columns: ['a:String', 'b:Integer'],
      configurationBuilder: async (query, columns) => {
        const config = await _generateDefaultConfiguration(query, columns);
        at(config.columns, 1).aggregateOperator =
          DataCubeQueryAggregateOperator.SUM;
        return config;
      },
      error: `Can't process configuration: aggregation operator mismatch for column 'b' (expected: 'avg', found: 'sum')`,
    },
  ),
  _case(
    `Configuration: ERROR - incompatible column aggregation parameter values (aggregate column in pivot() expression)`,
    {
      query: `select(~[a, b])->sort([~a->ascending()])->pivot(~[a], ~[b:x|$x.b:x|$x->average()])->cast(@meta::pure::metamodel::relation::Relation<(dummy:String)>)`,
      columns: ['a:String', 'b:Integer'],
      configurationBuilder: async (query, columns) => {
        const config = await _generateDefaultConfiguration(query, columns);
        at(config.columns, 1).aggregationParameters = [
          {
            type: DataCubeOperationAdvancedValueType.VOID,
          },
        ];
        return config;
      },
      error: `Can't process configuration: incompatible aggregation parameter values for column 'b' (operator: 'avg')`,
    },
  ),
  _case(
    `Configuration: ERROR - incompatible column aggregation parameter values (aggregate column in groupBy() expression)`,
    {
      query: `select(~[a, b])->groupBy(~[a], ~[b:x|$x.b:x|$x->average()])->sort([~a->ascending()])`,
      columns: ['a:String', 'b:Integer'],
      configurationBuilder: async (query, columns) => {
        const config = await _generateDefaultConfiguration(query, columns);
        at(config.columns, 1).aggregationParameters = [
          {
            type: DataCubeOperationAdvancedValueType.VOID,
          },
        ];
        return config;
      },
      error: `Can't process configuration: incompatible aggregation parameter values for column 'b' (operator: 'avg')`,
    },
  ),
  _case(`Configuration: ERROR - column pivot exclusion mismatch`, {
    query: `select(~[a, b, c])->sort([~a->ascending()])->pivot(~[a], ~[b:x|$x.b:x|$x->average()])->cast(@meta::pure::metamodel::relation::Relation<(c:Integer)>)`,
    columns: ['a:String', 'b:Integer', 'c:Integer'],
    configurationBuilder: async (query, columns) => {
      const config = await _generateDefaultConfiguration(query, columns);
      at(config.columns, 2).excludedFromPivot = false;
      return config;
    },
    error: `Can't process configuration: pivot exclusion mismatch for column 'c' (expected: 'true', found: 'false')`,
  }),
  _case(`Configuration: ERROR - dimension column pivot exclusion mismatch`, {
    query: `select(~[a, b])->groupBy(~[a], ~[b:x|$x.b:x|$x->average()])->sort([~a->ascending()])`,
    columns: ['a:String', 'b:Integer'],
    configurationBuilder: async (query, columns) => {
      const config = await _generateDefaultConfiguration(query, columns);

      const colB = at(config.columns, 1);
      colB.kind = DataCubeColumnKind.DIMENSION;
      colB.excludedFromPivot = false;

      return config;
    },
    error: `Can't process configuration: column 'b' is a dimension but not excluded from pivot`,
  }),
  _case(`Configuration: ERROR - column pivot sort direction mismatch`, {
    query: `select(~[a, b])->sort([~a->ascending()])->pivot(~[a], ~[b:x|$x.b:x|$x->average()])->cast(@meta::pure::metamodel::relation::Relation<(dummy:String)>)`,
    columns: ['a:String', 'b:Integer'],
    configurationBuilder: async (query, columns) => {
      const config = await _generateDefaultConfiguration(query, columns);
      at(config.columns, 0).pivotSortDirection = undefined;
      return config;
    },
    error: `Can't process configuration: pivot sort direction mismatch for column 'a' (expected: 'ascending', found: 'none')`,
  }),

  // --------------------------------- GENERAL ---------------------------------

  _case(`GENERAL: Composition - extend()->filter()->sort()->limit()`, {
    query: `extend(~[a:x|1])->filter(x|$x.a == 1)->select(~[a])->sort([~a->ascending()])->limit(10)`,
  }),
  _case(
    `GENERAL: Composition - extend()->filter()->select()->sort()->limit()`,
    {
      query: `extend(~[a:x|1])->filter(x|$x.a == 1)->select(~[a])->sort([~a->ascending()])->limit(10)`,
    },
  ),
  _case(
    `GENERAL: Composition - extend()->groupBy()->extend()->sort()->limit()`,
    {
      query: `extend(~[a:x|1])->select(~[a, b])->groupBy(~[a], ~[b:x|$x.b:x|$x->sum()])->sort([~a->ascending()])->extend(~[c:x|2])->limit(10)`,
      columns: ['b:Integer'],
    },
  ),
  _case(
    `GENERAL: Composition - extend()->groupBy()->extend()->extend()->sort()->limit()`,
    {
      query: `extend(~[a:x|1])->select(~[a, b])->groupBy(~[a], ~[b:x|$x.b:x|$x->sum()])->sort([~a->ascending()])->extend(~[c:x|2])->extend(~[d:x|2])->limit(10)`,
      columns: ['b:Integer'],
    },
  ),
  _case(
    `GENERAL: Composition - extend()->filter()->groupBy()->extend()->sort()->limit()`,
    {
      query: `extend(~[a:x|1])->filter(x|$x.a == 1)->select(~[a, b])->groupBy(~[a], ~[b:x|$x.b:x|$x->sum()])->sort([~a->ascending()])->extend(~[c:x|2])->limit(10)`,
      columns: ['b:Integer'],
    },
  ),
  _case(
    `GENERAL: Composition - extend()->filter()->groupBy()->sort()->limit()`,
    {
      query: `extend(~[a:x|1])->filter(x|$x.a == 1)->select(~[a, b])->groupBy(~[a], ~[b:x|$x.b:x|$x->sum()])->sort([~a->ascending()])->limit(10)`,
      columns: ['b:Integer'],
    },
  ),
  _case(
    `GENERAL: Composition - extend()->filter()->sort()->pivot()->cast()->groupBy()->sort()->sort()->limit()`,
    {
      query: `extend(~[a:x|1])->filter(x|$x.a == 1)->select(~[a, b, c, d])->sort([~c->ascending()])->pivot(~[c], ~[b:x|$x.b:x|$x->sum()])->cast(@meta::pure::metamodel::relation::Relation<(d:String, a:Integer, 'val1__|__b':Integer)>)->groupBy(~[d], ~['val1__|__b':x|$x.'val1__|__b':x|$x->sum(), a:x|$x.a:x|$x->sum()])->sort([~d->ascending()])->limit(10)`,
      columns: ['c:String', 'b:Integer', 'd:String'],
    },
  ),

  // validations
  _case(`GENERAL: ERROR - not a function expression`, {
    query: `2`,
    error: `Can't process expression: expected a function expression`,
  }),
  _case(`GENERAL: ERROR - not a chain of function calls`, {
    query: `select(~[a, b], 'something')`,
    columns: ['a:Integer', 'b:Integer'],
    error: `Can't process expression: expected a sequence of function calls (e.g. x()->y()->z())`,
  }),
  _case(`GENERAL: ERROR - unsupported function`, {
    query: `sort([~asd->ascending()])->something()`,
    error: `Can't process expression: found unsupported function something()`,
  }),
  _case(`GENERAL: ERROR - wrong number of paramters provided`, {
    query: `select(~[a, b], 2, 'asd')`,
    columns: ['a:Integer', 'b:Integer'],
    error: `Can't process select() expression: expected at most 2 parameters provided, got 3`,
  }),
  _case(`GENERAL: ERROR - bad composition: select()->filter()`, {
    query: `select(~a)->filter(x|$x.a==1)`,
    columns: ['a:Integer'],
    error: `Can't process expression: unsupported function composition select()->filter() (supported composition: extend()->filter()->select()->[sort()->pivot()->cast()]->[groupBy()->sort()]->extend()->sort()->limit())`,
  }),
  _case(`GENERAL: ERROR - duplicate source columns`, {
    query: `select(~[a, b])`,
    columns: ['a:Integer', 'a:Integer', 'b:Integer'],
    error: `Can't process source: found duplicate source columns 'a'`,
  }),
];

describe(integrationTest('Roundtrip query processing'), () => {
  // make sure no tests are accidentally skipped during development
  if (FOCUSED_TESTS.length) {
    test('DEV: No test should be skipped!', () => {
      throw new Error(
        `No tests should be skipped! Remove any focus tests specified during development.`,
      );
    });
  }

  test.each(
    cases.filter((c) => {
      if (
        !FOCUSED_TESTS.length ||
        FOCUSED_TESTS.some((pattern) => {
          if (isString(pattern)) {
            return pattern.trim() === c[0].trim();
          } else if (pattern instanceof RegExp) {
            return c[0].match(pattern);
          }
          return false;
        })
      ) {
        return true;
      }
      return false;
    }),
  )(
    '%s',
    async (
      testName: TestCase[0],
      code: TestCase[1],
      columns: TestCase[2],
      configurationBuilder: TestCase[3],
      error: TestCase[4],
      validator: TestCase[5],
    ) => {
      const engine = new TEST__DataCubeEngine();
      const query = await engine.parseValueSpecification(code);
      const baseQuery = new DataCubeQuery();
      const source = new INTERNAL__DataCubeSource();
      source.columns = columns;
      baseQuery.configuration = configurationBuilder
        ? await configurationBuilder(query, columns)
        : undefined;
      let snapshot: DataCubeQuerySnapshot | undefined;

      try {
        snapshot = await validateAndBuildQuerySnapshot(
          query,
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

// --------------------------------- UTILITIES ---------------------------------

type TestCase = [
  string, // name
  string, // partial query
  DataCubeColumn[], // source columns
  (
    | ((
        query: V1_ValueSpecification,
        columns: DataCubeColumn[],
      ) => Promise<DataCubeConfiguration>)
    | undefined
  ), // configuration builder
  string | undefined, // error
  ((snapshot: DataCubeQuerySnapshot) => void) | undefined, // extra checks on snapshot
];

function _case(
  name: string,
  data: {
    query: string;
    columns?: string[] | undefined;
    configurationBuilder?:
      | ((
          query: V1_ValueSpecification,
          columns: DataCubeColumn[],
        ) => Promise<DataCubeConfiguration>)
      | undefined;
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
        name: (parts[0] as string).trim(),
        type: (parts[1] as string).trim(),
      };
    }) ?? [],
    data.configurationBuilder,
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

/**
 * Generates a default configuration based on the specified partial query and source columns.
 * And therefore, it saves us from having to specify a JSON for the configuration when we want
 * to test configuration validation.
 *
 * This is often used to generate a default configuration based on the query provided in the test,
 * then we can provide extra steps to modify and tailor the configuration to the specific test.
 */
async function _generateDefaultConfiguration(
  query: V1_ValueSpecification,
  columns: DataCubeColumn[],
) {
  const engine = new TEST__DataCubeEngine();
  const baseQuery = new DataCubeQuery();
  const source = new INTERNAL__DataCubeSource();
  source.columns = columns;
  baseQuery.configuration = undefined;

  try {
    const snapshot = await validateAndBuildQuerySnapshot(
      query,
      source,
      baseQuery,
      engine,
    );

    return DataCubeConfiguration.serialization.fromJson(
      snapshot.data.configuration,
    );
  } catch (error) {
    assertErrorThrown(error);
    throw new Error(
      `Can't generate default configuration. Error: ${error.message}`,
    );
  }
}
