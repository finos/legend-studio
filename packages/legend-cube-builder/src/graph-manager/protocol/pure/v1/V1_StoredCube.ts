/**
 * Copyright (c) 2026-present, Goldman Sachs
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

import { SerializationFactory } from '@finos/legend-shared';
import {
  createModelSchema,
  list,
  object,
  optional,
  primitive,
} from 'serializr';

// The engine Cube store's JSON (`pure/v1/query/cube`, PLAN §11.13), as the
// engine's `StoredCube` writes it. Fields the engine adds later are ignored.

export class V1_CubeSourceRef {
  type!: string;
  path!: string;
  element?: string | undefined;
  project?: string | undefined;

  static readonly serialization = new SerializationFactory(
    createModelSchema(V1_CubeSourceRef, {
      type: primitive(),
      path: primitive(),
      element: optional(primitive()),
      project: optional(primitive()),
    }),
    { deserializeNullAsUndefined: true },
  );
}

export class V1_StoredCubeAudit {
  createdBy?: string | undefined;
  createdAt?: number | undefined;
  updatedBy?: string | undefined;
  updatedAt?: number | undefined;

  static readonly serialization = new SerializationFactory(
    createModelSchema(V1_StoredCubeAudit, {
      createdBy: optional(primitive()),
      createdAt: optional(primitive()),
      updatedBy: optional(primitive()),
      updatedAt: optional(primitive()),
    }),
    { deserializeNullAsUndefined: true },
  );
}

/**
 * A saved cube: what the store answers (search results have no `content`),
 * and what a create or a save sends (no `id`, `owners`, `audit`; a save adds
 * the `version` it read)
 */
export class V1_StoredCube {
  id?: string | undefined;
  version?: number | undefined;
  name!: string;
  owners?: string[] | undefined;
  tags?: string[] | undefined;
  formatVersion!: number;
  content?: string | undefined;
  sourceRefs?: V1_CubeSourceRef[] | undefined;
  audit?: V1_StoredCubeAudit | undefined;
  lastOpenAt?: number | undefined;

  static readonly serialization = new SerializationFactory(
    createModelSchema(V1_StoredCube, {
      id: optional(primitive()),
      version: optional(primitive()),
      name: primitive(),
      owners: optional(list(primitive())),
      tags: optional(list(primitive())),
      formatVersion: primitive(),
      content: optional(primitive()),
      sourceRefs: optional(list(object(V1_CubeSourceRef.serialization.schema))),
      audit: optional(object(V1_StoredCubeAudit.serialization.schema)),
      lastOpenAt: optional(primitive()),
    }),
    { deserializeNullAsUndefined: true },
  );
}

export class V1_CubeSearchSpecification {
  searchTerm?: string | undefined;
  owner?: string | undefined;
  limit?: number | undefined;

  static readonly serialization = new SerializationFactory(
    createModelSchema(V1_CubeSearchSpecification, {
      searchTerm: optional(primitive()),
      owner: optional(primitive()),
      limit: optional(primitive()),
    }),
  );
}
