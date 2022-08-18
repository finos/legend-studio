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

import {
  ActionAlertActionType,
  ActionAlertType,
} from '@finos/legend-application';
import {
  getOrCreateGraphPackage,
  PackageableElementExplicitReference,
  PureSingleExecution,
  resolvePackagePathAndElementName,
  Service,
} from '@finos/legend-graph';
import {
  type ProjectData,
  generateGAVCoordinates,
  LATEST_VERSION_ALIAS,
  ProjectDependencyCoordinates,
  ProjectVersionEntities,
  SNAPSHOT_VERSION_ALIAS,
} from '@finos/legend-server-depot';
import {
  EntityChange,
  EntityChangeType,
  ProjectConfiguration,
  ProjectDependency,
  UpdateProjectConfigurationCommand,
  Workspace,
  WorkspaceType,
  Project,
} from '@finos/legend-server-sdlc';
import {
  type GeneratorFn,
  type PlainObject,
  assertNonEmptyString,
  assertTrue,
  IllegalStateError,
  generateEnumerableNameFromToken,
  ActionState,
  assertErrorThrown,
  guaranteeNonNullable,
  uuid,
  prettyCONSTName,
  UnsupportedOperationError,
} from '@finos/legend-shared';
import type { Entity } from '@finos/legend-storage';
import { action, flow, flowResult, makeObservable, observable } from 'mobx';
import type { QueryEditorStore } from './QueryEditorStore.js';

enum PROMOTING_SERVICE_PHASE {
  VERIFYING_SERVICE_INPUTS = 'VERIFYING_SERVICE_INPUTS',
  CREATING_WORKSPACE = 'CREATING_WORKSPACE',
  SYNCING_WORKSPACE_WITH_DEPENDENCIES = 'SYNCING_WORKSPACE_WITH_DEPENDENCIES',
  SYNCING_WORKSPACE_WITH_SERVICE = 'SYNCING_WORKSPACE_WITH_SERVICE',
}

export interface ProjectOption {
  label: string;
  value: Project;
}

type ServiceCommitCommand = {
  configuration: ProjectConfiguration;
  entities: Entity[];
  dependenciesToAdd?: ProjectDependency[] | undefined;
};

export class QueryPromoteToServiceState {
  depotProject: ProjectData | undefined;
  versionId: string | undefined;

  queryEditorStore: QueryEditorStore;
  // modal data/states
  showModal = false;
  projects: Project[] | undefined;
  workspaces: Workspace[] = [];
  initializingState = ActionState.create();
  promotingToServiceState = ActionState.create();
  fetchingProjectDataState = ActionState.create();
  promotingPhase: PROMOTING_SERVICE_PHASE | undefined = undefined;
  // service sdlc  input
  project: Project | undefined;
  projectSetupComplete = false;
  workspaceName = 'QueryServiceWorkspace';

  // service metadata
  servicePattern = `/${uuid()}`;

  commitCommand: ServiceCommitCommand | undefined;

  constructor(editorStore: QueryEditorStore) {
    this.queryEditorStore = editorStore;

    makeObservable(this, {
      depotProject: observable,
      versionId: observable,
      projects: observable,
      workspaces: observable,
      initializingState: observable,
      project: observable,
      projectSetupComplete: observable,
      workspaceName: observable,
      showModal: observable,
      fetchingProjectDataState: observable,
      promotingToServiceState: observable,
      servicePattern: observable,
      setDepotProject: action,
      setVersionId: action,
      setProject: action,
      setOpenModal: action,
      setWorkspaceName: action,
      setProjectSetupComplete: action,
      setPromotingPhase: action,
      handleProjectSetupComplete: action,
      setServicePattern: action,
      promoteQueryToService: flow,
      init: flow,
      handleChangeProject: flow,
      updateProjectsAndWorkspaces: flow,
      verifyServiceInputs: flow,
      fetchEntitiesFromProjectCoordinates: flow,
    });
  }

  get projectOptions(): ProjectOption[] | undefined {
    if (!this.projects) {
      return undefined;
    }
    return this.projects.map((project) => ({
      label: project.name,
      value: project,
    }));
  }

