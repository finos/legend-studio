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

import { UnsupportedOperationError } from '@finos/legend-shared';
import type { V1_GraphBuilderContext } from '../V1_GraphBuilderContext.js';
import { AvailabilityTestSuite } from '../../../../../../../../graph/metamodel/pure/packageableElements/availability/AvailabilityTestSuite.js';
import { AvailabilityBarrierTest } from '../../../../../../../../graph/metamodel/pure/packageableElements/availability/AvailabilityBarrierTest.js';
import type { Availability } from '../../../../../../../../graph/metamodel/pure/packageableElements/availability/Availability.js';
import { RelationElementsData } from '../../../../../../../../graph/metamodel/pure/data/EmbeddedData.js';
import type { V1_AvailabilityTestSuite } from '../../../../model/packageableElements/availability/V1_AvailabilityTestSuite.js';
import { V1_AvailabilityBarrierTest } from '../../../../model/packageableElements/availability/V1_AvailabilityBarrierTest.js';
import { V1_buildEmbeddedData } from './V1_DataElementBuilderHelper.js';
import { V1_buildTestAssertion } from './V1_TestBuilderHelper.js';

const V1_buildAvailabilityBarrierTest = (
  element: V1_AvailabilityBarrierTest,
  parentSuite: AvailabilityTestSuite,
  context: V1_GraphBuilderContext,
): AvailabilityBarrierTest => {
  const test = new AvailabilityBarrierTest();
  test.id = element.id;
  test.doc = element.doc;
  test.__parent = parentSuite;
  test.watermarkSerializationFormat = element.watermarkSerializationFormat;
  test.assertions = element.assertions.map((assertion) =>
    V1_buildTestAssertion(assertion, test, context),
  );
  return test;
};

export const V1_buildAvailabilityTestSuite = (
  element: V1_AvailabilityTestSuite,
  parentAvailability: Availability,
  context: V1_GraphBuilderContext,
): AvailabilityTestSuite => {
  const suite = new AvailabilityTestSuite();
  suite.id = element.id;
  suite.doc = element.doc;
  suite.__parent = parentAvailability;
  if (element.testData) {
    const testData = V1_buildEmbeddedData(element.testData, context);
    if (!(testData instanceof RelationElementsData)) {
      throw new UnsupportedOperationError(
        'Unable to build availability test suite: test data must be relation data',
        element.testData,
      );
    }
    suite.testData = testData;
  }
  suite.tests = element.tests.map((test) => {
    if (test instanceof V1_AvailabilityBarrierTest) {
      return V1_buildAvailabilityBarrierTest(test, suite, context);
    }
    throw new UnsupportedOperationError(
      'Unable to build availability test: Unsupported availability test type',
      test,
    );
  });
  return suite;
};
