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
  ChevronDownIcon,
  ChevronRightIcon,
  clsx,
  LayerGroupIcon,
  TimesIcon,
  Tooltip,
} from '@finos/legend-art';
import type { QueryNode } from '@finos/legend-cube';
import { Handle, type NodeProps, Position } from '@xyflow/react';
import { observer } from 'mobx-react-lite';
import { useState } from 'react';
import { RUNNING_NODE_LABEL } from '../../__lib__/LegendCubeHelpText.js';
import { LEGEND_CUBE_TEST_ID } from '../../__lib__/LegendCubeTesting.js';
import type { CubeEditorState } from '../../stores/CubeEditorState.js';
import {
  CUBE_FOLDED_INPUT_HANDLE_ID,
  CUBE_OUTPUT_HANDLE_ID,
  type CubeCanvasContainerNode,
  getCubeCanvasNodeLabel,
  getCubeCanvasNodeStatus,
} from './CubeCanvasElements.js';
import { CUBE_CANVAS_FRAME_HEAD_HEIGHT } from './CubeCanvasLayout.js';
import { useCubeCanvasEditorState } from './CubeCanvasContext.js';

// A container of steps (PLAN §11.28), as Alteryx's Tool Container: open, a
// see-through plane behind its steps with a head; folded, one box in their
// place. Its colours mix the theme's, so it reads in the dark theme and the
// light one alike.

const FRAME_STYLE = {
  background: 'color-mix(in srgb, var(--color-accent) 7%, transparent)',
  borderColor: 'color-mix(in srgb, var(--color-accent) 45%, transparent)',
};

/** A stack of cards: the box holds several steps */
const FOLDED_STYLE = {
  boxShadow:
    '4px 4px 0 -1px var(--color-bg-panel), 4px 4px 0 0 var(--color-border-default), 8px 8px 0 -1px var(--color-bg-panel), 8px 8px 0 0 var(--color-border-default)',
};

const stepCount = (count: number): string =>
  `${count} ${count === 1 ? 'step' : 'steps'}`;

/** Its steps, one a line, for the folded box's tooltip */
const describeSteps = (
  editorState: CubeEditorState,
  nodes: readonly QueryNode[],
): string =>
  nodes
    .map(
      (node) =>
        getCubeCanvasNodeLabel(node, editorState.registry.get(node.type)?.label)
          .title,
    )
    .join('\n');

/** The container's title, renamed in place on a double-click */
const CubeCanvasContainerTitle = observer(
  (props: { containerId: string; title: string; className?: string }) => {
    const { containerId, title, className } = props;
    const editorState = useCubeCanvasEditorState();
    const [draft, setDraft] = useState<string | undefined>(undefined);
    const apply = (): void => {
      if (draft !== undefined && editorState.nodeEditor.finish()) {
        editorState.renameContainer(containerId, draft.trim() || title);
      }
      setDraft(undefined);
    };
    return draft === undefined ? (
      <span
        className={clsx('truncate', className)}
        title={
          editorState.readOnly ? title : `${title} (double-click to rename)`
        }
        onDoubleClick={(event) => {
          event.stopPropagation();
          if (!editorState.readOnly) {
            setDraft(title);
          }
        }}
      >
        {title}
      </span>
    ) : (
      <input
        className="nodrag nopan min-w-0 flex-1 rounded border border-[var(--color-accent)] bg-[var(--color-bg-input)] px-1 text-[var(--color-text-primary)]"
        aria-label="Container title"
        value={draft}
        autoFocus={true}
        // the whole title, to type over
        onFocus={(event) => event.target.select()}
        onChange={(event) => setDraft(event.target.value)}
        onBlur={apply}
        onKeyDown={(event) => {
          event.stopPropagation();
          if (event.key === 'Enter') {
            apply();
          } else if (event.key === 'Escape') {
            setDraft(undefined);
          }
        }}
      />
    );
  },
);

/**
 * An open container: a frame behind its steps, which lets the canvas have
 * every press but its head's. The head has its fold, its title, how many
 * steps it holds, and its ×, which takes the container away, not its steps.
 */
export const CubeCanvasContainerFrame = observer(
  (props: NodeProps<CubeCanvasContainerNode>) => {
    const { place } = props.data;
    const { container, steps } = place;
    const editorState = useCubeCanvasEditorState();
    const { readOnly } = editorState;
    return (
      <div
        className="legend-cube__container h-full w-full rounded-md border"
        style={FRAME_STYLE}
        data-testid={LEGEND_CUBE_TEST_ID.CANVAS_CONTAINER}
        aria-label={`Container: ${container.title}`}
      >
        <div
          className="legend-cube__container-head nodrag nopan pointer-events-auto flex items-center gap-1 px-1 text-sm text-[var(--color-text-secondary)]"
          style={{ height: CUBE_CANVAS_FRAME_HEAD_HEIGHT }}
        >
          <button
            className="flex h-5 w-5 shrink-0 items-center justify-center rounded hover:bg-[var(--color-bg-hover)] disabled:opacity-50"
            title="Fold the container to one box"
            aria-label="Fold the container"
            disabled={readOnly}
            onClick={() =>
              editorState.nodeEditor.finish() &&
              editorState.setContainerFolded(container.id, true)
            }
          >
            <ChevronDownIcon />
          </button>
          <LayerGroupIcon className="shrink-0" aria-hidden={true} />
          <CubeCanvasContainerTitle
            containerId={container.id}
            title={container.title}
            className="font-medium text-[var(--color-text-primary)]"
          />
          <span className="shrink-0 text-[var(--color-text-muted)]">
            {stepCount(steps.length)}
          </span>
          <button
            className="ml-auto flex h-5 w-5 shrink-0 items-center justify-center rounded hover:bg-[var(--color-bg-hover)] disabled:opacity-50"
            title="Take the container away; its steps stay"
            aria-label="Take the container away"
            disabled={readOnly}
            onClick={() =>
              editorState.nodeEditor.finish() &&
              editorState.removeContainer(container.id)
            }
          >
            <TimesIcon />
          </button>
        </div>
      </div>
    );
  },
);

