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
  V1_deserializeValueSpecification,
  V1_serializeValueSpecification,
} from '@finos/legend-graph';
import {
  ENGINE_TEST_SUPPORT__grammarToJSON_valueSpecification,
  ENGINE_TEST_SUPPORT__valueSpecificationCode,
} from '@finos/legend-graph/test';
import { assertErrorThrown } from '@finos/legend-shared';
import { unitTest } from '@finos/legend-shared/test';
import { describe, expect, it, test } from '@jest/globals';
import { validateAndBuildQuerySnapshot } from '../DataCubeQuerySnapshotBuilder.js';
import { DataCubeQuery } from '../models/DataCubeQuery.js';
import { INTERNAL__DataCubeSource } from '../models/DataCubeSource.js';
import {
  _filter,
  _function,
  _functionCompositionProcessor,
  _lambda,
  _var,
} from '../DataCubeQueryBuilderUtils.js';
import { DataCubeFunction } from '../DataCubeQueryEngine.js';
import { DataCubeQueryFilterOperation__Contain } from '../filter/DataCubeQueryFilterOperation__Contain.js';
import { DataCubeQueryFilterOperation__ContainCaseInsensitive } from '../filter/DataCubeQueryFilterOperation__ContainCaseInsensitive.js';
import { DataCubeQueryFilterOperation__EndWith } from '../filter/DataCubeQueryFilterOperation__EndWith.js';
import { DataCubeQueryFilterOperation__EndWithCaseInsensitive } from '../filter/DataCubeQueryFilterOperation__EndWithCaseInsensitive.js';
import { DataCubeQueryFilterOperation__Equal } from '../filter/DataCubeQueryFilterOperation__Equal.js';
import { DataCubeQueryFilterOperation__EqualCaseInsensitive } from '../filter/DataCubeQueryFilterOperation__EqualCaseInsensitive.js';
import { DataCubeQueryFilterOperation__EqualCaseInsensitiveColumn } from '../filter/DataCubeQueryFilterOperation__EqualCaseInsensitiveColumn.js';
import { DataCubeQueryFilterOperation__EqualColumn } from '../filter/DataCubeQueryFilterOperation__EqualColumn.js';
import { DataCubeQueryFilterOperation__GreaterThan } from '../filter/DataCubeQueryFilterOperation__GreaterThan.js';
import { DataCubeQueryFilterOperation__GreaterThanColumn } from '../filter/DataCubeQueryFilterOperation__GreaterThanColumn.js';
import { DataCubeQueryFilterOperation__GreaterThanOrEqual } from '../filter/DataCubeQueryFilterOperation__GreaterThanOrEqual.js';
import { DataCubeQueryFilterOperation__GreaterThanOrEqualColumn } from '../filter/DataCubeQueryFilterOperation__GreaterThanOrEqualColumn.js';
import { DataCubeQueryFilterOperation__IsNotNull } from '../filter/DataCubeQueryFilterOperation__IsNotNull.js';
import { DataCubeQueryFilterOperation__IsNull } from '../filter/DataCubeQueryFilterOperation__IsNull.js';
import { DataCubeQueryFilterOperation__LessThan } from '../filter/DataCubeQueryFilterOperation__LessThan.js';
import { DataCubeQueryFilterOperation__LessThanColumn } from '../filter/DataCubeQueryFilterOperation__LessThanColumn.js';
import { DataCubeQueryFilterOperation__LessThanOrEqual } from '../filter/DataCubeQueryFilterOperation__LessThanOrEqual.js';
import { DataCubeQueryFilterOperation__LessThanOrEqualColumn } from '../filter/DataCubeQueryFilterOperation__LessThanOrEqualColumn.js';
import { DataCubeQueryFilterOperation__NotContain } from '../filter/DataCubeQueryFilterOperation__NotContain.js';
import { DataCubeQueryFilterOperation__NotEndWith } from '../filter/DataCubeQueryFilterOperation__NotEndWith.js';
import { DataCubeQueryFilterOperation__NotEqual } from '../filter/DataCubeQueryFilterOperation__NotEqual.js';
import { DataCubeQueryFilterOperation__NotEqualCaseInsensitive } from '../filter/DataCubeQueryFilterOperation__NotEqualCaseInsensitive.js';
import { DataCubeQueryFilterOperation__NotEqualCaseInsensitiveColumn } from '../filter/DataCubeQueryFilterOperation__NotEqualCaseInsensitiveColumn.js';
import { DataCubeQueryFilterOperation__NotEqualColumn } from '../filter/DataCubeQueryFilterOperation__NotEqualColumn.js';
import { DataCubeQueryFilterOperation__NotStartWith } from '../filter/DataCubeQueryFilterOperation__NotStartWith.js';
import { DataCubeQueryFilterOperation__StartWith } from '../filter/DataCubeQueryFilterOperation__StartWith.js';
import { DataCubeQueryFilterOperation__StartWithCaseInsensitive } from '../filter/DataCubeQueryFilterOperation__StartWithCaseInsensitive.js';

type FilterSnapshotAnalysisTestCase = [
  string, // name
  string, // partial query
  string, // expected result
];

