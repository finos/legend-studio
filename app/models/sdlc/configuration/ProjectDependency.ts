/**
 * Copyright 2020 Goldman Sachs
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *      http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */

import { serializable, object } from 'serializr';
import { Log, LOG_EVENT } from 'Utilities/Logger';
import { hashArray } from 'Utilities/HashUtil';
import { Hashable } from 'MetaModelUtility';
import { HASH_STRUCTURE } from 'MetaModelConst';
import { Entity } from 'SDLC/entity/Entity';
import { ProjectConfiguration } from './ProjectConfiguration';
import { VersionId } from 'SDLC/version/VersionId';
import { observable, action, computed } from 'mobx';
import { uuid } from 'Utilities/GeneralUtil';
import { Stubable } from 'MM/Stubable';

export interface ProjectDependencyMetadata {
  entities: Entity[];
  config: ProjectConfiguration;
  /**
   * Indicates if we need to process (i.e. add version prefix) to each paths in the projects or not
   */
  processVersionPackage: boolean;
}

export class ProjectDependency implements Stubable, Hashable {
  uuid = uuid();
  @serializable @observable projectId!: string;
  @serializable(object(VersionId)) @observable versionId!: VersionId;

  constructor(projectId: string, versionId?: VersionId) {
    this.projectId = projectId;
    this.versionId = versionId ?? new VersionId();
  }

  @computed get pathVersion(): string { return `v${this.versionId.pathId}` }
  @computed get version(): string { return this.versionId.id }

  @action setProjectId(projectId: string): void { this.projectId = projectId }

  @action
  setVersionId(id: string): void {
    try {
      this.versionId.setId(id);
    } catch (error) {
      Log.error(LOG_EVENT.SDLC_PROBLEM, error);
    }
  }

  static createStub = (): ProjectDependency => new ProjectDependency('');
  @computed get isStub(): boolean { return !this.projectId }

  @computed
  get hashCode(): string {
    return hashArray([
      HASH_STRUCTURE.PROJECT_DEPENDENCY,
      this.projectId,
      this.versionId.majorVersion.toString(),
      this.versionId.minorVersion.toString(),
      this.versionId.patchVersion.toString(),
    ]);
  }
}
