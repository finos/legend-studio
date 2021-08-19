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

import { list, primitive, createModelSchema } from 'serializr';
import { SerializationFactory } from '@finos/legend-shared';

// TODO: consider removing this when SDLC finally get rid of project type and environment flags
export enum ProjectType {
  PROTOTYPE = 'PROTOTYPE',
  PRODUCTION = 'PRODUCTION',
}

// TODO: consider removing this when SDLC finally get rid of project type and environment flags
export enum SdlcMode {
  PROD = 'prod',
  UAT = 'uat',
}

export class Project {
  description!: string;
  name!: string;
  projectId!: string;
  projectType!: ProjectType;
  tags: string[] = [];

  static readonly serialization = new SerializationFactory(
    createModelSchema(Project, {
      description: primitive(),
      name: primitive(),
      projectId: primitive(),
      projectType: primitive(),
      tags: list(primitive()),
    }),
  );
}
