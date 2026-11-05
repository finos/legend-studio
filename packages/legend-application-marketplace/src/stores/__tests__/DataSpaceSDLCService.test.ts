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

import { beforeEach, describe, expect, jest, test } from '@jest/globals';
import { unitTest } from '@finos/legend-shared/test';
import type { PlainObject } from '@finos/legend-shared';
import type { Entity } from '@finos/legend-storage';
import {
  type Review,
  type ReviewApproval,
  type Revision,
  type Workspace,
  AuthorizableProjectAction,
  EntityChangeType,
  ReviewState,
  SDLCServerClient,
  WorkspaceType,
} from '@finos/legend-server-sdlc';
import { DataSpaceSDLCService } from '../sdlc/DataSpaceSDLCService.js';

const PROJECT_ID = 'PROD-1';
const DATA_SPACE_PATH = 'model::TestDataSpace';
const OTHER_DATA_SPACE_PATH = 'model::OtherDataSpace';
const DATA_SPACE_CLASSIFIER_PATH =
  'meta::pure::metamodel::dataSpace::DataSpace';

const buildDataSpaceEntity = (
  path: string,
  description: string,
): PlainObject<Entity> => ({
  path,
  classifierPath: DATA_SPACE_CLASSIFIER_PATH,
  content: { _type: 'dataSpace', description },
});

const withDescription = (entity: Entity, description: string): Entity => ({
  ...entity,
  content: { ...entity.content, description },
});

const getDescription = (entity: PlainObject<Entity> | Entity | undefined) =>
  (entity?.content as { description?: string } | undefined)?.description;

const UPDATE_OPTIONS = {
  message: 'update description',
  reviewTitle: 'Update TestDataSpace',
};

class TEST__SDLCServer {
  readonly client = new SDLCServerClient({
    env: 'test',
    serverUrl: 'https://test-sdlc-url/api',
  });
  readonly masterEntities = new Map<string, PlainObject<Entity>>();
  readonly workspaceEntities = new Map<string, PlainObject<Entity>>();
  readonly reviews = new Map<string, PlainObject<Review>>();
  private reviewCounter = 0;

  readonly isAuthorized = jest.spyOn(this.client, 'isAuthorized');
  readonly getAutorizedActions = jest.spyOn(this.client, 'getAutorizedActions');
  readonly getEntity = jest.spyOn(this.client, 'getEntity');
  readonly createWorkspace = jest.spyOn(this.client, 'createWorkspace');
  readonly deleteWorkspace = jest.spyOn(this.client, 'deleteWorkspace');
  readonly performEntityChanges = jest.spyOn(
    this.client,
    'performEntityChanges',
  );
  readonly createReview = jest.spyOn(this.client, 'createReview');
  readonly getReview = jest.spyOn(this.client, 'getReview');

