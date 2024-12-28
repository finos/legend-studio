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

import { computed, flow, flowResult, makeObservable, observable } from 'mobx';
import type { EditorStore } from '../editor/EditorStore.js';
import {
  type GeneratorFn,
  type PlainObject,
  assertErrorThrown,
  AssertionError,
  LogEvent,
  IllegalStateError,
  StopWatch,
} from '@finos/legend-shared';
import {
  type ProjectViewerPathParams,
  generateViewProjectByGAVRoute,
  generateViewVersionRoute,
  generateViewRevisionRoute,
  generateViewProjectRoute,
} from '../../__lib__/LegendStudioNavigation.js';
import {
  type Entity,
  type ProjectGAVCoordinates,
  type EntitiesWithOrigin,
  parseGAVCoordinates,
} from '@finos/legend-storage';
import {
  ProjectConfiguration,
  Revision,
  RevisionAlias,
  Version,
  Workspace,
} from '@finos/legend-server-sdlc';
import { LEGEND_STUDIO_APP_EVENT } from '../../__lib__/LegendStudioEvent.js';
import { DEFAULT_TAB_SIZE } from '@finos/legend-application';
import { resolveVersion, StoreProjectData } from '@finos/legend-server-depot';
import {
  type WorkflowManagerState,
  ProjectVersionWorkflowManagerState,
  ProjectWorkflowManagerState,
} from '../editor/sidebar-state/WorkflowManagerState.js';
import {
  GRAPH_MANAGER_EVENT,
  DependencyGraphBuilderError,
  GraphDataDeserializationError,
  GraphBuilderError,
  createGraphBuilderReport,
  LegendSDLC,
} from '@finos/legend-graph';
import { GRAPH_EDITOR_MODE } from '../editor/EditorConfig.js';
import { LegendStudioTelemetryHelper } from '../../__lib__/LegendStudioTelemetryHelper.js';
import { payloadDebugger } from '../editor/panel-group/DevToolPanelState.js';

interface ProjectViewerGraphBuilderMaterial {
  entities: Entity[];
  dependencyEntitiesIndex: Map<string, EntitiesWithOrigin>;
}

export class ProjectViewerStore {
  readonly editorStore: EditorStore;
  currentRevision?: Revision | undefined;
  latestVersion?: Version | undefined;
  revision?: Revision | undefined;
  version?: Version | undefined;
  initialEntityPath?: string | undefined;
  projectGAVCoordinates?: ProjectGAVCoordinates | undefined;
  workflowManagerState: WorkflowManagerState | undefined;

