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
  type MappingTestState,
  useEditorStore,
} from '@finos/legend-application-studio';
import { flowResult } from 'mobx';
import { observer } from 'mobx-react-lite';
import { QueryBuilder_EditorExtensionState } from '../stores/QueryBuilder_EditorExtensionState.js';
import { useApplicationStore } from '@finos/legend-application';
import { MappingExecutionQueryBuilderMode } from './MappingExecutionQueryBuilder.js';
import { assertErrorThrown, hashObject } from '@finos/legend-shared';
import { PencilIcon } from '@finos/legend-art';
import { isStubbed_RawLambda } from '@finos/legend-graph';

export const MappingTestQueryBuilder = observer(
  (props: { testState: MappingTestState; isReadOnly: boolean }) => {
    const { testState, isReadOnly } = props;
    const applicationStore = useApplicationStore();
    const editorStore = useEditorStore();
    const queryBuilderExtension = editorStore.getEditorExtensionState(
      QueryBuilder_EditorExtensionState,
    );
    const editWithQueryBuilder = applicationStore.guardUnhandledError(
      async () => {
        const mapping = testState.mappingEditorState.mapping;
        queryBuilderExtension.reset();
        queryBuilderExtension.queryBuilderState.querySetupState.setMapping(
          mapping,
        );
        queryBuilderExtension.queryBuilderState.querySetupState.setRuntimeValue(
          undefined,
        );
        queryBuilderExtension.queryBuilderState.querySetupState.setMappingIsReadOnly(
          true,
        );
        queryBuilderExtension.queryBuilderState.querySetupState.setRuntimeIsReadOnly(
          true,
        );
        queryBuilderExtension.queryBuilderState.initialize(
          testState.queryState.query,
        );
        queryBuilderExtension.queryBuilderState.changeDetectionState.setQueryHashCode(
          hashObject(testState.queryState.query),
        );
        queryBuilderExtension.queryBuilderState.changeDetectionState.setIsEnabled(
          true,
        );
        await flowResult(
          queryBuilderExtension.setEmbeddedQueryBuilderMode({
            actionConfigs: [
              {
                key: 'save-query-btn',
                renderer: (): React.ReactNode => {
                  const save = applicationStore.guardUnhandledError(
                    async (): Promise<void> => {
                      try {
                        const rawLambda =
                          queryBuilderExtension.queryBuilderState.getQuery();
                        await flowResult(
                          testState.queryState.updateLamba(rawLambda),
                        );
                        applicationStore.notifySuccess(
                          `Mapping test query is updated`,
                        );
                        queryBuilderExtension.queryBuilderState.changeDetectionState.setQueryHashCode(
                          hashObject(rawLambda),
                        );
                        queryBuilderExtension.setEmbeddedQueryBuilderMode(
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
            disableCompile: isStubbed_RawLambda(testState.queryState.query),
            queryBuilderMode: new MappingExecutionQueryBuilderMode(),
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