/**
 * A folded container: one box in its steps' place, the lines into and out
 * of them at its sides. It shows what they would: an error or a missing
 * input in any of them, and the step Execute runs.
 */
export const CubeCanvasFoldedContainer = observer(
  (props: NodeProps<CubeCanvasContainerNode>) => {
    const { place } = props.data;
    const { container } = place;
    const editorState = useCubeCanvasEditorState();
    const nodes = place.steps
      .map((id) => editorState.document.query.getNode(id))
      .filter((node): node is QueryNode => node !== undefined);
    const statuses = nodes.map((node) =>
      getCubeCanvasNodeStatus(editorState, node),
    );
    const isCapture = statuses.some((status) => status.isCapture);
    const isInvalid = statuses.some(
      (status) => status.isInvalid || status.hasEngineError,
    );
    const isIncomplete = statuses.some((status) => status.isIncomplete);
    // a side shows its handle when a line comes to it: one holding a source
    // may have no input, one holding the last step no output
    const { connections } = editorState.document.query;
    const hasInput = connections.some(
      (connection) =>
        place.steps.includes(connection.target) &&
        !place.steps.includes(connection.source),
    );
    const hasOutput = connections.some(
      (connection) =>
        place.steps.includes(connection.source) &&
        !place.steps.includes(connection.target),
    );
    const unfold = (): void => {
      if (editorState.nodeEditor.finish()) {
        editorState.setContainerFolded(container.id, false);
      }
    };
    return (
      <>
        <Handle
          id={CUBE_FOLDED_INPUT_HANDLE_ID}
          type="target"
          position={Position.Left}
          isConnectable={false}
          style={hasInput ? undefined : { visibility: 'hidden' }}
        />
        <Tooltip
          title={
            <div className="whitespace-pre-line">
              {describeSteps(editorState, nodes)}
            </div>
          }
          placement="top"
          enterDelay={500}
          enterNextDelay={500}
          disableInteractive={true}
        >
          <div
            className={clsx(
              'legend-cube__folded-container nodrag nopan relative flex h-full w-full items-center gap-2 rounded border bg-[var(--color-bg-panel)] px-2 text-base text-[var(--color-text-primary)]',
              isInvalid
                ? 'border-[var(--color-status-error)]'
                : isIncomplete
                  ? 'border-dashed border-[var(--color-status-warn)]'
                  : 'border-[var(--color-border-default)]',
              { 'ring-2 ring-[var(--color-accent)]': isCapture },
            )}
            style={FOLDED_STYLE}
            data-testid={LEGEND_CUBE_TEST_ID.CANVAS_FOLDED_CONTAINER}
            aria-label={`Folded container: ${container.title}`}
            onDoubleClick={() => !editorState.readOnly && unfold()}
          >
            <LayerGroupIcon
              className="shrink-0 text-lg text-[var(--color-text-secondary)]"
              aria-hidden={true}
            />
            <span className="flex min-w-0 flex-col leading-tight">
              <CubeCanvasContainerTitle
                containerId={container.id}
                title={container.title}
                className="line-clamp-1 font-medium"
              />
              <span className="truncate text-sm text-[var(--color-text-muted)]">
                {`${stepCount(nodes.length)}, folded`}
              </span>
            </span>
            <button
              className="ml-auto flex h-6 w-6 shrink-0 items-center justify-center rounded hover:bg-[var(--color-bg-hover)] disabled:opacity-50"
              title="Open the container"
              aria-label="Open the container"
              disabled={editorState.readOnly}
              onClick={unfold}
            >
              <ChevronRightIcon />
            </button>
            {isCapture && (
              // its steps hold the one Execute runs
              <span className="absolute -top-2 right-2 rounded-sm bg-[var(--color-accent)] px-1 text-xs font-medium leading-4 text-[var(--color-text-on-accent)]">
                {`▶ ${RUNNING_NODE_LABEL}`}
              </span>
            )}
          </div>
        </Tooltip>
        <Handle
          id={CUBE_OUTPUT_HANDLE_ID}
          type="source"
          position={Position.Right}
          isConnectable={false}
          style={hasOutput ? undefined : { visibility: 'hidden' }}
        />
      </>
    );
  },
);
