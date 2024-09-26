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
  LegendQueryApplicationPlugin,
  QuerySetupActionTag,
  type QuerySetupActionConfiguration,
} from '../stores/LegendQueryApplicationPlugin.js';
import packageJson from '../../package.json' with { type: 'json' };
import type { QuerySetupLandingPageStore } from '../stores/QuerySetupStore.js';
import {
  ArrowCircleUpIcon,
  Button,
  CaretDownIcon,
  DroidIcon,
  ControlledDropdownMenu,
  InfoCircleIcon,
  ManageSearchIcon,
  MenuContent,
  MenuContentItem,
  MenuContentItemIcon,
  MenuContentItemLabel,
  PlusIcon,
  RobotIcon,
  SaveAsIcon,
  SaveCurrIcon,
  SquareIcon,
} from '@finos/legend-art';
import {
  generateCloneServiceQuerySetupRoute,
  generateCreateMappingQuerySetupRoute,
  generateEditExistingQuerySetupRoute,
  generateLoadProjectServiceQuerySetup,
  generateMappingQueryCreatorRoute,
  generateQueryProductionizerSetupRoute,
  generateUpdateExistingServiceQuerySetup,
  LEGEND_QUERY_ROUTE_PATTERN,
} from '../__lib__/LegendQueryNavigation.js';
import {
  ActionAlertActionType,
  ActionAlertType,
  type ApplicationPageEntry,
  type LegendApplicationSetup,
} from '@finos/legend-application';
import { CloneQueryServiceSetup } from './CloneQueryServiceSetup.js';
import { QueryProductionizerSetup } from './QueryProductionizerSetup.js';
import { UpdateExistingServiceQuerySetup } from './UpdateExistingServiceQuerySetup.js';
import { LoadProjectServiceQuerySetup } from './LoadProjectServiceQuerySetup.js';
import { setupPureLanguageService } from '@finos/legend-code-editor';
import {
  generateDataSpaceQueryCreatorRoute,
  generateDataSpaceQuerySetupRoute,
} from '../__lib__/DSL_DataSpace_LegendQueryNavigation.js';
import {
  QUERY_BUILDER_SUPPORTED_GET_ALL_FUNCTIONS,
  type QueryBuilderHeaderActionConfiguration,
  type QueryBuilderMenuActionConfiguration,
} from '@finos/legend-query-builder';
import {
  ExistingQueryEditorStore,
  QueryBuilderActionConfig_QueryApplication,
} from '../stores/QueryEditorStore.js';
import {
  DataSpaceQueryBuilderState,
  generateDataSpaceTemplateQueryPromotionRoute,
} from '@finos/legend-extension-dsl-data-space/application';
import { RuntimePointer } from '@finos/legend-graph';
import { LegendQueryTelemetryHelper } from '../__lib__/LegendQueryTelemetryHelper.js';
import { StoreProjectData } from '@finos/legend-server-depot';
import { buildUrl } from '@finos/legend-shared';
import { parseProjectIdentifier } from '@finos/legend-storage';
import { QueryEditorExistingQueryHeader } from './QueryEditor.js';
import { DataSpaceTemplateQueryCreatorStore } from '../stores/data-space/DataSpaceTemplateQueryCreatorStore.js';
import { createViewSDLCProjectHandler } from '../stores/data-space/DataSpaceQueryBuilderHelper.js';
import { DataSpaceQueryCreatorStore } from '../stores/data-space/DataSpaceQueryCreatorStore.js';
import { configureCodeEditorComponent } from '@finos/legend-lego/code-editor';

export class Core_LegendQueryApplicationPlugin extends LegendQueryApplicationPlugin {
  static NAME = packageJson.extensions.applicationQueryPlugin;

  constructor() {
    super(Core_LegendQueryApplicationPlugin.NAME, packageJson.version);
  }

  override getExtraApplicationSetups(): LegendApplicationSetup[] {
    return [
      async (applicationStore) => {
        await configureCodeEditorComponent(applicationStore);
        setupPureLanguageService({});
      },
    ];
  }

