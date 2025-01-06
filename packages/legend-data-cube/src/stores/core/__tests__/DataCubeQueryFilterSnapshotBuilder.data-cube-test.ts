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
  ENGINE_TEST_SUPPORT__JSONToGrammar_model,
} from '@finos/legend-graph/test';
import { assertErrorThrown } from '@finos/legend-shared';
import { unitTest } from '@finos/legend-shared/test';
import { describe, expect, test } from '@jest/globals';
import { validateAndBuildQuerySnapshot } from '../DataCubeQuerySnapshotBuilder.js';
import {
  _filter,
  _function,
  _lambda,
  _var,
} from '../DataCubeQueryBuilderUtils.js';
import { DataCubeFunction } from '../DataCubeQueryEngine.js';
import { Test__DataCubeEngine } from './Test__DataCubeEngine.js';
import { DataCubeQuery } from '../model/DataCubeQuery.js';
import { INTERNAL__DataCubeSource } from '../model/DataCubeSource.js';

type FilterSnapshotAnalysisTestCase = [
  string, // name
  string, // query roundtrip
];

const cases: FilterSnapshotAnalysisTestCase[] = [
  ['simple filter 1', 'filter(x|$x.Age != 27)'],
  ['simple filter 2', 'filter(x|!($x.Age >= 27))'],
  ['simple filter 3', 'filter(x|$x.Athlete->isEmpty())'],
  ['simple filter 4', 'filter(x|$x.Age != $x.Age2)'],
  [
    'simple case insensitive filter',
    "filter(x|$x.Athlete->toLower()->endsWith(toLower('Phelps')))",
  ],
  [
    'composite or filter',
    "filter(x|!(($x.Age != 27) || ($x.Athlete->toLower() != toLower('Michael Phelps'))))",
  ],
  [
    'composite and filter',
    "filter(x|!(($x.Age != 27) && ($x.Athlete == 'Michael Phelps')))",
  ],
  [
    'composite and/or filter',
    "filter(x|$x.Athlete->toLower()->endsWith(toLower('Phelps')) || !(($x.Age != 27) && ($x.Athlete == 'Michael Phelps')))",
  ],
  [
    'composite not and/or filter',
    "filter(x|!$x.Athlete->toLower()->endsWith(toLower('Phelps')) || !(($x.Age != 27) && ($x.Athlete == 'Michael Phelps')))",
  ],
  [
    'composite and/or/or/not filter',
    "filter(x|!(($x.Age != 27) && ($x.Athlete == 'Michael Phelps')) && ($x.Country->startsWith('united') || ($x.Country == 'test')))",
  ],
];

describe(unitTest('Analyze and build filter snapshot'), () => {
  test.each(cases)(
    '%s',
    async (
      testName: FilterSnapshotAnalysisTestCase[0],
      lambda: FilterSnapshotAnalysisTestCase[1],
    ) => {
      const partialQuery = V1_deserializeValueSpecification(
        await ENGINE_TEST_SUPPORT__grammarToJSON_valueSpecification(lambda),
        [],
      );
      const baseQuery = new DataCubeQuery();
      const source = new INTERNAL__DataCubeSource();

      try {
        const snapshot = validateAndBuildQuerySnapshot(
          partialQuery,
          source,
          baseQuery,
          new Test__DataCubeEngine().filterOperations,
        );
        const query = _function(DataCubeFunction.FILTER, [
          _lambda(
            [_var()],
            [
              _filter(
                snapshot.data.filter!,
                new Test__DataCubeEngine().filterOperations,
              ),
            ],
          ),
        ]);
        const queryString = await ENGINE_TEST_SUPPORT__JSONToGrammar_model(
          V1_serializeValueSpecification(query, []),
        );
        expect(lambda).toEqual(queryString);
      } catch (error: unknown) {
        // console.log(error);
        assertErrorThrown(error);
      }
    },
  );
});
