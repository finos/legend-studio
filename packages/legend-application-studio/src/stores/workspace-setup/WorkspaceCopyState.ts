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

import { action, computed, flow, makeObservable, observable } from 'mobx';
import {
  type GeneratorFn,
  ActionState,
  assertErrorThrown,
} from '@finos/legend-shared';
import type { Entity } from '@finos/legend-storage';
import {
  type SDLCServerClient,
  type Workspace,
  RevisionAlias,
} from '@finos/legend-server-sdlc';
import {
  type WorkspaceElementChange,
  buildWorkspaceCopyEntityChanges,
  countWorkspaceElementChanges,
  getPathsAlsoChangedOnLine,
  getWorkspaceElementChanges,
} from './WorkspaceCopyUtils.js';

/**
 * A new workspace that copies an existing workspace of the same project: it
 * starts from the source's line (HEAD or the source's patch) and gets what
 * the source changed since it was created, as one commit.
 *
 * NOTE: SDLC can't start a workspace from another workspace, so the copy is a
 * commit made once the new workspace exists. When that commit fails, the
 * workspace is kept, and `createdWorkspace` and `copyError` tell the modal to
 * offer to try the copy again or to delete the workspace.
 */
export class WorkspaceCopyState {
  readonly sdlcServerClient: SDLCServerClient;
  readonly projectId: string;
  readonly source: Workspace;
  readonly loadState = ActionState.create();
  readonly copyState = ActionState.create();

  changes: WorkspaceElementChange[] = [];
  isSourceOutdated = false;
  /**
   * The elements the source changed that its line changed too since, to
   * something else: the copy keeps the source's version of them.
   *
   * NOTE: only known for a source on the project's HEAD, as the SDLC client
   * can't read the latest entities of a patch
   */
  pathsAlsoChangedOnLine = new Set<string>();
  loadError?: string | undefined;

  createdWorkspace?: Workspace | undefined;
  copyError?: string | undefined;

  constructor(
    sdlcServerClient: SDLCServerClient,
    projectId: string,
    source: Workspace,
  ) {
    makeObservable(this, {
      changes: observable.ref,
      isSourceOutdated: observable,
      pathsAlsoChangedOnLine: observable.ref,
      loadError: observable,
      createdWorkspace: observable,
      copyError: observable,
      counts: computed,
      setCreatedWorkspace: action,
      setCopyError: action,
      load: flow,
      copyTo: flow,
    });

    this.sdlcServerClient = sdlcServerClient;
    this.projectId = projectId;
    this.source = source;
  }

  get counts(): { created: number; modified: number; deleted: number } {
    return countWorkspaceElementChanges(this.changes);
  }

  setCreatedWorkspace(workspace: Workspace | undefined): void {
    this.createdWorkspace = workspace;
  }

  setCopyError(error: string | undefined): void {
    this.copyError = error;
  }

  *load(): GeneratorFn<void> {
    this.loadState.inProgress();
    this.loadError = undefined;
    try {
      const projectId = this.projectId;
      const [baseEntities, entities, isOutdated] = (yield Promise.all([
        this.sdlcServerClient.getEntitiesByRevision(
          projectId,
          this.source,
          RevisionAlias.BASE,
        ),
        this.sdlcServerClient.getEntities(projectId, this.source),
        this.sdlcServerClient.isWorkspaceOutdated(projectId, this.source),
      ])) as [Entity[], Entity[], boolean];
      const changes = getWorkspaceElementChanges(baseEntities, entities);
      // NOTE: the line can only have changed what the source changed when the
      // source is behind it
      if (isOutdated && changes.length && this.source.source === undefined) {
        const lineEntities = (yield this.sdlcServerClient.getEntities(
          projectId,
          undefined,
        )) as Entity[];
        this.pathsAlsoChangedOnLine = getPathsAlsoChangedOnLine(
          changes,
          lineEntities,
        );
      }
      this.changes = changes;
      this.isSourceOutdated = isOutdated;
      this.loadState.pass();
    } catch (error) {
      assertErrorThrown(error);
      this.loadError = error.message;
      this.loadState.fail();
    }
  }

  /**
   * Commits the source's changes onto `workspace`, which starts from the
   * source's line. Throws when the copy fails.
   */
  *copyTo(workspace: Workspace): GeneratorFn<void> {
    this.copyState.inProgress();
    this.copyError = undefined;
    try {
      // NOTE: read what the new workspace holds, not what the line held when
      // the copy was previewed: the line may have moved since, or an earlier
      // try may have committed the copy before failing to answer
      const lineEntities = (yield this.sdlcServerClient.getEntities(
        this.projectId,
        workspace,
      )) as Entity[];
      const entityChanges = buildWorkspaceCopyEntityChanges(
        this.changes,
        lineEntities,
      );
      if (entityChanges.length) {
        yield this.sdlcServerClient.performEntityChanges(
          this.projectId,
          workspace,
          {
            message: `copied the changes of workspace ${this.source.workspaceId} [potentially affected ${
              entityChanges.length === 1
                ? '1 entity'
                : `${entityChanges.length} entities`
            }]`,
            entityChanges,
          },
        );
      }
      this.copyState.pass();
    } catch (error) {
      assertErrorThrown(error);
      this.copyError = error.message;
      this.copyState.fail();
      throw error;
    }
  }
}
