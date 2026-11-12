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

import { LogService } from '@finos/legend-shared';
import type { PureModel } from '../../../../../../../../graph/PureModel.js';
import type { IngestSerializedSource } from '../../../../../../../../graph/metamodel/pure/packageableElements/ingest/IngestDefinitionSpecification.js';
import type { InstanceValue } from '../../../../../../../../graph/metamodel/pure/valueSpecification/InstanceValue.js';
import {
  V1_GraphBuilderContextBuilder,
  type V1_GraphBuilderContext,
} from '../V1_GraphBuilderContext.js';
import { V1_GraphBuilderExtensions } from '../V1_GraphBuilderExtensions.js';

export const V1_TEST__buildIngestSpecificationContext = (
  graph: PureModel,
): V1_GraphBuilderContext =>
  new V1_GraphBuilderContextBuilder(
    graph,
    graph,
    new V1_GraphBuilderExtensions([]),
    new LogService(),
  ).build();

/** A serialized source's columns, as plain values to assert on */
export const V1_TEST__describeIngestColumns = (
  source: IngestSerializedSource,
): {
  name: string;
  type: string;
  typeArguments: string[];
  lowerBound: number;
  upperBound: number | undefined;
  description: string | undefined;
}[] =>
  (source.schema?.columns ?? []).map((column) => ({
    name: column.name,
    type: column.genericType.value.rawType.path,
    typeArguments: (column.genericType.value.typeVariableValues ?? []).map(
      (value) => String((value as InstanceValue).values[0]),
    ),
    lowerBound: column.multiplicity.lowerBound,
    upperBound: column.multiplicity.upperBound,
    description: column.description,
  }));
