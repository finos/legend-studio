/**
 * Copyright (c) 2020-present, Goldman Sachs
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

import { action, flowResult, makeAutoObservable } from 'mobx';
import type { EditorStore } from './EditorStore';
import type { GeneratorFn, PlainObject } from '@finos/legend-shared';
import {
  assertErrorThrown,
  AssertionError,
  LogEvent,
  IllegalStateError,
  ActionState,
} from '@finos/legend-shared';
import type { ViewerPathParams } from './LegendStudioRouter';
import {
  generateViewVersionRoute,
  generateVieweRevisionRoute,
  generateViewProjectRoute,
} from './LegendStudioRouter';
import type { Entity } from '@finos/legend-model-storage';
import {
  ProjectConfiguration,
  Revision,
  RevisionAlias,
  Version,
  Workspace,
} from '@finos/legend-server-sdlc';
import { STUDIO_LOG_EVENT } from '../stores/StudioLogEvent';
import { TAB_SIZE } from '@finos/legend-application';

export class ViewerStore {
  editorStore: EditorStore;
  initState = ActionState.create();
  currentRevision?: Revision | undefined;
  latestVersion?: Version | undefined;
  revision?: Revision | undefined;
  version?: Version | undefined;
  elementPath?: string | undefined;

  constructor(editorStore: EditorStore) {
    makeAutoObservable(this, {
      editorStore: false,
      internalizeEntityPath: action,
    });

    this.editorStore = editorStore;
  }

  get onLatestVersion(): boolean {
    return Boolean(
      this.latestVersion && this.version && this.latestVersion === this.version,
    );
  }
  get onCurrentRevision(): boolean {
    return Boolean(
      this.currentRevision &&
        this.revision &&
        this.currentRevision === this.revision,
    );
  }

  /**
   * Since we don't dynamically change the route based on the currently opened element
   * We have to handle the following cases:
   *  1. if the element is found and then the user opens another element
   *  2. if the elemnt is not found
   * in either case, the most suitable behavior at the moment is to internalize/swallow up the entity path param
   */
  internalizeEntityPath(params: ViewerPathParams): void {
    if (params.entityPath) {
      this.elementPath = params.entityPath;
      this.editorStore.applicationStore.navigator.goTo(
        params.versionId
          ? generateViewVersionRoute(
              this.editorStore.applicationStore.config.sdlcServerKey,
              params.projectId,
              params.versionId,
            )
          : params.revisionId
          ? generateVieweRevisionRoute(
              this.editorStore.applicationStore.config.sdlcServerKey,
              params.projectId,
              params.revisionId,
            )
          : generateViewProjectRoute(
              this.editorStore.applicationStore.config.sdlcServerKey,
              params.projectId,
            ),
      );
    }
  }

  *initialize(
    projectId: string,
    versionId: string | undefined,
    revisionId: string | undefined,
  ): GeneratorFn<void> {
    if (!this.initState.isInInitialState) {
      return;
    }
    this.initState.inProgress();
    const onLeave = (hasBuildSucceeded: boolean): void => {
      this.initState.complete(hasBuildSucceeded);
    };

    try {
      // fetch basic SDLC infos
      yield flowResult(
        this.editorStore.sdlcState.fetchCurrentProject(projectId),
      );
      const stubWorkspace = new Workspace();
      stubWorkspace.projectId = projectId;
      stubWorkspace.workspaceId = '';
      this.editorStore.sdlcState.setCurrentWorkspace(stubWorkspace);

      // get current revision so we can show how "outdated" the `current view` of the project is
      this.currentRevision = Revision.serialization.fromJson(
        (yield this.editorStore.sdlcServerClient.getRevision(
          this.editorStore.sdlcState.activeProjectId,
          undefined,
          RevisionAlias.CURRENT,
        )) as PlainObject<Revision>,
      );
      this.latestVersion = Version.serialization.fromJson(
        (yield this.editorStore.sdlcServerClient.getLatestVersion(
          this.editorStore.sdlcState.activeProjectId,
        )) as PlainObject<Version>,
      );

      // fetch project versions
      yield flowResult(this.editorStore.sdlcState.fetchProjectVersions());

      // ensure only either version or revision is specified
      if (versionId && revisionId) {
        throw new IllegalStateError(
          `Can't have both version ID and revision ID specified for viewer mode`,
        );
      }

      let entities: Entity[] = [];

      if (versionId) {
        // get version info if a version is specified
        this.version =
          versionId !== this.latestVersion.id.id
            ? Version.serialization.fromJson(
                (yield this.editorStore.sdlcServerClient.getVersion(
                  this.editorStore.sdlcState.activeProjectId,
                  versionId,
                )) as PlainObject<Version>,
              )
            : this.latestVersion;
        entities =
          (yield this.editorStore.sdlcServerClient.getEntitiesByVersion(
            this.editorStore.sdlcState.activeProjectId,
            versionId,
          )) as Entity[];
      }

      if (revisionId) {
        // get revision info if a revision is specified
        this.revision =
          revisionId !== this.currentRevision.id
            ? Revision.serialization.fromJson(
                (yield this.editorStore.sdlcServerClient.getRevision(
                  this.editorStore.sdlcState.activeProjectId,
                  undefined,
                  revisionId,
                )) as PlainObject<Revision>,
              )
            : this.currentRevision;
        entities =
          (yield this.editorStore.sdlcServerClient.getEntitiesByRevision(
            this.editorStore.sdlcState.activeProjectId,
            undefined,
            revisionId,
          )) as Entity[];
      }

      // if no revision ID or version ID is specified, we will just get the project HEAD
      if (!revisionId && !versionId) {
        try {
          // fetch workspace entities and config at the same time
          const result = (yield Promise.all([
            this.editorStore.sdlcServerClient.getEntities(
              this.editorStore.sdlcState.activeProjectId,
              undefined,
            ),
            this.editorStore.sdlcServerClient.getConfiguration(
              this.editorStore.sdlcState.activeProjectId,
              undefined,
            ),
          ])) as [Entity[], PlainObject<ProjectConfiguration>];
          entities = result[0];
          const rawProjectConfiguration = result[1];
          const projectConfiguration =
            ProjectConfiguration.serialization.fromJson(
              rawProjectConfiguration,
            );
          this.editorStore.projectConfigurationEditorState.setProjectConfiguration(
            projectConfiguration,
          );
          // make sure we set the original project configuration to a different object
          this.editorStore.projectConfigurationEditorState.setOriginalProjectConfiguration(
            projectConfiguration,
          );
          this.editorStore.changeDetectionState.workspaceLatestRevisionState.setEntities(
            entities,
          );
        } catch {
          return;
        }
      }

      // setup engine
      yield flowResult(
        this.editorStore.graphManagerState.graphManager.initialize(
          {
            env: this.editorStore.applicationStore.config.env,
            tabSize: TAB_SIZE,
            clientConfig: {
              baseUrl: this.editorStore.applicationStore.config.engineServerUrl,
              queryBaseUrl:
                this.editorStore.applicationStore.config.engineQueryServerUrl,
              enableCompression: true,
            },
          },
          {
            tracerServicePlugins:
              this.editorStore.pluginManager.getTracerServicePlugins(),
          },
        ),
      );
      // initialize graph manager
      yield flowResult(this.editorStore.graphManagerState.initializeSystem());
      yield flowResult(
        this.editorStore.graphState.buildGraphForViewerMode(entities),
      );

      // fetch available file generation descriptions
      yield flowResult(
        this.editorStore.graphState.graphGenerationState.fetchAvailableFileGenerationDescriptions(),
      );

      // generate
      if (
        this.editorStore.graphManagerState.graph.ownGenerationSpecifications
          .length
      ) {
        yield flowResult(
          this.editorStore.graphState.graphGenerationState.globalGenerate(),
        );
      }

      // open element if provided an element path
      if (
        this.editorStore.graphManagerState.graph.buildState.hasSucceeded &&
        this.editorStore.sdlcState.currentProject &&
        this.editorStore.explorerTreeState.buildState.hasCompleted &&
        this.elementPath
      ) {
        try {
          const element = this.editorStore.graphManagerState.graph.getElement(
            this.elementPath,
          );
          this.editorStore.openElement(element);
        } catch {
          const elementPath = this.elementPath;
          this.elementPath = undefined;
          throw new AssertionError(
            `Can't find element '${elementPath}' in project '${this.editorStore.sdlcState.activeProjectId}'`,
          );
        }
      }
      onLeave(true);
    } catch (error) {
      assertErrorThrown(error);
      this.editorStore.applicationStore.log.error(
        LogEvent.create(STUDIO_LOG_EVENT.SDLC_MANAGER_FAILURE),
        error,
      );
      this.editorStore.applicationStore.notifyError(error);
      onLeave(false);
    }
  }
}