  constructor() {
    this.masterEntities.set(
      DATA_SPACE_PATH,
      buildDataSpaceEntity(DATA_SPACE_PATH, 'master'),
    );
    this.masterEntities.set(
      OTHER_DATA_SPACE_PATH,
      buildDataSpaceEntity(OTHER_DATA_SPACE_PATH, 'master'),
    );
    this.isAuthorized.mockResolvedValue(true);
    this.getAutorizedActions.mockResolvedValue([
      AuthorizableProjectAction.CREATE_WORKSPACE,
    ]);
    this.getEntity.mockImplementation(async (_projectId, workspace, path) =>
      this.readEntity(workspace?.workspaceId, path),
    );
    this.createWorkspace.mockImplementation(
      async (projectId, _patch, workspaceId) => {
        this.masterEntities.forEach((entity, path) =>
          this.workspaceEntities.set(`${workspaceId}::${path}`, entity),
        );
        return { projectId, workspaceId };
      },
    );
    this.deleteWorkspace.mockResolvedValue({});
    this.performEntityChanges.mockImplementation(
      async (_projectId, workspace, command) => {
        command.entityChanges.forEach((change) =>
          this.workspaceEntities.set(
            `${(workspace as Workspace).workspaceId}::${change.entityPath}`,
            {
              path: change.entityPath,
              classifierPath: change.classifierPath,
              content: change.content,
            },
          ),
        );
        return {} as PlainObject<Revision>;
      },
    );
    this.createReview.mockImplementation(
      async (_projectId, _patch, command) => {
        this.reviewCounter += 1;
        const review = {
          id: String(this.reviewCounter),
          state: ReviewState.OPEN,
          author: { userId: 'user', name: 'User' },
          title: command.title,
          projectId: PROJECT_ID,
          workspaceId: command.workspaceId,
          webURL: `https://gitlab.test/merge_requests/${this.reviewCounter}`,
          createdAt: new Date(0).toISOString(),
          workspaceType: command.workspaceType,
        };
        this.reviews.set(review.id, review);
        return review;
      },
    );
    this.getReview.mockImplementation(
      async (_projectId, _patch, reviewId) =>
        this.reviews.get(reviewId) as unknown as PlainObject<ReviewApproval>,
    );
  }

  setReviewState(reviewId: string, state: ReviewState): void {
    this.reviews.set(reviewId, { ...this.reviews.get(reviewId), state });
  }

  private readEntity(
    workspaceId: string | undefined,
    path: string,
  ): PlainObject<Entity> {
    const entity = workspaceId
      ? this.workspaceEntities.get(`${workspaceId}::${path}`)
      : this.masterEntities.get(path);
    if (!entity) {
      throw new Error(`Entity ${path} not found`);
    }
    return entity;
  }
}

let server: TEST__SDLCServer;
let service: DataSpaceSDLCService;

beforeEach(() => {
  server = new TEST__SDLCServer();
  service = new DataSpaceSDLCService(server.client);
});

describe(unitTest('DataSpaceSDLCService - workspace entitlement'), () => {
  test('checks each project once per session and retries a failed check', async () => {
    server.getAutorizedActions.mockRejectedValueOnce(new Error('unavailable'));

    await expect(service.canCreateWorkspace(PROJECT_ID)).rejects.toThrow(
      'unavailable',
    );
    await expect(service.canCreateWorkspace(PROJECT_ID)).resolves.toBe(true);
    await service.canCreateWorkspace(PROJECT_ID);
    expect(server.getAutorizedActions).toHaveBeenCalledTimes(2);
  });
});

