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

import { action, flowResult, makeAutoObservable, observable } from 'mobx';
import type { EditorStore } from './EditorStore';
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
  type ViewerPathParams,
  generateViewProjectByGAVRoute,
  generateViewVersionRoute,
  generateViewRevisionRoute,
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
import { LEGEND_STUDIO_APP_EVENT } from './LegendStudioAppEvent';
import { TAB_SIZE } from '@finos/legend-application';
import {
  type ProjectGAVCoordinates,
  LATEST_VERSION_ALIAS,
  SNAPSHOT_VERSION_ALIAS,
  parseGAVCoordinates,
  ProjectData,
  ProjectVersionEntities,
} from '@finos/legend-server-depot';
import {
  type WorkflowManagerState,
  ProjectVersionWorkflowManagerState,
  ProjectWorkflowManagerState,
} from './sidebar-state/WorkflowManagerState';
import {
  type GraphBuilderReport,
  GraphManagerTelemetry,
  GRAPH_MANAGER_EVENT,
} from '@finos/legend-graph';

export class ViewerStore {
  editorStore: EditorStore;
  currentRevision?: Revision | undefined;
  latestVersion?: Version | undefined;
  revision?: Revision | undefined;
  version?: Version | undefined;
  elementPath?: string | undefined;
  projectGAVCoordinates?: ProjectGAVCoordinates | undefined;
  workflowManagerState: WorkflowManagerState | undefined;

  constructor(editorStore: EditorStore) {
    makeAutoObservable(this, {
      editorStore: false,
      projectGAVCoordinates: observable.ref,
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
            ? generateViewRevisionRoute(
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
        const {
          groupId,
          artifactId,
          versionId: _versionId,
        } = parseGAVCoordinates(gav);
        this.editorStore.applicationStore.navigator.goTo(
          generateViewProjectByGAVRoute(groupId, artifactId, _versionId),
        );
      }
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
          tracerService: this.editorStore.applicationStore.tracerService,
        },
      ),
    );

