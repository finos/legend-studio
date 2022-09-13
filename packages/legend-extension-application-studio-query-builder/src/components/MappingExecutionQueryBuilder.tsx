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
  type MappingExecutionState,
  useEditorStore,
} from '@finos/legend-application-studio';
import { flowResult } from 'mobx';
import { observer } from 'mobx-react-lite';
import { QueryBuilder_EditorExtensionState } from '../stores/QueryBuilder_EditorExtensionState.js';
import {
  buildElementOption,
  getPackageableElementOptionFormatter,
  useApplicationStore,
} from '@finos/legend-application';
import { assertErrorThrown, hashObject } from '@finos/legend-shared';
import {
  CustomSelectorInput,
  PencilIcon,
  PURE_MappingIcon,
} from '@finos/legend-art';
import {
  getMappingCompatibleClasses,
  isStubbed_RawLambda,
} from '@finos/legend-graph';
import {
  QueryBuilderClassSelector,
  type QueryBuilderState,
} from '@finos/legend-query-builder';
import { MappingExecutionQueryBuilderState } from '../stores/MappingExecutionQueryBuilderState.js';

/**
 * This setup panel supports limited cascading, we will only show:
 * - For class selector: the list of compatible class with the specified mapping
 */
const MappingExecutionQueryBuilderSetupPanelContent = observer(
  (props: { queryBuilderState: MappingExecutionQueryBuilderState }) => {
    const { queryBuilderState } = props;
    const applicationStore = useApplicationStore();

    // mapping
    const selectedMappingOption = buildElementOption(
      queryBuilderState.executionMapping,
    );

    // class
    const classes = getMappingCompatibleClasses(
      queryBuilderState.executionMapping,
      queryBuilderState.graphManagerState.usableClasses,
    );

    return (
      <>
        <div className="query-builder__setup__config-group">
          <div className="query-builder__setup__config-group__header">
            <div className="query-builder__setup__config-group__header__title">
              execution context
            </div>
          </div>
          <div className="query-builder__setup__config-group__content">
            <div className="query-builder__setup__config-group__item">
              <div
                className="btn--sm query-builder__setup__config-group__item__label"
                title="mapping"
              >
                <PURE_MappingIcon />
              </div>
              <CustomSelectorInput
                className="panel__content__form__section__dropdown query-builder__setup__config-group__item__selector"
                disabled={true}
                options={[]}
                value={selectedMappingOption}
                darkMode={!applicationStore.TEMPORARY__isLightThemeEnabled}
                formatOptionLabel={getPackageableElementOptionFormatter({
                  darkMode: !applicationStore.TEMPORARY__isLightThemeEnabled,
                })}
              />
            </div>
          </div>
        </div>
        <QueryBuilderClassSelector
          queryBuilderState={queryBuilderState}
          classes={classes}
          noMatchMessage="No compatible class found for specified mapping"
        />
      </>
    );
  },
);

export const renderMappingExecutionQueryBuilderSetupPanelContent = (
  queryBuilderState: MappingExecutionQueryBuilderState,
): React.ReactNode => (
  <MappingExecutionQueryBuilderSetupPanelContent
    queryBuilderState={queryBuilderState}
  />
);

export const MappingExecutionQueryBuilder = observer(
  (props: { executionState: MappingExecutionState }) => {
    const { executionState } = props;
    const applicationStore = useApplicationStore();
    const editorStore = useEditorStore();
    const queryBuilderExtension = editorStore.getEditorExtensionState(
      QueryBuilder_EditorExtensionState,
    );
    const editWithQueryBuilder = applicationStore.guardUnhandledError(
      async () => {
        await flowResult(
          queryBuilderExtension.setEmbeddedQueryBuilderConfiguration({
            setupQueryBuilderState: (): QueryBuilderState => {
              const queryBuilderState = new MappingExecutionQueryBuilderState(
                executionState.mappingEditorState.mapping,
                queryBuilderExtension.editorStore.applicationStore,
                queryBuilderExtension.editorStore.graphManagerState,
              );
              queryBuilderState.initializeWithQuery(
                executionState.queryState.query,
              );
              queryBuilderState.changeDetectionState.setQueryHashCode(
                hashObject(executionState.queryState.query),
              );
              queryBuilderState.changeDetectionState.setIsEnabled(true);
              return queryBuilderState;
            },
            actionConfigs: [
              {
                key: 'save-query-btn',
                renderer: (
                  queryBuilderState: QueryBuilderState,
                ): React.ReactNode => {
                  const save = applicationStore.guardUnhandledError(
                    async (): Promise<void> => {
                      try {
                        const rawLambda = queryBuilderState.buildQuery();
                        await flowResult(
                          executionState.queryState.updateLamba(rawLambda),
                        );
                        applicationStore.notifySuccess(
                          `Mapping execution query is updated`,
                        );
                        queryBuilderState.changeDetectionState.setQueryHashCode(
                          hashObject(rawLambda),
                        );
                        queryBuilderExtension.setEmbeddedQueryBuilderConfiguration(
                          undefined,
                        );
                      } catch (error) {
                        assertErrorThrown(error);
                        applicationStore.notifyError(
                          `Can't save query: ${error.message}`,
                        );
                      }
                    },
                  );
                  return (
                    <button
                      className="query-builder__dialog__header__custom-action"
                      tabIndex={-1}
                      onClick={save}
                    >
                      Save Query
                    </button>
                  );
                },
              },
            ],
            disableCompile: isStubbed_RawLambda(
              executionState.queryState.query,
            ),
          }),
        );
      },
    );

    return (
      <button
        className="panel__header__action"
        tabIndex={-1}
        onClick={editWithQueryBuilder}
        title="Edit query..."
      >
        <PencilIcon />
      </button>
    );
  },
);
