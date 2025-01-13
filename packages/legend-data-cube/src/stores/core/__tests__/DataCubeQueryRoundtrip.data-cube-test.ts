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

import { ENGINE_TEST_SUPPORT__grammarToJSON_valueSpecification } from '@finos/legend-graph/test';
import { unitTest } from '@finos/legend-shared/test';
import { describe, expect, test } from '@jest/globals';
import { validateAndBuildQuerySnapshot } from '../DataCubeQuerySnapshotBuilder.js';
import { assertErrorThrown, type PlainObject } from '@finos/legend-shared';
import { DataCubeQuery } from '../model/DataCubeQuery.js';
import { INTERNAL__DataCubeSource } from '../model/DataCubeSource.js';
import { _deserializeValueSpecification } from '../DataCubeQueryBuilderUtils.js';
import { DataCubeConfiguration } from '../model/DataCubeConfiguration.js';
import { TEST__DataCubeEngine } from './DataCubeTestUtils.js';
import type { DataCubeQuerySnapshot } from '../DataCubeQuerySnapshot.js';

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

const FOCUSED_TESTS: string[] = [
  // tests added here will be the only tests run
];

const cases: TestCase[] = [
  // Leaf-level Extend
  _case(`Leaf-level Extend: with simple expression`, {
    query: `extend(~[a:x|1])`,
  }),
  _case(`Leaf-level Extend: with complex expression`, {
    query: `extend(~[name:c|$c.val->toOne() + 1])`,
  }),
  _case(`Leaf-level Extend: multiple columns`, {
    query:
      "extend(~[name:c|$c.val->toOne() + 1])->extend(~[other:x|$x.str->toOne() + '_ext'])->extend(~[other2:x|$x.str->toOne() + '_1'])",
  }),
  _case(`Leaf-level Extend: ERROR - name clash with source columns`, {
    query: `extend(~[name:c|$c.val->toOne() + 1])`,
    columns: ['name:Integer'],
    error: `Can't process leaf-level extended column 'name': another column with the same name is already registered`,
  }),
  _case(
    `Leaf-level Extend: ERROR - name clash among leaf-level extended columns`,
    {
      query: `extend(~[name:c|$c.val->toOne() + 1])->extend(~[name:c|$c.val->toOne() + 1])`,
      columns: ['name:Integer'],
      error: `Can't process leaf-level extended column 'name': another column with the same name is already registered`,
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
    error: `Can't process extend() expression: Expected a transformation function expression`,
  }),

  // Filter
  _case(`Filter: contains()`, {
    query: `filter(x|$x.Name->contains('asd'))`,
  }),
  _case(`Filter: contains() with NOT`, {
    query: `filter(x|!$x.Name->contains('asd'))`,
  }),
  _case(`Filter: contains() (case-insensitive)`, {
    query: `filter(x|$x.Name->toLower()->contains(toLower('Asd')))`,
  }),
  _case(`Filter: contains() (case-insensitive) with NOT`, {
    query: `filter(x|!$x.Name->toLower()->contains(toLower('Asd')))`,
  }),
  _case(`Filter: endsWith()`, {
    query: `filter(x|$x.Name->endsWith('asd'))`,
  }),
  _case(`Filter: endsWith() with NOT`, {
    query: `filter(x|!$x.Name->endsWith('asd'))`,
  }),
  _case(`Filter: endsWith() (case-insensitive)`, {
    query: `filter(x|$x.Name->toLower()->endsWith(toLower('Asd')))`,
  }),
  _case(`Filter: endsWith() (case-insensitive) with NOT`, {
    query: `filter(x|!$x.Name->toLower()->endsWith(toLower('Asd')))`,
  }),
  _case(`Filter: ==`, {
    query: `filter(x|$x.Age == 27)`,
  }),
  _case(`Filter: == case insensitive`, {
    query: `filter(x|$x.Age == 27)`,
  }),
  _case(`Filter: !=`, {
    query: `filter(x|$x.Age != 27)`,
  }),
  _case(`Filter: is null`, {
    query: `filter(x|$x.Athlete->isEmpty())`,
  }),
  _case(`Filter: != column`, {
    query: `filter(x|$x.Age != $x.Age2)`,
  }),
  _case(`Filter: endsWith() case insensitive`, {
    query: `filter(x|$x.Athlete->toLower()->endsWith(toLower('Phelps')))`,
  }),
  _case(`Filter: NOT`, {
    query: `filter(x|!($x.Age >= 27))`,
  }),
  _case(`Filter: NOT with !=`, {
    query: `filter(x|!($x.Age != 27))`,
  }),
  _case(`Filter: OR group`, {
    query: `filter(x|($x.Age != 27) || ($x.Athlete->toLower() != toLower('Michael Phelps')))`,
  }),
  _case(`Filter: OR group with NOT`, {
    query: `filter(x|!(($x.Age != 27) || ($x.Athlete->toLower() != toLower('Michael Phelps'))))`,
  }),
  _case(`Filter: AND group`, {
    query: `filter(x|($x.Age != 27) && ($x.Athlete == 'Michael Phelps'))`,
  }),
  _case(`Filter: AND group with NOT`, {
    query: `filter(x|!(($x.Age != 27) && ($x.Athlete == 'Michael Phelps')))`,
  }),
  _case(`Filter: simple grouping`, {
    query: `filter(x|$x.Athlete->toLower()->endsWith(toLower('Phelps')) || !(($x.Age != 27) && ($x.Athlete == 'Michael Phelps')))`,
  }),
  _case(`Filter: complex grouping`, {
    query:
      "filter(x|!(($x.Age != 27) && ($x.Athlete == 'Michael Phelps')) && ($x.Country->startsWith('united') || ($x.Country == 'test')))",
  }),
  _case(`Filter: with leaf-level extended column`, {
    query: `extend(~[name:c|$c.val->toOne() + 1])->filter(x|$x.name != 27)`,
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
  // _case(`Filter: ERROR - simple`, {
  //   query: `filter(x|$x.Age.contains(27))`,
  // }),

  // Select
  _case(`Select: BASIC`, {
    query: `select(~[a])`,
    columns: ['a:Integer'],
  }),
  _case(`Select: BASIC`, {
    query: `select(~[a])`,
    columns: ['a:Integer'],
  }),

  // Pivot
  // _case(`Validation: Bad composition pivot()`, {
  //   query: `pivot(~a, ~b:x|$x.a:x|$x->sum())`,
  //   error: `Unsupported function composition pivot() (supported composition: extend()->filter()->select()->[sort()->pivot()->cast()]->[groupBy()->sort()]->extend()->sort()->limit())`,
  // }),
  _case(`Pivot: ERROR - casting used without dynamic function pivot()`, {
    query: `cast(@meta::pure::metamodel::relation::Relation<(a:Integer)>)`,
    error: `Can't process expression: Unsupported function composition cast() (supported composition: extend()->filter()->select()->[sort()->pivot()->cast()]->[groupBy()->sort()]->extend()->sort()->limit())`,
  }),

  // Group By
  _case(`GroupBy: BASIC`, {
    query: `select(~[a, b])->groupBy(~[a], ~[b:x|$x.b:x|$x->sum()])->sort([~a->ascending()])`,
    columns: ['a:String', 'b:Integer'],
  }),

  // Group-Level Extend

  // Sort
  _case(`Sort: BASIC`, {
    query: `sort([~a->ascending()])`,
    columns: ['a:Integer'],
  }),
  _case(`Sort: multiple columns`, {
    query: `sort([~a->ascending(), ~b->descending()])`,
    columns: ['a:Integer', 'b:Integer'],
  }),
  _case(`Sort: ERROR - bad argument: non-collection provided`, {
    query: `sort(~a->something())`,
    columns: ['a:Integer'],
    error: `Can't process sort() expression: Found unexpected type for parameter at index 0`,
  }),
  _case(`Sort: ERROR - unsupported function`, {
    query: `sort([~a->something()])`,
    columns: ['a:Integer'],
    error: `Can't process function: Expected function to be one of [ascending, descending]`,
  }),

  // Limit
  _case(`Limit: BASIC`, {
    query: `limit(10)`,
  }),
  _case(`Limit: ERROR - bad argument: non-integer provided`, {
    query: `limit('asd')`,
    error: `Can't process limit() expression: Expected parameter at index 0 to be an integer instance value`,
  }),

  // Sequence
  // _case(`Sequence: extend()->filter()->sort()->limit()`, {
  //   query: `extend(~[a:x|1])->filter(x|$x.a==1)->sort([ascending(~a)])->limit(10)`,
  //   columns: ['b:Integer'],
  // }),
  // _case(`Sequence: extend()->filter()->select()->sort()->limit()`, {
  //   query: `extend(~[a:x|1])->filter(x|$x.a==1)->select(~[a])->sort([ascending(~a)])->limit(10)`,
  //   columns: ['b:Integer'],
  // }),
  // _case(`Sequence: extend()->groupBy()->extend()->sort()->limit()`, {
  //   query: `extend(~[a:x|1])->groupBy(~[a], ~[b:x|$x.b:x|$x->sum()])->sort([ascending(~a)])->extend(~[b:x|2])->limit(10)`,
  // }),
  // _case(`Sequence: extend()->filter()->groupBy()->extend()->sort()->limit()`, {
  //   query: `extend(~[a:x|1])->filter(x|$x.a==1)->groupBy(~[a], ~b:x|$x.b:x|$x->sum())->sort([ascending(~a)])->extend(~[c:x|2])->limit(10)`,
  //   columns: ['b:Integer'],
  // }),
  // _case(`Sequence: extend()->filter()->groupBy()->sort()->limit()`, {
  //   query: `extend(~[a:x|1])->filter(x|$x.a==1)->groupBy(~[a], ~[b:x|$x.b:x|$x->sum()])->sort([ascending(~a)])->limit(10)`,
  //   columns: ['b:Integer'],
  // }),

  // Validation
  _case(`Validation: ERROR - not a function expression`, {
    query: `2`,
    error: `Can't process expression: Expected a function expression`,
  }),
  _case(`Validation: ERROR - not a chain of function calls`, {
    query: `select(~[a, b], 'something')`,
    columns: ['a:Integer', 'b:Integer'],
    error: `Can't process expression: Expected a sequence of function calls (e.g. x()->y()->z())`,
  }),
  _case(`Validation: ERROR - unsupported function`, {
    query: `sort([~asd->ascending()])->something()`,
    error: `Can't process expression: Found unsupported function something()`,
  }),
  _case(`Validation: ERROR - wrong number of paramters provided`, {
    query: `select(~[a, b], 2, 'asd')`,
    columns: ['a:Integer', 'b:Integer'],
    error: `Can't process select() expression: Expected at most 2 parameters provided, got 3`,
  }),
  _case(`Validation: ERROR - bad composition: select()->filter()`, {
    query: `select(~a)->filter(x|$x.a==1)`,
    columns: ['a:Integer'],
    error: `Can't process expression: Unsupported function composition select()->filter() (supported composition: extend()->filter()->select()->[sort()->pivot()->cast()]->[groupBy()->sort()]->extend()->sort()->limit())`,
  }),
  _case(`Validation: ERROR - name clash among source columns`, {
    query: `select(~[a, b])`,
    columns: ['a:Integer', 'a:Integer', 'b:Integer'],
    error: `Can't process source column 'a': another column with the same name is already registered`,
  }),
  /** TODO: @datacube roundtrip - enable when we support relation casting syntax */
  // _case(`Valid: Usage - Pivot: pivot()->cast()->sort()->limit()`, {
  //   query: `pivot(~a, ~b:x|$x.a:x|$x->sum())->cast(@meta::pure::metamodel::relation::Relation<(a:Integer)>)->sort([ascending(~a)])->limit(10)`,
  //   columns: ['a:Integer'],
  // }),
  // _case(`Valid: pivot()`, {
  //   query: `pivot(~a, ~b:x|$x.a:x|$x->sum())->cast(@meta::pure::metamodel::relation::Relation<(a:Integer)>)`,
  // }),
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
      const partialQuery = _deserializeValueSpecification(
        await ENGINE_TEST_SUPPORT__grammarToJSON_valueSpecification(code),
      );
      const baseQuery = new DataCubeQuery();
      baseQuery.configuration = configuration
        ? DataCubeConfiguration.serialization.fromJson(configuration)
        : undefined;
      const source = new INTERNAL__DataCubeSource();
      source.columns = columns;

      let snapshot: DataCubeQuerySnapshot | undefined;

      try {
        snapshot = validateAndBuildQuerySnapshot(
          partialQuery,
          source,
          baseQuery,
          engine.filterOperations,
          engine.aggregateOperations,
        );

        validator?.(snapshot);
      } catch (err) {
        assertErrorThrown(err);
        expect(err.message).toEqual(error);
      }

      if (snapshot) {
        expect(error).toBeUndefined();
        expect(await engine.getPartialQueryCode(snapshot)).toEqual(code);
      }
    },
  );
});
