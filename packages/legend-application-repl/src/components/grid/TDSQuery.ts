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

import { type V1_Lambda, V1_lambdaModelSchema } from '@finos/legend-graph';
import { TDSRequest } from './TDSRequest.js';
import { SerializationFactory, usingModelSchema } from '@finos/legend-shared';
import { createModelSchema } from 'serializr';

export class TDSQuery {
  initialQuery!: V1_Lambda;
  currentQueryInfo!: TDSRequest;

  constructor(initialQuery: V1_Lambda, currentQueryInfo: TDSRequest) {
    this.initialQuery = initialQuery;
    this.currentQueryInfo = currentQueryInfo;
  }

  static readonly serialization = new SerializationFactory(
    createModelSchema(TDSQuery, {
      initialQuery: usingModelSchema(V1_lambdaModelSchema([])),
      currentQueryInfo: usingModelSchema(TDSRequest.serialization.schema),
    }),
  );
}
