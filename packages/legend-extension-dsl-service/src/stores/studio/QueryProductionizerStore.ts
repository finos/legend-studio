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
  DEFAULT_TYPEAHEAD_SEARCH_LIMIT,
  DEFAULT_TYPEAHEAD_SEARCH_MINIMUM_SEARCH_LENGTH,
  DEFAULT_TAB_SIZE,
} from '@finos/legend-application';
import {
  type LegendStudioApplicationStore,
  type ProjectConfigurationStatus,
  LEGEND_STUDIO_APP_EVENT,
  generateEditorRoute,
  fetchProjectConfigurationStatus,
} from '@finos/legend-application-studio';
import {
  type LightQuery,
  type QueryInfo,
  GraphManagerState,
  QuerySearchSpecification,
  isValidFullPath,
  validate_ServicePattern,
  resolvePackagePathAndElementName,
  PureSingleExecution,
  stub_ElementhWithPackagePath,
  PackageableRuntime,
  PackageableElementExplicitReference,
  RuntimePointer,
  Service,
  Mapping,
  RawLambda,
} from '@finos/legend-graph';
import {
  type DepotServerClient,
  StoreProjectData,
  ProjectDependencyCoordinates,
  resolveVersion,
  ProjectVersionEntities,
} from '@finos/legend-server-depot';
import {
  type SDLCServerClient,
  Project,
  Workspace,
  WorkspaceType,
  ProjectConfiguration,
  ProjectDependency,
  UpdateProjectConfigurationCommand,
  EntityChangeType,
  User,
} from '@finos/legend-server-sdlc';
import {
  type GeneratorFn,
  type PlainObject,
  ActionState,
  assertErrorThrown,
  uuid,
  LogEvent,
  guaranteeNonNullable,
} from '@finos/legend-shared';
import { type Entity, generateGAVCoordinates } from '@finos/legend-storage';
import {
  action,
  computed,
  flow,
  flowResult,
  makeObservable,
  observable,
} from 'mobx';
import {
  generateProjectServiceQueryUpdaterRoute,
  generateQueryProductionizerRoute,
} from '../../__lib__/studio/DSL_Service_LegendStudioNavigation.js';

const projectDependencyToProjectCoordinates = (
  projectDependency: ProjectDependency,
): ProjectDependencyCoordinates =>
  new ProjectDependencyCoordinates(
    guaranteeNonNullable(projectDependency.groupId),
    guaranteeNonNullable(projectDependency.artifactId),
    projectDependency.versionId,
  );

export const createServiceElement = async (
  servicePath: string,
  servicePattern: string,
  serviceDocumentation: string,
  serviceMcpServer: string | undefined,
  serviceOwners: string[],
  queryContent: string | RawLambda,
  mappingPath: string,
  runtimePath: string,
  graphManagerState: GraphManagerState,
): Promise<Service> => {
  const [servicePackagePath, serviceName] =
    resolvePackagePathAndElementName(servicePath);
  const service = stub_ElementhWithPackagePath(
    new Service(serviceName),
    servicePackagePath,
  );
  service.pattern = servicePattern;
  service.documentation = serviceDocumentation;
  service.mcpServer = serviceMcpServer;
  service.owners = serviceOwners;
  const [mappingPackagePath, mappingName] =
    resolvePackagePathAndElementName(mappingPath);
  const mapping = stub_ElementhWithPackagePath(
    new Mapping(mappingName),
    mappingPackagePath,
  );
  const [runtimePackagePath, runtimeName] =
    resolvePackagePathAndElementName(runtimePath);
  const runtime = stub_ElementhWithPackagePath(
    new PackageableRuntime(runtimeName),
    runtimePackagePath,
  );
  service.execution = new PureSingleExecution(
    queryContent instanceof RawLambda
      ? queryContent
      : await graphManagerState.graphManager.pureCodeToLambda(
          queryContent,
          undefined,
          {
            pruneSourceInformation: true,
          },
        ),
    service,
    PackageableElementExplicitReference.create(mapping),
    new RuntimePointer(PackageableElementExplicitReference.create(runtime)),
  );
  return service;
};

