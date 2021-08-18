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
import { SerializationFactory, usingModelSchema } from '@finos/legend-shared';

// TODO: consider removing this when SDLC finally get rid of project type and environment flags
export enum ProjectType {
  PROTOTYPE = 'PROTOTYPE',
  PRODUCTION = 'PRODUCTION',
}

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

  get selectOption(): ProjectSelectOption {
    return {
      label: this.name,
      value: this.projectId,
      disabled: false,
      tag: this.projectType,
    };
  }
}

export interface ProjectSelectOption {
  label: string;
  value: string;
  disabled?: boolean;
  tag: string;
}

export class ImportProjectReport {
  project!: Project;
  reviewId!: string;

  static readonly serialization = new SerializationFactory(
    createModelSchema(ImportProjectReport, {
      project: usingModelSchema(Project.serialization.schema),
      reviewId: primitive(),
    }),
  );
}

export interface ImportProjectCommand {
  id: string;
  type: ProjectType;
  groupId: string;
  artifactId: string;
}

export interface CreateProjectCommand {
  name: string;
  description: string;
  type: ProjectType;
  groupId: string;
  artifactId: string;
  tags: string[];
}

export interface UpdateProjectCommand {
  name: string;
  description: string;
  tags: string[];
}