  constructor(editorStore: EditorStore) {
    makeObservable<
      ProjectViewerStore,
      'initializeWithProjectInformation' | 'initializeWithGAV'
    >(this, {
      currentRevision: observable,
      latestVersion: observable,
      revision: observable,
      version: observable,
      projectGAVCoordinates: observable.ref,
      workflowManagerState: observable.ref,
      onLatestVersion: computed,
      onCurrentRevision: computed,
      initializeWithProjectInformation: flow,
      initializeWithGAV: flow,
      buildGraph: flow,
      initialize: flow,
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
  internalizeEntityPath(params: ProjectViewerPathParams): void {
    const { gav, projectId, revisionId, versionId, entityPath } = params;
    if (entityPath) {
      this.initialEntityPath = entityPath;
      if (projectId) {
        this.editorStore.applicationStore.navigationService.navigator.updateCurrentLocation(
          versionId
            ? generateViewVersionRoute(projectId, versionId)
            : revisionId
              ? generateViewRevisionRoute(projectId, revisionId)
              : generateViewProjectRoute(projectId),
        );
      } else if (gav) {
        const {
          groupId,
          artifactId,
          versionId: _versionId,
        } = parseGAVCoordinates(gav);
        this.editorStore.applicationStore.navigationService.navigator.updateCurrentLocation(
          generateViewProjectByGAVRoute(groupId, artifactId, _versionId),
        );
      }
    }
  }

  /**
   * Initialize the graph by fetching project information from the SDLC server.
   */
  private *initializeWithProjectInformation(
    projectId: string,
    versionId: string | undefined,
    revisionId: string | undefined,
  ): GeneratorFn<ProjectViewerGraphBuilderMaterial> {
    const stopWatch = new StopWatch();

    // fetch project informations
    this.editorStore.initState.setMessage(`Fetching project information...`);
    yield flowResult(this.editorStore.sdlcState.fetchCurrentProject(projectId));
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

    // ensure only either version or revision is specified
    if (versionId && revisionId) {
      throw new IllegalStateError(
        `Can't have both version ID and revision ID specified for viewer mode`,
      );
    }

    let graphBuildingMaterial: [Entity[], PlainObject<ProjectConfiguration>];
    this.editorStore.initState.setMessage(undefined);

    // fetch entities
    stopWatch.record();
    this.editorStore.initState.setMessage(`Fetching entities...`);
    if (versionId && !revisionId) {
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
    } else if (revisionId && !versionId) {
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
        this.editorStore.sdlcServerClient.getConfigurationByRevision(
          this.editorStore.sdlcState.activeProject.projectId,
          undefined,
          revisionId,
        ),
      ])) as [Entity[], PlainObject<ProjectConfiguration>];
    }
    // if no revision ID or version ID is specified, we will just get the project HEAD
    else if (!revisionId && !versionId) {
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
    } else {
      throw new IllegalStateError(
        `Can't initialize viewer when both 'verisonId' and 'revisionId' are provided`,
      );
    }
    this.editorStore.initState.setMessage(undefined);
    stopWatch.record(GRAPH_MANAGER_EVENT.FETCH_GRAPH_ENTITIES__SUCCESS);

    // fetch project configuration
    const projectConfiguration = ProjectConfiguration.serialization.fromJson(
      graphBuildingMaterial[1],
    );
    this.editorStore.projectConfigurationEditorState.setProjectConfiguration(
      projectConfiguration,
    );
    this.editorStore.projectConfigurationEditorState.setOriginalProjectConfiguration(
      projectConfiguration,
    );

    // fetch project versions
    yield Promise.all([
      this.editorStore.sdlcState.fetchProjectVersions(),
      this.editorStore.sdlcState.fetchPublishedProjectVersions(),
      this.editorStore.sdlcState.fetchAuthorizedActions(),
    ]);

    // fetch entities
    const entities = graphBuildingMaterial[0];
    this.editorStore.changeDetectionState.workspaceLocalLatestRevisionState.setEntities(
      entities,
    );

    // fetch dependencies
    this.editorStore.graphManagerState.dependenciesBuildState.setMessage(
      `Fetching dependencies...`,
    );
    const dependencyEntitiesIndex =
      (yield this.editorStore.graphState.getIndexedDependencyEntities()) as Map<
        string,
        EntitiesWithOrigin
      >;
    stopWatch.record(GRAPH_MANAGER_EVENT.FETCH_GRAPH_DEPENDENCIES__SUCCESS);

    return {
      entities,
      dependencyEntitiesIndex,
    };
  }

  /**
   * Initialize the viewer store given GAV coordinate of a project.
   * This flow is different than the SDLC flow as we need to fetch the project
   * from Depot server here, where SDLC objects like project configurations
   * are not available.
   */
  private *initializeWithGAV(
    groupId: string,
    artifactId: string,
    versionId: string,
  ): GeneratorFn<ProjectViewerGraphBuilderMaterial> {
    const stopWatch = new StopWatch();

    // fetch project data
    this.editorStore.initState.setMessage(`Fetching project data...`);
    const project = StoreProjectData.serialization.fromJson(
      (yield flowResult(
        this.editorStore.depotServerClient.getProject(groupId, artifactId),
      )) as PlainObject<StoreProjectData>,
    );
    this.editorStore.initState.setMessage(undefined);

    // fetch entities
    stopWatch.record();
    this.editorStore.initState.setMessage(`Fetching entities...`);
    const entities = (yield this.editorStore.depotServerClient.getEntities(
      project,
      versionId,
    )) as Entity[];
    this.editorStore.initState.setMessage(undefined);
    stopWatch.record(GRAPH_MANAGER_EVENT.FETCH_GRAPH_ENTITIES__SUCCESS);

    // fetch dependencies
    this.editorStore.graphManagerState.dependenciesBuildState.setMessage(
      `Fetching dependencies...`,
    );
    const dependencyEntitiesIndex = (yield flowResult(
      this.editorStore.depotServerClient.getIndexedDependencyEntities(
        project,
        versionId,
      ),
    )) as Map<string, EntitiesWithOrigin>;
    stopWatch.record(GRAPH_MANAGER_EVENT.FETCH_GRAPH_DEPENDENCIES__SUCCESS);

    return {
      entities,
      dependencyEntitiesIndex: dependencyEntitiesIndex,
    };
  }

