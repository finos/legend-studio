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
  type IngestTestSuite,
} from '../../../../../../../graph/metamodel/pure/packageableElements/ingest/IngestDefinition.js';
import {
  V1_IngestMatViewTest,
  V1_IngestTestSuite,
} from '../../../model/packageableElements/ingest/V1_IngestDefinition.js';
import { V1_transformTestAssertion } from './V1_TestTransformer.js';
import { V1_transformDataResolver } from './V1_DataResolverTransformer.js';
import type { V1_GraphTransformerContext } from './V1_GraphTransformerContext.js';

const V1_transformIngestMatViewTest = (
  element: IngestMatViewTest,
): V1_IngestMatViewTest => {
  const test = new V1_IngestMatViewTest();
  test.id = element.id;
  test.doc = element.doc;
  test.datasetId = element.datasetId;
  test.assertions = element.assertions.map(V1_transformTestAssertion);
  return test;
};

export const V1_transformIngestTestSuite = (
  element: IngestTestSuite,
  context: V1_GraphTransformerContext,
): V1_IngestTestSuite => {
  const suite = new V1_IngestTestSuite();
  suite.id = element.id;
  suite.doc = element.doc;
  suite.testData = element.testData.map((dataResolver) =>
    V1_transformDataResolver(dataResolver, context),
  );
  suite.tests = element.tests.map((test) => {
    if (test instanceof IngestMatViewTest) {
      return V1_transformIngestMatViewTest(test);
    }
    throw new UnsupportedOperationError('Unsupported ingest test to transform');
  });
  return suite;
};
