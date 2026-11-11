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

import { integrationTest, unitTest } from '@finos/legend-shared/test';
import { describe, expect, test } from '@jest/globals';
import { validateAndBuildSnapshot } from '../DataCubeSnapshotBuilder.js';
import {
  assertErrorThrown,
  at,
  guaranteeNonNullable,
  guaranteeType,
  isString,
} from '@finos/legend-shared';
import { DataCubeSpecification } from '../model/DataCubeSpecification.js';
import {
  INTERNAL__DataCubeSource,
  type DataCubeSource,
} from '../model/DataCubeSource.js';
import {
  DataCubeColumnConfiguration,
  DataCubeConfiguration,
} from '../model/DataCubeConfiguration.js';
import { TEST__DataCubeEngine } from '../../__tests__/DataCubeTestUtils.js';
import {
  DataCubeSnapshot,
  type DataCubeSnapshotFilterCondition,
} from '../DataCubeSnapshot.js';
import {
  DataCubeColumnKind,
  DataCubeOperationAdvancedValueType,
  DataCubeQueryAggregateOperator,
  DataCubeQueryFilterOperator,
  DataCubeQuerySortDirection,
  type DataCubeOperationValue,
} from '../DataCubeQueryEngine.js';
import type { DataCubeColumn } from '../model/DataCubeColumn.js';
import {
  PRIMITIVE_TYPE,
  V1_AppliedFunction,
  V1_Lambda,
  type V1_ValueSpecification,
} from '@finos/legend-graph';
import type {
  DataCubeEngine,
  DataCubeRelationType,
} from '../DataCubeEngine.js';
import { buildExecutableQuery } from '../DataCubeQueryBuilder.js';
import {
  _lambda,
  _primitiveValue,
  _property,
  _var,
} from '../DataCubeQueryBuilderUtils.js';

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
    error: `Can't process extend() expression: failed to retrieve type information for columns. Error: Collection element must have a multiplicity [1] - Context:[Processing return type for lambda, new lambda, Applying extend, new lambda, Applying plus], multiplicity:[0..1]`,
  }),

  // --------------------------------- FILTER ---------------------------------

  _case(`Filter: ==`, {
    query: `filter(x|$x.Age == 27)`,
    columns: ['Age:Integer'],
    validator: _checkFilterOperator(DataCubeQueryFilterOperator.EQUAL),
  }),
  _case(`Filter: == (Boolean)`, {
    query: `filter(x|$x.Modified == false)`,
    columns: ['Modified:Boolean'],
    validator: _checkFilterOperator(DataCubeQueryFilterOperator.EQUAL),
  }),
  _case(`Filter: == : NOT`, {
    query: `filter(x|$x.Age != 27)`,
    columns: ['Age:Integer'],
    validator: _checkFilterOperator(DataCubeQueryFilterOperator.NOT_EQUAL), // higher precendence than its non-negation counterpart
  }),
  _case(`Filter: == (case-insensitive)`, {
    query: `filter(x|$x.Name->toOne()->toLower() == toLower('Asd'))`,
    columns: ['Name:String'],
    validator: _checkFilterOperator(
      DataCubeQueryFilterOperator.EQUAL_CASE_INSENSITIVE,
    ),
  }),
  _case(`Filter: == (case-insensitive) : NOT`, {
    query: `filter(x|$x.Name->toOne()->toLower() != toLower('Asd'))`,
    columns: ['Name:String'],
    validator: _checkFilterOperator(
      DataCubeQueryFilterOperator.NOT_EQUAL_CASE_INSENSITIVE, // higher precendence than its non-negation counterpart
    ),
  }),
  _case(`Filter: == (case-insensitive) : ERROR - incompatible column`, {
    query: `filter(x|$x.Age->toOne()->toLower() != toLower('Asd'))`,
    columns: ['Age:Integer'],
    error: `Can't process filter condition: no matching operator found`,
  }),
  _case(`Filter: == (case-insensitive) : ERROR - incompatible value`, {
    query: `filter(x|$x.Name->toOne()->toLower() != toLower(2))`,
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
    query: `filter(x|$x.Name->toOne()->toLower() == $x.Name2->toOne()->toLower())`,
    columns: ['Name:String', 'Name2:String'],
    validator: _checkFilterOperator(
      DataCubeQueryFilterOperator.EQUAL_CASE_INSENSITIVE_COLUMN,
    ),
  }),
  _case(`Filter: == column (case-insensitive) : NOT`, {
    query: `filter(x|$x.Name->toOne()->toLower() != $x.Name2->toOne()->toLower())`,
    columns: ['Name:String', 'Name2:String'],
    validator: _checkFilterOperator(
      DataCubeQueryFilterOperator.NOT_EQUAL_CASE_INSENSITIVE_COLUMN,
    ), // higher precendence than its non-negation counterpart
  }),
  _case(`Filter: > column : ERROR - RHS column not found`, {
    query: `filter(x|!($x.Name->toOne()->toLower() == $x.Name2->toOne()->toLower()))`,
    columns: ['Name:String'],
    error: `Can't process filter condition: no matching operator found`,
  }),
  _case(`Filter: == column (case-insensitive) : ERROR - incompatible columns`, {
    query: `filter(x|$x.Name->toOne()->toLower() != $x.Name2->toOne()->toLower())`,
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
    query: `filter(x|$x.Name->toOne()->toLower()->contains(toLower('Asd')))`,
    columns: ['Name:String'],
    validator: _checkFilterOperator(
      DataCubeQueryFilterOperator.CONTAIN_CASE_INSENSITIVE,
    ),
  }),
  _case(`Filter: contains() (case-insensitive) : NOT`, {
    query: `filter(x|!$x.Name->toOne()->toLower()->contains(toLower('Asd')))`,
    columns: ['Name:String'],
    validator: _checkFilterOperator(
      DataCubeQueryFilterOperator.CONTAIN_CASE_INSENSITIVE,
    ),
  }),
  _case(`Filter: contains() (case-insensitive) : ERROR - incompatible column`, {
    query: `filter(x|!$x.Age->toOne()->toLower()->contains(toLower('Asd')))`,
    columns: ['Age:Integer'],
    error: `Can't process filter condition: no matching operator found`,
  }),
  _case(`Filter: contains() (case-insensitive) : ERROR - incompatible value`, {
    query: `filter(x|!$x.Name->toOne()->toLower()->contains(toLower(2)))`,
    columns: ['Name:String'],
    error: `Can't process filter condition: no matching operator found`,
  }),
  // --------------------------------- IN / NOT IN ---------------------------------
  _case(`Filter: in() with strings`, {
    query: `filter(x|$x.Name->in(['Asd', 'Qwe']))`,
    columns: ['Name:String'],
    validator: _checkFilterOperator(DataCubeQueryFilterOperator.IN),
  }),
  _case(`Filter: in() with numbers`, {
    query: `filter(x|$x.Age->in([27, 28]))`,
    columns: ['Age:Integer'],
    validator: _checkFilterOperator(DataCubeQueryFilterOperator.IN),
  }),
  _case(`Filter: in() with dates`, {
    query: `filter(x|$x.Dob->in(['2020-01-01']))`,
    columns: ['Dob:Date'],
    validator: _checkFilterOperator(DataCubeQueryFilterOperator.IN),
  }),
  _case(`Filter: !in() with strings`, {
    query: `filter(x|!$x.Name->in(['Asd', 'Qwe']))`,
    columns: ['Name:String'],
    validator: _checkFilterOperator(DataCubeQueryFilterOperator.NOT_IN),
  }),
  _case(`Filter: !in() with numbers`, {
    query: `filter(x|!$x.Age->in([27, 28]))`,
    columns: ['Age:Integer'],
    validator: _checkFilterOperator(DataCubeQueryFilterOperator.NOT_IN),
  }),
  _case(`Filter: !in() with dates`, {
    query: `filter(x|!$x.Dob->in(['2020-01-01']))`,
    columns: ['Dob:Date'],
    validator: _checkFilterOperator(DataCubeQueryFilterOperator.NOT_IN),
  }),
  _case(`Filter: == today()`, {
    query: `filter(x|$x.Dob == today())`,
    columns: ['Dob:Date'],
    validator: _checkFilterOperator(DataCubeQueryFilterOperator.EQUAL),
  }),
  _case(`Filter: == today() : NOT`, {
    query: `filter(x|$x.Dob != today())`,
    columns: ['Dob:Date'],
    validator: _checkFilterOperator(DataCubeQueryFilterOperator.NOT_EQUAL),
  }),
  _case(`Filter: < today()`, {
    query: `filter(x|$x.Dob < today())`,
    columns: ['Dob:Date'],
    validator: _checkFilterOperator(DataCubeQueryFilterOperator.LESS_THAN),
  }),
  _case(`Filter: >= today()`, {
    query: `filter(x|$x.Dob >= today())`,
    columns: ['Dob:Date'],
    validator: _checkFilterOperator(
      DataCubeQueryFilterOperator.GREATER_THAN_OR_EQUAL,
    ),
  }),
  _case(`Filter: == now()`, {
    query: `filter(x|$x.LastUpdated == now())`,
    columns: ['LastUpdated:DateTime'],
    validator: _checkFilterOperator(DataCubeQueryFilterOperator.EQUAL),
  }),
  _case(`Filter: < now()`, {
    query: `filter(x|$x.LastUpdated < now())`,
    columns: ['LastUpdated:DateTime'],
    validator: _checkFilterOperator(DataCubeQueryFilterOperator.LESS_THAN),
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
    query: `filter(x|$x.Name->toOne()->toLower()->endsWith(toLower('Asd')))`,
    columns: ['Name:String'],
    validator: _checkFilterOperator(
      DataCubeQueryFilterOperator.END_WITH_CASE_INSENSITIVE,
    ),
  }),
  _case(`Filter: endsWith() (case-insensitive) : NOT`, {
    query: `filter(x|!$x.Name->toOne()->toLower()->endsWith(toLower('Asd')))`,
    columns: ['Name:String'],
    validator: _checkFilterOperator(
      DataCubeQueryFilterOperator.END_WITH_CASE_INSENSITIVE,
    ),
  }),
  _case(`Filter: endsWith() (case-insensitive) : ERROR - incompatible column`, {
    query: `filter(x|!$x.Age->toOne()->toLower()->endsWith(toLower('Asd')))`,
    columns: ['Age:Integer'],
    error: `Can't process filter condition: no matching operator found`,
  }),
  _case(`Filter: endsWith() (case-insensitive) : ERROR - incompatible value`, {
    query: `filter(x|!$x.Name->toOne()->toLower()->endsWith(toLower(2)))`,
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
    query: `filter(x|$x.Name->toOne()->toLower()->startsWith(toLower('Asd')))`,
    columns: ['Name:String'],
    validator: _checkFilterOperator(
      DataCubeQueryFilterOperator.START_WITH_CASE_INSENSITIVE,
    ),
  }),
  _case(`Filter: startsWith() (case-insensitive) : NOT`, {
    query: `filter(x|!$x.Name->toOne()->toLower()->startsWith(toLower('Asd')))`,
    columns: ['Name:String'],
    validator: _checkFilterOperator(
      DataCubeQueryFilterOperator.START_WITH_CASE_INSENSITIVE,
    ),
  }),
  _case(
    `Filter: startsWith() (case-insensitive) : ERROR - incompatible column`,
    {
      query: `filter(x|!$x.Age->toOne()->toLower()->startsWith(toLower('Asd')))`,
      columns: ['Age:Integer'],
      error: `Can't process filter condition: no matching operator found`,
    },
  ),
  _case(
    `Filter: startsWith() (case-insensitive) : ERROR - incompatible value`,
    {
      query: `filter(x|!$x.Name->toOne()->toLower()->startsWith(toLower(2)))`,
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
  _case(`Filter: != (Boolean)`, {
    query: `filter(x|$x.Modified != false)`,
    columns: ['Modified:Boolean'],
    validator: _checkFilterOperator(DataCubeQueryFilterOperator.NOT_EQUAL),
  }),
  _case(`Filter: != : NOT`, {
    query: `filter(x|!($x.Age != 27))`,
    columns: ['Age:Integer'],
    validator: _checkFilterOperator(DataCubeQueryFilterOperator.NOT_EQUAL),
  }),
  _case(`Filter: != (case-insensitive)`, {
    query: `filter(x|$x.Name->toOne()->toLower() != toLower('Asd'))`,
    columns: ['Name:String'],
    validator: _checkFilterOperator(
      DataCubeQueryFilterOperator.NOT_EQUAL_CASE_INSENSITIVE,
    ),
  }),
  _case(`Filter: != (case-insensitive) : NOT`, {
    query: `filter(x|!($x.Name->toOne()->toLower() != toLower('Asd')))`,
    columns: ['Name:String'],
    validator: _checkFilterOperator(
      DataCubeQueryFilterOperator.NOT_EQUAL_CASE_INSENSITIVE,
    ),
  }),
  _case(`Filter: != (case-insensitive) : ERROR - incompatible column`, {
    query: `filter(x|!($x.Age->toOne()->toLower() != toLower('Asd')))`,
    columns: ['Age:Integer'],
    error: `Can't process filter condition: no matching operator found`,
  }),
  _case(`Filter: != (case-insensitive) : ERROR - incompatible value`, {
    query: `filter(x|!($x.Name->toOne()->toLower() != toLower(2)))`,
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
    query: `filter(x|$x.Name->toOne()->toLower() != $x.Name2->toOne()->toLower())`,
    columns: ['Name:String', 'Name2:String'],
    validator: _checkFilterOperator(
      DataCubeQueryFilterOperator.NOT_EQUAL_CASE_INSENSITIVE_COLUMN,
    ),
  }),
  _case(`Filter: != column (case-insensitive) : NOT`, {
    query: `filter(x|!($x.Name->toOne()->toLower() != $x.Name2->toOne()->toLower()))`,
    columns: ['Name:String', 'Name2:String'],
    validator: _checkFilterOperator(
      DataCubeQueryFilterOperator.NOT_EQUAL_CASE_INSENSITIVE_COLUMN,
    ),
  }),
  _case(`Filter: != column : ERROR - RHS column not found`, {
    query: `filter(x|!($x.Name->toOne()->toLower() != $x.Name2->toOne()->toLower()))`,
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
    query: `filter(x|($x.Age != 27) || ($x.Name->toOne()->toLower() != toLower('Michael Phelps')))`,
    columns: ['Age:Integer', 'Name:String'],
  }),
  _case(`Filter: OR group : NOT`, {
    query: `filter(x|!(($x.Age != 27) || ($x.Name->toOne()->toLower() != toLower('Michael Phelps'))))`,
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
    query: `filter(x|$x.Name->toOne()->toLower()->endsWith(toLower('Phelps')) || !(($x.Age != 27) && ($x.Name == 'Michael Phelps')))`,
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
    query: `filter(x|$x.Name->toOne()->toLower()->endsWith(toLower('Phelps')) || !(($y.Age != 27) && ($x.Name == 'Michael Phelps')))`,
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
    validator: _checkAggregateOperator('b', DataCubeQueryAggregateOperator.SUM),
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
    validator: _checkAggregateOperator(
      'b',
      DataCubeQueryAggregateOperator.AVERAGE,
    ),
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
    validator: _checkAggregateOperator(
      'b',
      DataCubeQueryAggregateOperator.COUNT,
    ),
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
    validator: _checkAggregateOperator('b', DataCubeQueryAggregateOperator.MIN),
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
    validator: _checkAggregateOperator('b', DataCubeQueryAggregateOperator.MAX),
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
    validator: _checkAggregateOperator(
      'b',
      DataCubeQueryAggregateOperator.UNIQUE,
    ),
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
    validator: _checkAggregateOperator(
      'b',
      DataCubeQueryAggregateOperator.FIRST,
    ),
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
    validator: _checkAggregateOperator(
      'b',
      DataCubeQueryAggregateOperator.LAST,
    ),
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
    validator: _checkAggregateOperator(
      'b',
      DataCubeQueryAggregateOperator.VARIANCE_POPULATION,
    ),
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
    validator: _checkAggregateOperator(
      'b',
      DataCubeQueryAggregateOperator.VARIANCE_SAMPLE,
    ),
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
    validator: _checkAggregateOperator(
      'b',
      DataCubeQueryAggregateOperator.STANDARD_DEVIATION_POPULATION,
    ),
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
    validator: _checkAggregateOperator(
      'b',
      DataCubeQueryAggregateOperator.STANDARD_DEVIATION_SAMPLE,
    ),
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
    validator: _checkAggregateOperator(
      'b',
      DataCubeQueryAggregateOperator.JOIN_STRINGS,
      [{ type: PRIMITIVE_TYPE.STRING, value: ',' }],
    ),
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
  _case(`Aggregation: median()`, {
    query: `select(~[a, b])->groupBy(~[a], ~[b:x|$x.b:x|$x->median()])->sort([~a->ascending()])`,
    columns: ['a:String', 'b:Integer'],
    validator: _checkAggregateOperator(
      'b',
      DataCubeQueryAggregateOperator.MEDIAN,
    ),
  }),
  _case(`Aggregation: median() : ERROR - incompatible column`, {
    query: `select(~[a, b])->groupBy(~[a], ~[b:x|$x.b:x|$x->median()])->sort([~a->ascending()])`,
    columns: ['a:String', 'b:String'],
    error: `Can't process aggregate column 'b': no matching operator found`,
  }),
  _case(`Aggregation: median() : ERROR - incompatible parameters`, {
    query: `select(~[a, b])->groupBy(~[a], ~[b:x|$x.b:x|$x->median('asd')])->sort([~a->ascending()])`,
    columns: ['a:String', 'b:Integer'],
    error: `Can't process aggregate column 'b': no matching operator found`,
  }),
  _case(`Aggregation: mode()`, {
    query: `select(~[a, b])->groupBy(~[a], ~[b:x|$x.b:x|$x->mode()])->sort([~a->ascending()])`,
    columns: ['a:String', 'b:Float'],
    validator: _checkAggregateOperator(
      'b',
      DataCubeQueryAggregateOperator.MODE,
    ),
  }),
  _case(`Aggregation: mode() : ERROR - incompatible column (decimal)`, {
    query: `select(~[a, b])->groupBy(~[a], ~[b:x|$x.b:x|$x->mode()])->sort([~a->ascending()])`,
    columns: ['a:String', 'b:Decimal'],
    error: `Can't process aggregate column 'b': no matching operator found`,
  }),
  _case(`Aggregation: percentile()`, {
    query: `select(~[a, b])->groupBy(~[a], ~[b:x|$x.b:x|$x->percentile(0.9)])->sort([~a->ascending()])`,
    columns: ['a:String', 'b:Integer'],
    validator: _checkAggregateOperator(
      'b',
      DataCubeQueryAggregateOperator.PERCENTILE,
      [{ type: PRIMITIVE_TYPE.FLOAT, value: 0.9 }],
    ),
  }),
  _case(`Aggregation: percentile() : ERROR - missing parameter`, {
    query: `select(~[a, b])->groupBy(~[a], ~[b:x|$x.b:x|$x->percentile()])->sort([~a->ascending()])`,
    columns: ['a:String', 'b:Integer'],
    error: `Can't process aggregate column 'b': no matching operator found`,
  }),
  _case(`Aggregation: percentile() : ERROR - integer parameter`, {
    // NOTE: the engine requires the percentile to be a float value, see
    // meta::pure::functions::math::percentile(Number[*], Float[1])
    query: `select(~[a, b])->groupBy(~[a], ~[b:x|$x.b:x|$x->percentile(1)])->sort([~a->ascending()])`,
    columns: ['a:String', 'b:Integer'],
    error: `Can't process aggregate column 'b': no matching operator found`,
  }),
  _case(`Aggregation: percentile() : ERROR - out-of-range parameter`, {
    query: `select(~[a, b])->groupBy(~[a], ~[b:x|$x.b:x|$x->percentile(1.5)])->sort([~a->ascending()])`,
    columns: ['a:String', 'b:Integer'],
    error: `Can't process aggregate column 'b': no matching operator found`,
  }),
  _case(`Aggregation: wavg()`, {
    query: `select(~[a, b, c])->groupBy(~[a], ~[b:x|$x.b->meta::pure::functions::math::mathUtility::rowMapper($x.c):x|$x->wavg(), c:x|$x.c:x|$x->sum()])->sort([~a->ascending()])`,
    columns: ['a:String', 'b:Float', 'c:Integer'],
    validator: _checkAggregateOperator(
      'b',
      DataCubeQueryAggregateOperator.WEIGHTED_AVERAGE,
      [{ type: DataCubeOperationAdvancedValueType.COLUMN, value: 'c' }],
    ),
  }),
  _case(`Aggregation: wavg() : ERROR - weight column not found`, {
    query: `select(~[a, b])->groupBy(~[a], ~[b:x|$x.b->meta::pure::functions::math::mathUtility::rowMapper($x.c):x|$x->wavg()])->sort([~a->ascending()])`,
    columns: ['a:String', 'b:Float', 'c:Integer'],
    error: `Can't process aggregate column 'b': no matching operator found`,
  }),
  _case(`Aggregation: wavg() : ERROR - unmatched mapped column name`, {
    query: `select(~[a, b, c])->groupBy(~[a], ~[b:x|$x.c->meta::pure::functions::math::mathUtility::rowMapper($x.b):x|$x->wavg(), c:x|$x.c:x|$x->sum()])->sort([~a->ascending()])`,
    columns: ['a:String', 'b:Float', 'c:Integer'],
    error: `Can't process aggregate column 'b': no matching operator found`,
  }),
  _case(`Aggregation: wavg() : ERROR - incompatible column`, {
    query: `select(~[a, b, c])->groupBy(~[a], ~[b:x|$x.b->meta::pure::functions::math::mathUtility::rowMapper($x.c):x|$x->wavg(), c:x|$x.c:x|$x->sum()])->sort([~a->ascending()])`,
    columns: ['a:String', 'b:String', 'c:Integer'],
    error: `Can't process aggregate column 'b': no matching operator found`,
  }),
  _case(`Aggregation: corr()`, {
    query: `select(~[a, b, c])->groupBy(~[a], ~[b:x|$x.b->meta::pure::functions::math::mathUtility::rowMapper($x.c):x|$x->corr(), c:x|$x.c:x|$x->sum()])->sort([~a->ascending()])`,
    columns: ['a:String', 'b:Float', 'c:Float'],
    validator: _checkAggregateOperator(
      'b',
      DataCubeQueryAggregateOperator.CORRELATION,
      [{ type: DataCubeOperationAdvancedValueType.COLUMN, value: 'c' }],
    ),
  }),
  _case(`Aggregation: covarPopulation()`, {
    query: `select(~[a, b, c])->groupBy(~[a], ~[b:x|$x.b->meta::pure::functions::math::mathUtility::rowMapper($x.c):x|$x->covarPopulation(), c:x|$x.c:x|$x->sum()])->sort([~a->ascending()])`,
    columns: ['a:String', 'b:Float', 'c:Float'],
    validator: _checkAggregateOperator(
      'b',
      DataCubeQueryAggregateOperator.COVARIANCE_POPULATION,
      [{ type: DataCubeOperationAdvancedValueType.COLUMN, value: 'c' }],
    ),
  }),
  _case(`Aggregation: covarSample()`, {
    query: `select(~[a, b, c])->groupBy(~[a], ~[b:x|$x.b->meta::pure::functions::math::mathUtility::rowMapper($x.c):x|$x->covarSample(), c:x|$x.c:x|$x->sum()])->sort([~a->ascending()])`,
    columns: ['a:String', 'b:Float', 'c:Float'],
    validator: _checkAggregateOperator(
      'b',
      DataCubeQueryAggregateOperator.COVARIANCE_SAMPLE,
      [{ type: DataCubeOperationAdvancedValueType.COLUMN, value: 'c' }],
    ),
  }),
  _case(`Aggregation: maxBy()`, {
    query: `select(~[a, b, c])->groupBy(~[a], ~[b:x|$x.b->meta::pure::functions::math::mathUtility::rowMapper($x.c):x|$x->maxBy(), c:x|$x.c:x|$x->sum()])->sort([~a->ascending()])`,
    columns: ['a:String', 'b:String', 'c:Integer'],
    validator: _checkAggregateOperator(
      'b',
      DataCubeQueryAggregateOperator.MAX_BY,
      [{ type: DataCubeOperationAdvancedValueType.COLUMN, value: 'c' }],
    ),
  }),
  _case(`Aggregation: maxBy() : ERROR - incompatible parameters`, {
    query: `select(~[a, b, c])->groupBy(~[a], ~[b:x|$x.b->meta::pure::functions::math::mathUtility::rowMapper($x.c):x|$x->maxBy(2), c:x|$x.c:x|$x->sum()])->sort([~a->ascending()])`,
    columns: ['a:String', 'b:String', 'c:Integer'],
    error: `Can't process aggregate column 'b': no matching operator found`,
  }),
  _case(`Aggregation: minBy()`, {
    query: `select(~[a, b, c])->groupBy(~[a], ~[b:x|$x.b->meta::pure::functions::math::mathUtility::rowMapper($x.c):x|$x->minBy(), c:x|$x.c:x|$x->sum()])->sort([~a->ascending()])`,
    columns: ['a:String', 'b:StrictDate', 'c:Integer'],
    validator: _checkAggregateOperator(
      'b',
      DataCubeQueryAggregateOperator.MIN_BY,
      [{ type: DataCubeOperationAdvancedValueType.COLUMN, value: 'c' }],
    ),
  }),
  _case(`Aggregation: and()`, {
    query: `select(~[a, b])->groupBy(~[a], ~[b:x|$x.b:x|$x->and()])->sort([~a->ascending()])`,
    columns: ['a:String', 'b:Boolean'],
    validator: _checkAggregateOperator('b', DataCubeQueryAggregateOperator.ALL),
  }),
  _case(`Aggregation: and() : ERROR - incompatible column`, {
    query: `select(~[a, b])->groupBy(~[a], ~[b:x|$x.b:x|$x->and()])->sort([~a->ascending()])`,
    columns: ['a:String', 'b:Integer'],
    error: `Can't process aggregate column 'b': no matching operator found`,
  }),
  _case(`Aggregation: or()`, {
    query: `select(~[a, b])->groupBy(~[a], ~[b:x|$x.b:x|$x->or()])->sort([~a->ascending()])`,
    columns: ['a:String', 'b:Boolean'],
    validator: _checkAggregateOperator('b', DataCubeQueryAggregateOperator.ANY),
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
  _case(
    `GroupBy: following pivot() expression where aggregation changes column type`,
    {
      query: `select(~[a, b, c, d])->sort([~c->ascending()])->pivot(~[c], ~[b:x|$x.b:x|$x->sum()])->cast(@meta::pure::metamodel::relation::Relation<(d:String, a:Integer, 'val1__|__b':Float)>)->groupBy(~[d], ~['val1__|__b':x|$x.'val1__|__b':x|$x->sum(), a:x|$x.a:x|$x->sum()])->sort([~d->ascending()])`,
      columns: ['a:Integer', 'c:String', 'b:Integer', 'd:String'],
    },
  ),
  _case(
    `GroupBy: following pivot() expression with aggregation referencing another column`,
    {
      query: `select(~[a, b, c, d])->sort([~c->ascending()])->pivot(~[c], ~[a:x|$x.a:x|$x->sum(), b:x|$x.b->meta::pure::functions::math::mathUtility::rowMapper($x.a):x|$x->wavg()])->cast(@meta::pure::metamodel::relation::Relation<(d:String, 'val1__|__a':Integer, 'val1__|__b':Float)>)->groupBy(~[d], ~['val1__|__a':x|$x.'val1__|__a':x|$x->sum(), 'val1__|__b':x|$x.'val1__|__b'->meta::pure::functions::math::mathUtility::rowMapper($x.'val1__|__a'):x|$x->wavg()])->sort([~d->ascending()])`,
      columns: ['a:Integer', 'b:Float', 'c:String', 'd:String'],
    },
  ),
  _case(
    `GroupBy: sum and weighted average of the same column using a leaf-level extended column`,
    {
      query: `extend(~[priceWavg:x|$x.price])->select(~[desk, price, qty, priceWavg])->groupBy(~[desk], ~[price:x|$x.price:x|$x->sum(), qty:x|$x.qty:x|$x->sum(), priceWavg:x|$x.priceWavg->meta::pure::functions::math::mathUtility::rowMapper($x.qty):x|$x->wavg()])->sort([~desk->ascending()])`,
      columns: ['desk:String', 'price:Float', 'qty:Integer'],
      validator: (snapshot) => {
        _checkAggregateOperator(
          'price',
          DataCubeQueryAggregateOperator.SUM,
        )(snapshot);
        _checkAggregateOperator(
          'priceWavg',
          DataCubeQueryAggregateOperator.WEIGHTED_AVERAGE,
          [{ type: DataCubeOperationAdvancedValueType.COLUMN, value: 'qty' }],
        )(snapshot);
      },
    },
  ),
  _case(`GroupBy: weighted average by a leaf-level extended column`, {
    query: `extend(~[weight:x|$x.qty])->select(~[desk, price, qty, weight])->groupBy(~[desk], ~[price:x|$x.price->meta::pure::functions::math::mathUtility::rowMapper($x.weight):x|$x->wavg(), qty:x|$x.qty:x|$x->sum(), weight:x|$x.weight:x|$x->sum()])->sort([~desk->ascending()])`,
    columns: ['desk:String', 'price:Float', 'qty:Integer'],
    validator: _checkAggregateOperator(
      'price',
      DataCubeQueryAggregateOperator.WEIGHTED_AVERAGE,
      [{ type: DataCubeOperationAdvancedValueType.COLUMN, value: 'weight' }],
    ),
  }),
  _case(`GroupBy: weighted average grouped by a leaf-level extended column`, {
    query: `extend(~[size:x|$x.desk])->select(~[size, price, qty])->groupBy(~[size], ~[price:x|$x.price->meta::pure::functions::math::mathUtility::rowMapper($x.qty):x|$x->wavg(), qty:x|$x.qty:x|$x->sum()])->sort([~size->ascending()])`,
    columns: ['desk:String', 'price:Float', 'qty:Integer'],
    validator: _checkAggregateOperator(
      'price',
      DataCubeQueryAggregateOperator.WEIGHTED_AVERAGE,
      [{ type: DataCubeOperationAdvancedValueType.COLUMN, value: 'qty' }],
    ),
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
    error: `Can't process extend() expression: failed to retrieve type information for columns. Error: Collection element must have a multiplicity [1] - Context:[Processing return type for lambda, new lambda, Applying extend, new lambda, Applying plus], multiplicity:[0..1]`,
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
  _case(
    `Configuration: with precise numeric column persisted with older defaults not aggregated in groupBy() expression`,
    {
      query: `select(~[a, b])->groupBy(~[a], ~[b:x|$x.b:x|$x->sum()])->sort([~a->ascending()])`,
      columns: [
        'a:String',
        'b:Integer',
        'c:meta::pure::precisePrimitives::Numeric(18,4)',
      ],
      configurationBuilder: async (query, columns) => {
        const config = await _generateDefaultConfiguration(query, columns);
        _setOlderPreciseNumericColumnDefaults(config, 'c');
        return config;
      },
      validator: _checkAggregateOperator(
        'c',
        DataCubeQueryAggregateOperator.UNIQUE,
      ),
    },
  ),
  _case(
    `Configuration: with precise numeric column persisted with older defaults not aggregated in pivot() expression`,
    {
      query: `select(~[a, b])->sort([~a->ascending()])->pivot(~[a], ~[b:x|$x.b:x|$x->sum()])->cast(@meta::pure::metamodel::relation::Relation<(dummy:String)>)`,
      columns: [
        'a:String',
        'b:Integer',
        'c:meta::pure::precisePrimitives::Numeric(18,4)',
      ],
      configurationBuilder: async (query, columns) => {
        const config = await _generateDefaultConfiguration(query, columns);
        _setOlderPreciseNumericColumnDefaults(config, 'c');
        return config;
      },
      validator: _checkAggregateOperator(
        'c',
        DataCubeQueryAggregateOperator.UNIQUE,
      ),
    },
  ),
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
    `Configuration: ERROR - column aggregation operator mismatch (precise numeric aggregate column in groupBy() expression)`,
    {
      query: `select(~[a, c])->groupBy(~[a], ~[c:x|$x.c:x|$x->sum()])->sort([~a->ascending()])`,
      columns: ['a:String', 'c:meta::pure::precisePrimitives::Numeric(18,4)'],
      configurationBuilder: async (query, columns) => {
        const config = await _generateDefaultConfiguration(query, columns);
        _findColumnConfiguration(config, 'c').aggregateOperator =
          DataCubeQueryAggregateOperator.UNIQUE;
        return config;
      },
      error: `Can't process configuration: aggregation operator mismatch for column 'c' (expected: 'sum', found: 'uniq')`,
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

  // --------------------------------- VARIANT ---------------------------------

  _case(`Variant: Filter isEmpty()`, {
    query: `filter(x|$x.doc->isEmpty())`,
    columns: ['doc:Variant'],
    validator: _checkFilterOperator(DataCubeQueryFilterOperator.IS_NULL),
  }),
  _case(`Variant: GroupBy with a JSON column aggregated by unique value`, {
    query: `select(~[a, doc])->groupBy(~[a], ~[doc:x|$x.doc:x|$x->uniqueValueOnly()])->sort([~a->ascending()])`,
    columns: ['a:String', 'doc:Variant'],
  }),
  _case(`Variant: ERROR - Pivot on a JSON column`, {
    query: `select(~[doc, b])->sort([~doc->ascending()])->pivot(~[doc], ~[b:x|$x.b:x|$x->sum()])->cast(@meta::pure::metamodel::relation::Relation<(dummy:String)>)`,
    columns: ['doc:Variant', 'b:Integer'],
    error: `Can't process pivot() expression: can't pivot on column 'doc' since it holds JSON. Pivot on a value extracted from it instead, e.g. an extended column such as x|$x.doc->get('key')->to(@String)`,
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
      const baseQuery = new DataCubeSpecification();
      const source = new INTERNAL__DataCubeSource();
      source.columns = columns;
      baseQuery.configuration = configurationBuilder
        ? await configurationBuilder(query, columns)
        : undefined;
      let snapshot: DataCubeSnapshot | undefined;

      try {
        snapshot = await validateAndBuildSnapshot(
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
  ((snapshot: DataCubeSnapshot) => void) | undefined, // extra checks on snapshot
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
    validator?: ((snapshot: DataCubeSnapshot) => void) | undefined;
  },
): TestCase {
  return [
    name,
    data.query,
    // NOTE: column entries are specified as `name:type`, where the type can be
    // a path and can specify type variable values, e.g. `name:a::Numeric(18,4)`
    data.columns?.map((entry) => {
      const separatorIndex = entry.indexOf(':');
      const columnName = entry.slice(0, separatorIndex).trim();
      const groups = entry
        .slice(separatorIndex + 1)
        .trim()
        .match(/^(?<type>[^(]+)(?:\((?<typeVariableValues>.*)\))?$/u)?.groups;
      const type = (groups?.type ?? '').trim();
      return groups?.typeVariableValues
        ? {
            name: columnName,
            type,
            typeVariableValues: groups.typeVariableValues
              .split(',')
              .map((value) => Number(value.trim())),
          }
        : { name: columnName, type };
    }) ?? [],
    data.configurationBuilder,
    data.error,
    data.validator,
  ];
}

function _findColumnConfiguration(
  config: DataCubeConfiguration,
  name: string,
): DataCubeColumnConfiguration {
  return guaranteeNonNullable(
    config.columns.find((column) => column.name === name),
  );
}

/**
 * Sets the defaults older versions used for precise numeric columns, e.g. `Numeric`,
 * which were persisted as dimensions aggregated with `unique` rather than measures
 * aggregated with `sum`.
 */
function _setOlderPreciseNumericColumnDefaults(
  config: DataCubeConfiguration,
  name: string,
) {
  const column = _findColumnConfiguration(config, name);
  column.kind = DataCubeColumnKind.DIMENSION;
  column.excludedFromPivot = true;
  column.aggregateOperator = DataCubeQueryAggregateOperator.UNIQUE;
}

function _checkAggregateOperator(
  name: string,
  operator: DataCubeQueryAggregateOperator,
  parameterValues?: DataCubeOperationValue[] | undefined,
) {
  return (snapshot: DataCubeSnapshot) => {
    const column = _findColumnConfiguration(
      DataCubeConfiguration.serialization.fromJson(snapshot.data.configuration),
      name,
    );
    expect(column.aggregateOperator).toBe(operator);
    if (parameterValues) {
      expect(column.aggregationParameters).toEqual(parameterValues);
    }
  };
}

function _checkFilterOperator(operator: DataCubeQueryFilterOperator) {
  return (snapshot: DataCubeSnapshot) => {
    expect(
      (snapshot.data.filter?.conditions[0] as DataCubeSnapshotFilterCondition)
        .operator,
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
  const baseQuery = new DataCubeSpecification();
  const source = new INTERNAL__DataCubeSource();
  source.columns = columns;
  baseQuery.configuration = undefined;

  try {
    const snapshot = await validateAndBuildSnapshot(
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

// --------------------------------- ROUNDTRIP WITHOUT GRAMMAR ---------------------------------

/**
 * NOTE: these tests check the query built from a snapshot can be processed back
 * into the same snapshot, i.e. the query builder and the snapshot builder agree,
 * without needing an engine to parse/compose the grammar of the query: the only
 * call made to the engine, i.e. retrieving the types of extended columns, is stubbed.
 *
 * The tests above go through the grammar, i.e. they require an engine.
 */
class TEST__RoundtripDataCubeEngine extends TEST__DataCubeEngine {
  constructor(private readonly _columns: DataCubeColumn[]) {
    super();
  }

  override async getQueryRelationReturnType(
    query: V1_Lambda,
    source: DataCubeSource,
  ): Promise<DataCubeRelationType> {
    return { columns: this._columns };
  }
}

type TestColumn = DataCubeColumn & {
  kind: DataCubeColumnKind;
  aggregateOperator: string;
  aggregationParameters?: DataCubeOperationValue[] | undefined;
  excludedFromPivot?: boolean | undefined;
};

const _dimension = (name: string): TestColumn => ({
  name,
  type: PRIMITIVE_TYPE.STRING,
  kind: DataCubeColumnKind.DIMENSION,
  aggregateOperator: DataCubeQueryAggregateOperator.UNIQUE,
  excludedFromPivot: true,
});

const _measure = (
  name: string,
  type: string,
  aggregateOperator: string = DataCubeQueryAggregateOperator.SUM,
  aggregationParameters?: DataCubeOperationValue[],
): TestColumn => ({
  name,
  type,
  kind: DataCubeColumnKind.MEASURE,
  aggregateOperator,
  aggregationParameters,
  excludedFromPivot: false,
});

const _column = (name: string): DataCubeOperationValue[] => [
  { type: DataCubeOperationAdvancedValueType.COLUMN, value: name },
];

const _col = (column: DataCubeColumn): DataCubeColumn => ({
  name: column.name,
  type: column.type,
});

type SnapshotTestCase = {
  sourceColumns: TestColumn[];
  // leaf-level extended columns, computed as `x|$x.<from>` for simplicity
  leafExtendedColumns?: (TestColumn & { from: string })[] | undefined;
  groupBy: string[];
  pivot?:
    | {
        columns: string[];
        castColumns: DataCubeColumn[];
      }
    | undefined;
};

function _snapshot(testCase: SnapshotTestCase, engine: DataCubeEngine) {
  const leafExtendedColumns = testCase.leafExtendedColumns ?? [];
  const allColumns = [...testCase.sourceColumns, ...leafExtendedColumns];
  const _getCol = (name: string) =>
    _col(guaranteeNonNullable(allColumns.find((col) => col.name === name)));
  const configuration = new DataCubeConfiguration();
  configuration.columns = allColumns.map((column) => {
    const columnConfiguration = new DataCubeColumnConfiguration(
      column.name,
      column.type,
    );
    columnConfiguration.kind = column.kind;
    columnConfiguration.aggregateOperator = column.aggregateOperator;
    columnConfiguration.aggregationParameters =
      column.aggregationParameters ?? [];
    columnConfiguration.excludedFromPivot = column.excludedFromPivot ?? true;
    return columnConfiguration;
  });
  const snapshot = DataCubeSnapshot.create(configuration.serialize());
  snapshot.data.sourceColumns = testCase.sourceColumns.map(_col);
  snapshot.data.leafExtendedColumns = leafExtendedColumns.map((column) => ({
    ..._col(column),
    mapFn: engine.serializeValueSpecification(
      _lambda([_var()], [_property(column.from)]),
    ),
  }));
  snapshot.data.selectColumns = allColumns.map(_col);
  snapshot.data.groupBy = { columns: testCase.groupBy.map(_getCol) };
  if (testCase.pivot) {
    snapshot.data.pivot = {
      columns: testCase.pivot.columns.map(_getCol),
      castColumns: testCase.pivot.castColumns,
    };
  }
  return snapshot;
}

function _source(testCase: SnapshotTestCase) {
  const source = new INTERNAL__DataCubeSource();
  source.query = _primitiveValue(PRIMITIVE_TYPE.STRING, '');
  source.columns = testCase.sourceColumns.map(_col);
  return source;
}

/**
 * Builds the query without the source, as stored in a DataCube specification
 */
function _buildPartialQuery(
  snapshot: DataCubeSnapshot,
  source: DataCubeSource,
  engine: DataCubeEngine,
): V1_ValueSpecification {
  const query = buildExecutableQuery(snapshot, source, engine, {
    skipExecutionContext: true,
  });
  let first = query;
  while (
    first instanceof V1_AppliedFunction &&
    first.parameters[0] instanceof V1_AppliedFunction
  ) {
    first = first.parameters[0];
  }
  if (first instanceof V1_AppliedFunction) {
    first.parameters.shift();
  }
  return query;
}

async function _roundtrip(testCase: SnapshotTestCase) {
  const engine = new TEST__RoundtripDataCubeEngine([
    ...testCase.sourceColumns.map(_col),
    ...(testCase.leafExtendedColumns ?? []).map(_col),
  ]);
  const source = _source(testCase);
  const query = _buildPartialQuery(_snapshot(testCase, engine), source, engine);

  // process the query without configuration, i.e. the configuration is derived from the query
  const specification = new DataCubeSpecification();
  const snapshot = await validateAndBuildSnapshot(
    query,
    source,
    specification,
    engine,
  );
  expect(
    engine.serializeValueSpecification(
      _buildPartialQuery(snapshot, source, engine),
    ),
  ).toEqual(engine.serializeValueSpecification(query));

  // process the query again with the configuration derived, i.e. as when a saved DataCube
  // is loaded, which validates the configuration against the query
  const reloadSpecification = new DataCubeSpecification();
  reloadSpecification.configuration =
    DataCubeConfiguration.serialization.fromJson(snapshot.data.configuration);
  const reloadedSnapshot = await validateAndBuildSnapshot(
    query,
    source,
    reloadSpecification,
    engine,
  );
  expect(reloadedSnapshot.data.configuration).toEqual(
    snapshot.data.configuration,
  );

  return DataCubeConfiguration.serialization.fromJson(
    snapshot.data.configuration,
  );
}

function _expectAggregation(
  configuration: DataCubeConfiguration,
  name: string,
  operator: string,
  parameterValues: DataCubeOperationValue[] = [],
) {
  const column = _findColumnConfiguration(configuration, name);
  expect(column.aggregateOperator).toBe(operator);
  expect(column.aggregationParameters).toEqual(parameterValues);
}

const DESK = _dimension('Desk');
const QTY = _measure('Qty', PRIMITIVE_TYPE.INTEGER);

/**
 * A case for every aggregation: the type of the aggregated column, and the parameter
 * values, where aggregations referencing another column reference `Qty`
 */
const AGGREGATION_CASES: [string, string, DataCubeOperationValue[]][] = [
  [DataCubeQueryAggregateOperator.SUM, PRIMITIVE_TYPE.INTEGER, []],
  [DataCubeQueryAggregateOperator.AVERAGE, PRIMITIVE_TYPE.FLOAT, []],
  [DataCubeQueryAggregateOperator.COUNT, PRIMITIVE_TYPE.INTEGER, []],
  [DataCubeQueryAggregateOperator.MIN, PRIMITIVE_TYPE.FLOAT, []],
  [DataCubeQueryAggregateOperator.MAX, PRIMITIVE_TYPE.FLOAT, []],
  [DataCubeQueryAggregateOperator.UNIQUE, PRIMITIVE_TYPE.STRING, []],
  [DataCubeQueryAggregateOperator.FIRST, PRIMITIVE_TYPE.STRING, []],
  [DataCubeQueryAggregateOperator.LAST, PRIMITIVE_TYPE.STRICTDATE, []],
  [
    DataCubeQueryAggregateOperator.VARIANCE_POPULATION,
    PRIMITIVE_TYPE.FLOAT,
    [],
  ],
  [DataCubeQueryAggregateOperator.VARIANCE_SAMPLE, PRIMITIVE_TYPE.FLOAT, []],
  [
    DataCubeQueryAggregateOperator.STANDARD_DEVIATION_POPULATION,
    PRIMITIVE_TYPE.FLOAT,
    [],
  ],
  [
    DataCubeQueryAggregateOperator.STANDARD_DEVIATION_SAMPLE,
    PRIMITIVE_TYPE.FLOAT,
    [],
  ],
  [
    DataCubeQueryAggregateOperator.JOIN_STRINGS,
    PRIMITIVE_TYPE.STRING,
    [{ type: PRIMITIVE_TYPE.STRING, value: ', ' }],
  ],
  [DataCubeQueryAggregateOperator.MEDIAN, PRIMITIVE_TYPE.INTEGER, []],
  [DataCubeQueryAggregateOperator.MODE, PRIMITIVE_TYPE.FLOAT, []],
  [
    DataCubeQueryAggregateOperator.PERCENTILE,
    PRIMITIVE_TYPE.FLOAT,
    [{ type: PRIMITIVE_TYPE.FLOAT, value: 0.9 }],
  ],
  [
    DataCubeQueryAggregateOperator.WEIGHTED_AVERAGE,
    PRIMITIVE_TYPE.FLOAT,
    _column('Qty'),
  ],
  [
    DataCubeQueryAggregateOperator.CORRELATION,
    PRIMITIVE_TYPE.FLOAT,
    _column('Qty'),
  ],
  [
    DataCubeQueryAggregateOperator.COVARIANCE_POPULATION,
    PRIMITIVE_TYPE.FLOAT,
    _column('Qty'),
  ],
  [
    DataCubeQueryAggregateOperator.COVARIANCE_SAMPLE,
    PRIMITIVE_TYPE.FLOAT,
    _column('Qty'),
  ],
  [
    DataCubeQueryAggregateOperator.MAX_BY,
    PRIMITIVE_TYPE.STRING,
    _column('Qty'),
  ],
  [
    DataCubeQueryAggregateOperator.MIN_BY,
    PRIMITIVE_TYPE.STRICTDATE,
    _column('Qty'),
  ],
  [DataCubeQueryAggregateOperator.ALL, PRIMITIVE_TYPE.BOOLEAN, []],
  [DataCubeQueryAggregateOperator.ANY, PRIMITIVE_TYPE.BOOLEAN, []],
];

describe(unitTest('Roundtrip query processing: aggregation coverage'), () => {
  const engine = new TEST__DataCubeEngine();

  test('every aggregation has a case without grammar', () => {
    expect(AGGREGATION_CASES.map(([operator]) => operator).sort()).toEqual(
      engine.aggregateOperations.map((operation) => operation.operator).sort(),
    );
  });

  test('every aggregation has a case with grammar', () => {
    const caseNames = cases
      .filter(([, , , , error]) => error === undefined)
      .map(([name]) => name);
    engine.aggregateOperations.forEach((operation) => {
      const [, type, parameterValues] = guaranteeNonNullable(
        AGGREGATION_CASES.find(([operator]) => operator === operation.operator),
      );
      const configuration = new DataCubeColumnConfiguration('Value', type);
      configuration.aggregateOperator = operation.operator;
      configuration.aggregationParameters = parameterValues;
      // NOTE: cases are named after the function used to reduce the values
      const reducer = guaranteeType(
        guaranteeType(
          guaranteeNonNullable(
            operation.buildAggregateColumnExpression(configuration),
          ).function2,
          V1_Lambda,
        ).body[0],
        V1_AppliedFunction,
      );
      const functionName = reducer.function.substring(
        reducer.function.lastIndexOf(':') + 1,
      );
      expect(caseNames).toContain(`Aggregation: ${functionName}()`);
    });
  });
});

describe(
  unitTest('Roundtrip query processing without grammar: aggregation'),
  () => {
    test.each(AGGREGATION_CASES)(
      'groupBy(): %s',
      async (operator, type, parameterValues) => {
        const configuration = await _roundtrip({
          sourceColumns: [
            DESK,
            _measure('Value', type, operator, parameterValues),
            QTY,
          ],
          groupBy: ['Desk'],
        });
        _expectAggregation(configuration, 'Value', operator, parameterValues);
        _expectAggregation(
          configuration,
          'Qty',
          DataCubeQueryAggregateOperator.SUM,
        );
      },
    );

    // NOTE: pivot() only aggregates measures, while non-numeric columns are processed
    // as dimensions, so only aggregations of numeric columns are covered here
    test.each(
      AGGREGATION_CASES.filter(([, type]) =>
        [PRIMITIVE_TYPE.INTEGER, PRIMITIVE_TYPE.FLOAT].includes(
          type as PRIMITIVE_TYPE,
        ),
      ),
    )('pivot() then groupBy(): %s', async (operator, type, parameterValues) => {
      const configuration = await _roundtrip({
        sourceColumns: [
          _dimension('Year'),
          DESK,
          _measure('Value', type, operator, parameterValues),
          QTY,
        ],
        groupBy: ['Desk'],
        pivot: {
          columns: ['Year'],
          castColumns: [
            _col(DESK),
            { name: '2025__|__Value', type },
            { name: '2025__|__Qty', type: PRIMITIVE_TYPE.INTEGER },
          ],
        },
      });
      _expectAggregation(configuration, 'Value', operator, parameterValues);
    });
  },
);

describe(
  unitTest('Roundtrip query processing without grammar: weighted average'),
  () => {
    test('sum and weighted average of the same column, using a leaf-level measure', async () => {
      const configuration = await _roundtrip({
        sourceColumns: [DESK, _measure('Price', PRIMITIVE_TYPE.FLOAT), QTY],
        leafExtendedColumns: [
          {
            ..._measure(
              'Price (wavg)',
              PRIMITIVE_TYPE.FLOAT,
              DataCubeQueryAggregateOperator.WEIGHTED_AVERAGE,
              _column('Qty'),
            ),
            from: 'Price',
          },
        ],
        groupBy: ['Desk'],
      });
      _expectAggregation(
        configuration,
        'Price',
        DataCubeQueryAggregateOperator.SUM,
      );
      _expectAggregation(
        configuration,
        'Price (wavg)',
        DataCubeQueryAggregateOperator.WEIGHTED_AVERAGE,
        _column('Qty'),
      );
    });

    test('weighted by a leaf-level extended column', async () => {
      const configuration = await _roundtrip({
        sourceColumns: [
          DESK,
          _measure(
            'Price',
            PRIMITIVE_TYPE.FLOAT,
            DataCubeQueryAggregateOperator.WEIGHTED_AVERAGE,
            _column('Abs Qty'),
          ),
          QTY,
        ],
        leafExtendedColumns: [
          { ..._measure('Abs Qty', PRIMITIVE_TYPE.INTEGER), from: 'Qty' },
        ],
        groupBy: ['Desk'],
      });
      _expectAggregation(
        configuration,
        'Price',
        DataCubeQueryAggregateOperator.WEIGHTED_AVERAGE,
        _column('Abs Qty'),
      );
    });

    test('grouped by a leaf-level dimension extended column', async () => {
      const configuration = await _roundtrip({
        sourceColumns: [
          _measure(
            'Price',
            PRIMITIVE_TYPE.FLOAT,
            DataCubeQueryAggregateOperator.WEIGHTED_AVERAGE,
            _column('Qty'),
          ),
          QTY,
        ],
        leafExtendedColumns: [{ ..._dimension('Size'), from: 'Qty' }],
        groupBy: ['Size'],
      });
      _expectAggregation(
        configuration,
        'Price',
        DataCubeQueryAggregateOperator.WEIGHTED_AVERAGE,
        _column('Qty'),
      );
    });

    test('following pivot(), weights are pivoted alongside the aggregated column', async () => {
      const configuration = await _roundtrip({
        sourceColumns: [
          _dimension('Year'),
          DESK,
          _measure(
            'Price',
            PRIMITIVE_TYPE.FLOAT,
            DataCubeQueryAggregateOperator.WEIGHTED_AVERAGE,
            _column('Qty'),
          ),
          QTY,
        ],
        groupBy: ['Desk'],
        pivot: {
          columns: ['Year'],
          castColumns: [
            _col(DESK),
            { name: '2025__|__Price', type: PRIMITIVE_TYPE.FLOAT },
            { name: '2025__|__Qty', type: PRIMITIVE_TYPE.INTEGER },
            { name: '2026__|__Price', type: PRIMITIVE_TYPE.FLOAT },
            { name: '2026__|__Qty', type: PRIMITIVE_TYPE.INTEGER },
          ],
        },
      });
      _expectAggregation(
        configuration,
        'Price',
        DataCubeQueryAggregateOperator.WEIGHTED_AVERAGE,
        _column('Qty'),
      );
    });
  },
);

describe(
  unitTest('Roundtrip query processing without grammar: number of decimals'),
  () => {
    test('integer columns aggregated into fractional values show decimals', async () => {
      const configuration = await _roundtrip({
        sourceColumns: [
          DESK,
          _measure(
            'Value',
            PRIMITIVE_TYPE.INTEGER,
            DataCubeQueryAggregateOperator.MEDIAN,
          ),
          QTY,
        ],
        groupBy: ['Desk'],
      });
      expect(_findColumnConfiguration(configuration, 'Value').decimals).toBe(2);
      expect(_findColumnConfiguration(configuration, 'Qty').decimals).toBe(0);
    });
  },
);
