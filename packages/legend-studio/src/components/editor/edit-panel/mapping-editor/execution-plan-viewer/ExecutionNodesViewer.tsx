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
import { SqlPlanViewer } from './SqlPlanViewer';
import type { ExecutionPlanState } from '../../../../../stores/ExecutionPlanState';
import { EXECUTION_PLAN_VIEW_MODE } from '../../../../../stores/ExecutionPlanState';
import {
  ExecutionNodeTreeNodeData,
  ExecutionPlanViewTreeNodeData,
} from './ExecutionPlanViewer';
import type { ResultType, DataType } from '@finos/legend-graph';
import {
  SQLExecutionNode,
  ExecutionPlan,
  RelationalTDSInstantiationExecutionNode,
  TDSResultType,
  VarChar,
  Char,
  VarBinary,
  Binary,
  Bit,
  Numeric,
  Decimal,
  Double,
  Float,
  Real,
  Integer,
  SmallInt,
  TinyInt,
  Timestamp,
  Other,
} from '@finos/legend-graph';
import {
  BlankPanelContent,
  DropdownMenu,
  MenuContent,
  MenuContentItem,
} from '@finos/legend-art';
import { prettyCONSTName } from '@finos/legend-shared';
import { TextInputEditor, EDITOR_LANGUAGE } from '@finos/legend-application';

const generateDataTypeLabel = (type: unknown | undefined): string => {
  if (type === undefined) {
    return `UNDEFINED`;
  } else if (type instanceof VarChar) {
    return `VARCHAR`;
  } else if (type instanceof Char) {
    return `CHAR`;
  } else if (type instanceof VarBinary) {
    return `VARBINARY`;
  } else if (type instanceof Binary) {
    return `BINARY`;
  } else if (type instanceof Bit) {
    return `BIT`;
  } else if (type instanceof Numeric) {
    return `NUMERIC`;
  } else if (type instanceof Decimal) {
    return `DECIMAL`;
  } else if (type instanceof Double) {
    return `DOUBLE`;
  } else if (type instanceof Float) {
    return `FLOAT`;
  } else if (type instanceof Real) {
    return `REAL`;
  } else if (type instanceof Integer) {
    return `INT`;
  } else if (type instanceof BigInt) {
    return `BIGINT`;
  } else if (type instanceof SmallInt) {
    return `SMALLINT`;
  } else if (type instanceof TinyInt) {
    return `TINYINT`;
  } else if (type instanceof Date) {
    return `DATE`;
  } else if (type instanceof Timestamp) {
    return `TIMESTAMP`;
  } else if (type instanceof Other) {
    return `OTHER`;
  } else {
    return `UNDEFINED`;
  }
};
interface resultTypeProps {
  resultType: ResultType;
}
interface TDSresultTypeProps {
  colName: string;
  colType: DataType | undefined;
  colSourceDatatype: unknown;
}

const TDSResultTypeViewer: React.FC<TDSresultTypeProps> = (props: {
  colName: string;
  colType: DataType | undefined;
  colSourceDatatype: unknown;
}) => {
  const { colName, colType, colSourceDatatype } = props;

  return (
    <div className="property-basic-editor">
      <div className="property-basic-editor__type">
        <button
          className="property-basic-editor__name input-type"
          title={`Column Name`}
        >
          {colName}
        </button>
      </div>
      {!(colType === undefined) && (
        <div className="property-basic-editor__type">
          <button className="property-basic-editor__name" title={`Column Type`}>
            {colType.name}
          </button>
        </div>
      )}
      {!(colSourceDatatype === undefined) &&
        colSourceDatatype instanceof VarChar && (
          <div className="property-basic-editor__type">
            <button
              className="property-basic-editor__name input-label"
              title={`Relational type`}
            >
              {`VarChar(${colSourceDatatype.size})`}
            </button>
          </div>
        )}
      {!(colSourceDatatype === undefined) &&
        !(colSourceDatatype instanceof VarChar) && (
          <div className="property-basic-editor__type">
            <button
              className="property-basic-editor__name input-label"
              title={`Relational type`}
            >
              {`${generateDataTypeLabel(colSourceDatatype)}`}
            </button>
          </div>
        )}
    </div>
  );
};

//Only TDS result type is supported
const ResultTypeViewer: React.FC<resultTypeProps> = (props: {
  resultType: ResultType;
}) => {
  const { resultType } = props;
  return (
    <div className="panel">
      {resultType instanceof TDSResultType && (
        <div className="panel__content">
          <div className=" panel-header edit-panel__header">
            <div className="edit-panel__header__tabs">
              <button className="edit-panel__header__tab  edit-panel__header__tab--active">
                {`TDSResultType`}
              </button>
            </div>
          </div>
          <div className="table-view">
            {resultType.tdsColumns.map((tdscol, i) => (
              <TDSResultTypeViewer
                key={tdscol.name}
                colName={tdscol.name}
                colType={tdscol.type?.value}
                colSourceDatatype={tdscol.sourceDataType}
              />
            ))}
          </div>
        </div>
      )}
    </div>
  );
};
//Json viewer
const JSONViewer: React.FC<{ query: string }> = (props: { query: string }) => {
  const { query } = props;
  return (
    <div className="panel__content">
      <TextInputEditor
        inputValue={query}
        isReadOnly={true}
        language={EDITOR_LANGUAGE.JSON}
        showMiniMap={false}
      />
    </div>
  );
};
interface executionPlanStateProps {
  displayData: string;
  executionPlanState: ExecutionPlanState;
}

