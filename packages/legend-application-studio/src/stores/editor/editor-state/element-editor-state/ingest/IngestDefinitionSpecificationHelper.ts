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

import {
  IngestFunctionSource,
  IngestWholeRelationLookupIndex,
  type IngestDefinitionSpecification,
  type RawLambda,
} from '@finos/legend-graph';

/** Every lambda of the specification, so they can be shown as Pure in one go */
export const getIngestSpecificationLambdas = (
  specification: IngestDefinitionSpecification,
): RawLambda[] => [
  ...(specification.batchAttributes ? [specification.batchAttributes] : []),
  ...(specification.barrier ? [specification.barrier] : []),
  ...specification.datasets.flatMap((dataset) => [
    ...dataset.ingestPartitionColumns,
    ...dataset.storageLayoutClusterColumns,
    ...dataset.storageLayoutPartitionColumns,
    ...dataset.lookupIndexes
      .filter(
        (index): index is IngestWholeRelationLookupIndex =>
          index instanceof IngestWholeRelationLookupIndex,
      )
      .map((index) => index.lambda),
    ...(dataset.source instanceof IngestFunctionSource
      ? [dataset.source.function]
      : []),
  ]),
];
