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
import {
  list,
  primitive,
  createModelSchema,
  optional,
  object,
} from 'serializr';

class PlatformsVersion {
  propertyName!: string;
  value!: string;
  projectVersionId!: string;
}

createModelSchema(PlatformsVersion, {
  propertyName: primitive(),
  value: primitive(),
  projectVersionId: primitive(),
});

class Dependency {
  groupId!: string;
  artifactid!: string;
  versionId!: string;
}

createModelSchema(Dependency, {
  groupId: primitive(),
  artifactid: primitive(),
  versionId: primitive(),
});

export class ProjectVersionPlatformDependency {
  groupId!: string;
  artifactId!: string;
  versionId!: string;
  platformsVersionSpecific?: string[] | undefined;
  platformsVersion: PlatformsVersion[] | undefined;
  dependency!: {
    groupId: string;
    artifactid: string;
    versionId: string;
  };
  projectId?: string | undefined;

  static readonly serialization = new SerializationFactory(
    createModelSchema(ProjectVersionPlatformDependency, {
      groupId: primitive(),
      artifactId: primitive(),
      versionId: primitive(),
      platformsVersionSpecific: optional(list(primitive())),
      platformsVersion: optional(list(object(PlatformsVersion))),
      dependency: optional(object(Dependency)),
      projectId: optional(primitive()),
    }),
  );
}
