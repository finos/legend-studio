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
import { flowResult } from 'mobx';
import { observer } from 'mobx-react-lite';
import { useEffect, useState } from 'react';
import { UNDO_SHORTCUT_LABEL } from '../__lib__/LegendCubeCommand.js';
import {
  CUBE_PENDING_LABEL,
  formatDisabledReasons,
  READ_ONLY_CUBE_TITLE,
  UNSAVED_CUBE_NAME,
} from '../__lib__/LegendCubeLabels.js';
import { LEGEND_CUBE_TEST_ID } from '../__lib__/LegendCubeTesting.js';
import { CubeEditorState } from '../stores/CubeEditorState.js';
import type { CubeHost } from '../stores/CubeHost.js';
import { CubeButton } from './CubeButton.js';
import { CubeCanvas } from './canvas/CubeCanvas.js';
import { CubeNodeEditorPanel } from './editors/CubeNodeEditorPanel.js';
import { CubeGridRegion } from './grid/CubeGridRegion.js';
import { CubePalette } from './palette/CubePalette.js';
import { CubeShowPureDialog } from './show-pure/CubeShowPureDialog.js';
import { CubeSourcePicker } from './source-picker/CubeSourcePicker.js';
import { CubeSpecTransferDialog } from './spec-transfer/CubeSpecTransferDialog.js';

/** The graph never takes more of the window's height than this, so the results stay in view (spec §17.3) */
const MAX_GRAPH_SHARE_OF_WINDOW = 0.6;

/** How wide the node editor opens, in pixels */
const NODE_EDITOR_WIDTH = 400;

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

const CubeGraphRegion = observer((props: { editorState: CubeEditorState }) => {
  const { editorState } = props;
  const { readOnly } = editorState;
  const { showGraph } = editorState.document.meta.presentation;
  return (
    <div
      className={
        showGraph
          ? 'flex h-full flex-col bg-[var(--color-bg-panel)]'
          : 'flex shrink-0 flex-col bg-[var(--color-bg-panel)]'
      }
      data-testid={LEGEND_CUBE_TEST_ID.GRAPH_REGION}
    >
      <div className="flex h-8 shrink-0 items-center gap-2 border-b border-[var(--color-border-default)] bg-[var(--color-bg-panel-header)] px-2">
        <span className="min-w-0 flex-1 truncate text-lg font-medium">
          {editorState.document.name ?? UNSAVED_CUBE_NAME}
        </span>
        {editorState.isResolvingSources && (
          <span className="shrink-0 text-base text-[var(--color-text-secondary)]">
            {CUBE_PENDING_LABEL.RESOLVING_SOURCE}
          </span>
        )}
        <CubeButton
          title={readOnly ? READ_ONLY_CUBE_TITLE : undefined}
          disabled={readOnly}
          onClick={() => editorState.sourcePicker.open()}
        >
          Add table
        </CubeButton>
        <CubeButton
          title={
            readOnly
              ? READ_ONLY_CUBE_TITLE
              : `Undo the last change (${UNDO_SHORTCUT_LABEL})`
          }
          disabled={!editorState.canUndo}
          onClick={() => editorState.undo()}
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
          onClick={() => editorState.specTransfer.openExport()}
        >
          Export (dev)
        </CubeButton>
        <CubeButton
          title="Open a cube from its spec, in place of this one"
          onClick={() => editorState.specTransfer.openImport()}
        >
          Import (dev)
        </CubeButton>
        <CubeButton
          title={
            showGraph
              ? 'Hide the graph, leaving more room for the results'
              : 'Show the graph'
          }
          onClick={() => editorState.setShowGraph(!showGraph)}
        >
          {showGraph ? 'Hide graph' : 'Show graph'}
        </CubeButton>
      </div>
      <PanelLoadingIndicator isLoading={editorState.isResolvingSources} />
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
      {showGraph && (
        <div className="min-h-0 flex-1">
          <CubeCanvas editorState={editorState} />
        </div>
      )}
      <CubeSourcePicker editorState={editorState} />
      <CubeSpecTransferDialog editorState={editorState} />
      <CubeShowPureDialog editorState={editorState} />
    </div>
  );
});

/**
 * The Legend Cube page: the query above, its results below, both always
 * shown (PLAN §7.1); hiding the graph leaves its header. The host gives it
 * the engine, the models and the application store; the page's state lives
 * as long as the page.
 */
export const CubeEditor = observer(
  (props: {
    host: CubeHost;
    /** The cube to open; an empty one by default */
    initialDocument?: CubeDocument | undefined;
  }) => {
    const [editorState] = useState(
      () => new CubeEditorState(props.host, props.initialDocument),
    );
    useEffect(() => () => editorState.dispose(), [editorState]);
    useCommands(editorState);
    const maxGraphHeight = useMaxGraphHeight();
    const isEditorOpen = editorState.nodeEditor.nodeId !== undefined;
    const editorPanel = getCollapsiblePanelGroupProps(!isEditorOpen, {
      size: NODE_EDITOR_WIDTH,
    });

    return (
      <div
        className="legend-cube flex bg-[var(--color-bg-app)] text-[var(--color-text-primary)]"
        data-testid={LEGEND_CUBE_TEST_ID.EDITOR}
      >
        <CubePalette editorState={editorState} />
        <ResizablePanelGroup orientation="vertical">
          <ResizablePanel {...editorPanel.remainingPanel} minSize={320}>
            <div className="flex h-full min-w-0 flex-1 flex-col">
              {editorState.document.meta.presentation.showGraph ? (
                <ResizablePanelGroup orientation="horizontal">
                  <ResizablePanel minSize={96} maxSize={maxGraphHeight}>
                    <CubeGraphRegion editorState={editorState} />
                  </ResizablePanel>
                  <ResizablePanelSplitter />
                  <ResizablePanel minSize={96}>
                    <CubeGridRegion editorState={editorState} />
                  </ResizablePanel>
                </ResizablePanelGroup>
              ) : (
                <>
                  <CubeGraphRegion editorState={editorState} />
                  <div className="min-h-0 flex-1">
                    <CubeGridRegion editorState={editorState} />
                  </div>
                </>
              )}
            </div>
          </ResizablePanel>
          <ResizablePanelSplitter className={isEditorOpen ? '' : 'hidden'} />
          <ResizablePanel {...editorPanel.collapsiblePanel} direction={-1}>
            <CubeNodeEditorPanel editorState={editorState} />
          </ResizablePanel>
        </ResizablePanelGroup>
      </div>
    );
  },
);
