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

import { beforeAll, describe, expect, test } from '@jest/globals';
import { unitTest } from '@finos/legend-shared/test';
import type { PlainObject } from '@finos/legend-shared';
import { PackageableElementReference } from '../../../../../../../../graph/metamodel/pure/packageableElements/PackageableElementReference.js';
import { IngestSerializedSource } from '../../../../../../../../graph/metamodel/pure/packageableElements/ingest/IngestDefinitionSpecification.js';
import { V1_buildIngestDefinitionSpecification } from '../helpers/V1_IngestDefinitionSpecificationBuilder.js';
import {
  TEST__buildGraphWithEntities,
  TEST__getTestGraphManagerState,
} from '../../../../../../../__test-utils__/GraphManagerTestUtils.js';
import type { GraphManagerState } from '../../../../../../../GraphManagerState.js';
import {
  V1_TEST__buildIngestSpecificationContext,
  V1_TEST__describeIngestColumns,
} from './V1_IngestDefinitionSpecificationTestUtils.js';
import TEST_DATA__IngestDefinitionCompatibility from './V1_TEST_DATA__IngestDefinitionCompatibility.json' with { type: 'json' };

/**
 * Ingest definitions as stored (`input`, often in an older version of the
 * protocol) and as the protocol's reader reads them: `expected` is its reading
 * written back in the current protocol, `expectedLegacyForm` the same written
 * back with identity partitions and whole relation lookup indexes in their
 * legacy form. `expectedError` is set instead when the reader rejects the input
 */
interface CompatibilityCase {
  name: string;
  input: PlainObject;
  expected?: PlainObject;
  expectedLegacyForm?: PlainObject;
  expectedError?: string;
}

const CASES = TEST_DATA__IngestDefinitionCompatibility as CompatibilityCase[];
const READ_CASES = CASES.filter((testCase) => !testCase.expectedError).map(
  (testCase) => [testCase.name, testCase] as const,
);
const ERROR_CASES = CASES.filter((testCase) => testCase.expectedError).map(
  (testCase) => [testCase.name, testCase] as const,
);

const toComparable = (value: unknown): unknown =>
  JSON.parse(
    JSON.stringify(value, (_key, entry: unknown) => {
      if (entry instanceof PackageableElementReference) {
        return entry.valueForSerialization;
      } else if (entry instanceof IngestSerializedSource) {
        return { ...entry, schema: V1_TEST__describeIngestColumns(entry) };
      }
      return entry;
    }),
  );

let graphManagerState: GraphManagerState;

const read = (content: PlainObject): unknown =>
  toComparable(
    V1_buildIngestDefinitionSpecification(
      content,
      V1_TEST__buildIngestSpecificationContext(graphManagerState.graph),
    ),
  );

beforeAll(async () => {
  graphManagerState = TEST__getTestGraphManagerState();
  await TEST__buildGraphWithEntities(graphManagerState, []);
});

describe(
  unitTest(
    'Ingest definition specification reads older protocols as the protocol reader does',
  ),
  () => {
    test('the test data has cases the reader reads and cases it rejects', () => {
      expect(READ_CASES.length).toBe(26);
      expect(ERROR_CASES.length).toBe(4);
    });

    test.each(READ_CASES)(
      '%s: the stored definition reads as what the reader read from it',
      (_name, testCase) => {
        expect(read(testCase.input)).toEqual(
          read(testCase.expected as PlainObject),
        );
      },
    );

    test.each(READ_CASES)(
      '%s: the reading written back in the legacy form reads the same',
      (_name, testCase) => {
        expect(read(testCase.expectedLegacyForm as PlainObject)).toEqual(
          read(testCase.expected as PlainObject),
        );
      },
    );

    test.each(ERROR_CASES)(
      '%s: a definition the reader rejects is rejected',
      (_name, testCase) => {
        expect(() =>
          V1_buildIngestDefinitionSpecification(
            testCase.input,
            V1_TEST__buildIngestSpecificationContext(graphManagerState.graph),
          ),
        ).toThrow();
      },
    );
  },
);
