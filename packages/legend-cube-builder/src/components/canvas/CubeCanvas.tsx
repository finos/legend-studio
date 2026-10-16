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

import { ContextMenu } from '@finos/legend-art';
import type { Query } from '@finos/legend-cube';
import { noop } from '@finos/legend-shared';
import {
  Background,
  type Connection as FlowConnection,
  ControlButton,
  Controls,
  type Edge,
  getViewportForBounds,
  MiniMap,
  ReactFlow,
  ReactFlowProvider,
  type Rect,
  useNodesInitialized,
  useReactFlow,
  useStore,
  type Viewport,
} from '@xyflow/react';
// imported here, not in the builder's stylesheet, so it loads with the Cube
// page's chunk: Query's reactflow 11 lineage viewer uses the same class names
import '@xyflow/react/dist/style.css';
import { observer } from 'mobx-react-lite';
import { useCallback, useEffect, useMemo, useRef } from 'react';
import { useDrop } from 'react-dnd';
import { LEGEND_CUBE_TEST_ID } from '../../__lib__/LegendCubeTesting.js';
import {
  CUBE_TOUR_ANCHOR,
  CUBE_TOUR_LABEL,
  cubeTourAnchor,
} from '../../__lib__/LegendCubeTour.js';
import { canAddCubeNode } from '../../stores/CubeAddPlacement.js';
import type { CubeEditorState } from '../../stores/CubeEditorState.js';
import { isCubeSampleDataOffered } from '../../stores/CubeHost.js';
import {
  buildCubeCanvasEdges,
  buildCubeCanvasNodes,
  CUBE_CANVAS_EDGE_TYPE,
  CUBE_CANVAS_NODE_TYPE,
  CUBE_OUTPUT_HANDLE_ID,
  type CubeCanvasFlowEdge,
  type CubeCanvasFlowNode,
} from './CubeCanvasElements.js';
import { CubeCanvasContext } from './CubeCanvasContext.js';
import { CubeCanvasContextMenu } from './CubeCanvasContextMenu.js';
import {
  CUBE_DND_TYPE,
  type CubePaletteDragItem,
  dropOnCubeCanvas,
} from './CubeCanvasDnd.js';
import { CubeCanvasEdge } from './CubeCanvasEdge.js';
import { layoutCubeQuery } from './CubeCanvasLayout.js';
import { CubeCanvasNode } from './CubeCanvasNode.js';
import { CubeNodeEditorPopper } from '../editors/CubeNodeEditorPopper.js';

// React Flow re-renders every node when these change identity
const NODE_TYPES = { [CUBE_CANVAS_NODE_TYPE]: CubeCanvasNode };
const EDGE_TYPES = { [CUBE_CANVAS_EDGE_TYPE]: CubeCanvasEdge };
const PRO_OPTIONS = { hideAttribution: true };
/** Small, so it covers little of a short canvas */
const MINI_MAP_STYLE = { width: 120, height: 80 };
// little padding, so a long flow keeps its text as large as it can
const FIT_VIEW_OPTIONS = { padding: 0.1, maxZoom: 1 };
const CANVAS_MIN_ZOOM = 0.2;
/** The space left of the graph once fitted to the left (feedback, 2026-10-16) */
export const CUBE_CANVAS_LEFT_MARGIN = 32;

/**
 * The viewport that shows the graph whole, zoomed as fitting it would, but
 * against the canvas's left edge rather than centred (feedback, 2026-10-16,
 * as the internal application lays its graphs out); centred top to bottom
 */
export const getCubeCanvasLeftAlignedViewport = (
  bounds: Rect,
  width: number,
  height: number,
): Viewport => {
  const { zoom, y } = getViewportForBounds(
    bounds,
    width,
    height,
    CANVAS_MIN_ZOOM,
    FIT_VIEW_OPTIONS.maxZoom,
    FIT_VIEW_OPTIONS.padding,
  );
  return { x: CUBE_CANVAS_LEFT_MARGIN - bounds.x * zoom, y, zoom };
};

/** React Flow's fit view icon, for the button that fits the graph to the left */
const FitViewIcon: React.FC = () => (
  <svg
    xmlns="http://www.w3.org/2000/svg"
    viewBox="0 0 32 30"
    aria-hidden={true}
  >
    <path d="M3.692 4.63c0-.53.4-.938.939-.938h5.215V0H4.708C2.13 0 0 2.054 0 4.63v5.216h3.692V4.631zM27.354 0h-5.2v3.692h5.17c.53 0 .984.4.984.939v5.215H32V4.631A4.624 4.624 0 0027.354 0zm.954 24.83c0 .532-.4.94-.939.94h-5.215v3.768h5.215c2.577 0 4.631-2.13 4.631-4.707v-5.139h-3.692v5.139zm-23.677.94c-.531 0-.939-.4-.939-.94v-5.138H0v5.139c0 2.577 2.13 4.707 4.708 4.707h5.138V25.77H4.631z" />
  </svg>
);

