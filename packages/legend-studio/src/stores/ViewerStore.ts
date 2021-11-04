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
  generateViewProjectByGAVRoute,
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
import {
  parseGAVCoordinates,
  ProjectData,
  ProjectVersionEntities,
} from '@finos/legend-server-depot';
import { GRAPH_MANAGER_LOG_EVENT } from '@finos/legend-graph';

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
    const { gav, projectId, revisionId, versionId, entityPath } = params;
    if (entityPath) {
      this.elementPath = entityPath;
      if (projectId) {
        this.editorStore.applicationStore.navigator.goTo(
          versionId
            ? generateViewVersionRoute(
                this.editorStore.applicationStore.config
                  .currentSDLCServerOption,
                projectId,
                versionId,
              )
            : revisionId
            ? generateVieweRevisionRoute(
                this.editorStore.applicationStore.config
                  .currentSDLCServerOption,
                projectId,
                revisionId,
              )
            : generateViewProjectRoute(
                this.editorStore.applicationStore.config
                  .currentSDLCServerOption,
                projectId,
              ),
        );
      } else if (gav) {
        const { groupId, artifactId, versionId } = parseGAVCoordinates(gav);
        this.editorStore.applicationStore.navigator.goTo(
          generateViewProjectByGAVRoute(groupId, artifactId, versionId),
        );
      }
    }
  }

  /**
   * Create a lean/read-only view of the project:
   * - No change detection
   * - No project viewer
   * - No text mode support
   */
  private *buildGraphForSDLCProject(entities: Entity[]): GeneratorFn<void> {
    try {
      this.editorStore.graphState.isInitializingGraph = true;
      const startTime = Date.now();
      this.editorStore.applicationStore.log.info(
        LogEvent.create(GRAPH_MANAGER_LOG_EVENT.GRAPH_ENTITIES_FETCHED),
        Date.now() - startTime,
        'ms',
      );

      // reset
      this.editorStore.changeDetectionState.stop();
      this.editorStore.graphManagerState.resetGraph();

      // build dependencies
      const dependencyManager =
        this.editorStore.graphManagerState.createEmptyDependencyManager();
      yield flowResult(
        this.editorStore.graphManagerState.graphManager.buildDependencies(
          this.editorStore.graphManagerState.coreModel,
          this.editorStore.graphManagerState.systemModel,
          dependencyManager,
          (yield flowResult(
            this.editorStore.graphState.getConfigurationProjectDependencyEntities(),
          )) as Map<string, Entity[]>,
        ),
      );
      this.editorStore.graphManagerState.graph.setDependencyManager(
        dependencyManager,
      );

      // build graph
      yield flowResult(
        this.editorStore.graphManagerState.graphManager.buildGraph(
          this.editorStore.graphManagerState.graph,
          entities,
        ),
      );
      this.editorStore.applicationStore.log.info(
        LogEvent.create(GRAPH_MANAGER_LOG_EVENT.GRAPH_INITIALIZED),
        '[TOTAL]',
        Date.now() - startTime,
        'ms',
      );

      // build explorer tree
      this.editorStore.explorerTreeState.buildImmutableModelTrees();
      this.editorStore.explorerTreeState.build();
    } catch (error) {
      assertErrorThrown(error);
      this.editorStore.applicationStore.log.error(
        LogEvent.create(GRAPH_MANAGER_LOG_EVENT.GRAPH_BUILDER_FAILURE),
        error,
      );
      this.editorStore.graphManagerState.graph.buildState.fail();
      this.editorStore.applicationStore.notifyError(
        `Can't build graph. Error: ${error.message}`,
      );
    } finally {
      this.editorStore.graphState.isInitializingGraph = false;
    }
  }

  private *initializeGraphManagerState(): GeneratorFn<void> {
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
  }

  /**
   * Initialize the graph by fetching project information from the SDLC server.
   */
  private *initializeForSDLCProject(
    entities: Entity[],
    projectConfiguration: ProjectConfiguration,
  ): GeneratorFn<void> {
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

    yield flowResult(this.initializeGraphManagerState());
    yield flowResult(this.buildGraphForSDLCProject(entities));

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
  }

  /**
   * Initialize the viewer store given GAV coordinate of a project.
   * This flow is different than the SDLC flow as we need to fetch the project
   * from Depot server here, where SDLC objects like project configurations
   * are not available.
   */
  private *initializeForGAV(
    groupId: string,
    artifactId: string,
    versionId: string,
  ): GeneratorFn<void> {
    const project = ProjectData.serialization.fromJson(
      (yield flowResult(
        this.editorStore.depotServerClient.getProject(groupId, artifactId),
      )) as PlainObject<ProjectData>,
    );

    const LATEST_VERSION_ALIAS = 'latest';
    const LATEST_SNAPSHOT_VERSION_ALIAS = 'HEAD';

    let entities: Entity[] = [];
    if (versionId === LATEST_SNAPSHOT_VERSION_ALIAS) {
      entities =
        (yield this.editorStore.depotServerClient.getLatestRevisionEntities(
          groupId,
          artifactId,
        )) as Entity[];
    } else {
      entities = (yield this.editorStore.depotServerClient.getVersionEntities(
        groupId,
        artifactId,
        versionId === LATEST_VERSION_ALIAS ? project.latestVersion : versionId,
      )) as Entity[];
    }

    yield flowResult(this.initializeGraphManagerState());
    this.editorStore.graphManagerState.resetGraph();

    // build dependencies
    const dependencyEntitiesMap = new Map<string, Entity[]>();
    (versionId === LATEST_SNAPSHOT_VERSION_ALIAS
      ? ((yield this.editorStore.depotServerClient.getLatestDependencyEntities(
          groupId,
          artifactId,
          true,
          false,
        )) as PlainObject<ProjectVersionEntities>[])
      : ((yield this.editorStore.depotServerClient.getDependencyEntities(
          groupId,
          artifactId,
          versionId === LATEST_VERSION_ALIAS
            ? project.latestVersion
            : versionId,
          true,
          false,
        )) as PlainObject<ProjectVersionEntities>[])
    )
      .map((e) => ProjectVersionEntities.serialization.fromJson(e))
      .forEach((dependencyInfo) => {
        dependencyEntitiesMap.set(dependencyInfo.id, dependencyInfo.entities);
      });
    const dependencyManager =
      this.editorStore.graphManagerState.createEmptyDependencyManager();
    yield flowResult(
      this.editorStore.graphManagerState.graphManager.buildDependencies(
        this.editorStore.graphManagerState.coreModel,
        this.editorStore.graphManagerState.systemModel,
        dependencyManager,
        dependencyEntitiesMap,
      ),
    );
    this.editorStore.graphManagerState.graph.setDependencyManager(
      dependencyManager,
    );

    // build graph
    yield flowResult(
      this.editorStore.graphManagerState.graphManager.buildGraph(
        this.editorStore.graphManagerState.graph,
        entities,
      ),
    );

    // build explorer tree
    this.editorStore.explorerTreeState.buildImmutableModelTrees();
    this.editorStore.explorerTreeState.build();
  }

  *initialize(params: ViewerPathParams): GeneratorFn<void> {
    if (!this.initState.isInInitialState) {
      return;
    }
    const { gav, projectId, revisionId, versionId } = params;

    this.initState.inProgress();
    const onLeave = (hasBuildSucceeded: boolean): void => {
      this.initState.complete(hasBuildSucceeded);
    };

    try {
      if (projectId) {
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
            this.editorStore.sdlcState.activeProject.projectId,
            undefined,
            RevisionAlias.CURRENT,
          )) as PlainObject<Revision>,
        );
        this.latestVersion = Version.serialization.fromJson(
          (yield this.editorStore.sdlcServerClient.getLatestVersion(
            this.editorStore.sdlcState.activeProject.projectId,
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

        let graphBuildingMaterial: [
          Entity[],
          PlainObject<ProjectConfiguration>,
        ];

        if (versionId) {
          // get version info if a version is specified
          this.version =
            versionId !== this.latestVersion.id.id
              ? Version.serialization.fromJson(
                  (yield this.editorStore.sdlcServerClient.getVersion(
                    this.editorStore.sdlcState.activeProject.projectId,
                    versionId,
                  )) as PlainObject<Version>,
                )
              : this.latestVersion;
          graphBuildingMaterial = (yield Promise.all([
            this.editorStore.sdlcServerClient.getEntitiesByVersion(
              this.editorStore.sdlcState.activeProject.projectId,
              versionId,
            ),
            this.editorStore.sdlcServerClient.getConfigurationByVersion(
              this.editorStore.sdlcState.activeProject.projectId,
              versionId,
            ),
          ])) as [Entity[], PlainObject<ProjectConfiguration>];
        } else if (revisionId) {
          // get revision info if a revision is specified
          this.revision =
            revisionId !== this.currentRevision.id
              ? Revision.serialization.fromJson(
                  (yield this.editorStore.sdlcServerClient.getRevision(
                    this.editorStore.sdlcState.activeProject.projectId,
                    undefined,
                    revisionId,
                  )) as PlainObject<Revision>,
                )
              : this.currentRevision;
          graphBuildingMaterial = (yield Promise.all([
            this.editorStore.sdlcServerClient.getEntitiesByRevision(
              this.editorStore.sdlcState.activeProject.projectId,
              undefined,
              revisionId,
            ),
            this.editorStore.sdlcServerClient.getConfigurationByVersion(
              this.editorStore.sdlcState.activeProject.projectId,
              revisionId,
            ),
          ])) as [Entity[], PlainObject<ProjectConfiguration>];
        }
        // if no revision ID or version ID is specified, we will just get the project HEAD
        else if (!revisionId && !versionId) {
          try {
            graphBuildingMaterial = (yield Promise.all([
              this.editorStore.sdlcServerClient.getEntities(
                this.editorStore.sdlcState.activeProject.projectId,
                undefined,
              ),
              this.editorStore.sdlcServerClient.getConfiguration(
                this.editorStore.sdlcState.activeProject.projectId,
                undefined,
              ),
            ])) as [Entity[], PlainObject<ProjectConfiguration>];
          } catch {
            return;
          }
        } else {
          throw new IllegalStateError(
            `Can't initialize viewer when both 'verisonId' and 'revisionId' are provided`,
          );
        }

        yield flowResult(
          this.initializeForSDLCProject(
            graphBuildingMaterial[0],
            ProjectConfiguration.serialization.fromJson(
              graphBuildingMaterial[1],
            ),
          ),
        );
      } else if (gav) {
        const { groupId, artifactId, versionId } = parseGAVCoordinates(gav);
        yield flowResult(this.initializeForGAV(groupId, artifactId, versionId));
      } else {
        throw new IllegalStateError(
          `Can't initialize viewer when neither 'projectId' nor 'gav' is provided`,
        );
      }

      // open element if provided an element path
      if (
        this.editorStore.graphManagerState.graph.buildState.hasSucceeded &&
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
            `Can't find element '${elementPath}' in project '${this.editorStore.sdlcState.activeProject.projectId}'`,
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
