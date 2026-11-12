/**
 * Copyright (c) 2026-present, Goldman Sachs
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
  clsx,
  CubeIcon,
  CubesLoadingIndicator,
  CubesLoadingIndicatorIcon,
  EyeIcon,
} from '@finos/legend-art';
import { CODE_EDITOR_LANGUAGE } from '@finos/legend-code-editor';
import { describeDefinitionFlowRefusal } from '@finos/legend-extension-dsl-data-product';
import { CodeEditor } from '@finos/legend-lego/code-editor';
import {
  DataGrid,
  type DataGridCellRendererParams,
  type DataGridColumnDefinition,
} from '@finos/legend-lego/data-grid';
import type { IngestDataset } from '@finos/legend-graph';
import { flowResult } from 'mobx';
import { observer } from 'mobx-react-lite';
import { Component, Fragment, useEffect, type ReactNode } from 'react';
import type { IngestDefinitionEditorState } from '../../../../stores/editor/editor-state/element-editor-state/ingest/IngestDefinitionEditorState.js';
import {
  getMaterializedViewFunction,
  INGEST_DATA_SET_TAB,
  INGEST_DEFINITION_FLOW_FAILURE,
  INGEST_DEFINITION_VIEW,
  INGEST_MATERIALIZED_VIEW_TAB,
  type IngestDataSetColumnRow,
  type IngestDataSetColumns,
  type IngestDefinitionFlowEntry,
  type IngestDefinitionFlowState,
  type IngestMaterializedViewReading,
} from '../../../../stores/editor/editor-state/element-editor-state/ingest/IngestDefinitionFlowState.js';
import { getIngestWriteModeLabel } from '../../../../stores/editor/editor-state/element-editor-state/ingest/IngestDefinitionSpecificationHelper.js';
import {
  IngestDataSetChips,
  IngestDataSetMetadata,
  IngestDefinitionSection,
} from './IngestDefinitionDetails.js';

// An ingest definition's Overview, read-only: the definition's own section,
// then its materialized views and data sets, a list of the views down the
// left, then of its other data sets, and the picked one on the right, a
// view's flow or a data set's columns, each with its metadata on a tab of its
// own. Nothing here loads Cube: its flow comes with the entry the state loads
// (`IngestDefinitionFlowState.loadEntry()`).

/** "A", "A and B", "A, B and C" */
const listNames = (names: string[]): string =>
  names.length <= 1
    ? (names[0] ?? '')
    : `${names.slice(0, -1).join(', ')} and ${names[names.length - 1]}`;

/** A view's size, as the list shows it beside its name */
const describeReading = (
  reading: IngestMaterializedViewReading | undefined,
): string => {
  switch (reading?.kind) {
    case 'flow':
      return `${reading.steps.length} ${reading.steps.length === 1 ? 'step' : 'steps'}`;
    case 'refused':
      return 'No flow yet';
    case 'failed':
      return 'No flow';
    default:
      return '';
  }
};

/** Overview | Pure, at the top of the Definition tab */
export const IngestDefinitionViewSwitch = observer(
  (props: { flowState: IngestDefinitionFlowState }) => {
    const { flowState } = props;
    return (
      <div
        className="ingest-definition-editor__view-switch"
        role="group"
        aria-label="Show the definition as"
      >
        {Object.values(INGEST_DEFINITION_VIEW).map((view) => (
          <button
            key={view}
            type="button"
            className={clsx('ingest-definition-editor__view-switch__option', {
              'ingest-definition-editor__view-switch__option--active':
                flowState.view === view,
            })}
            aria-pressed={flowState.view === view}
            title={
              view === INGEST_DEFINITION_VIEW.OVERVIEW
                ? "The definition's settings, then its materialized views and data sets"
                : 'The whole definition as Pure'
            }
            onClick={() => flowState.setView(view)}
          >
            {view}
          </button>
        ))}
      </div>
    );
  },
);

/** "1 column", "9 columns" */
const describeColumnCount = (count: number): string =>
  `${count} ${count === 1 ? 'column' : 'columns'}`;

/**
 * Down the left: the materialized views, each with its number of steps, then
 * the definition's other data sets, each with its number of columns
 */
