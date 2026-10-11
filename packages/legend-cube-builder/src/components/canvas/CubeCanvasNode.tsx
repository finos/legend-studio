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

import { clsx, ContextMenu, Tooltip, WarningIcon } from '@finos/legend-art';
import { Handle, type NodeProps, Position } from '@xyflow/react';
import { observer } from 'mobx-react-lite';
import { useRef } from 'react';
import { useDrag, useDrop } from 'react-dnd';
import { LEGEND_CUBE_TEST_ID } from '../../__lib__/LegendCubeTesting.js';
import { CubeNodeIcon } from '../CubeNodeIcon.js';
import {
  CUBE_OUTPUT_HANDLE_ID,
  type CubeCanvasFlowNode,
  getCubeCanvasNodeStatus,
  getInputHandleOffset,
} from './CubeCanvasElements.js';
import { useCubeCanvasEditorState } from './CubeCanvasContext.js';
import { CubeCanvasContextMenu } from './CubeCanvasContextMenu.js';
import {
  canDropOnCubeNode,
  CUBE_DND_TYPE,
  type CubeDragItem,
  type CubeNodeDragItem,
  dropOnCubeNode,
} from './CubeCanvasDnd.js';

/**
 * A node on the canvas: its type's icon and its description, never its id,
 * which is in the tooltip (spec §17.3). Its look tells its state at a glance.
 * It can be dragged onto another node, and takes palette items and other
 * nodes, lighting up only for a drop that would do something. Its handles
 * sit beside its draggable body, not in it, so dragging from a handle
 * connects rather than drags the node.
 */
export const CubeCanvasNode = observer(
  (props: NodeProps<CubeCanvasFlowNode>) => {
    const { node } = props.data;
    const editorState = useCubeCanvasEditorState();
    const status = getCubeCanvasNodeStatus(editorState, node);
    const connectable = !editorState.readOnly && node.acceptsNewInputs;
    const ref = useRef<HTMLDivElement>(null);
    const [, dragConnector] = useDrag<CubeNodeDragItem>(
      () => ({
        type: CUBE_DND_TYPE.NODE,
        // the drop changes the query, so the open editor applies first
        item: () => {
          editorState.nodeEditor.finish();
          return { nodeId: node.id };
        },
        canDrag: () => !editorState.readOnly,
      }),
      [editorState, node.id],
    );
    const [{ isDropTarget }, dropConnector] = useDrop<
      CubeDragItem,
      void,
      { isDropTarget: boolean }
    >(
      () => ({
        accept: [CUBE_DND_TYPE.NODE, CUBE_DND_TYPE.PALETTE_ITEM],
        canDrop: (item) => canDropOnCubeNode(editorState, item, node.id),
        drop: (item) => dropOnCubeNode(editorState, item, node.id),
        collect: (monitor) => ({
          isDropTarget: monitor.isOver({ shallow: true }) && monitor.canDrop(),
        }),
      }),
      [editorState, node.id],
    );
    dragConnector(dropConnector(ref));
    return (
      <ContextMenu
        className="h-full w-full"
        content={
          <CubeCanvasContextMenu editorState={editorState} nodeId={node.id} />
        }
        menuProps={{ elevation: 7 }}
      >
        {node.ports.map((port, index) => (
          <Handle
            key={port}
            id={port}
            type="target"
            position={Position.Left}
            isConnectable={connectable}
            style={{ top: getInputHandleOffset(index, node.ports.length) }}
          />
        ))}
        <Tooltip
          // after a moment, above the node, one message a line (U1(c))
          title={<div className="whitespace-pre-line">{status.tooltip}</div>}
          placement="top"
          enterDelay={500}
          enterNextDelay={500}
          disableInteractive={true}
          // it describes the node, whose name stays its description
          describeChild={true}
          slotProps={{ tooltip: { className: 'max-w-[40rem]' } }}
        >
          <div
            ref={ref}
            className={clsx(
              // React Flow must leave the mouse to the HTML drag: 'nodrag' keeps
              // it from moving the node, 'nopan' from panning the canvas
              'legend-cube__node nodrag nopan flex h-full w-full items-center gap-2 rounded border bg-[var(--color-bg-panel)] px-2 text-base text-[var(--color-text-primary)]',
              status.isInvalid
                ? 'border-[var(--color-status-error)]'
                : status.isIncomplete
                  ? 'border-dashed border-[var(--color-status-warn)]'
                  : 'border-[var(--color-border-default)]',
              {
                'legend-cube__node--selected ring-2 ring-[var(--color-accent)]':
                  status.isCapture,
                'legend-cube__node--invalid': status.isInvalid,
                'legend-cube__node--incomplete': status.isIncomplete,
                'legend-cube__node--resolving animate-pulse':
                  status.isResolving,
                'legend-cube__node--engine-error bg-[var(--color-status-error-bg)]':
                  status.hasEngineError,
                'legend-cube__node--warning': status.hasWarnings,
                'legend-cube__node--drop-target outline-dashed outline-2 outline-[var(--color-accent)]':
                  isDropTarget,
              },
            )}
            // the tooltip's text, for assistive technology and tests
            aria-description={status.tooltip}
            aria-current={status.isCapture}
            data-testid={LEGEND_CUBE_TEST_ID.CANVAS_NODE}
          >
            <CubeNodeIcon
              icon={editorState.registry.get(node.type)?.icon}
              className="shrink-0 text-lg text-[var(--color-text-secondary)]"
            />
            <span className="line-clamp-2 min-w-0 break-words leading-tight">
              {node.describe()}
            </span>
            {status.hasWarnings && (
              // the warning's text is in the node's tooltip
              <WarningIcon
                className="ml-auto shrink-0 text-[var(--color-status-warn)]"
                aria-hidden={true}
              />
            )}
          </div>
        </Tooltip>
        <Handle
          id={CUBE_OUTPUT_HANDLE_ID}
          type="source"
          position={Position.Right}
          isConnectable={!editorState.readOnly}
        />
      </ContextMenu>
    );
  },
);
