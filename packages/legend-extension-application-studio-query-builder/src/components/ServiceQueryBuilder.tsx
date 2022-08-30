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
  type ServicePureExecutionState,
  useEditorStore,
} from '@finos/legend-application-studio';
import { flowResult } from 'mobx';
import { observer } from 'mobx-react-lite';
import { QueryBuilder_EditorExtensionState } from '../stores/QueryBuilder_EditorExtensionState.js';
import { useApplicationStore } from '@finos/legend-application';
import { assertErrorThrown, hashObject } from '@finos/legend-shared';
import { PencilIcon } from '@finos/legend-art';
import {
  isStubbed_RawLambda,
  isStubbed_PackageableElement,
} from '@finos/legend-graph';
import {
  BasicQueryBuilderState,
  type QueryBuilderState,
} from '@finos/legend-application-query';

export const ServiceQueryBuilder = observer(
  (props: {
    executionState: ServicePureExecutionState;
    isReadOnly: boolean;
  }) => {
    const { executionState, isReadOnly } = props;
    const applicationStore = useApplicationStore();
    const editorStore = useEditorStore();
    const queryBuilderExtension = editorStore.getEditorExtensionState(
      QueryBuilder_EditorExtensionState,
    );
    const editWithQueryBuilder = applicationStore.guardUnhandledError(
      async () => {
        executionState.setOpeningQueryEditor(true);
        const selectedExecutionState =
          executionState.selectedExecutionContextState;
        if (selectedExecutionState) {
          const mapping = selectedExecutionState.executionContext.mapping.value;
          if (!isStubbed_PackageableElement(mapping)) {
            await flowResult(
              queryBuilderExtension.setEmbeddedQueryBuilderConfiguration({
                setupQueryBuilderState: (): QueryBuilderState => {
                  const queryBuilderState = BasicQueryBuilderState.create(
                    queryBuilderExtension.editorStore.applicationStore,
                    queryBuilderExtension.editorStore.graphManagerState,
                  );
                  queryBuilderState.querySetupState.setMapping(mapping);
                  queryBuilderState.querySetupState.setRuntimeValue(
                    selectedExecutionState.executionContext.runtime,
                  );
                  queryBuilderState.querySetupState.setMappingIsReadOnly(true);
                  queryBuilderState.querySetupState.setRuntimeIsReadOnly(true);
                  queryBuilderState.initialize(executionState.execution.func);
                  queryBuilderState.changeDetectionState.setQueryHashCode(
                    hashObject(executionState.execution.func),
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
                        async () => {
                          try {
                            const rawLambda = queryBuilderState.getQuery();
                            await flowResult(
                              executionState.queryState.updateLamba(rawLambda),
                            );
                            applicationStore.notifySuccess(
                              `Service query is updated`,
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
                          disabled={isReadOnly}
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
            executionState.setOpeningQueryEditor(false);
            return;
          }
        }
        applicationStore.notifyWarning(
          'Please specify a mapping and a runtime for the execution context to edit with query builder',
        );
        executionState.setOpeningQueryEditor(false);
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