describe(unitTest('DataSpaceSDLCService - data space updates'), () => {
  test('reads the data space from master until a merge request is opened, then from its workspace', async () => {
    expect(
      getDescription(
        await service.getDataSpaceEntity(PROJECT_ID, DATA_SPACE_PATH),
      ),
    ).toBe('master');
    expect(server.getEntity).toHaveBeenLastCalledWith(
      PROJECT_ID,
      undefined,
      DATA_SPACE_PATH,
    );

    await service.updateDataSpace(
      PROJECT_ID,
      DATA_SPACE_PATH,
      (entity) => withDescription(entity, 'updated'),
      UPDATE_OPTIONS,
    );

    expect(
      getDescription(
        await service.getDataSpaceEntity(PROJECT_ID, DATA_SPACE_PATH),
      ),
    ).toBe('updated');
  });

  test('rejects an entity that is not a data space', async () => {
    server.masterEntities.set(DATA_SPACE_PATH, {
      path: DATA_SPACE_PATH,
      classifierPath: 'meta::pure::metamodel::type::Class',
      content: {},
    });

    await expect(
      service.getDataSpaceEntity(PROJECT_ID, DATA_SPACE_PATH),
    ).rejects.toThrow(
      `Entity '${DATA_SPACE_PATH}' is not data space '${DATA_SPACE_PATH}'`,
    );
  });

  test('opens a merge request to master with the updated data space', async () => {
    const result = await service.updateDataSpace(
      PROJECT_ID,
      DATA_SPACE_PATH,
      (entity) => withDescription(entity, 'updated'),
      { ...UPDATE_OPTIONS, workspaceIdPrefix: 'legend-ai' },
    );

    const workspaceId = result.workspace.workspaceId;
    expect(workspaceId).toMatch(/^legend-ai-TestDataSpace-[0-9a-f]{8}$/);
    expect(server.createWorkspace).toHaveBeenCalledWith(
      PROJECT_ID,
      undefined,
      workspaceId,
      WorkspaceType.GROUP,
    );
    expect(server.performEntityChanges).toHaveBeenCalledWith(
      PROJECT_ID,
      result.workspace,
      {
        message: 'update description',
        entityChanges: [
          {
            classifierPath: DATA_SPACE_CLASSIFIER_PATH,
            entityPath: DATA_SPACE_PATH,
            content: { _type: 'dataSpace', description: 'updated' },
            type: EntityChangeType.MODIFY,
          },
        ],
      },
    );
    expect(server.createReview).toHaveBeenCalledWith(PROJECT_ID, undefined, {
      workspaceId,
      workspaceType: WorkspaceType.GROUP,
      title: 'Update TestDataSpace',
      description: `Changes to data space ${DATA_SPACE_PATH} from Legend Marketplace`,
    });
    expect(result.isNewReview).toBe(true);
    expect(result.review.webURL).toBe('https://gitlab.test/merge_requests/1');
    expect(getDescription(result.dataSpaceEntity)).toBe('updated');
    expect(getDescription(server.masterEntities.get(DATA_SPACE_PATH))).toBe(
      'master',
    );
    expect((await service.getOpenReview(PROJECT_ID, DATA_SPACE_PATH))?.id).toBe(
      '1',
    );
  });

  test('builds later updates in the session on top of the same merge request', async () => {
    const first = await service.updateDataSpace(
      PROJECT_ID,
      DATA_SPACE_PATH,
      (entity) => withDescription(entity, 'first'),
      UPDATE_OPTIONS,
    );
    const update = jest.fn((entity: Entity) =>
      withDescription(entity, `${getDescription(entity)}, second`),
    );

    const second = await service.updateDataSpace(
      PROJECT_ID,
      DATA_SPACE_PATH,
      update,
      UPDATE_OPTIONS,
    );

    expect(getDescription(update.mock.calls[0]?.[0])).toBe('first');
    expect(second.isNewReview).toBe(false);
    expect(second.workspace.workspaceId).toBe(first.workspace.workspaceId);
    expect(second.review.id).toBe(first.review.id);
    expect(getDescription(second.dataSpaceEntity)).toBe('first, second');
    expect(server.createWorkspace).toHaveBeenCalledTimes(1);
    expect(server.createReview).toHaveBeenCalledTimes(1);
  });

  test('keeps a separate merge request for each data space', async () => {
    await service.updateDataSpace(
      PROJECT_ID,
      DATA_SPACE_PATH,
      (entity) => withDescription(entity, 'updated'),
      UPDATE_OPTIONS,
    );

    const result = await service.updateDataSpace(
      PROJECT_ID,
      OTHER_DATA_SPACE_PATH,
      (entity) => withDescription(entity, 'updated'),
      UPDATE_OPTIONS,
    );

    expect(result.isNewReview).toBe(true);
    expect(result.review.id).toBe('2');
  });

  test.each([ReviewState.COMMITTED, ReviewState.CLOSED])(
    'opens a new merge request from master once the previous one is %s',
    async (state) => {
      await service.updateDataSpace(
        PROJECT_ID,
        DATA_SPACE_PATH,
        (entity) => withDescription(entity, 'first'),
        UPDATE_OPTIONS,
      );
      server.setReviewState('1', state);
      const update = jest.fn((entity: Entity) =>
        withDescription(entity, 'second'),
      );

      const result = await service.updateDataSpace(
        PROJECT_ID,
        DATA_SPACE_PATH,
        update,
        UPDATE_OPTIONS,
      );

      expect(getDescription(update.mock.calls[0]?.[0])).toBe('master');
      expect(result.isNewReview).toBe(true);
      expect(result.review.id).toBe('2');
    },
  );

  test('opens a new merge request when the previous one can no longer be found', async () => {
    await service.updateDataSpace(
      PROJECT_ID,
      DATA_SPACE_PATH,
      (entity) => withDescription(entity, 'first'),
      UPDATE_OPTIONS,
    );
    server.getReview.mockRejectedValueOnce(new Error('Not found'));

    await expect(
      service.getOpenReview(PROJECT_ID, DATA_SPACE_PATH),
    ).resolves.toBeUndefined();
  });

  test.each([
    [
      'the update fails',
      (): void => undefined,
      (): Entity => {
        throw new Error('update failed');
      },
      'update failed',
    ],
    [
      'the commit fails',
      (): void => {
        server.performEntityChanges.mockRejectedValueOnce(
          new Error('commit failed'),
        );
      },
      (entity: Entity): Entity => withDescription(entity, 'updated'),
      'commit failed',
    ],
    [
      'the merge request cannot be created',
      (): void => {
        server.createReview.mockRejectedValueOnce(new Error('review failed'));
      },
      (entity: Entity): Entity => withDescription(entity, 'updated'),
      'review failed',
    ],
  ])(
    'deletes the new workspace when %s',
    async (_scenario, arrange, update, message) => {
      arrange();

      await expect(
        service.updateDataSpace(
          PROJECT_ID,
          DATA_SPACE_PATH,
          update,
          UPDATE_OPTIONS,
        ),
      ).rejects.toThrow(message);
      expect(server.deleteWorkspace).toHaveBeenCalledTimes(1);
      await expect(
        service.getOpenReview(PROJECT_ID, DATA_SPACE_PATH),
      ).resolves.toBeUndefined();
    },
  );

  test('keeps the merge request when a later update fails', async () => {
    await service.updateDataSpace(
      PROJECT_ID,
      DATA_SPACE_PATH,
      (entity) => withDescription(entity, 'first'),
      UPDATE_OPTIONS,
    );
    server.performEntityChanges.mockRejectedValueOnce(
      new Error('commit failed'),
    );

    await expect(
      service.updateDataSpace(
        PROJECT_ID,
        DATA_SPACE_PATH,
        (entity) => withDescription(entity, 'second'),
        UPDATE_OPTIONS,
      ),
    ).rejects.toThrow('commit failed');
    expect(server.deleteWorkspace).not.toHaveBeenCalled();
    expect((await service.getOpenReview(PROJECT_ID, DATA_SPACE_PATH))?.id).toBe(
      '1',
    );
  });

  test('rejects an update that makes no changes', async () => {
    await expect(
      service.updateDataSpace(
        PROJECT_ID,
        DATA_SPACE_PATH,
        (entity) => entity,
        UPDATE_OPTIONS,
      ),
    ).rejects.toThrow(
      `No changes to commit for data space '${DATA_SPACE_PATH}'`,
    );
    expect(server.performEntityChanges).not.toHaveBeenCalled();
  });

  test('rejects an update that returns a different element', async () => {
    await expect(
      service.updateDataSpace(
        PROJECT_ID,
        DATA_SPACE_PATH,
        (entity) => ({ ...entity, path: OTHER_DATA_SPACE_PATH }),
        UPDATE_OPTIONS,
      ),
    ).rejects.toThrow(
      `Entity '${OTHER_DATA_SPACE_PATH}' is not data space '${DATA_SPACE_PATH}'`,
    );
    expect(server.performEntityChanges).not.toHaveBeenCalled();
  });
});
