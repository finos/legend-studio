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

import { createModelSchema, primitive } from 'serializr';
import {
  hashArray,
  uuid,
  SerializationFactory,
  usingModelSchema,
} from '@finos/legend-studio-shared';
import type { Hashable } from '@finos/legend-studio-shared';
import type { Entity } from '../entity/Entity';
import { VersionId } from '../version/VersionId';
import { observable, action, computed, makeObservable } from 'mobx';
import type { ProjectVersion } from '../../../metadata/models/ProjectVersionEntities';

const PROJECT_DEPENDENCY_HASH_STRUCTURE = 'PROJECT_DEPENDENCY';

export interface ProjectDependencyMetadata {
  entities: Entity[];
  projectVersion: ProjectVersion;
}

export class ProjectDependency implements Hashable {
  uuid = uuid();
  projectId: string;
  versionId: VersionId;

  constructor(projectId: string, versionId?: VersionId) {
    makeObservable(this, {
      projectId: observable,
      versionId: observable,
      pathVersion: computed,
      version: computed,
      setProjectId: action,
      setVersionId: action,
      hashCode: computed,
    });

    this.projectId = projectId;
    this.versionId = versionId ?? new VersionId();
  }

  static readonly serialization = new SerializationFactory(
    createModelSchema(ProjectDependency, {
      projectId: primitive(),
      versionId: usingModelSchema(VersionId.serialization.schema),
    }),
  );

  get pathVersion(): string {
    return `v${this.versionId.pathId}`;
  }
  get version(): string {
    return this.versionId.id;
  }

  setProjectId(projectId: string): void {
    this.projectId = projectId;
  }

  setVersionId(id: string): void {
    this.versionId.setId(id);
  }

  get hashCode(): string {
    return hashArray([
      PROJECT_DEPENDENCY_HASH_STRUCTURE,
      this.projectId,
      this.versionId.majorVersion.toString(),
      this.versionId.minorVersion.toString(),
      this.versionId.patchVersion.toString(),
    ]);
  }
}
