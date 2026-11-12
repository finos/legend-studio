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

import { test, expect } from '@jest/globals';
import { unitTest } from '@finos/legend-shared/test';
import {
  IngestAppendOnlyWriteMode,
  IngestBatchMilestonedBusinessTemporalWriteMode,
  IngestBatchMilestonedWriteMode,
  IngestDataset,
  IngestDefinitionSpecification,
  INTERNAL__UnknownIngestWriteMode,
} from '../../metamodel/pure/packageableElements/ingest/IngestDefinitionSpecification.js';
import { PRECISE_PRIMITIVE_TYPE } from '../../MetaModelConst.js';
import {
  getIngestDatasetWriteMode,
  getIngestWriteModeColumns,
} from '../IngestDefinitionHelper.js';

test(
  unitTest(
    'The columns a write mode adds, in the order the engine returns them',
  ),
  () => {
    const describe = (
      writeMode: Parameters<typeof getIngestWriteModeColumns>[0],
    ): string[] | undefined =>
      getIngestWriteModeColumns(writeMode)?.map(
        ({ name, type }) => `${name}: ${type}`,
      );
    expect(describe(new IngestBatchMilestonedWriteMode())).toEqual([
      'LAKE_DIGEST: String',
      'LAKE_IN_ID: Integer',
      'LAKE_OUT_ID: Integer',
    ]);
    expect(
      describe(new IngestBatchMilestonedBusinessTemporalWriteMode()),
    ).toEqual([
      'LAKE_DIGEST: String',
      'LAKE_IN_ID: Integer',
      'LAKE_OUT_ID: Integer',
      `LAKE_FROM: ${PRECISE_PRIMITIVE_TYPE.TIMESTAMP}`,
      `LAKE_THRU: ${PRECISE_PRIMITIVE_TYPE.TIMESTAMP}`,
    ]);
    expect(describe(new IngestAppendOnlyWriteMode())).toEqual([]);
    expect(describe(undefined)).toEqual([]);
    // one it doesn't know may add some
    const unknown = new INTERNAL__UnknownIngestWriteMode();
    unknown.content = { _type: 'nightly_snapshot' };
    expect(describe(unknown)).toBeUndefined();
  },
);

test(
  unitTest("A data set's write mode is its own, else its definition's"),
  () => {
    const specification = new IngestDefinitionSpecification();
    specification.writeMode = new IngestBatchMilestonedWriteMode();
    const dataset = new IngestDataset();
    expect(getIngestDatasetWriteMode(dataset, specification)).toBe(
      specification.writeMode,
    );
    dataset.writeMode = new IngestAppendOnlyWriteMode();
    expect(getIngestDatasetWriteMode(dataset, specification)).toBe(
      dataset.writeMode,
    );
  },
);
