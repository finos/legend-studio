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

import TEST_DATA__simpleGraphEntities from './TEST_DATA__FunctionSignatureGeneration.json';
import { unitTest } from '@finos/legend-shared';
import { flowResult } from 'mobx';
import type { Entity } from '@finos/legend-model-storage';
import {
  TEST__buildGraphWithEntities,
  TEST__getTestGraphManagerState,
} from '../../GraphManagerTestUtils';
import {
  generateFunctionCallString,
  generateFunctionSignature,
} from '../../helpers/PureLanguageHelper';

afterEach(() => {
  // running all pending timers and switching to real timers using Jest
  // See https://testing-library.com/docs/using-fake-timers/
  jest.runOnlyPendingTimers();
  // NOTE: since `jest.useFakeTimers()` is global, it can leak across tests, we need to reset after every test
  jest.useRealTimers();
});

test(unitTest('Generate default parameter value for type'), async () => {
  const graphManagerState = TEST__getTestGraphManagerState();
  await flowResult(
    TEST__buildGraphWithEntities(
      graphManagerState,
      TEST_DATA__simpleGraphEntities as Entity[],
    ),
  );
  // NOTE: this will leak
  jest.useFakeTimers();
  jest.setSystemTime(new Date(2020, 10, 1));
  const setFunction = graphManagerState.graph.getFunction(
    'model::functions::set',
  );
  expect(generateFunctionCallString(setFunction)).toBe(
    "model::functions::set('', model::IncType.Corp, %2020-11-01, %2020-11-01T00:00:00)",
  );
  expect(generateFunctionSignature(setFunction, true)).toBe(
    'model::functions::set(name: String[1], type: IncType[1], date: Date[1], dateTime: DateTime[1]): String[1]',
  );
});
