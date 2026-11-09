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
import type { QueryNode } from '@finos/legend-cube';
import { Handle, Position } from '@xyflow/react';
import {
  RUNNING_NODE_LABEL,
  RUNNING_NODE_TITLE,
} from '../../__lib__/LegendCubeHelpText.js';
import { LEGEND_CUBE_TEST_ID } from '../../__lib__/LegendCubeTesting.js';
import { CubeNodeIcon } from '../CubeNodeIcon.js';
import {
  CUBE_OUTPUT_HANDLE_ID,
  getInputHandleOffset,
} from './CubeCanvasElements.js';
import { CUBE_CANVAS_NODE_HEIGHT } from './CubeCanvasLayout.js';

// What a node shows on the editor's canvas and on a definition flow alike,
// so the two look the same

/** A node's input handles, down its left side in port order */
export const CubeCanvasInputHandles: React.FC<{
  node: QueryNode;
  connectable: boolean;
}> = (props) => {
  const { node, connectable } = props;
  return node.ports.map((port, index) => (
    <Handle
      key={port}
      id={port}
      type="target"
      position={Position.Left}
      isConnectable={connectable}
      style={{ top: getInputHandleOffset(index, node.ports.length) }}
    />
  ));
};

/** A node's output handle, in the middle of its right side */
export const CubeCanvasOutputHandle: React.FC<{ connectable: boolean }> = (
  props,
) => (
  <Handle
    id={CUBE_OUTPUT_HANDLE_ID}
    type="source"
    position={Position.Right}
    isConnectable={props.connectable}
    // in the middle of the step, not of the note under it
    style={{ top: CUBE_CANVAS_NODE_HEIGHT / 2 }}
  />
);

/** A node's type icon, then its title, with a muted detail under it when it has one */
export const CubeCanvasNodeLabel: React.FC<{
  icon: string | undefined;
  title: string;
  detail?: string | undefined;
}> = (props) => {
  const { icon, title, detail } = props;
  return (
    <>
      <CubeNodeIcon
        icon={icon}
        className="shrink-0 text-lg text-[var(--color-text-secondary)]"
      />
      <span className="flex min-w-0 flex-col leading-tight">
        <span
          className={clsx(
            'break-words',
            detail === undefined ? 'line-clamp-2' : 'line-clamp-1',
          )}
        >
          {title}
        </span>
        {detail !== undefined && (
          <span className="truncate text-sm text-[var(--color-text-muted)]">
            {detail}
          </span>
        )}
      </span>
    </>
  );
};

/**
 * The output step's label, a caption above its corner: no fill, no ▶ and no
 * pointer, so it reads as a label and only Run Query looks like a button
 * (the manager's feedback, 2026-10-29)
 */
export const CubeCanvasOutputCaption: React.FC<{
  /** What it says on hover: by default, the editor's, which runs the query up to it */
  title?: string | undefined;
}> = (props) => (
  <span
    className="absolute bottom-full right-1 mb-0.5 cursor-default select-none text-xs font-semibold uppercase leading-4 tracking-wider text-[var(--color-text-secondary)]"
    title={props.title ?? RUNNING_NODE_TITLE}
    data-testid={LEGEND_CUBE_TEST_ID.RUNNING_NODE_BADGE}
  >
    {RUNNING_NODE_LABEL}
  </span>
);
