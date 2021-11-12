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

import type { MappingTestState } from '@finos/legend-studio';
import { useEditorStore } from '@finos/legend-studio';
import { flowResult } from 'mobx';
import { observer } from 'mobx-react-lite';
import { QueryBuilder_EditorExtensionState } from '../stores/QueryBuilder_EditorExtensionState';
import { useApplicationStore } from '@finos/legend-application';
import { MappingExecutionQueryBuilderMode } from './MappingExecutionQueryBuilder';
import { assertErrorThrown } from '@finos/legend-shared';
import { PencilIcon } from '@finos/legend-art';

export const MappingTestQueryBuilder = observer(
  (props: { testState: MappingTestState; isReadOnly: boolean }) => {
    const { testState, isReadOnly } = props;
    const applicationStore = useApplicationStore();
    const editorStore = useEditorStore();
    const queryBuilderExtension = editorStore.getEditorExtensionState(
      QueryBuilder_EditorExtensionState,
    );
    const editWithQueryBuilder = async (): Promise<void> => {
      const mapping = testState.mappingEditorState.mapping;
      queryBuilderExtension.reset();
      queryBuilderExtension.queryBuilderState.querySetupState.setMapping(
        mapping,
      );
      queryBuilderExtension.queryBuilderState.querySetupState.setRuntime(
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
                      testState.queryState.updateLamba(rawLambda),
                    );
                    editorStore.applicationStore.notifySuccess(
                      `Mapping test query is updated`,
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
          disableCompile: testState.queryState.query.isStub,
          queryBuilderMode: new MappingExecutionQueryBuilderMode(),
        }),
      );
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