const IngestDefinitionList = observer(
  (props: { flowState: IngestDefinitionFlowState }) => {
    const { flowState } = props;
    const {
      materializedViews,
      selectedView,
      dataSets,
      shownDataSet,
      readings,
    } = flowState;
    const renderItem = (
      name: string,
      meta: string,
      isSelected: boolean,
      onSelect: () => void,
    ): ReactNode => (
      <button
        key={name}
        type="button"
        role="tab"
        aria-selected={isSelected}
        className={clsx('ingest-definition-flow__list__item', {
          'ingest-definition-flow__list__item--active': isSelected,
        })}
        title={name}
        onClick={onSelect}
      >
        <span className="ingest-definition-flow__list__item__name">{name}</span>
        <span className="ingest-definition-flow__list__item__meta">{meta}</span>
      </button>
    );
    return (
      <div
        className="ingest-definition-flow__list"
        role="tablist"
        aria-orientation="vertical"
        aria-label="Materialized views and data sets"
      >
        {materializedViews.length > 0 && (
          <div className="ingest-definition-flow__list__title">
            Materialized views
            <span className="ingest-definition-flow__list__count">
              {materializedViews.length}
            </span>
          </div>
        )}
        {materializedViews.map((view) =>
          renderItem(
            view.name,
            describeReading(readings?.get(view.name)),
            !shownDataSet && view === selectedView,
            () => flowState.selectView(view.name),
          ),
        )}
        {dataSets.length > 0 && (
          <div
            className={clsx('ingest-definition-flow__list__title', {
              'ingest-definition-flow__list__title--group':
                materializedViews.length > 0,
            })}
          >
            Data sets
            <span className="ingest-definition-flow__list__count">
              {dataSets.length}
            </span>
          </div>
        )}
        {dataSets.map((dataSet) =>
          renderItem(
            dataSet.name,
            describeColumnCount(
              flowState.dataSetColumns.get(dataSet.name)?.rows.length ?? 0,
            ),
            dataSet === shownDataSet,
            () => flowState.selectDataSet(dataSet.name),
          ),
        )}
      </div>
    );
  },
);

/** A name a view reads, or a view that reads a data set: one that picks something in the list, or plain text */
interface IngestDefinitionNameLink {
  readonly label: string;
  readonly title: string;
  readonly onPick?: (() => void) | undefined;
}

/** Names separated by commas, each one that picks something a link */
const NameLinks = (props: { links: IngestDefinitionNameLink[] }) => (
  <>
    {props.links.map((link, index) => (
      <Fragment key={link.label}>
        {index > 0 && ', '}
        {link.onPick ? (
          <button
            type="button"
            className="ingest-definition-flow__link"
            title={link.title}
            onClick={link.onPick}
          >
            {link.label}
          </button>
        ) : (
          <span title={link.title}>{link.label}</span>
        )}
      </Fragment>
    ))}
  </>
);

/**
 * The data sets the view's function reads: each of this definition a link
 * that picks it in the list, one of another definition after that
 * definition's name
 */
const getViewReadLinks = (
  flowState: IngestDefinitionFlowState,
  view: IngestDataset,
): IngestDefinitionNameLink[] => {
  const ingestPath = flowState.editorState.ingest.path;
  return (flowState.viewReads.get(view.name) ?? []).map(
    ({
      ingestDefinitionPath: ingestDefinition,
      datasetName: dataSet,
    }): IngestDefinitionNameLink => {
      if (ingestDefinition !== ingestPath) {
        return {
          label: `${ingestDefinition.split('::').pop() ?? ingestDefinition}.${dataSet}`,
          title: `Data set ${dataSet} of ingest definition ${ingestDefinition}`,
        };
      }
      if (flowState.dataSets.some((each) => each.name === dataSet)) {
        return {
          label: dataSet,
          title: `Show the data set ${dataSet}`,
          onPick: () => flowState.selectDataSet(dataSet),
        };
      }
      if (flowState.materializedViews.some((each) => each.name === dataSet)) {
        return {
          label: dataSet,
          title: `Show the materialized view ${dataSet}`,
          onPick: () => flowState.selectView(dataSet),
        };
      }
      return { label: dataSet, title: `Data set ${dataSet}` };
    },
  );
};

/** A panel's tabs: a data set's Schema | Metadata, a view's Flow | Metadata */
const PanelTabs = <T extends string>(props: {
  label: string;
  tabs: T[];
  selected: T;
  onSelect: (tab: T) => void;
}) => (
  <div
    className="ingest-definition-flow__tabs"
    role="tablist"
    aria-label={props.label}
  >
    {props.tabs.map((tab) => (
      <button
        key={tab}
        type="button"
        role="tab"
        aria-selected={tab === props.selected}
        className={clsx('ingest-definition-flow__tabs__tab', {
          'ingest-definition-flow__tabs__tab--active': tab === props.selected,
        })}
        onClick={() => props.onSelect(tab)}
      >
        {tab}
      </button>
    ))}
  </div>
);