  get selectedProject(): ProjectOption | undefined {
    if (this.project) {
      return {
        label: this.project.name,
        value: this.project,
      };
    }
    return undefined;
  }

  get generateServicePattern(): string {
    return `/${uuid()}/${this.queryEditorStore.queryBuilderState.queryParametersState.parameterStates
      .map((e) => `{${e.parameter.name}}`)
      .join('/')}`;
  }

  get isDepotProject(): boolean {
    const depotProject = this.depotProject;
    if (this.project && depotProject) {
      return this.project.projectId === depotProject.projectId;
    }
    return false;
  }

  get depotProjectData(): ProjectData {
    return guaranteeNonNullable(this.depotProject);
  }

  get depotProjectVersionId(): string {
    return guaranteeNonNullable(this.versionId);
  }

  get resolvedDepotProjectVersionId(): string | undefined {
    return this.depotProjectVersionId === SNAPSHOT_VERSION_ALIAS
      ? undefined
      : this.depotProjectVersionId === LATEST_VERSION_ALIAS
      ? this.depotProjectData.latestVersion
      : this.depotProjectVersionId;
  }

  setDepotProject(val: ProjectData | undefined): void {
    this.depotProject = val;
  }

  setVersionId(val: string | undefined): void {
    this.versionId = val;
  }

  setOpenModal(val: boolean): void {
    this.showModal = val;
  }

  setProjects(projects: Project[] | undefined): void {
    this.projects = projects;
  }

  setProject(project: Project | undefined): void {
    this.project = project;
  }

  setWorkspaceName(workspace: string): void {
    this.workspaceName = workspace;
  }

  setServicePattern(val: string): void {
    this.servicePattern = val;
  }

  setProjectSetupComplete(val: boolean): void {
    this.projectSetupComplete = val;
  }

  setPromotingPhase(val: PROMOTING_SERVICE_PHASE | undefined): void {
    this.promotingPhase = val;
    if (this.promotingToServiceState.isInProgress) {
      this.promotingToServiceState.setMessage(prettyCONSTName(val));
    }
  }

  setCommitCommand(commitCommand: ServiceCommitCommand | undefined): void {
    this.commitCommand = commitCommand;
  }

  *init(): GeneratorFn<void> {
    try {
      this.initializingState.inProgress();
      this.setOpenModal(true);
      // set up modal options
      if (this.projects === undefined) {
        yield flowResult(this.updateProjectsAndWorkspaces());
      }
      this.servicePattern = this.generateServicePattern;
      this.initializingState.pass();
    } catch (error) {
      assertErrorThrown(error);
      this.queryEditorStore.applicationStore.notifyError(error);
      this.initializingState.fail();
    }
  }

  handleProjectSetupComplete(val: boolean): void {
    this.setCommitCommand(undefined);
    this.setProjectSetupComplete(val);
  }

  *handleChangeProject(project: Project): GeneratorFn<void> {
    this.setCommitCommand(undefined);
    try {
      this.fetchingProjectDataState.inProgress();
      const sdlcServer = this.queryEditorStore.sdlcServerClient;
      this.setProject(project);
      this.projectSetupComplete = this.isDepotProject;
      this.workspaces = (
        (yield sdlcServer.getWorkspaces(
          project.projectId,
        )) as PlainObject<Workspace>[]
      ).map((v) => Workspace.serialization.fromJson(v));
      const workspaceName = generateEnumerableNameFromToken(
        this.workspaces.map((w) => w.workspaceId),
        `QueryServiceWorkspace`,
      );
      this.setWorkspaceName(workspaceName);
      this.fetchingProjectDataState.pass();
    } catch (error) {
      assertErrorThrown(error);
      this.workspaces = [];
      this.fetchingProjectDataState.fail();
    }
  }

  *updateProjectsAndWorkspaces(): GeneratorFn<void> {
    const sdlcServer = this.queryEditorStore.sdlcServerClient;
    const projects = (
      (yield sdlcServer.getProjects(
        undefined,
        undefined,
        undefined,
        undefined,
      )) as PlainObject<Project>[]
    ).map((v) => Project.serialization.fromJson(v));
    this.setProjects(projects);
    const associatedSdlcProject = projects.find(
      (project) => project.projectId === this.depotProject?.projectId,
    );
    const project = associatedSdlcProject ?? projects[0];
    if (project) {
      yield flowResult(this.handleChangeProject(project));
    }
  }