  override getExtraApplicationPageEntries(): ApplicationPageEntry[] {
    return [
      {
        key: 'clone-service-query-setup-application-page',
        addressPatterns: [LEGEND_QUERY_ROUTE_PATTERN.CLONE_SERVICE_QUERY_SETUP],
        renderer: CloneQueryServiceSetup,
      },
      {
        key: 'query-productionizer-setup-application-page',
        addressPatterns: [
          LEGEND_QUERY_ROUTE_PATTERN.QUERY_PRODUCTIONIZER_SETUP,
        ],
        renderer: QueryProductionizerSetup,
      },
      {
        key: 'update-existing-service-query-setup-application-page',
        addressPatterns: [
          LEGEND_QUERY_ROUTE_PATTERN.UPDATE_EXISTING_SERVICE_QUERY_SETUP,
        ],
        renderer: UpdateExistingServiceQuerySetup,
      },
      {
        key: 'load-project-service-query-setup-application-page',
        addressPatterns: [
          LEGEND_QUERY_ROUTE_PATTERN.LOAD_PROJECT_SERVICE_QUERY_SETUP,
        ],
        renderer: LoadProjectServiceQuerySetup,
      },
    ];
  }

  override getExtraQuerySetupActionConfigurations(): QuerySetupActionConfiguration[] {
    return [
      {
        key: 'open-existing-query',
        isAdvanced: false,
        isCreateAction: false,
        action: async (setupStore: QuerySetupLandingPageStore) => {
          setupStore.applicationStore.navigationService.navigator.goToLocation(
            generateEditExistingQuerySetupRoute(),
          );
        },
        label: 'Open an existing query',
        className: 'query-setup__landing-page__action--existing-query',
        icon: (
          <ManageSearchIcon className="query-setup__landing-page__icon--search" />
        ),
      },
      {
        key: 'create-mapping-query',
        isAdvanced: true,
        isCreateAction: true,
        action: async (setupStore: QuerySetupLandingPageStore) => {
          setupStore.applicationStore.navigationService.navigator.goToLocation(
            generateCreateMappingQuerySetupRoute(),
          );
        },
        label: 'Create new query on a mapping',
        className: 'query-setup__landing-page__action--create-mapping-query',
        icon: <PlusIcon />,
      },
      {
        key: 'clone-service-query',
        isAdvanced: true,
        isCreateAction: true,
        action: async (setupStore: QuerySetupLandingPageStore) => {
          setupStore.applicationStore.navigationService.navigator.goToLocation(
            generateCloneServiceQuerySetupRoute(),
          );
        },
        label: 'Clone an existing service query',
        className: 'query-setup__landing-page__action--service-query',
        icon: <RobotIcon />,
      },
      // sdlc
      {
        key: 'update-existing-service-query',
        isAdvanced: false,
        isCreateAction: false,
        tag: QuerySetupActionTag.PRODUCTIONIZATION,
        action: async (setupStore: QuerySetupLandingPageStore) => {
          setupStore.applicationStore.navigationService.navigator.goToLocation(
            generateUpdateExistingServiceQuerySetup(),
          );
        },
        label: 'Update an existing service query',
        className: 'query-setup__landing-page__action--service-query',
        icon: <DroidIcon />,
      },
      {
        key: 'open-project-service-query',
        isAdvanced: true,
        isCreateAction: false,
        tag: QuerySetupActionTag.PRODUCTIONIZATION,
        action: async (setupStore: QuerySetupLandingPageStore) => {
          setupStore.applicationStore.navigationService.navigator.goToLocation(
            generateLoadProjectServiceQuerySetup(),
          );
        },
        label: 'Open service query from a project',
        className: 'query-setup__landing-page__action--service-query',
        icon: <DroidIcon />,
      },
      {
        key: 'productionize-query',
        isAdvanced: false,
        isCreateAction: true,
        tag: QuerySetupActionTag.PRODUCTIONIZATION,
        action: async (setupStore: QuerySetupLandingPageStore) => {
          setupStore.applicationStore.navigationService.navigator.goToLocation(
            generateQueryProductionizerSetupRoute(),
          );
        },
        label: 'Productionize an existing query',
        className: 'query-setup__landing-page__action--productionize-query',
        icon: <ArrowCircleUpIcon />,
      },
      // data space
      {
        key: 'create-query-from-data-space',
        isAdvanced: false,
        isCreateAction: true,
        action: async (setupStore) => {
          setupStore.applicationStore.navigationService.navigator.goToLocation(
            generateDataSpaceQuerySetupRoute(),
          );
        },
        label: 'Create query from data space',
        className: 'query-setup__landing-page__action--data-space',
        icon: (
          <SquareIcon className="query-setup__landing-page__icon--data-space" />
        ),
      },
    ];
  }

