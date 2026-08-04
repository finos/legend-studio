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
import { useMemo, useState } from 'react';
import {
  clsx,
  Dialog,
  Modal,
  ModalBody,
  ModalFooter,
  ModalFooterButton,
  ModalHeader,
  ModalHeaderActions,
  ModalTitle,
  FilledWindowMaximizeIcon,
  CompressIcon,
  ResizablePanel,
  ResizablePanelGroup,
  ResizablePanelSplitter,
  ResizablePanelSplitterLine,
} from '@finos/legend-art';
import { CODE_EDITOR_LANGUAGE } from '@finos/legend-code-editor';
import { CodeEditor } from '@finos/legend-lego/code-editor';
import {
  DataGrid,
  type DataGridColumnDefinition,
} from '@finos/legend-lego/data-grid';
import {
  InstanceValue,
  type IngestionArtifactMatViewImplementation,
  type IngestionDefinitionArtifact,
  type Multiplicity,
  type RelationColumn,
} from '@finos/legend-graph';
import { isNonNullable } from '@finos/legend-shared';
import { tryToFormatSql } from '../result/tds/QueryBuilderTDSResultShared.js';

enum INGEST_ARTIFACT_VIEW_MODE {
  FORM = 'Form',
  JSON = 'JSON',
}

enum INGEST_ARTIFACT_SQL_TAB {
  VIEW_FUNCTION = 'View Function',
  BARRIER = 'Barrier',
  SELECT = 'Select',
}

const getColumnTypeLabel = (column: RelationColumn): string => {
  const typeName = column.genericType.value.rawType.name;
  const typeVariableValues = column.genericType.value.typeVariableValues;
  if (typeVariableValues && typeVariableValues.length > 0) {
    const args = typeVariableValues
      .map((v) => (v instanceof InstanceValue ? v.values[0] : undefined))
      .filter(isNonNullable);
    if (args.length > 0) {
      return `${typeName}(${args.join(', ')})`;
    }
  }
  return typeName;
};

const getMultiplicityLabel = (multiplicity: Multiplicity): string => {
  const { lowerBound, upperBound } = multiplicity;
  if (lowerBound === 1 && upperBound === 1) {
    return 'Required';
  } else if (lowerBound === 0 && upperBound === 1) {
    return 'Optional';
  } else if (lowerBound === 0 && upperBound === undefined) {
    return 'List';
  } else if (lowerBound === 1 && upperBound === undefined) {
    return 'Non-Empty List';
  }
  const upper = upperBound === undefined ? '*' : String(upperBound);
  return lowerBound === upperBound
    ? String(lowerBound)
    : `[${lowerBound}..${upper}]`;
};

const getMultiplicityRange = (multiplicity: Multiplicity): string => {
  const upper =
    multiplicity.upperBound === undefined
      ? '*'
      : String(multiplicity.upperBound);
  return `[${multiplicity.lowerBound}..${upper}]`;
};

const schemaColumnDefs: DataGridColumnDefinition<RelationColumn>[] = [
  {
    headerName: 'Column Name',
    field: 'name',
    flex: 1,
  },
  {
    headerName: 'Column Type',
    flex: 1,
    valueGetter: (params) =>
      params.data ? getColumnTypeLabel(params.data) : '',
  },
  {
    headerName: 'Multiplicity',
    flex: 1,
    valueGetter: (params) =>
      params.data ? getMultiplicityLabel(params.data.multiplicity) : '',
    tooltipValueGetter: (params) =>
      params.data ? getMultiplicityRange(params.data.multiplicity) : '',
  },
];

