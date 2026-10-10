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

import { BasePopper } from '@finos/legend-art';
import { useStore } from '@xyflow/react';
import { observer } from 'mobx-react-lite';
import { useMemo, useRef } from 'react';
import type { CubeEditorState } from '../../stores/CubeEditorState.js';
import type { CubeCanvasPosition } from '../canvas/CubeCanvasLayout.js';
import {
  getCubeNodeScreenRect,
  isCubeNodeInView,
  toDOMRect,
} from '../canvas/CubeNodeEditorAnchor.js';
import { CubeNodeEditorPanel } from './CubeNodeEditorPanel.js';

/**
 * Every node type's editor is this wide (U1: 27rem, read at a 16px root;
 * Legend's root is 62.5%, so it is written in pixels)
 */
export const CUBE_NODE_EDITOR_WIDTH = 432;

/** Above the canvas and the grid, below MUI's dialogs (1300), so a dialog opened from the editor covers it */
export const CUBE_NODE_EDITOR_Z_INDEX = 1250;

/** The gap between the node and its editor, and between the editor and the window's edges */
const GAP = 8;

const MODIFIERS = [
  { name: 'offset', options: { offset: [0, GAP] } },
  {
    name: 'flip',
    options: { fallbackPlacements: ['top'], padding: GAP },
  },
  {
    name: 'preventOverflow',
    options: {
      rootBoundary: 'viewport',
      padding: GAP,
      altAxis: true,
      tether: false,
    },
  },
];

/**
 * The node editor, floating below its node (PLAN §11.6, spec §17.5): one
 * width for every node type, over the results grid if it must be, inside the
 * window, above the node when there is no room below. It is rendered inside
 * the canvas, whose pan and zoom it follows, and shown in a layer of its own
 * so the canvas doesn't clip it. A node panned out of view hides its editor,
 * which stays open with its edits.
 */
export const CubeNodeEditorPopper = observer(
  (props: {
    editorState: CubeEditorState;
    /** Where the layout put each node */
    positions: ReadonlyMap<string, CubeCanvasPosition>;
  }) => {
    const { editorState, positions } = props;
    const { nodeId } = editorState.nodeEditor;
    const transform = useStore((state) => state.transform);
    const canvas = useStore((state) => state.domNode);
    // a canvas that changes size may show or hide the node
    useStore((state) => state.width);
    useStore((state) => state.height);
    const position = nodeId === undefined ? undefined : positions.get(nodeId);
    // the popper reads the node's place whenever it positions the editor,
    // which it does on every render, so one anchor serves the whole pan or
    // zoom
    const latest = useRef({ position, transform, canvas });
    latest.current = { position, transform, canvas };
    const anchor = useMemo(
      () => ({
        getBoundingClientRect: (): DOMRect => {
          const current = latest.current;
          return toDOMRect(
            current.position && current.canvas
              ? getCubeNodeScreenRect(
                  current.position,
                  current.transform,
                  current.canvas.getBoundingClientRect(),
                )
              : { left: 0, top: 0, width: 0, height: 0 },
          );
        },
      }),
      [],
    );
    if (nodeId === undefined || !position || !canvas) {
      return null;
    }
    const canvasRect = canvas.getBoundingClientRect();
    const inView = isCubeNodeInView(
      getCubeNodeScreenRect(position, transform, canvasRect),
      canvasRect,
    );
    return (
      <BasePopper
        open={true}
        anchorEl={anchor}
        placement="bottom"
        modifiers={MODIFIERS}
        style={{
          zIndex: CUBE_NODE_EDITOR_Z_INDEX,
          width: CUBE_NODE_EDITOR_WIDTH,
          visibility: inView ? undefined : 'hidden',
        }}
      >
        {/* a right-click in the editor is the editor's, never the canvas's menu */}
        <div onContextMenu={(event) => event.stopPropagation()}>
          <CubeNodeEditorPanel editorState={editorState} variant="float" />
        </div>
      </BasePopper>
    );
  },
);