  *buildGraph(
    entities: Entity[],
    dependencyEntitiesIndex: Map<string, EntitiesWithOrigin>,
  ): GeneratorFn<boolean> {
    try {
      const stopWatch = new StopWatch();

      // initialize graph manager
      yield this.editorStore.graphManagerState.graphManager.initialize(
        {
          env: this.editorStore.applicationStore.config.env,
          tabSize: DEFAULT_TAB_SIZE,
          clientConfig: {
            baseUrl: this.editorStore.applicationStore.config.engineServerUrl,
            queryBaseUrl:
              this.editorStore.applicationStore.config.engineQueryServerUrl,
            enableCompression: true,
            payloadDebugger,
          },
        },
        {
          tracerService: this.editorStore.applicationStore.tracerService,
        },
      );
      yield this.editorStore.graphManagerState.initializeSystem();

      // reset
      this.editorStore.graphManagerState.resetGraph();

      // build dependencies
      stopWatch.record();
      const dependencyManager =
        this.editorStore.graphManagerState.graphManager.createDependencyManager();
      this.editorStore.graphManagerState.graph.dependencyManager =
        dependencyManager;

      const dependency_buildReport = createGraphBuilderReport();
      yield this.editorStore.graphManagerState.graphManager.buildDependencies(
        this.editorStore.graphManagerState.coreModel,
        this.editorStore.graphManagerState.systemModel,
        dependencyManager,
        dependencyEntitiesIndex,
        this.editorStore.graphManagerState.dependenciesBuildState,
        {},
        dependency_buildReport,
      );

      // build graph
      const graph_buildReport = createGraphBuilderReport();
      yield this.editorStore.graphManagerState.graphManager.buildGraph(
        this.editorStore.graphManagerState.graph,
        entities,
        this.editorStore.graphManagerState.graphBuildState,
        {
          origin: this.projectGAVCoordinates
            ? new LegendSDLC(
                this.projectGAVCoordinates.groupId,
                this.projectGAVCoordinates.artifactId,
                resolveVersion(this.projectGAVCoordinates.versionId),
              )
            : undefined,
        },
        graph_buildReport,
      );

      // report
      stopWatch.record(GRAPH_MANAGER_EVENT.INITIALIZE_GRAPH__SUCCESS);
      const graphBuilderReportData = {
        timings:
          this.editorStore.applicationStore.timeService.finalizeTimingsRecord(
            stopWatch,
          ),
        dependencies: dependency_buildReport,
        dependenciesCount:
          this.editorStore.graphManagerState.graph.dependencyManager
            .numberOfDependencies,
        graph: graph_buildReport,
      };
      LegendStudioTelemetryHelper.logEvent_GraphInitializationSucceeded(
        this.editorStore.applicationStore.telemetryService,
        graphBuilderReportData,
      );

      this.editorStore.applicationStore.logService.info(
        LogEvent.create(GRAPH_MANAGER_EVENT.INITIALIZE_GRAPH__SUCCESS),
        graphBuilderReportData,
      );

      // fetch available editor configurations
      yield Promise.all([
        this.editorStore.graphState.graphGenerationState.globalFileGenerationState.fetchAvailableFileGenerationDescriptions(),
        this.editorStore.graphState.graphGenerationState.externalFormatState.fetchExternalFormatDescriptions(),
        this.editorStore.graphState.graphGenerationState.externalFormatState.fetchExternalFormatDescriptions(),
        this.editorStore.graphState.fetchAvailableFunctionActivatorConfigurations(),
      ]);

      return true;
    } catch (error) {
      assertErrorThrown(error);

      // if graph builder fails, we fall back to text-mode
      this.editorStore.applicationStore.logService.error(
        LogEvent.create(GRAPH_MANAGER_EVENT.GRAPH_BUILDER_FAILURE),
        error,
      );
      if (error instanceof DependencyGraphBuilderError) {
        // no recovery if dependency models cannot be built, this makes assumption that all dependencies models are compiled successfully
        // TODO: we might want to handle this more gracefully when we can show people the dependency model element in the future
        this.editorStore.applicationStore.notificationService.notifyError(
          `Can't initialize dependency models. Error: ${error.message}`,
        );
        this.editorStore.applicationStore.alertService.setBlockingAlert({
          message: `Can't initialize dependencies`,
          prompt: 'Please use editor to better invesigate the issue',
        });
      } else if (error instanceof GraphDataDeserializationError) {
        // if something goes wrong with de-serialization, we can't really do anything but to alert
        this.editorStore.applicationStore.notificationService.notifyError(
          `Can't deserialize graph. Error: ${error.message}`,
        );
        this.editorStore.applicationStore.alertService.setBlockingAlert({
          message: `Can't deserialize graph`,
          prompt: 'Please use editor to better invesigate the issue',
        });
      } else if (error instanceof GraphBuilderError) {
        // TODO: we should split this into 2 notifications when we support multiple notifications
        this.editorStore.applicationStore.notificationService.notifyError(
          `Can't build graph. Redirected to text mode for debugging. Error: ${error.message}`,
        );
        this.editorStore.applicationStore.logService.error(
          LogEvent.create(GRAPH_MANAGER_EVENT.GRAPH_BUILDER_FAILURE),
          error,
        );
        yield flowResult(
          this.editorStore.switchModes(GRAPH_EDITOR_MODE.GRAMMAR_TEXT, {
            isGraphBuildFailure: true,
          }),
        );
        if (this.editorStore.graphEditorMode.mode === GRAPH_EDITOR_MODE.FORM) {
          // nothing we can do here so we will just block the user
          this.editorStore.applicationStore.alertService.setBlockingAlert({
            message: `Can't compose Pure code from graph models`,
            prompt: 'Please use editor to better invesigate the issue',
          });
          return false;
        }
      } else {
        this.editorStore.applicationStore.notificationService.notifyError(
          error,
        );
      }
      return false;
    }
  }

