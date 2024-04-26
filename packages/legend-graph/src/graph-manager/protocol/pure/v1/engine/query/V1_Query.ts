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
import { createModelSchema, list, optional, primitive, raw } from 'serializr';
import type { V1_StereotypePtr } from '../../model/packageableElements/domain/V1_StereotypePtr.js';
import type { V1_TaggedValue } from '../../model/packageableElements/domain/V1_TaggedValue.js';
import {
  V1_stereotypePtrModelSchema,
  V1_taggedValueModelSchema,
} from '../../transformation/pureProtocol/serializationHelpers/V1_DomainSerializationHelper.js';

export class V1_QueryParameterValue {
  name!: string;
  content!: string;

  static readonly serialization = new SerializationFactory(
    createModelSchema(V1_QueryParameterValue, {
      name: primitive(),
      content: primitive(),
    }),
    {
      deserializeNullAsUndefined: true,
    },
  );
}

export interface V1_QueryGridConfig {
  columns: object[];
  isPivotModeEnabled: boolean | undefined;
  isLocalModeEnabled: boolean | undefined;
  previewLimit?: number | undefined;
  weightedColumnPairs?: Map<string, string> | undefined;
}

export class V1_Query {
  name!: string;
  id!: string;
  groupId!: string;
  artifactId!: string;
  versionId!: string;
  originalVersionId?: string | undefined;
  mapping!: string;
  runtime!: string;
  content!: string;
  owner?: string | undefined;
  taggedValues?: V1_TaggedValue[] | undefined;
  stereotypes?: V1_StereotypePtr[] | undefined;
  defaultParameterValues?: V1_QueryParameterValue[] | undefined;
  lastUpdatedAt?: number | undefined;
  gridConfig?: V1_QueryGridConfig | undefined;

  static readonly serialization = new SerializationFactory(
    createModelSchema(V1_Query, {
      artifactId: primitive(),
      content: primitive(),
      id: primitive(),
      defaultParameterValues: optional(
        list(usingModelSchema(V1_QueryParameterValue.serialization.schema)),
      ),
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
      originalVersionId: optional(primitive()),
      gridConfig: optional(raw()),
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
  originalVersionId?: string | undefined;
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
      originalVersionId: optional(primitive()),
    }),
    {
      deserializeNullAsUndefined: true,
    },
  );
}
