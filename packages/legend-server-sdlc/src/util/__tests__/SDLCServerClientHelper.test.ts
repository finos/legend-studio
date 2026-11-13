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
import {
  type PlainObject,
  NetworkClientError,
  TracerService,
} from '@finos/legend-shared';
import { SDLCServerClient } from '../../SDLCServerClient.js';
import {
  SDLCServerClientHelper,
  WorkspaceOutdatedError,
} from '../SDLCServerClientHelper.js';
import { AuthorizableProjectAction } from '../../models/project/ProjectAccess.js';
import { EntityChangeType } from '../../models/entity/EntityChange.js';
import type { Review } from '../../models/review/Review.js';
import type { ReviewApproval } from '../../models/review/ReviewApproval.js';
import { Workspace, WorkspaceType } from '../../models/workspace/Workspace.js';
import { RevisionAlias } from '../../models/revision/Revision.js';

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

const httpError = (status: number): NetworkClientError =>
  new NetworkClientError(
    { status, statusText: '', url: SERVER_URL } as Response,
    undefined,
  );

const configuration = (dependencyVersions: string[] = []): PlainObject => ({
  projectId: PROJECT_ID,
  groupId: 'org.test',
  artifactId: 'test',
  projectStructureVersion: { version: 13, extensionVersion: 1 },
  projectDependencies: dependencyVersions.map((versionId, index) => ({
    projectId: `org.test:dep${index}`,
    versionId,
  })),
});

const reviewChecksPass = (client: SDLCServerClient): void => {
  jest
    .spyOn(client, 'projectConfigurationStatus')
    .mockResolvedValue({ projectConfigured: true, reviewIds: [] });
  jest.spyOn(client, 'getProject').mockResolvedValue({
    projectId: PROJECT_ID,
    name: 'test',
    description: '',
    tags: [],
    webUrl: '',
  });
  jest.spyOn(client, 'getConfiguration').mockResolvedValue(configuration());
  jest
    .spyOn(client, 'checkIfWorkspaceIsInConflictResolutionMode')
    .mockResolvedValue(false);
};

describe(unitTest('SDLCServerClientHelper: sign-in'), () => {
  test.each([
    ['a session', true, () => Promise.resolve(true)],
    ['no session', false, () => Promise.resolve(false)],
    ['a 401 from the check', false, () => Promise.reject(httpError(401))],
  ])('with %s, the user is signed in: %s', async (_, expected, check) => {
    const client = createClient();
    jest.spyOn(client, 'isAuthorized').mockImplementation(check);

    await expect(SDLCServerClientHelper.isAuthorized(client)).resolves.toBe(
      expected,
    );
  });

  test('a failing check is not read as signed out', async () => {
    const client = createClient();
    jest.spyOn(client, 'isAuthorized').mockRejectedValue(httpError(500));

    await expect(SDLCServerClientHelper.isAuthorized(client)).rejects.toThrow();
  });

  test('a sign-in url is given only without a session', async () => {
    const client = createClient();
    const isAuthorized = jest.spyOn(client, 'isAuthorized');

    isAuthorized.mockResolvedValue(true);
    await expect(
      SDLCServerClientHelper.getSignInUrl(client, SERVER_URL, 'https://app'),
    ).resolves.toBeUndefined();

    isAuthorized.mockResolvedValue(false);
    await expect(
      SDLCServerClientHelper.getSignInUrl(
        client,
        SERVER_URL,
        'https://app',
        'gitlab',
      ),
    ).resolves.toBe(
      `${SERVER_URL}/auth/authorize?redirect_uri=https://app&client_name=gitlab`,
    );
  });
});