  getExtraQueryBuilderExportMenuActionConfigurations?(): QueryBuilderMenuActionConfiguration[] {
    return [
      {
        key: 'promote-as-template-query',
        title: 'Promote Curated Template query...',
        label: 'Curated Template Query',
        disableFunc: (queryBuilderState): boolean => {
          if (
            queryBuilderState.workflowState.actionConfig instanceof
            QueryBuilderActionConfig_QueryApplication
          ) {
            const editorStore =
              queryBuilderState.workflowState.actionConfig.editorStore;
            if (
              editorStore instanceof ExistingQueryEditorStore &&
              queryBuilderState instanceof DataSpaceQueryBuilderState
            ) {
              return false;
            }
          }
          return true;
        },
        onClick: (queryBuilderState): void => {
          if (
            queryBuilderState.workflowState.actionConfig instanceof
            QueryBuilderActionConfig_QueryApplication
          ) {
            const editorStore =
              queryBuilderState.workflowState.actionConfig.editorStore;
            const proceedCuratedTemplateQueryPromotion =
              async (): Promise<void> => {
                if (
                  !(
                    editorStore instanceof ExistingQueryEditorStore &&
                    queryBuilderState instanceof DataSpaceQueryBuilderState
                  )
                ) {
                  return;
                }
                // fetch project data
                const project = StoreProjectData.serialization.fromJson(
                  await editorStore.depotServerClient.getProject(
                    editorStore.lightQuery.groupId,
                    editorStore.lightQuery.artifactId,
                  ),
                );

                // find the matching SDLC instance
                const projectIDPrefix = parseProjectIdentifier(
                  project.projectId,
                ).prefix;
                const matchingSDLCEntry =
                  editorStore.applicationStore.config.studioInstances.find(
                    (entry) => entry.sdlcProjectIDPrefix === projectIDPrefix,
                  );
                if (matchingSDLCEntry) {
                  editorStore.applicationStore.navigationService.navigator.visitAddress(
                    buildUrl([
                      editorStore.applicationStore.config.studioApplicationUrl,
                      generateDataSpaceTemplateQueryPromotionRoute(
                        editorStore.lightQuery.groupId,
                        editorStore.lightQuery.artifactId,
                        editorStore.lightQuery.versionId,
                        queryBuilderState.dataSpace.path,
                        editorStore.lightQuery.id,
                      ),
                    ]),
                  );
                } else {
                  editorStore.applicationStore.notificationService.notifyWarning(
                    `Can't find the corresponding SDLC instance to productionize the query`,
                  );
                }
              };

            queryBuilderState.changeDetectionState.alertUnsavedChanges(() => {
              proceedCuratedTemplateQueryPromotion().catch(
                editorStore.applicationStore.alertUnhandledError,
              );
            });
          }
        },
        icon: <ArrowCircleUpIcon />,
      },
    ];
  }

