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

import { UnsupportedOperationError } from '@finos/legend-shared';
import { V1_EqualTo } from '../../../model/test/assertion/V1_EqualTo.js';
import { V1_EqualToJson } from '../../../model/test/assertion/V1_EqualToJson.js';
import { EqualTo } from '../../../../../../metamodels/pure/test/assertion/EqualTo.js';
import { EqualToJson } from '../../../../../../metamodels/pure/test/assertion/EqualToJson.js';
import { V1_transformExternalFormatData } from './V1_DataElementTransformer.js';
import type { V1_AtomicTest } from '../../../model/test/V1_AtomicTest.js';
import { ServiceTest } from '../../../../../../metamodels/pure/packageableElements/service/ServiceTest.js';
import type { V1_TestAssertion } from '../../../model/test/assertion/V1_TestAssertion.js';
import type { TestAssertion } from '../../../../../../metamodels/pure/test/assertion/TestAssertion.js';
import type { V1_TestSuite } from '../../../model/test/V1_TestSuite.js';
import {
  V1_transformServiceTest,
  V1_transformServiceTestSuite,
} from './V1_ServiceTransformer.js';
import { ServiceTestSuite } from '../../../../../../metamodels/pure/packageableElements/service/ServiceTestSuite.js';
import type { V1_GraphTransformerContext } from './V1_GraphTransformerContext.js';
import type {
  AtomicTest,
  TestSuite,
} from '../../../../../../metamodels/pure/test/Test.js';
import { EqualToTDS } from '../../../../../../metamodels/pure/test/assertion/EqualToTDS.js';
import { V1_EqualToTDS } from '../../../model/test/assertion/V1_EqualToTDS.js';

const transformEqualTo = (element: EqualTo): V1_EqualTo => {
  const equalTo = new V1_EqualTo();
  equalTo.id = element.id;
  equalTo.expected = element.expected;
  return equalTo;
};

const transformEqualToJson = (element: EqualToJson): V1_EqualToJson => {
  const equalToJson = new V1_EqualToJson();
  equalToJson.id = element.id;
  equalToJson.expected = V1_transformExternalFormatData(element.expected);
  return equalToJson;
};

const transformEqualToTDS = (element: EqualToTDS): V1_EqualToTDS => {
  const equalToTDS = new V1_EqualToTDS();
  equalToTDS.id = element.id;
  equalToTDS.expected = V1_transformExternalFormatData(element.expected);
  return equalToTDS;
};

export const V1_transformAtomicTest = (value: AtomicTest): V1_AtomicTest => {
  if (value instanceof ServiceTest) {
    return V1_transformServiceTest(value);
  }
  throw new UnsupportedOperationError(`Can't transform atomic test`, value);
};

export const V1_transformTestAssertion = (
  value: TestAssertion,
): V1_TestAssertion => {
  if (value instanceof EqualTo) {
    return transformEqualTo(value);
  } else if (value instanceof EqualToJson) {
    return transformEqualToJson(value);
  } else if (value instanceof EqualToTDS) {
    return transformEqualToTDS(value);
  }
  throw new UnsupportedOperationError(`Can't transform test assertion`, value);
};

export const V1_transformTestSuite = (
  value: TestSuite,
  context: V1_GraphTransformerContext,
): V1_TestSuite => {
  if (value instanceof ServiceTestSuite) {
    return V1_transformServiceTestSuite(value, context);
  }
  throw new UnsupportedOperationError(`Can't transform test suite`, value);
};