  verifyServiceMetaData(): void {
    assertNonEmptyString(this.servicePattern, 'Service url is required');
  }

  *promoteQueryToService(servicePath: string): GeneratorFn<void> {
    let workspaceCreated: Workspace | undefined = undefined;
    try {
      const [packagePath, serviceName] =
        resolvePackagePathAndElementName(servicePath);
      this.setPromotingPhase(undefined);
      this.promotingToServiceState.inProgress();
      const sdlcServer = this.queryEditorStore.sdlcServerClient;
      const project = guaranteeNonNullable(this.project);
      this.setPromotingPhase(PROMOTING_SERVICE_PHASE.VERIFYING_SERVICE_INPUTS);
      if (!this.commitCommand) {
        yield flowResult(this.verifyServiceInputs(packagePath, serviceName));
      }
      const commitCommand = guaranteeNonNullable(this.commitCommand);
      this.setPromotingPhase(PROMOTING_SERVICE_PHASE.CREATING_WORKSPACE);
      workspaceCreated = Workspace.serialization.fromJson(
        (yield sdlcServer.createWorkspace(
          project.projectId,
          this.workspaceName,
          WorkspaceType.GROUP,
        )) as PlainObject<Workspace>,
      );
      if (commitCommand.dependenciesToAdd?.length) {
        this.setPromotingPhase(
          PROMOTING_SERVICE_PHASE.SYNCING_WORKSPACE_WITH_DEPENDENCIES,
        );
        const projectConfiguration = commitCommand.configuration;
        const configCommand = new UpdateProjectConfigurationCommand(
          projectConfiguration.groupId,
          projectConfiguration.artifactId,
          projectConfiguration.projectStructureVersion,
          '[LEGEND QUERY] Promoting Query To Service: Add Service Dependencies',
        );
        configCommand.projectDependenciesToAdd =
          commitCommand.dependenciesToAdd;
        yield sdlcServer.updateConfiguration(
          project.projectId,
          workspaceCreated,
          UpdateProjectConfigurationCommand.serialization.toJson(configCommand),
        );
      }
      this.setPromotingPhase(
        PROMOTING_SERVICE_PHASE.SYNCING_WORKSPACE_WITH_SERVICE,
      );
      const changes = this.createEntityChangesFromEntitieToAdd(
        commitCommand.entities,
      );
      yield sdlcServer.performEntityChanges(
        project.projectId,
        workspaceCreated,
        {
          message:
            '[LEGEND QUERY] Promoting Query To Service: Add Service Element',
          entityChanges: changes,
        },
      );
      this.promotingToServiceState.pass();
      // reset state
      this.setCommitCommand(undefined);
      this.setOpenModal(false);
      this.workspaceName = generateEnumerableNameFromToken(
        [...this.workspaces.map((w) => w.workspaceId), this.workspaceName],
        `QueryServiceWorkspace`,
      );
      // success feedback
      const workspaceURL = `${this.queryEditorStore.applicationStore.config.studioUrl}/edit/${project.projectId}/groupWorkspace/${workspaceCreated.workspaceId}/`;
      const message = `Workspace ${workspaceCreated.workspaceId} with service ${servicePath} created.`;
      this.queryEditorStore.applicationStore.setActionAlertInfo({
        message,
        type: ActionAlertType.STANDARD,
        actions: [
          {
            label: 'Open Workspace',
            type: ActionAlertActionType.PROCEED,
            handler: (): void => {
              this.queryEditorStore.applicationStore.navigator.openNewWindow(
                workspaceURL,
              );
            },
            default: true,
          },
          {
            label: 'Close',
            type: ActionAlertActionType.PROCEED_WITH_CAUTION,
          },
        ],
      });
    } catch (error) {
      assertErrorThrown(error);
      this.setCommitCommand(undefined);
      this.queryEditorStore.applicationStore.notifyError(error);
      if (workspaceCreated) {
        const sdlcServer = this.queryEditorStore.sdlcServerClient;
        const project = guaranteeNonNullable(this.project);
        yield sdlcServer.deleteWorkspace(project.projectId, workspaceCreated);
      }
      this.queryEditorStore.applicationStore.notifyError(
        this.promotingPhase
          ? `${prettyCONSTName(this.promotingPhase)} Phase Failed: ${
              error.message
            }`
          : error,
      );
      this.promotingToServiceState.fail();
    }
  }

