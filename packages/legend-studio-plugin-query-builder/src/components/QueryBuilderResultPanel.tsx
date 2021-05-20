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

import { AgGridColumn, AgGridReact } from '@ag-grid-community/react';
import Dialog from '@material-ui/core/Dialog';
import {
  BlankPanelContent,
  PanelLoadingIndicator,
} from '@finos/legend-studio-components';
import { observer } from 'mobx-react-lite';
import { FaPlay, FaScroll } from 'react-icons/fa';
import { flowResult } from 'mobx';
import type { ExecutionResult } from '@finos/legend-studio';
import {
  EDITOR_LANGUAGE,
  TAB_SIZE,
  TdsExecutionResult,
  TextInputEditor,
  useApplicationStore,
  NewServiceModal,
} from '@finos/legend-studio';
import type { QueryBuilderState } from '../stores/QueryBuilderState';

const QueryBuilderResultValues = observer(
  (props: { executionResult: ExecutionResult }) => {
    const { executionResult } = props;
    const executionResultString = JSON.stringify(
      executionResult.values,
      null,
      TAB_SIZE,
    );
    const columns =
      executionResult instanceof TdsExecutionResult
        ? executionResult.result.columns
        : [];
    const rowData =
      executionResult instanceof TdsExecutionResult
        ? executionResult.result.rows.map((_row) => {
            const row: Record<PropertyKey, unknown> = {};
            const cols = executionResult.result.columns;
            _row.values.forEach((value, idx) => {
              row[cols[idx]] = value;
            });
            return row;
          })
        : [];

    return (
      <div className="query-builder__result__values">
        {!(executionResult instanceof TdsExecutionResult) && (
          <TextInputEditor
            language={EDITOR_LANGUAGE.JSON}
            inputValue={executionResultString}
            isReadOnly={true}
          />
        )}
        {executionResult instanceof TdsExecutionResult && (
          <div className="ag-theme-balham-dark query-builder__result__tds-grid">
            <AgGridReact rowData={rowData}>
              {columns.map((colName) => (
                <AgGridColumn
                  minWidth={50}
                  sortable={true}
                  resizable={true}
                  field={colName}
                  key={colName}
                  flex={1}
                />
              ))}
            </AgGridReact>
          </div>
        )}
      </div>
    );
  },
);

export const QueryBuilderResultPanel = observer(
  (props: { queryBuilderState: QueryBuilderState }) => {
    const { queryBuilderState } = props;
    const applicationStore = useApplicationStore();
    const resultState = queryBuilderState.resultState;
    const executionResult = resultState.executionResult;
    const execute = (): Promise<void> =>
      flowResult(resultState.execute()).catch(
        applicationStore.alertIllegalUnhandledError,
      );
    const executePlan = (): Promise<void> =>
      flowResult(resultState.generateExecutionPlan()).catch(
        applicationStore.alertIllegalUnhandledError,
      );
    const planText = resultState.executionPlan
      ? JSON.stringify(resultState.executionPlan, undefined, TAB_SIZE)
      : '';
    const changeLimit: React.ChangeEventHandler<HTMLInputElement> = (event) => {
      const val = event.target.value;
      queryBuilderState.resultState.setPreviewLimit(
        val === '' ? 0 : parseInt(val, 10),
      );
    };
    const isQuerySupported = queryBuilderState.isQuerySupported();

    return (
      <div className="panel query-builder__result">
        <PanelLoadingIndicator
          isLoading={
            resultState.isExecutingQuery || resultState.isGeneratingPlan
          }
        />
        <div className="panel__header">
          <div className="panel__header__title">
            <div className="panel__header__title__label">result</div>
          </div>
          <div className="panel__header__actions">
            {isQuerySupported && (
              <div className="query-builder__result__limit">
                <div className="query-builder__result__limit__label">
                  preview limit
                </div>
                <input
                  className="input--dark query-builder__result__limit__input"
                  spellCheck={false}
                  type="number"
                  value={queryBuilderState.resultState.previewLimit}
                  onChange={changeLimit}
                />
              </div>
            )}
            <button
              className="panel__header__action"
              onClick={execute}
              tabIndex={-1}
              title="Execute"
            >
              <FaPlay />
            </button>
            <button
              className="panel__header__action"
              onClick={executePlan}
              tabIndex={-1}
              title="View Exection Plan"
            >
              <FaScroll />
            </button>
          </div>
        </div>
        <div className="panel__content">
          {!executionResult && (
            <BlankPanelContent>
              Build or load valid query first
            </BlankPanelContent>
          )}
          {executionResult && (
            <QueryBuilderResultValues executionResult={executionResult} />
          )}
        </div>
        <Dialog
          open={Boolean(resultState.executionPlan)}
          onClose={(): void => resultState.setExecutionPlan(undefined)}
          classes={{
            root: 'editor-modal__root-container',
            container: 'editor-modal__container',
            paper: 'editor-modal__content',
          }}
        >
          <div className="modal modal--dark editor-modal">
            <div className="modal__header">
              <div className="modal__title">Execution Plan</div>
            </div>
            <div className="modal__body">
              <TextInputEditor
                inputValue={planText}
                isReadOnly={true}
                language={EDITOR_LANGUAGE.JSON}
                showMiniMap={true}
              />
            </div>
            <div className="modal__footer">
              <button
                className="btn execution-plan-viewer__close-btn"
                onClick={(): void => resultState.setExecutionPlan(undefined)}
              >
                Close
              </button>
            </div>
          </div>
        </Dialog>
        {queryBuilderState.querySetupState.mapping && (
          <NewServiceModal
            mapping={queryBuilderState.querySetupState.mapping}
            close={(): void => resultState.setShowServicePathModal(false)}
            showModal={resultState.showServicePathModal}
            promoteToService={(
              name: string,
              packageName: string,
            ): Promise<void> => resultState.promoteToService(name, packageName)}
          />
        )}
      </div>
    );
  },
);
