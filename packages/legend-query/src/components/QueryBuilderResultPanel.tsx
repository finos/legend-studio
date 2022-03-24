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
import {
  Dialog,
  BlankPanelContent,
  PanelLoadingIndicator,
  PlayIcon,
  PaperScrollIcon,
  DropdownMenu,
  MenuContent,
  MenuContentItem,
  CaretDownIcon,
} from '@finos/legend-art';
import { observer } from 'mobx-react-lite';
import { flowResult } from 'mobx';
import type { QueryBuilderState } from '../stores/QueryBuilderState';
import {
  type ExecutionResult,
  extractExecutionResultValues,
  TdsExecutionResult,
  RawExecutionResult,
  EXECUTION_SERIALIZATION_FORMAT,
} from '@finos/legend-graph';
import {
  ActionAlertActionType,
  ActionAlertType,
  EDITOR_LANGUAGE,
  TAB_SIZE,
  TextInputEditor,
  useApplicationStore,
} from '@finos/legend-application';
import { PARAMETER_SUBMIT_ACTION } from '../stores/QueryParametersState';

const QueryBuilderResultValues = observer(
  (props: { executionResult: ExecutionResult }) => {
    const { executionResult } = props;
    if (executionResult instanceof TdsExecutionResult) {
      const columns = executionResult.result.columns;
      const rowData = executionResult.result.rows.map((_row) => {
        const row: Record<PropertyKey, unknown> = {};
        const cols = executionResult.result.columns;
        _row.values.forEach((value, idx) => {
          row[cols[idx] as string] = value;
        });
        return row;
      });
      return (
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
      );
    } else if (executionResult instanceof RawExecutionResult) {
      return (
        <TextInputEditor
          language={EDITOR_LANGUAGE.TEXT}
          inputValue={executionResult.value}
          isReadOnly={true}
        />
      );
    } else {
      const executionResultString = JSON.stringify(
        extractExecutionResultValues(executionResult),
        null,
        TAB_SIZE,
      );
      return (
        <TextInputEditor
          language={EDITOR_LANGUAGE.JSON}
          inputValue={executionResultString}
          isReadOnly={true}
        />
      );
    }
  },
);

export const QueryBuilderResultPanel = observer(
  (props: { queryBuilderState: QueryBuilderState }) => {
    const { queryBuilderState } = props;
    const applicationStore = useApplicationStore();
    const resultState = queryBuilderState.resultState;
    const queryParametersState = queryBuilderState.queryParametersState;
    const executionResult = resultState.executionResult;
    const USER_ATTESTATION_MESSAGE =
      'I attest that I am aware of the sensitive data leakage risk when exporting queried data. The data I export will only be used by me.';
    const execute = (): void => {
      if (queryParametersState.parameters.length) {
        queryParametersState.parameterValuesEditorState.open(
          (): Promise<void> =>
            flowResult(resultState.execute()).catch(
              applicationStore.alertUnhandledError,
            ),
          PARAMETER_SUBMIT_ACTION.EXECUTE,
        );
      } else {
        flowResult(resultState.execute()).catch(
          applicationStore.alertUnhandledError,
        );
      }
    };
    const exportQueryResults = async (
      format: EXECUTION_SERIALIZATION_FORMAT,
    ): Promise<void> => {
      if (queryBuilderState.queryParametersState.parameters.length) {
        queryParametersState.parameterValuesEditorState.open(
          (): Promise<void> =>
            flowResult(resultState.exportData(format)).catch(
              applicationStore.alertUnhandledError,
            ),
          PARAMETER_SUBMIT_ACTION.EXPORT,
        );
      } else {
        await flowResult(resultState.exportData(format)).catch(
          applicationStore.alertUnhandledError,
        );
      }
    };

    const confirmExport = (format: EXECUTION_SERIALIZATION_FORMAT): void => {
      applicationStore.setActionAltertInfo({
        message: USER_ATTESTATION_MESSAGE,
        type: ActionAlertType.CAUTION,
        actions: [
          {
            label: 'Accept',
            type: ActionAlertActionType.PROCEED_WITH_CAUTION,
            handler: applicationStore.guardUnhandledError(() =>
              exportQueryResults(format),
            ),
          },
          {
            label: 'Decline',
            type: ActionAlertActionType.PROCEED,
            default: true,
          },
        ],
      });
    };
    const executePlan = applicationStore.guardUnhandledError(() =>
      flowResult(resultState.generateExecutionPlan()),
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
            resultState.isExecutingQuery ||
            resultState.isGeneratingPlan ||
            resultState.exportDataState.isInProgress
          }
        />
        <div className="panel__header">
          <div className="panel__header__title">
            <div className="panel__header__title__label">result</div>
          </div>
          <div className="panel__header__actions query-builder__result__header__actions">
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
              className="panel__header__action query-builder__result__execute-btn"
              onClick={execute}
              tabIndex={-1}
              title="Execute"
            >
              <div className="query-builder__result__execute-btn__icon">
                <PlayIcon />
              </div>
              <div className="query-builder__result__execute-btn__label">
                Execute
              </div>
            </button>
            <DropdownMenu
              className="query-builder__result__export__dropdown"
              content={
                <MenuContent>
                  {Object.values(EXECUTION_SERIALIZATION_FORMAT).map(
                    (format) => (
                      <MenuContentItem
                        key={format}
                        className="query-builder__result__export__dropdown__menu__item"
                        onClick={(): void => confirmExport(format)}
                      >
                        {format}
                      </MenuContentItem>
                    ),
                  )}
                </MenuContent>
              }
              menuProps={{
                anchorOrigin: { vertical: 'bottom', horizontal: 'right' },
                transformOrigin: { vertical: 'top', horizontal: 'right' },
                elevation: 7,
              }}
            >
              <button
                className="query-builder__result__export__dropdown__label"
                tabIndex={-1}
                title="Export"
              >
                Export
              </button>
              <div className="query-builder__result__export__dropdown__trigger">
                <CaretDownIcon />
              </div>
            </DropdownMenu>
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
            <div className="query-builder__result__values">
              <QueryBuilderResultValues executionResult={executionResult} />
            </div>
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
