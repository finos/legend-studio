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

import { noop } from '@finos/legend-shared';
import {
  ControlButton,
  getViewportForBounds,
  type Rect,
  useNodesInitialized,
  useReactFlow,
  useStore,
  type Viewport,
} from '@xyflow/react';
import { useCallback, useEffect } from 'react';

// How the editor's canvas and a definition flow fit their graph in view:
// apart from either, so a flow loads none of the editor's canvas

// little padding, so a long flow keeps its text as large as it can
const FIT_VIEW_OPTIONS = { padding: 0.1, maxZoom: 1 };
export const CUBE_CANVAS_MIN_ZOOM = 0.2;
export const CUBE_CANVAS_MAX_ZOOM = 1.5;
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
    CUBE_CANVAS_MIN_ZOOM,
    FIT_VIEW_OPTIONS.maxZoom,
    FIT_VIEW_OPTIONS.padding,
  );
  return { x: CUBE_CANVAS_LEFT_MARGIN - bounds.x * zoom, y, zoom };
};

/**
 * Fits the graph to the left (`getCubeCanvasLeftAlignedViewport`) whenever
 * the layout moves a node, as its signature says, or the canvas changes size
 * (e.g. the splitter above the grid moves), once React Flow has measured
 * every node. Gives the fit, for a control to do it again.
 */
export const useCubeCanvasFitToLeft = (
  layoutSignature: string,
): (() => void) => {
  const { getNodes, getNodesBounds, setViewport } = useReactFlow();
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
  return fitToLeft;
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

/** The zoom controls' fit view button, in place of React Flow's, which centres the graph */
export const CubeCanvasFitViewButton: React.FC<{ onClick: () => void }> = (
  props,
) => (
  <ControlButton
    className="react-flow__controls-fitview"
    title="fit view"
    aria-label="fit view"
    onClick={props.onClick}
  >
    <FitViewIcon />
  </ControlButton>
);
