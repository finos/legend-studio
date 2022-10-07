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

import {
  list,
  createModelSchema,
  primitive,
  serialize,
  deserialize,
} from 'serializr';
import { observable, action, computed, makeObservable } from 'mobx';
import { ProjectStructureVersion } from '../configuration/ProjectStructureVersion.js';
import { ProjectDependency } from '../configuration/ProjectDependency.js';
import {
  type Hashable,
  hashArray,
  addUniqueEntry,
  deleteEntry,
  SerializationFactory,
  usingModelSchema,
  serializeArray,
  deserializeArray,
  optionalCustom,
} from '@finos/legend-shared';
import { ENTITY_PATH_DELIMITER } from '@finos/legend-storage';
import { PlatformConfiguration } from './PlatformConfiguration.js';

const PROJECT_CONFIGURATION_HASH_STRUCTURE = 'PROJECT_CONFIGURATION';

export class ProjectConfiguration implements Hashable {
  projectId!: string;
  groupId!: string;
  artifactId!: string;
  projectStructureVersion!: ProjectStructureVersion;
  platformConfigurations?: PlatformConfiguration[] | undefined;
  projectDependencies: ProjectDependency[] = [];

  constructor() {
    makeObservable(this, {
      groupId: observable,
      artifactId: observable,
      projectStructureVersion: observable,
      platformConfigurations: observable,
      projectDependencies: observable,
      setGroupId: action,
      setPlatformConfigurations: action,
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
      platformConfigurations: optionalCustom(
        (values) =>
          serializeArray(
            values,
            (value) =>
              serialize(PlatformConfiguration.serialization.schema, value),
            {
              skipIfEmpty: true,
              INTERNAL__forceReturnEmptyInTest: true,
            },
          ),
        (values) =>
          deserializeArray(
            values,
            (v) => deserialize(PlatformConfiguration.serialization.schema, v),
            {
              skipIfEmpty: true,
            },
          ),
      ),
      projectDependencies: list(
        usingModelSchema(ProjectDependency.serialization.schema),
      ),
      projectId: primitive(),
      projectStructureVersion: usingModelSchema(
        ProjectStructureVersion.serialization.schema,
      ),
    }),
  );

  setGroupId(val: string): void {
    this.groupId = val;
  }

  setPlatformConfigurations(val: PlatformConfiguration[] | undefined): void {
    this.platformConfigurations = val;
  }

  setArtifactId(val: string): void {
    this.artifactId = val;
  }

  isNotEmptyPlatforms(): boolean {
    if (this.platformConfigurations) {
      return this.platformConfigurations.every(
        (p) => p.name !== undefined && p.version !== undefined,
      );
    }
    return false;
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
    if (this.platformConfigurations !== undefined) {
      return hashArray([
        PROJECT_CONFIGURATION_HASH_STRUCTURE,
        this.groupId,
        this.artifactId,
        hashArray(this.platformConfigurations),
        this.projectStructureVersion.version.toString(),
        this.projectStructureVersion.extensionVersion?.toString() ?? '',
        hashArray(this.projectDependencies),
      ]);
    } else {
      return hashArray([
        PROJECT_CONFIGURATION_HASH_STRUCTURE,
        this.groupId,
        this.artifactId,
        this.projectStructureVersion.version.toString(),
        this.projectStructureVersion.extensionVersion?.toString() ?? '',
        hashArray(this.projectDependencies),
      ]);
    }
  }
}
