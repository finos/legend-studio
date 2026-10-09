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
  Controls,
  type Edge,
  MiniMap,
  ReactFlow,
  ReactFlowProvider,
  useNodesInitialized,
  useReactFlow,
  useStore,
} from '@xyflow/react';
// imported here, not in the builder's stylesheet, so it loads with the Cube
// page's chunk: Query's reactflow 11 lineage viewer uses the same class names
import '@xyflow/react/dist/style.css';
import { observer } from 'mobx-react-lite';
import { useEffect, useMemo, useRef } from 'react';
import { useDrop } from 'react-dnd';
import { LEGEND_CUBE_TEST_ID } from '../../__lib__/LegendCubeTesting.js';
import type { CubeEditorState } from '../../stores/CubeEditorState.js';
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

// React Flow re-renders every node when these change identity
const NODE_TYPES = { [CUBE_CANVAS_NODE_TYPE]: CubeCanvasNode };
const EDGE_TYPES = { [CUBE_CANVAS_EDGE_TYPE]: CubeCanvasEdge };
const PRO_OPTIONS = { hideAttribution: true };
/** Small, so it covers little of a short canvas */
const MINI_MAP_STYLE = { width: 120, height: 80 };
const FIT_VIEW_OPTIONS = { padding: 0.2, maxZoom: 1 };

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
  const { fitView } = useReactFlow();
  const positions = useMemo(() => layoutCubeQuery(query), [query]);
  const nodes = useMemo(
    () => buildCubeCanvasNodes(query, positions),
    [query, positions],
  );
  const edges = useMemo(() => buildCubeCanvasEdges(query), [query]);
  // the view fits the graph again whenever the layout moves a node, or the
  // canvas changes size (e.g. the node editor opens beside it, or the
  // splitter above the grid moves), once React Flow has measured every node:
  // it fits only measured ones
  const layoutSignature = useMemo(
    () => JSON.stringify([...positions]),
    [positions],
  );
  const nodesInitialized = useNodesInitialized();
  const canvasWidth = useStore((state) => state.width);
  const canvasHeight = useStore((state) => state.height);
  useEffect(() => {
    if (!nodesInitialized) {
      return undefined;
    }
    const timer = window.setTimeout(() => {
      fitView(FIT_VIEW_OPTIONS).catch(noop());
    }, 0);
    return () => window.clearTimeout(timer);
  }, [layoutSignature, canvasWidth, canvasHeight, nodesInitialized, fitView]);

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
          editorState.select(flowNode.id);
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
        if (
          nodeId === undefined ||
          (event.key !== 'Enter' && event.key !== ' ')
        ) {
          return;
        }
        event.preventDefault();
        if (event.ctrlKey || event.metaKey) {
          editorState.select(nodeId);
        } else {
          editorState.nodeEditor.open(nodeId);
        }
      }}
      isValidConnection={(connection) =>
        !readOnly && isCubeCanvasConnectionValid(query, connection)
      }
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
      fitView={true}
      fitViewOptions={FIT_VIEW_OPTIONS}
      minZoom={0.2}
      maxZoom={1.5}
    >
      <Background />
      <Controls showInteractive={false} />
      <MiniMap pannable={true} zoomable={true} style={MINI_MAP_STYLE} />
    </ReactFlow>
  );
});

/**
 * The query as a graph, laid out left to right (spec §17.3). Click a node to
 * edit it, Ctrl or Cmd-click it to run the query up to it, drag from a node's
 * output to another node's input to connect them. A palette item dropped
 * around the nodes is added unconnected. Right-click it, or a node, for the
 * context menu.
 */
export const CubeCanvas = observer(
  (props: { editorState: CubeEditorState }) => {
    const { editorState } = props;
    const ref = useRef<HTMLDivElement>(null);
    const [, dropConnector] = useDrop<CubePaletteDragItem>(
      () => ({
        accept: [CUBE_DND_TYPE.PALETTE_ITEM],
        canDrop: (item) =>
          !editorState.readOnly && editorState.canAddNode(item.nodeType),
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
      >
        <ContextMenu
          className="h-full w-full"
          content={<CubeCanvasContextMenu editorState={editorState} />}
          menuProps={{ elevation: 7 }}
        >
          {editorState.document.query.isEmpty ? (
            <div className="flex h-full items-center justify-center p-4 text-base text-[var(--color-text-secondary)]">
              <span>
                No tables yet:{' '}
                <button
                  className="text-[var(--color-accent)] underline disabled:text-[var(--color-text-disabled)] disabled:no-underline"
                  disabled={editorState.readOnly}
                  onClick={() => editorState.sourcePicker.open()}
                >
                  add a table
                </button>{' '}
                to start.
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
