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

import { list, createModelSchema, optional, primitive } from 'serializr';
import { SerializationFactory, usingModelSchema } from '@finos/legend-shared';

class FileImportContent {
  fileName?: string | undefined;
  content?: string | undefined;

  static readonly serialization = new SerializationFactory(
    createModelSchema(FileImportContent, {
      fileName: optional(primitive()),
      content: optional(primitive()),
    }),
  );
}

export class V1_PureModelContextGenerationInput {
  package?: string | undefined;
  imports?: FileImportContent[] | undefined;

  static readonly serialization = new SerializationFactory(
    createModelSchema(V1_PureModelContextGenerationInput, {
      package: optional(primitive()),
      imports: list(usingModelSchema(FileImportContent.serialization.schema)),
    }),
  );
}