  *verifyServiceInputs(
    packagePath: string,
    serviceName: string,
  ): GeneratorFn<void> {
    const sdlcServer = this.queryEditorStore.sdlcServerClient;
    const serviceEntity = this.createServiceEntity(packagePath, serviceName);
    if (this.isDepotProject && !this.projectSetupComplete) {
      throw new UnsupportedOperationError(
        'Unable to select associated query project if project setup is not complete',
      );
    }
    const project = guaranteeNonNullable(this.project);
    const projectEntityData = (yield Promise.all([
      sdlcServer.getEntities(project.projectId, undefined),
      sdlcServer.getConfiguration(project.projectId, undefined),
    ])) as [Entity[], PlainObject<ProjectConfiguration>];
    const [currentProjectEntities, projectConfiguration] = [
      projectEntityData[0],
      ProjectConfiguration.serialization.fromJson(projectEntityData[1]),
    ];
    let projectEntities = [...currentProjectEntities, serviceEntity];
    let dependencyCoordinates =
      this.transformProjectDependencyToProjectCoordinates(
        projectConfiguration.projectDependencies,
      );
    const serviceCommitCommand: ServiceCommitCommand = {
      configuration: projectConfiguration,
      entities: [serviceEntity],
    };
    if (!this.projectSetupComplete) {
      const projectIdFromGAV = generateGAVCoordinates(
        this.depotProjectData.groupId,
        this.depotProjectData.artifactId,
        undefined,
      );
      if (this.resolvedDepotProjectVersionId) {
        const dependencyToAdd = new ProjectDependency(
          projectIdFromGAV,
          this.resolvedDepotProjectVersionId,
        );
        if (
          projectConfiguration.projectDependencies.find(
            (p) =>
              p.projectId === projectIdFromGAV &&
              p.versionId !== this.depotProjectVersionId,
          )
        ) {
          throw new IllegalStateError(
            'Dependency found on current project with inconsistent version. Consider using option of project setup complete`',
          );
        }
        const hasDependency = projectConfiguration.projectDependencies.find(
          (p) => p.hashCode === dependencyToAdd.hashCode,
        );
        if (!hasDependency) {
          const coordinates =
            this.transformProjectDependencyToProjectCoordinates([
              dependencyToAdd,
            ]);
          dependencyCoordinates = [...dependencyCoordinates, ...coordinates];
          serviceCommitCommand.dependenciesToAdd = [dependencyToAdd];
        }
      } else if (this.depotProjectVersionId === SNAPSHOT_VERSION_ALIAS) {
        // All metadata needs to be fetched from depot as we do not know which sdlc instance the depot project comes from
        const depotProjectEntities =
          (yield this.queryEditorStore.depotServerClient.getEntities(
            this.depotProjectData,
            this.depotProjectVersionId,
          )) as Entity[];
        // dependencies
        const depotProjectDependenciesCoordinates =
          (yield this.queryEditorStore.depotServerClient.getProjectDependencies(
            this.depotProjectData.groupId,
            this.depotProjectData.artifactId,
            SNAPSHOT_VERSION_ALIAS,
            false,
          )) as PlainObject<ProjectDependencyCoordinates>[];
        const coordinates = depotProjectDependenciesCoordinates
          .map((e) => ProjectDependencyCoordinates.serialization.fromJson(e))
          .filter(
            (coord) =>
              !dependencyCoordinates
                .map((e) =>
                  generateGAVCoordinates(e.groupId, e.artifactId, e.versionId),
                )
                .includes(
                  generateGAVCoordinates(
                    coord.groupId,
                    coord.artifactId,
                    coord.versionId,
                  ),
                ),
          );
        dependencyCoordinates = [...dependencyCoordinates, ...coordinates];
        projectEntities = [...projectEntities, ...depotProjectEntities];
        serviceCommitCommand.dependenciesToAdd =
          this.transformProjectCoordinatesToProjectDependency(coordinates);
        serviceCommitCommand.entities = [
          ...serviceCommitCommand.entities,
          ...depotProjectEntities,
        ];
      } else {
        throw new UnsupportedOperationError(
          `Unsupported project version: ${this.depotProjectVersionId}`,
        );
      }
    }
    const dependencyEntities = (yield flowResult(
      this.fetchEntitiesFromProjectCoordinates(dependencyCoordinates),
    )) as Entity[];
    yield this.queryEditorStore.graphManagerState.graphManager.compileEntities([
      ...dependencyEntities,
      ...projectEntities,
    ]);
    this.setCommitCommand(serviceCommitCommand);
  }

