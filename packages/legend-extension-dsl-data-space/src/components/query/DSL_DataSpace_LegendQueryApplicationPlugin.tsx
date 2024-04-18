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

import packageJson from '../../../package.json' assert { type: 'json' };
import {
  type ExistingQueryEditorStateBuilder,
  type QueryEditorStore,
  type QuerySetupActionConfiguration,
  ExistingQueryEditorStore,
  LegendQueryApplicationPlugin,
  LEGEND_QUERY_APP_EVENT,
  createViewProjectHandler,
  createViewSDLCProjectHandler,
  type QueryEditorActionConfiguration,
  type NewQueryNavigationPath,
} from '@finos/legend-application-query';
import { ArrowCircleUpIcon, SquareIcon } from '@finos/legend-art';
import {
  ActionAlertActionType,
  ActionAlertType,
  type ApplicationPageEntry,
} from '@finos/legend-application';
import {
  DATA_SPACE_QUERY_ROUTE_PATTERN,
  generateDataSpaceQueryCreatorRoute,
  generateDataSpaceQuerySetupRoute,
  generateDataSpaceTemplateQueryPromotionRoute,
} from '../../__lib__/query/DSL_DataSpace_LegendQueryNavigation.js';
import { DataSpaceQueryCreator } from './DataSpaceQueryCreator.js';
import {
  type Query,
  type Mapping,
  type PackageableRuntime,
} from '@finos/legend-graph';
import {
  DataSpaceQueryBuilderState,
  DataSpaceProjectInfo,
} from '../../stores/query/DataSpaceQueryBuilderState.js';
import type { DataSpaceInfo } from '../../stores/query/DataSpaceInfo.js';
import { getOwnDataSpace } from '../../graph-manager/DSL_DataSpace_GraphManagerHelper.js';
import {
  assertErrorThrown,
  buildUrl,
  guaranteeNonNullable,
  LogEvent,
} from '@finos/legend-shared';
import type { QueryBuilderState } from '@finos/legend-query-builder';
import { DataSpaceQuerySetup } from './DataSpaceQuerySetup.js';
import { DSL_DataSpace_getGraphManagerExtension } from '../../graph-manager/protocol/pure/DSL_DataSpace_PureGraphManagerExtension.js';
import {
  LATEST_VERSION_ALIAS,
  StoreProjectData,
} from '@finos/legend-server-depot';
import { retrieveAnalyticsResultCache } from '../../graph-manager/action/analytics/DataSpaceAnalysisHelper.js';
import { flowResult } from 'mobx';
import type {
  DataSpace,
  DataSpaceExecutionContext,
} from '../../graph/metamodel/pure/model/packageableElements/dataSpace/DSL_DataSpace_DataSpace.js';
import { DataSpaceTemplateQueryCreator } from './DataSpaceTemplateQueryCreator.js';
import { DataSpaceTemplateQueryCreatorStore } from '../../stores/query/DataSpaceTemplateQueryCreatorStore.js';
import { parseProjectIdentifier } from '@finos/legend-storage';
import { getDataSpaceQueryInfo } from './QueryDataSpaceUtil.js';

const resolveExecutionContext = (
  dataSpace: DataSpace,
  queryMapping: Mapping,
  queryRuntime: PackageableRuntime,
): DataSpaceExecutionContext | undefined => {
  const matchingExecContexts = dataSpace.executionContexts.filter(
    (ec) => ec.mapping.value === queryMapping,
  );
  if (matchingExecContexts.length > 1) {
    const matchRuntime = matchingExecContexts.find(
      (exec) => exec.defaultRuntime.value.path === queryRuntime.path,
    );
    // TODO: we will safely do this for now. Long term we should save exec context key into query store
    // we should make runtime/mapping optional
    return matchRuntime ?? matchingExecContexts[0];
  }
  return matchingExecContexts[0];
};

