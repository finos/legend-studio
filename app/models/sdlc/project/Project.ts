/**
 * Copyright 2020 Goldman Sachs
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *      http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */

import { serializable, list, primitive, object } from 'serializr';

export enum ProjectType {
  PROTOTYPE = 'PROTOTYPE',
  PRODUCTION = 'PRODUCTION'
}

export class Project {
  @serializable description!: string;
  @serializable name!: string;
  @serializable projectId!: string;
  @serializable projectType!: ProjectType;
  @serializable(list(primitive())) tags: string[] = [];

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
  @serializable(object(Project)) project!: Project;
  @serializable reviewId!: string;
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
