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
import { NetworkClientError, TracerService } from '@finos/legend-shared';
import { DepotServerClient } from '../DepotServerClient.js';
import {
  DEPENDENCY_VERSION_CONFLICT_MESSAGE,
  analyzeDependencyConflicts,
  buildProjectDependencyCoordinates,
  collectIndexedDependencyEntities,
  getWorkspaceIdFromSnapshotVersion,
  resolveSDLCProjectId,
} from '../ProjectDependencyEntitiesHelper.js';

const ENTITY = {
  path: 'model::A',
  classifierPath: 'meta::pure::metamodel::type::Class',
  content: {},
};

const project = (
  artifactId: string,
  versionId: string,
  groupId = 'org.test',
) => ({
  groupId,
  artifactId,
  versionId,
  entities: [ENTITY],
});

const treeNode = (versionId: string) => ({
  projectId: 'PROD-A',
  groupId: 'org.test',
  artifactId: 'a',
  versionId,
  id: `org.test:a:${versionId}`,
  forwardEdges: [],
  backEdges: [],
});

/** Depot's dependency tree with two versions of org.test:a. */
const CONFLICTING_TREE = {
  graph: {
    rootNodes: [],
    nodes: {
      'org.test:a:1.0.0': treeNode('1.0.0'),
      'org.test:a:2.0.0': treeNode('2.0.0'),
    },
  },
  conflicts: [
    {
      groupId: 'org.test',
      artifactId: 'a',
      versions: ['org.test:a:1.0.0', 'org.test:a:2.0.0'],
    },
  ],
};

const createClient = (): DepotServerClient => {
  const client = new DepotServerClient({ serverUrl: 'https://depot' });
  client.setTracerService(new TracerService());
  return client;
};

const notFound = (): NetworkClientError =>
  new NetworkClientError(
    { status: 404, statusText: '', url: 'https://depot' } as Response,
    undefined,
  );

afterEach(() => {
  jest.restoreAllMocks();
});

describe(unitTest('Dependency coordinates'), () => {
  test('a declared dependency becomes coordinates, its exclusions kept', () => {
    expect(
      buildProjectDependencyCoordinates([
        { groupId: 'org.test', artifactId: 'a', versionId: '1.0.0' },
        {
          groupId: 'org.test',
          artifactId: 'b',
          versionId: '2.0.0',
          exclusions: [{ groupId: 'org.noisy', artifactId: 'extra' }],
        },
      ]),
    ).toEqual([
      { groupId: 'org.test', artifactId: 'a', versionId: '1.0.0' },
      {
        groupId: 'org.test',
        artifactId: 'b',
        versionId: '2.0.0',
        exclusions: [{ groupId: 'org.noisy', artifactId: 'extra' }],
      },
    ]);
  });
});

describe(unitTest('Dependency entities'), () => {
  test('the whole tree is fetched in one call and indexed by project', async () => {
    const client = createClient();
    const collect = jest
      .spyOn(client, 'collectDependencyEntities')
      .mockResolvedValue([project('a', '1.0.0'), project('b', '2.0.0')]);

    const index = await collectIndexedDependencyEntities(
      client,
      buildProjectDependencyCoordinates([
        { groupId: 'org.test', artifactId: 'a', versionId: '1.0.0' },
      ]),
    );

    expect(collect).toHaveBeenCalledWith(
      [{ groupId: 'org.test', artifactId: 'a', versionId: '1.0.0' }],
      true,
      true,
    );
    expect(Array.from(index.keys())).toEqual(['org.test:a', 'org.test:b']);
    expect(index.get('org.test:b')?.versionId).toBe('2.0.0');
  });

  test('no dependencies asks Depot nothing', async () => {
    const client = createClient();
    const collect = jest.spyOn(client, 'collectDependencyEntities');

    expect((await collectIndexedDependencyEntities(client, [])).size).toBe(0);
    expect(collect).not.toHaveBeenCalled();
  });

  test('two versions of one project are refused, explained by the tree', async () => {
    const client = createClient();
    jest
      .spyOn(client, 'collectDependencyEntities')
      .mockResolvedValue([project('a', '1.0.0'), project('a', '2.0.0')]);
    jest
      .spyOn(client, 'analyzeDependencyTree')
      .mockResolvedValue(CONFLICTING_TREE);

    await expect(
      collectIndexedDependencyEntities(
        client,
        buildProjectDependencyCoordinates([
          { groupId: 'org.test', artifactId: 'a', versionId: '1.0.0' },
        ]),
      ),
    ).rejects.toThrow(
      `${DEPENDENCY_VERSION_CONFLICT_MESSAGE}project: org.test:a\nversions:[1.0.0,2.0.0]`,
    );
  });

  test('a tree that cannot be fetched is reported, and the fetched versions explain the conflict', async () => {
    const client = createClient();
    jest
      .spyOn(client, 'collectDependencyEntities')
      .mockResolvedValue([project('a', '1.0.0'), project('a', '2.0.0')]);
    jest
      .spyOn(client, 'analyzeDependencyTree')
      .mockRejectedValue(new Error('depot down'));
    const reported: Error[] = [];

    await expect(
      collectIndexedDependencyEntities(
        client,
        buildProjectDependencyCoordinates([
          { groupId: 'org.test', artifactId: 'a', versionId: '1.0.0' },
        ]),
        undefined,
        (error) => reported.push(error),
      ),
    ).rejects.toThrow('project: org.test:a\n versions: 1.0.0,2.0.0');
    expect(reported.map((error) => error.message)).toEqual(['depot down']);
  });
});

