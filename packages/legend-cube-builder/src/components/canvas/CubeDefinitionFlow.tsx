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

import { clsx, Tooltip } from '@finos/legend-art';
import {
  createNodeRegistry,
  IngestDatasetSource,
  type QueryNode,
} from '@finos/legend-cube';
import {
  Background,
  Controls,
  type Edge,
  type Node,
  type NodeProps,
  ReactFlow,
  ReactFlowProvider,
} from '@xyflow/react';
// as the editor's canvas imports it: with the chunk that draws the flow
import '@xyflow/react/dist/style.css';
import { useMemo } from 'react';
import { CUBE_DEFINITION_FLOW_LABEL } from '../../__lib__/LegendCubeDefinitionFlowLabels.js';
import { LEGEND_CUBE_TEST_ID } from '../../__lib__/LegendCubeTesting.js';
import type { CubeDefinitionFlowReading } from '../../graph-manager/CubeDefinitionReader.js';
import {
  buildCubeCanvasEdges,
  buildCubeCanvasNodes,
  CUBE_CANVAS_EDGE_TYPE,
  type CubeCanvasFlowEdge,
  getCubeCanvasNodeLabel,
} from './CubeCanvasElements.js';
import { CubeCanvasEdge } from './CubeCanvasEdge.js';
import {
  buildCubeDefinitionParameterEdges,
  buildCubeDefinitionParameterNodes,
  CUBE_DEFINITION_PARAMETER_TYPE,
  CUBE_DEFINITION_STEP_PARAMETERS_HANDLE,
  CubeDefinitionParameterBox,
  type CubeDefinitionParameterNode,
  CubeDefinitionStepParametersHandle,
} from './CubeDefinitionFlowParameters.js';
import { layoutCubeQuery } from './CubeCanvasLayout.js';
import {
  CubeCanvasInputHandles,
  CubeCanvasNodeLabel,
  CubeCanvasOutputCaption,
  CubeCanvasOutputHandle,
} from './CubeCanvasNodeParts.js';
import {
  CUBE_CANVAS_MAX_ZOOM,
  CUBE_CANVAS_MIN_ZOOM,
  CubeCanvasFitViewButton,
  useCubeCanvasFitToLeft,
} from './CubeCanvasViewport.js';

// A definition's steps drawn read-only, for a host to embed, e.g. a data
// product viewer's access point: Cube's canvas as the editor lays it out,
// with nothing that edits, so none of the editor loads with it; and the
// definition's parameters, each wired into the steps that read it

const CUBE_DEFINITION_STEP_TYPE = 'cubeDefinitionStep';

type CubeDefinitionStepData = {
  readonly node: QueryNode;
  readonly icon: string | undefined;
  readonly title: string;
  readonly detail: string | undefined;
  /** Its description, and what the host should know about it, one a line */
  readonly tooltip: string;
  readonly isOutput: boolean;
  readonly isSelected: boolean;
  readonly isSelectable: boolean;
  /** Whether it reads any of the definition's parameters, whose wires come in at its top */
  readonly readsParameters: boolean;
};
type CubeDefinitionStepNode = Node<
  CubeDefinitionStepData,
  typeof CUBE_DEFINITION_STEP_TYPE
>;

/**
 * A step: its type's icon and its name, as the editor's canvas shows it; a
 * data set whose columns aren't known shows its name, as any other does,
 * and says so in its tooltip
 */
