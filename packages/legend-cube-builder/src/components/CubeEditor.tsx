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
  getCollapsiblePanelGroupProps,
  PanelLoadingIndicator,
  ResizablePanel,
  ResizablePanelGroup,
  ResizablePanelSplitter,
} from '@finos/legend-art';
import { useCommands } from '@finos/legend-application';
import type { CubeDocument } from '@finos/legend-cube';
import { flowResult, reaction } from 'mobx';
import { observer } from 'mobx-react-lite';
import { useEffect, useState } from 'react';
import { UNDO_SHORTCUT_LABEL } from '../__lib__/LegendCubeCommand.js';
import {
  CUBE_PENDING_LABEL,
  formatDisabledReasons,
  READ_ONLY_CUBE_TITLE,
  UNSAVED_CUBE_NAME,
} from '../__lib__/LegendCubeLabels.js';
import {
  CUBE_PERSISTENCE_PENDING_LABEL,
  CUBE_PERSISTENCE_SHORTCUT_LABEL,
  LOAD_ERROR_TITLE,
} from '../__lib__/LegendCubePersistenceLabels.js';
import { LEGEND_CUBE_TEST_ID } from '../__lib__/LegendCubeTesting.js';
import { CubeEditorState } from '../stores/CubeEditorState.js';
import {
  type CubeEntrySource,
  CubeEntrySourceState,
} from '../stores/CubeEntrySource.js';
import type { CubeHost } from '../stores/CubeHost.js';
import { CubeAddItemsMenu } from './CubeAddItems.js';
import { CubeButton } from './CubeButton.js';
import { CubeCanvas } from './canvas/CubeCanvas.js';
import { CubeEntrySourceBanner } from './CubeEntrySourceBanner.js';
import { CubeGridRegion } from './grid/CubeGridRegion.js';
import { CubePalette } from './palette/CubePalette.js';
import { CubeShowPureDialog } from './show-pure/CubeShowPureDialog.js';
import { CubeExamplesDialog } from './examples/CubeExamplesDialog.js';
import { CubeSourcePicker } from './source-picker/CubeSourcePicker.js';
import { CubeSpecTransferDialog } from './spec-transfer/CubeSpecTransferDialog.js';
import {
  CubeConfirmDialog,
  CubeLoadDialog,
  CubeSaveDialog,
} from './persistence/CubePersistenceDialogs.js';

/** The graph never takes more of the window's height than this, so the results stay in view (spec §17.3) */
const MAX_GRAPH_SHARE_OF_WINDOW = 0.6;

/** The tallest the graph region may be, following the window's height */
const useMaxGraphHeight = (): number => {
  const [windowHeight, setWindowHeight] = useState(() => window.innerHeight);
  useEffect(() => {
    const onResize = (): void => setWindowHeight(window.innerHeight);
    window.addEventListener('resize', onResize);
    return () => window.removeEventListener('resize', onResize);
  }, []);
  return Math.round(windowHeight * MAX_GRAPH_SHARE_OF_WINDOW);
};

/**
 * The graph region's header, above the graph and the results: the cube's
 * name, its actions, its pending and read-only notes, and its dialogs. It
 * stays when the graph is hidden; its buttons wrap when the page is narrow.
 */
