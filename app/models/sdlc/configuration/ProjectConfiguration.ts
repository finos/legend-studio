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

import { observable, action, computed } from 'mobx';
import { serializable, object, list } from 'serializr';
import { ProjectType } from 'SDLC/project/Project';
import { ProjectStructureVersion } from 'SDLC/configuration/ProjectStructureVersion';
import { ProjectDependency } from 'SDLC/configuration/ProjectDependency';
import { HASH_STRUCTURE, ENTITY_PATH_DELIMITER } from 'MetaModelConst';
import { hashArray } from 'Utilities/HashUtil';
import { Hashable } from 'MetaModelUtility';
import { addUniqueEntry, deleteEntry } from 'Utilities/GeneralUtil';

export class ProjectConfiguration implements Hashable {
  @serializable projectId!: string;
  @serializable projectType!: ProjectType;
  @serializable @observable groupId!: string | null;
  @serializable @observable artifactId!: string | null;
  @serializable(object(ProjectStructureVersion)) @observable projectStructureVersion!: ProjectStructureVersion;
  @serializable(list(object(ProjectDependency))) @observable projectDependencies: ProjectDependency[] = [];

  @action setGroupId(groupId: string): void { this.groupId = groupId }
  @action setArtifactId(artifactId: string): void { this.artifactId = artifactId }
  @action deleteProjectDependency(val: ProjectDependency): void { deleteEntry(this.projectDependencies, val) }
  @action addProjectDependency(val: ProjectDependency): void { addUniqueEntry(this.projectDependencies, val) }

  @computed get dependencyKey(): string { return `${(this.groupId ?? '').replace(/\./g, ENTITY_PATH_DELIMITER)}${ENTITY_PATH_DELIMITER}${this.artifactId}` }

  @computed get hashCode(): string {
    return hashArray([
      HASH_STRUCTURE.PROJECT_CONFIGURATION,
      this.groupId ?? '',
      this.artifactId ?? '',
      this.projectType,
      this.projectStructureVersion.version.toString(),
      this.projectStructureVersion.extensionVersion?.toString() ?? '',
      hashArray(this.projectDependencies)
    ]);
  }
}
