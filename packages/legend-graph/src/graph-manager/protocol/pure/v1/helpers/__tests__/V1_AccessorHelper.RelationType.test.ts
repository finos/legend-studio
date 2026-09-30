/**
 * Copyright (c) 2026-present, Goldman Sachs
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

import { beforeAll, describe, expect, test } from '@jest/globals';
import { deserialize } from 'serializr';
import { guaranteeNonNullable } from '@finos/legend-shared';
import { unitTest } from '@finos/legend-shared/test';
import { V1_buildRelationTypeFromV1RelationType } from '../V1_AccessorHelper.js';
import { V1_relationTypeModelSchema } from '../../transformation/pureProtocol/serializationHelpers/V1_TypeSerializationHelper.js';
import {
  TEST__buildGraphWithEntities,
  TEST__getTestGraphManagerState,
} from '../../../../../__test-utils__/GraphManagerTestUtils.js';

const graphManagerState = TEST__getTestGraphManagerState();

beforeAll(async () => {
  await TEST__buildGraphWithEntities(graphManagerState, []);
});

describe(unitTest('V1_buildRelationTypeFromV1RelationType'), () => {
  test('column tagged values carry the multi-line flag', () => {
    const v1RelationType = deserialize(V1_relationTypeModelSchema, {
      _type: 'relationType',
      columns: [
        {
          name: 'id',
          genericType: {
            rawType: { _type: 'packageableType', fullPath: 'Integer' },
            typeArguments: [],
            typeVariableValues: [],
          },
          multiplicity: { lowerBound: 1, upperBound: 1 },
          taggedValues: [
            {
              tag: { profile: 'meta::pure::profiles::doc', value: 'doc' },
              value: {
                _type: 'string',
                multiLine: true,
                value: 'line one\nline two',
              },
            },
            {
              tag: { profile: 'meta::pure::profiles::doc', value: 'todo' },
              value: 'single line',
            },
          ],
        },
      ],
    });

    const relationType = V1_buildRelationTypeFromV1RelationType(
      v1RelationType,
      graphManagerState.graph,
    );

    const taggedValues = guaranteeNonNullable(
      relationType.columns[0],
    ).taggedValues;
    expect(
      taggedValues.map((taggedValue) => ({
        tag: taggedValue.tag.value.value,
        value: taggedValue.value,
        multiLine: taggedValue.multiLine,
      })),
    ).toEqual([
      { tag: 'doc', value: 'line one\nline two', multiLine: true },
      { tag: 'todo', value: 'single line', multiLine: false },
    ]);
  });
});