export class DSL_DataSpace_LegendQueryApplicationPlugin extends LegendQueryApplicationPlugin {
  constructor() {
    super(packageJson.extensions.applicationQueryPlugin, packageJson.version);
  }

  override getExtraApplicationPageEntries(): ApplicationPageEntry[] {
    return [
      // data space query editor setup
      {
        key: 'data-space-query-setup-application-page',
        addressPatterns: [DATA_SPACE_QUERY_ROUTE_PATTERN.SETUP],
        renderer: DataSpaceQuerySetup,
      },
      // data space template query creator
      // Heads-up: TEMPLATE_QUERY must come before CREATE as it has a more specific pattern than CREATE.
      {
        key: 'data-space-template-query-viewer-application-page',
        addressPatterns: [DATA_SPACE_QUERY_ROUTE_PATTERN.TEMPLATE_QUERY],
        renderer: DataSpaceTemplateQueryCreator,
      },
      // data space query editor
      {
        key: 'data-space-query-editor-application-page',
        addressPatterns: [DATA_SPACE_QUERY_ROUTE_PATTERN.CREATE],
        renderer: DataSpaceQueryCreator,
      },
    ];
  }

  override getExtraQuerySetupActionConfigurations(): QuerySetupActionConfiguration[] {
    return [
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

  override getExtraExistingQueryEditorStateBuilders(): ExistingQueryEditorStateBuilder[] {
    return [
      async (
        query: Query,
        editorStore: ExistingQueryEditorStore,
      ): Promise<QueryBuilderState | undefined> => {
        const dataSpacePath = getDataSpaceQueryInfo(query);
        if (dataSpacePath) {
          const dataSpace = getOwnDataSpace(
            dataSpacePath,
            editorStore.graphManagerState.graph,
          );
          const mapping = query.mapping.value;
          const matchingExecutionContext = resolveExecutionContext(
            dataSpace,
            mapping,
            query.runtime.value,
          );
          if (!matchingExecutionContext) {
            // if a matching execution context is not found, it means this query is not
            // properly created from a data space, therefore, we cannot support this case
            return undefined;
          }
          let dataSpaceAnalysisResult;
          try {
            const project = StoreProjectData.serialization.fromJson(
              await editorStore.depotServerClient.getProject(
                query.groupId,
                query.artifactId,
              ),
            );
            dataSpaceAnalysisResult =
              await DSL_DataSpace_getGraphManagerExtension(
                editorStore.graphManagerState.graphManager,
              ).retrieveDataSpaceAnalysisFromCache(() =>
                retrieveAnalyticsResultCache(
                  project,
                  query.versionId,
                  dataSpace.path,
                  editorStore.depotServerClient,
                ),
              );
          } catch {
            // do nothing
          }
          const projectInfo = new DataSpaceProjectInfo(
            query.groupId,
            query.artifactId,
            query.versionId,
            createViewProjectHandler(editorStore.applicationStore),
            createViewSDLCProjectHandler(
              editorStore.applicationStore,
              editorStore.depotServerClient,
            ),
          );
          const sourceInfo = {
            groupId: projectInfo.groupId,
            artifactId: projectInfo.artifactId,
            versionId: projectInfo.versionId,
            dataSpace: dataSpace.path,
          };
          const dataSpaceQueryBuilderState = new DataSpaceQueryBuilderState(
            editorStore.applicationStore,
            editorStore.graphManagerState,
            editorStore.depotServerClient,
            dataSpace,
            matchingExecutionContext,
            (dataSpaceInfo: DataSpaceInfo) => {
              if (dataSpaceInfo.defaultExecutionContext) {
                const proceed = (): void =>
                  editorStore.applicationStore.navigationService.navigator.goToLocation(
                    generateDataSpaceQueryCreatorRoute(
                      guaranteeNonNullable(dataSpaceInfo.groupId),
                      guaranteeNonNullable(dataSpaceInfo.artifactId),
                      LATEST_VERSION_ALIAS, //always default to latest
                      dataSpaceInfo.path,
                      guaranteeNonNullable(
                        dataSpaceInfo.defaultExecutionContext,
                      ),
                      undefined,
                      undefined,
                    ),
                  );
                const updateQueryAndProceed = async (): Promise<void> => {
                  try {
                    await flowResult(
                      editorStore.updateState.updateQuery(undefined, undefined),
                    );
                    proceed();
                  } catch (error) {
                    assertErrorThrown(error);
                    editorStore.applicationStore.logService.error(
                      LogEvent.create(LEGEND_QUERY_APP_EVENT.GENERIC_FAILURE),
                      error,
                    );
                    editorStore.applicationStore.notificationService.notifyError(
                      error,
                    );
                  }
                };
                if (
                  !query.isCurrentUserQuery ||
                  !editorStore.queryBuilderState?.changeDetectionState
                    .hasChanged
                ) {
                  proceed();
                } else {
                  editorStore.applicationStore.alertService.setActionAlertInfo({
                    message: `To change the data space, you need to save the current query
                       to proceed`,
                    type: ActionAlertType.CAUTION,
                    actions: [
                      {
                        label: 'Save query and Proceed',
                        type: ActionAlertActionType.PROCEED_WITH_CAUTION,
                        handler: () => {
                          updateQueryAndProceed().catch(
                            editorStore.applicationStore.alertUnhandledError,
                          );
                        },
                      },
                      {
                        label: 'Abort',
                        type: ActionAlertActionType.PROCEED,
                        default: true,
                      },
                    ],
                  });
                }
              } else {
                editorStore.applicationStore.notificationService.notifyWarning(
                  `Can't switch data space: default execution context not specified`,
                );
              }
            },
            true,
            dataSpaceAnalysisResult,
            undefined,
            undefined,
            undefined,
            projectInfo,
            editorStore.applicationStore.config.options.queryBuilderConfig,
            sourceInfo,
          );
          const mappingModelCoverageAnalysisResult =
            dataSpaceAnalysisResult?.executionContextsIndex.get(
              matchingExecutionContext.name,
            )?.mappingModelCoverageAnalysisResult;
          if (mappingModelCoverageAnalysisResult) {
            dataSpaceQueryBuilderState.explorerState.mappingModelCoverageAnalysisResult =
              mappingModelCoverageAnalysisResult;
          }
          return dataSpaceQueryBuilderState;
        }
        return undefined;
      },
    ];
  }

  override getExtraNewQueryNavigationPath(): NewQueryNavigationPath[] {
    return [
      (
        query: Query,
        editorStore: ExistingQueryEditorStore,
      ): string | undefined => {
        const dataSpacePath = getDataSpaceQueryInfo(query);
        const queryBuilderState = editorStore.queryBuilderState;
        if (
          dataSpacePath &&
          queryBuilderState instanceof DataSpaceQueryBuilderState
        ) {
          queryBuilderState.executionContext.name;
          return generateDataSpaceQueryCreatorRoute(
            query.groupId,
            query.artifactId,
            query.versionId,
            dataSpacePath,
            // TODO: fix execution key once that is fixed
            queryBuilderState.executionContext.name,
            undefined,
            undefined,
          );
        }
        return undefined;
      },
    ];
  }

  override getExtraQueryHeaders(): ((
    editorStore: QueryEditorStore,
  ) => React.ReactNode | undefined)[] {
    return [
      (editorStore: QueryEditorStore): React.ReactNode | undefined => {
        if (editorStore instanceof DataSpaceTemplateQueryCreatorStore) {
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
      },
    ];
  }

  override getExtraQueryEditorActionConfigurations(): QueryEditorActionConfiguration[] {
    return [
      {
        key: 'promote-as-curated-template-query',
        renderer: (editorStore, queryBuilderState) => {
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

          const proceed = (): void => {
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
                    onClick={proceed}
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
        },
      },
    ];
  }
}
