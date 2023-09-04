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
  type QuerySetupActionConfiguration,
  type ExistingQueryEditorStateBuilder,
  type ExistingQueryEditorStore,
  LegendQueryApplicationPlugin,
  generateExistingQueryEditorRoute,
  LEGEND_QUERY_APP_EVENT,
  LegendQueryEventHelper,
  createViewProjectHandler,
  createViewSDLCProjectHandler,
} from '@finos/legend-application-query';
import { SquareIcon } from '@finos/legend-art';
import {
  ActionAlertActionType,
  ActionAlertType,
  type ApplicationPageEntry,
} from '@finos/legend-application';
import {
  DATA_SPACE_QUERY_ROUTE_PATTERN,
  generateDataSpaceQuerySetupRoute,
} from '../../__lib__/query/DSL_DataSpace_LegendQueryNavigation.js';
import { DataSpaceQueryCreator } from './DataSpaceQueryCreator.js';
import { createQueryDataSpaceTaggedValue } from '../../stores/query/DataSpaceQueryCreatorStore.js';
import { Query, isValidFullPath } from '@finos/legend-graph';
import {
  QUERY_PROFILE_PATH,
  QUERY_PROFILE_TAG_DATA_SPACE,
} from '../../graph/DSL_DataSpace_MetaModelConst.js';
import {
  DataSpaceQueryBuilderState,
  DataSpaceProjectInfo,
} from '../../stores/query/DataSpaceQueryBuilderState.js';
import type { DataSpaceInfo } from '../../stores/query/DataSpaceInfo.js';
import { getOwnDataSpace } from '../../graph-manager/DSL_DataSpace_GraphManagerHelper.js';
import { assertErrorThrown, LogEvent, uuid } from '@finos/legend-shared';
import type { QueryBuilderState } from '@finos/legend-query-builder';
import { DataSpaceQuerySetup } from './DataSpaceQuerySetup.js';
import { DSL_DataSpace_getGraphManagerExtension } from '../../graph-manager/protocol/pure/DSL_DataSpace_PureGraphManagerExtension.js';
import { StoreProjectData } from '@finos/legend-server-depot';
import { retrieveAnalyticsResultCache } from '../../graph-manager/action/analytics/DataSpaceAnalysisHelper.js';

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
        const dataSpaceTaggedValue = query.taggedValues?.find(
          (taggedValue) =>
            taggedValue.profile === QUERY_PROFILE_PATH &&
            taggedValue.tag === QUERY_PROFILE_TAG_DATA_SPACE &&
            isValidFullPath(taggedValue.value),
        );

        if (dataSpaceTaggedValue) {
          const dataSpacePath = dataSpaceTaggedValue.value;
          const dataSpace = getOwnDataSpace(
            dataSpacePath,
            editorStore.graphManagerState.graph,
          );
          const mapping = query.mapping.value;
          const matchingExecutionContext = dataSpace.executionContexts.find(
            (ec) => ec.mapping.value === mapping,
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
          const dataSpaceQueryBuilderState = new DataSpaceQueryBuilderState(
            editorStore.applicationStore,
            editorStore.graphManagerState,
            editorStore.depotServerClient,
            dataSpace,
            matchingExecutionContext,
            (dataSpaceInfo: DataSpaceInfo) => {
              if (dataSpaceInfo.defaultExecutionContext) {
                const createQuery = async (): Promise<void> => {
                  // prepare the new query to save
                  const _query = new Query();
                  _query.name = query.name;
                  _query.id = query.id;
                  _query.groupId = query.groupId;
                  _query.artifactId = query.artifactId;
                  _query.versionId = query.versionId;
                  _query.mapping = query.mapping;
                  _query.runtime = query.runtime;
                  _query.taggedValues = [
                    createQueryDataSpaceTaggedValue(dataSpaceInfo.path),
                  ].concat(
                    (query.taggedValues ?? []).filter(
                      (taggedValue) => taggedValue !== dataSpaceTaggedValue,
                    ),
                  );
                  _query.stereotypes = query.stereotypes;
                  _query.content = query.content;
                  _query.owner = query.owner;
                  _query.lastUpdatedAt = query.lastUpdatedAt;

                  try {
                    if (!query.isCurrentUserQuery) {
                      _query.id = uuid();
                      const newQuery =
                        await editorStore.graphManagerState.graphManager.createQuery(
                          _query,
                          editorStore.graphManagerState.graph,
                        );
                      editorStore.applicationStore.notificationService.notifySuccess(
                        `Successfully created query!`,
                      );
                      LegendQueryEventHelper.notify_QueryCreateSucceeded(
                        editorStore.applicationStore.eventService,
                        { queryId: newQuery.id },
                      );
                      editorStore.applicationStore.navigationService.navigator.goToLocation(
                        generateExistingQueryEditorRoute(newQuery.id),
                      );
                    } else {
                      await editorStore.graphManagerState.graphManager.updateQuery(
                        _query,
                        editorStore.graphManagerState.graph,
                      );
                      editorStore.applicationStore.notificationService.notifySuccess(
                        `Successfully updated query!`,
                      );
                      editorStore.applicationStore.navigationService.navigator.reload();
                    }
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

                editorStore.applicationStore.alertService.setActionAlertInfo({
                  message: `To change the data space associated with this query, you need to ${
                    query.isCurrentUserQuery
                      ? 'update the query'
                      : 'create a new query'
                  } to proceed`,
                  type: ActionAlertType.CAUTION,
                  actions: [
                    {
                      label: query.isCurrentUserQuery
                        ? 'Update query'
                        : 'Create new query',
                      type: ActionAlertActionType.PROCEED_WITH_CAUTION,
                      handler: () => {
                        createQuery().catch(
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
}