/**
 * Whether dragging from one handle to another may connect the two nodes: out
 * of a node's output, into a free input port that the query lets it feed
 */
export const isCubeCanvasConnectionValid = (
  query: Query,
  connection: FlowConnection | Edge,
): boolean =>
  connection.sourceHandle === CUBE_OUTPUT_HANDLE_ID &&
  typeof connection.targetHandle === 'string' &&
  query.canConnect(
    connection.source,
    connection.target,
    connection.targetHandle,
  );

const CubeCanvasFlow = observer((props: { editorState: CubeEditorState }) => {
  const { editorState } = props;
  const { query } = editorState.document;
  const { readOnly } = editorState;
  const { getNodes, getNodesBounds, setViewport } = useReactFlow();
  const positions = useMemo(() => layoutCubeQuery(query), [query]);
  const nodes = useMemo(
    () => buildCubeCanvasNodes(query, positions),
    [query, positions],
  );
  const edges = useMemo(() => buildCubeCanvasEdges(query), [query]);
  // the view fits the graph again, to the left, whenever the layout moves a
  // node, or the canvas changes size (e.g. the splitter above the grid
  // moves), once React Flow has measured every node
  const layoutSignature = useMemo(
    () => JSON.stringify([...positions]),
    [positions],
  );
  const nodesInitialized = useNodesInitialized();
  const canvasWidth = useStore((state) => state.width);
  const canvasHeight = useStore((state) => state.height);
  const fitToLeft = useCallback((): void => {
    const shown = getNodes();
    if (!shown.length || !canvasWidth || !canvasHeight) {
      return;
    }
    setViewport(
      getCubeCanvasLeftAlignedViewport(
        getNodesBounds(shown),
        canvasWidth,
        canvasHeight,
      ),
    ).catch(noop());
  }, [getNodes, getNodesBounds, setViewport, canvasWidth, canvasHeight]);
  useEffect(() => {
    if (!nodesInitialized) {
      return undefined;
    }
    const timer = window.setTimeout(fitToLeft, 0);
    return () => window.clearTimeout(timer);
  }, [layoutSignature, nodesInitialized, fitToLeft]);

  return (
    <ReactFlow<CubeCanvasFlowNode, CubeCanvasFlowEdge>
      nodes={nodes}
      edges={edges}
      nodeTypes={NODE_TYPES}
      edgeTypes={EDGE_TYPES}
      // the layout places the nodes; nothing is selected or deleted in React Flow
      nodesDraggable={false}
      nodesConnectable={!readOnly}
      elementsSelectable={false}
      deleteKeyCode={null}
      selectionKeyCode={null}
      multiSelectionKeyCode={null}
      onNodeClick={(event, flowNode) => {
        // a click on a handle starts or ends a connection, not a node click
        if (
          event.target instanceof Element &&
          event.target.closest('.react-flow__handle')
        ) {
          return;
        }
        if (event.ctrlKey || event.metaKey) {
          // applies and closes the open editor first, opening none (spec §17.5)
          if (editorState.nodeEditor.finish()) {
            editorState.select(flowNode.id);
          }
        } else {
          editorState.nodeEditor.open(flowNode.id);
        }
      }}
      // React Flow's own keyboard help speaks of selecting, moving and
      // deleting nodes, which Cube doesn't do; Enter and Space open a node's
      // editor instead, and Ctrl or Cmd with them select it
      disableKeyboardA11y={true}
      edgesFocusable={false}
      onKeyDown={(event) => {
        const target = event.target;
        const nodeId =
          target instanceof HTMLElement &&
          target.classList.contains('react-flow__node')
            ? target.dataset.id
            : undefined;
        if (nodeId === undefined) {
          return;
        }
        // the focused step's keys (the review of the demo, 2026-10-13): only
        // on the step itself, never in an editor's field
        const command = event.ctrlKey || event.metaKey;
        const key = event.key.toLowerCase();
        const stepAction =
          !command && (key === 'delete' || key === 'backspace')
            ? editorState.canRemoveNode(nodeId)
              ? () => editorState.removeNode(nodeId)
              : undefined
            : command && key === 'c'
              ? editorState.canCopyNode(nodeId)
                ? () => editorState.copyNode(nodeId)
                : undefined
              : command && key === 'v'
                ? editorState.canPaste
                  ? () => editorState.pasteNode(nodeId)
                  : undefined
                : command && key === 'd'
                  ? editorState.canDuplicateNode(nodeId)
                    ? () => editorState.duplicateNode(nodeId)
                    : undefined
                  : null;
        if (stepAction !== null) {
          event.preventDefault();
          // the open editor applies first, as for any change to the query
          if (stepAction && editorState.nodeEditor.finish()) {
            stepAction();
          }
          return;
        }
        if (event.key !== 'Enter' && event.key !== ' ') {
          return;
        }
        event.preventDefault();
        if (event.ctrlKey || event.metaKey) {
          if (editorState.nodeEditor.finish()) {
            editorState.select(nodeId);
          }
        } else {
          editorState.nodeEditor.open(nodeId);
          // the keyboard goes on in the editor, once it is shown
          window.setTimeout(() =>
            document
              .querySelector<HTMLElement>(
                `[data-testid="${LEGEND_CUBE_TEST_ID.NODE_EDITOR}"]`,
              )
              ?.focus(),
          );
        }
      }}
      isValidConnection={(connection) =>
        !readOnly && isCubeCanvasConnectionValid(query, connection)
      }
      // a connection changes the query, so the open editor applies first,
      // whether the handles are dragged or clicked
      onConnectStart={() => editorState.nodeEditor.finish()}
      // a click on the canvas's background closes the floating editor; a
      // press there that pans leaves it open
      onPaneClick={() => editorState.nodeEditor.finish()}
      onClickConnectStart={() => editorState.nodeEditor.finish()}
      onConnect={(connection) => {
        if (connection.targetHandle) {
          editorState.connect(
            connection.source,
            connection.target,
            connection.targetHandle,
          );
        }
      }}
      colorMode={
        editorState.host.applicationStore.layoutService
          .TEMPORARY__isLightColorThemeEnabled
          ? 'light'
          : 'dark'
      }
      proOptions={PRO_OPTIONS}
      minZoom={CANVAS_MIN_ZOOM}
      maxZoom={1.5}
    >
      <Background />
      <Controls showInteractive={false} showFitView={false}>
        {/* in place of React Flow's, which centres the graph */}
        <ControlButton
          className="react-flow__controls-fitview"
          title="fit view"
          aria-label="fit view"
          onClick={fitToLeft}
        >
          <FitViewIcon />
        </ControlButton>
      </Controls>
      <MiniMap pannable={true} zoomable={true} style={MINI_MAP_STYLE} />
      <CubeNodeEditorPopper editorState={editorState} positions={positions} />
    </ReactFlow>
  );
});