  *initialize(params: ProjectViewerPathParams): GeneratorFn<void> {
    if (!this.editorStore.initState.isInInitialState) {
      return;
    }
    const { gav, projectId } = params;

    this.editorStore.initState.inProgress();
    const onLeave = (hasBuildSucceeded: boolean): void => {
      this.editorStore.initState.complete(hasBuildSucceeded);
    };

    try {
      let graphBuilderMaterial: ProjectViewerGraphBuilderMaterial;
      if (projectId) {
        graphBuilderMaterial = (yield flowResult(
          this.initializeWithProjectInformation(
            projectId,
            params.versionId,
            params.revisionId,
          ),
        )) as ProjectViewerGraphBuilderMaterial;
      } else if (gav) {
        this.projectGAVCoordinates = parseGAVCoordinates(gav);
        const { groupId, artifactId, versionId } = this.projectGAVCoordinates;
        graphBuilderMaterial = (yield flowResult(
          this.initializeWithGAV(groupId, artifactId, versionId),
        )) as ProjectViewerGraphBuilderMaterial;
      } else {
        throw new IllegalStateError(
          `Can't initialize viewer when neither 'projectId' nor 'gav' is provided`,
        );
      }

      const graphBuilderResult = (yield flowResult(
        this.buildGraph(
          graphBuilderMaterial.entities,
          graphBuilderMaterial.dependencyEntitiesIndex,
        ),
      )) as boolean;

      if (!graphBuilderResult) {
        onLeave(false);
        return;
      }

      // generate
      // NOTE: if we fetch the entities from a published project
      // there is no need to generate since the generated elements are already included
      if (!gav) {
        this.editorStore.initState.setMessage(`Generating elements...`);
        if (
          this.editorStore.graphManagerState.graph.ownGenerationSpecifications
            .length
        ) {
          yield flowResult(
            this.editorStore.graphState.graphGenerationState.globalGenerate(),
          );
        }
        this.editorStore.initState.setMessage(undefined);
      }

      // build explorer tree
      this.editorStore.explorerTreeState.buildImmutableModelTrees();
      this.editorStore.explorerTreeState.build();

      // open element if provided an element path
      if (
        this.editorStore.graphManagerState.graphBuildState.hasSucceeded &&
        this.editorStore.explorerTreeState.buildState.hasCompleted &&
        this.initialEntityPath
      ) {
        try {
          this.editorStore.graphEditorMode.openElement(
            this.editorStore.graphManagerState.graph.getElement(
              this.initialEntityPath,
            ),
          );
        } catch {
          const elementPath = this.initialEntityPath;
          this.initialEntityPath = undefined;
          throw new AssertionError(
            `Can't find element with path '${elementPath}'`,
          );
        }
      }

      // initialize workflow manager
      // NOTE: We will not show workflow viewer when `GAV` coordinates are provided
      // as we don't know which sdlc instance to fetch from.
      // Revision will be supported once `SDLC` adds the workflow apis.
      if (this.version) {
        this.workflowManagerState = new ProjectVersionWorkflowManagerState(
          this.editorStore,
          this.editorStore.sdlcState,
          this.version,
        );
      } else if (!this.projectGAVCoordinates && !this.revision) {
        this.workflowManagerState = new ProjectWorkflowManagerState(
          this.editorStore,
          this.editorStore.sdlcState,
        );
      }

      onLeave(true);
    } catch (error) {
      assertErrorThrown(error);
      this.editorStore.applicationStore.logService.error(
        LogEvent.create(LEGEND_STUDIO_APP_EVENT.SDLC_MANAGER_FAILURE),
        error,
      );
      this.editorStore.applicationStore.notificationService.notifyError(error);
      onLeave(false);
    }
  }
}
