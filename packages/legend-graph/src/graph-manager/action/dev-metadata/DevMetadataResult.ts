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

import { SerializationFactory, usingModelSchema } from '@finos/legend-shared';
import { createModelSchema, optional, primitive } from 'serializr';

export class DevMetadataGroupId {
  did: string | undefined;

  static readonly serialization = new SerializationFactory(
    createModelSchema(DevMetadataGroupId, {
      did: optional(primitive()),
    }),
  );
}

export class ProjectDetails {
  groupId!: DevMetadataGroupId | undefined;
  artifactId!: string;
  version!: string;

  static readonly serialization = new SerializationFactory(
    createModelSchema(ProjectDetails, {
      groupId: usingModelSchema(DevMetadataGroupId.serialization.schema),
      artifactId: primitive(),
      version: primitive(),
    }),
  );
}

export enum DevMetadataDeploymentStatus {
  SUCCESS = 'SUCCESS',
  FAILURE = 'FAILURE',
}

export class DevMetadataResult {
  projectDetails!: ProjectDetails;
  deploymentStatus!: string;

  static readonly serialization = new SerializationFactory(
    createModelSchema(DevMetadataResult, {
      projectDetails: usingModelSchema(ProjectDetails.serialization.schema),
      deploymentStatus: primitive(),
    }),
  );
}