const CubeDefinitionStep: React.FC<NodeProps<CubeDefinitionStepNode>> = (
  props,
) => {
  const { node, icon, title, detail, tooltip, isOutput } = props.data;
  const { isSelected, isSelectable, readsParameters } = props.data;
  return (
    <>
      <CubeCanvasInputHandles node={node} connectable={false} />
      {readsParameters && <CubeDefinitionStepParametersHandle />}
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
          className={clsx(
            'legend-cube__node relative flex h-full w-full items-center gap-2 rounded border border-[var(--color-border-default)] bg-[var(--color-bg-panel)] px-2 text-base text-[var(--color-text-primary)]',
            {
              'cursor-pointer': isSelectable,
              'legend-cube__node--selected ring-2 ring-[var(--color-accent)]':
                isSelected,
            },
          )}
          aria-description={tooltip}
          aria-current={isSelected}
          data-testid={LEGEND_CUBE_TEST_ID.CANVAS_NODE}
        >
          <CubeCanvasNodeLabel icon={icon} title={title} detail={detail} />
          {isOutput && (
            <CubeCanvasOutputCaption
              title={CUBE_DEFINITION_FLOW_LABEL.OUTPUT_TITLE}
            />
          )}
        </div>
      </Tooltip>
      <CubeCanvasOutputHandle connectable={false} />
    </>
  );
};

// React Flow re-renders every node when these change identity
const NODE_TYPES = {
  [CUBE_DEFINITION_STEP_TYPE]: CubeDefinitionStep,
  [CUBE_DEFINITION_PARAMETER_TYPE]: CubeDefinitionParameterBox,
};
const EDGE_TYPES = { [CUBE_CANVAS_EDGE_TYPE]: CubeCanvasEdge };
const PRO_OPTIONS = { hideAttribution: true };

/** A step's description, a data set's named whether or not its columns are known */
const describeStep = (node: QueryNode): string =>
  node instanceof IngestDatasetSource
    ? `Data set "${node.dataSet}" from ingest definition "${node.ingestDefinitionName}"`
    : node.describe();

export interface CubeDefinitionFlowProps {
  /** The definition's steps, as `readCubeDefinition` read them */
  readonly flow: CubeDefinitionFlowReading;
  /** The step the host shows as picked, outlined */
  readonly selectedStepId?: string | undefined;
  /** Gets a step's id when it is clicked, or Enter or Space is pressed on it */
  readonly onSelectStep?: ((stepId: string) => void) | undefined;
  /**
   * The host's theme, for React Flow's own defaults; the canvas takes its
   * colours from Cube's theme tokens, as its steps do
   */
  readonly colorMode?: 'light' | 'dark' | undefined;
}

