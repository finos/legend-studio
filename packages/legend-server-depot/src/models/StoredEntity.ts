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

import { createModelSchema, primitive, raw } from 'serializr';
import { SerializationFactory } from '@finos/legend-shared';
import type { Entity } from '@finos/legend-storage';

export class StoredEntity {
  groupId!: string;
  artifactId!: string;
  versionId!: string;
  entity!: Entity;

  static readonly serialization = new SerializationFactory(
    createModelSchema(StoredEntity, {
      artifactId: primitive(),
      entity: raw(),
      groupId: primitive(),
      versionId: primitive(),
    }),
  );
}

export class StoredSummaryEntity {
  groupId!: string;
  artifactId!: string;
  versionId!: string;
  path!: string;
  classifierPath!: string;

  static readonly serialization = new SerializationFactory(
    createModelSchema(StoredSummaryEntity, {
      artifactId: primitive(),
      groupId: primitive(),
      path: primitive(),
      versionId: primitive(),
      classifierPath: primitive(),
    }),
  );
}
