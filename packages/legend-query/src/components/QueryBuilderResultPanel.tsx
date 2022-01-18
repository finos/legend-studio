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
import { Dialog } from '@mui/material';
import {
  BlankPanelContent,
  PanelLoadingIndicator,
  PlayIcon,
  PaperScrollIcon,
} from '@finos/legend-art';
import { observer } from 'mobx-react-lite';
import { flowResult } from 'mobx';
import type { QueryBuilderState } from '../stores/QueryBuilderState';
import {
  type ExecutionResult,
  extractExecutionResultValues,
  TdsExecutionResult,
} from '@finos/legend-graph';
import {
  EDITOR_LANGUAGE,
  TAB_SIZE,
  TextInputEditor,
  useApplicationStore,
} from '@finos/legend-application';

const QueryBuilderResultValues = observer(
  (props: { executionResult: ExecutionResult }) => {
    const { executionResult } = props;
    const executionResultString = JSON.stringify(
      extractExecutionResultValues(executionResult),
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
              row[cols[idx] as string] = value;
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
          <div
            // NOTE: since we use the column name as the key the column
            // if we execute once then immediate add another column and execute again
            // the old columns rendering will be kept the same and the new column
            // will be pushed to last regardless of its type (aggregation or simple projection)
            key={executionResult.uuid}
            className="ag-theme-balham-dark query-builder__result__tds-grid"
          >
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
    const execute = (): void => {
      if (queryBuilderState.queryParametersState.parameters.length) {
        queryBuilderState.queryParametersState.setValuesEditorIsOpen(true);
      } else {
        flowResult(resultState.execute()).catch(
          applicationStore.alertIllegalUnhandledError,
        );
      }
    };
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
    const allowSettingPreviewLimit = queryBuilderState.isQuerySupported();

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
            {allowSettingPreviewLimit && (
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
              <PlayIcon />
            </button>
            <button
              className="panel__header__action"
              onClick={executePlan}
              tabIndex={-1}
              title="View Exection Plan"
            >
              <PaperScrollIcon />
            </button>
          </div>
        </div>
        <div className="panel__content">
          {!executionResult && (
            <BlankPanelContent>
              Build or load a valid query first
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
          TransitionProps={{
            appear: false, // disable transition
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
                className="btn modal__footer__close-btn"
                onClick={(): void => resultState.setExecutionPlan(undefined)}
              >
                Close
              </button>
            </div>
          </div>
        </Dialog>
      </div>
    );
  },
);
