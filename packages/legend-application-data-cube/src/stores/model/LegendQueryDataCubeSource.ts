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

import { DataCubeSource } from '@finos/legend-data-cube';
import type {
  QueryInfo,
  V1_Lambda,
  V1_ValueSpecification,
  V1_Variable,
} from '@finos/legend-graph';
import {
  SerializationFactory,
  usingConstantValueSchema,
  type PlainObject,
} from '@finos/legend-shared';
import { createModelSchema, list, primitive } from 'serializr';

export const LEGEND_QUERY_DATA_CUBE_SOURCE_TYPE = 'legendQuery';

export class LegendQueryDataCubeSource extends DataCubeSource {
  info!: QueryInfo;
  lambda!: V1_Lambda;
  mapping?: string | undefined;
  runtime!: string;
  model!: PlainObject;
  parameterValues: {
    variable: V1_Variable;
    valueSpec: V1_ValueSpecification;
  }[] = [];
}

export class RawLegendQueryDataCubeSource {
  queryId!: string;
  parameterValues?: [string, string][] | undefined;

  static readonly serialization = new SerializationFactory(
    createModelSchema(RawLegendQueryDataCubeSource, {
      _type: usingConstantValueSchema(LEGEND_QUERY_DATA_CUBE_SOURCE_TYPE),
      queryId: primitive(),
      parameterValues: list(list(primitive())),
    }),
  );
}