const CubeGraphHeader = observer((props: { editorState: CubeEditorState }) => {
  const { editorState } = props;
  const { readOnly, persistence } = editorState;
  const { showGraph } = editorState.document.meta.presentation;
  const { applicationStore } = editorState.host;
  // the node editor finishes first, so its edits count (PLAN §11.13)
  const run = (action: () => void) => (): void =>
    editorState.runPersistenceAction(action);
  return (
    <div
      className="flex shrink-0 flex-col bg-[var(--color-bg-panel)]"
      data-testid={LEGEND_CUBE_TEST_ID.GRAPH_REGION}
    >
      <div className="flex min-h-8 shrink-0 flex-wrap items-center gap-2 border-b border-[var(--color-border-default)] bg-[var(--color-bg-panel-header)] px-2 py-1">
        <span
          className="flex min-w-24 flex-1 overflow-hidden"
          title={persistence.titleDescription}
          data-testid={LEGEND_CUBE_TEST_ID.CUBE_TITLE}
        >
          {/* Legend's base styles size every span, so each is sized here */}
          <span className="truncate text-lg font-medium">
            {editorState.document.name ?? UNSAVED_CUBE_NAME}
          </span>
          {/* outside the name, so a long name's ellipsis never hides it */}
          {persistence.isModified && (
            <span
              className="shrink-0 whitespace-pre text-lg font-medium text-[var(--color-text-secondary)]"
              aria-label="unsaved changes"
            >
              {' *'}
            </span>
          )}
        </span>
        {persistence.pending && (
          <span className="shrink-0 text-base text-[var(--color-text-secondary)]">
            {persistence.pending}
          </span>
        )}
        {editorState.isResolvingSources && (
          <span className="shrink-0 text-base text-[var(--color-text-secondary)]">
            {CUBE_PENDING_LABEL.RESOLVING_SOURCE}
          </span>
        )}
        {editorState.isCheckingExpressions && (
          <span className="shrink-0 text-base text-[var(--color-text-secondary)]">
            {CUBE_PENDING_LABEL.CHECKING_EXPRESSIONS}
          </span>
        )}
        <CubeButton
          title={`Start a new cube, in place of this one (${CUBE_PERSISTENCE_SHORTCUT_LABEL.NEW})`}
          disabled={persistence.isPending}
          onClick={run(() => persistence.newCube())}
        >
          New
        </CubeButton>
        <CubeButton
          title={
            persistence.loadDisabledReason ??
            `Open a saved cube, in place of this one (${CUBE_PERSISTENCE_SHORTCUT_LABEL.LOAD})`
          }
          disabled={persistence.loadDisabledReason !== undefined}
          onClick={run(() => persistence.openLoadDialog())}
        >
          Load
        </CubeButton>
        <CubeButton
          primary={persistence.isModified}
          title={
            persistence.saveDisabledReason ??
            (persistence.savedCube
              ? `Save the cube as version ${persistence.savedCube.version + 1} (${CUBE_PERSISTENCE_SHORTCUT_LABEL.SAVE})`
              : `Save the cube (${CUBE_PERSISTENCE_SHORTCUT_LABEL.SAVE})`)
          }
          // edits the node editor would apply may make an invalid cube valid
          disabled={
            persistence.saveDisabledReason !== undefined &&
            !(
              editorState.hasEditsToApply &&
              persistence.isSaveBlockedOnlyByProblems
            )
          }
          onClick={run(() => persistence.save())}
        >
          Save
        </CubeButton>
        <CubeButton
          title={
            persistence.saveAsDisabledReason ??
            'Save a copy of the cube under a new name, as its owner'
          }
          disabled={
            persistence.saveAsDisabledReason !== undefined &&
            !(
              editorState.hasEditsToApply &&
              persistence.isSaveAsBlockedOnlyByProblems
            )
          }
          onClick={run(() => persistence.saveAs())}
        >
          Save as
        </CubeButton>
        {persistence.savedCube && (
          <CubeButton
            title={
              persistence.deleteDisabledReason ??
              `Delete "${persistence.savedCube.name}" from the store`
            }
            disabled={persistence.deleteDisabledReason !== undefined}
            onClick={run(() => persistence.deleteCube())}
          >
            Delete
          </CubeButton>
        )}
        <CubeAddItemsMenu editorState={editorState} />
        <CubeButton
          title="Open an example cube, or start one on sample data"
          onClick={() => editorState.examples.open()}
        >
          Examples
        </CubeButton>
        <CubeButton
          title={
            readOnly
              ? READ_ONLY_CUBE_TITLE
              : `Undo the last change (${UNDO_SHORTCUT_LABEL})`
          }
          disabled={!editorState.canUndo && !editorState.hasEditsToApply}
          onClick={() => editorState.undoEdited()}
        >
          Undo
        </CubeButton>
        <CubeButton
          title={
            editorState.execution.canExecute
              ? 'Show the Pure query that Execute runs'
              : formatDisabledReasons(editorState.execution.disabledReasons)
          }
          disabled={!editorState.execution.canExecute}
          onClick={() => {
            // what it shows includes the node editor's edits, as Execute runs them
            if (!editorState.nodeEditor.finishApplied()) {
              return;
            }
            flowResult(editorState.showPure.open()).catch(
              editorState.host.applicationStore.alertUnhandledError,
            );
          }}
        >
          Show Pure
        </CubeButton>
        <CubeButton
          title={
            readOnly
              ? READ_ONLY_CUBE_TITLE
              : "Show the cube's spec, to copy or download"
          }
          disabled={readOnly}
          onClick={() => {
            if (editorState.nodeEditor.finishApplied()) {
              editorState.specTransfer.openExport();
            }
          }}
        >
          Export
        </CubeButton>
        <CubeButton
          title="Open a cube from its spec, in place of this one"
          onClick={() => editorState.specTransfer.openImport()}
        >
          Import
        </CubeButton>
        <CubeButton
          title={
            readOnly
              ? READ_ONLY_CUBE_TITLE
              : `Copy the cube's spec to the clipboard (${CUBE_PERSISTENCE_SHORTCUT_LABEL.COPY})`
          }
          disabled={readOnly}
          onClick={run(() => {
            persistence.copy().catch(applicationStore.alertUnhandledError);
          })}
        >
          Copy
        </CubeButton>
        <CubeButton
          title={`Open the cube spec on the clipboard, in place of this one (${CUBE_PERSISTENCE_SHORTCUT_LABEL.PASTE})`}
          disabled={persistence.isPending}
          onClick={run(() => persistence.paste())}
        >
          Paste
        </CubeButton>
        <CubeButton
          title={
            showGraph
              ? 'Hide the graph, leaving more room for the results'
              : 'Show the graph'
          }
          onClick={() => {
            // the floating editor goes with the graph, applying its edits
            if (!showGraph || editorState.nodeEditor.finish()) {
              editorState.setShowGraph(!showGraph);
            }
          }}
        >
          {showGraph ? 'Hide graph' : 'Show graph'}
        </CubeButton>
      </div>
      <PanelLoadingIndicator
        isLoading={
          editorState.isResolvingSources || editorState.isCheckingExpressions
        }
      />
      {persistence.loadError !== undefined && (
        <div
          className="flex shrink-0 items-center gap-2 border-b border-[var(--color-border-default)] bg-[var(--color-status-error-bg)] px-2 py-1 text-base text-[var(--color-status-error)]"
          role="alert"
          data-testid={LEGEND_CUBE_TEST_ID.LOAD_ERROR}
        >
          <span className="min-w-0 flex-1 break-words">
            <span className="font-medium">{LOAD_ERROR_TITLE}</span>{' '}
            {persistence.loadError}
          </span>
          <CubeButton onClick={() => persistence.clearLoadError()}>
            Dismiss
          </CubeButton>
        </div>
      )}
      {readOnly && (
        <div
          className="shrink-0 border-b border-[var(--color-border-default)] bg-[var(--color-status-warn-bg)] px-2 py-1 text-base text-[var(--color-status-warn)]"
          role="status"
        >
          {READ_ONLY_CUBE_TITLE}. You can view and run it.
        </div>
      )}
      {editorState.nodeEditor.notice && (
        <div
          className="flex shrink-0 items-center gap-2 border-b border-[var(--color-border-default)] bg-[var(--color-status-warn-bg)] px-2 py-1 text-base text-[var(--color-status-warn)]"
          role="status"
          data-testid={LEGEND_CUBE_TEST_ID.EDITOR_NOTICE}
        >
          <span className="min-w-0 flex-1">
            {editorState.nodeEditor.notice}
          </span>
          <CubeButton onClick={() => editorState.nodeEditor.dismissNotice()}>
            Dismiss
          </CubeButton>
        </div>
      )}
      <CubeSourcePicker editorState={editorState} />
      <CubeExamplesDialog editorState={editorState} />
      <CubeSpecTransferDialog editorState={editorState} />
      <CubeShowPureDialog editorState={editorState} />
      <CubeSaveDialog editorState={editorState} />
      <CubeLoadDialog editorState={editorState} />
      <CubeConfirmDialog editorState={editorState} />
    </div>
  );
});