  createServiceEntity(packagePath: string, serviceName: string): Entity {
    this.verifyServiceMetaData();
    const service = new Service(serviceName);
    service.package = getOrCreateGraphPackage(
      this.queryEditorStore.graphManagerState.graph,
      packagePath,
      undefined,
    );
    service.pattern = this.servicePattern;
    service.execution = new PureSingleExecution(
      this.queryEditorStore.queryBuilderState.getQuery(),
      service,
      PackageableElementExplicitReference.create(
        guaranteeNonNullable(
          this.queryEditorStore.queryBuilderState.querySetupState.mapping,
        ),
      ),
      guaranteeNonNullable(
        this.queryEditorStore.queryBuilderState.querySetupState.runtimeValue,
      ),
    );
    return this.queryEditorStore.graphManagerState.graphManager.elementToEntity(
      service,
      {
        pruneSourceInformation: true,
      },
    );
  }

  // UTILS
  createEntityChangesFromEntitieToAdd(entitiesToAdd: Entity[]): EntityChange[] {
    return entitiesToAdd.map((e) => {
      const change = new EntityChange();
      change.content = e.content;
      change.type = EntityChangeType.CREATE;
      (change.classifierPath = e.classifierPath), (change.entityPath = e.path);
      return change;
    });
  }

  *fetchEntitiesFromProjectDependencies(
    projectDependencies: ProjectDependency[],
  ): GeneratorFn<Entity[]> {
    const coordinates =
      this.transformProjectDependencyToProjectCoordinates(projectDependencies);
    return (yield flowResult(
      this.fetchEntitiesFromProjectCoordinates(coordinates),
    )) as Entity[];
  }

  transformProjectDependencyToProjectCoordinates(
    projectDependencies: ProjectDependency[],
  ): ProjectDependencyCoordinates[] {
    return projectDependencies.map((dep) => {
      assertTrue(!dep.isLegacyDependency, 'Legacy Dependency not supported');
      return new ProjectDependencyCoordinates(
        guaranteeNonNullable(dep.groupId),
        guaranteeNonNullable(dep.artifactId),
        dep.versionId,
      );
    });
  }

  transformProjectCoordinatesToProjectDependency(
    coordinates: ProjectDependencyCoordinates[],
  ): ProjectDependency[] {
    return coordinates.map(
      (coordinate) =>
        new ProjectDependency(
          generateGAVCoordinates(
            coordinate.groupId,
            coordinate.artifactId,
            undefined,
          ),
          coordinate.versionId,
        ),
    );
  }

  *fetchEntitiesFromProjectCoordinates(
    dependencyCoordinates: ProjectDependencyCoordinates[],
  ): GeneratorFn<Entity[]> {
    const dependencyEntitiesJson =
      (yield this.queryEditorStore.depotServerClient.collectDependencyEntities(
        dependencyCoordinates.map((e) =>
          ProjectDependencyCoordinates.serialization.toJson(e),
        ),
        true,
        true,
      )) as PlainObject<ProjectVersionEntities>[];
    return dependencyEntitiesJson
      .map((projectVersionEntity) =>
        ProjectVersionEntities.serialization.fromJson(projectVersionEntity),
      )
      .flatMap((info) => info.entities);
  }
}
