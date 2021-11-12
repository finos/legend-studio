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

import type { ServicePureExecutionState } from '@finos/legend-studio';
import { useEditorStore } from '@finos/legend-studio';
import { flowResult } from 'mobx';
import { observer } from 'mobx-react-lite';
import { QueryBuilder_EditorExtensionState } from '../stores/QueryBuilder_EditorExtensionState';
import { useApplicationStore } from '@finos/legend-application';
import { StandardQueryBuilderMode } from '@finos/legend-query';
import { assertErrorThrown } from '@finos/legend-shared';
import { PencilIcon } from '@finos/legend-art';

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
    const editWithQueryBuilder = async (): Promise<void> => {
      executionState.setOpeningQueryEditor(true);
      if (executionState.selectedExecutionConfiguration) {
        const mapping =
          executionState.selectedExecutionConfiguration.mapping.value;
        const runtime = executionState.selectedExecutionConfiguration.runtime;
        if (!mapping.isStub) {
          queryBuilderExtension.reset();
          queryBuilderExtension.queryBuilderState.querySetupState.setMapping(
            mapping,
          );
          queryBuilderExtension.queryBuilderState.querySetupState.setRuntime(
            runtime,
          );
          queryBuilderExtension.queryBuilderState.querySetupState.setMappingIsReadOnly(
            true,
          );
          queryBuilderExtension.queryBuilderState.querySetupState.setRuntimeIsReadOnly(
            true,
          );
          queryBuilderExtension.queryBuilderState.initialize(
            executionState.execution.func,
          );
          await flowResult(
            queryBuilderExtension.setEmbeddedQueryBuilderMode({
              actionConfigs: [
                {
                  key: 'save-query-btn',
                  renderer: (): React.ReactNode => {
                    const save = async (): Promise<void> => {
                      try {
                        const rawLambda =
                          queryBuilderExtension.queryBuilderState.getQuery();
                        await flowResult(
                          executionState.queryState.updateLamba(rawLambda),
                        );
                        editorStore.applicationStore.notifySuccess(
                          `Service execution query is updated`,
                        );
                        queryBuilderExtension.setEmbeddedQueryBuilderMode(
                          undefined,
                        );
                      } catch (error) {
                        assertErrorThrown(error);
                        applicationStore.notifyError(
                          `Unable to save query: ${error.message}`,
                        );
                      }
                    };
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
              disableCompile: executionState.queryState.query.isStub,
              queryBuilderMode: new StandardQueryBuilderMode(),
            }),
          );
          executionState.setOpeningQueryEditor(false);
          return;
        }
      }
      executionState.editorStore.applicationStore.notifyWarning(
        'Please specify a mapping and a runtime for the execution to edit with query builder',
      );
      executionState.setOpeningQueryEditor(false);
    };

    return (
      <button
        className="panel__header__action"
        tabIndex={-1}
        disabled={isReadOnly}
        onClick={editWithQueryBuilder}
        title={'Edit query...'}
      >
        <PencilIcon />
      </button>
    );
  },
);