//Currently only support SQLExecution Node and RelationalTDSInstatiation Node
export const ExecutionNodesViewer: React.FC<executionPlanStateProps> = observer(
  (props: { displayData: string; executionPlanState: ExecutionPlanState }) => {
    const { displayData, executionPlanState } = props;
    let currentElement;
    if (!(executionPlanState.selectedNode === undefined)) {
      if (
        executionPlanState.selectedNode instanceof ExecutionPlanViewTreeNodeData
      ) {
        currentElement = executionPlanState.selectedNode.executionPlan;
      } else if (
        executionPlanState.selectedNode instanceof ExecutionNodeTreeNodeData
      ) {
        currentElement = executionPlanState.selectedNode.executionNode;
      }
    }
    const nativeViewModes = Object.values(EXECUTION_PLAN_VIEW_MODE);
    return (
      <div className="execution-plan-viewer">
        {!(executionPlanState.selectedNode === undefined) && (
          <div className="panel__header edit-panel__header">
            <div className="edit-panel__header__tabs">
              <button className="edit-panel__header__tab edit-panel__header__tab--active">
                {prettyCONSTName(executionPlanState.selectedNode.label)}
              </button>
            </div>

            <DropdownMenu
              className="edit-panel__element-view"
              content={
                <MenuContent className="edit-panel__element-view__options edit-panel__element-view__options--with-group">
                  <div className="edit-panel__element-view__option__group edit-panel__element-view__option__group--native">
                    <div className="edit-panel__element-view__option__group__name">
                      native
                    </div>
                    <div className="edit-panel__element-view__option__group__options">
                      {nativeViewModes.map((mode) => (
                        <MenuContentItem
                          key={mode}
                          className="edit-panel__element-view__option"
                          onClick={(): void =>
                            executionPlanState.setViewMode(mode)
                          }
                        >
                          {mode}
                        </MenuContentItem>
                      ))}
                    </div>
                  </div>
                </MenuContent>
              }
              menuProps={{
                anchorOrigin: { vertical: 'bottom', horizontal: 'right' },
                transformOrigin: { vertical: 'top', horizontal: 'right' },
              }}
            >
              <button
                className="edit-panel__element-view__type"
                title="View as..."
              >
                <div className="edit-panel__element-view__type__label">
                  {executionPlanState.viewMode}
                </div>
              </button>
            </DropdownMenu>
          </div>
        )}

        {currentElement instanceof SQLExecutionNode &&
          executionPlanState.viewMode === EXECUTION_PLAN_VIEW_MODE.FORM && (
            <SqlPlanViewer
              query={currentElement.sqlQuery}
              resultCoulumns={currentElement.resultColumns}
              connection={currentElement.connection}
              executionPlanState={executionPlanState}
            />
          )}
        {currentElement instanceof SQLExecutionNode &&
          executionPlanState.viewMode === EXECUTION_PLAN_VIEW_MODE.JSON && (
            <JSONViewer query={displayData} />
          )}
        {currentElement instanceof RelationalTDSInstantiationExecutionNode &&
          executionPlanState.viewMode === EXECUTION_PLAN_VIEW_MODE.FORM && (
            <ResultTypeViewer resultType={currentElement.resultType} />
          )}
        {currentElement instanceof RelationalTDSInstantiationExecutionNode &&
          executionPlanState.viewMode === EXECUTION_PLAN_VIEW_MODE.JSON && (
            <JSONViewer query={displayData} />
          )}
        {currentElement instanceof ExecutionPlan &&
          executionPlanState.viewMode === EXECUTION_PLAN_VIEW_MODE.JSON && (
            <JSONViewer query={displayData} />
          )}
        {currentElement instanceof ExecutionPlan &&
          executionPlanState.viewMode === EXECUTION_PLAN_VIEW_MODE.FORM && (
            <BlankPanelContent>
              <div className="unsupported-element-editor__main">
                <div className="unsupported-element-editor__summary">
                  {`Can't display this element in form-mode`}
                </div>

                <button
                  className="btn--dark unsupported-element-editor__to-text-mode__btn"
                  onClick={(): void =>
                    executionPlanState.setViewMode(
                      EXECUTION_PLAN_VIEW_MODE.JSON,
                    )
                  }
                >
                  View In JSON mode
                </button>
              </div>
            </BlankPanelContent>
          )}
      </div>
    );
  },
);
