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

import { afterEach, describe, expect, jest, test } from '@jest/globals';
import { unitTest } from '@finos/legend-shared/test';
import { type PlainObject, TracerService } from '@finos/legend-shared';
import { SDLCServerClient } from '../../SDLCServerClient.js';
import { SDLCServerClientHelper } from '../SDLCServerClientHelper.js';
import { AuthorizableProjectAction } from '../../models/project/ProjectAccess.js';
import { EntityChangeType } from '../../models/entity/EntityChange.js';
import type { Review } from '../../models/review/Review.js';
import type { ReviewApproval } from '../../models/review/ReviewApproval.js';
import { Workspace, WorkspaceType } from '../../models/workspace/Workspace.js';

const SERVER_URL = 'https://test-sdlc-url/api';
const PROJECT_ID = 'PROD-1';
const ENTITY = {
  path: 'model::TestDataSpace',
  classifierPath: 'meta::pure::metamodel::dataSpace::DataSpace',
  content: { _type: 'dataSpace' },
};
const REVIEW: PlainObject<Review> = {
  id: '1',
  state: 'OPEN',
  author: { userId: 'user', name: 'User' },
  title: 'Update TestDataSpace',
  projectId: PROJECT_ID,
  workspaceId: 'feature',
  webURL: 'https://gitlab.test/merge_requests/1',
  createdAt: new Date(0).toISOString(),
  workspaceType: WorkspaceType.GROUP,
};

const createClient = (): SDLCServerClient => {
  const client = new SDLCServerClient({ env: 'test', serverUrl: SERVER_URL });
  client.setTracerService(new TracerService());
  return client;
};

const groupWorkspace = Workspace.serialization.fromJson({
  projectId: PROJECT_ID,
  workspaceId: 'feature',
});

afterEach(() => {
  jest.restoreAllMocks();
});

describe(unitTest('SDLCServerClientHelper'), () => {
  test.each([
    [true, [AuthorizableProjectAction.CREATE_WORKSPACE], true],
    [true, [AuthorizableProjectAction.SUBMIT_REVIEW], false],
    [false, [AuthorizableProjectAction.CREATE_WORKSPACE], false],
  ])(
    'a user signed in: %s with authorized actions %j can create a workspace: %s',
    async (isAuthorized, actions, expected) => {
      const client = createClient();
      jest.spyOn(client, 'isAuthorized').mockResolvedValue(isAuthorized);
      const getAutorizedActions = jest
        .spyOn(client, 'getAutorizedActions')
        .mockResolvedValue(actions);

      await expect(
        SDLCServerClientHelper.canCreateWorkspace(client, PROJECT_ID),
      ).resolves.toBe(expected);
      expect(getAutorizedActions).toHaveBeenCalledTimes(isAuthorized ? 1 : 0);
    },
  );

  test('creates a group workspace', async () => {
    const client = createClient();
    const createWorkspace = jest
      .spyOn(client, 'createWorkspace')
      .mockResolvedValue({ projectId: PROJECT_ID, workspaceId: 'feature' });

    const workspace = await SDLCServerClientHelper.createGroupWorkspace(
      client,
      PROJECT_ID,
      'feature',
    );

    expect(createWorkspace).toHaveBeenCalledWith(
      PROJECT_ID,
      undefined,
      'feature',
      WorkspaceType.GROUP,
    );
    expect(workspace).toBeInstanceOf(Workspace);
    expect(workspace.workspaceType).toBe(WorkspaceType.GROUP);
  });

  test.each([
    [undefined, `${SERVER_URL}/projects/${PROJECT_ID}/entities/${ENTITY.path}`],
    [
      groupWorkspace,
      `${SERVER_URL}/projects/${PROJECT_ID}/groupWorkspaces/feature/entities/${ENTITY.path}`,
    ],
  ])('reads an entity from workspace %j', async (workspace, expectedUrl) => {
    const fetchSpy = jest.spyOn(globalThis, 'fetch').mockResolvedValue({
      ok: true,
      status: 200,
      json: () => Promise.resolve(ENTITY),
    } as Response);

    await expect(
      SDLCServerClientHelper.getEntity(
        createClient(),
        PROJECT_ID,
        workspace,
        ENTITY.path,
      ),
    ).resolves.toEqual(ENTITY);
    expect(String(fetchSpy.mock.calls[0]?.[0])).toBe(expectedUrl);
  });

  test('commits an entity modification to a workspace', async () => {
    const client = createClient();
    const performEntityChanges = jest
      .spyOn(client, 'performEntityChanges')
      .mockResolvedValue(undefined);

    await SDLCServerClientHelper.modifyEntity(
      client,
      groupWorkspace,
      ENTITY,
      'update data space',
    );

    expect(performEntityChanges).toHaveBeenCalledWith(
      PROJECT_ID,
      groupWorkspace,
      {
        message: 'update data space',
        entityChanges: [
          {
            classifierPath: ENTITY.classifierPath,
            entityPath: ENTITY.path,
            content: ENTITY.content,
            type: EntityChangeType.MODIFY,
          },
        ],
      },
    );
  });

  test('creates a review for a workspace and reads it back', async () => {
    const client = createClient();
    const createReview = jest
      .spyOn(client, 'createReview')
      .mockResolvedValue(REVIEW);
    jest
      .spyOn(client, 'getReview')
      .mockResolvedValue(REVIEW as unknown as PlainObject<ReviewApproval>);

    const review = await SDLCServerClientHelper.createReview(
      client,
      groupWorkspace,
      'Update TestDataSpace',
      'description',
    );

    expect(createReview).toHaveBeenCalledWith(PROJECT_ID, undefined, {
      workspaceId: 'feature',
      workspaceType: WorkspaceType.GROUP,
      title: 'Update TestDataSpace',
      description: 'description',
    });
    expect(review.webURL).toBe(REVIEW.webURL);
    expect(
      (await SDLCServerClientHelper.getReview(client, PROJECT_ID, '1')).id,
    ).toBe('1');
  });
});
