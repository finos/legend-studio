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

import { list, createModelSchema, primitive, raw } from 'serializr';
import { SerializationFactory } from '@finos/legend-studio-shared';
import type { Entity } from '../../sdlc/models/entity/Entity';

export interface ProjectVersion {
  projectId: string;
  versionId: string;
}

export class ProjectVersionEntities {
  projectId!: string;
  versionId!: string;
  entities: Entity[] = [];

  static readonly serialization = new SerializationFactory(
    createModelSchema(ProjectVersionEntities, {
      projectId: primitive(),
      versionId: primitive(),
      entities: list(raw()),
    }),
  );

  get projectVersion(): ProjectVersion {
    return {
      projectId: this.projectId,
      versionId: this.versionId,
    };
  }
}
