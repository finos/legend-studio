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

import packageJson from '../../../package.json';
import {
  type QueryEditorStore,
  type QueryEditorHeaderLabeler,
  type QuerySetupOptionRendererConfiguration,
  type QuerySetupRenderer,
  type QuerySetupState,
  type QuerySetupStore,
  type ExistingQueryEditorStateBuilder,
  type ExistingQueryEditorStore,
  LegendQueryApplicationPlugin,
  generateExistingQueryEditorRoute,
  LegendQueryEventService,
  LEGEND_QUERY_APP_EVENT,
} from '@finos/legend-application-query';
import { SquareIcon } from '@finos/legend-art';
import { DataSpaceQuerySetupState } from '../../stores/query/DataSpaceQuerySetupState.js';
import { DataspaceQuerySetup } from './DataSpaceQuerySetup.js';
import {
  ActionAlertActionType,
  ActionAlertType,
  type ApplicationPageEntry,
} from '@finos/legend-application';
import { CREATE_QUERY_FROM_DATA_SPACE_ROUTE_PATTERN } from '../../stores/query/DSLDataSpace_LegendQueryRouter.js';
import { DataSpaceQueryCreator } from './DataSpaceQueryCreator.js';
import {
  createQueryDataSpaceTaggedValue,
  DataSpaceQueryCreatorStore,
} from '../../stores/query/DataSpaceQueryCreatorStore.js';
import {
  Query,
  extractElementNameFromPath,
  isValidFullPath,
} from '@finos/legend-graph';
import {
  QUERY_PROFILE_PATH,
  QUERY_PROFILE_TAG_DATA_SPACE,
} from '../../DSLDataSpace_Const.js';
import { DataSpaceQueryBuilderState } from '../../stores/query/DataSpaceQueryBuilderState.js';
import type { DataSpaceInfo } from '../../stores/query/DataSpaceInfo.js';
import { getOwnDataSpace } from '../../graphManager/DSLDataSpace_GraphManagerHelper.js';
import { assertErrorThrown, LogEvent, uuid } from '@finos/legend-shared';
import type { QueryBuilderState } from '@finos/legend-query-builder';

export class DSLDataSpace_LegendQueryApplicationPlugin extends LegendQueryApplicationPlugin {
  constructor() {
    super(packageJson.extensions.queryApplicationPlugin, packageJson.version);
  }

  override getExtraApplicationPageEntries(): ApplicationPageEntry[] {
    return [
      // data space query editor
      {
        key: 'data-space-query-editor-application-page',
        urlPatterns: [CREATE_QUERY_FROM_DATA_SPACE_ROUTE_PATTERN],
        renderer: DataSpaceQueryCreator,
      },
    ];
  }

  override getExtraQuerySetupOptionRendererConfigurations(): QuerySetupOptionRendererConfiguration[] {
    return [
      {
        key: 'data-space-query-option',
        renderer: (
          setupStore: QuerySetupStore,
        ): React.ReactNode | undefined => {
          const createQuery = (): void =>
            setupStore.setSetupState(new DataSpaceQuerySetupState(setupStore));
          return (
            <button
              className="query-setup__landing-page__option query-setup__landing-page__option--data-space"
              onClick={createQuery}
            >
              <div className="query-setup__landing-page__option__icon">
                <SquareIcon className="query-setup__landing-page__icon--data-space" />
              </div>
              <div className="query-setup__landing-page__option__label">
                Create query from data space
              </div>
            </button>
          );
        },
      },
    ];
  }

  override getExtraQuerySetupRenderers(): QuerySetupRenderer[] {
    return [
      (querySetupState: QuerySetupState): React.ReactNode | undefined => {
        if (querySetupState instanceof DataSpaceQuerySetupState) {
          return <DataspaceQuerySetup querySetupState={querySetupState} />;
        }
        return undefined;
      },
    ];
  }

  override getExtraQueryEditorHeaderLabelers(): QueryEditorHeaderLabeler[] {
    return [
      (editorStore: QueryEditorStore): React.ReactNode | undefined => {
        if (editorStore instanceof DataSpaceQueryCreatorStore) {
          return (
            <div className="query-editor__header__label">
              <SquareIcon className="query-editor__header__label__icon icon--data-space" />
              {extractElementNameFromPath(editorStore.dataSpacePath)}
              <div className="query-editor__header__label__tag">
                {editorStore.executionContext}
              </div>
            </div>
          );
        }
        return undefined;
      },
    ];
  }

  override getExtraExistingQueryEditorStateBuilders(): ExistingQueryEditorStateBuilder[] {
    return [
      (
        query: Query,
        editorStore: ExistingQueryEditorStore,
      ): QueryBuilderState | undefined => {
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
          return new DataSpaceQueryBuilderState(
            editorStore.applicationStore,
            editorStore.graphManagerState,
            editorStore.depotServerClient,
            dataSpace,
            matchingExecutionContext,
            query.groupId,
            query.artifactId,
            query.versionId,
            (dataSpaceInfo: DataSpaceInfo) => {
              if (dataSpaceInfo.defaultExecutionContext) {
                const persistQuery = async (): Promise<void> => {
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

                  try {
                    if (!query.isCurrentUserQuery) {
                      _query.id = uuid();
                      const newQuery =
                        await editorStore.graphManagerState.graphManager.createQuery(
                          _query,
                          editorStore.graphManagerState.graph,
                        );
                      editorStore.applicationStore.notifySuccess(
                        `Successfully created query!`,
                      );
                      LegendQueryEventService.create(
                        editorStore.applicationStore.eventService,
                      ).notify_QueryCreated({ queryId: newQuery.id });
                      editorStore.applicationStore.navigator.jumpTo(
                        editorStore.applicationStore.navigator.generateLocation(
                          generateExistingQueryEditorRoute(newQuery.id),
                        ),
                      );
                    } else {
                      await editorStore.graphManagerState.graphManager.updateQuery(
                        _query,
                        editorStore.graphManagerState.graph,
                      );
                      editorStore.applicationStore.notifySuccess(
                        `Successfully updated query!`,
                      );
                      editorStore.applicationStore.navigator.reload();
                    }
                  } catch (error) {
                    assertErrorThrown(error);
                    editorStore.applicationStore.log.error(
                      LogEvent.create(LEGEND_QUERY_APP_EVENT.GENERIC_FAILURE),
                      error,
                    );
                    editorStore.applicationStore.notifyError(error);
                  }
                };

                editorStore.applicationStore.setActionAlertInfo({
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
                        persistQuery().catch(
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
                editorStore.applicationStore.notifyWarning(
                  `Can't switch data space: default execution context not specified`,
                );
              }
            },
          );
        }
        return undefined;
      },
    ];
  }
}
