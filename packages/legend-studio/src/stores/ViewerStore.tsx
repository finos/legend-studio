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

import { useContext, createContext } from 'react';
import { flow, action, makeAutoObservable } from 'mobx';
import type { EditorStore } from './EditorStore';
import { useEditorStore } from './EditorStore';
import {
  Revision,
  RevisionAlias,
} from '../models/sdlc/models/revision/Revision';
import { Version } from '../models/sdlc/models/version/Version';
import { CORE_LOG_EVENT } from '../utils/Logger';
import {
  IllegalStateError,
  guaranteeNonNullable,
  createObservableActionState,
} from '@finos/legend-studio-shared';
import { Workspace } from '../models/sdlc/models/workspace/Workspace';
import type { Entity } from '../models/sdlc/models/entity/Entity';
import { GraphError } from '../models/MetaModelUtility';
import { useLocalObservable } from 'mobx-react-lite';
import { EDITOR_MODE, TAB_SIZE } from './EditorConfig';
import type { ViewerRouteParams } from './Router';
import {
  generateViewVersionRoute,
  generateVieweRevisionRoute,
  generateViewProjectRoute,
} from './Router';
import { SDLCServerClient } from '../models/sdlc/SDLCServerClient';

export class ViewerStore {
  editorStore: EditorStore;
  initState = createObservableActionState();
  currentRevision?: Revision;
  latestVersion?: Version;
  revision?: Revision;
  version?: Version;
  elementPath?: string;

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
  internalizeEntityPath(params: ViewerRouteParams): void {
    if (params.entityPath) {
      this.elementPath = params.entityPath;
      this.editorStore.applicationStore.historyApiClient.replace(
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

  init = flow(function* (
    this: ViewerStore,
    projectId: string,
    versionId: string | undefined,
    revisionId: string | undefined,
  ) {
    if (!this.initState.isInInitialState) {
      return;
    }
    this.initState.inProgress();
    const onLeave = (hasBuildSucceeded: boolean): void => {
      this.initState.conclude(hasBuildSucceeded);
    };

    try {
      // fetch basic SDLC infos
      yield this.editorStore.sdlcState.fetchCurrentProject(projectId);
      this.editorStore.sdlcState.setCurrentWorkspace(
        Workspace.createProjectLatestViewerWorkspace(projectId),
      );

      // get current revision so we can show how "outdated" the `current view` of the project is
      this.currentRevision = Revision.serialization.fromJson(
        yield this.editorStore.applicationStore.networkClientManager.sdlcClient.getRevision(
          this.editorStore.sdlcState.currentProjectId,
          undefined,
          RevisionAlias.CURRENT,
        ),
      );
      this.latestVersion = Version.serialization.fromJson(
        yield this.editorStore.applicationStore.networkClientManager.sdlcClient.getLatestVersion(
          this.editorStore.sdlcState.currentProjectId,
        ),
      );

      // fetch project versions
      yield this.editorStore.sdlcState.fetchProjectVersions();

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
                yield this.editorStore.applicationStore.networkClientManager.sdlcClient.getVersion(
                  this.editorStore.sdlcState.currentProjectId,
                  versionId,
                ),
              )
            : this.latestVersion;
        entities =
          (yield this.editorStore.applicationStore.networkClientManager.sdlcClient.getEntitiesByVersion(
            this.editorStore.sdlcState.currentProjectId,
            versionId,
          )) as Entity[];
      }

      if (revisionId) {
        // get revision info if a revision is specified
        this.revision =
          revisionId !== this.currentRevision.id
            ? Revision.serialization.fromJson(
                yield this.editorStore.applicationStore.networkClientManager.sdlcClient.getRevision(
                  this.editorStore.sdlcState.currentProjectId,
                  undefined,
                  revisionId,
                ),
              )
            : this.currentRevision;
        entities =
          (yield this.editorStore.applicationStore.networkClientManager.sdlcClient.getEntitiesByRevision(
            this.editorStore.sdlcState.currentProjectId,
            undefined,
            revisionId,
          )) as Entity[];
      }

      // if no revision ID or version ID is specified, we will just get the project HEAD
      if (!revisionId && !versionId) {
        entities =
          (yield this.editorStore.applicationStore.networkClientManager.sdlcClient.getEntities(
            this.editorStore.sdlcState.currentProjectId,
            undefined,
          )) as Entity[];
      }
      // init engine
      yield this.editorStore.graphState.graphManager.setupEngine(
        this.editorStore.applicationStore.pluginManager,
        {
          env: this.editorStore.applicationStore.config.env,
          tabSize: TAB_SIZE,
          clientConfig: {
            baseUrl: this.editorStore.applicationStore.config.engineServerUrl,
            enableCompression: true,
            authenticationUrl: SDLCServerClient.authenticationUrl(
              this.editorStore.applicationStore.config.sdlcServerUrl,
            ),
          },
        },
      );
      // init graph
      yield this.editorStore.graphState.initializeSystem();
      yield this.editorStore.graphState.buildGraphForViewerMode(entities);

      // fetch available file generation descriptions
      yield this.editorStore.graphState.graphGenerationState.fetchAvailableFileGenerationDescriptions();

      // generate
      if (this.editorStore.graphState.graph.generationSpecifications.length) {
        yield this.editorStore.graphState.graphGenerationState.globalGenerate();
      }

      // open element if provided an element path
      if (
        this.editorStore.graphState.graph.isBuilt &&
        this.editorStore.sdlcState.currentProject &&
        this.editorStore.explorerTreeState.isBuilt &&
        this.elementPath
      ) {
        try {
          const element = this.editorStore.graphState.graph.getElement(
            this.elementPath,
          );
          this.editorStore.openElement(element);
        } catch {
          const elementPath = this.elementPath;
          this.elementPath = undefined;
          throw new GraphError(
            `Can't find element '${elementPath}' in project '${this.editorStore.sdlcState.currentProjectId}'`,
          );
        }
      }
      onLeave(true);
    } catch (error: unknown) {
      this.editorStore.applicationStore.logger.error(
        CORE_LOG_EVENT.SDLC_PROBLEM,
        error,
      );
      this.editorStore.applicationStore.notifyError(error);
      onLeave(false);
    }
  });
}

const ViewerStoreContext = createContext<ViewerStore | undefined>(undefined);

export const ViewerStoreProvider = ({
  children,
}: {
  children: React.ReactNode;
}): React.ReactElement => {
  const editorStore = useEditorStore();
  editorStore.setMode(EDITOR_MODE.VIEWER);
  const store = useLocalObservable(() => new ViewerStore(editorStore));
  return (
    <ViewerStoreContext.Provider value={store}>
      {children}
    </ViewerStoreContext.Provider>
  );
};

export const useViewerStore = (): ViewerStore =>
  guaranteeNonNullable(
    useContext(ViewerStoreContext),
    'useViewerStore() hook must be used inside ReviewStore context provider',
  );