/** A view's own Pure is short and read-only: its lines wrap, and it ends at its last line */
const VIEW_PURE_EDITOR_OPTIONS = {
  wordWrap: 'on',
  scrollBeyondLastLine: false,
} as const;

/**
 * The view's own function as Pure, as the engine writes it, with the
 * definition's other lambdas when its editor opens: shown when Cube can't
 * draw the view
 */
const MaterializedViewPure = observer(
  (props: { flowState: IngestDefinitionFlowState; view: IngestDataset }) => {
    const { flowState, view } = props;
    const { lambdaGrammars, lambdaGrammarsState } = flowState.editorState;
    const grammar = lambdaGrammars.get(getMaterializedViewFunction(view));
    if (grammar === undefined) {
      return lambdaGrammarsState.isInProgress ? (
        <div className="ingest-definition-flow__view__message">
          Getting its Pure…
        </div>
      ) : (
        <div className="ingest-definition-flow__view__message" role="alert">
          Couldn&apos;t get its Pure.
        </div>
      );
    }
    return (
      <div
        className="ingest-definition-flow__view__pure"
        aria-label={`${view.name} as Pure`}
      >
        <CodeEditor
          inputValue={grammar}
          isReadOnly={true}
          language={CODE_EDITOR_LANGUAGE.PURE}
          hideMinimap={true}
          hideActionBar={true}
          extraEditorOptions={VIEW_PURE_EDITOR_OPTIONS}
        />
      </div>
    );
  },
);

/**
 * Why the view's flow can't be shown, Cube's own words under Details, with
 * another try where one may help; its Pure below
 */
const MaterializedViewFallback = (props: {
  flowState: IngestDefinitionFlowState;
  view: IngestDataset;
  message: string;
  details: string;
  isFailure?: boolean | undefined;
  onRetry?: (() => void) | undefined;
}) => {
  const { flowState, view, message, details, isFailure, onRetry } = props;
  return (
    <>
      <div
        className={clsx('ingest-definition-flow__view__note', {
          'ingest-definition-flow__view__note--failure': isFailure,
        })}
        role={isFailure ? 'alert' : 'note'}
      >
        <span className="ingest-definition-flow__view__note__text">
          {message}
        </span>
        {onRetry && (
          <button
            type="button"
            className="ingest-definition-flow__view__note__action"
            onClick={onRetry}
          >
            Try again
          </button>
        )}
        <details className="ingest-definition-flow__view__note__details">
          <summary>Details</summary>
          {details}
        </details>
      </div>
      <MaterializedViewPure flowState={flowState} view={view} />
    </>
  );
};

/** Keeps a canvas that fails while drawing inside the view's panel */
class MaterializedViewFlowErrorBoundary extends Component<
  {
    children: ReactNode;
    onError: (error: Error) => void;
    fallback: (error: Error, reset: () => void) => ReactNode;
  },
  { error: Error | undefined }
> {
  override state: { error: Error | undefined } = { error: undefined };

  static getDerivedStateFromError(error: Error): { error: Error } {
    return { error };
  }

  override componentDidCatch(error: Error): void {
    this.props.onError(error);
  }

  reset = (): void => this.setState({ error: undefined });

  override render(): ReactNode {
    return this.state.error
      ? this.props.fallback(this.state.error, this.reset)
      : this.props.children;
  }
}

/** The view's flow, as Legend Cube draws it, read-only */
const MaterializedViewFlow = observer(
  (props: {
    flowState: IngestDefinitionFlowState;
    view: IngestDataset;
    entry: IngestDefinitionFlowEntry;
    reading: Extract<IngestMaterializedViewReading, { kind: 'flow' }>;
  }) => {
    const { flowState, view, entry, reading } = props;
    const { layoutService } =
      flowState.editorState.editorStore.applicationStore;
    const unknownDataSets = [
      ...new Set(reading.unknownDataSets.map((each) => each.dataSet)),
    ];
    return (
      <>
        {unknownDataSets.length > 0 && (
          <div className="ingest-definition-flow__view__note" role="note">
            {`The columns of ${listNames(unknownDataSets)} aren't known, so the steps after ${
              unknownDataSets.length === 1 ? 'it' : 'them'
            } aren't checked.`}
          </div>
        )}
        <MaterializedViewFlowErrorBoundary
          onError={(error) =>
            flowState.logFlowFailure(INGEST_DEFINITION_FLOW_FAILURE.DRAW, error)
          }
          fallback={(error, reset) => (
            <MaterializedViewFallback
              flowState={flowState}
              view={view}
              message="Couldn't draw this view's flow."
              details={error.message}
              isFailure={true}
              onRetry={reset}
            />
          )}
        >
          <div className="ingest-definition-flow__view__canvas">
            <entry.CubeDefinitionFlow
              flow={reading}
              colorMode={
                layoutService.TEMPORARY__isLightColorThemeEnabled
                  ? 'light'
                  : 'dark'
              }
            />
          </div>
        </MaterializedViewFlowErrorBoundary>
      </>
    );
  },
);

