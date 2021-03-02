/**
 * Copyright 2020 Goldman Sachs
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
import { SerializationFactory } from '@finos/legend-studio-shared';

export const PROJECT_LATEST_VIEWER_WORKSPACE =
  '-PROJECT_LATEST_VIEWER_WORKSPACE';

export enum WORKSPACE_TYPE {
  STANDARD = 'STANDARD',
  CONFLICT_RESOLUTION = 'CONFLICT_RESOLUTION',
  // BACKUP = 'BACKUP',
}

export class Workspace {
  projectId!: string;
  workspaceId!: string;
  userId!: string;
  type = WORKSPACE_TYPE.STANDARD;

  static readonly serialization = new SerializationFactory(
    createModelSchema(Workspace, {
      projectId: primitive(),
      userId: primitive(),
      workspaceId: primitive(),
    }),
  );

  static createProjectLatestViewerWorkspace(projectId: string): Workspace {
    const workspace = new Workspace();
    workspace.projectId = projectId;
    workspace.workspaceId = PROJECT_LATEST_VIEWER_WORKSPACE;
    return workspace;
  }

  get isWorkspaceWithConflictResolution(): boolean {
    return this.type === WORKSPACE_TYPE.CONFLICT_RESOLUTION;
  }

  get selectOption(): WorkspaceSelectOption {
    return {
      label: this.workspaceId,
      value: this.workspaceId,
    };
  }
}

export interface WorkspaceSelectOption {
  label: string;
  value: string;
  __isNew__?: boolean;
}
