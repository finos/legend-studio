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

import { Tooltip } from '@finos/legend-art';
import {
  type Edge,
  Handle,
  type Node,
  type NodeProps,
  Position,
} from '@xyflow/react';
import { CUBE_DEFINITION_FLOW_LABEL } from '../../__lib__/LegendCubeDefinitionFlowLabels.js';
import { LEGEND_CUBE_TEST_ID } from '../../__lib__/LegendCubeTesting.js';
import { getTypeFamilyLabel } from '../../__lib__/LegendCubeTypeLabels.js';
import type {
  CubeDefinitionFlowReading,
  CubeDefinitionParameter,
} from '../../graph-manager/CubeDefinitionReader.js';
import { CubeColumnTypeIcon } from '../CubeColumnTypeIcon.js';
import {
  CUBE_CANVAS_NODE_WIDTH,
  type CubeCanvasPosition,
} from './CubeCanvasLayout.js';

// A definition's parameters on its flow (agreed with the user, 2026-11-10):
// each a box of its own, a row above the steps, centred over the steps that
// read it, with a dashed wire into the top of each

export const CUBE_DEFINITION_PARAMETER_TYPE = 'cubeDefinitionParameter';
/** A parameter's handle, at the bottom of its box */
const PARAMETER_HANDLE_ID = 'parameter';
/** A step's handle for the parameters it reads, at its top */
const STEP_PARAMETERS_HANDLE_ID = 'parameters';
const PARAMETER_WIDTH = 176;
const PARAMETER_HEIGHT = 36;
/** Between the parameters' row and the steps under it */
const PARAMETER_ROW_GAP = 56;
/** Between two parameters side by side */
const PARAMETER_GAP = 12;
/** A parameter's node id: no step's id has a colon */
const PARAMETER_NODE_ID_PREFIX = 'parameter:';

type CubeDefinitionParameterData = {
  readonly parameter: CubeDefinitionParameter;
  /** Its declaration, its type in words and the steps that read it, one a line */
  readonly tooltip: string;
};
export type CubeDefinitionParameterNode = Node<
  CubeDefinitionParameterData,
  typeof CUBE_DEFINITION_PARAMETER_TYPE
>;

/** Its type and how many values it takes, as the box shows them, e.g. `StrictDate`, `String[*]` */
const getParameterTypeText = (
  parameter: CubeDefinitionParameter,
): string | undefined =>
  parameter.type
    ? `${parameter.type.displayName}${
        parameter.multiplicity === undefined || parameter.multiplicity === '[1]'
          ? ''
          : parameter.multiplicity
      }`
    : undefined;

/**
 * Its declaration, as the definition's Pure has it, `businessDate:
 * StrictDate[1]`; its type in words, as the editors say a column's, with
 * whether it may be left out or takes a list; then the steps that read it
 */
const describeParameter = (
  parameter: CubeDefinitionParameter,
  flow: CubeDefinitionFlowReading,
): string => {
  const { name, type, multiplicity } = parameter;
  const takes =
    multiplicity === '[0..1]'
      ? CUBE_DEFINITION_FLOW_LABEL.PARAMETER_OPTIONAL
      : multiplicity?.endsWith('*]')
        ? CUBE_DEFINITION_FLOW_LABEL.PARAMETER_LIST
        : undefined;
  const readers = parameter.stepIds.flatMap(
    (id) => flow.query.getNode(id)?.describe() ?? [],
  );
  return [
    type ? `${name}: ${type.fullName}${multiplicity ?? ''}` : name,
    ...(type
      ? [
          [getTypeFamilyLabel(type.family) ?? type.displayName, takes]
            .filter((part) => part !== undefined)
            .join(', '),
        ]
      : []),
    ...(readers.length
      ? [CUBE_DEFINITION_FLOW_LABEL.PARAMETER_READ_BY, ...readers]
      : [CUBE_DEFINITION_FLOW_LABEL.PARAMETER_UNREAD]),
  ].join('\n');
};

/**
 * A parameter: `$` and its name, its type's icon, and its type, in a dashed
 * box, so it reads apart from the steps; its tooltip says the rest
 */
export const CubeDefinitionParameterBox: React.FC<
  NodeProps<CubeDefinitionParameterNode>
