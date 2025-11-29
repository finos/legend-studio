/**
 * Copyright (c) 2025-present, Goldman Sachs
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
  type Hashable,
  hashArray,
  uuid,
  guaranteeNonNullable,
  SerializationFactory,
} from '@finos/legend-shared';
import { observable, action, computed, makeObservable } from 'mobx';
import { GAV_DELIMITER } from '@finos/legend-storage';
import { SDLC_HASH_STRUCTURE } from '../../SDLC_HashUtils.js';

export class ProjectDependencyExclusion implements Hashable {
  readonly _UUID = uuid();
  projectId: string;

  constructor(projectId: string) {
    makeObservable(this, {
      projectId: observable,
      setProjectId: action,
      coordinate: computed,
      hashCode: computed,
    });
    this.projectId = projectId;
  }

  static readonly serialization = new SerializationFactory(
    createModelSchema(ProjectDependencyExclusion, {
      projectId: primitive(),
    }),
  );

  setProjectId(projectId: string): void {
    this.projectId = projectId;
  }

  get groupId(): string | undefined {
    return this.projectId.split(GAV_DELIMITER)[0];
  }

  get artifactId(): string | undefined {
    return this.projectId.split(GAV_DELIMITER)[1];
  }

  get coordinate(): string {
    return this.projectId;
  }

  get hashCode(): string {
    return hashArray([
      SDLC_HASH_STRUCTURE.PROJECT_DEPENDENCY_EXCLUSION,
      this.projectId,
    ]);
  }

  static fromCoordinate(coordinate: string): ProjectDependencyExclusion {
    return new ProjectDependencyExclusion(guaranteeNonNullable(coordinate));
  }
}