/**
 * The query as a graph, laid out left to right (spec §17.3). Click a node to
 * edit it, Ctrl or Cmd-click it to run the query up to it, drag from a node's
 * output to another node's input to connect them. A transform dropped
 * around the nodes goes after the selected node; a source, dropped anywhere,
 * opens the source dialog on its tab (PLAN §11.8). Right-click it, or a
 * node, for the context menu.
 */
export const CubeCanvas = observer(
  (props: { editorState: CubeEditorState }) => {
    const { editorState } = props;
    const ref = useRef<HTMLDivElement>(null);
    const [, dropConnector] = useDrop<CubePaletteDragItem>(
      () => ({
        accept: [CUBE_DND_TYPE.PALETTE_ITEM],
        canDrop: (item) =>
          !editorState.readOnly && canAddCubeNode(editorState, item.nodeType),
        // a node under the pointer, whether it took the drop or refused it,
        // keeps it from the canvas
        drop: (item, monitor) =>
          dropOnCubeCanvas(
            editorState,
            item,
            monitor.didDrop() || !monitor.isOver({ shallow: true }),
          ),
      }),
      [editorState],
    );
    dropConnector(ref);
    return (
      <div
        ref={ref}
        className="relative h-full w-full"
        data-testid={LEGEND_CUBE_TEST_ID.CANVAS}
        {...cubeTourAnchor(CUBE_TOUR_ANCHOR.CANVAS)}
      >
        <ContextMenu
          className="h-full w-full"
          // an empty query has no menu: there is nothing to add after (U3)
          disabled={editorState.document.query.isEmpty}
          content={<CubeCanvasContextMenu editorState={editorState} />}
          menuProps={{ elevation: 7 }}
        >
          {editorState.document.query.isEmpty ? (
            <div className="flex h-full flex-col items-center justify-center gap-2 p-4 text-base text-[var(--color-text-secondary)]">
              <span>
                <button
                  className="text-[var(--color-accent)] underline disabled:text-[var(--color-text-disabled)] disabled:no-underline"
                  title={editorState.sourcePicker.disabledReason}
                  disabled={
                    editorState.sourcePicker.disabledReason !== undefined
                  }
                  onClick={() => editorState.sourcePicker.openToChoose()}
                >
                  Connect to a source
                </button>
                {isCubeSampleDataOffered(editorState.host) ? (
                  <>
                    {' '}
                    to start a new one, or{' '}
                    <button
                      className="text-[var(--color-accent)] underline"
                      onClick={() => editorState.examples.open()}
                    >
                      open an example
                    </button>
                    .
                  </>
                ) : (
                  ' to start a new one.'
                )}
              </span>
              <span>
                {CUBE_TOUR_LABEL.OFFER}{' '}
                <button
                  className="text-[var(--color-accent)] underline"
                  onClick={() => editorState.tour.start()}
                >
                  {CUBE_TOUR_LABEL.START}
                </button>
                .
              </span>
            </div>
          ) : (
            <CubeCanvasContext.Provider value={editorState}>
              <ReactFlowProvider>
                <CubeCanvasFlow editorState={editorState} />
              </ReactFlowProvider>
            </CubeCanvasContext.Provider>
          )}
        </ContextMenu>
      </div>
    );
  },
);