/** Below the view's head: its flow, or why there's none and its Pure */
const MaterializedViewBody = observer(
  (props: { flowState: IngestDefinitionFlowState; view: IngestDataset }) => {
    const { flowState, view } = props;
    const { entry, entryError } = flowState;
    const reading = flowState.readings?.get(view.name);
    useEffect(() => {
      if (reading?.kind === 'failed') {
        flowState.logFlowFailure(
          INGEST_DEFINITION_FLOW_FAILURE.READ,
          reading.error,
        );
      }
    }, [flowState, reading]);

    if (entryError) {
      return (
        <MaterializedViewFallback
          flowState={flowState}
          view={view}
          message="Couldn't load Legend Cube to draw this view."
          details={entryError.message}
          isFailure={true}
          onRetry={() => {
            flowState.resetEntry();
            flowResult(flowState.loadEntry()).catch(
              flowState.editorState.editorStore.applicationStore
                .alertUnhandledError,
            );
          }}
        />
      );
    }
    if (!entry || !reading) {
      return (
        <div className="ingest-definition-flow__view__loading">
          <CubesLoadingIndicator isLoading={true}>
            <CubesLoadingIndicatorIcon />
          </CubesLoadingIndicator>
          <span>Drawing the flow…</span>
        </div>
      );
    }
    switch (reading.kind) {
      case 'flow':
        return (
          <MaterializedViewFlow
            flowState={flowState}
            view={view}
            entry={entry}
            reading={reading}
          />
        );
      case 'refused':
        return (
          <MaterializedViewFallback
            flowState={flowState}
            view={view}
            message={`No flow for this view yet: ${describeDefinitionFlowRefusal(reading)}.`}
            details={reading.message}
          />
        );
      default:
        return (
          <MaterializedViewFallback
            flowState={flowState}
            view={view}
            message="Couldn't read this view's flow."
            details={reading.error.message}
            isFailure={true}
          />
        );
    }
  },
);

/** The picked view: its name, classification and actions, then its flow or its metadata */
const MaterializedViewPanel = observer(
  (props: {
    editorState: IngestDefinitionEditorState;
    view: IngestDataset;
  }) => {
    const { editorState, view } = props;
    const flowState = editorState.definitionFlowState;
    const { editorStore } = editorState;
    const matViewDataSet = flowState.getMatViewDataSet(view);
    const readLinks = getViewReadLinks(flowState, view);
    const viewLineage = (): void => {
      if (matViewDataSet) {
        flowResult(editorState.generateLineage(matViewDataSet)).catch(
          editorStore.applicationStore.alertUnhandledError,
        );
      }
    };
    return (
      <div
        className="ingest-definition-flow__view"
        role="tabpanel"
        aria-label={view.name}
      >
        <div className="ingest-definition-flow__view__head">
          <div className="ingest-definition-flow__view__head__row">
            <span className="ingest-definition-flow__view__name">
              {view.name}
            </span>
            <IngestDataSetChips dataset={view} />
            <div className="ingest-definition-flow__view__actions">
              <button
                type="button"
                className="ingest-definition-flow__view__action"
                disabled={editorState.isReadOnly}
                title="Edit this materialized view in Legend Cube"
                onClick={() =>
                  editorStore.embeddedCubeState.open(
                    editorState.ingest,
                    view.name,
                  )
                }
              >
                <CubeIcon />
                Edit in Cube
              </button>
              <button
                type="button"
                className="ingest-definition-flow__view__action"
                disabled={
                  !matViewDataSet ||
                  editorState.lineageGenerationState.isInProgress
                }
                title="Show the lineage of this materialized view"
                onClick={viewLineage}
              >
                <EyeIcon />
                Lineage
              </button>
            </div>
          </div>
        </div>
        <PanelTabs
          label={`${view.name} tabs`}
          tabs={Object.values(INGEST_MATERIALIZED_VIEW_TAB)}
          selected={flowState.viewTab}
          onSelect={(tab) => flowState.setViewTab(tab)}
        />
        {flowState.viewTab === INGEST_MATERIALIZED_VIEW_TAB.METADATA ? (
          <IngestDataSetMetadata
            flowState={flowState}
            dataset={view}
            lineage={{
              title: 'Reads',
              label: 'Data sets',
              value: readLinks.length ? (
                <NameLinks links={readLinks} />
              ) : (
                'No ingest data set'
              ),
            }}
          />
        ) : (
          <MaterializedViewBody flowState={flowState} view={view} />
        )}
      </div>
    );
  },
);

