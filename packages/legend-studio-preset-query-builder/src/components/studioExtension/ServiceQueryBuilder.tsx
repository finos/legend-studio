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
import { useApplicationStore, useEditorStore } from '@finos/legend-studio';
import { flowResult } from 'mobx';
import { observer } from 'mobx-react-lite';
import type { RawLambda } from '@finos/legend-graph';
import { QueryBuilder_EditorExtensionState } from '../../stores/QueryBuilder_EditorExtensionState';

export const ServiceQueryBuilder = observer(
  (props: {
    executionState: ServicePureExecutionState;
    isReadOnly: boolean;
  }) => {
    const { executionState } = props;
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
          await flowResult(
            queryBuilderExtension.setup(
              executionState.execution.func,
              mapping,
              runtime,
              async (lambda: RawLambda): Promise<void> =>
                flowResult(executionState.queryState.updateLamba(lambda))
                  .then(() =>
                    editorStore.applicationStore.notifySuccess(
                      `Service '${executionState.execution.owner.name}' execution query is updated`,
                    ),
                  )
                  .catch(applicationStore.alertIllegalUnhandledError),
              executionState.queryState.query.isStub,
            ),
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
      <div className="service-query-builder">
        <button
          className="btn--dark service-query-builder__btn"
          onClick={editWithQueryBuilder}
        >
          Edit Query
        </button>
      </div>
    );
  },
);