describe(unitTest('SDLCServerClientHelper: review checks'), () => {
  test('a configured, non-sandbox project with released dependencies may be reviewed', async () => {
    const client = createClient();
    reviewChecksPass(client);

    await expect(
      SDLCServerClientHelper.assertCanCreateReview(
        client,
        PROJECT_ID,
        groupWorkspace,
      ),
    ).resolves.toBeUndefined();
  });

  test.each([
    [
      'an unconfigured project',
      (client: SDLCServerClient) =>
        jest
          .spyOn(client, 'projectConfigurationStatus')
          .mockResolvedValue({ projectConfigured: false, reviewIds: [] }),
      'not configured',
    ],
    [
      'a sandbox project',
      (client: SDLCServerClient) =>
        jest.spyOn(client, 'getProject').mockResolvedValue({
          projectId: PROJECT_ID,
          name: 'test',
          description: '',
          tags: ['sandbox'],
          webUrl: '',
        }),
      'sandbox',
    ],
    [
      'a SNAPSHOT dependency',
      (client: SDLCServerClient) =>
        jest
          .spyOn(client, 'getConfiguration')
          .mockResolvedValue(configuration(['1.0.0', 'master-SNAPSHOT'])),
      'org.test:dep1',
    ],
    [
      'a workspace in conflict resolution',
      (client: SDLCServerClient) =>
        jest
          .spyOn(client, 'checkIfWorkspaceIsInConflictResolutionMode')
          .mockResolvedValue(true),
      'conflict resolution',
    ],
  ])('%s is refused', async (_, breakIt, reason) => {
    const client = createClient();
    reviewChecksPass(client);
    breakIt(client);

    await expect(
      SDLCServerClientHelper.assertCanCreateReview(
        client,
        PROJECT_ID,
        groupWorkspace,
      ),
    ).rejects.toThrow(reason);
  });
});

describe(unitTest('SDLCServerClientHelper: workspaces'), () => {
  test.each([
    ['feature', 'feature', WorkspaceType.GROUP],
    ['my-feature', 'my_feature', WorkspaceType.GROUP],
    ['missing', undefined, undefined],
  ])('workspace %s is found as %s (%s)', async (wanted, foundId, foundType) => {
    const client = createClient();
    jest.spyOn(client, 'getWorkspaces').mockResolvedValue([
      { projectId: PROJECT_ID, workspaceId: 'feature', userId: 'user' },
      { projectId: PROJECT_ID, workspaceId: 'feature' },
      { projectId: PROJECT_ID, workspaceId: 'my_feature' },
    ]);

    const found = await SDLCServerClientHelper.findWorkspace(
      client,
      PROJECT_ID,
      wanted,
    );

    expect(found?.workspaceId).toBe(foundId);
    expect(found?.workspaceType).toBe(foundType);
  });

  test('an existing group workspace is reused, a missing one created', async () => {
    const client = createClient();
    const getWorkspace = jest.spyOn(client, 'getWorkspace');
    const createWorkspace = jest
      .spyOn(client, 'createWorkspace')
      .mockResolvedValue({ projectId: PROJECT_ID, workspaceId: 'feature' });

    getWorkspace.mockResolvedValue({
      projectId: PROJECT_ID,
      workspaceId: 'feature',
    });
    await expect(
      SDLCServerClientHelper.getOrCreateGroupWorkspace(
        client,
        PROJECT_ID,
        'feature',
      ),
    ).resolves.toMatchObject({ created: false });
    expect(createWorkspace).not.toHaveBeenCalled();

    getWorkspace.mockRejectedValue(httpError(404));
    await expect(
      SDLCServerClientHelper.getOrCreateGroupWorkspace(
        client,
        PROJECT_ID,
        'feature',
      ),
    ).resolves.toMatchObject({ created: true });
    expect(createWorkspace).toHaveBeenCalledWith(
      PROJECT_ID,
      undefined,
      'feature',
      WorkspaceType.GROUP,
    );
  });

  test('a failing workspace lookup is not read as a missing workspace', async () => {
    const client = createClient();
    jest.spyOn(client, 'getWorkspace').mockRejectedValue(httpError(500));
    const createWorkspace = jest.spyOn(client, 'createWorkspace');

    await expect(
      SDLCServerClientHelper.getOrCreateGroupWorkspace(
        client,
        PROJECT_ID,
        'feature',
      ),
    ).rejects.toThrow();
    expect(createWorkspace).not.toHaveBeenCalled();
  });
});