describe(unitTest('Dependency conflicts'), () => {
  test("are read from the tree alone, in Studio's wording", async () => {
    const client = createClient();
    const collect = jest.spyOn(client, 'collectDependencyEntities');
    const analyze = jest.spyOn(client, 'analyzeDependencyTree');
    const coordinates = buildProjectDependencyCoordinates([
      { groupId: 'org.test', artifactId: 'a', versionId: '1.0.0' },
    ]);

    analyze.mockResolvedValue({
      graph: { nodes: {}, rootNodes: [] },
      conflicts: [],
    });
    await expect(
      analyzeDependencyConflicts(client, coordinates),
    ).resolves.toBeUndefined();

    analyze.mockResolvedValue(CONFLICTING_TREE);
    await expect(analyzeDependencyConflicts(client, coordinates)).resolves.toBe(
      `${DEPENDENCY_VERSION_CONFLICT_MESSAGE}project: org.test:a\nversions:[1.0.0,2.0.0]`,
    );
    expect(collect).not.toHaveBeenCalled();
    await expect(
      analyzeDependencyConflicts(client, []),
    ).resolves.toBeUndefined();
  });
});

describe(unitTest('SDLC project id'), () => {
  test("is Depot's for a published project", async () => {
    const client = createClient();
    jest.spyOn(client, 'getProject').mockResolvedValue({
      projectId: 'PROD-1',
      groupId: 'org.test',
      artifactId: 'a',
    });

    await expect(resolveSDLCProjectId(client, 'org.test', 'a')).resolves.toBe(
      'PROD-1',
    );
  });

  test('falls back to the search for a project Depot does not know', async () => {
    const client = createClient();
    jest.spyOn(client, 'getProject').mockRejectedValue(notFound());

    await expect(
      resolveSDLCProjectId(client, 'org.test', 'a', () =>
        Promise.resolve('PROD-2'),
      ),
    ).resolves.toBe('PROD-2');
    await expect(
      resolveSDLCProjectId(client, 'org.test', 'a'),
    ).resolves.toBeUndefined();
  });

  test('a Depot outage is not read as an unknown project', async () => {
    const client = createClient();
    jest.spyOn(client, 'getProject').mockRejectedValue(new Error('down'));

    await expect(resolveSDLCProjectId(client, 'org.test', 'a')).rejects.toThrow(
      'down',
    );
  });
});

describe(unitTest('Snapshot version workspace'), () => {
  test.each([
    ['my_feature-SNAPSHOT', 'my_feature'],
    ['master-SNAPSHOT', undefined],
    ['HEAD', undefined],
    ['1.0.0', undefined],
    ['-SNAPSHOT', undefined],
  ])('%s names workspace %s', (versionId, workspaceId) => {
    expect(getWorkspaceIdFromSnapshotVersion(versionId)).toBe(workspaceId);
  });
});
