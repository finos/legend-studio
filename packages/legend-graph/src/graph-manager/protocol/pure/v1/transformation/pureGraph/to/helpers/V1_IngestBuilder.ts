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
import {
  IngestMatViewTest,
  IngestTestSuite,
} from '../../../../../../../../graph/metamodel/pure/packageableElements/ingest/IngestDefinition.js';
import type { TestSuite } from '../../../../../../../../graph/metamodel/pure/test/Test.js';
import {
  V1_IngestMatViewTest,
  type V1_IngestTestSuite,
} from '../../../../model/packageableElements/ingest/V1_IngestDefinition.js';
import { V1_buildDataResolver } from './V1_DataResolverBuilderHelper.js';
import type { V1_GraphBuilderContext } from '../V1_GraphBuilderContext.js';
import { V1_buildTestAssertion } from './V1_TestBuilderHelper.js';

const V1_buildIngestMatViewTest = (
  element: V1_IngestMatViewTest,
  parentSuite: TestSuite,
  context: V1_GraphBuilderContext,
): IngestMatViewTest => {
  const test = new IngestMatViewTest();
  test.id = element.id;
  test.__parent = parentSuite;
  test.doc = element.doc;
  test.datasetId = element.datasetId;
  test.assertions = element.assertions.map((assertion) =>
    V1_buildTestAssertion(assertion, test, context),
  );
  return test;
};

export const V1_buildIngestTestSuite = (
  element: V1_IngestTestSuite,
  context: V1_GraphBuilderContext,
): IngestTestSuite => {
  const testSuite = new IngestTestSuite();
  testSuite.id = element.id;
  testSuite.doc = element.doc;
  testSuite.testData = element.testData.map((dataResolver) =>
    V1_buildDataResolver(dataResolver, context),
  );
  testSuite.tests = element.tests.map((test) => {
    if (test instanceof V1_IngestMatViewTest) {
      return V1_buildIngestMatViewTest(test, testSuite, context);
    }
    throw new UnsupportedOperationError(
      'Unable to build ingest test: Unsupported ingest test type',
    );
  });
  return testSuite;
};
