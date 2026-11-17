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
  CodeIcon,
  FunctionIcon,
  Tooltip,
} from '@finos/legend-art';
import { Handle, type Node, type NodeProps, Position } from '@xyflow/react';
import { CUBE_DEFINITION_FLOW_LABEL } from '../../__lib__/LegendCubeDefinitionFlowLabels.js';
import { LEGEND_CUBE_TEST_ID } from '../../__lib__/LegendCubeTesting.js';
import { CubeDefinitionFunctionClosedReason } from '../../graph-manager/CubeDefinitionFunctions.js';
import type { CubeDefinitionFunctionContainer } from '../../graph-manager/CubeDefinitionReader.js';
import {
  CUBE_FOLDED_INPUT_HANDLE_ID,
  CUBE_OUTPUT_HANDLE_ID,
} from './CubeCanvasElements.js';
import {
  CUBE_CANVAS_FOLDED_STYLE,
  CUBE_CANVAS_FRAME_STYLE,
} from './CubeCanvasContainerStyle.js';
import {
  CUBE_CANVAS_FRAME_HEAD_HEIGHT,
  type CubeCanvasContainerPlace,
} from './CubeCanvasLayout.js';

// PLAN §11.33: a call of a user-defined function in a
// definition's flow, as a container (PLAN §11.29) of its body's steps: its
// name and values on top; folded, one box. The flow is read-only, so folding
// is the viewer's own: nothing saves it.

export const CUBE_DEFINITION_FUNCTION_FRAME_TYPE =
  'cubeDefinitionFunctionFrame';
export const CUBE_DEFINITION_FUNCTION_BOX_TYPE = 'cubeDefinitionFunctionBox';

export type CubeDefinitionFunctionData = {
  readonly place: CubeCanvasContainerPlace;
  readonly call: CubeDefinitionFunctionContainer;
  /** How many steps it holds, the steps of the calls in it included */
  readonly stepCount: number;
  readonly onToggle: (callId: string) => void;
  readonly onShowFunction?:
    | ((call: CubeDefinitionFunctionContainer) => void)
    | undefined;
};
export type CubeDefinitionFunctionNode = Node<
  CubeDefinitionFunctionData,
  | typeof CUBE_DEFINITION_FUNCTION_FRAME_TYPE
  | typeof CUBE_DEFINITION_FUNCTION_BOX_TYPE
>;

/** The call as Pure writes it: `ordersSince(%2026-01-01, 'EMEA')` */
export const printCubeDefinitionCall = (
  call: CubeDefinitionFunctionContainer,
): string => `${call.shortName}(${call.values.join(', ')})`;

/** What the call's tooltip says: its function, where it is from, and what it returns */
export const describeCubeDefinitionCall = (
  call: CubeDefinitionFunctionContainer,
): string =>
  [
    call.name,
    ...(call.signature ? [call.signature] : []),
    ...(call.origin ? [CUBE_DEFINITION_FLOW_LABEL.CALL_FROM(call.origin)] : []),
  ].join('\n');

const ShowFunctionButton: React.FC<{
  call: CubeDefinitionFunctionContainer;
  onShowFunction: (call: CubeDefinitionFunctionContainer) => void;
}> = (props) => (
  <button
    type="button"
    className="nodrag nopan flex h-5 shrink-0 items-center gap-1 rounded px-1 text-xs text-[var(--color-text-secondary)] hover:bg-[var(--color-bg-hover)]"
    title={CUBE_DEFINITION_FLOW_LABEL.SHOW_FUNCTION(props.call.name)}
    aria-label={CUBE_DEFINITION_FLOW_LABEL.SHOW_FUNCTION(props.call.name)}
    onClick={(event) => {
      event.stopPropagation();
      props.onShowFunction(props.call);
    }}
  >
    <CodeIcon aria-hidden={true} />
  </button>
);

/**
 * An opened call: a frame behind its body's steps, with its name and values
 * on top; its fold, and Pure, which shows the function's Pure
 */
export const CubeDefinitionFunctionFrame: React.FC<
  NodeProps<CubeDefinitionFunctionNode>
> = (props) => {
  const { call, stepCount: count, onToggle, onShowFunction } = props.data;
  return (
    <div
      className="legend-cube__container legend-cube__function-container h-full w-full rounded-md border"
      style={CUBE_CANVAS_FRAME_STYLE}
      data-testid={LEGEND_CUBE_TEST_ID.CANVAS_CONTAINER}
      aria-label={`Function: ${call.name}`}
    >
      <div
        className="legend-cube__container-head nodrag nopan pointer-events-auto flex items-center gap-1 px-1 text-sm text-[var(--color-text-secondary)]"
        style={{ height: CUBE_CANVAS_FRAME_HEAD_HEIGHT }}
      >
        <button
          type="button"
          className="flex h-5 w-5 shrink-0 items-center justify-center rounded hover:bg-[var(--color-bg-hover)]"
          title={CUBE_DEFINITION_FLOW_LABEL.FOLD_CALL}
          aria-label={CUBE_DEFINITION_FLOW_LABEL.FOLD_CALL}
          onClick={(event) => {
            event.stopPropagation();
            onToggle(call.id);
          }}
        >
          <ChevronDownIcon />
        </button>
        <FunctionIcon className="shrink-0" aria-hidden={true} />
        <Tooltip
          title={
            <div className="whitespace-pre-line">
              {describeCubeDefinitionCall(call)}
            </div>
          }
          placement="top"
          enterDelay={500}
          disableInteractive={true}
          slotProps={{ tooltip: { className: 'max-w-[40rem]' } }}
        >
          <span
            className="min-w-[4rem] truncate font-mono font-medium text-[var(--color-text-primary)]"
            aria-description={CUBE_DEFINITION_FLOW_LABEL.STEP_COUNT(count)}
          >
            {printCubeDefinitionCall(call)}
          </span>
        </Tooltip>
        {call.origin && (
          <span
            className="min-w-0 truncate rounded border border-[var(--color-border-default)] px-1 text-xs text-[var(--color-text-muted)]"
            title={CUBE_DEFINITION_FLOW_LABEL.CALL_FROM(call.origin)}
          >
            {call.origin.split(':')[1] ?? call.origin}
          </span>
        )}
        <span className="ml-auto" />
        {onShowFunction && (
          <ShowFunctionButton call={call} onShowFunction={onShowFunction} />
        )}
      </div>
    </div>
  );
};

