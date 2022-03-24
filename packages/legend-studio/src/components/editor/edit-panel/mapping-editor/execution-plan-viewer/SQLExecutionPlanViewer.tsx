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
import { EDITOR_LANGUAGE } from '@finos/legend-application';
import {
  type ExecutionPlanState,
  SQL_DISPLAY_TABS,
} from '../../../../../stores/ExecutionPlanState';
import { prettyCONSTName } from '@finos/legend-shared';
import { clsx } from '@finos/legend-art';
import { RelationalDatabaseConnectionEditor } from '../../connection-editor/RelationalDatabaseConnectionEditor';
import { format } from 'sql-formatter';
import { RelationalDatabaseConnectionValueState } from '../../../../../stores/editor-state/element-editor-state/connection/ConnectionEditorState';
import {
  type SQLResultColumn,
  type RelationalDataType,
  type DatabaseConnection,
  Real,
  Binary,
  Bit,
  Other,
  Date,
  Timestamp,
  Numeric,
  Decimal,
  VarBinary,
  Char,
  VarChar,
  Double,
  Float,
  Integer,
  TinyInt,
  SmallInt,
  BigInt,
  RelationalDatabaseConnection,
} from '@finos/legend-graph';
import { StudioTextInputEditor } from '../../../../shared/StudioTextInputEditor';

const generateDataTypeLabel = (
  type: RelationalDataType | undefined,
): string => {
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

const QueryViewer: React.FC<{
  query: string;
  language: EDITOR_LANGUAGE;
  wordWrap?: 'off' | 'on' | 'wordWrapColumn' | 'bounded';
}> = ({ query, language, wordWrap }) => (
  <div className="mapping-test-editor__query-panel__query">
    <StudioTextInputEditor
      inputValue={query}
      isReadOnly={true}
      language={language}
      showMiniMap={false}
      extraEditorOptions={{
        wordWrap: wordWrap ?? 'off',
      }}
    />
  </div>
);

const ResultColumnsDataViewer: React.FC<{
  label: string;
  dataType: string;
}> = ({ label, dataType }) => (
  <div className="property-basic-editor">
    <div className="property-basic-editor__type ">
      <input
        className="property-basic-editor__name input-label"
        disabled={true}
        value={label}
        spellCheck={false}
      />
    </div>
    <div className="property-basic-editor__type">
      <input
        className="property-basic-editor__name input-type"
        disabled={true}
        value={dataType}
        spellCheck={false}
      />
    </div>
  </div>
);

const ResultColumnsViewer: React.FC<{ resultColumns: SQLResultColumn[] }> = ({
  resultColumns,
}) => (
  <div>
    {resultColumns.map((resultColumn) => {
      const label = resultColumn.label.match(/(?:"[^"]*"|^[^"]*$)/);
      if (label !== null) {
        return (
          <ResultColumnsDataViewer
            key={resultColumn.label}
            label={label[0]?.replace(/"/g, '') ?? '(no label)'}
            dataType={generateDataTypeLabel(resultColumn.dataType)}
          />
        );
      }
      return (
        <ResultColumnsDataViewer
          key={resultColumn.label}
          label={resultColumn.label}
          dataType={generateDataTypeLabel(resultColumn.dataType)}
        />
      );
    })}
  </div>
);

export const SQLPlanViewer: React.FC<{
  query: string;
  resultColumns: SQLResultColumn[];
  connection: DatabaseConnection;
  executionPlanState: ExecutionPlanState;
}> = observer((props) => {
  const { query, resultColumns, connection, executionPlanState } = props;
  const tabs = [
    SQL_DISPLAY_TABS.SQL_QUERY,
    SQL_DISPLAY_TABS.RESULT_COLUMNS,
    SQL_DISPLAY_TABS.DATABASE_CONNECTION,
  ];
  const changeTab =
    (tab: SQL_DISPLAY_TABS): (() => void) =>
    (): void => {
      executionPlanState.setSqlSelectedTab(tab);
    };

  return (
    <div className="panel__content">
      <div className="panel__main-header edit-panel__header">
        <div className="edit-panel__header__tabs">
          {tabs.map((tab) => (
            <button
              key={tab}
              onClick={changeTab(tab)}
              className={clsx('edit-panel__header__tab', {
                'edit-panel__header__tab--active':
                  tab === executionPlanState.sqlSelectedTab,
              })}
            >
              {prettyCONSTName(tab)}
            </button>
          ))}
        </div>
      </div>
      {executionPlanState.sqlSelectedTab === SQL_DISPLAY_TABS.SQL_QUERY && (
        <QueryViewer
          query={format(query)}
          language={EDITOR_LANGUAGE.SQL}
          wordWrap="on"
        />
      )}
      {executionPlanState.sqlSelectedTab ===
        SQL_DISPLAY_TABS.RESULT_COLUMNS && (
        <div className="table-view">
          <ResultColumnsViewer resultColumns={resultColumns} />
        </div>
      )}
      {executionPlanState.sqlSelectedTab ===
        SQL_DISPLAY_TABS.DATABASE_CONNECTION &&
        connection instanceof RelationalDatabaseConnection && (
          <div>
            <RelationalDatabaseConnectionEditor
              connectionValueState={
                new RelationalDatabaseConnectionValueState(
                  executionPlanState.editorStore,
                  connection,
                )
              }
              isReadOnly={true}
            />
          </div>
        )}
    </div>
  );
});
