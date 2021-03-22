/**
 * Copyright Goldman Sachs
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
import {
  SerializationFactory,
  usingModelSchema,
} from '@finos/legend-studio-shared';
import { CompilationError } from '../../../../../metamodels/pure/action/EngineError';
import { V1_EngineError } from '../../engine/V1_EngineError';
import { V1_buildSourceInformation } from '../../transformation/pureGraph/to/helpers/V1_CoreBuilderHelper';
import { V1_sourceInformationSerialization } from '../../transformation/pureProtocol/serializationHelpers/V1_CoreSerializationHelper';

export class V1_CompilationError extends V1_EngineError {
  static readonly serialization = new SerializationFactory(
    createModelSchema(V1_CompilationError, {
      errorType: optional(primitive()),
      message: primitive(),
      sourceInformation: usingModelSchema(
        V1_sourceInformationSerialization.schema,
      ),
    }),
  );

  build(): CompilationError {
    const error = new CompilationError();
    error.message = this.message;
    error.sourceInformation = this.sourceInformation
      ? V1_buildSourceInformation(this.sourceInformation)
      : undefined;
    return error;
  }
}
