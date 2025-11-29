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

import { list, createModelSchema, primitive, raw, optional } from 'serializr';
import { SerializationFactory } from '@finos/legend-shared';
import { type Entity, generateGAVCoordinates } from '@finos/legend-storage';

export interface ProjectDependencyExclusionCoordinates {
  groupId: string;
  artifactId: string;
}

export class ProjectDependencyCoordinates {
  groupId: string;
  artifactId: string;
  versionId: string;
  exclusions?: ProjectDependencyExclusionCoordinates[] | undefined;

  constructor(
    groupId: string,
    artifactId: string,
    versionId: string,
    exclusions?: ProjectDependencyExclusionCoordinates[] | undefined,
  ) {
    this.groupId = groupId;
    this.artifactId = artifactId;
    this.versionId = versionId;
    this.exclusions = exclusions;
  }

  static readonly serialization = new SerializationFactory(
    createModelSchema(ProjectDependencyCoordinates, {
      groupId: primitive(),
      artifactId: primitive(),
      versionId: primitive(),
      exclusions: optional(list(raw())),
    }),
  );
}

export class ProjectVersionEntities {
  groupId!: string;
  artifactId!: string;
  versionId!: string;
  entities: Entity[] = [];

  static readonly serialization = new SerializationFactory(
    createModelSchema(ProjectVersionEntities, {
      groupId: primitive(),
      artifactId: primitive(),
      versionId: primitive(),
      entities: list(raw()),
    }),
  );

  get id(): string {
    return generateGAVCoordinates(this.groupId, this.artifactId, undefined);
  }
}
