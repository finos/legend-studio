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

import { type LightQuery, type QueryInfo } from '@finos/legend-graph';
import {
  type DepotServerClient,
  StoreProjectData,
  ProjectDependencyCoordinates,
  ProjectVersionEntities,
  MASTER_SNAPSHOT_ALIAS,
} from '@finos/legend-server-depot';
import {
  ActionState,
  assertErrorThrown,
  guaranteeNonNullable,
  LogEvent,
  type GeneratorFn,
  type PlainObject,
} from '@finos/legend-shared';
import { type Entity } from '@finos/legend-storage';
import {
  type ProjectConfigurationStatus,
  fetchProjectConfigurationStatus,
  generateEditorRoute,
  LEGEND_STUDIO_APP_EVENT,
  type LegendStudioApplicationStore,
  EditorStore,
  generateReviewRoute,
} from '@finos/legend-application-studio';
import {
  DEFAULT_TAB_SIZE,
  ActionAlertType,
  ActionAlertActionType,
} from '@finos/legend-application';
import {
  makeObservable,
  observable,
  computed,
  action,
  flow,
  flowResult,
} from 'mobx';
import {
  type SDLCServerClient,
  type ProjectDependency,
  Project,
  WorkspaceType,
  Workspace,
  ProjectConfiguration,
  EntityChangeType,
} from '@finos/legend-server-sdlc';
import {
  DATA_SPACE_ELEMENT_CLASSIFIER_PATH,
  DSL_DataSpace_getGraphManagerExtension,
  type DSL_DataSpace_PureGraphManagerExtension,
} from '@finos/legend-extension-dsl-data-space/graph';
import { generateDataSpaceTemplateQueryPromotionRoute } from '@finos/legend-extension-dsl-data-space/application';

const projectDependencyToProjectCoordinates = (
  projectDependency: ProjectDependency,
): ProjectDependencyCoordinates =>
  new ProjectDependencyCoordinates(
    guaranteeNonNullable(projectDependency.groupId),
    guaranteeNonNullable(projectDependency.artifactId),
    projectDependency.versionId,
  );

const DEFAULT_WORKSPACE_NAME_PREFIX = 'promote-as-template-query';

export class DataSpaceTemplateQueryPromotionReviewerStore {
  readonly applicationStore: LegendStudioApplicationStore;
  readonly sdlcServerClient: SDLCServerClient;
  readonly depotServerClient: DepotServerClient;
  readonly initState = ActionState.create();
  readonly promoteState = ActionState.create();
  readonly loadQueryState = ActionState.create();
  readonly loadWorkspacesState = ActionState.create();
  editorStore: EditorStore;
  graphManagerExtension: DSL_DataSpace_PureGraphManagerExtension;
  currentQuery?: LightQuery | undefined;
  currentQueryInfo?: QueryInfo | undefined;
  currentQueryProject?: StoreProjectData | undefined;
  currentProject?: Project | undefined;
  currentProjectConfiguration?: ProjectConfiguration;
  currentProjectConfigurationStatus?: ProjectConfigurationStatus | undefined;
  currentProjectEntities: Entity[] = [];
  dependencyEntities: Entity[] = [];
  groupWorkspaces: Workspace[] = [];
  workspaceName = '';
  dataSpacePath!: string;
  dataSpaceEntity: Entity | undefined;
  templateQueryId = 'template_id';
  templateQueryTitle = 'template_title';
  templateQueryDescription = '';

  constructor(
    applicationStore: LegendStudioApplicationStore,
    sdlcServerClient: SDLCServerClient,
    depotServerClient: DepotServerClient,
  ) {
    makeObservable(this, {
      editorStore: observable,
      graphManagerExtension: observable,
      currentQuery: observable,
      currentQueryInfo: observable,
      currentQueryProject: observable,
      currentProject: observable,
      currentProjectConfiguration: observable,
      currentProjectConfigurationStatus: observable,
      currentProjectEntities: observable,
      dataSpaceEntity: observable,
      groupWorkspaces: observable,
      workspaceName: observable,
      templateQueryId: observable,
      templateQueryTitle: observable,
      templateQueryDescription: observable,
      isWorkspaceNameValid: computed,
      isTemplateQueryIdValid: computed,
      setWorkspaceName: action,
      setTemplateQueryId: action,
      setTemplateQueryTitle: action,
      setTemplateQueryDescription: action,
      initialize: flow,
      loadQuery: flow,
      loadProject: flow,
      promoteAsTemplateQuery: flow,
    });

    this.applicationStore = applicationStore;
    this.sdlcServerClient = sdlcServerClient;
    this.depotServerClient = depotServerClient;
    this.editorStore = new EditorStore(
      applicationStore,
      sdlcServerClient,
      depotServerClient,
    );
    this.graphManagerExtension = DSL_DataSpace_getGraphManagerExtension(
      this.editorStore.graphManagerState.graphManager,
    );
  }

