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
import { DataCubeQuery } from '../model/DataCubeQuery.js';
import { INTERNAL__DataCubeSource } from '../model/DataCubeSource.js';
import { _deserializeValueSpecification } from '../DataCubeQueryBuilderUtils.js';
import {
  _testCase,
  type DataCubeQuerySnapshotBuilderTestCase,
} from './DatacubeQuerySnapshotBuilderTestUtils.js';
import { DataCubeConfiguration } from '../model/DataCubeConfiguration.js';
import { Test__DataCubeEngine } from './Test__DataCubeEngine.js';

const cases: DataCubeQuerySnapshotBuilderTestCase[] = [
  _testCase({
    name: 'Valid: extend()',
    query: 'extend(~[a:x|1])',
    columns: [],
  }),
  _testCase({
    name: 'Valid: filter()',
    query: 'filter(x|$x.a==1)',
    columns: [],
  }),
  _testCase({
    name: 'Valid: groupBy()',
    query:
      'groupBy(~[a], ~[b:x|$x.b:x|$x->sum()])->sort([ascending(~a), ascending(~b)])',
    columns: ['a:String', 'b:Integer'],
  }),
  _testCase({
    name: 'Valid: select()->groupBy()',
    query:
      'select(~[a,b])->groupBy(~[a], ~[b:x|$x.b:x|$x->sum()])->sort([ascending(~a), ascending(~b)])',
    columns: ['a:String', 'b:Integer'],
  }),
  _testCase({
    name: 'Valid: select()',
    query: 'select(~[a])',
    columns: ['a:Integer'],
  }),
  _testCase({
    name: 'Valid: sort()',
    query: 'sort([~a->ascending()])',
    columns: ['a:Integer'],
  }),
  _testCase({
    name: 'Valid: limit()',
    query: 'limit(10)',
    columns: [],
  }),
  _testCase({
    name: 'Valid: Usage - Filter: extend()->filter()->sort()->limit()',
    query:
      'extend(~[a:x|1])->filter(x|$x.a==1)->sort([ascending(~a)])->limit(10)',
    columns: ['a:Integer'],
  }),
  _testCase({
    name: 'Valid: Usage - Column Selection: extend()->filter()->select()->sort()->limit()',
    query:
      'extend(~[a:x|1])->filter(x|$x.a==1)->select(~[a])->sort([ascending(~a)])->limit(10)',
    columns: ['a:Integer'],
  }),
  _testCase({
    name: 'Invalid: Not a chain of function call',
    query: '2',
    columns: [],
    error: 'Query must be a sequence of function calls (e.g. x()->y()->z())',
  }),
  _testCase({
    name: 'Invalid: Unsupported function',
    query: 'sort([~asd->ascending()])->something()',
    columns: [],
    error: 'Found unsupported function something()',
  }),
  _testCase({
    name: 'Invalid: Unsupported function composition: select()->filter()',
    query: 'select(~a)->filter(x|$x.a==1)',
    columns: ['a:Integer'],
    error:
      'Unsupported function composition select()->filter() (supported composition: extend()->filter()->select()->[sort()->pivot()->cast()]->[groupBy()->sort()]->extend()->sort()->limit())',
  }),
  _testCase({
    name: 'Unsupported function composition pivot()',
    query: 'pivot(~a, ~b:x|$x.a:x|$x->sum())',
    columns: [],
    error:
      'Unsupported function composition pivot() (supported composition: extend()->filter()->select()->[sort()->pivot()->cast()]->[groupBy()->sort()]->extend()->sort()->limit())',
  }),
  _testCase({
    name: 'Valid: Usage - Extended Columns: extend()->groupBy()->extend()->sort()->limit()',
    query:
      'extend(~[a:x|1])->groupBy(~[a], ~[b:x|$x.b:x|$x->sum()])->sort([ascending(~a)])->extend(~b:x|2)->limit(10)',
    columns: ['a:String', 'b:Integer'],
  }),
  _testCase({
    name: 'Valid: Usage - Filter: extend()->filter()->groupBy()->extend()->sort()->limit()',
    query:
      'extend(~[a:x|1])->filter(x|$x.a==1)->groupBy(~a, ~b:x|$x.a:x|$x->sum())->sort([ascending(~a)])->extend(~c:x|2)->limit(10)',
    columns: ['a:String', 'b:Integer'],
  }),
  _testCase({
    name: 'Valid: Usage - Filter: extend()->filter()->groupBy()->sort()->limit()',
    query:
      'extend(~[a:x|1])->filter(x|$x.a==1)->groupBy(~[a], ~[b:x|$x.a:x|$x->sum()])->sort([ascending(~a)])->limit(10)',
    columns: ['a:Integer'],
  }),
  _testCase({
    name: 'Invalid: Casting used without dynamic function pivot()',
    query: 'cast(@meta::pure::metamodel::relation::Relation<(a:Integer)>)',
    columns: [],
    error:
      'Unsupported function composition cast() (supported composition: extend()->filter()->select()->[sort()->pivot()->cast()]->[groupBy()->sort()]->extend()->sort()->limit())',
  }),
  /** TODO: @datacube roundtrip - enable when we support relation casting syntax */
  // _testCase({
  //   name: 'Valid: Usage - Pivot: pivot()->cast()->sort()->limit()',
  //   query:
  //     'pivot(~a, ~b:x|$x.a:x|$x->sum())->cast(@meta::pure::metamodel::relation::Relation<(a:Integer)>)->sort([ascending(~a)])->limit(10)',
  //   columns: ['a:Integer'],
  // }),
  // _testCase({
  //   name: 'Valid: pivot()',
  //   query:
  //     'pivot(~a, ~b:x|$x.a:x|$x->sum())->cast(@meta::pure::metamodel::relation::Relation<(a:Integer)>)',
  //   columns: [],
  // }),
];

describe(unitTest('Analyze and build base snapshot'), () => {
  test.each(cases)(
    '%s',
    async (
      testName: DataCubeQuerySnapshotBuilderTestCase[0],
      code: DataCubeQuerySnapshotBuilderTestCase[1],
      columns: DataCubeQuerySnapshotBuilderTestCase[2],
      configuration: DataCubeQuerySnapshotBuilderTestCase[3],
      error: DataCubeQuerySnapshotBuilderTestCase[4],
    ) => {
      const partialQuery = _deserializeValueSpecification(
        await ENGINE_TEST_SUPPORT__grammarToJSON_valueSpecification(code),
      );
      const baseQuery = new DataCubeQuery();
      baseQuery.configuration = configuration
        ? DataCubeConfiguration.serialization.fromJson(configuration)
        : undefined;
      const source = new INTERNAL__DataCubeSource();
      source.columns = columns;
      try {
        validateAndBuildQuerySnapshot(
          partialQuery,
          source,
          baseQuery,
          new Test__DataCubeEngine().filterOperations,
        );
        expect(error).toBeUndefined();
      } catch (err) {
        assertErrorThrown(err);
        expect(err.message).toEqual(error);
      }
    },
  );
});
