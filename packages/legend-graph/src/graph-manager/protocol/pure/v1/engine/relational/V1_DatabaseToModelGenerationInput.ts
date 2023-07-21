/**
 * Copyright (c) 2023-present, Goldman Sachs
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

import { primitive, createModelSchema } from 'serializr';
import { SerializationFactory } from '@finos/legend-shared';
import type { V1_PureModelContextData } from '../../model/context/V1_PureModelContextData.js';
import { V1_pureModelContextDataPropSchema } from '../../transformation/pureProtocol/V1_PureProtocolSerialization.js';

export class V1_DatabaseToModelGenerationInput {
  databasePath!: string;
  modelData!: V1_PureModelContextData;

  static readonly serialization = new SerializationFactory(
    createModelSchema(V1_DatabaseToModelGenerationInput, {
      databasePath: primitive(),
      modelData: V1_pureModelContextDataPropSchema,
    }),
  );
}
