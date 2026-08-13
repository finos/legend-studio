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

import type { Availability } from '../../../../../../../graph/metamodel/pure/packageableElements/availability/Availability.js';
import type { AvailabilityTestSuite } from '../../../../../../../graph/metamodel/pure/packageableElements/availability/AvailabilityTestSuite.js';
import type { AvailabilityBarrierTest } from '../../../../../../../graph/metamodel/pure/packageableElements/availability/AvailabilityBarrierTest.js';
import type { RelationElement } from '../../../../../../../graph/metamodel/pure/data/EmbeddedData.js';
import { V1_Availability } from '../../../model/packageableElements/availability/V1_Availability.js';
import { V1_AvailabilityTestSuite } from '../../../model/packageableElements/availability/V1_AvailabilityTestSuite.js';
import { V1_AvailabilityBarrierTest } from '../../../model/packageableElements/availability/V1_AvailabilityBarrierTest.js';
import {
  V1_RelationElement,
  V1_RelationRowTestData,
} from '../../../model/data/V1_EmbeddedData.js';
import { V1_initPackageableElement } from './V1_CoreTransformerHelper.js';
import { V1_transformTestAssertion } from './V1_TestTransformer.js';
import type { V1_GraphTransformerContext } from './V1_GraphTransformerContext.js';

const V1_transformAvailabilityTestData = (
  element: RelationElement,
): V1_RelationElement => {
  const relationElement = new V1_RelationElement();
  relationElement.columns = element.columns;
  relationElement.paths = element.paths;
  relationElement.rows = element.rows.map((row) => {
    const r = new V1_RelationRowTestData();
    r.values = row.values;
    return r;
  });
  return relationElement;
};

const V1_transformAvailabilityBarrierTest = (
  element: AvailabilityBarrierTest,
): V1_AvailabilityBarrierTest => {
  const test = new V1_AvailabilityBarrierTest();
  test.id = element.id;
  test.doc = element.doc;
  test.watermarkSerializationFormat = element.watermarkSerializationFormat;
  test.assertions = element.assertions.map(V1_transformTestAssertion);
  return test;
};

const V1_transformAvailabilityTestSuite = (
  element: AvailabilityTestSuite,
): V1_AvailabilityTestSuite => {
  const suite = new V1_AvailabilityTestSuite();
  suite.id = element.id;
  suite.doc = element.doc;
  suite.tests = element.tests.map((test) =>
    V1_transformAvailabilityBarrierTest(test as AvailabilityBarrierTest),
  );
  if (element.testData) {
    suite.testData = V1_transformAvailabilityTestData(element.testData);
  }
  return suite;
};

export const V1_transformAvailability = (
  element: Availability,
  _context: V1_GraphTransformerContext,
): V1_Availability => {
  const availability = new V1_Availability();
  V1_initPackageableElement(availability, element);
  // like `V1_IngestDefinition`, preserve the engine's raw JSON payload on
  // `.content` so that fields we don't model in the studio are roundtripped
  // unchanged.
  availability.content = element.content;
  availability.testSuites = element.tests.map(
    V1_transformAvailabilityTestSuite,
  );
  return availability;
};
