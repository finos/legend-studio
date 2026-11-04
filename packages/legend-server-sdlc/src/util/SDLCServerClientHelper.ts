/**
 * Copyright (c) 2026-present, Goldman Sachs
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

import type { PlainObject } from '@finos/legend-shared';
import type { Entity } from '@finos/legend-storage';
import type { SDLCServerClient } from '../SDLCServerClient.js';
import { AuthorizableProjectAction } from '../models/project/ProjectAccess.js';
import { EntityChangeType } from '../models/entity/EntityChange.js';
import { Review } from '../models/review/Review.js';
import { Workspace, WorkspaceType } from '../models/workspace/Workspace.js';

export class SDLCServerClientHelper {
  static async canCreateWorkspace(
    sdlcServerClient: SDLCServerClient,
    projectId: string,
  ): Promise<boolean> {
    if (!(await sdlcServerClient.isAuthorized())) {
      return false;
    }
    return (await sdlcServerClient.getAutorizedActions(projectId)).includes(
      AuthorizableProjectAction.CREATE_WORKSPACE,
    );
  }

  static async createGroupWorkspace(
    sdlcServerClient: SDLCServerClient,
    projectId: string,
    workspaceId: string,
  ): Promise<Workspace> {
    return Workspace.serialization.fromJson(
      await sdlcServerClient.createWorkspace(
        projectId,
        undefined,
        workspaceId,
        WorkspaceType.GROUP,
      ),
    );
  }

  static async getEntity(
    sdlcServerClient: SDLCServerClient,
    projectId: string,
    workspace: Workspace | undefined,
    entityPath: string,
  ): Promise<Entity> {
    return (await sdlcServerClient.getEntity(
      projectId,
      workspace,
      entityPath,
    )) as unknown as Entity;
  }

  static async modifyEntity(
    sdlcServerClient: SDLCServerClient,
    workspace: Workspace,
    entity: Entity,
    message: string,
  ): Promise<void> {
    await sdlcServerClient.performEntityChanges(
      workspace.projectId,
      workspace,
      {
        message,
        entityChanges: [
          {
            classifierPath: entity.classifierPath,
            entityPath: entity.path,
            content: entity.content,
            type: EntityChangeType.MODIFY,
          },
        ],
      },
    );
  }

  static async createReview(
    sdlcServerClient: SDLCServerClient,
    workspace: Workspace,
    title: string,
    description: string,
  ): Promise<Review> {
    return Review.serialization.fromJson(
      await sdlcServerClient.createReview(workspace.projectId, undefined, {
        workspaceId: workspace.workspaceId,
        workspaceType: workspace.workspaceType,
        title,
        description,
      }),
    );
  }

  static async getReview(
    sdlcServerClient: SDLCServerClient,
    projectId: string,
    reviewId: string,
  ): Promise<Review> {
    return Review.serialization.fromJson(
      (await sdlcServerClient.getReview(
        projectId,
        undefined,
        reviewId,
      )) as unknown as PlainObject<Review>,
    );
  }
}
