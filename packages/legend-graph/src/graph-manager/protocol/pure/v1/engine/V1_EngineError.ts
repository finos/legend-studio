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

import { createModelSchema, optional, primitive } from 'serializr';
import { SerializationFactory, usingModelSchema } from '@finos/legend-shared';
import type { V1_SourceInformation } from '../model/V1_SourceInformation.js';
import { V1_sourceInformationSerialization } from '../transformation/pureProtocol/serializationHelpers/V1_CoreSerializationHelper.js';

export enum V1_EngineErrorType {
  COMPILATION = 'COMPILATION',
  PARSER = 'PARSER',
}

export class V1_EngineError {
  message = '';
  errorType?: V1_EngineErrorType | undefined;
  sourceInformation?: V1_SourceInformation | undefined;
  trace?: string | undefined;

  static readonly serialization = new SerializationFactory(
    createModelSchema(V1_EngineError, {
      errorType: optional(primitive()),
      message: primitive(),
      sourceInformation: usingModelSchema(
        V1_sourceInformationSerialization.schema,
      ),
      trace: optional(primitive()),
    }),
  );
}