/** Past this many columns, a data set's table scrolls instead of growing */
const MAX_AUTO_HEIGHT_COLUMNS = 10;

/** A column's name, its description under it; one its write mode adds says which */
const DataSetColumnName = (
  props: DataGridCellRendererParams<IngestDataSetColumnRow>,
) => {
  const column = props.data;
  if (!column) {
    return null;
  }
  return (
    <span className="ingest-definition-flow__data-set__column-name">
      {column.name}
      {column.description && (
        <span className="ingest-definition-flow__data-set__description">
          {column.description}
        </span>
      )}
      {column.addedBy !== undefined && (
        <span
          className="ingest-definition-flow__data-set__added-by"
          title={`Its write mode, ${getIngestWriteModeLabel(column.addedBy)}, adds this column`}
        >
          {`added by ${getIngestWriteModeLabel(column.addedBy)}`}
        </span>
      )}
    </span>
  );
};

/** A column's type, its full path in a tooltip */
const DataSetColumnType = (
  props: DataGridCellRendererParams<IngestDataSetColumnRow>,
) =>
  props.data ? (
    <span title={props.data.typePath}>{props.data.type}</span>
  ) : null;

/** View SQL's schema headers, so a data set and a view's schema look alike, and whether a column is in the key */
const DATA_SET_COLUMN_DEFINITIONS: DataGridColumnDefinition<IngestDataSetColumnRow>[] =
  [
    {
      headerName: 'Column Name',
      field: 'name',
      // a column its write mode adds says which, beside its name, or under
      // it when it doesn't fit
      flex: 2,
      wrapText: true,
      autoHeight: true,
      cellRenderer: DataSetColumnName,
    },
    {
      headerName: 'Column Type',
      field: 'type',
      flex: 1,
      cellRenderer: DataSetColumnType,
    },
    { headerName: 'Multiplicity', field: 'multiplicity', flex: 1 },
    {
      headerName: 'Key',
      width: 80,
      valueGetter: (params) => (params.data?.isPrimaryKey ? 'Yes' : ''),
    },
  ];

const DATA_SET_ROW_CLASS_RULES = {
  // a column its write mode adds, not one it declares
  'ingest-definition-flow__data-set__added-column': (params: {
    data?: IngestDataSetColumnRow | undefined;
  }): boolean => params.data?.addedBy !== undefined,
};

/** A data set's columns, read-only: those it declares, then, muted, those its write mode adds */
const IngestDataSetColumnTable = observer(
  (props: {
    flowState: IngestDefinitionFlowState;
    dataSet: IngestDataset;
    columns: IngestDataSetColumns;
  }) => {
    const { flowState, dataSet, columns } = props;
    const { layoutService } =
      flowState.editorState.editorStore.applicationStore;
    const scrolls = columns.rows.length > MAX_AUTO_HEIGHT_COLUMNS;
    const darkMode = !layoutService.TEMPORARY__isLightColorThemeEnabled;
    return (
      <div
        className={clsx('ingest-definition-flow__data-set__grid', {
          'ingest-definition-flow__data-set__grid--scrolls': scrolls,
          'ag-theme-balham': !darkMode,
          'ag-theme-balham-dark': darkMode,
        })}
        aria-label={`Columns of ${dataSet.name}`}
      >
        <DataGrid
          rowData={[...columns.rows]}
          columnDefs={DATA_SET_COLUMN_DEFINITIONS}
          rowClassRules={DATA_SET_ROW_CLASS_RULES}
          domLayout={scrolls ? 'normal' : 'autoHeight'}
          suppressCellFocus={true}
        />
      </div>
    );
  },
);