const MatViewSection = observer(
  (props: {
    matView: IngestionArtifactMatViewImplementation;
    darkMode: boolean;
  }) => {
    const { matView, darkMode } = props;
    const [selectedSqlTab, setSelectedSqlTab] =
      useState<INGEST_ARTIFACT_SQL_TAB>(INGEST_ARTIFACT_SQL_TAB.VIEW_FUNCTION);

    const sqlTabs: {
      label: INGEST_ARTIFACT_SQL_TAB;
      sql: string | undefined;
    }[] = useMemo(
      () => [
        {
          label: INGEST_ARTIFACT_SQL_TAB.VIEW_FUNCTION,
          sql: matView.viewFunctionQuery.sql,
        },
        {
          label: INGEST_ARTIFACT_SQL_TAB.BARRIER,
          sql: matView.barrierQuery?.sql,
        },
        {
          label: INGEST_ARTIFACT_SQL_TAB.SELECT,
          sql: matView.selectQuery?.sql,
        },
      ],
      [matView],
    );
    const currentSql = sqlTabs.find((t) => t.label === selectedSqlTab)?.sql;
    const formattedSql = useMemo(
      () => (currentSql ? tryToFormatSql(currentSql) : ''),
      [currentSql],
    );
    return (
      <div className="ingest-artifact-viewer__matview">
        <div className="ingest-artifact-viewer__matview__summary">
          <div className="ingest-artifact-viewer__matview__summary__name">
            {matView.datasetName}
          </div>
          <div className="ingest-artifact-viewer__matview__summary__meta">
            <span>Refresh: {matView.refreshType}</span>
            <span>Auto Trigger: {String(matView.autoTrigger)}</span>
            {matView.primaryKey.length > 0 && (
              <span>Primary Key: {matView.primaryKey.join(', ')}</span>
            )}
          </div>
        </div>

        {matView.dependentDatasets.length > 0 && (
          <div className="ingest-artifact-viewer__section">
            <div className="ingest-artifact-viewer__section__title">
              Dependent Datasets
            </div>
            <ul className="ingest-artifact-viewer__section__list">
              {matView.dependentDatasets.map((ds) => (
                <li key={`${ds.schema}.${ds.dataset}`}>
                  <code>{`${ds.schema}.${ds.dataset}`}</code>
                  {' — '}
                  <span>{ds.ingestDefinition.path}</span>
                </li>
              ))}
            </ul>
          </div>
        )}

        {matView.schema && matView.schema.columns.length > 0 && (
          <div className="ingest-artifact-viewer__section">
            <div className="ingest-artifact-viewer__section__title">Schema</div>
            <div
              className={clsx('ingest-artifact-viewer__matview__schema-grid', {
                'ag-theme-balham': !darkMode,
                'ag-theme-balham-dark': darkMode,
              })}
            >
              <DataGrid
                rowData={matView.schema.columns}
                columnDefs={schemaColumnDefs}
                domLayout="autoHeight"
              />
            </div>
          </div>
        )}

        <div className="ingest-artifact-viewer__matview__sql">
          <div className="ingest-artifact-viewer__tabs">
            {sqlTabs.map((tab) => (
              <button
                key={tab.label}
                className={clsx('ingest-artifact-viewer__tab', {
                  'ingest-artifact-viewer__tab--active':
                    selectedSqlTab === tab.label,
                  'ingest-artifact-viewer__tab--disabled': !tab.sql,
                })}
                disabled={!tab.sql}
                onClick={() => setSelectedSqlTab(tab.label)}
                tabIndex={-1}
              >
                {tab.label}
              </button>
            ))}
          </div>
          <div className="ingest-artifact-viewer__matview__sql__editor">
            <CodeEditor
              inputValue={formattedSql}
              isReadOnly={true}
              language={CODE_EDITOR_LANGUAGE.SQL}
            />
          </div>
        </div>
      </div>
    );
  },
);

