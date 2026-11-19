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

import { clsx, FunctionIcon, Tooltip } from '@finos/legend-art';
import {
  createNodeRegistry,
  IngestDatasetSource,
  type QueryNode,
  type StepContainer,
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
import { useMemo, useState } from 'react';
import { CUBE_DEFINITION_FLOW_LABEL } from '../../__lib__/LegendCubeDefinitionFlowLabels.js';
import { LEGEND_CUBE_TEST_ID } from '../../__lib__/LegendCubeTesting.js';
import {
  countCubeDefinitionCallSteps,
  getCubeDefinitionCallsFoldedAtFirst,
  type CubeDefinitionFlowReading,
  type CubeDefinitionFunctionContainer,
  type CubeDefinitionScalarFunction,
  type CubeDefinitionSqlIsland,
} from '../../graph-manager/CubeDefinitionReader.js';
import {
  buildCubeCanvasContainerNodes,
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
import { layoutCubeCanvas } from './CubeCanvasLayout.js';
import {
  CUBE_DEFINITION_FUNCTION_BOX_TYPE,
  CUBE_DEFINITION_FUNCTION_FRAME_TYPE,
  CubeDefinitionFunctionBox,
  CubeDefinitionFunctionFrame,
  type CubeDefinitionFunctionNode,
  describeClosedCall,
  describeCubeDefinitionCall,
  printCubeDefinitionCall,
} from './CubeDefinitionFlowFunctions.js';
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
  /** The call of a user-defined function it is, drawn as one box */
  readonly closedCall?: CubeDefinitionFunctionContainer | undefined;
  /** The SQL, `#SQL{…}#`, it is, drawn as one box */
  readonly sqlIsland?: CubeDefinitionSqlIsland | undefined;
  /** Whether a click on it shows its SQL */
  readonly showsSql?: boolean | undefined;
  /** The user-defined functions its expressions call */
  readonly scalarFunctions?:
    | readonly CubeDefinitionScalarFunction[]
    | undefined;
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
  const { closedCall, sqlIsland, showsSql, scalarFunctions } = props.data;
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
              'legend-cube__node--function border-dashed': closedCall,
              'legend-cube__node--sql border-dashed': sqlIsland,
              'cursor-pointer': isSelectable || showsSql,
              'legend-cube__node--selected ring-2 ring-[var(--color-accent)]':
                isSelected,
            },
          )}
          aria-description={tooltip}
          aria-current={isSelected}
          data-testid={LEGEND_CUBE_TEST_ID.CANVAS_NODE}
        >
          {(closedCall ?? sqlIsland) ? (
            <>
              {closedCall ? (
                <FunctionIcon
                  className="shrink-0 text-lg text-[var(--color-text-secondary)]"
                  aria-hidden={true}
                />
              ) : (
                <span className="shrink-0 rounded border border-[var(--color-border-default)] px-1 text-xs font-medium text-[var(--color-text-secondary)]">
                  {CUBE_DEFINITION_FLOW_LABEL.SQL}
                </span>
              )}
              <span className="flex min-w-0 flex-col leading-tight">
                <span
                  className={clsx('font-mono font-medium', {
                    truncate: closedCall,
                    // SQL: its first words, on two lines
                    'line-clamp-2 break-words text-sm': !closedCall,
                  })}
                >
                  {title}
                </span>
                <span className="truncate text-sm text-[var(--color-text-muted)]">
                  {detail}
                </span>
              </span>
            </>
          ) : (
            <CubeCanvasNodeLabel icon={icon} title={title} detail={detail} />
          )}
          {scalarFunctions?.length ? (
            <span
              className="absolute right-1 top-1 flex items-center gap-0.5 rounded border border-[var(--color-border-default)] bg-[var(--color-bg-app)] px-0.5 text-xs text-[var(--color-text-secondary)]"
              aria-label={`Calls ${scalarFunctions.map((each) => each.name).join(', ')}`}
            >
              <FunctionIcon aria-hidden={true} />
              {scalarFunctions.length > 1 ? scalarFunctions.length : ''}
            </span>
          ) : null}
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
  [CUBE_DEFINITION_FUNCTION_FRAME_TYPE]: CubeDefinitionFunctionFrame,
  [CUBE_DEFINITION_FUNCTION_BOX_TYPE]: CubeDefinitionFunctionBox,
};
const EDGE_TYPES = { [CUBE_CANVAS_EDGE_TYPE]: CubeCanvasEdge };
const PRO_OPTIONS = { hideAttribution: true };

/** A step's description, a data set's named whether or not its columns are known */
const describeStep = (node: QueryNode): string =>
  node instanceof IngestDatasetSource
    ? node.describeDataSet()
    : node.describe();

