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
import type { V1_StereotypePtr } from '../../model/packageableElements/domain/V1_StereotypePtr.js';
import type { V1_TaggedValue } from '../../model/packageableElements/domain/V1_TaggedValue.js';
import {
  V1_stereotypePtrModelSchema,
  V1_taggedValueModelSchema,
} from '../../transformation/pureProtocol/serializationHelpers/V1_DomainSerializationHelper.js';

export class V1_Query {
  name!: string;
  id!: string;
  groupId!: string;
  artifactId!: string;
  versionId!: string;
  mapping!: string;
  runtime!: string;
  content!: string;
  owner?: string | undefined;
  taggedValues?: V1_TaggedValue[] | undefined;
  stereotypes?: V1_StereotypePtr[] | undefined;
  lastUpdatedAt?: number | undefined;

  static readonly serialization = new SerializationFactory(
    createModelSchema(V1_Query, {
      artifactId: primitive(),
      content: primitive(),
      id: primitive(),
      groupId: primitive(),
      lastUpdatedAt: optional(primitive()),
      mapping: primitive(),
      name: primitive(),
      owner: optional(primitive()),
      runtime: primitive(),
      stereotypes: optional(
        list(usingModelSchema(V1_stereotypePtrModelSchema)),
      ),
      taggedValues: optional(list(usingModelSchema(V1_taggedValueModelSchema))),
      versionId: primitive(),
    }),
    {
      deserializeNullAsUndefined: true,
    },
  );
}

export class V1_LightQuery {
  name!: string;
  id!: string;
  groupId!: string;
  owner?: string | undefined;
  artifactId!: string;
  versionId!: string;
  lastUpdatedAt?: number | undefined;

  static readonly serialization = new SerializationFactory(
    createModelSchema(V1_Query, {
      artifactId: primitive(),
      id: primitive(),
      groupId: primitive(),
      lastUpdatedAt: optional(primitive()),
      name: primitive(),
      owner: optional(primitive()),
      versionId: primitive(),
    }),
    {
      deserializeNullAsUndefined: true,
    },
  );
}