const DEFAULT_WORKSPACE_NAME_PREFIX = 'productionize-query';

export class QueryProductionizerStore {
  readonly applicationStore: LegendStudioApplicationStore;
  readonly sdlcServerClient: SDLCServerClient;
  readonly depotServerClient: DepotServerClient;
  readonly graphManagerState: GraphManagerState;

  readonly initState = ActionState.create();
  readonly productionizeState = ActionState.create();

  queries: LightQuery[] = [];
  readonly loadQueriesState = ActionState.create();
  readonly loadQueryState = ActionState.create();
  currentQuery?: LightQuery | undefined;
  currentQueryInfo?: QueryInfo | undefined;
  currentQueryProject?: StoreProjectData | undefined;
  showQueryPreviewModal = false;

  readonly loadProjectsState = ActionState.create();
  projects: Project[] = [];
  currentProject?: Project | undefined;
  currentProjectConfigurationStatus?: ProjectConfigurationStatus | undefined;

  readonly loadWorkspacesState = ActionState.create();
  groupWorkspaces: Workspace[] = [];
  isAutoConfigurationEnabled = false;

  workspaceName = '';
  servicePath = 'model::QueryService';
  servicePattern = `/${uuid()}`;
  serviceOwners: string[] = [];

  constructor(
    applicationStore: LegendStudioApplicationStore,
    sdlcServerClient: SDLCServerClient,
    depotServerClient: DepotServerClient,
  ) {
    makeObservable(this, {
      queries: observable,
      currentQuery: observable,
      currentQueryInfo: observable,
      currentQueryProject: observable,
      showQueryPreviewModal: observable,
      projects: observable,
      currentProject: observable,
      currentProjectConfigurationStatus: observable,
      isAutoConfigurationEnabled: observable,
      groupWorkspaces: observable,
      workspaceName: observable,
      servicePath: observable,
      servicePattern: observable,
      serviceOwners: observable,
      isWorkspaceNameValid: computed,
      isServicePathValid: computed,
      isServiceUrlPatternValid: computed,
      setIsAutoConfigurationEnabled: action,
      setShowQueryPreviewModal: action,
      resetCurrentQuery: action,
      resetCurrentProject: action,
      setWorkspaceName: action,
      setServicePath: action,
      setServicePattern: action,
      setServiceOwners: action,
      initialize: flow,
      loadQueries: flow,
      changeQuery: flow,
      loadProjects: flow,
      changeProject: flow,
      searchUsers: flow,
    });

    this.applicationStore = applicationStore;
    this.sdlcServerClient = sdlcServerClient;
    this.depotServerClient = depotServerClient;
    this.graphManagerState = new GraphManagerState(
      applicationStore.pluginManager,
      applicationStore.logService,
    );
  }

  setShowQueryPreviewModal(val: boolean): void {
    this.showQueryPreviewModal = val;
  }

  setIsAutoConfigurationEnabled(val: boolean): void {
    this.isAutoConfigurationEnabled = val;
  }

  setWorkspaceName(val: string): void {
    this.workspaceName = val;
  }

  setServicePath(val: string): void {
    this.servicePath = val;
  }

  setServicePattern(val: string): void {
    this.servicePattern = val;
  }

  setServiceOwners(val: string[]): void {
    this.serviceOwners = val;
  }

  resetCurrentQuery(): void {
    this.currentQuery = undefined;
    this.resetCurrentProject();
    this.applicationStore.navigationService.navigator.updateCurrentLocation(
      generateQueryProductionizerRoute(undefined),
    );
    this.setWorkspaceName('');
  }

  resetCurrentProject(): void {
    this.currentProject = undefined;
    this.setIsAutoConfigurationEnabled(false);
    this.groupWorkspaces = [];
  }

  get isWorkspaceNameValid(): boolean {
    return !this.groupWorkspaces.some(
      (ws) => ws.workspaceId === this.workspaceName,
    );
  }

  get isServicePathValid(): boolean {
    return isValidFullPath(this.servicePath);
  }

