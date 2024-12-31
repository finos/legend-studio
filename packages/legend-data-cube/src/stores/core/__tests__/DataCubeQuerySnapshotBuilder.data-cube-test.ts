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
import { assertErrorThrown } from '@finos/legend-shared';
import { DataCubeQuery } from '../models/DataCubeQuery.js';
import { INTERNAL__DataCubeSource } from '../models/DataCubeSource.js';
import { _deserializeValueSpecification } from '../DataCubeQueryBuilderUtils.js';

type BaseSnapshotAnalysisTestCase = [
  string, // name
  string, // partial query
  string[], // original columns
  string | undefined, // problem
];

const cases: BaseSnapshotAnalysisTestCase[] = [
  ['Valid: extend()', 'extend(~[a:x|1])', [], ''],
  ['Valid: filter()', 'filter(x|$x.a==1)', [], ''],
  [
    'Valid: groupBy()',
    'groupBy(~[a], ~[b:x|$x.b:x|$x->sum()])->sort([ascending(~a), ascending(~b)])',
    ['a:String', 'b:Integer'],
    '',
  ],
  ['Valid: select()', 'select(~[a])', ['a:Integer'], ''],
  /** TODO: @datacube roundtrip - enable when we support relation casting syntax */
  // [
  //   'Valid: pivot()',
  //   'pivot(~a, ~b:x|$x.a:x|$x->sum())->cast(@meta::pure::metamodel::relation::Relation<(a:Integer)>)',
  //   [],
  //   '',
  // ],
  ['Valid: sort()', 'sort([~a->ascending()])', ['a:Integer'], ''],
  ['Valid: limit()', 'limit(10)', [], ''],
  [
    'Valid: Usage - Filter: extend()->filter()->sort()->limit()',
    'extend(~[a:x|1])->filter(x|$x.a==1)->sort([ascending(~a)])->limit(10)',
    ['a:Integer'],
    '',
  ],
  [
    'Valid: Usage - Column Selection: extend()->filter()->select()->sort()->limit()',
    'extend(~[a:x|1])->filter(x|$x.a==1)->select(~[a])->sort([ascending(~a)])->limit(10)',
    ['a:Integer'],
    '',
  ],
  /** TODO: @datacube roundtrip - enable when we support extended columns */
  // [
  //   'Valid: Usage - Extended Columns: extend()->groupBy()->extend()->sort()->limit()',
  //   'extend(~[a:x|1])->groupBy(~[a], ~[b:x|$x.b:x|$x->sum()])->extend(~b:x|2)->sort([ascending(~a)])->limit(10)',
  //   ['a:String', 'b:Integer'],
  //   '',
  // ],
  // [
  //   'Valid: Usage - V-Pivot: groupBy()->extend()->sort()->limit()',
  //   'extend(~[a:x|1])->filter(x|$x.a==1)->groupBy(~[a], ~[b:x|$x.b:x|$x->sum()])->extend(~b:x|2)->sort([ascending(~a)])->limit(10)',
  //   ['a:String', 'b:Integer'],
  //   '',
  // ],
  /** TODO: @datacube roundtrip - enable when we support relation casting syntax */
  // [
  //   'Valid: Usage - H-Pivot: pivot()->cast()->sort()->limit()',
  //   'pivot(~a, ~b:x|$x.a:x|$x->sum())->cast(@meta::pure::metamodel::relation::Relation<(a:Integer)>)->sort([ascending(~a)])->limit(10)',
  //   ['a:Integer'],
  //   '',
  // ],
  // [
  //   'Valid: Full form: extend()->filter()->groupBy()->select()->pivot()->cast()->extend()->sort()->limit()',
  //   'extend(~[a:x|1])->filter(x|$x.a==1)->groupBy(~a, ~b:x|$x.a:x|$x->sum())->select(~a)->pivot(~a, ~b:x|$x.a:x|$x->sum())->cast(@meta::pure::metamodel::relation::Relation<(a:Integer)>)->extend(~b:x|2)->sort([ascending(~a)])->limit(10)',
  //   ['a:Integer'],
  //   '',
  // ],
  [
    'Invalid: Not a chain of function call',
    '2',
    [],
    'Query must be a sequence of function calls (e.g. x()->y()->z())',
  ],
  [
    'Invalid: Unsupported function',
    'sort([~asd->ascending()])->something()',
    [],
    'Found unsupported function something()',
  ],
  [
    'Invalid: Unsupported function composition: select()->filter()',
    'select(~a)->filter(x|$x.a==1)',
    ['a:Integer'],
    'Unsupported function composition select()->filter() (supported composition: extend()->filter()->select()->[sort()->pivot()->cast()]->[groupBy()->sort()]->extend()->sort()->limit())',
  ],
  [
    'Unsupported function composition pivot()',
    'pivot(~a, ~b:x|$x.a:x|$x->sum())',
    [],
    'Unsupported function composition pivot() (supported composition: extend()->filter()->select()->[sort()->pivot()->cast()]->[groupBy()->sort()]->extend()->sort()->limit())',
  ],
  /** TODO: @datacube roundtrip - enable when we support extended columns */
  // See https://github.com/finos/legend-engine/pull/2873
  // [
  //   'Invalid: Casting used without dynamic function pivot()',
  //   'cast(@meta::pure::metamodel::relation::Relation<(a:Integer)>)',
  //   [],
  //   'Found usage of dynamic function pivot() without casting',
  // ],
];

describe(unitTest('Analyze and build base snapshot'), () => {
  test.each(cases)(
    '%s',
    async (
      testName: BaseSnapshotAnalysisTestCase[0],
      code: BaseSnapshotAnalysisTestCase[1],
      columns: BaseSnapshotAnalysisTestCase[2],
      problem: BaseSnapshotAnalysisTestCase[3],
    ) => {
      const partialQuery = _deserializeValueSpecification(
        await ENGINE_TEST_SUPPORT__grammarToJSON_valueSpecification(code),
      );
      const baseQuery = new DataCubeQuery();
      const source = new INTERNAL__DataCubeSource();
      source.columns = columns.map((entry) => {
        const parts = entry.split(':');
        return {
          name: parts[0] as string,
          type: parts[1] as string,
        };
      });
      try {
        validateAndBuildQuerySnapshot(partialQuery, source, baseQuery);
        expect('').toEqual(problem);
      } catch (error) {
        assertErrorThrown(error);
        expect(error.message).toEqual(problem);
      }
    },
  );
});
