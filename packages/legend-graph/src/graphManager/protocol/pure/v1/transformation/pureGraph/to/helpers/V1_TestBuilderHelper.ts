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
import { ExternalFormatData } from '../../../../../../../../graph/metamodel/pure/data/EmbeddedData.js';
import { EqualTo } from '../../../../../../../../graph/metamodel/pure/test/assertion/EqualTo.js';
import { EqualToJson } from '../../../../../../../../graph/metamodel/pure/test/assertion/EqualToJson.js';
import { EqualToTDS } from '../../../../../../../../graph/metamodel/pure/test/assertion/EqualToTDS.js';
import type { TestAssertion } from '../../../../../../../../graph/metamodel/pure/test/assertion/TestAssertion.js';
import type {
  AtomicTest,
  TestSuite,
} from '../../../../../../../../graph/metamodel/pure/test/Test.js';
import type { Testable } from '../../../../../../../../graph/metamodel/pure/test/Testable.js';
import { V1_MappingTestSuite } from '../../../../model/packageableElements/mapping/V1_MappingTestSuite.js';
import { V1_ServiceTestSuite } from '../../../../model/packageableElements/service/V1_ServiceTestSuite.js';
import { V1_EqualTo } from '../../../../model/test/assertion/V1_EqualTo.js';
import { V1_EqualToJson } from '../../../../model/test/assertion/V1_EqualToJson.js';
import { V1_EqualToTDS } from '../../../../model/test/assertion/V1_EqualToTDS.js';
import type { V1_TestAssertion } from '../../../../model/test/assertion/V1_TestAssertion.js';
import type { V1_TestSuite } from '../../../../model/test/V1_TestSuite.js';
import type { V1_GraphBuilderContext } from '../V1_GraphBuilderContext.js';
import { V1_buildEmbeddedData } from './V1_DataElementBuilderHelper.js';
import { V1_buildMappingTestSuite } from './V1_MappingBuilderHelper.js';
import { V1_buildServiceTestSuite } from './V1_ServiceBuilderHelper.js';
import type { V1_AtomicTest } from '../../../../model/test/V1_AtomicTest.js';
import type { Testable_PureProtocolProcessorPlugin_Extension } from '../../../../../extensions/Testable_PureProtocolProcessorPlugin_Extension.js';

const V1_buildEqualTo = (
  element: V1_EqualTo,
  parentTest: AtomicTest | undefined,
): EqualTo => {
  const equalTo = new EqualTo();
  equalTo.id = element.id;
  equalTo.parentTest = parentTest;
  equalTo.expected = element.expected;
  return equalTo;
};

export const V1_buildEqualToJson = (
  element: V1_EqualToJson,
  parentTest: AtomicTest | undefined,
  context: V1_GraphBuilderContext,
): EqualToJson => {
  const equalToJson = new EqualToJson();
  equalToJson.id = element.id;
  equalToJson.parentTest = parentTest;
  equalToJson.expected = guaranteeType(
    V1_buildEmbeddedData(element.expected, context),
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
  equalToTDS.expected = guaranteeType(
    V1_buildEmbeddedData(element.expected, context),
    ExternalFormatData,
  );
  return equalToTDS;
};

export const V1_buildTestAssertion = (
  value: V1_TestAssertion,
  parentTest: AtomicTest | undefined,
  context: V1_GraphBuilderContext,
): TestAssertion => {
  if (value instanceof V1_EqualTo) {
    return V1_buildEqualTo(value, parentTest);
  } else if (value instanceof V1_EqualToJson) {
    return V1_buildEqualToJson(value, parentTest, context);
  } else if (value instanceof V1_EqualToTDS) {
    return buildEqualToTDS(value, parentTest, context);
  }
  throw new UnsupportedOperationError(`Can't build test assertion`, value);
};

export const V1_buildAtomicTest = (
  value: V1_AtomicTest,
  context: V1_GraphBuilderContext,
): AtomicTest => {
  const extraAtomicTestBuilder = context.extensions.plugins.flatMap(
    (plugin) =>
      (
        plugin as Testable_PureProtocolProcessorPlugin_Extension
      ).V1_getExtraAtomicTestBuilders?.() ?? [],
  );
  for (const builder of extraAtomicTestBuilder) {
    const metamodel = builder(value, context);
    if (metamodel) {
      return metamodel;
    }
  }
  throw new UnsupportedOperationError(
    `Can't build AtomicTest: no compatible builder available from plugins`,
    value,
  );
};

export const V1_buildTestSuite = (
  parent: Testable,
  value: V1_TestSuite,
  context: V1_GraphBuilderContext,
): TestSuite => {
  let suite: TestSuite | undefined;
  if (value instanceof V1_ServiceTestSuite) {
    suite = V1_buildServiceTestSuite(value, context);
  } else if (value instanceof V1_MappingTestSuite) {
    suite = V1_buildMappingTestSuite(value, context);
  }
  if (suite) {
    suite.__parent = parent;
    return suite;
  }
  throw new UnsupportedOperationError(`Can't build test suite`, value);
};