/** What an SQL step's SQL names, by short name: its data sets, then its access points */
const namesOfSql = (island: CubeDefinitionSqlIsland): string[] => [
  ...island.dataSets.map((each) => each.dataSet),
  ...island.accessPoints.map((each) => each.accessPoint),
];

/** How many lines of an SQL step's SQL its tooltip shows */
const SQL_TOOLTIP_LINES = 12;

/** What an SQL step's tooltip says, one a line: its SQL's first lines, and what Cube knows of it */
const describeSql = (
  island: CubeDefinitionSqlIsland,
  canShow: boolean,
): string[] => {
  const lines = island.sql.trim().split('\n');
  return [
    ...lines.slice(0, SQL_TOOLTIP_LINES),
    ...(lines.length > SQL_TOOLTIP_LINES ? ['…'] : []),
    CUBE_DEFINITION_FLOW_LABEL.SQL_ONE_STEP,
    ...(island.dataSets.length
      ? [
          CUBE_DEFINITION_FLOW_LABEL.SQL_NAMES_DATA_SETS(
            island.dataSets.map(
              (each) => `${each.ingestDefinition}.${each.dataSet}`,
            ),
          ),
        ]
      : []),
    ...(island.accessPoints.length
      ? [
          CUBE_DEFINITION_FLOW_LABEL.SQL_NAMES_ACCESS_POINTS(
            island.accessPoints.map(
              (each) => `${each.dataProduct}.${each.accessPoint}`,
            ),
          ),
        ]
      : []),
    ...(canShow ? [CUBE_DEFINITION_FLOW_LABEL.SHOW_SQL] : []),
  ];
};

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
  /**
   * Shows a user-defined function's Pure, from its container's header, its
   * box, or a step whose expression calls it (PLAN §11.33)
   */
  readonly onShowFunction?:
    | ((call: CubeDefinitionFunctionContainer) => void)
    | undefined;
  /**
   * Shows the SQL of a step that is SQL, `#SQL{…}#`, when it is clicked:
   * Cube draws it as one box and reads none of it
   */
  readonly onShowSql?: ((island: CubeDefinitionSqlIsland) => void) | undefined;
  /**
   * The calls folded to one box when the flow opens; by default, those
   * holding more than `CUBE_DEFINITION_CALL_OPEN_STEPS` steps
   */
  readonly initiallyFolded?: readonly string[] | undefined;
}

