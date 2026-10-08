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

import { clsx } from '@finos/legend-art';
import { Handle, type NodeProps, Position } from '@xyflow/react';
import { observer } from 'mobx-react-lite';
import { LEGEND_CUBE_TEST_ID } from '../../__lib__/LegendCubeTesting.js';
import { CubeNodeIcon } from '../CubeNodeIcon.js';
import {
  CUBE_OUTPUT_HANDLE_ID,
  type CubeCanvasFlowNode,
  getCubeCanvasNodeStatus,
  getInputHandleOffset,
} from './CubeCanvasElements.js';
import { useCubeCanvasEditorState } from './CubeCanvasContext.js';

/**
 * A node on the canvas: its type's icon and its description, never its id,
 * which is in the tooltip (spec §17.3). Its look tells its state at a glance.
 */
export const CubeCanvasNode = observer(
  (props: NodeProps<CubeCanvasFlowNode>) => {
    const { node } = props.data;
    const editorState = useCubeCanvasEditorState();
    const status = getCubeCanvasNodeStatus(editorState, node);
    const connectable = !editorState.readOnly && node.acceptsNewInputs;
    return (
      <div
        className={clsx(
          'legend-cube__node flex h-full w-full items-center gap-2 rounded border bg-[var(--color-bg-panel)] px-2 text-base text-[var(--color-text-primary)]',
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
            'legend-cube__node--resolving animate-pulse': status.isResolving,
            'legend-cube__node--engine-error bg-[var(--color-status-error-bg)]':
              status.hasEngineError,
          },
        )}
        title={status.tooltip}
        aria-current={status.isCapture}
        data-testid={LEGEND_CUBE_TEST_ID.CANVAS_NODE}
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
        <CubeNodeIcon
          icon={editorState.registry.get(node.type)?.icon}
          className="shrink-0 text-lg text-[var(--color-text-secondary)]"
        />
        <span className="line-clamp-2 min-w-0 break-words leading-tight">
          {node.describe()}
        </span>
        <Handle
          id={CUBE_OUTPUT_HANDLE_ID}
          type="source"
          position={Position.Right}
          isConnectable={!editorState.readOnly}
        />
      </div>
    );
  },
);
