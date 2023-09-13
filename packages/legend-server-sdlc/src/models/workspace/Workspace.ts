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

import { createModelSchema, optional, primitive } from 'serializr';
import { SerializationFactory } from '@finos/legend-shared';

export enum WorkspaceAccessType {
  WORKSPACE = 'WORKSPACE',
  CONFLICT_RESOLUTION = 'CONFLICT_RESOLUTION',
  // BACKUP = 'BACKUP',
}

export enum WorkspaceType {
  USER = 'USER',
  GROUP = 'GROUP',
}
export class Workspace {
  projectId!: string;
  workspaceId!: string;
  userId?: string | undefined;

  accessType = WorkspaceAccessType.WORKSPACE;
  // TODO: Add `SourceType` when SDLC starts returning this field
  source?: string | undefined;

  static readonly serialization = new SerializationFactory(
    createModelSchema(Workspace, {
      projectId: primitive(),
      userId: optional(primitive()),
      workspaceId: primitive(),
    }),
    {
      deserializeNullAsUndefined: true,
    },
  );

  get workspaceType(): WorkspaceType {
    return this.userId ? WorkspaceType.USER : WorkspaceType.GROUP;
  }
}