describe(unitTest('SDLCServerClientHelper: commits and reviews'), () => {
  const CHANGE = {
    type: EntityChangeType.MODIFY,
    entityPath: ENTITY.path,
    classifierPath: ENTITY.classifierPath,
    content: ENTITY.content,
  };

  test('a commit is pinned to the revision given', async () => {
    const client = createClient();
    const performEntityChanges = jest
      .spyOn(client, 'performEntityChanges')
      .mockResolvedValue({ id: 'r2' });

    const made = await SDLCServerClientHelper.commitEntityChanges(
      client,
      groupWorkspace,
      [CHANGE],
      'message',
      'r1',
    );

    expect(made?.id).toBe('r2');
    expect(performEntityChanges).toHaveBeenCalledWith(
      PROJECT_ID,
      groupWorkspace,
      { message: 'message', entityChanges: [CHANGE], revisionId: 'r1' },
    );
  });

  test('a commit to a workspace that moved on is refused as outdated', async () => {
    const client = createClient();
    jest
      .spyOn(client, 'performEntityChanges')
      .mockRejectedValue(httpError(409));

    await expect(
      SDLCServerClientHelper.commitEntityChanges(
        client,
        groupWorkspace,
        [CHANGE],
        'message',
        'r1',
      ),
    ).rejects.toBeInstanceOf(WorkspaceOutdatedError);
  });

  test('the open review is looked up by its workspace', async () => {
    const client = createClient();
    const getReviews = jest
      .spyOn(client, 'getReviews')
      .mockResolvedValue([REVIEW, { ...REVIEW, id: '2', workspaceId: 'x' }]);

    const review = await SDLCServerClientHelper.findOpenReview(
      client,
      groupWorkspace,
    );

    expect(review?.id).toBe('1');
    expect(getReviews).toHaveBeenCalledWith(PROJECT_ID, undefined, {
      state: 'OPEN',
      workspaceIdRegex: '^feature$',
      workspaceTypes: [WorkspaceType.GROUP],
    });
  });

  test('a review opened between the lookup and the create is used', async () => {
    const client = createClient();
    jest
      .spyOn(client, 'getReviews')
      .mockResolvedValueOnce([])
      .mockResolvedValueOnce([REVIEW]);
    jest
      .spyOn(client, 'createReview')
      .mockRejectedValue(
        new Error('Another open merge request already exists'),
      );

    await expect(
      SDLCServerClientHelper.findOrCreateReview(
        client,
        groupWorkspace,
        'title',
        'description',
      ),
    ).resolves.toMatchObject({ review: { id: '1' }, created: false });
  });
});

