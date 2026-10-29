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

import { describe, expect, test } from '@jest/globals';
import { flowResult } from 'mobx';
import type { PlainObject } from '@finos/legend-shared';
import { createSpy, unitTest } from '@finos/legend-shared/test';
import type { Entity } from '@finos/legend-storage';
import {
  type ProjectConfiguration,
  EntityChangeType,
  Project,
  SDLCServerClient,
  Workspace,
} from '@finos/legend-server-sdlc';
import {
  OtherProjectCopySourceState,
  OtherProjectWorkspaceCopyState,
} from '../OtherProjectWorkspaceCopyState.js';

const TARGET_ID = 'PROD-1';
const SOURCE_ID = 'PROD-2';
const CLASS = 'meta::pure::metamodel::type::Class';

const buildClass = (path: string, doc = 'v1'): Entity => {
  const index = path.lastIndexOf('::');
  return {
    path,
    classifierPath: CLASS,
    content: {
      _type: 'class',
      name: path.substring(index + 2),
      package: path.substring(0, index),
      taggedValues: [{ value: doc }],
    },
  };
};

const buildProject = (projectId: string, name: string): Project =>
  Project.serialization.fromJson({
    projectId,
    name,
    description: '',
    webUrl: '',
    tags: [],
  });

const buildWorkspace = (projectId: string, workspaceId: string): Workspace =>
  Workspace.serialization.fromJson({ projectId, workspaceId, userId: null });

const buildConfiguration = (
  projectId: string,
  artifactId: string,
  projectDependencies: { projectId: string; versionId: string }[],
): PlainObject<ProjectConfiguration> => ({
  projectId,
  groupId: 'org.finos.legend',
  artifactId,
  projectStructureVersion: { version: 13, extensionVersion: 1 },
  projectDependencies,
});

// the source's project depends on fx-rates, which the target lacks, and on
// shared, which the target has at another version
const SOURCE_CONFIGURATION = buildConfiguration(SOURCE_ID, 'refdata', [
  { projectId: 'org.finos.legend:fx-rates', versionId: '1.4.0' },
  { projectId: 'org.finos.legend:shared', versionId: '2.0.0' },
]);
const TARGET_CONFIGURATION = buildConfiguration(TARGET_ID, 'uplift', [
  { projectId: 'org.finos.legend:shared', versionId: '1.0.0' },
]);
const SOURCE_ENTITIES = [
  buildClass('refdata::Currency', 'source'),
  buildClass('refdata::Country'),
  buildClass('refdata::Same'),
];
const TARGET_ENTITIES = [
  buildClass('refdata::Currency'),
  buildClass('refdata::Same'),
  buildClass('uplift::OnlyInTarget'),
];

const setUp = () => {
  const client = new SDLCServerClient({
    env: 'test',
    serverUrl: 'http://localhost/sdlc',
  });
  const getEntities = createSpy(client, 'getEntities').mockImplementation(
    (projectId) =>
      Promise.resolve(
        (projectId === SOURCE_ID
          ? SOURCE_ENTITIES
          : TARGET_ENTITIES) as unknown as PlainObject<Entity>[],
      ),
  );
  const getConfiguration = createSpy(
    client,
    'getConfiguration',
  ).mockImplementation((projectId) =>
    Promise.resolve(
      projectId === SOURCE_ID ? SOURCE_CONFIGURATION : TARGET_CONFIGURATION,
    ),
  );
  const copy = new OtherProjectWorkspaceCopyState(
    client,
    TARGET_ID,
    buildProject(SOURCE_ID, 'Trade reference data'),
    buildWorkspace(SOURCE_ID, 'currency-codes'),
  );
  return {
    client,
    getEntities,
    getConfiguration,
    copy,
    newWorkspace: buildWorkspace(TARGET_ID, 'copy'),
  };
};

const EXPECTED_ENTITY_CHANGES = [
  {
    type: EntityChangeType.MODIFY,
    entityPath: 'refdata::Currency',
    classifierPath: CLASS,
    content: buildClass('refdata::Currency', 'source').content,
  },
  {
    type: EntityChangeType.CREATE,
    entityPath: 'refdata::Country',
    classifierPath: CLASS,
    content: buildClass('refdata::Country').content,
  },
];

const EXPECTED_CONFIGURATION_UPDATE = {
  artifactId: 'uplift',
  groupId: 'org.finos.legend',
  message:
    'added the project dependencies of workspace currency-codes of project Trade reference data',
  projectDependenciesToAdd: [
    { projectId: 'org.finos.legend:fx-rates', versionId: '1.4.0' },
  ],
  projectDependenciesToRemove: [],
};