  getExtraQueryBuilderHelpMenuActionConfigurations?(): QueryBuilderMenuActionConfiguration[] {
    return [
      {
        key: 'about-query-info',
        title: 'Get Query Info',
        label: 'About Query Info',
        disableFunc: (queryBuilderState): boolean => {
          if (
            queryBuilderState.workflowState.actionConfig instanceof
            QueryBuilderActionConfig_QueryApplication
          ) {
            const editorStore =
              queryBuilderState.workflowState.actionConfig.editorStore;
            if (editorStore instanceof ExistingQueryEditorStore) {
              return false;
            }
          }
          return true;
        },
        onClick: (queryBuilderState): void => {
          if (
            queryBuilderState.workflowState.actionConfig instanceof
            QueryBuilderActionConfig_QueryApplication
          ) {
            const editorStore =
              queryBuilderState.workflowState.actionConfig.editorStore;
            if (editorStore instanceof ExistingQueryEditorStore) {
              editorStore.updateState.setShowQueryInfo(true);
            }
          }
        },
        icon: <InfoCircleIcon />,
      },
      {
        key: 'about-query-sdlc-project',
        title: 'Go to Project',
        label: 'Go to Project',
        disableFunc: (queryBuilderState): boolean => {
          if (
            queryBuilderState.workflowState.actionConfig instanceof
            QueryBuilderActionConfig_QueryApplication
          ) {
            const editorStore =
              queryBuilderState.workflowState.actionConfig.editorStore;
            if (editorStore instanceof ExistingQueryEditorStore) {
              return false;
            }
          }
          return true;
        },
        onClick: (queryBuilderState): void => {
          if (
            queryBuilderState.workflowState.actionConfig instanceof
            QueryBuilderActionConfig_QueryApplication
          ) {
            const editorStore =
              queryBuilderState.workflowState.actionConfig.editorStore;
            LegendQueryTelemetryHelper.logEvent_QueryViewSdlcProjectLaunched(
              editorStore.applicationStore.telemetryService,
            );
            const projectInfo = editorStore.getProjectInfo();
            if (projectInfo) {
              const { groupId, artifactId } = projectInfo;
              createViewSDLCProjectHandler(
                editorStore.applicationStore,
                editorStore.depotServerClient,
              )(groupId, artifactId, undefined).catch(
                editorStore.applicationStore.alertUnhandledError,
              );
            }
          }
        },
        icon: <InfoCircleIcon />,
      },
      {
        key: 'about-legend-query',
        title: 'About Legend Query',
        label: 'About Legend Query',
        onClick: (queryBuilderState): void => {
          if (
            queryBuilderState.workflowState.actionConfig instanceof
            QueryBuilderActionConfig_QueryApplication
          ) {
            const editorStore =
              queryBuilderState.workflowState.actionConfig.editorStore;
            editorStore.setShowAppInfo(true);
          }
        },
        icon: <InfoCircleIcon />,
      },
      {
        key: 'about-dataspace',
        title: 'About Dataspace',
        label: 'About Dataspace',
        disableFunc: (queryBuilderState): boolean => {
          if (
            queryBuilderState.workflowState.actionConfig instanceof
            QueryBuilderActionConfig_QueryApplication
          ) {
            const editorStore =
              queryBuilderState.workflowState.actionConfig.editorStore;
            if (
              (editorStore instanceof ExistingQueryEditorStore &&
                queryBuilderState instanceof DataSpaceQueryBuilderState) ||
              editorStore instanceof DataSpaceTemplateQueryCreatorStore ||
              editorStore instanceof DataSpaceQueryCreatorStore
            ) {
              return false;
            }
          }
          return true;
        },
        onClick: (queryBuilderState): void => {
          if (
            queryBuilderState.workflowState.actionConfig instanceof
            QueryBuilderActionConfig_QueryApplication
          ) {
            const editorStore =
              queryBuilderState.workflowState.actionConfig.editorStore;
            if (queryBuilderState instanceof DataSpaceQueryBuilderState) {
              editorStore.setShowDataspaceInfo(true);
            }
          }
        },
        icon: <InfoCircleIcon />,
      },
    ];
  }

