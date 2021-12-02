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

import { SerializationFactory, usingModelSchema } from '@finos/legend-shared';
import { createModelSchema, list, optional, primitive } from 'serializr';
import type { V1_StereotypePtr } from '../../model/packageableElements/domain/V1_StereotypePtr';
import type { V1_TaggedValue } from '../../model/packageableElements/domain/V1_TaggedValue';
import {
  V1_stereotypePtrSchema,
  V1_taggedValueSchema,
} from '../../transformation/pureProtocol/serializationHelpers/V1_DomainSerializationHelper';

export class V1_QueryProjectCoordinates {
  groupId!: string;
  artifactId!: string;

  static readonly serialization = new SerializationFactory(
    createModelSchema(V1_QueryProjectCoordinates, {
      artifactId: primitive(),
      groupId: primitive(),
    }),
  );
}

export class V1_QuerySearchSpecification {
  searchTerm?: string | undefined;
  projectCoordinates?: V1_QueryProjectCoordinates[] | undefined;
  taggedValues?: V1_TaggedValue[] | undefined;
  stereotypes?: V1_StereotypePtr[] | undefined;
  limit?: number | undefined;
  showCurrentUserQueriesOnly?: boolean | undefined;

  static readonly serialization = new SerializationFactory(
    createModelSchema(V1_QuerySearchSpecification, {
      limit: optional(primitive()),
      projectCoordinates: optional(
        list(usingModelSchema(V1_QueryProjectCoordinates.serialization.schema)),
      ),
      searchTerm: optional(primitive()),
      showCurrentUserQueriesOnly: optional(primitive()),
      stereotypes: optional(list(usingModelSchema(V1_stereotypePtrSchema))),
      taggedValues: optional(list(usingModelSchema(V1_taggedValueSchema))),
    }),
  );
}
