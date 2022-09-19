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

import { SerializationFactory } from '@finos/legend-shared';
import { createModelSchema, list, object, primitive } from 'serializr';

export class ProjectVersionConflict {
  groupId!: string;
  artifactId!: string;
  conflictPaths: string[] = [];
  versions: string[] = [];

  static readonly serialization = new SerializationFactory(
    createModelSchema(ProjectVersionConflict, {
      groupId: primitive(),
      artifactId: primitive(),
      conflictPaths: list(primitive()),
      versions: list(primitive()),
    }),
  );
}

export class ProjectVersionDependencies {
  groupId!: string;
  artifactId!: string;
  versionId!: string;
  path!: string;
  dependencies: ProjectVersionDependencies[] = [];

  static readonly serialization = new SerializationFactory(
    createModelSchema(ProjectVersionDependencies, {
      groupId: primitive(),
      artifactId: primitive(),
      versionId: primitive(),
      path: primitive(),
      dependencies: list(object(ProjectVersionDependencies)),
    }),
  );
}

export class ProjectDependencyInfo {
  tree: ProjectVersionDependencies[] = [];
  conflicts: ProjectVersionConflict[] = [];

  static readonly serialization = new SerializationFactory(
    createModelSchema(ProjectDependencyInfo, {
      tree: list(object(ProjectVersionDependencies)),
      conflicts: list(object(ProjectVersionConflict)),
    }),
  );
}