  getExtraQueryBuilderHeaderActionConfigurations?(): QueryBuilderHeaderActionConfiguration[] {
    return [
      {
        key: 'load-query',
        category: 0,
        renderer: (queryBuilderState): React.ReactNode => {
          if (
            queryBuilderState.workflowState.actionConfig instanceof
            QueryBuilderActionConfig_QueryApplication
          ) {
            const editorStore =
              queryBuilderState.workflowState.actionConfig.editorStore;
            const openQueryLoader = (): void => {
              editorStore.queryLoaderState.setQueryLoaderDialogOpen(true);
            };
            return (
              <Button
                className="query-editor__header__action btn--dark"
                disabled={editorStore.isPerformingBlockingAction}
                onClick={openQueryLoader}
                title="Load query..."
              >
                <ManageSearchIcon className="query-editor__header__action__icon--load" />
                <div className="query-editor__header__action__label">
                  Load Query
                </div>
              </Button>
            );
          }
          return undefined;
        },
      },
      {
        key: 'new-query',
        category: 0,
        renderer: (queryBuilderState): React.ReactNode => {
          if (
            queryBuilderState.workflowState.actionConfig instanceof
            QueryBuilderActionConfig_QueryApplication
          ) {
            const editorStore =
              queryBuilderState.workflowState.actionConfig.editorStore;
            const handleNewQuery = (): void => {
              if (editorStore instanceof ExistingQueryEditorStore) {
                const query = editorStore.query;
                if (query) {
                  if (queryBuilderState instanceof DataSpaceQueryBuilderState) {
                    editorStore.applicationStore.navigationService.navigator.goToLocation(
                      generateDataSpaceQueryCreatorRoute(
                        query.groupId,
                        query.artifactId,
                        query.versionId,
                        queryBuilderState.dataSpace.path,
                        queryBuilderState.executionContext.name,
                        undefined,
                        undefined,
                      ),
                    );
                  } else {
                    const mapping =
                      editorStore.queryBuilderState?.executionContextState
                        .mapping;
                    const runtime =
                      editorStore.queryBuilderState?.executionContextState
                        .runtimeValue;
                    if (mapping && runtime instanceof RuntimePointer) {
                      editorStore.applicationStore.navigationService.navigator.goToLocation(
                        generateMappingQueryCreatorRoute(
                          query.groupId,
                          query.artifactId,
                          query.versionId,
                          mapping.path,
                          runtime.packageableRuntime.value.path,
                        ),
                      );
                    }
                  }
                }
              } else {
                if (
                  queryBuilderState.changeHistoryState.canUndo ||
                  queryBuilderState.changeHistoryState.canRedo
                ) {
                  queryBuilderState.applicationStore.alertService.setActionAlertInfo(
                    {
                      message:
                        'Current query will be lost when creating a new query. Do you still want to proceed?',
                      type: ActionAlertType.CAUTION,
                      actions: [
                        {
                          label: 'Proceed',
                          type: ActionAlertActionType.PROCEED_WITH_CAUTION,
                          handler:
                            queryBuilderState.applicationStore.guardUnhandledError(
                              async () => {
                                queryBuilderState.resetQueryContent();
                                queryBuilderState.setGetAllFunction(
                                  QUERY_BUILDER_SUPPORTED_GET_ALL_FUNCTIONS.GET_ALL,
                                );
                                queryBuilderState.milestoningState.updateMilestoningConfiguration();
                              },
                            ),
                        },
                        {
                          label: 'Cancel',
                          type: ActionAlertActionType.PROCEED,
                          default: true,
                        },
                      ],
                    },
                  );
                } else {
                  queryBuilderState.resetQueryContent();
                  queryBuilderState.setGetAllFunction(
                    QUERY_BUILDER_SUPPORTED_GET_ALL_FUNCTIONS.GET_ALL,
                  );
                  queryBuilderState.milestoningState.updateMilestoningConfiguration();
                }
              }
            };
            return (
              <Button
                className="query-editor__header__action btn--dark"
                disabled={editorStore.isPerformingBlockingAction}
                onClick={handleNewQuery}
                title="New query"
              >
                <SaveCurrIcon />
                <div className="query-editor__header__action__label">
                  New Query
                </div>
              </Button>
            );
          }
          return undefined;
        },
      },
      {
        key: 'save-combo',
        category: 0,
        renderer: (queryBuilderState): React.ReactNode => {
          if (
            queryBuilderState.workflowState.actionConfig instanceof
            QueryBuilderActionConfig_QueryApplication
          ) {
            const editorStore =
              queryBuilderState.workflowState.actionConfig.editorStore;
            const openSaveQueryModal = (): void => {
              if (editorStore.canPersistToSavedQuery) {
                if (editorStore instanceof ExistingQueryEditorStore) {
                  editorStore.updateState.showSaveModal();
                } else {
                  editorStore.queryCreatorState.open(undefined);
                }
              }
            };
            const handleQuerySaveAs = (): void => {
              if (editorStore.canPersistToSavedQuery) {
                editorStore.queryCreatorState.open(
                  editorStore instanceof ExistingQueryEditorStore
                    ? editorStore.query
                    : undefined,
                );
              }
            };
            return (
              <div className="query-editor__header__action-combo btn__dropdown-combo">
                <Button
                  className="query-editor__header__action query-editor__header__action-combo__main-btn btn--dak"
                  disabled={
                    editorStore.isPerformingBlockingAction ||
                    !editorStore.canPersistToSavedQuery ||
                    !queryBuilderState.canBuildQuery
                  }
                  onClick={openSaveQueryModal}
                  title="Save query"
                >
                  <SaveCurrIcon />
                  <div className="query-editor__header__action__label">
                    Save
                  </div>
                </Button>
                <ControlledDropdownMenu
                  className="query-editor__header__action-combo__dropdown-btn"
                  disabled={editorStore.isViewProjectActionDisabled}
                  title="query__editor__save-dropdown"
                  content={
                    <MenuContent>
                      <MenuContentItem
                        className="btn__dropdown-combo__option"
                        onClick={handleQuerySaveAs}
                        title="query__editor__save-dropdown__save-as"
                        disabled={
                          editorStore.isPerformingBlockingAction ||
                          !queryBuilderState.canBuildQuery
                        }
                      >
                        <MenuContentItemIcon>
                          <SaveAsIcon />
                        </MenuContentItemIcon>
                        <MenuContentItemLabel>
                          Save As New Query
                        </MenuContentItemLabel>
                      </MenuContentItem>
                    </MenuContent>
                  }
                >
                  <CaretDownIcon />
                </ControlledDropdownMenu>
              </div>
            );
          }
          return undefined;
        },
      },
    ];
  }