  get isServiceUrlPatternValid(): boolean {
    return !validate_ServicePattern(this.servicePattern);
  }

  *initialize(queryId: string | undefined): GeneratorFn<void> {
    if (!this.initState.isInInitialState) {
      return;
    }

    try {
      this.initState.inProgress();
      yield this.graphManagerState.graphManager.initialize(
        {
          env: this.applicationStore.config.env,
          tabSize: DEFAULT_TAB_SIZE,
          clientConfig: {
            baseUrl: this.applicationStore.config.engineServerUrl,
            queryBaseUrl: this.applicationStore.config.engineQueryServerUrl,
            enableCompression: true,
          },
        },
        {
          tracerService: this.applicationStore.tracerService,
        },
      );

      if (queryId) {
        let query: LightQuery | undefined;
        try {
          query = (yield this.graphManagerState.graphManager.getLightQuery(
            queryId,
          )) as LightQuery;
        } catch {
          query = undefined;
        }

        if (query) {
          yield flowResult(this.changeQuery(query));
        } else {
          this.applicationStore.navigationService.navigator.updateCurrentLocation(
            generateQueryProductionizerRoute(undefined),
          );
        }
      }

      this.initState.pass();
    } catch (error) {
      assertErrorThrown(error);
      this.applicationStore.logService.error(
        LogEvent.create(LEGEND_STUDIO_APP_EVENT.GENERIC_FAILURE),
        error,
      );
      this.applicationStore.alertService.setBlockingAlert({
        message: `Can't initialize query productionizer store`,
      });
      this.initState.fail();
    }
  }

  *searchUsers(name: string): GeneratorFn<User[]> {
    try {
      return (
        (yield this.sdlcServerClient.getUsers(name)) as PlainObject<User>[]
      ).map((p) => User.serialization.fromJson(p));
    } catch (error) {
      assertErrorThrown(error);
      this.applicationStore.notificationService.notifyError(error);
      return [];
    }
  }

  *changeQuery(query: LightQuery): GeneratorFn<void> {
    this.currentQuery = query;

    try {
      this.loadQueryState.inProgress();
      this.currentQueryInfo =
        (yield this.graphManagerState.graphManager.getQueryInfo(
          query.id,
        )) as QueryInfo;
      this.currentQueryProject = StoreProjectData.serialization.fromJson(
        (yield this.depotServerClient.getProject(
          this.currentQuery.groupId,
          this.currentQuery.artifactId,
        )) as PlainObject<StoreProjectData>,
      );
      this.setWorkspaceName(`${DEFAULT_WORKSPACE_NAME_PREFIX}-${query.id}`);
      this.applicationStore.navigationService.navigator.updateCurrentLocation(
        generateQueryProductionizerRoute(query.id),
      );

      yield flowResult(this.loadProjects(''));

      let currentProject: Project | undefined;
      try {
        currentProject = Project.serialization.fromJson(
          (yield this.sdlcServerClient.getProject(
            this.currentQueryProject.projectId,
          )) as PlainObject<Project>,
        );
      } catch {
        // NOTE: we don't throw error here if project could not be found
        // quietly choose another project instead
        currentProject = this.projects.length ? this.projects[0] : undefined;
      }
      if (currentProject) {
        yield flowResult(this.changeProject(currentProject));
      }
    } catch (error) {
      assertErrorThrown(error);
      this.applicationStore.notificationService.notifyError(error);
    } finally {
      this.loadQueryState.reset();
    }
  }

  *loadQueries(searchText: string): GeneratorFn<void> {
    const isValidSearchString =
      searchText.length >= DEFAULT_TYPEAHEAD_SEARCH_MINIMUM_SEARCH_LENGTH;
    this.loadQueriesState.inProgress();
    try {
      const searchSpecification = QuerySearchSpecification.createDefault(
        isValidSearchString ? searchText : undefined,
      );
      searchSpecification.limit = DEFAULT_TYPEAHEAD_SEARCH_LIMIT;
      this.queries = (yield this.graphManagerState.graphManager.searchQueries(
        searchSpecification,
      )) as LightQuery[];
      this.loadQueriesState.pass();
    } catch (error) {
      assertErrorThrown(error);
      this.applicationStore.notificationService.notifyError(error);
      this.loadQueriesState.fail();
    }
  }

