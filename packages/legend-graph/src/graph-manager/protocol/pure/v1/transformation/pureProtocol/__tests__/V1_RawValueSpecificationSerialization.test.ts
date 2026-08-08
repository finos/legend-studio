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

import { test, expect, describe } from '@jest/globals';
import { guaranteeType, type PlainObject } from '@finos/legend-shared';
import { unitTest } from '@finos/legend-shared/test';
import {
  V1_deserializeRawValueSpecification,
  V1_serializeRawValueSpecification,
} from '../serializationHelpers/V1_RawValueSpecificationSerializationHelper.js';
import {
  TEST__buildGraphWithEntities,
  TEST__getTestGraphManagerState,
} from '../../../../../../__test-utils__/GraphManagerTestUtils.js';
import { RawPrimitiveInstanceValue } from '../../../../../../../graph/metamodel/pure/rawValueSpecification/RawPrimitiveInstanceValue.js';
import { observe_RawPrimitiveInstanceValue } from '../../../../../../action/changeDetection/RawValueSpecificationObserver.js';

type TestCase = [string, PlainObject, PlainObject];

const cases: TestCase[] = [
  [
    'Multi-line raw CString',
    {
      _type: 'string',
      multiLine: true,
      value: 'line one\nline two',
    },
    {
      _type: 'string',
      multiLine: true,
      value: 'line one\nline two',
    },
  ],
  [
    // engine omits this flag from the wire when it is `false`, we must do the same
    'Single-line raw CString does not emit the multi-line flag',
    {
      _type: 'string',
      multiLine: false,
      value: 'hallo',
    },
    {
      _type: 'string',
      value: 'hallo',
    },
  ],
  [
    'Legacy format of multi-line raw CString',
    {
      _type: 'string',
      multiLine: true,
      values: ['line one\nline two'],
    },
    {
      _type: 'string',
      multiLine: true,
      value: 'line one\nline two',
    },
  ],
];

describe(unitTest('Raw value specification serialization'), () => {
  test.each(cases)(
    '%s',
    (testName: TestCase[0], before: TestCase[1], after: TestCase[2]) => {
      expect(
        V1_serializeRawValueSpecification(
          V1_deserializeRawValueSpecification(before),
        ),
      ).toEqual(after);
      // do an additional roundtrip
      expect(
        V1_serializeRawValueSpecification(
          V1_deserializeRawValueSpecification(after),
        ),
      ).toEqual(after);
    },
  );

  test('Multi-line flag survives the metamodel roundtrip', async () => {
    const graphManagerState = TEST__getTestGraphManagerState();
    await TEST__buildGraphWithEntities(graphManagerState, []);
    const json = {
      _type: 'string',
      multiLine: true,
      value: 'line one\nline two',
    };

    const metamodel = guaranteeType(
      graphManagerState.graphManager.buildRawValueSpecification(
        json,
        graphManagerState.graph,
      ),
      RawPrimitiveInstanceValue,
    );
    expect(metamodel.value).toBe('line one\nline two');
    expect(metamodel.multiLine).toBe(true);

    expect(
      graphManagerState.graphManager.serializeRawValueSpecification(metamodel),
    ).toEqual(json);

    // the flag must be observable, else change detection would not pick up a toggle
    observe_RawPrimitiveInstanceValue(metamodel);
    metamodel.multiLine = false;
    expect(
      graphManagerState.graphManager.serializeRawValueSpecification(metamodel),
    ).toEqual({ _type: 'string', value: 'line one\nline two' });
  });
});
