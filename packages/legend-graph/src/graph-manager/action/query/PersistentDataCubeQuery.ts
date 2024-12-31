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

import { SerializationFactory, type PlainObject } from '@finos/legend-shared';
import { createModelSchema, optional, primitive, raw } from 'serializr';

export class PersistentDataCubeQuery {
  id!: string;
  name!: string;
  description: string | undefined;
  content!: PlainObject<object>;
  owner: string | undefined;

  lastUpdatedAt?: number | undefined;
  createdAt?: number | undefined;
  lastOpenAt?: number | undefined;

  static readonly serialization = new SerializationFactory(
    createModelSchema(PersistentDataCubeQuery, {
      id: primitive(),
      lastUpdatedAt: optional(primitive()),
      createdAt: optional(primitive()),
      lastOpenAt: optional(primitive()),
      name: primitive(),
      description: optional(primitive()),
      content: raw(),
      owner: optional(primitive()),
    }),
  );

  clone() {
    return PersistentDataCubeQuery.serialization.fromJson(
      PersistentDataCubeQuery.serialization.toJson(this),
    );
  }
}

export class LightPersistentDataCubeQuery {
  id!: string;
  name!: string;
  description: string | undefined;

  owner: string | undefined;

  lastUpdatedAt?: number | undefined;
  createdAt?: number | undefined;
  lastOpenAt?: number | undefined;

  static readonly serialization = new SerializationFactory(
    createModelSchema(LightPersistentDataCubeQuery, {
      id: primitive(),
      lastUpdatedAt: optional(primitive()),
      createdAt: optional(primitive()),
      lastOpenAt: optional(primitive()),
      name: primitive(),
      description: optional(primitive()),
      owner: optional(primitive()),
    }),
  );
}