  *loadProjects(searchText: string): GeneratorFn<void> {
    const isValidSearchString =
      searchText.length >= DEFAULT_TYPEAHEAD_SEARCH_MINIMUM_SEARCH_LENGTH;
    this.loadProjectsState.inProgress();
    try {
      this.projects = (
        (yield this.sdlcServerClient.getProjects(
          undefined,
          isValidSearchString ? searchText : undefined,
          undefined,
          DEFAULT_TYPEAHEAD_SEARCH_LIMIT,
        )) as PlainObject<Project>[]
      ).map((v) => Project.serialization.fromJson(v));
      this.loadProjectsState.pass();
    } catch (error) {
      assertErrorThrown(error);
      this.applicationStore.notificationService.notifyError(error);
      this.loadProjectsState.fail();
    }
  }

  *changeProject(project: Project): GeneratorFn<void> {
    this.currentProject = project;
    this.currentProjectConfigurationStatus = undefined;
    // NOTE: no need to enable auto-configuration if the query's project is selected
    this.setIsAutoConfigurationEnabled(
      project.projectId !== this.currentQueryProject?.projectId,
    );

    this.loadWorkspacesState.inProgress();
    try {
      this.currentProjectConfigurationStatus =
        (yield fetchProjectConfigurationStatus(
          project.projectId,
          undefined,
          this.applicationStore,
          this.sdlcServerClient,
        )) as ProjectConfigurationStatus;

      const workspacesInConflictResolutionIds = (
        (yield this.sdlcServerClient.getWorkspacesInConflictResolutionMode(
          project.projectId,
          undefined,
        )) as Workspace[]
      ).map((workspace) => workspace.workspaceId);
      this.groupWorkspaces = (
        (yield this.sdlcServerClient.getGroupWorkspaces(
          project.projectId,
        )) as PlainObject<Workspace>[]
      )
        .map((v) => Workspace.serialization.fromJson(v))
        .filter(
          (workspace) =>
            // NOTE we don't handle workspaces that only have conflict resolution but no standard workspace
            // since that indicates bad state of the SDLC server
            !workspacesInConflictResolutionIds.includes(
              workspace.workspaceId,
            ) && workspace.workspaceType === WorkspaceType.GROUP,
        );
      this.loadWorkspacesState.pass();
    } catch (error) {
      assertErrorThrown(error);
      this.applicationStore.logService.error(
        LogEvent.create(LEGEND_STUDIO_APP_EVENT.SDLC_MANAGER_FAILURE),
        error,
      );
      this.applicationStore.notificationService.notifyError(error);
      this.loadWorkspacesState.fail();
    }
  }