describe(unitTest('SDLCServerClientHelper: pushToReview'), () => {
  const PUSH = {
    projectId: PROJECT_ID,
    workspaceId: 'feature',
    message: 'message',
    reviewTitle: 'title',
    reviewDescription: 'description',
  };

  const workspaceClient = (exists: boolean): SDLCServerClient => {
    const client = createClient();
    jest
      .spyOn(client, 'getWorkspace')
      .mockImplementation(() =>
        exists
          ? Promise.resolve({ projectId: PROJECT_ID, workspaceId: 'feature' })
          : Promise.reject(httpError(404)),
      );
    jest
      .spyOn(client, 'createWorkspace')
      .mockResolvedValue({ projectId: PROJECT_ID, workspaceId: 'feature' });
    jest.spyOn(client, 'getEntitiesByRevision').mockResolvedValue([ENTITY]);
    jest.spyOn(client, 'getRevision').mockResolvedValue({ id: 'r1' });
    jest.spyOn(client, 'getReviews').mockResolvedValue([]);
    jest.spyOn(client, 'createReview').mockResolvedValue(REVIEW);
    return client;
  };

  test('commits what changed, pinned to the revision it was worked out from, and opens a review', async () => {
    const client = workspaceClient(false);
    const performEntityChanges = jest
      .spyOn(client, 'performEntityChanges')
      .mockResolvedValue({ id: 'r2' });
    const seen: unknown[] = [];

    const result = await SDLCServerClientHelper.pushToReview(client, {
      ...PUSH,
      changes: (entities) => {
        seen.push(entities);
        return [
          {
            type: EntityChangeType.DELETE,
            entityPath: ENTITY.path,
          },
        ];
      },
    });

    expect(seen).toEqual([[ENTITY]]);
    expect(client.getRevision).toHaveBeenCalledWith(
      PROJECT_ID,
      expect.anything(),
      RevisionAlias.CURRENT,
    );
    // read at that very revision, which the commit is then pinned to
    expect(client.getEntitiesByRevision).toHaveBeenCalledWith(
      PROJECT_ID,
      expect.anything(),
      'r1',
    );
    expect(performEntityChanges.mock.calls[0]?.[2]).toMatchObject({
      revisionId: 'r1',
    });
    expect(result).toMatchObject({
      revisionId: 'r2',
      changeCount: 1,
      isNewReview: true,
      isNewWorkspace: true,
      review: { webURL: REVIEW.webURL },
    });
  });

  test('nothing changed: no commit, and the review is still found or opened', async () => {
    const client = workspaceClient(true);
    const performEntityChanges = jest.spyOn(client, 'performEntityChanges');

    const result = await SDLCServerClientHelper.pushToReview(client, {
      ...PUSH,
      changes: () => [],
    });

    expect(performEntityChanges).not.toHaveBeenCalled();
    expect(result).toMatchObject({ revisionId: 'r1', changeCount: 0 });
  });

  test.each([
    ['it created', false, 1],
    ['it found', true, 0],
  ])(
    'a failed push deletes a workspace %s %i time(s)',
    async (_, exists, deletes) => {
      const client = workspaceClient(exists);
      const deleteWorkspace = jest
        .spyOn(client, 'deleteWorkspace')
        .mockResolvedValue({});

      await expect(
        SDLCServerClientHelper.pushToReview(client, {
          ...PUSH,
          changes: () => {
            throw new Error('changed in SDLC since it was read');
          },
        }),
      ).rejects.toThrow('changed in SDLC since it was read');
      expect(deleteWorkspace).toHaveBeenCalledTimes(deletes);
    },
  );

  test('a failure after the commit keeps the workspace it created, and the commit with it', async () => {
    const client = workspaceClient(false);
    jest.spyOn(client, 'performEntityChanges').mockResolvedValue({ id: 'r2' });
    jest.spyOn(client, 'createReview').mockRejectedValue(httpError(500));
    const deleteWorkspace = jest
      .spyOn(client, 'deleteWorkspace')
      .mockResolvedValue({});

    await expect(
      SDLCServerClientHelper.pushToReview(client, {
        ...PUSH,
        changes: () => [
          { type: EntityChangeType.DELETE, entityPath: ENTITY.path },
        ],
      }),
    ).rejects.toThrow();

    expect(deleteWorkspace).not.toHaveBeenCalled();
  });

  test('a commit SDLC accepted without returning its revision still keeps the workspace', async () => {
    const client = workspaceClient(false);
    jest.spyOn(client, 'performEntityChanges').mockResolvedValue(undefined);
    jest.spyOn(client, 'createReview').mockRejectedValue(httpError(500));
    const deleteWorkspace = jest
      .spyOn(client, 'deleteWorkspace')
      .mockResolvedValue({});

    await expect(
      SDLCServerClientHelper.pushToReview(client, {
        ...PUSH,
        changes: () => [
          { type: EntityChangeType.DELETE, entityPath: ENTITY.path },
        ],
      }),
    ).rejects.toThrow();

    expect(deleteWorkspace).not.toHaveBeenCalled();
  });

  test('the changes are worked out from the entities of the revision it pins the commit to', async () => {
    const client = workspaceClient(true);
    const latest = { ...ENTITY, path: 'model::Moved' };
    // R2 lands after R1 was read: the workspace's latest entities are R2's, R1's are the pin's
    jest
      .spyOn(client, 'getEntitiesByRevision')
      .mockImplementation((_project, _workspace, revision) =>
        Promise.resolve(revision === 'r1' ? [ENTITY] : [latest]),
      );
    jest.spyOn(client, 'getEntities').mockResolvedValue([latest]);
    jest.spyOn(client, 'performEntityChanges').mockResolvedValue({ id: 'r2' });
    const seen: unknown[] = [];

    await SDLCServerClientHelper.pushToReview(client, {
      ...PUSH,
      changes: (entities) => {
        seen.push(entities);
        return [];
      },
    });

    expect(seen).toEqual([[ENTITY]]);
  });
});