const CubeDefinitionFlowCanvas: React.FC<CubeDefinitionFlowProps> = (props) => {
  const { flow, selectedStepId, onSelectStep, colorMode } = props;
  const { query } = flow;
  const registry = useMemo(() => createNodeRegistry(), []);
  const { positions, lanes } = useMemo(() => layoutCubeQuery(query), [query]);
  const isSelectable = onSelectStep !== undefined;
  const steps = useMemo(
    (): CubeDefinitionStepNode[] =>
      buildCubeCanvasNodes(query, positions).map((flowNode) => {
        const { node } = flowNode.data;
        const definition = registry.get(node.type);
        const label = getCubeCanvasNodeLabel(node, definition?.label, {
          namesUnresolvedSources: true,
        });
        const isUnknown =
          node instanceof IngestDatasetSource &&
          node.resolution.kind !== 'resolved';
        const parameters = flow.parameters
          .filter((parameter) => parameter.stepIds.includes(node.id))
          .map((parameter) => parameter.name);
        return {
          ...flowNode,
          handles: [
            ...(flowNode.handles ?? []),
            ...(parameters.length
              ? [CUBE_DEFINITION_STEP_PARAMETERS_HANDLE]
              : []),
          ],
          type: CUBE_DEFINITION_STEP_TYPE,
          data: {
            node,
            icon: definition?.icon,
            title: label.title,
            detail: label.detail,
            tooltip: [
              describeStep(node),
              ...(isUnknown
                ? [CUBE_DEFINITION_FLOW_LABEL.UNKNOWN_COLUMNS]
                : []),
              ...(parameters.length
                ? [CUBE_DEFINITION_FLOW_LABEL.READS_PARAMETERS(parameters)]
                : []),
            ].join('\n'),
            isOutput: node.id === flow.outputStepId,
            isSelected: node.id === selectedStepId,
            isSelectable,
            readsParameters: parameters.length > 0,
          },
        };
      }),
    [query, positions, registry, flow, selectedStepId, isSelectable],
  );
  const nodes = useMemo(
    (): (CubeDefinitionStepNode | CubeDefinitionParameterNode)[] => [
      ...steps,
      ...buildCubeDefinitionParameterNodes(flow, positions),
    ],
    [steps, flow, positions],
  );
  const edges = useMemo(
    (): (CubeCanvasFlowEdge | Edge)[] => [
      ...buildCubeCanvasEdges(query, lanes),
      ...buildCubeDefinitionParameterEdges(flow),
    ],
    [query, lanes, flow],
  );
  const layoutSignature = useMemo(
    () => JSON.stringify([...positions]),
    [positions],
  );
  const fitToLeft = useCubeCanvasFitToLeft(layoutSignature);

  return (
    <ReactFlow<
      CubeDefinitionStepNode | CubeDefinitionParameterNode,
      CubeCanvasFlowEdge | Edge
    >
      nodes={nodes}
      edges={edges}
      nodeTypes={NODE_TYPES}
      edgeTypes={EDGE_TYPES}
      // read-only: the layout places the steps, nothing connects or moves
      nodesDraggable={false}
      nodesConnectable={false}
      elementsSelectable={false}
      deleteKeyCode={null}
      selectionKeyCode={null}
      multiSelectionKeyCode={null}
      // the host's page scrolls past it: the controls zoom, as pinching does
      zoomOnScroll={false}
      preventScrolling={false}
      onNodeClick={(_event, flowNode) => {
        // a parameter is no step
        if (flowNode.type === CUBE_DEFINITION_STEP_TYPE) {
          onSelectStep?.(flowNode.id);
        }
      }}
      // React Flow's own keyboard help speaks of moving nodes, which the flow
      // doesn't do; Enter and Space pick the focused step instead
      disableKeyboardA11y={true}
      edgesFocusable={false}
      onKeyDown={(event) => {
        const target = event.target;
        const stepId =
          target instanceof HTMLElement &&
          target.classList.contains('react-flow__node')
            ? target.dataset.id
            : undefined;
        if (
          stepId !== undefined &&
          query.getNode(stepId) !== undefined &&
          onSelectStep &&
          (event.key === 'Enter' || event.key === ' ')
        ) {
          event.preventDefault();
          onSelectStep(stepId);
        }
      }}
      colorMode={colorMode ?? 'light'}
      // its arrowheads in its edges' colour (`--xy-edge-stroke`, Cube's stylesheet)
      defaultMarkerColor="var(--color-border-strong)"
      proOptions={PRO_OPTIONS}
      minZoom={CUBE_CANVAS_MIN_ZOOM}
      maxZoom={CUBE_CANVAS_MAX_ZOOM}
    >
      <Background />
      <Controls
        position="bottom-right"
        showInteractive={false}
        showFitView={false}
      >
        <CubeCanvasFitViewButton onClick={fitToLeft} />
      </Controls>
    </ReactFlow>
  );
};

/**
 * A definition's steps, read by `readCubeDefinition`, drawn read-only as
 * Cube's canvas lays them out: its sources on the left, its output on the
 * right; its parameters in a row above, each wired into the steps that read
 * it. It pans and zooms, and a click on a step tells the host; nothing
 * edits, so it has no step editor, menu, palette or minimap. It fills its
 * container, which the host sizes, inside the host's Legend application, with
 * Cube's stylesheet loaded; as the editor's root, its root is `legend-cube`,
 * which Cube's theme colors are scoped to, on Cube's background.
 */
export const CubeDefinitionFlow: React.FC<CubeDefinitionFlowProps> = (
  props,
) => (
  <div
    className="legend-cube legend-cube__definition-flow relative h-full w-full bg-[var(--color-bg-app)] text-[var(--color-text-primary)]"
    data-testid={LEGEND_CUBE_TEST_ID.DEFINITION_FLOW}
  >
    <ReactFlowProvider>
      <CubeDefinitionFlowCanvas {...props} />
    </ReactFlowProvider>
  </div>
);
