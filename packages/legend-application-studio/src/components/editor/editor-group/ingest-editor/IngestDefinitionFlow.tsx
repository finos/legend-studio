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
import { flowResult } from 'mobx';
import { observer } from 'mobx-react-lite';
import { Component, useEffect, type ReactNode } from 'react';
import type { IngestMaterializedView } from '../../../../stores/graph-modifier/DSL_Ingest_GraphModifierHelper.js';
import type { IngestDefinitionEditorState } from '../../../../stores/editor/editor-state/element-editor-state/ingest/IngestDefinitionEditorState.js';
import {
  getMaterializedViewDataSets,
  INGEST_DEFINITION_FLOW_FAILURE,
  INGEST_DEFINITION_VIEW,
  type IngestDefinitionFlowEntry,
  type IngestDefinitionFlowState,
  type IngestMaterializedViewReading,
} from '../../../../stores/editor/editor-state/element-editor-state/ingest/IngestDefinitionFlowState.js';

// An ingest definition's materialized views, one at a time, each as Legend
// Cube draws it, read-only: a list of the views down the left, the picked
// view on the right. Nothing here loads Cube: its flow comes with the entry
// the state loads (`IngestDefinitionFlowState.loadEntry()`).

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

/** Flow | Pure, at the top of the Definition tab of a definition with materialized views */
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
              view === INGEST_DEFINITION_VIEW.FLOW
                ? 'Its materialized views, each as Legend Cube draws it'
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

/** The materialized views down the left, each with its number of steps */
const MaterializedViewList = observer(
  (props: { flowState: IngestDefinitionFlowState }) => {
    const { flowState } = props;
    const { materializedViews, selectedView, readings } = flowState;
    return (
      <div
        className="ingest-definition-flow__list"
        role="tablist"
        aria-orientation="vertical"
        aria-label="Materialized views"
      >
        <div className="ingest-definition-flow__list__title">
          Materialized views
          <span className="ingest-definition-flow__list__count">
            {materializedViews.length}
          </span>
        </div>
        {materializedViews.map((view) => {
          const isSelected = view === selectedView;
          return (
            <button
              key={view.name}
              type="button"
              role="tab"
              aria-selected={isSelected}
              className={clsx('ingest-definition-flow__list__item', {
                'ingest-definition-flow__list__item--active': isSelected,
              })}
              title={view.name}
              onClick={() => flowState.selectView(view.name)}
            >
              <span className="ingest-definition-flow__list__item__name">
                {view.name}
              </span>
              <span className="ingest-definition-flow__list__item__meta">
                {describeReading(readings?.get(view.name))}
              </span>
            </button>
          );
        })}
      </div>
    );
  },
);

/** The view's primary key, as chips */
const MaterializedViewKey = (props: { primaryKey: readonly string[] }) =>
  props.primaryKey.length ? (
    <span className="ingest-definition-flow__view__chips" title="Primary key">
      <span className="ingest-definition-flow__view__chips__label">Key</span>
      {props.primaryKey.map((column) => (
        <span key={column} className="ingest-definition-flow__view__chip">
          {column}
        </span>
      ))}
    </span>
  ) : (
    <span className="ingest-definition-flow__view__chips ingest-definition-flow__view__chips--empty">
      No key
    </span>
  );

/** The data sets the view reads, by name; one of another ingest definition after that definition's name */
const MaterializedViewReads = (props: {
  ingestPath: string;
  reading: IngestMaterializedViewReading;
}) => {
  const { ingestPath, reading } = props;
  const names = getMaterializedViewDataSets(reading).map(
    ({ ingestDefinition, dataSet }) =>
      ingestDefinition === ingestPath
        ? dataSet
        : `${ingestDefinition.slice(ingestDefinition.lastIndexOf(':') + 1)}.${dataSet}`,
  );
  return names.length ? (
    <span
      className="ingest-definition-flow__view__reads"
      title="The data sets this view reads"
    >
      {`Reads ${names.join(', ')}`}
    </span>
  ) : null;
};

/** A view's own Pure is short and read-only: its lines wrap, and it ends at its last line */
const VIEW_PURE_EDITOR_OPTIONS = {
  wordWrap: 'on',
  scrollBeyondLastLine: false,
} as const;

/** The view's own function as Pure, as the engine writes it: shown when Cube can't draw the view */
const MaterializedViewPure = observer(
  (props: {
    flowState: IngestDefinitionFlowState;
    view: IngestMaterializedView;
  }) => {
    const { flowState, view } = props;
    const { applicationStore } = flowState.editorState.editorStore;
    useEffect(() => {
      flowResult(flowState.fetchViewGrammar(view)).catch(
        applicationStore.alertUnhandledError,
      );
    }, [flowState, view, applicationStore]);
    const grammar = flowState.viewGrammars.get(view.lambda);
    if (grammar === undefined) {
      return (
        <div className="ingest-definition-flow__view__message">
          Getting its Pure…
        </div>
      );
    }
    if ('error' in grammar) {
      return (
        <div className="ingest-definition-flow__view__message" role="alert">
          {`Couldn't get its Pure: ${grammar.error.message}`}
        </div>
      );
    }
    return (
      <div
        className="ingest-definition-flow__view__pure"
        aria-label={`${view.name} as Pure`}
      >
        <CodeEditor
          inputValue={grammar.text}
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
  view: IngestMaterializedView;
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
    view: IngestMaterializedView;
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
  (props: {
    flowState: IngestDefinitionFlowState;
    view: IngestMaterializedView;
  }) => {
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

/** The picked view: its name, key, classification and what it reads, its actions, and its flow */
const MaterializedViewPanel = observer(
  (props: {
    editorState: IngestDefinitionEditorState;
    view: IngestMaterializedView;
  }) => {
    const { editorState, view } = props;
    const flowState = editorState.definitionFlowState;
    const { editorStore } = editorState;
    const reading = flowState.readings?.get(view.name);
    const matViewDataSet = flowState.getMatViewDataSet(view);
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
            <MaterializedViewKey primaryKey={view.primaryKey} />
            {view.sensitivity !== undefined && (
              <span
                className="ingest-definition-flow__view__chip ingest-definition-flow__view__chip--classification"
                title="Classification of its data"
              >
                {view.sensitivity}
              </span>
            )}
          </div>
          <div className="ingest-definition-flow__view__head__row">
            {reading && (
              <MaterializedViewReads
                ingestPath={editorState.ingest.path}
                reading={reading}
              />
            )}
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
        <MaterializedViewBody flowState={flowState} view={view} />
      </div>
    );
  },
);

/**
 * The Definition tab's Flow: the materialized views down the left, the
 * picked one's flow on the right. Cube's code loads the first time it shows.
 */
export const IngestDefinitionFlow = observer(
  (props: { editorState: IngestDefinitionEditorState }) => {
    const { editorState } = props;
    const flowState = editorState.definitionFlowState;
    const { selectedView } = flowState;
    const { applicationStore } = editorState.editorStore;
    useEffect(() => {
      flowResult(flowState.loadEntry()).catch(
        applicationStore.alertUnhandledError,
      );
    }, [flowState, applicationStore]);
    return (
      <div className="ingest-definition-flow">
        <MaterializedViewList flowState={flowState} />
        {selectedView && (
          <MaterializedViewPanel
            key={selectedView.name}
            editorState={editorState}
            view={selectedView}
          />
        )}
      </div>
    );
  },
);