    // initialize graph manager
    yield flowResult(this.editorStore.graphManagerState.initializeSystem());
  }

  /**
   * Initialize the graph by fetching project information from the SDLC server.
   */
  private *initializeWithProjectInformation(
    projectId: string,
    versionId: string | undefined,
    revisionId: string | undefined,
  ): GeneratorFn<void> {
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

    // fetch project versions
    yield flowResult(this.editorStore.sdlcState.fetchProjectVersions());

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
        this.editorStore.sdlcServerClient.getConfigurationByRevision(
          this.editorStore.sdlcState.activeProject.projectId,
          undefined,
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
    this.editorStore.initState.setMessage(undefined);
    stopWatch.record(GRAPH_MANAGER_EVENT.GRAPH_ENTITIES_FETCHED);

    const entities = graphBuildingMaterial[0];
    const projectConfiguration = ProjectConfiguration.serialization.fromJson(
      graphBuildingMaterial[1],
    );

    this.editorStore.projectConfigurationEditorState.setProjectConfiguration(
      projectConfiguration,
    );

    // make sure we set the original project configuration to a different object
    this.editorStore.projectConfigurationEditorState.setOriginalProjectConfiguration(
      projectConfiguration,
    );
    this.editorStore.changeDetectionState.workspaceLocalLatestRevisionState.setEntities(
      entities,
    );
    this.editorStore.changeDetectionState.stop();

    // fetch dependencies
    stopWatch.record();
    this.editorStore.initState.setMessage(`Fetching dependencies...`);
    const dependencyEntitiesMap = (yield flowResult(
      this.editorStore.graphState.getConfigurationProjectDependencyEntities(),
    )) as Map<string, Entity[]>;
    this.editorStore.initState.setMessage(undefined);
    stopWatch.record(GRAPH_MANAGER_EVENT.GRAPH_DEPENDENCIES_FETCHED);

    // reset
    this.editorStore.graphManagerState.resetGraph();
    yield flowResult(this.initializeGraphManagerState());
    stopWatch.record();

    // build dependencies
    const dependencyManager =
      this.editorStore.graphManagerState.createEmptyDependencyManager();
    this.editorStore.graphManagerState.graph.setDependencyManager(
      dependencyManager,
    );
    const dependency_buildReport = (yield flowResult(
      this.editorStore.graphManagerState.graphManager.buildDependencies(
        this.editorStore.graphManagerState.coreModel,
        this.editorStore.graphManagerState.systemModel,
        dependencyManager,
        dependencyEntitiesMap,
      ),
    )) as GraphBuilderReport;
    dependency_buildReport.timings[
      GRAPH_MANAGER_EVENT.GRAPH_DEPENDENCIES_FETCHED
    ] = stopWatch.getRecord(GRAPH_MANAGER_EVENT.GRAPH_DEPENDENCIES_FETCHED);

    // build graph
    const graph_buildReport = (yield flowResult(
      this.editorStore.graphManagerState.graphManager.buildGraph(
        this.editorStore.graphManagerState.graph,
        entities,
        {
          TEMPORARY_skipGraphBuilderPostProcessing: true,
        },
      ),
    )) as GraphBuilderReport;
    graph_buildReport.timings[GRAPH_MANAGER_EVENT.GRAPH_ENTITIES_FETCHED] =
      stopWatch.getRecord(GRAPH_MANAGER_EVENT.GRAPH_ENTITIES_FETCHED);

    // report
    stopWatch.record(GRAPH_MANAGER_EVENT.GRAPH_INITIALIZED);
    const graphBuilderReportData = {
      timings: {
        [GRAPH_MANAGER_EVENT.GRAPH_INITIALIZED]: stopWatch.getRecord(
          GRAPH_MANAGER_EVENT.GRAPH_INITIALIZED,
        ),
      },
      dependencies: dependency_buildReport,
      graph: graph_buildReport,
    };
    this.editorStore.applicationStore.log.info(
      LogEvent.create(GRAPH_MANAGER_EVENT.GRAPH_INITIALIZED),
      graphBuilderReportData,
    );
    GraphManagerTelemetry.logEvent_GraphInitialized(
      this.editorStore.applicationStore.telemetryService,
      graphBuilderReportData,
    );

    // fetch available file generation descriptions
    this.editorStore.initState.setMessage(`Generating elements...`);
    yield flowResult(
      this.editorStore.graphState.graphGenerationState.fetchAvailableFileGenerationDescriptions(),
    );
    yield flowResult(
      this.editorStore.graphState.graphGenerationState.externalFormatState.fetchExternalFormatsDescriptions(),
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
    this.editorStore.initState.setMessage(undefined);
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
  ): GeneratorFn<void> {
    const stopWatch = new StopWatch();

    // fetch project data
    this.editorStore.initState.setMessage(`Fetching project data...`);
    const projectData = ProjectData.serialization.fromJson(
      (yield flowResult(
        this.editorStore.depotServerClient.getProject(groupId, artifactId),
      )) as PlainObject<ProjectData>,
    );
    this.editorStore.initState.setMessage(undefined);

    // fetch entities
    stopWatch.record();
    this.editorStore.initState.setMessage(`Fetching entities...`);
    let entities: Entity[] = [];
    if (versionId === SNAPSHOT_VERSION_ALIAS) {
      entities =
        (yield this.editorStore.depotServerClient.getLatestRevisionEntities(
          groupId,
          artifactId,
        )) as Entity[];
    } else {
      entities = (yield this.editorStore.depotServerClient.getVersionEntities(
        groupId,
        artifactId,
        versionId === LATEST_VERSION_ALIAS
          ? projectData.latestVersion
          : versionId,
      )) as Entity[];
    }
    this.editorStore.initState.setMessage(undefined);
    stopWatch.record(GRAPH_MANAGER_EVENT.GRAPH_ENTITIES_FETCHED);

    // fetch dependencies
    stopWatch.record();
    this.editorStore.initState.setMessage(`Fetching dependencies...`);
    const dependencyEntitiesMap = new Map<string, Entity[]>();
    (versionId === SNAPSHOT_VERSION_ALIAS
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
            ? projectData.latestVersion
            : versionId,
          true,
          false,
        )) as PlainObject<ProjectVersionEntities>[])
    )
      .map((e) => ProjectVersionEntities.serialization.fromJson(e))
      .forEach((dependencyInfo) => {
        dependencyEntitiesMap.set(dependencyInfo.id, dependencyInfo.entities);
      });
    this.editorStore.initState.setMessage(undefined);
    stopWatch.record(GRAPH_MANAGER_EVENT.GRAPH_DEPENDENCIES_FETCHED);

    // reset
    this.editorStore.graphManagerState.resetGraph();
    yield flowResult(this.initializeGraphManagerState());
    stopWatch.record();

    const dependencyManager =
      this.editorStore.graphManagerState.createEmptyDependencyManager();
    this.editorStore.graphManagerState.graph.setDependencyManager(
      dependencyManager,
    );

    // build dependencies
    const dependency_buildReport = (yield flowResult(
      this.editorStore.graphManagerState.graphManager.buildDependencies(
        this.editorStore.graphManagerState.coreModel,
        this.editorStore.graphManagerState.systemModel,
        dependencyManager,
        dependencyEntitiesMap,
      ),
    )) as GraphBuilderReport;
    dependency_buildReport.timings[
      GRAPH_MANAGER_EVENT.GRAPH_DEPENDENCIES_FETCHED
    ] = stopWatch.getRecord(GRAPH_MANAGER_EVENT.GRAPH_DEPENDENCIES_FETCHED);

    // build graph
    const graph_buildReport = (yield flowResult(
      this.editorStore.graphManagerState.graphManager.buildGraph(
        this.editorStore.graphManagerState.graph,
        entities,
        {
          TEMPORARY_skipGraphBuilderPostProcessing: true,
        },
      ),
    )) as GraphBuilderReport;
    graph_buildReport.timings[GRAPH_MANAGER_EVENT.GRAPH_ENTITIES_FETCHED] =
      stopWatch.getRecord(GRAPH_MANAGER_EVENT.GRAPH_ENTITIES_FETCHED);

    // report
    stopWatch.record(GRAPH_MANAGER_EVENT.GRAPH_INITIALIZED);
    const graphBuilderReportData = {
      timings: {
        [GRAPH_MANAGER_EVENT.GRAPH_INITIALIZED]: stopWatch.getRecord(
          GRAPH_MANAGER_EVENT.GRAPH_INITIALIZED,
        ),
      },
      dependencies: dependency_buildReport,
      graph: graph_buildReport,
    };
    this.editorStore.applicationStore.log.info(
      LogEvent.create(GRAPH_MANAGER_EVENT.GRAPH_INITIALIZED),
      graphBuilderReportData,
    );
    GraphManagerTelemetry.logEvent_GraphInitialized(
      this.editorStore.applicationStore.telemetryService,
      graphBuilderReportData,
    );
  }

  *initialize(params: ViewerPathParams): GeneratorFn<void> {
    if (!this.editorStore.initState.isInInitialState) {
      return;
    }
    const { gav, projectId } = params;

    this.editorStore.initState.inProgress();
    const onLeave = (hasBuildSucceeded: boolean): void => {
      this.editorStore.initState.complete(hasBuildSucceeded);
    };

    try {
      if (projectId) {
        yield flowResult(
          this.initializeWithProjectInformation(
            projectId,
            params.versionId,
            params.revisionId,
          ),
        );
      } else if (gav) {
        this.projectGAVCoordinates = parseGAVCoordinates(gav);
        const { groupId, artifactId, versionId } = this.projectGAVCoordinates;
        yield flowResult(
          this.initializeWithGAV(groupId, artifactId, versionId),
        );
      } else {
        throw new IllegalStateError(
          `Can't initialize viewer when neither 'projectId' nor 'gav' is provided`,
        );
      }

      // build explorer tree
      this.editorStore.explorerTreeState.buildImmutableModelTrees();
      this.editorStore.explorerTreeState.build();

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
      this.initWorkflowManagerState();
      onLeave(true);
    } catch (error) {
      assertErrorThrown(error);
      this.editorStore.applicationStore.log.error(
        LogEvent.create(LEGEND_STUDIO_APP_EVENT.SDLC_MANAGER_FAILURE),
        error,
      );
      this.editorStore.applicationStore.notifyError(error);
      onLeave(false);
    }
  }

  initWorkflowManagerState(): void {
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
  }
}
