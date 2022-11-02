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

import { createModelSchema, raw, optional, primitive } from 'serializr';
import { type PlainObject, SerializationFactory } from '@finos/legend-shared';

export enum EntityChangeType {
  CREATE = 'CREATE',
  DELETE = 'DELETE',
  MODIFY = 'MODIFY',
  // NOTE: we should never use this (since we consider a rename as a delete and a create),
  // but as the backend still supports it, we will leave it here
  RENAME = 'RENAME',
}

export class EntityChange {
  type!: EntityChangeType;
  entityPath!: string;
  classifierPath?: string;
  newEntityPath?: string;
  content?: PlainObject;

  static readonly serialization = new SerializationFactory(
    createModelSchema(EntityChange, {
      type: primitive(),
      entityPath: primitive(),
      classifierPath: optional(primitive()),
      newEntityPath: optional(primitive()),
      content: optional(raw()),
    }),
  );
}
