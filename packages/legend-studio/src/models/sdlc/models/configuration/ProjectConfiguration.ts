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

import { list, createModelSchema, primitive } from 'serializr';
import { observable, action, computed, makeObservable } from 'mobx';
import type { ProjectType } from '../project/Project';
import { ProjectStructureVersion } from '../configuration/ProjectStructureVersion';
import { ProjectDependency } from '../configuration/ProjectDependency';
import {
  hashArray,
  addUniqueEntry,
  deleteEntry,
  SerializationFactory,
  usingModelSchema,
} from '@finos/legend-studio-shared';
import type { Hashable } from '@finos/legend-studio-shared';
import { ENTITY_PATH_DELIMITER } from '../../SDLCUtils';

const PROJECT_CONFIGURATION_HASH_STRUCTURE = 'PROJECT_CONFIGURATION';

export class ProjectConfiguration implements Hashable {
  projectId!: string;
  projectType!: ProjectType;
  groupId!: string;
  artifactId!: string;
  projectStructureVersion!: ProjectStructureVersion;
  projectDependencies: ProjectDependency[] = [];

  constructor() {
    makeObservable(this, {
      groupId: observable,
      artifactId: observable,
      projectStructureVersion: observable,
      projectDependencies: observable,
      setGroupId: action,
      setArtifactId: action,
      deleteProjectDependency: action,
      addProjectDependency: action,
      dependencyKey: computed,
      hashCode: computed,
    });
  }

  static readonly serialization = new SerializationFactory(
    createModelSchema(ProjectConfiguration, {
      artifactId: primitive(),
      groupId: primitive(),
      projectDependencies: list(
        usingModelSchema(ProjectDependency.serialization.schema),
      ),
      projectId: primitive(),
      projectStructureVersion: usingModelSchema(
        ProjectStructureVersion.serialization.schema,
      ),
      projectType: primitive(),
    }),
  );

  setGroupId(val: string): void {
    this.groupId = val;
  }

  setArtifactId(val: string): void {
    this.artifactId = val;
  }

  deleteProjectDependency(val: ProjectDependency): void {
    deleteEntry(this.projectDependencies, val);
  }

  addProjectDependency(val: ProjectDependency): void {
    addUniqueEntry(this.projectDependencies, val);
  }

  get dependencyKey(): string {
    return `${this.groupId.replace(
      /\./g,
      ENTITY_PATH_DELIMITER,
    )}${ENTITY_PATH_DELIMITER}${this.artifactId}`;
  }

  get hashCode(): string {
    return hashArray([
      PROJECT_CONFIGURATION_HASH_STRUCTURE,
      this.groupId,
      this.artifactId,
      this.projectType,
      this.projectStructureVersion.version.toString(),
      this.projectStructureVersion.extensionVersion?.toString() ?? '',
      hashArray(this.projectDependencies),
    ]);
  }
}