const cases: FilterSnapshotAnalysisTestCase[] = [
  ['simple filter 1', 'filter(x| $x.Age != 27)', 'filter(x|$x.Age != 27)'],
  [
    'simple filter 2',
    'filter(x| !($x.Age != 27))',
    'filter(x|!($x.Age != 27))',
  ],
  [
    'simple filter 3',
    'filter(x| $x.Athlete->isEmpty())',
    'filter(x|$x.Athlete->isEmpty())',
  ],
  [
    'simple not filter',
    'filter(x| !($x.Age > 27))',
    'filter(x|!($x.Age > 27))',
  ],
  [
    'simple case insensitive filter',
    "filter(x| $x.Athlete->toLower()->endsWith(toLower('Phelps')))",
    "filter(x|$x.Athlete->toLower()->endsWith(toLower('Phelps')))",
  ],
  [
    'composite or filter',
    "filter(x|!($x.Age != 27 || $x.Athlete == 'Michael Phelps'))",
    "filter(x|!(($x.Age != 27) || ($x.Athlete == 'Michael Phelps')))",
  ],
  [
    'composite and filter',
    "filter(x|!($x.Age != 27 && $x.Athlete == 'Michael Phelps'))",
    "filter(x|!(($x.Age != 27) && ($x.Athlete == 'Michael Phelps')))",
  ],
  [
    'composite and/or filter',
    "filter(x|$x.Athlete->toLower()->endsWith(toLower('Phelps')) || !($x.Age != 27 && $x.Athlete == 'Michael Phelps'))",
    "filter(x|$x.Athlete->toLower()->endsWith(toLower('Phelps')) || !(($x.Age != 27) && ($x.Athlete == 'Michael Phelps')))",
  ],
  [
    'composite not and/or filter',
    "filter(x|!$x.Athlete->toLower()->endsWith(toLower('Phelps')) || !($x.Age != 27 && $x.Athlete == 'Michael Phelps'))",
    "filter(x|!$x.Athlete->toLower()->endsWith(toLower('Phelps')) || !(($x.Age != 27) && ($x.Athlete == 'Michael Phelps')))",
  ],
  // ['composite and/or/or/not filter', 'filter(x|!($x.Age != 27 && $x.Athlete == \'Michael Phelps\') && (($x.Country->startsWith(\'united\') || $x.Country->toLower()->equal(toLower(\'united kingdom\')))))', 'filter(x|!(($x.Age != 27) && ($x.Athlete == \'Michael Phelps\')))'],
];

describe(unitTest('Analyze and build filter snapshot'), () => {
  test.each(cases)(
    '%s',
    async (
      testName: FilterSnapshotAnalysisTestCase[0],
      code: FilterSnapshotAnalysisTestCase[1],
      expectedResult: FilterSnapshotAnalysisTestCase[2],
    ) => {
      const partialQuery = V1_deserializeValueSpecification(
        await ENGINE_TEST_SUPPORT__grammarToJSON_valueSpecification(code),
        [],
      );
      const baseQuery = new DataCubeQuery(undefined);
      const source = new INTERNAL__DataCubeSource();
      try {
        let snapshot = validateAndBuildQuerySnapshot(
          partialQuery,
          source,
          baseQuery,
        );
        // console.dir(snapshot.data.filter, {depth: 7});
        const query = _function(DataCubeFunction.FILTER, [
          _lambda([_var()], [_filter(snapshot.data.filter!, filterOperations)]),
        ]);
        const queryString = await ENGINE_TEST_SUPPORT__valueSpecificationCode(
          V1_serializeValueSpecification(query, []),
        );
        expect(expectedResult).toEqual(queryString);
      } catch (error: unknown) {
        console.log(error);
        assertErrorThrown(error);
      }
    },
  );
});

const filterOperations = [
  new DataCubeQueryFilterOperation__LessThan(),
  new DataCubeQueryFilterOperation__LessThanOrEqual(),
  new DataCubeQueryFilterOperation__Equal(),
  new DataCubeQueryFilterOperation__NotEqual(),
  new DataCubeQueryFilterOperation__GreaterThanOrEqual(),
  new DataCubeQueryFilterOperation__GreaterThan(),

  new DataCubeQueryFilterOperation__IsNull(),
  new DataCubeQueryFilterOperation__IsNotNull(),

  new DataCubeQueryFilterOperation__EqualCaseInsensitive(),
  new DataCubeQueryFilterOperation__NotEqualCaseInsensitive(),
  new DataCubeQueryFilterOperation__Contain(),
  new DataCubeQueryFilterOperation__ContainCaseInsensitive(),
  new DataCubeQueryFilterOperation__NotContain(),
  new DataCubeQueryFilterOperation__StartWith(),
  new DataCubeQueryFilterOperation__StartWithCaseInsensitive(),
  new DataCubeQueryFilterOperation__NotStartWith(),
  new DataCubeQueryFilterOperation__EndWith(),
  new DataCubeQueryFilterOperation__EndWithCaseInsensitive(),
  new DataCubeQueryFilterOperation__NotEndWith(),

  new DataCubeQueryFilterOperation__LessThanColumn(),
  new DataCubeQueryFilterOperation__LessThanOrEqualColumn(),
  new DataCubeQueryFilterOperation__EqualColumn(),
  new DataCubeQueryFilterOperation__NotEqualColumn(),
  new DataCubeQueryFilterOperation__EqualCaseInsensitiveColumn(),
  new DataCubeQueryFilterOperation__NotEqualCaseInsensitiveColumn(),
  new DataCubeQueryFilterOperation__GreaterThanColumn(),
  new DataCubeQueryFilterOperation__GreaterThanOrEqualColumn(),
];