  setWorkspaceName(val: string): void {
    this.workspaceName = val;
  }

  setTemplateQueryId(val: string): void {
    this.templateQueryId = val;
  }

  setTemplateQueryTitle(val: string): void {
    this.templateQueryTitle = val;
  }

  setTemplateQueryDescription(val: string): void {
    this.templateQueryDescription = val;
  }

  get isWorkspaceNameValid(): boolean {
    return !this.groupWorkspaces.some(
      (ws) => ws.workspaceId === this.workspaceName,
    );
  }

  get isTemplateQueryIdValid(): boolean {
    if (this.dataSpaceEntity) {
      return this.graphManagerExtension.IsTemplateQueryIdValid(
        this.dataSpaceEntity,
        this.templateQueryId,
      );
    }
    return false;
  }

  *initialize(
    queryId: string | undefined,
    dataSpacePath: string,
  ): GeneratorFn<void> {
    if (!this.initState.isInInitialState) {
      return;
    }
    try {
      this.initState.inProgress();
      yield this.graphManagerExtension.graphManager.initialize(
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
      this.dataSpacePath = dataSpacePath;
      if (queryId) {
        let query: LightQuery | undefined;
        try {
          query = (yield this.graphManagerExtension.graphManager.getLightQuery(
            queryId,
          )) as LightQuery;
        } catch {
          query = undefined;
        }
        if (query) {
          yield flowResult(this.loadQuery(query));
        } else {
          this.applicationStore.notificationService.notifyError(
            `Unable to find query with ID: ${queryId}`,
          );
        }
      }
      if (this.currentQuery) {
        this.currentQueryProject = StoreProjectData.serialization.fromJson(
          (yield this.depotServerClient.getProject(
            this.currentQuery.groupId,
            this.currentQuery.artifactId,
          )) as PlainObject<StoreProjectData>,
        );
        const projectData = (yield Promise.all([
          this.depotServerClient.getVersionEntities(
            this.currentQuery.groupId,
            this.currentQuery.artifactId,
            MASTER_SNAPSHOT_ALIAS,
          ),
          this.sdlcServerClient.getConfiguration(
            this.currentQueryProject.projectId,
            undefined,
          ),
        ])) as [Entity[], PlainObject<ProjectConfiguration>];

        const [currentProjectEntities, currentProjectConfiguration] = [
          projectData[0],
          ProjectConfiguration.serialization.fromJson(projectData[1]),
        ];
        this.currentProjectConfiguration = currentProjectConfiguration;
        const dependencyEntities = (
          (yield this.depotServerClient.collectDependencyEntities(
            (
              [
                ...currentProjectConfiguration.projectDependencies,
              ] as ProjectDependency[]
            )
              .map(projectDependencyToProjectCoordinates)
              .map((p) => ProjectDependencyCoordinates.serialization.toJson(p)),
            true,
            true,
          )) as PlainObject<ProjectVersionEntities>[]
        )
          .map((p) => ProjectVersionEntities.serialization.fromJson(p))
          .flatMap((info) => info.entities);
        this.dependencyEntities = dependencyEntities;
        this.currentProjectEntities = currentProjectEntities;
        this.dataSpaceEntity = guaranteeNonNullable(
          currentProjectEntities.filter(
            (entity: Entity) =>
              entity.path === dataSpacePath &&
              entity.classifierPath === DATA_SPACE_ELEMENT_CLASSIFIER_PATH,
          )[0],
          `Can't find data product entity with path ${this.dataSpaceEntity}`,
        );
        this.initState.pass();
      }
    } catch (error) {
      assertErrorThrown(error);
      this.applicationStore.logService.error(
        LogEvent.create(LEGEND_STUDIO_APP_EVENT.GENERIC_FAILURE),
        error,
      );
      this.applicationStore.alertService.setBlockingAlert({
        message: `Can't initialize template query promotion reviewer store`,
      });
      this.initState.fail();
    }
  }

  *loadQuery(query: LightQuery): GeneratorFn<void> {
    this.currentQuery = query;
    this.templateQueryTitle = query.name;

    try {
      this.loadQueryState.inProgress();
      this.currentQueryInfo =
        (yield this.graphManagerExtension.graphManager.getQueryInfo(
          query.id,
        )) as QueryInfo;
      this.currentQueryProject = StoreProjectData.serialization.fromJson(
        (yield this.depotServerClient.getProject(
          this.currentQuery.groupId,
          this.currentQuery.artifactId,
        )) as PlainObject<StoreProjectData>,
      );
      const updatedQueryName = query.name.replace(/[^a-zA-Z0-9]/g, '');
      this.setWorkspaceName(
        `${DEFAULT_WORKSPACE_NAME_PREFIX}-${updatedQueryName}`,
      );
      this.applicationStore.navigationService.navigator.updateCurrentLocation(
        generateDataSpaceTemplateQueryPromotionRoute(
          this.currentQuery.groupId,
          this.currentQuery.artifactId,
          this.currentQuery.versionId,
          this.dataSpacePath,
          query.id,
        ),
      );
      const currentProject = Project.serialization.fromJson(
        (yield this.sdlcServerClient.getProject(
          this.currentQueryProject.projectId,
        )) as PlainObject<Project>,
      );
      yield flowResult(this.loadProject(currentProject));
    } catch (error) {
      assertErrorThrown(error);
      this.applicationStore.notificationService.notifyError(error);
    } finally {
      this.loadQueryState.complete();
    }
  }

  *loadProject(project: Project): GeneratorFn<void> {
    this.currentProject = project;
    this.currentProjectConfigurationStatus = undefined;
    this.loadWorkspacesState.inProgress();
    try {
      this.currentProjectConfigurationStatus =
        (yield fetchProjectConfigurationStatus(
          project.projectId,
          undefined,
          this.applicationStore,
          this.sdlcServerClient,
        )) as ProjectConfigurationStatus;
      this.groupWorkspaces = (
        (yield this.sdlcServerClient.getGroupWorkspaces(
          project.projectId,
        )) as PlainObject<Workspace>[]
      )
        .map((v) => Workspace.serialization.fromJson(v))
        .filter((workspace) => workspace.workspaceType === WorkspaceType.GROUP);
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

  *promoteAsTemplateQuery(): GeneratorFn<void> {
    const query = this.currentQuery;
    const project = this.currentProject;
    if (
      this.promoteState.isInProgress ||
      !query ||
      !this.currentQueryInfo ||
      !this.currentProjectConfiguration ||
      !project ||
      !this.workspaceName ||
      !this.templateQueryTitle ||
      !this.dataSpaceEntity ||
      !this.isWorkspaceNameValid ||
      !this.isTemplateQueryIdValid
    ) {
      return;
    }

    try {
      this.promoteState.inProgress();
      // 1. prepare project entities
      this.applicationStore.alertService.setBlockingAlert({
        message: `Fetching and updating project...`,
        prompt: 'Please do not close the application',
        showLoading: true,
      });

      // update datasapce entity
      const updatedDataSpaceEntity =
        (yield this.graphManagerExtension.addNewExecutableToDataSpaceEntity(
          this.dataSpaceEntity,
          this.currentQueryInfo,
          {
            id: this.templateQueryId,
            title: this.templateQueryTitle,
            description: this.templateQueryDescription,
          },
        )) as Entity;
      guaranteeNonNullable(
        this.currentProjectEntities.filter(
          (entity: Entity) =>
            entity.path === this.dataSpacePath &&
            entity.classifierPath === DATA_SPACE_ELEMENT_CLASSIFIER_PATH,
        )[0],
      ).content = updatedDataSpaceEntity.content;

      // 2. check if the graph compiles properly
      this.applicationStore.alertService.setBlockingAlert({
        message: `Checking workspace compilation status...`,
        prompt: 'Please do not close the application',
        showLoading: true,
      });
      let compilationFailed = false;
      try {
        yield this.graphManagerExtension.graphManager.compileEntities([
          ...this.dependencyEntities,
          ...this.currentProjectEntities,
        ]);
      } catch {
        compilationFailed = true;
      }

      // 3. proceed to setup the workspace
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

          // ii. update data product
          this.applicationStore.alertService.setBlockingAlert({
            message: `Generating code commit...`,
            prompt: 'Please do not close the application',
            showLoading: true,
          });
          await this.sdlcServerClient.performEntityChanges(
            project.projectId,
            workspace,
            {
              message:
                'promote-as-template-query: promote query as a template query to data product',
              entityChanges: [
                {
                  classifierPath: updatedDataSpaceEntity.classifierPath,
                  entityPath: updatedDataSpaceEntity.path,
                  content: updatedDataSpaceEntity.content,
                  type: EntityChangeType.MODIFY,
                },
              ],
            },
          );

          // iii create review
          this.applicationStore.alertService.setBlockingAlert({
            message: `Generating code review...`,
            prompt: 'Please do not close the application',
            showLoading: true,
          });
          await flowResult(
            this.editorStore.initialize(
              project.projectId,
              undefined,
              workspace.workspaceId,
              workspace.workspaceType,
              undefined,
            ),
          );
          const workspaceReviewState = this.editorStore.workspaceReviewState;
          const workspaceContainsSnapshotDependencies =
            this.editorStore.projectConfigurationEditorState
              .containsSnapshotDependencies;
          const isCreateReviewDisabled =
            Boolean(workspaceReviewState.workspaceReview) ||
            workspaceContainsSnapshotDependencies ||
            !workspaceReviewState.canCreateReview ||
            workspaceReviewState.sdlcState.isActiveProjectSandbox;
          workspaceReviewState.reviewTitle =
            'code review - promote query as a template query to data product';
          if (!isCreateReviewDisabled) {
            await flowResult(
              workspaceReviewState.createWorkspaceReview(
                workspaceReviewState.reviewTitle,
              ),
            );
          } else {
            this.applicationStore.notificationService.notifyError(
              `Can't create code review`,
            );
          }

          // iv. complete, redirect user to the service query editor screen
          this.applicationStore.alertService.setBlockingAlert(undefined);
          this.promoteState.pass();
          this.applicationStore.alertService.setActionAlertInfo({
            message: `Successfully promoted query into data product '${this.dataSpacePath}'. Now your template query can be found in workspace '${this.workspaceName}' of project '${project.name}' (${project.projectId})`,
            prompt: compilationFailed
              ? `The workspace might not compile at the moment, please make sure to fix the issue and submit a review to make the data product part of the project to complete template query promotion`
              : `Please make sure to get the generated code-review reviewed and approved`,
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
                    label: 'Open Code Review',
                    type: ActionAlertActionType.PROCEED,
                    handler: (): void => {
                      if (workspaceReviewState.workspaceReview) {
                        this.applicationStore.navigationService.navigator.visitAddress(
                          this.applicationStore.navigationService.navigator.generateAddress(
                            generateReviewRoute(
                              workspaceReviewState.workspaceReview.projectId,
                              workspaceReviewState.workspaceReview.id,
                            ),
                          ),
                        );
                      }
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
            await this.sdlcServerClient.deleteWorkspace(
              project.projectId,
              workspace,
            );
          }
          this.promoteState.fail();
        }
      };

      this.applicationStore.alertService.setBlockingAlert(undefined);
      if (compilationFailed) {
        this.applicationStore.alertService.setActionAlertInfo({
          message: `We have found compilation issues with the workspace. Your query can still be promoted, but you would need to fix compilation issues afterwards`,
          prompt: `Do you still want to proceed to promote the query as a template query?`,
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
                this.promoteState.fail();
              },
              default: true,
            },
          ],
        });
      } else {
        yield setupWorkspace();
      }

      this.promoteState.pass();
    } catch (error) {
      assertErrorThrown(error);
      this.applicationStore.alertService.setBlockingAlert(undefined);
      this.applicationStore.notificationService.notifyError(error);
      this.promoteState.fail();
    }
  }
}
