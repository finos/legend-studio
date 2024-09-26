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

import { observer } from 'mobx-react-lite';
import {
  type ExecutionPlanState,
  EXECUTION_PLAN_VIEW_MODE,
} from '../../stores/execution-plan/ExecutionPlanState.js';
import {
  type SQLResultColumn,
  stringifyDataType,
  type ResultType,
} from '@finos/legend-graph';
import {
  PanelListItem,
  CopyIcon,
  PanelDivider,
  Button,
  PanelContent,
} from '@finos/legend-art';
import { ResultTypeViewer } from './ResultTypeViewer.js';
import { CODE_EDITOR_LANGUAGE } from '@finos/legend-code-editor';
import { CodeEditor } from '@finos/legend-lego/code-editor';
import { tryToFormatSql } from '../result/tds/QueryBuilderTDSResultShared.js';

/**
 * TODO: Create a new `AbstractPlugin` for this, called `ExecutionPlanViewerPlugin`
 * when we modularize relational and execution plan processing, etc.
 *
 * @modularize
 * See https://github.com/finos/legend-studio/issues/65
 */

export const SQLExecutionNodeViewerHelper: React.FC<{
  query: string;
  resultColumns: SQLResultColumn[];
  resultType: ResultType;
  executionPlanState: ExecutionPlanState;
}> = observer((props) => {
  const { query, resultColumns, executionPlanState } = props;
  const applicationStore = executionPlanState.applicationStore;
  const copyExpression = (value: string): void => {
    applicationStore.clipboardService
      .copyTextToClipboard(value)
      .then(() =>
        applicationStore.notificationService.notifySuccess(
          'SQL Query copied',
          undefined,
          2500,
        ),
      )
      .catch(applicationStore.alertUnhandledError);
  };
  return (
    <>
      <div className="query-builder__sql__container">
        <PanelDivider />
        <div key={query}>
          <div className="query-builder__sql__container__item__label">
            <PanelListItem>
              SQL
              <div>
                <button
                  onClick={() => {
                    copyExpression(query);
                  }}
                  title="Copy SQL Expression"
                  className="query-builder__sql__container__icon"
                >
                  <CopyIcon />
                </button>
              </div>
            </PanelListItem>
          </div>
          <div className="query-builder__sql__container__code-editor">
            {/* Replace special characters to fix SQL-formatter bug*/}
            <CodeEditor
              inputValue={tryToFormatSql(
                query
                  .replaceAll('$', 'changeDollar')
                  .replaceAll('?', 'changeQuestion')
                  .replaceAll('{', 'changeOpenCurlyBracket')
                  .replaceAll('}', 'changeCloseCurlyBracket')
                  .replaceAll("'", 'changeSingleQuote'),
              )
                .replaceAll('changeDollar', '$')
                .replaceAll('changeQuestion', '?')
                .replaceAll('changeOpenCurlyBracket', '{')
                .replaceAll('changeCloseCurlyBracket', '}')
                .replaceAll('changeSingleQuote', "'")}
              language={CODE_EDITOR_LANGUAGE.SQL}
            />
          </div>
          <PanelDivider />
        </div>
      </div>
      {resultColumns.length > 0 && (
        <div className="query-builder__sql__container">
          <div>
            <PanelListItem className="query-builder__sql__container__item__label">
              Result Columns
            </PanelListItem>
            <PanelDivider />
            <table className="query-builder__sql__container__table table">
              <thead>
                <tr>
                  <th className="table__cell--left">Label</th>
                  <th className="table__cell--left">Data Type</th>
                </tr>
              </thead>
              <tbody>
                {resultColumns.map((column) => (
                  <tr key={column.label}>
                    <td className="table__cell--left">
                      {column.label.replaceAll(`"`, '')}
                    </td>

                    {column.dataType && (
                      <td className="table__cell--left">
                        {stringifyDataType(column.dataType)}
                      </td>
                    )}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </>
  );
});

export const SQLExecutionNodeViewer: React.FC<{
  query: string;
  resultColumns: SQLResultColumn[];
  resultType: ResultType;
  executionPlanState: ExecutionPlanState;
  viewJson?: boolean | undefined;
}> = observer((props) => {
  const { query, resultColumns, resultType, executionPlanState, viewJson } =
    props;
  const applicationStore = executionPlanState.applicationStore;

  if (viewJson === false) {
    return (
      <SQLExecutionNodeViewerHelper
        query={query}
        resultColumns={resultColumns}
        resultType={resultType}
        executionPlanState={executionPlanState}
      />
    );
  }
  return (
    <PanelContent
      darkMode={
        !applicationStore.layoutService.TEMPORARY__isLightColorThemeEnabled
      }
    >
      <SQLExecutionNodeViewerHelper
        query={query}
        resultColumns={resultColumns}
        resultType={resultType}
        executionPlanState={executionPlanState}
      />
      <ResultTypeViewer resultType={resultType} />
      <div className="query-builder__sql__container">
        <Button
          className="btn--dark execution-node-viewer__unsupported-view__to-text-mode__btn"
          onClick={(): void =>
            executionPlanState.setViewMode(EXECUTION_PLAN_VIEW_MODE.JSON)
          }
          text="View JSON"
        />
      </div>
      <PanelDivider />
    </PanelContent>
  );
});
