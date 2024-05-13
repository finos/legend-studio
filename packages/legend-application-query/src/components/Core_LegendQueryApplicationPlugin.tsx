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
import packageJson from '../../package.json' assert { type: 'json' };
import type { QuerySetupLandingPageStore } from '../stores/QuerySetupStore.js';
import {
  ArrowCircleUpIcon,
  Button,
  CaretDownIcon,
  CheckIcon,
  DroidIcon,
  DropdownMenu,
  EmptyLightBulbIcon,
  LightBulbIcon,
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
  LEGEND_APPLICATION_COLOR_THEME,
  type ApplicationPageEntry,
  type LegendApplicationSetup,
} from '@finos/legend-application';
import { CloneQueryServiceSetup } from './CloneQueryServiceSetup.js';
import { QueryProductionizerSetup } from './QueryProductionizerSetup.js';
import { UpdateExistingServiceQuerySetup } from './UpdateExistingServiceQuerySetup.js';
import { LoadProjectServiceQuerySetup } from './LoadProjectServiceQuerySetup.js';
import {
  configureCodeEditorComponent,
  setupPureLanguageService,
} from '@finos/legend-lego/code-editor';
import {
  generateDataSpaceQueryCreatorRoute,
  generateDataSpaceQuerySetupRoute,
} from '../__lib__/DSL_DataSpace_LegendQueryNavigation.js';
import type { QueryBuilderHeaderActionConfiguration } from '@finos/legend-query-builder';
import {
  ExistingQueryEditorStore,
  QueryBuilderActionConfig_QueryApplication,
  createViewProjectHandler,
  createViewSDLCProjectHandler,
} from '../stores/QueryEditorStore.js';
import {
  DataSpaceQueryBuilderState,
  generateDataSpaceTemplateQueryPromotionRoute,
} from '@finos/legend-extension-dsl-data-space/application';
import { RuntimePointer } from '@finos/legend-graph';
import { QUERY_DOCUMENTATION_KEY } from '../application/LegendQueryDocumentation.js';
import { LegendQueryTelemetryHelper } from '../__lib__/LegendQueryTelemetryHelper.js';
import { StoreProjectData } from '@finos/legend-server-depot';
import { buildUrl } from '@finos/legend-shared';
import { parseProjectIdentifier } from '@finos/legend-storage';
import { QUERY_EDITOR_TEST_ID } from '../__lib__/LegendQueryTesting.js';
import { QueryEditorExistingQueryHeader } from './QueryEditor.js';
import { DataSpaceTemplateQueryCreatorStore } from '../stores/data-space/DataSpaceTemplateQueryCreatorStore.js';

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

  getExtraQueryBuilderHeaderActionConfigurations?(): QueryBuilderHeaderActionConfiguration[] {
    return [
      {
        key: 'promote-as-template-query',
        category: 0,
        renderer: (queryBuilderState): React.ReactNode => {
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
            const proceedTemplate = (): void => {
              queryBuilderState.changeDetectionState.alertUnsavedChanges(() => {
                proceedCuratedTemplateQueryPromotion().catch(
                  editorStore.applicationStore.alertUnhandledError,
                );
              });
            };
            return (
              <>
                {editorStore instanceof ExistingQueryEditorStore &&
                  queryBuilderState instanceof DataSpaceQueryBuilderState && (
                    <button
                      className="query-editor__header__action btn--dark"
                      tabIndex={-1}
                      onClick={proceedTemplate}
                      title={
                        !(editorStore instanceof ExistingQueryEditorStore)
                          ? 'Please save your query first before promoting'
                          : 'Promote Curated Template query...'
                      }
                    >
                      <ArrowCircleUpIcon className="query-editor__header__action__icon--productionize" />
                      <div className="query-editor__header__action__label">
                        Promote as Template Query
                      </div>
                    </button>
                  )}
              </>
            );
          }
          return undefined;
        },
      },
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
            const isExistingQuery =
              editorStore instanceof ExistingQueryEditorStore;
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
              }
            };
            return (
              <>
                {isExistingQuery && (
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
                )}
              </>
            );
          }
          return undefined;
        },
      },
      {
        key: 'save-query',
        category: 0,
        renderer: (queryBuilderState): React.ReactNode => {
          if (
            queryBuilderState.workflowState.actionConfig instanceof
            QueryBuilderActionConfig_QueryApplication
          ) {
            const editorStore =
              queryBuilderState.workflowState.actionConfig.editorStore;
            const isExistingQuery =
              editorStore instanceof ExistingQueryEditorStore;
            const openSaveQueryModal = (): void => {
              if (editorStore instanceof ExistingQueryEditorStore) {
                editorStore.updateState.showSaveModal();
              }
            };

            return (
              <Button
                className="query-editor__header__action btn--dark"
                disabled={
                  !isExistingQuery ||
                  editorStore.isPerformingBlockingAction ||
                  !queryBuilderState.canBuildQuery
                }
                onClick={openSaveQueryModal}
                title={
                  !queryBuilderState.canBuildQuery
                    ? 'Please fix query errors before saving'
                    : 'Save query'
                }
              >
                <SaveCurrIcon />
                <div className="query-editor__header__action__label">Save</div>
              </Button>
            );
          }
          return undefined;
        },
      },
      {
        key: 'save-as',
        category: 0,
        renderer: (queryBuilderState): React.ReactNode => {
          if (
            queryBuilderState.workflowState.actionConfig instanceof
            QueryBuilderActionConfig_QueryApplication
          ) {
            const editorStore =
              queryBuilderState.workflowState.actionConfig.editorStore;
            const handleQuerySaveAs = (): void => {
              editorStore.queryCreatorState.open(
                editorStore instanceof ExistingQueryEditorStore
                  ? editorStore.query
                  : undefined,
              );
            };
            return (
              <Button
                className="query-editor__header__action btn--dark"
                disabled={
                  editorStore.isPerformingBlockingAction ||
                  !queryBuilderState.canBuildQuery
                }
                onClick={handleQuerySaveAs}
                title={
                  !queryBuilderState.canBuildQuery
                    ? 'Please fix query errors before saving'
                    : 'Save as new query'
                }
              >
                <SaveAsIcon />
                <div className="query-editor__header__action__label">
                  Save As...
                </div>
              </Button>
            );
          }
          return undefined;
        },
      },
      {
        key: 'help',
        category: 0,
        renderer: (queryBuilderState): React.ReactNode => {
          if (
            queryBuilderState.workflowState.actionConfig instanceof
            QueryBuilderActionConfig_QueryApplication
          ) {
            const editorStore =
              queryBuilderState.workflowState.actionConfig.editorStore;
            const queryDocEntry =
              editorStore.applicationStore.documentationService.getDocEntry(
                QUERY_DOCUMENTATION_KEY.TUTORIAL_QUERY_BUILDER,
              );
            const toggleAssistant = (): void =>
              editorStore.applicationStore.assistantService.toggleAssistant();

            const openQueryTutorial = (): void => {
              if (queryDocEntry?.url) {
                editorStore.applicationStore.navigationService.navigator.visitAddress(
                  queryDocEntry.url,
                );
              }
            };
            const extraHelpMenuContentItems =
              editorStore.applicationStore.pluginManager
                .getApplicationPlugins()
                .flatMap(
                  (plugin) =>
                    plugin.getExtraQueryEditorHelpMenuActionConfigurations?.() ??
                    [],
                )
                .map((item) => (
                  <MenuContentItem
                    key={item.key}
                    title={item.title ?? ''}
                    onClick={() => item.onClick(editorStore)}
                  >
                    {item.icon && (
                      <MenuContentItemIcon>{item.icon}</MenuContentItemIcon>
                    )}
                    <MenuContentItemLabel>{item.label}</MenuContentItemLabel>
                  </MenuContentItem>
                ));
            return (
              <DropdownMenu
                className="query-editor__header__action btn--dark"
                disabled={editorStore.isViewProjectActionDisabled}
                content={
                  <MenuContent>
                    {extraHelpMenuContentItems}
                    {queryDocEntry && (
                      <MenuContentItem onClick={openQueryTutorial}>
                        <MenuContentItemIcon>{null}</MenuContentItemIcon>
                        <MenuContentItemLabel>
                          Open Documentation
                        </MenuContentItemLabel>
                      </MenuContentItem>
                    )}

                    <MenuContentItem onClick={toggleAssistant}>
                      <MenuContentItemIcon>
                        {!editorStore.applicationStore.assistantService
                          .isHidden ? (
                          <CheckIcon />
                        ) : null}
                      </MenuContentItemIcon>
                      <MenuContentItemLabel>
                        Show Virtual Assistant
                      </MenuContentItemLabel>
                    </MenuContentItem>
                  </MenuContent>
                }
              >
                <div
                  className="query-editor__header__action__label"
                  title="See more options"
                >
                  Help...
                </div>
                <CaretDownIcon className="query-editor__header__action__dropdown-trigger" />
              </DropdownMenu>
            );
          }
          return undefined;
        },
      },
      {
        key: 'toggle-theme',
        category: 0,
        renderer: (queryBuilderState): React.ReactNode => {
          if (
            queryBuilderState.workflowState.actionConfig instanceof
            QueryBuilderActionConfig_QueryApplication
          ) {
            const editorStore =
              queryBuilderState.workflowState.actionConfig.editorStore;
            const applicationStore = editorStore.applicationStore;
            const TEMPORARY__toggleLightDarkMode = (): void => {
              applicationStore.layoutService.setColorTheme(
                applicationStore.layoutService
                  .TEMPORARY__isLightColorThemeEnabled
                  ? LEGEND_APPLICATION_COLOR_THEME.DEFAULT_DARK
                  : LEGEND_APPLICATION_COLOR_THEME.LEGACY_LIGHT,
                { persist: true },
              );
            };
            return (
              <button
                title="Toggle light/dark mode"
                onClick={TEMPORARY__toggleLightDarkMode}
                className="query-editor__header__action query-editor__header__action__theme-toggler"
              >
                {applicationStore.layoutService
                  .TEMPORARY__isLightColorThemeEnabled ? (
                  <>
                    <LightBulbIcon className="query-editor__header__action__icon--bulb--light" />
                  </>
                ) : (
                  <>
                    <EmptyLightBulbIcon className="query-editor__header__action__icon--bulb--dark" />
                  </>
                )}
              </button>
            );
          }
          return undefined;
        },
      },
      {
        key: 'more-actions',
        category: 0,
        renderer: (queryBuilderState): React.ReactNode => {
          if (
            queryBuilderState.workflowState.actionConfig instanceof
            QueryBuilderActionConfig_QueryApplication
          ) {
            const editorStore =
              queryBuilderState.workflowState.actionConfig.editorStore;
            const isExistingQuery =
              editorStore instanceof ExistingQueryEditorStore;
            const renameQuery = (): void => {
              if (editorStore instanceof ExistingQueryEditorStore) {
                editorStore.updateState.setQueryRenamer(true);
              }
            };
            const showQueryInfo = (): void => {
              if (editorStore instanceof ExistingQueryEditorStore) {
                editorStore.updateState.setShowQueryInfo(true);
              }
            };
            const viewProject = (): void => {
              LegendQueryTelemetryHelper.logEvent_QueryViewProjectLaunched(
                editorStore.applicationStore.telemetryService,
              );
              const { groupId, artifactId, versionId } =
                editorStore.getProjectInfo();
              createViewProjectHandler(editorStore.applicationStore)(
                groupId,
                artifactId,
                versionId,
                undefined,
              );
            };
            const viewSDLCProject = (): void => {
              LegendQueryTelemetryHelper.logEvent_QueryViewSdlcProjectLaunched(
                editorStore.applicationStore.telemetryService,
              );
              const { groupId, artifactId } = editorStore.getProjectInfo();
              createViewSDLCProjectHandler(
                editorStore.applicationStore,
                editorStore.depotServerClient,
              )(groupId, artifactId, undefined).catch(
                editorStore.applicationStore.alertUnhandledError,
              );
            };
            return (
              <DropdownMenu
                className="query-editor__header__action btn--medium"
                disabled={editorStore.isViewProjectActionDisabled}
                content={
                  <MenuContent>
                    {isExistingQuery && (
                      <MenuContentItem
                        className="query-editor__header__action__options"
                        onClick={renameQuery}
                        disabled={!isExistingQuery}
                      >
                        Rename Query
                      </MenuContentItem>
                    )}
                    {isExistingQuery && (
                      <MenuContentItem
                        className="query-editor__header__action__options"
                        onClick={showQueryInfo}
                        disabled={!isExistingQuery}
                      >
                        Get Query Info
                      </MenuContentItem>
                    )}
                    <MenuContentItem
                      className="query-editor__header__action__options"
                      disabled={editorStore.isViewProjectActionDisabled}
                      onClick={viewProject}
                    >
                      Go to Project
                    </MenuContentItem>
                    <MenuContentItem
                      className="query-editor__header__action__options"
                      disabled={editorStore.isViewProjectActionDisabled}
                      onClick={viewSDLCProject}
                    >
                      Go to SDLC project
                    </MenuContentItem>
                  </MenuContent>
                }
              >
                <div
                  className="query-editor__header__action__label"
                  title="See more options"
                >
                  More Actions...
                </div>
                <CaretDownIcon className="query-editor__header__action__dropdown-trigger" />
              </DropdownMenu>
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
            return undefined;
          };
          return (
            <div
              className="query-editor__header__content"
              data-testid={QUERY_EDITOR_TEST_ID.QUERY_EDITOR_ACTIONS}
            >
              {renderQueryTitle()}
            </div>
          );
        }
        return undefined;
      },
    };
  }
}