describe('OtherProjectWorkspaceCopyState', () => {
  test(
    unitTest(
      "reads all of the source's elements against the project's HEAD, and compares their dependencies",
    ),
    async () => {
      const { client, getEntities, copy } = setUp();
      const getEntitiesByRevision = createSpy(client, 'getEntitiesByRevision');
      const isWorkspaceOutdated = createSpy(client, 'isWorkspaceOutdated');

      await flowResult(copy.load());

      expect(copy.loadState.hasSucceeded).toBe(true);
      expect(
        copy.changes.map((change) => [change.type, change.entityPath]),
      ).toEqual([
        [EntityChangeType.CREATE, 'refdata::Country'],
        [EntityChangeType.MODIFY, 'refdata::Currency'],
      ]);
      expect(copy.counts).toEqual({ created: 1, modified: 1, deleted: 0 });
      expect(copy.unchangedElementCount).toBe(1);
      expect(
        copy.dependencyDiff.missing.map((dependency) => dependency.projectId),
      ).toEqual(['org.finos.legend:fx-rates']);
      expect(
        copy.dependencyDiff.mismatched.map(({ source }) => source.projectId),
      ).toEqual(['org.finos.legend:shared']);
      expect(getEntities).toHaveBeenCalledWith(
        SOURCE_ID,
        expect.objectContaining({ workspaceId: 'currency-codes' }),
      );
      expect(getEntities).toHaveBeenCalledWith(TARGET_ID, undefined);
      // what the source changed since it was created doesn't matter here
      expect(getEntitiesByRevision).not.toHaveBeenCalled();
      expect(isWorkspaceOutdated).not.toHaveBeenCalled();
    },
  );

  test(
    unitTest(
      'commits the elements, then adds the missing dependencies, without deleting anything',
    ),
    async () => {
      const { client, copy, newWorkspace } = setUp();
      const performEntityChanges = createSpy(
        client,
        'performEntityChanges',
      ).mockResolvedValue(undefined);
      const updateConfiguration = createSpy(
        client,
        'updateConfiguration',
      ).mockResolvedValue({});

      await flowResult(copy.load());
      await flowResult(copy.copyTo(newWorkspace));

      expect(performEntityChanges).toHaveBeenCalledWith(
        TARGET_ID,
        newWorkspace,
        {
          message:
            'copied the elements of workspace currency-codes of project Trade reference data [potentially affected 2 entities]',
          entityChanges: EXPECTED_ENTITY_CHANGES,
        },
      );
      expect(updateConfiguration).toHaveBeenCalledWith(
        TARGET_ID,
        newWorkspace,
        EXPECTED_CONFIGURATION_UPDATE,
      );
      expect(copy.hasCopiedElements).toBe(true);
      expect(copy.hasAddedDependencies).toBe(true);
    },
  );

  test(
    unitTest(
      "doesn't touch the configuration when the dependencies aren't added",
    ),
    async () => {
      const { client, copy, newWorkspace } = setUp();
      createSpy(client, 'performEntityChanges').mockResolvedValue(undefined);
      const updateConfiguration = createSpy(client, 'updateConfiguration');

      await flowResult(copy.load());
      copy.setAddsMissingDependencies(false);
      await flowResult(copy.copyTo(newWorkspace));

      expect(copy.dependenciesToAdd).toEqual([]);
      expect(updateConfiguration).not.toHaveBeenCalled();
    },
  );

  test(
    unitTest(
      'tries again only the dependencies when adding them failed, and skips those the workspace has',
    ),
    async () => {
      const { client, getEntities, getConfiguration, copy, newWorkspace } =
        setUp();
      const performEntityChanges = createSpy(
        client,
        'performEntityChanges',
      ).mockResolvedValue(undefined);
      const updateConfiguration = createSpy(client, 'updateConfiguration')
        .mockRejectedValueOnce(new Error('could not update configuration'))
        .mockResolvedValueOnce({});

      await flowResult(copy.load());
      await expect(flowResult(copy.copyTo(newWorkspace))).rejects.toThrow(
        'could not update configuration',
      );
      // as the store does, once the copy fails
      copy.setCreatedWorkspace(newWorkspace);

      expect(copy.hasCopiedElements).toBe(true);
      expect(copy.dependenciesError).toBe('could not update configuration');
      expect(copy.copyError).toBeUndefined();

      const getEntitiesCalls = getEntities.mock.calls.length;
      await flowResult(copy.copyTo(newWorkspace));

      expect(performEntityChanges).toHaveBeenCalledTimes(1);
      expect(getEntities).toHaveBeenCalledTimes(getEntitiesCalls);
      expect(updateConfiguration).toHaveBeenCalledTimes(2);
      expect(updateConfiguration).toHaveBeenLastCalledWith(
        TARGET_ID,
        newWorkspace,
        EXPECTED_CONFIGURATION_UPDATE,
      );
      expect(copy.dependenciesError).toBeUndefined();

      // the workspace already has the dependency: nothing left to add
      getConfiguration.mockImplementation(() =>
        Promise.resolve(
          buildConfiguration(TARGET_ID, 'uplift', [
            { projectId: 'org.finos.legend:fx-rates', versionId: '1.5.0' },
          ]),
        ),
      );
      copy.setCreatedWorkspace(undefined);
      const otherWorkspace = buildWorkspace(TARGET_ID, 'copy-2');
      await flowResult(copy.copyTo(otherWorkspace));

      expect(updateConfiguration).toHaveBeenCalledTimes(2);
    },
  );

  test(
    unitTest(
      'copies the elements again into a workspace created again after deleting the one whose copy failed',
    ),
    async () => {
      const { client, copy, newWorkspace } = setUp();
      const performEntityChanges = createSpy(
        client,
        'performEntityChanges',
      ).mockResolvedValue(undefined);
      createSpy(client, 'updateConfiguration')
        .mockRejectedValueOnce(new Error('could not update configuration'))
        .mockResolvedValue({});

      await flowResult(copy.load());
      await expect(flowResult(copy.copyTo(newWorkspace))).rejects.toThrow();
      copy.setCreatedWorkspace(newWorkspace);
      // the elements are kept
      expect(copy.hasCopiedElements).toBe(true);

      // Delete workspace, then Create again
      copy.setCreatedWorkspace(undefined);
      expect(copy.hasCopiedElements).toBe(false);
      expect(copy.dependenciesError).toBeUndefined();
      const recreated = buildWorkspace(TARGET_ID, 'copy');
      await flowResult(copy.copyTo(recreated));

      expect(performEntityChanges).toHaveBeenCalledTimes(2);
      expect(performEntityChanges).toHaveBeenLastCalledWith(
        TARGET_ID,
        recreated,
        expect.objectContaining({ entityChanges: EXPECTED_ENTITY_CHANGES }),
      );
      expect(copy.hasAddedDependencies).toBe(true);
    },
  );
});