const CubeDefinitionFlowCanvas: React.FC<CubeDefinitionFlowProps> = (props) => {
  const { flow, selectedStepId, onSelectStep, colorMode, onShowFunction } =
    props;
  const { onShowSql } = props;
  const { query } = flow;
  const registry = useMemo(() => createNodeRegistry(), []);
  // each opened call a container; folding is the viewer's own
  const [folded, setFolded] = useState<ReadonlySet<string>>(
    () =>
      new Set(
        props.initiallyFolded ??
          getCubeDefinitionCallsFoldedAtFirst(flow.functionCalls),
      ),
  );
  const toggle = (callId: string): void =>
    setFolded((current) => {
      const next = new Set(current);
      if (!next.delete(callId)) {
        next.add(callId);
      }
      return next;
    });
  const calls = flow.functionCalls;
  const containers = useMemo(
    (): StepContainer[] =>
      calls
        .filter((call) => call.opened)
        .map((call) => ({
          id: call.id,
          title: call.shortName,
          steps: call.stepIds,
          folded: folded.has(call.id),
          ...(call.parentId !== undefined ? { parentId: call.parentId } : {}),
        })),
    [calls, folded],
  );
  const layout = useMemo(
    () => layoutCubeCanvas(query, containers),
    [query, containers],
  );
  const { positions, lanes } = layout;
  /** How many steps each call holds, the calls in it included */
  const countOf = (callId: string): number =>
    countCubeDefinitionCallSteps(calls, callId);
  const isSelectable = onSelectStep !== undefined;
  const steps = useMemo(
    (): CubeDefinitionStepNode[] =>
      buildCubeCanvasNodes(query, positions).map((flowNode) => {
        const { node } = flowNode.data;
        const definition = registry.get(node.type);
        const closedCall = calls.find(
          (call) => !call.opened && call.stepIds.includes(node.id),
        );
        const closed = closedCall ? describeClosedCall(closedCall) : undefined;
        const sqlIsland = flow.sqlIslands.find(
          (island) => island.stepId === node.id,
        );
        const sqlNames = sqlIsland ? namesOfSql(sqlIsland) : [];
        const scalarFunctions = flow.scalarFunctions.get(node.id);
        const label = closedCall
          ? {
              title: printCubeDefinitionCall(closedCall),
              detail: closed?.line,
            }
          : sqlIsland
            ? {
                // its SQL on one line: the box cuts what doesn't fit
                title: sqlIsland.sql.trim().replace(/\s+/g, ' '),
                detail: sqlNames.length
                  ? CUBE_DEFINITION_FLOW_LABEL.SQL_NAMES(sqlNames)
                  : CUBE_DEFINITION_FLOW_LABEL.SQL_COLUMNS_UNKNOWN,
              }
            : getCubeCanvasNodeLabel(node, definition?.label, {
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
            ...(closedCall ? { closedCall } : {}),
            ...(sqlIsland
              ? { sqlIsland, showsSql: onShowSql !== undefined }
              : {}),
            ...(scalarFunctions ? { scalarFunctions } : {}),
            tooltip: [
              ...(closedCall
                ? [describeCubeDefinitionCall(closedCall), closed?.why ?? '']
                : sqlIsland
                  ? describeSql(sqlIsland, onShowSql !== undefined)
                  : [describeStep(node)]),
              ...(scalarFunctions
                ? scalarFunctions.map((each) =>
                    CUBE_DEFINITION_FLOW_LABEL.CALLS_FUNCTION(
                      each.name,
                      each.signature,
                      each.origin,
                    ),
                  )
                : []),
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
    [
      query,
      positions,
      registry,
      flow,
      calls,
      selectedStepId,
      isSelectable,
      onShowSql,
    ],
  );
  const functionNodes = useMemo(
    (): CubeDefinitionFunctionNode[] =>
      buildCubeCanvasContainerNodes(layout.containers).flatMap((flowNode) => {
        const call = calls.find(
          (each) => each.id === flowNode.data.place.container.id,
        );
        return call
          ? [
              {
                ...flowNode,
                type: flowNode.data.place.container.folded
                  ? CUBE_DEFINITION_FUNCTION_BOX_TYPE
                  : CUBE_DEFINITION_FUNCTION_FRAME_TYPE,
                data: {
                  place: flowNode.data.place,
                  call,
                  stepCount: countOf(call.id),
                  onToggle: toggle,
                  onShowFunction,
                },
              },
            ]
          : [];
      }),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [layout, calls, onShowFunction],
  );
  const nodes = useMemo(
    (): (
      | CubeDefinitionStepNode
      | CubeDefinitionParameterNode
      | CubeDefinitionFunctionNode
    )[] => [
      // frames first, behind the steps
      ...functionNodes,
      ...steps,
      ...buildCubeDefinitionParameterNodes(flow, positions),
    ],
    [functionNodes, steps, flow, positions],
  );
  const edges = useMemo(
    (): (CubeCanvasFlowEdge | Edge)[] => [
      ...buildCubeCanvasEdges(query, lanes, layout.containers),
      // a step in a folded container has no place: its parameters' wires go
      ...buildCubeDefinitionParameterEdges(flow).filter((edge) =>
        positions.has(edge.target),
      ),
    ],
    [query, lanes, flow, layout, positions],
  );
  const layoutSignature = useMemo(
    () => JSON.stringify([...positions]),
    [positions],
  );
  const fitToLeft = useCubeCanvasFitToLeft(layoutSignature);

  return (
    <ReactFlow<
      | CubeDefinitionStepNode
      | CubeDefinitionParameterNode
      | CubeDefinitionFunctionNode,
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
          // a call Cube can't open: its Pure, as its tooltip offers
          if (flowNode.data.closedCall && onShowFunction) {
            onShowFunction(flowNode.data.closedCall);
          }
          // SQL: its text, which the box cuts
          if (flowNode.data.sqlIsland && onShowSql) {
            onShowSql(flowNode.data.sqlIsland);
          }
          onSelectStep?.(flowNode.id);
        }
      }}
      // React Flow's own keyboard help speaks of moving nodes, which the flow
      // doesn't do; Enter and Space pick the focused step instead, or show
      // its SQL
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
          stepId === undefined ||
          query.getNode(stepId) === undefined ||
          (event.key !== 'Enter' && event.key !== ' ')
        ) {
          return;
        }
        // as a click does: a step that is SQL shows its SQL
        const island = onShowSql
          ? flow.sqlIslands.find((each) => each.stepId === stepId)
          : undefined;
        if (!onSelectStep && !island) {
          return;
        }
        event.preventDefault();
        if (island) {
          onShowSql?.(island);
        }
        onSelectStep?.(stepId);
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
