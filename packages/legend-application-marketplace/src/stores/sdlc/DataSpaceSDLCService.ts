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

import {
  type Review,
  type SDLCServerClient,
  type Workspace,
  ReviewState,
  SDLCServerClientHelper,
} from '@finos/legend-server-sdlc';
import { assertErrorThrown, assertTrue, uuid } from '@finos/legend-shared';
import type { Entity } from '@finos/legend-storage';
import { extractElementNameFromPath } from '@finos/legend-graph';
import { DATA_SPACE_ELEMENT_CLASSIFIER_PATH } from '@finos/legend-extension-dsl-data-space/graph';

const WORKSPACE_ID_SUFFIX_LENGTH = 8;
const DEFAULT_WORKSPACE_ID_PREFIX = 'update';

export type DataSpaceEntityUpdater = (
  dataSpaceEntity: Entity,
) => Entity | Promise<Entity>;

export interface DataSpaceUpdateOptions {
  message: string;
  reviewTitle: string;
  reviewDescription?: string | undefined;
  workspaceIdPrefix?: string | undefined;
}

export interface DataSpaceUpdateResult {
  workspace: Workspace;
  review: Review;
  dataSpaceEntity: Entity;
  isNewReview: boolean;
}

type DataSpaceReviewSession = {
  workspace: Workspace;
  review: Review;
};

const getSessionKey = (projectId: string, dataSpacePath: string): string =>
  `${projectId}::${dataSpacePath}`;

const assertDataSpaceEntity = (entity: Entity, dataSpacePath: string): void =>
  assertTrue(
    entity.path === dataSpacePath &&
      entity.classifierPath === DATA_SPACE_ELEMENT_CLASSIFIER_PATH,
    `Entity '${entity.path}' is not data space '${dataSpacePath}'`,
  );

export class DataSpaceSDLCService {
  readonly sdlcServerClient: SDLCServerClient;
  private readonly sessions = new Map<string, DataSpaceReviewSession>();
  private readonly canCreateWorkspaceChecks = new Map<
    string,
    Promise<boolean>
  >();

  constructor(sdlcServerClient: SDLCServerClient) {
    this.sdlcServerClient = sdlcServerClient;
  }

  canCreateWorkspace(projectId: string): Promise<boolean> {
    const existingCheck = this.canCreateWorkspaceChecks.get(projectId);
    if (existingCheck) {
      return existingCheck;
    }
    const check = SDLCServerClientHelper.canCreateWorkspace(
      this.sdlcServerClient,
      projectId,
    );
    this.canCreateWorkspaceChecks.set(projectId, check);
    check.catch(() => this.canCreateWorkspaceChecks.delete(projectId));
    return check;
  }

  async getOpenReview(
    projectId: string,
    dataSpacePath: string,
  ): Promise<Review | undefined> {
    return (await this.getOpenSession(projectId, dataSpacePath))?.review;
  }

  async getDataSpaceEntity(
    projectId: string,
    dataSpacePath: string,
  ): Promise<Entity> {
    const session = await this.getOpenSession(projectId, dataSpacePath);
    return this.fetchDataSpaceEntity(
      projectId,
      session?.workspace,
      dataSpacePath,
    );
  }

  async updateDataSpace(
    projectId: string,
    dataSpacePath: string,
    update: DataSpaceEntityUpdater,
    options: DataSpaceUpdateOptions,
  ): Promise<DataSpaceUpdateResult> {
    const session = await this.getOpenSession(projectId, dataSpacePath);
    if (session) {
      const dataSpaceEntity = await this.applyUpdate(
        session.workspace,
        dataSpacePath,
        update,
        options.message,
      );
      return { ...session, dataSpaceEntity, isNewReview: false };
    }

    const workspace = await SDLCServerClientHelper.createGroupWorkspace(
      this.sdlcServerClient,
      projectId,
      `${options.workspaceIdPrefix ?? DEFAULT_WORKSPACE_ID_PREFIX}-${extractElementNameFromPath(dataSpacePath)}-${uuid().substring(0, WORKSPACE_ID_SUFFIX_LENGTH)}`,
    );
    try {
      const dataSpaceEntity = await this.applyUpdate(
        workspace,
        dataSpacePath,
        update,
        options.message,
      );
      const review = await SDLCServerClientHelper.createReview(
        this.sdlcServerClient,
        workspace,
        options.reviewTitle,
        options.reviewDescription ??
          `Changes to data space ${dataSpacePath} from Legend Marketplace`,
      );
      this.sessions.set(getSessionKey(projectId, dataSpacePath), {
        workspace,
        review,
      });
      return { workspace, review, dataSpaceEntity, isNewReview: true };
    } catch (error) {
      assertErrorThrown(error);
      await this.sdlcServerClient
        .deleteWorkspace(projectId, workspace)
        .catch(() => undefined);
      throw error;
    }
  }

  private async getOpenSession(
    projectId: string,
    dataSpacePath: string,
  ): Promise<DataSpaceReviewSession | undefined> {
    const sessionKey = getSessionKey(projectId, dataSpacePath);
    const session = this.sessions.get(sessionKey);
    if (!session) {
      return undefined;
    }
    try {
      const review = await SDLCServerClientHelper.getReview(
        this.sdlcServerClient,
        projectId,
        session.review.id,
      );
      if (review.state === ReviewState.OPEN) {
        return { ...session, review };
      }
    } catch (error) {
      assertErrorThrown(error);
    }
    this.sessions.delete(sessionKey);
    return undefined;
  }

  private async fetchDataSpaceEntity(
    projectId: string,
    workspace: Workspace | undefined,
    dataSpacePath: string,
  ): Promise<Entity> {
    const entity = await SDLCServerClientHelper.getEntity(
      this.sdlcServerClient,
      projectId,
      workspace,
      dataSpacePath,
    );
    assertDataSpaceEntity(entity, dataSpacePath);
    return entity;
  }

  private async applyUpdate(
    workspace: Workspace,
    dataSpacePath: string,
    update: DataSpaceEntityUpdater,
    message: string,
  ): Promise<Entity> {
    const dataSpaceEntity = await this.fetchDataSpaceEntity(
      workspace.projectId,
      workspace,
      dataSpacePath,
    );
    const updatedEntity = await update(dataSpaceEntity);
    assertDataSpaceEntity(updatedEntity, dataSpacePath);
    assertTrue(
      JSON.stringify(updatedEntity.content) !==
        JSON.stringify(dataSpaceEntity.content),
      `No changes to commit for data space '${dataSpacePath}'`,
    );
    await SDLCServerClientHelper.modifyEntity(
      this.sdlcServerClient,
      workspace,
      updatedEntity,
      message,
    );
    return updatedEntity;
  }
}