const IngestionDefinitionArtifactContent = observer(
  (props: { artifact: IngestionDefinitionArtifact; darkMode: boolean }) => {
    const { artifact, darkMode } = props;
    const [viewMode, setViewMode] = useState<INGEST_ARTIFACT_VIEW_MODE>(
      INGEST_ARTIFACT_VIEW_MODE.FORM,
    );
    const [selectedMatViewIndex, setSelectedMatViewIndex] = useState(0);
    const matViews = artifact.matViewImplementations;
    const selectedMatView = matViews[selectedMatViewIndex];

    return (
      <div className="ingest-artifact-viewer__content">
        <div className="ingest-artifact-viewer__tabs">
          {Object.values(INGEST_ARTIFACT_VIEW_MODE).map((mode) => (
            <button
              key={mode}
              className={clsx('ingest-artifact-viewer__tab', {
                'ingest-artifact-viewer__tab--active': viewMode === mode,
              })}
              onClick={() => setViewMode(mode)}
              tabIndex={-1}
            >
              {mode}
            </button>
          ))}
        </div>

        {viewMode === INGEST_ARTIFACT_VIEW_MODE.FORM && (
          <div className="ingest-artifact-viewer__form">
            {matViews.length === 0 && (
              <div className="ingest-artifact-viewer__empty">
                No materialized view implementations found.
              </div>
            )}
            {matViews.length > 0 && (
              <div className="ingest-artifact-viewer__matviews">
                <ResizablePanelGroup orientation="vertical">
                  <ResizablePanel size={240} minSize={160}>
                    <div className="ingest-artifact-viewer__matview-explorer">
                      <div className="ingest-artifact-viewer__matview-explorer__title">
                        Materialized Views
                      </div>
                      <div className="ingest-artifact-viewer__matview-explorer__list">
                        {matViews.map((mv, idx) => (
                          <button
                            key={mv.datasetName}
                            className={clsx(
                              'ingest-artifact-viewer__matview-explorer__item',
                              {
                                'ingest-artifact-viewer__matview-explorer__item--active':
                                  selectedMatViewIndex === idx,
                              },
                            )}
                            onClick={() => setSelectedMatViewIndex(idx)}
                            tabIndex={-1}
                            title={mv.datasetName}
                          >
                            {mv.datasetName}
                          </button>
                        ))}
                      </div>
                    </div>
                  </ResizablePanel>
                  <ResizablePanelSplitter>
                    <ResizablePanelSplitterLine color="var(--color-border-default)" />
                  </ResizablePanelSplitter>
                  <ResizablePanel minSize={320}>
                    <div className="ingest-artifact-viewer__matview-detail">
                      {selectedMatView && (
                        <MatViewSection
                          matView={selectedMatView}
                          darkMode={darkMode}
                        />
                      )}
                    </div>
                  </ResizablePanel>
                </ResizablePanelGroup>
              </div>
            )}
          </div>
        )}

        {viewMode === INGEST_ARTIFACT_VIEW_MODE.JSON && (
          <div className="ingest-artifact-viewer__json">
            <CodeEditor
              inputValue={JSON.stringify(artifact.content, null, 2)}
              isReadOnly={true}
              language={CODE_EDITOR_LANGUAGE.JSON}
            />
          </div>
        )}
      </div>
    );
  },
);

export const IngestionDefinitionArtifactViewer = observer(
  (props: {
    artifact: IngestionDefinitionArtifact | undefined;
    onClose: () => void;
    darkMode?: boolean | undefined;
  }) => {
    const { artifact, onClose, darkMode = true } = props;
    const [isFullscreen, setIsFullscreen] = useState(false);

    if (!artifact) {
      return null;
    }

    return (
      <Dialog
        open={Boolean(artifact)}
        onClose={onClose}
        classes={{
          root: 'editor-modal__root-container',
          container: 'editor-modal__container',
          paper: 'editor-modal__content',
        }}
      >
        <Modal
          className={clsx('editor-modal ingest-artifact-viewer', {
            'ingest-artifact-viewer--fullscreen': isFullscreen,
          })}
          darkMode={darkMode}
        >
          <ModalHeader>
            <ModalTitle title="Generated Ingest Artifact" />
            <ModalHeaderActions>
              <button
                className="ingest-artifact-viewer__header-btn"
                onClick={() => setIsFullscreen(!isFullscreen)}
                tabIndex={-1}
                title={isFullscreen ? 'Exit full screen' : 'Full screen'}
              >
                {isFullscreen ? <CompressIcon /> : <FilledWindowMaximizeIcon />}
              </button>
            </ModalHeaderActions>
          </ModalHeader>
          <ModalBody className="ingest-artifact-viewer__body">
            <IngestionDefinitionArtifactContent
              artifact={artifact}
              darkMode={darkMode}
            />
          </ModalBody>
          <ModalFooter>
            <ModalFooterButton
              onClick={onClose}
              text="Close"
              type="secondary"
              darkMode={darkMode}
            />
          </ModalFooter>
        </Modal>
      </Dialog>
    );
  },
);