describe('OtherProjectCopySourceState', () => {
  test(
    unitTest(
      'searches the projects other than the target, and lists the workspaces of the one picked',
    ),
    async () => {
      const client = new SDLCServerClient({
        env: 'test',
        serverUrl: 'http://localhost/sdlc',
      });
      const target = buildProject(TARGET_ID, 'Editor uplift');
      const source = buildProject(SOURCE_ID, 'Trade reference data');
      const getProjects = createSpy(client, 'getProjects').mockResolvedValue([
        Project.serialization.toJson(target),
        Project.serialization.toJson(source),
      ]);
      createSpy(client, 'getProject').mockResolvedValue(
        Project.serialization.toJson(source),
      );
      createSpy(client, 'getWorkspaces').mockResolvedValue([
        { projectId: SOURCE_ID, workspaceId: 'currency-codes', userId: null },
        { projectId: SOURCE_ID, workspaceId: 'stuck', userId: 'me' },
      ]);
      createSpy(
        client,
        'getWorkspacesInConflictResolutionMode',
      ).mockResolvedValue([
        { projectId: SOURCE_ID, workspaceId: 'stuck', userId: 'me' },
      ]);
      const state = new OtherProjectCopySourceState(client, TARGET_ID);

      await flowResult(state.searchProjects('trade'));

      expect(getProjects).toHaveBeenCalledWith(
        undefined,
        '"trade"',
        undefined,
        ['sandbox'],
        30,
      );
      expect(state.matchingProjects.map((p) => p.projectId)).toEqual([
        SOURCE_ID,
      ]);

      // too short to search for: narrows down what was found
      await flowResult(state.searchProjects('ed'));
      expect(getProjects).toHaveBeenCalledTimes(1);
      expect(state.matchingProjects.map((p) => p.projectId)).toEqual([]);

      await flowResult(state.changeProject(source));

      expect(state.workspaces.map((w) => w.workspaceId)).toEqual([
        'currency-codes',
      ]);
      expect(state.loadWorkspacesState.hasSucceeded).toBe(true);
    },
  );
});
