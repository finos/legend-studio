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
  ContextMenu,
  LayerGroupIcon,
  TimesIcon,
  Tooltip,
} from '@finos/legend-art';
import type { QueryNode } from '@finos/legend-cube';
import { Handle, type NodeProps, Position } from '@xyflow/react';
import { observer } from 'mobx-react-lite';
import { useState } from 'react';
import {
  RUNNING_NODE_LABEL,
  RUNNING_NODE_TITLE,
} from '../../__lib__/LegendCubeHelpText.js';
import { LEGEND_CUBE_TEST_ID } from '../../__lib__/LegendCubeTesting.js';
import {
  CUBE_TOUR_ANCHOR,
  cubeTourAnchor,
} from '../../__lib__/LegendCubeTour.js';
import type { CubeEditorState } from '../../stores/CubeEditorState.js';
import {
  CUBE_FOLDED_INPUT_HANDLE_ID,
  CUBE_OUTPUT_HANDLE_ID,
  type CubeCanvasContainerNode,
  getCubeCanvasNodeLabel,
  getCubeCanvasNodeStatus,
} from './CubeCanvasElements.js';
import { CubeContainerContextMenu } from './CubeCanvasContainerMenu.js';
import { CUBE_CANVAS_FRAME_HEAD_HEIGHT } from './CubeCanvasLayout.js';
import { useCubeCanvasEditorState } from './CubeCanvasContext.js';

// A container of steps (PLAN §11.29), as Alteryx's Tool Container: open, a
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

/** How the canvas shows a container on its minimap: a tint of its plane */
export const CUBE_CANVAS_CONTAINER_MINIMAP_COLOR =
  'color-mix(in srgb, var(--color-accent) 20%, transparent)';

const CONTAINER_MENU_PROPS = { elevation: 7 };

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

/** The title being renamed: Enter or leaving it applies, Escape doesn't */
const CubeCanvasContainerTitleInput = observer(
  (props: { containerId: string; title: string }) => {
    const { containerId, title } = props;
    const editorState = useCubeCanvasEditorState();
    const [draft, setDraft] = useState(title);
    const apply = (): void => {
      if (
        editorState.renamingContainerId === containerId &&
        editorState.nodeEditor.finish()
      ) {
        editorState.renameContainer(containerId, draft.trim() || title);
      }
      editorState.stopRenamingContainer();
    };
    return (
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
            editorState.stopRenamingContainer();
          }
        }}
      />
    );
  },
);

/** The container's title, renamed in place on a double-click, or from its menu */
const CubeCanvasContainerTitle = observer(
  (props: { containerId: string; title: string; className?: string }) => {
    const { containerId, title, className } = props;
    const editorState = useCubeCanvasEditorState();
    return editorState.renamingContainerId === containerId ? (
      <CubeCanvasContainerTitleInput containerId={containerId} title={title} />
    ) : (
      <span
        className={clsx('truncate', className)}
        title={
          editorState.readOnly ? title : `${title} (double-click to rename)`
        }
        onDoubleClick={(event) => {
          event.stopPropagation();
          editorState.startRenamingContainer(containerId);
        }}
      >
        {title || 'Untitled'}
      </span>
    );
  },
);

/**
 * An open container: a frame behind its steps, which lets the canvas have
 * every press but its head's. The head has its fold, its title, how many
 * steps it holds, and its ×, which takes the container away, not its steps;
 * right-clicked, it has its menu.
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
        <ContextMenu
          className="pointer-events-auto"
          content={
            <CubeContainerContextMenu
              editorState={editorState}
              containerId={container.id}
            />
          }
          menuProps={CONTAINER_MENU_PROPS}
        >
          <div
            className="legend-cube__container-head nodrag nopan flex items-center gap-1 px-1 text-sm text-[var(--color-text-secondary)]"
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
        </ContextMenu>
      </div>
    );
  },
);

/**
 * A folded container: one box in its steps' place, the lines into and out
 * of them at its sides. It shows what they would: an error or a missing
 * input in any of them, and the Output label when the output step is one of
 * them. ▸, a double-click, or Enter on the box (`CubeCanvas`) opens it;
 * right-clicked, it has its menu.
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
    const open = (): void => {
      if (editorState.nodeEditor.finish()) {
        editorState.setContainerFolded(container.id, false);
      }
    };
    return (
      <ContextMenu
        className="h-full w-full"
        content={
          <CubeContainerContextMenu
            editorState={editorState}
            containerId={container.id}
          />
        }
        menuProps={CONTAINER_MENU_PROPS}
      >
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
            // the tour's card on the output step points at the box that holds it
            {...(isCapture
              ? cubeTourAnchor(CUBE_TOUR_ANCHOR.RUNNING_STEP)
              : {})}
            onDoubleClick={() => !editorState.readOnly && open()}
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
              onClick={open}
            >
              <ChevronRightIcon />
            </button>
            {isCapture && (
              // its steps hold the output step: the step's own label, a
              // caption above its corner
              <span
                className="absolute bottom-full right-1 mb-0.5 cursor-default select-none text-xs font-semibold uppercase leading-4 tracking-wider text-[var(--color-text-secondary)]"
                title={RUNNING_NODE_TITLE}
              >
                {RUNNING_NODE_LABEL}
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
      </ContextMenu>
    );
  },
);
