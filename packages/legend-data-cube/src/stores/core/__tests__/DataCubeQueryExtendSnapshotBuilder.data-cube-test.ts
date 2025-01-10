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
  ENGINE_TEST_SUPPORT__JsonToGrammar_valueSpecification,
} from '@finos/legend-graph/test';
import { unitTest } from '@finos/legend-shared/test';
import { describe, expect, test } from '@jest/globals';
import { validateAndBuildQuerySnapshot } from '../DataCubeQuerySnapshotBuilder.js';
import {
  _cols,
  _colSpec,
  _deserializeLambda,
  _function,
} from '../DataCubeQueryBuilderUtils.js';
import { DataCubeFunction } from '../DataCubeQueryEngine.js';
import { Test__DataCubeEngine } from './Test__DataCubeEngine.js';
import { DataCubeQuery } from '../model/DataCubeQuery.js';
import { INTERNAL__DataCubeSource } from '../model/DataCubeSource.js';
import type { DataCubeOperationSnapshotBuilderTestCase } from './DatacubeQuerySnapshotBuilderTestUtils.js';

const cases: DataCubeOperationSnapshotBuilderTestCase[] = [
  ['simple extend', '~[name:c|$c.val->toOne() + 1]->extend()'],
  [
    'extend with colSpecArray',
    "~[name:c|$c.val->toOne() + 1]->extend(~[other:x|$x.str->toOne() + '_ext']->extend(~[other2:x|$x.str->toOne() + '_1']->extend()))",
  ],
  // TODO: add support for window functions and increase validation
  // [
  //   'extend with window',
  //   'extend(over(~grp), ~newCol:{p,w,r|$r.id}:y|$y->plus())',
  // ],
];

describe(unitTest('Analyze and build filter snapshot'), () => {
  test.each(cases)(
    '%s',
    async (
      testName: DataCubeOperationSnapshotBuilderTestCase[0],
      lambda: DataCubeOperationSnapshotBuilderTestCase[1],
    ) => {
      const engine = new Test__DataCubeEngine();
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
          engine.filterOperations,
        );
        if (snapshot.data.leafExtendedColumns.length) {
          const leafExtendedFuncs = snapshot.data.leafExtendedColumns.map(
            (col) =>
              _function(DataCubeFunction.EXTEND, [
                _cols([_colSpec(col.name, _deserializeLambda(col.mapFn))]),
              ]),
          );
          while (leafExtendedFuncs.length > 1) {
            const last = leafExtendedFuncs.pop(); // Remove the last element
            if (last) {
              // Add its parameters to the second last element
              const secondLast = leafExtendedFuncs.pop();
              secondLast!.parameters.push(last);
              leafExtendedFuncs.push(secondLast!);
            }
          }
          const queryString =
            await ENGINE_TEST_SUPPORT__JsonToGrammar_valueSpecification(
              V1_serializeValueSpecification(leafExtendedFuncs[0]!, []),
            );
          expect(lambda).toEqual(queryString);
        }
      } catch (error: unknown) {
        // console.log(error);
        throw error;
      }
    },
  );
});
