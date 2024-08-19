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

import { jest, test, expect, afterEach } from '@jest/globals';
import TEST_DATA__simpleGraphEntities from './TEST_DATA__FunctionSignatureGeneration.json' with { type: 'json' };
import { unitTest } from '@finos/legend-shared/test';
import type { Entity } from '@finos/legend-storage';
import {
  generateFunctionCallString,
  generateFunctionPrettyName,
} from '../PureLanguageHelper.js';
import { TEST__getTestGraph } from '../../__test-utils__/GraphTestUtils.js';

afterEach(() => {
  // running all pending timers and switching to real timers using Jest
  // See https://testing-library.com/docs/using-fake-timers/
  jest.runOnlyPendingTimers();
  // NOTE: since `jest.useFakeTimers()` is global, it can leak across tests, we need to reset after every test
  jest.useRealTimers();
});

test(unitTest('Generate default parameter value for type'), async () => {
  const graph = await TEST__getTestGraph(
    TEST_DATA__simpleGraphEntities as Entity[],
  );
  // NOTE: this could leak
  jest.useFakeTimers();
  jest.setSystemTime(new Date(2020, 10, 1));
  const setFunction = graph.getFunction(
    'model::functions::set_String_1__IncType_1__Date_1__DateTime_1__String_1_',
  );
  expect(generateFunctionCallString(setFunction)).toBe(
    "model::functions::set('', model::IncType.Corp, %2020-11-01, %2020-11-01T00:00:00)",
  );
  expect(
    generateFunctionPrettyName(setFunction, { fullPath: true, spacing: true }),
  ).toBe(
    'model::functions::set(name: String[1], type: IncType[1], date: Date[1], dateTime: DateTime[1]): String[1]',
  );
});