  getExtraQueryBuilderHeaderTitleConfigurations?(): QueryBuilderHeaderActionConfiguration {
    return {
      key: 'query-title',
      category: 0,
      renderer: (queryBuilderState): React.ReactNode => {
        if (
          queryBuilderState.workflowState.actionConfig instanceof
          QueryBuilderActionConfig_QueryApplication
        ) {
          const editorStore =
            queryBuilderState.workflowState.actionConfig.editorStore;
          const renderQueryTitle = (): React.ReactNode => {
            if (editorStore instanceof ExistingQueryEditorStore) {
              return (
                <QueryEditorExistingQueryHeader
                  queryBuilderState={queryBuilderState}
                  existingEditorStore={editorStore}
                />
              );
            } else if (
              editorStore instanceof DataSpaceTemplateQueryCreatorStore
            ) {
              return (
                <div className="query-editor__dataspace__header">
                  <div className="query-editor__header__content__main query-editor__header__content__title__text query-editor__dataspace__header__title__text">
                    {editorStore.templateQueryTitle}
                  </div>
                  <div className="query-editor__dataspace__header__title__tag">
                    template
                  </div>
                </div>
              );
            }
            return (
              <div className="query-editor__dataspace__header">
                <div className="query-editor__header__content__main query-editor__header__content__title__text query-editor__header__content__title__text--unsaved">
                  Unsaved Query
                </div>
              </div>
            );
          };
          return (
            <div className="query-editor__header__content">
              {renderQueryTitle()}
            </div>
          );
        }
        return undefined;
      },
    };
  }
}
