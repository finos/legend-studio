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

import {
  V1_Lambda,
  V1_deserializeValueSpecification,
} from '@finos/legend-graph';
import { ENGINE_TEST_SUPPORT__grammarToJSON_valueSpecification } from '@finos/legend-graph/test';
import { unitTest } from '@finos/legend-shared/test';
import { describe, expect, test } from '@jest/globals';
import { validateAndBuildQuerySnapshot } from '../DataCubeQuerySnapshotBuilder.js';
import { assertErrorThrown } from '@finos/legend-shared';
import {
  DataCubeQuery,
  DataCubeQuerySourceREPLExecutedQuery,
} from '../../../../server/DataCubeQuery.js';

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
    'groupBy(~[a], ~[b:x|$x.b:x|$x->sum()])',
    ['a:String', 'b:Integer'],
    '',
  ],
  ['Valid: select()', 'select(~[a])', ['a:Integer'], ''],
  // TODO: @akphi - enable when engine supports relation casting syntax
  // See https://github.com/finos/legend-engine/pull/2873
  // [
  //   'Valid: pivot()',
  //   'pivot(~a, ~b:x|$x.a:x|$x->sum())->cast(@meta::pure::metamodel::relation::Relation<(a:Integer)>)',
  //   [],
  //   '',
  // ],
  ['Valid: sort()', 'sort([~a->ascending()])', ['a:Integer'], ''],
  ['Valid: limit()', 'limit(10)', [], ''],
  [
    'Valid: Usage - Filter: filter()->extend()->sort()->limit()',
    'filter(x|$x.a==1)->extend(~[a:x|1])->sort([ascending(~a)])->limit(10)',
    ['a:Integer'],
    '',
  ],
  [
    'Valid: Usage - Column Selection: filter()->extend()->select()->sort()->limit()',
    'filter(x|$x.a==1)->extend(~[a:x|1])->select(~[a])->sort([ascending(~a)])->limit(10)',
    ['a:Integer'],
    '',
  ],
  // TODO: @akphi - enable when we support extended columns
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
  // TODO: @akphi - enable when engine supports relation casting syntax
  // See https://github.com/finos/legend-engine/pull/2873
  // [
  //   'Valid: Usage - H-Pivot: pivot()->cast()->sort()->limit()',
  //   'pivot(~a, ~b:x|$x.a:x|$x->sum())->cast(@meta::pure::metamodel::relation::Relation<(a:Integer)>)->sort([ascending(~a)])->limit(10)',
  //   ['a:Integer'],
  //   '',
  // ],
  // TODO: @akphi - enable when engine supports relation casting syntax
  // See https://github.com/finos/legend-engine/pull/2873
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
    'Invalid: Unsupported function composition: filter()->extend()->filter()',
    'filter(x|$x.a==1)->extend(~[a:x|1])->filter(x|$x.a==1)',
    [],
    'Unsupported function composition filter()->extend()->filter() (supported composition: filter()->extend()->select()->groupBy()->pivot()->cast()->extend()->sort()->limit())',
  ],
  [
    'Invalid: Group-level extend() used when no aggregation/grouping presents',
    'filter(x|$x.a==1)->extend(~[a:x|1])->extend(~[b:x|1])',
    [],
    'Found invalid usage of group-level extend() for query without aggregation such as pivot() and groupBy()',
  ],
  [
    'Invalid: Dynamic function pivot() not chained with casting',
    'pivot(~a, ~b:x|$x.a:x|$x->sum())',
    [],
    'Found usage of dynamic function pivot() without casting',
  ],
  // TODO: @akphi - enable when engine supports relation casting syntax
  // See https://github.com/finos/legend-engine/pull/2873
  // [
  //   'Invalid: Casting used without dynamic function pivot()',
  //   'cast(@meta::pure::metamodel::relation::Relation<(a:Integer)>)',
  //   [],
  //   'Found usage of dynamic function pivot() without casting',
  // ],

  // TODO: @akphi - add more tests for each function processors
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
      const partialQuery = V1_deserializeValueSpecification(
        await ENGINE_TEST_SUPPORT__grammarToJSON_valueSpecification(code),
        [],
      );
      const baseQuery = new DataCubeQuery('', '', undefined);
      baseQuery.source = new DataCubeQuerySourceREPLExecutedQuery();
      baseQuery.partialQuery = code;
      baseQuery.source.query = '';
      baseQuery.source.runtime = 'local::TestRuntime';
      baseQuery.source.columns = columns.map((entry) => {
        const parts = entry.split(':');
        return {
          name: parts[0] as string,
          type: parts[1] as string,
        };
      });
      try {
        validateAndBuildQuerySnapshot(partialQuery, new V1_Lambda(), baseQuery);
        expect('').toEqual(problem);
      } catch (error: unknown) {
        assertErrorThrown(error);
        expect(error.message).toEqual(problem);
      }
    },
  );
});