/**
 * A folded call: one box in its steps' place, the lines into and out of them
 * at its sides. ▸ or a double-click opens it.
 */
export const CubeDefinitionFunctionBox: React.FC<
  NodeProps<CubeDefinitionFunctionNode>
> = (props) => {
  const { call, stepCount: count, onToggle, onShowFunction } = props.data;
  return (
    <>
      <Handle
        id={CUBE_FOLDED_INPUT_HANDLE_ID}
        type="target"
        position={Position.Left}
        isConnectable={false}
      />
      <Tooltip
        title={
          <div className="whitespace-pre-line">
            {describeCubeDefinitionCall(call)}
          </div>
        }
        placement="top"
        enterDelay={500}
        disableInteractive={true}
        slotProps={{ tooltip: { className: 'max-w-[40rem]' } }}
      >
        <div
          className="legend-cube__folded-container nodrag nopan relative flex h-full w-full items-center gap-2 rounded border border-[var(--color-border-default)] bg-[var(--color-bg-panel)] px-2 text-base text-[var(--color-text-primary)]"
          style={CUBE_CANVAS_FOLDED_STYLE}
          data-testid={LEGEND_CUBE_TEST_ID.CANVAS_FOLDED_CONTAINER}
          aria-label={`Folded function: ${call.name}`}
          onDoubleClick={() => onToggle(call.id)}
        >
          <FunctionIcon
            className="shrink-0 text-lg text-[var(--color-text-secondary)]"
            aria-hidden={true}
          />
          <span className="flex min-w-0 flex-col leading-tight">
            <span className="truncate font-mono font-medium">
              {printCubeDefinitionCall(call)}
            </span>
            <span className="truncate text-sm text-[var(--color-text-muted)]">
              {CUBE_DEFINITION_FLOW_LABEL.FOLDED(
                CUBE_DEFINITION_FLOW_LABEL.STEP_COUNT(count),
              )}
            </span>
          </span>
          <span className="ml-auto flex shrink-0 items-center">
            {onShowFunction && (
              <ShowFunctionButton call={call} onShowFunction={onShowFunction} />
            )}
            <button
              type="button"
              className="flex h-6 w-6 shrink-0 items-center justify-center rounded hover:bg-[var(--color-bg-hover)]"
              title={CUBE_DEFINITION_FLOW_LABEL.OPEN_CALL}
              aria-label={CUBE_DEFINITION_FLOW_LABEL.OPEN_CALL}
              onClick={(event) => {
                event.stopPropagation();
                onToggle(call.id);
              }}
            >
              <ChevronRightIcon />
            </button>
          </span>
        </div>
      </Tooltip>
      <Handle
        id={CUBE_OUTPUT_HANDLE_ID}
        type="source"
        position={Position.Right}
        isConnectable={false}
      />
    </>
  );
};

/** Why a call is one box, in words, for its step's second line and tooltip */
export const describeClosedCall = (
  call: CubeDefinitionFunctionContainer,
): { readonly line: string; readonly why: string } => {
  const line = call.declaredColumns
    ? CUBE_DEFINITION_FLOW_LABEL.CALL_COLUMNS_DECLARED(
        call.declaredColumns.length,
      )
    : CUBE_DEFINITION_FLOW_LABEL.CALL_COLUMNS_NOT_DECLARED;
  switch (call.closedReason) {
    case CubeDefinitionFunctionClosedReason.NOT_FOUND:
      return {
        line: CUBE_DEFINITION_FLOW_LABEL.CALL_NOT_FOUND,
        why: CUBE_DEFINITION_FLOW_LABEL.CALL_CLOSED_NOT_FOUND,
      };
    case CubeDefinitionFunctionClosedReason.AMBIGUOUS:
      return { line, why: CUBE_DEFINITION_FLOW_LABEL.CALL_CLOSED_AMBIGUOUS };
    case CubeDefinitionFunctionClosedReason.STATEMENTS:
      return { line, why: CUBE_DEFINITION_FLOW_LABEL.CALL_CLOSED_STATEMENTS };
    case CubeDefinitionFunctionClosedReason.SHARED_INPUT:
      return {
        line,
        why: CUBE_DEFINITION_FLOW_LABEL.CALL_CLOSED_SHARED_INPUT,
      };
    case CubeDefinitionFunctionClosedReason.CAPTURE:
      return { line, why: CUBE_DEFINITION_FLOW_LABEL.CALL_CLOSED_CAPTURE };
    case CubeDefinitionFunctionClosedReason.RECURSION:
      return { line, why: CUBE_DEFINITION_FLOW_LABEL.CALL_CLOSED_RECURSION };
    case CubeDefinitionFunctionClosedReason.DEPTH:
      return { line, why: CUBE_DEFINITION_FLOW_LABEL.CALL_CLOSED_DEPTH };
    case CubeDefinitionFunctionClosedReason.NOT_DRAWABLE:
    default:
      return {
        line,
        why: CUBE_DEFINITION_FLOW_LABEL.CALL_CLOSED_NOT_DRAWABLE(
          call.closedMessage,
        ),
      };
  }
};