/**
 * The picked data set: its name and classification, then its schema, its
 * columns, read-only, or its metadata, everything else it says
 */
const IngestDataSetPanel = observer(
  (props: { flowState: IngestDefinitionFlowState; dataSet: IngestDataset }) => {
    const { flowState, dataSet } = props;
    const readBy = flowState.getReadBy(dataSet.name);
    const columns = flowState.dataSetColumns.get(dataSet.name);
    const rows = columns?.rows ?? [];
    const declaredCount = columns?.declaredCount ?? 0;
    const added = rows.length - declaredCount;
    return (
      <div
        className="ingest-definition-flow__view"
        role="tabpanel"
        aria-label={dataSet.name}
      >
        <div className="ingest-definition-flow__view__head">
          <div className="ingest-definition-flow__view__head__row">
            <span className="ingest-definition-flow__view__name">
              {dataSet.name}
            </span>
            <IngestDataSetChips dataset={dataSet} />
            <span className="ingest-definition-flow__view__hint">
              Read-only here: edit data sets in text mode.
            </span>
          </div>
        </div>
        <PanelTabs
          label={`${dataSet.name} tabs`}
          tabs={Object.values(INGEST_DATA_SET_TAB)}
          selected={flowState.dataSetTab}
          onSelect={(tab) => flowState.setDataSetTab(tab)}
        />
        {flowState.dataSetTab === INGEST_DATA_SET_TAB.METADATA ? (
          <IngestDataSetMetadata
            flowState={flowState}
            dataset={dataSet}
            lineage={{
              title: 'Read by',
              label: 'Views',
              value: readBy.length ? (
                <NameLinks
                  links={readBy.map((view) => ({
                    label: view.name,
                    title: `Show the materialized view ${view.name}`,
                    onPick: () => flowState.selectView(view.name),
                  }))}
                />
              ) : (
                'No view'
              ),
            }}
          />
        ) : (
          <>
            {(columns?.notes ?? []).map((note) => (
              <div
                key={note}
                className="ingest-definition-flow__view__note"
                role="note"
              >
                {note}
              </div>
            ))}
            {columns && rows.length > 0 && (
              <>
                <IngestDataSetColumnTable
                  flowState={flowState}
                  dataSet={dataSet}
                  columns={columns}
                />
                <div className="ingest-definition-flow__view__message">
                  {added > 0 && columns.writeMode !== undefined
                    ? `${describeColumnCount(declaredCount)} as the definition declares them, then ${added} its write mode, ${getIngestWriteModeLabel(columns.writeMode)}, adds.`
                    : `${describeColumnCount(declaredCount)}, as the definition declares them.`}
                </div>
              </>
            )}
          </>
        )}
      </div>
    );
  },
);

/**
 * The Definition tab's Overview: the definition's own section, then its
 * materialized views and data sets, the list down the left and the picked
 * one on the right. Cube's code loads the first time a definition with views
 * shows.
 */
export const IngestDefinitionFlow = observer(
  (props: { editorState: IngestDefinitionEditorState }) => {
    const { editorState } = props;
    const flowState = editorState.definitionFlowState;
    const { selectedView, shownDataSet, specification, dataSets } = flowState;
    const { applicationStore } = editorState.editorStore;
    const hasViews = flowState.materializedViews.length > 0;
    useEffect(() => {
      if (hasViews) {
        flowResult(flowState.loadEntry()).catch(
          applicationStore.alertUnhandledError,
        );
      }
    }, [flowState, applicationStore, hasViews]);
    return (
      <div className="ingest-definition-overview">
        {specification && (
          <IngestDefinitionSection
            flowState={flowState}
            specification={specification}
          />
        )}
        <section
          className="ingest-definition-overview__data-sets"
          aria-label="Its materialized views and data sets"
        >
          <h2 className="ingest-definition-overview__title">
            Materialized views and data sets
          </h2>
          {hasViews || dataSets.length ? (
            <div className="ingest-definition-flow">
              <IngestDefinitionList flowState={flowState} />
              {shownDataSet ? (
                <IngestDataSetPanel
                  key={shownDataSet.name}
                  flowState={flowState}
                  dataSet={shownDataSet}
                />
              ) : (
                selectedView && (
                  <MaterializedViewPanel
                    key={selectedView.name}
                    editorState={editorState}
                    view={selectedView}
                  />
                )
              )}
            </div>
          ) : (
            <div className="ingest-definition-overview__empty">
              The definition has no data sets yet.
            </div>
          )}
        </section>
      </div>
    );
  },
);