/**
 * The Legend Cube page: the query above, its results below, both always
 * shown (PLAN §7.1); hiding the graph leaves its header. A node's editor
 * floats below the node (PLAN §11.8). The host gives it
 * the engine, the models and the application store; the page's state lives
 * as long as the page.
 */
export const CubeEditor = observer(
  (props: {
    host: CubeHost;
    /** The cube to open; an empty one by default */
    initialDocument?: CubeDocument | undefined;
    /** A source a link asks the page to start with, on an empty cube (spec §17.15) */
    initialSource?: CubeEntrySource | undefined;
    /** A saved cube the page's address names, opened as the page opens (PLAN §11.13) */
    initialCubeId?: string | undefined;
    /**
     * Told when the saved cube shown changes, e.g. to put its id in the
     * address (set on Load and Save, cleared on New, Paste and Import)
     */
    onSavedCubeChange?: ((cubeId: string | undefined) => void) | undefined;
  }) => {
    const [editorState] = useState(
      () => new CubeEditorState(props.host, props.initialDocument),
    );
    useEffect(() => () => editorState.dispose(), [editorState]);
    const [entry] = useState(() => new CubeEntrySourceState(editorState));
    const { initialSource } = props;
    useEffect(() => {
      if (initialSource) {
        flowResult(entry.open(initialSource)).catch(
          editorState.host.applicationStore.alertUnhandledError,
        );
      }
      // only as the page opens
      // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);
    const { initialCubeId, onSavedCubeChange } = props;
    useEffect(() => {
      if (initialCubeId !== undefined) {
        flowResult(editorState.persistence.openCube(initialCubeId, true)).catch(
          editorState.host.applicationStore.alertUnhandledError,
        );
      }
      // only as the page opens
      // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);
    useEffect(
      () =>
        reaction(
          () => editorState.persistence.currentId,
          (cubeId) => onSavedCubeChange?.(cubeId),
        ),
      [editorState, onSavedCubeChange],
    );
    // unsaved changes are asked about before the page is left (spec §17.14)
    useEffect(() => {
      const { navigator } = editorState.host.applicationStore.navigationService;
      navigator.blockNavigation(
        [() => editorState.persistence.isModified],
        (proceed) => editorState.persistence.confirmDiscard(proceed),
      );
      return () => navigator.unblockNavigation();
    }, [editorState]);
    useCommands(editorState);
    const maxGraphHeight = useMaxGraphHeight();
    const { showGraph } = editorState.document.meta.presentation;
    // hiding the graph collapses its panel: the header and the results stay
    // where they are, so the grid keeps its state
    const graphPanel = getCollapsiblePanelGroupProps(!showGraph);

    return (
      <div
        className="legend-cube relative flex bg-[var(--color-bg-app)] text-[var(--color-text-primary)]"
        data-testid={LEGEND_CUBE_TEST_ID.EDITOR}
      >
        {editorState.persistence.isOpeningFromAddress && (
          <div
            className="absolute inset-0 z-10 flex items-center justify-center bg-[var(--color-bg-app)] text-lg text-[var(--color-text-secondary)]"
            role="status"
          >
            {CUBE_PERSISTENCE_PENDING_LABEL.LOADING}
          </div>
        )}
        <CubePalette editorState={editorState} />
        <div className="flex h-full min-w-0 flex-1 flex-col">
          <CubeGraphHeader editorState={editorState} />
          <CubeEntrySourceBanner entry={entry} />
          <ResizablePanelGroup orientation="horizontal">
            <ResizablePanel
              {...graphPanel.collapsiblePanel}
              minSize={showGraph ? 96 : 0}
              maxSize={maxGraphHeight}
            >
              {showGraph && <CubeCanvas editorState={editorState} />}
            </ResizablePanel>
            <ResizablePanelSplitter className={showGraph ? '' : 'hidden'} />
            <ResizablePanel {...graphPanel.remainingPanel} minSize={96}>
              <CubeGridRegion editorState={editorState} />
            </ResizablePanel>
          </ResizablePanelGroup>
        </div>
      </div>
    );
  },
);