> = (props) => {
  const { parameter, tooltip } = props.data;
  const typeText = getParameterTypeText(parameter);
  return (
    <>
      <Tooltip
        title={<div className="whitespace-pre-line">{tooltip}</div>}
        placement="top"
        enterDelay={500}
        enterNextDelay={500}
        disableInteractive={true}
        describeChild={true}
        slotProps={{ tooltip: { className: 'max-w-[40rem]' } }}
      >
        <div
          className="flex h-full w-full items-center gap-1.5 rounded-full border border-dashed border-[var(--color-accent)] bg-[var(--color-bg-panel)] px-3 text-sm text-[var(--color-text-primary)]"
          aria-description={tooltip}
          data-testid={LEGEND_CUBE_TEST_ID.DEFINITION_FLOW_PARAMETER}
        >
          {parameter.type && (
            <CubeColumnTypeIcon
              type={parameter.type}
              className="text-[var(--color-text-secondary)]"
            />
          )}
          <span className="min-w-0 truncate font-mono">${parameter.name}</span>
          {typeText !== undefined && (
            <span className="ml-auto shrink-0 text-[var(--color-text-muted)]">
              {typeText}
            </span>
          )}
        </div>
      </Tooltip>
      <Handle
        id={PARAMETER_HANDLE_ID}
        type="source"
        position={Position.Bottom}
        isConnectable={false}
      />
    </>
  );
};

/** The handle a step's parameters come in by, at its top, unseen: the wires show it */
export const CubeDefinitionStepParametersHandle: React.FC = () => (
  <Handle
    id={STEP_PARAMETERS_HANDLE_ID}
    type="target"
    position={Position.Top}
    isConnectable={false}
    className="opacity-0"
  />
);

/** That handle, where React Flow places it before it measures the step */
export const CUBE_DEFINITION_STEP_PARAMETERS_HANDLE = {
  id: STEP_PARAMETERS_HANDLE_ID,
  type: 'target' as const,
  position: Position.Top,
  x: CUBE_CANVAS_NODE_WIDTH / 2,
  y: 0,
};

/**
 * The parameters' boxes, in the order the definition takes them, a row above
 * the steps: each centred over the steps that read it, those over the same
 * steps side by side, and one no step reads at the row's start; a box that
 * would overlap the one before it moves right
 */
export const buildCubeDefinitionParameterNodes = (
  flow: CubeDefinitionFlowReading,
  positions: ReadonlyMap<string, CubeCanvasPosition>,
): CubeDefinitionParameterNode[] => {
  const steps = [...positions.values()];
  if (!flow.parameters.length || !steps.length) {
    return [];
  }
  const top = Math.min(...steps.map((position) => position.y));
  const left = Math.min(...steps.map((position) => position.x));
  // by the middle of the steps that read them
  const groups = new Map<number, CubeDefinitionParameter[]>();
  flow.parameters.forEach((parameter) => {
    const readers = parameter.stepIds.flatMap((id) => positions.get(id) ?? []);
    const middle = readers.length
      ? readers.reduce((sum, position) => sum + position.x, 0) /
          readers.length +
        CUBE_CANVAS_NODE_WIDTH / 2
      : left + PARAMETER_WIDTH / 2;
    groups.set(middle, [...(groups.get(middle) ?? []), parameter]);
  });
  const xs = new Map<CubeDefinitionParameter, number>();
  let end = -Infinity;
  [...groups.entries()]
    .sort(([a], [b]) => a - b)
    .forEach(([middle, group]) => {
      const width =
        group.length * PARAMETER_WIDTH + (group.length - 1) * PARAMETER_GAP;
      const start = Math.max(middle - width / 2, end + PARAMETER_GAP);
      group.forEach((parameter, index) =>
        xs.set(parameter, start + index * (PARAMETER_WIDTH + PARAMETER_GAP)),
      );
      end = start + width;
    });
  return flow.parameters.map((parameter) => ({
    id: `${PARAMETER_NODE_ID_PREFIX}${parameter.name}`,
    type: CUBE_DEFINITION_PARAMETER_TYPE,
    position: {
      x: xs.get(parameter) ?? left,
      y: top - PARAMETER_ROW_GAP - PARAMETER_HEIGHT,
    },
    width: PARAMETER_WIDTH,
    height: PARAMETER_HEIGHT,
    handles: [
      {
        id: PARAMETER_HANDLE_ID,
        type: 'source',
        position: Position.Bottom,
        x: PARAMETER_WIDTH / 2,
        y: PARAMETER_HEIGHT,
      },
    ],
    data: { parameter, tooltip: describeParameter(parameter, flow) },
  }));
};

/** A dashed wire from each parameter into the top of each step that reads it */
export const buildCubeDefinitionParameterEdges = (
  flow: CubeDefinitionFlowReading,
): Edge[] =>
  flow.parameters.flatMap((parameter) =>
    parameter.stepIds.map((stepId) => ({
      id: `${PARAMETER_NODE_ID_PREFIX}${parameter.name}->${stepId}`,
      source: `${PARAMETER_NODE_ID_PREFIX}${parameter.name}`,
      target: stepId,
      sourceHandle: PARAMETER_HANDLE_ID,
      targetHandle: STEP_PARAMETERS_HANDLE_ID,
      focusable: false,
      style: {
        stroke: 'var(--color-accent)',
        strokeDasharray: '5 4',
        strokeWidth: 1.5,
      },
    })),
  );
