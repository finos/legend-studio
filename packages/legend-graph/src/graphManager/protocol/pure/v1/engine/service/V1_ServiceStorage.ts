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

import { createModelSchema, primitive, list } from 'serializr';
import {
  guaranteeNonNullable,
  assertNonEmptyString,
  SerializationFactory,
  usingModelSchema,
} from '@finos/legend-shared';

class V1_GenerationDigest {
  generationId!: string;

  static readonly serialization = new SerializationFactory(
    createModelSchema(V1_GenerationDigest, {
      generationId: primitive(),
    }),
  );
}

export class V1_ServiceStorage {
  generations: V1_GenerationDigest[] = [];

  static readonly serialization = new SerializationFactory(
    createModelSchema(V1_ServiceStorage, {
      generations: list(
        usingModelSchema(V1_GenerationDigest.serialization.schema),
      ),
    }),
  );

  getGenerationId(): string {
    const generation = guaranteeNonNullable(this.generations[0]);
    assertNonEmptyString(
      generation.generationId,
      'Generation id missing in service registration',
    );
    return generation.generationId;
  }
}