  async productionizeQuery(): Promise<void> {
    const query = this.currentQuery;
    const project = this.currentProject;

    if (
      this.productionizeState.isInProgress ||
      !query ||
      !this.currentQueryInfo ||
      !project ||
      !this.workspaceName ||
      !this.servicePath ||
      !this.servicePattern ||
      !this.isWorkspaceNameValid ||
      !this.isServicePathValid ||
      !this.isServiceUrlPatternValid
    ) {
      return;
    }

    try {
      this.productionizeState.inProgress();

      // 1. prepare project entities
      this.applicationStore.alertService.setBlockingAlert({
        message: `Fetching query project information...`,
        prompt: 'Please do not close the application',
        showLoading: true,
      });

      const projectData = await Promise.all([
        this.sdlcServerClient.getEntities(project.projectId, undefined),
        this.sdlcServerClient.getConfiguration(project.projectId, undefined),
      ]);
      const [currentProjectEntities, currentProjectConfiguration] = [
        projectData[0] as unknown as Entity[],
        ProjectConfiguration.serialization.fromJson(projectData[1]),
      ];
      // 2. auto-configure the project
      // here, the goal is to identify and add the query's project as a dependency
      const dependenciesToAdd: ProjectDependency[] = [];
      if (this.isAutoConfigurationEnabled) {
        const projectGA = generateGAVCoordinates(
          this.currentQueryInfo.groupId,
          this.currentQueryInfo.artifactId,
          undefined,
        );
        const dependencyToAdd = new ProjectDependency(
          projectGA,
          // NOTE: here we could end up adding a snapshot dependency, which is fine
          // since this workspace would end up being blocked in review process by SDLC
          resolveVersion(this.currentQueryInfo.versionId),
        );
        if (
          !currentProjectConfiguration.projectDependencies.find(
            (dep) => dep.projectId === projectGA,
          )
        ) {
          // NOTE: if a dependency with the same GA coordinate already existed, there are 2 cases:
          // 1. Its version is the same as the version of the query's project: nothing to be done here
          // 2. Its version is not the same as the version of the query's project: this is a conflict, we will not be able to add
          //    the query's project version as a new dependency, i.e. we will give up auto-configuration
          dependenciesToAdd.push(dependencyToAdd);
        }
      }

      // 3. check if the graph compiles properly
      this.applicationStore.alertService.setBlockingAlert({
        message: `Checking workspace compilation status...`,
        prompt: 'Please do not close the application',
        showLoading: true,
      });

      const dependencyEntities = (
        await this.depotServerClient.collectDependencyEntities(
          [
            ...currentProjectConfiguration.projectDependencies,
            ...dependenciesToAdd,
          ]
            .map(projectDependencyToProjectCoordinates)
            .map((p) => ProjectDependencyCoordinates.serialization.toJson(p)),
          true,
          true,
        )
      )
        .map((p) => ProjectVersionEntities.serialization.fromJson(p))
        .flatMap((info) => info.entities);
      // build service entity
      const [servicePackagePath, serviceName] =
        resolvePackagePathAndElementName(this.servicePath);
      const entity =
        (await this.graphManagerState.graphManager.productionizeQueryToServiceEntity(
          this.currentQueryInfo,
          {
            name: serviceName,
            packageName: servicePackagePath,
            pattern: this.servicePattern,
            serviceOwners: this.serviceOwners,
          },
          [...currentProjectEntities, ...dependencyEntities],
        )) as unknown as Entity;

      let compilationFailed = false;
      try {
        await this.graphManagerState.graphManager.compileEntities([
          ...dependencyEntities,
          ...currentProjectEntities,
          entity,
        ]);
      } catch {
        compilationFailed = true;
      }

      // 4. proceed to setup the workspace
      const setupWorkspace = async (): Promise<void> => {
        let workspace: Workspace | undefined;
        try {
          this.applicationStore.alertService.setBlockingAlert({
            message: `Creating workspace...`,
            prompt: 'Please do not close the application',
            showLoading: true,
          });

          // i. create workspace
          workspace = Workspace.serialization.fromJson(
            await this.sdlcServerClient.createWorkspace(
              project.projectId,
              undefined,
              this.workspaceName,
              WorkspaceType.GROUP,
            ),
          );

          // ii. add dependencies if needed
          if (dependenciesToAdd.length) {
            this.applicationStore.alertService.setBlockingAlert({
              message: `Adding service dependencies...`,
              prompt: 'Please do not close the application',
              showLoading: true,
            });
            const projectConfigurationUpdateCommand =
              new UpdateProjectConfigurationCommand(
                currentProjectConfiguration.groupId,
                currentProjectConfiguration.artifactId,
                currentProjectConfiguration.projectStructureVersion,
                'productionize-query: add service dependencies',
              );
            projectConfigurationUpdateCommand.projectDependenciesToAdd =
              dependenciesToAdd;
            await this.sdlcServerClient.updateConfiguration(
              project.projectId,
              workspace,
              UpdateProjectConfigurationCommand.serialization.toJson(
                projectConfigurationUpdateCommand,
              ),
            );
          }

          // iii. add service
          this.applicationStore.alertService.setBlockingAlert({
            message: `Adding service...`,
            prompt: 'Please do not close the application',
            showLoading: true,
          });
          await this.sdlcServerClient.performEntityChanges(
            project.projectId,
            workspace,
            {
              message: 'productionize-query: add service element',
              entityChanges: [
                {
                  classifierPath: entity.classifierPath,
                  entityPath: entity.path,
                  content: entity.content,
                  type: EntityChangeType.CREATE,
                },
              ],
            },
          );

          // iv. complete, redirect user to the service query editor screen
          this.applicationStore.alertService.setBlockingAlert(undefined);
          this.productionizeState.pass();
          this.applicationStore.alertService.setActionAlertInfo({
            message: `Successfully promoted query into service '${this.servicePath}'. Now your service can be found in workspace '${this.workspaceName}' of project '${project.name}' (${project.projectId})`,
            prompt: compilationFailed
              ? `The workspace might not compile at the moment, please make sure to fix the issue and submit a review to make the service part of the project to complete productionization`
              : `Please make sure to review the service and submit a review to officially make the service part of the project to complete productionization`,
            type: ActionAlertType.STANDARD,
            actions: compilationFailed
              ? [
                  {
                    label: 'Open Workspace',
                    type: ActionAlertActionType.PROCEED,
                    handler: (): void => {
                      this.applicationStore.navigationService.navigator.goToLocation(
                        generateEditorRoute(
                          project.projectId,
                          undefined,
                          this.workspaceName,
                          WorkspaceType.GROUP,
                        ),
                      );
                    },
                    default: true,
                  },
                ]
              : [
                  {
                    label: 'Open Service',
                    type: ActionAlertActionType.PROCEED,
                    handler: (): void => {
                      this.applicationStore.navigationService.navigator.goToLocation(
                        generateProjectServiceQueryUpdaterRoute(
                          project.projectId,
                          this.workspaceName,
                          this.servicePath,
                        ),
                      );
                    },
                    default: true,
                  },
                  {
                    label: 'Open Workspace',
                    type: ActionAlertActionType.PROCEED,
                    handler: (): void => {
                      this.applicationStore.navigationService.navigator.goToLocation(
                        generateEditorRoute(
                          project.projectId,
                          undefined,
                          this.workspaceName,
                          WorkspaceType.GROUP,
                        ),
                      );
                    },
                  },
                ],
          });
        } catch (error) {
          assertErrorThrown(error);
          this.applicationStore.alertService.setBlockingAlert(undefined);
          this.applicationStore.notificationService.notifyError(
            `Can't set up workspace: ${error.message}`,
          );
          if (workspace) {
            // TODO?: should we guard this  edge-case as well and
            // notify if we fail to delete the left-over workspace?
            await this.sdlcServerClient.deleteWorkspace(
              project.projectId,
              workspace,
            );
          }
          this.productionizeState.fail();
        }
      };

      this.applicationStore.alertService.setBlockingAlert(undefined);
      if (compilationFailed) {
        this.applicationStore.alertService.setActionAlertInfo({
          message: `We have found compilation issues with the workspace. Your query can still be productionized, but you would need to fix compilation issues afterwards`,
          prompt: `Do you still want to proceed to productionize the query?`,
          type: ActionAlertType.STANDARD,
          actions: [
            {
              label: `Proceed`,
              type: ActionAlertActionType.PROCEED_WITH_CAUTION,
              handler: (): void => {
                setupWorkspace().catch(
                  this.applicationStore.alertUnhandledError,
                );
              },
            },
            {
              label: 'Abort',
              type: ActionAlertActionType.PROCEED,
              handler: (): void => {
                this.productionizeState.fail();
              },
              default: true,
            },
          ],
        });
      } else {
        await setupWorkspace();
      }

      this.productionizeState.pass();
    } catch (error) {
      assertErrorThrown(error);
      this.applicationStore.alertService.setBlockingAlert(undefined);
      this.applicationStore.notificationService.notifyError(error);
      this.productionizeState.fail();
    }
  }
}
