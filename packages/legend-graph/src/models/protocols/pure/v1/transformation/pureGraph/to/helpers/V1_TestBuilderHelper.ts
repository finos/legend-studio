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

import { guaranteeType, UnsupportedOperationError } from '@finos/legend-shared';
import { ExternalFormatData } from '../../../../../../../metamodels/pure/data/EmbeddedData';
import { EqualTo } from '../../../../../../../metamodels/pure/test/assertion/EqualTo';
import { EqualToJson } from '../../../../../../../metamodels/pure/test/assertion/EqualToJson';
import {
  EqualToTDS,
  RelationalTDS,
} from '../../../../../../../metamodels/pure/test/assertion/EqualToTDS';
import type { TestAssertion } from '../../../../../../../metamodels/pure/test/assertion/TestAssertion';
import type {
  AtomicTest,
  TestSuite,
} from '../../../../../../../metamodels/pure/test/Test';
import { V1_ServiceTest } from '../../../../model/packageableElements/service/V1_ServiceTest';
import { V1_ServiceTestSuite } from '../../../../model/packageableElements/service/V1_ServiceTestSuite';
import { V1_EqualTo } from '../../../../model/test/assertion/V1_EqualTo';
import { V1_EqualToJson } from '../../../../model/test/assertion/V1_EqualToJson';
import { V1_EqualToTDS } from '../../../../model/test/assertion/V1_EqualToTDS';
import type { V1_TestAssertion } from '../../../../model/test/assertion/V1_TestAssertion';
import type { V1_AtomicTest } from '../../../../model/test/V1_AtomicTest';
import type { V1_TestSuite } from '../../../../model/test/V1_TestSuite';
import type { V1_GraphBuilderContext } from '../V1_GraphBuilderContext';
import { V1_ProtocolToMetaModelEmbeddedDataBuilder } from './V1_DataElementBuilderHelper';
import {
  V1_buildServiceTest,
  V1_buildServiceTestSuite,
} from './V1_ServiceBuilderHelper';

const buildEqualTo = (
  element: V1_EqualTo,
  parentTest: AtomicTest | undefined,
): EqualTo => {
  const equalTo = new EqualTo();
  equalTo.id = element.id;
  equalTo.parentTest = parentTest;
  equalTo.expected = element.expected;
  return equalTo;
};

const buildEqualToJson = (
  element: V1_EqualToJson,
  parentTest: AtomicTest | undefined,
  context: V1_GraphBuilderContext,
): EqualToJson => {
  const equalToJson = new EqualToJson();
  equalToJson.id = element.id;
  equalToJson.parentTest = parentTest;
  equalToJson.expected = guaranteeType(
    element.expected.accept_EmbeddedDataVisitor(
      new V1_ProtocolToMetaModelEmbeddedDataBuilder(context),
    ),
    ExternalFormatData,
  );
  return equalToJson;
};

const buildEqualToTDS = (
  element: V1_EqualToTDS,
  parentTest: AtomicTest | undefined,
  context: V1_GraphBuilderContext,
): EqualToTDS => {
  const equalToTDS = new EqualToTDS();
  equalToTDS.id = element.id;
  equalToTDS.parentTest = parentTest;
  const expected = new RelationalTDS();
  expected.columns = element.expected.columns;
  expected.rows = element.expected.rows;
  equalToTDS.expected = expected;
  return equalToTDS;
};

export const V1_buildAtomicTest = (
  value: V1_AtomicTest,
  parentSuite: TestSuite | undefined,
  context: V1_GraphBuilderContext,
): AtomicTest => {
  if (value instanceof V1_ServiceTest) {
    return V1_buildServiceTest(value, parentSuite, context);
  }
  throw new UnsupportedOperationError(`Can't build atomic test`, value);
};

export const V1_buildTestAssertion = (
  value: V1_TestAssertion,
  parentTest: AtomicTest | undefined,
  context: V1_GraphBuilderContext,
): TestAssertion => {
  if (value instanceof V1_EqualTo) {
    return buildEqualTo(value, parentTest);
  } else if (value instanceof V1_EqualToJson) {
    return buildEqualToJson(value, parentTest, context);
  } else if (value instanceof V1_EqualToTDS) {
    return buildEqualToTDS(value, parentTest, context);
  }
  throw new UnsupportedOperationError(`Can't build test assertion`, value);
};

export const V1_buildTestSuite = (
  value: V1_TestSuite,
  context: V1_GraphBuilderContext,
): TestSuite => {
  if (value instanceof V1_ServiceTestSuite) {
    return V1_buildServiceTestSuite(value, context);
  }
  throw new UnsupportedOperationError(`Can't build test suite`, value);
};
