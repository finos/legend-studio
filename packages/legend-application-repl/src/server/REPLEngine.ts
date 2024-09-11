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

import { createModelSchema, custom, primitive } from 'serializr';
import {
  SerializationFactory,
  usingModelSchema,
  type PlainObject,
} from '@finos/legend-shared';
import {
  type V1_ValueSpecification,
  type V1_Lambda,
  V1_deserializeValueSpecification,
  V1_serializeValueSpecification,
} from '@finos/legend-graph';
import { DataCubeQuery, type DataCubeQueryColumn } from './DataCubeQuery.js';

export type DataCubeQueryBuilderError = {
  type: string;
  message: string;
  sourceInformation?: {
    startLine: number;
    startColumn: number;
    endLine: number;
    endColumn: number;
  };
};

export type DataCubeInfrastructureInfo = {
  gridClientLicense?: string | undefined;
};

export type DataCubeGetQueryCodeInput = {
  query: PlainObject<V1_ValueSpecification>; // TODO: @akphi - consider if we should update this to use Lambda instead
  pretty?: boolean;
};

export type DataCubeParseQueryInput = {
  code: string;
  returnSourceInformation?: boolean | undefined;
};

export type CompletionItem = {
  completion: string;
  display: string;
};

export type DataCubeQueryTypeaheadInput = {
  code: string;
  baseQuery?: PlainObject<V1_ValueSpecification>;
};

export type DataCubeGetQueryRelationReturnTypeInput = {
  query: PlainObject<V1_Lambda>;
};

export type DataCubeGetQueryCodeRelationReturnTypeInput = {
  code: string;
  baseQuery?: PlainObject<V1_ValueSpecification>;
};

export type DataCubeExecutionInput = {
  query: PlainObject<V1_Lambda>;
  debug?: boolean | undefined;
};

export type DataCubeExecutionResult = {
  result: string;
  executedQuery: string;
  executedSQL: string;
};

export type RelationType = {
  columns: DataCubeQueryColumn[];
};

export class DataCubeGetBaseQueryResult {
  query!: DataCubeQuery;
  timestamp!: number;
  partialQuery!: V1_ValueSpecification;
  sourceQuery!: V1_ValueSpecification;

  static readonly serialization = new SerializationFactory(
    createModelSchema(DataCubeGetBaseQueryResult, {
      partialQuery: custom(
        (val) => V1_serializeValueSpecification(val, []),
        (val) => V1_deserializeValueSpecification(val, []),
      ),
      query: usingModelSchema(DataCubeQuery.serialization.schema),
      sourceQuery: custom(
        (val) => V1_serializeValueSpecification(val, []),
        (val) => V1_deserializeValueSpecification(val, []),
      ),
      timestamp: primitive(),
    }),
  );
}
