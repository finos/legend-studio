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

import { ProjectDependency } from './ProjectDependency.js';
import { ProjectStructureVersion } from './ProjectStructureVersion.js';
import { createModelSchema, list, primitive } from 'serializr';
import { SerializationFactory, usingModelSchema } from '@finos/legend-shared';

export class UpdateProjectConfigurationCommand {
  artifactId: string;
  groupId: string;
  message: string;
  projectDependenciesToAdd?: ProjectDependency[];
  projectDependenciesToRemove?: ProjectDependency[];
  projectStructureVersion: ProjectStructureVersion;

  constructor(
    groupId: string,
    artifactId: string,
    projectStructureVersion: ProjectStructureVersion,
    message: string,
  ) {
    this.groupId = groupId;
    this.artifactId = artifactId;
    this.projectStructureVersion = projectStructureVersion;
    this.message = message;
  }

  static readonly serialization = new SerializationFactory(
    createModelSchema(UpdateProjectConfigurationCommand, {
      artifactId: primitive(),
      groupId: primitive(),
      message: primitive(),
      projectDependenciesToAdd: list(
        usingModelSchema(ProjectDependency.serialization.schema),
      ),
      projectDependenciesToRemove: list(
        usingModelSchema(ProjectDependency.serialization.schema),
      ),
      projectStructureVersion: usingModelSchema(
        ProjectStructureVersion.serialization.schema,
      ),
    }),
  );
}
