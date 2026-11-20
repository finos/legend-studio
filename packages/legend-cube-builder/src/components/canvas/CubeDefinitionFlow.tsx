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
  getCubeDefinitionSqlFoldedAtFirst,
  type CubeDefinitionFlowReading,
  type CubeDefinitionFunctionContainer,
  type CubeDefinitionScalarFunction,
  type CubeDefinitionSqlIsland,
  type CubeDefinitionSqlStep,
} from '../../graph-manager/CubeDefinitionReader.js';
import { CubeSqlStepKind } from '../../graph-manager/CubeSqlStructure.js';
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
  CUBE_DEFINITION_SQL_BOX_TYPE,
  CUBE_DEFINITION_SQL_FRAME_TYPE,
  CubeDefinitionSqlBadge,
  CubeDefinitionSqlBox,
  CubeDefinitionSqlFrame,
  type CubeDefinitionSqlNode,
  describeCubeDefinitionSql,
  describeCubeDefinitionSqlStep,
  getCubeDefinitionSqlNames,
  getCubeDefinitionSqlStepLabel,
  printCubeDefinitionSql,
} from './CubeDefinitionFlowSql.js';
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
  /** The SQL it is a step of, for SQL drawn as steps */
  readonly sqlOf?: CubeDefinitionSqlIsland | undefined;
  /** Whether it is a clause of SQL, as the SQL says it, which Cube doesn't check */
  readonly isSqlClause?: boolean | undefined;
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
  const { isSqlClause } = props.data;
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
              'legend-cube__node--sql border-dashed': sqlIsland ?? isSqlClause,
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
                <CubeDefinitionSqlBadge />
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
  [CUBE_DEFINITION_SQL_FRAME_TYPE]: CubeDefinitionSqlFrame,
  [CUBE_DEFINITION_SQL_BOX_TYPE]: CubeDefinitionSqlBox,
};
const EDGE_TYPES = { [CUBE_CANVAS_EDGE_TYPE]: CubeCanvasEdge };
const PRO_OPTIONS = { hideAttribution: true };

/** A step's description, a data set's named whether or not its columns are known */
const describeStep = (node: QueryNode): string =>
  node instanceof IngestDatasetSource
    ? node.describeDataSet()
    : node.describe();

/** The SQL drawn as steps that a step is a step of, with its step of it */
const findSqlStep = (
  islands: readonly CubeDefinitionSqlIsland[],
  stepId: string,
):
  | {
      readonly island: CubeDefinitionSqlIsland;
      readonly step: CubeDefinitionSqlStep;
    }
  | undefined => {
  for (const island of islands) {
    const step = island.steps?.find((each) => each.stepId === stepId);
    if (step) {
      return { island, step };
    }
  }
  return undefined;
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
   * Shows the SQL of an island, `#SQL{…}#`: when its box is clicked, or,
   * for SQL drawn as steps, one of its clauses or its container's button
   */
  readonly onShowSql?: ((island: CubeDefinitionSqlIsland) => void) | undefined;
  /**
   * The calls, and the SQL drawn as steps, folded to one box when the flow
   * opens, by id; by default, the calls holding more than
   * `CUBE_DEFINITION_CALL_OPEN_STEPS` steps and the SQL of more than
   * `CUBE_DEFINITION_SQL_OPEN_STEPS`
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
        props.initiallyFolded ?? [
          ...getCubeDefinitionCallsFoldedAtFirst(
            flow.functionCalls,
            flow.sqlIslands,
          ),
          ...getCubeDefinitionSqlFoldedAtFirst(flow.sqlIslands),
        ],
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
  const { sqlIslands } = flow;
  const containers = useMemo(
    (): StepContainer[] => [
      ...calls
        .filter((call) => call.opened)
        .map((call) => ({
          id: call.id,
          title: call.shortName,
          steps: call.stepIds,
          folded: folded.has(call.id),
          ...(call.parentId !== undefined ? { parentId: call.parentId } : {}),
        })),
      // SQL drawn as steps: a container of them
      ...sqlIslands.flatMap((island) =>
        island.steps
          ? [
              {
                id: island.id,
                title: CUBE_DEFINITION_FLOW_LABEL.SQL,
                steps: island.steps.map((step) => step.stepId),
                folded: folded.has(island.id),
                ...(island.parentId !== undefined
                  ? { parentId: island.parentId }
                  : {}),
              },
            ]
          : [],
      ),
    ],
    [calls, sqlIslands, folded],
  );
  const layout = useMemo(
    () => layoutCubeCanvas(query, containers),
    [query, containers],
  );
  const { positions, lanes } = layout;
  /** How many steps each call holds, the calls in it included */
  const countOf = (callId: string): number =>
    countCubeDefinitionCallSteps(calls, callId, sqlIslands);
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
        // SQL as one box; or a step of SQL drawn as steps
        const sqlIsland = sqlIslands.find(
          (island) => !island.steps && island.stepId === node.id,
        );
        const sqlNames = sqlIsland ? getCubeDefinitionSqlNames(sqlIsland) : [];
        const sqlStep = findSqlStep(sqlIslands, node.id);
        // a data set is a step as any other; a clause is as the SQL says it
        const sqlClause =
          sqlStep && sqlStep.step.kind !== CubeSqlStepKind.DATA_SET
            ? getCubeDefinitionSqlStepLabel(sqlStep.step)
            : undefined;
        const scalarFunctions = flow.scalarFunctions.get(node.id);
        const label = closedCall
          ? {
              title: printCubeDefinitionCall(closedCall),
              detail: closed?.line,
            }
          : sqlIsland
            ? {
                title: printCubeDefinitionSql(sqlIsland),
                detail: sqlNames.length
                  ? CUBE_DEFINITION_FLOW_LABEL.SQL_NAMES(sqlNames)
                  : CUBE_DEFINITION_FLOW_LABEL.SQL_COLUMNS_UNKNOWN,
              }
            : (sqlClause ??
              getCubeCanvasNodeLabel(node, definition?.label, {
                namesUnresolvedSources: true,
              }));
        // a data set of SQL: the name its clauses call it by, before its definition's
        const alias = sqlClause ? undefined : sqlStep?.step.alias;
        const detail =
          alias === undefined
            ? label.detail
            : [CUBE_DEFINITION_FLOW_LABEL.SQL_AS(alias), label.detail]
                .filter((each) => each !== undefined)
                .join(' · ');
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
            icon: sqlClause ? sqlClause.icon : definition?.icon,
            title: label.title,
            detail,
            ...(closedCall ? { closedCall } : {}),
            ...(sqlIsland
              ? { sqlIsland, showsSql: onShowSql !== undefined }
              : {}),
            ...(sqlStep
              ? {
                  sqlOf: sqlStep.island,
                  isSqlClause: sqlClause !== undefined,
                  showsSql: onShowSql !== undefined,
                }
              : {}),
            ...(scalarFunctions ? { scalarFunctions } : {}),
            tooltip: [
              ...(closedCall
                ? [describeCubeDefinitionCall(closedCall), closed?.why ?? '']
                : sqlIsland
                  ? describeCubeDefinitionSql(
                      sqlIsland,
                      onShowSql !== undefined,
                    )
                  : sqlStep && sqlClause
                    ? describeCubeDefinitionSqlStep(
                        sqlStep.step,
                        onShowSql !== undefined,
                      )
                    : [
                        describeStep(node),
                        ...(sqlStep?.step.alias === undefined
                          ? []
                          : [
                              CUBE_DEFINITION_FLOW_LABEL.SQL_ALIAS(
                                sqlStep.step.alias,
                              ),
                            ]),
                      ]),
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
      sqlIslands,
      selectedStepId,
      isSelectable,
      onShowSql,
    ],
  );
  const functionNodes = useMemo(
    (): (CubeDefinitionFunctionNode | CubeDefinitionSqlNode)[] =>
      buildCubeCanvasContainerNodes(layout.containers).flatMap(
        (flowNode): (CubeDefinitionFunctionNode | CubeDefinitionSqlNode)[] => {
          const { place } = flowNode.data;
          const island = sqlIslands.find(
            (each) => each.steps && each.id === place.container.id,
          );
          if (island) {
            return [
              {
                ...flowNode,
                type: place.container.folded
                  ? CUBE_DEFINITION_SQL_BOX_TYPE
                  : CUBE_DEFINITION_SQL_FRAME_TYPE,
                data: { place, island, onToggle: toggle, onShowSql },
              },
            ];
          }
          const call = calls.find((each) => each.id === place.container.id);
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
        },
      ),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [layout, calls, sqlIslands, onShowFunction, onShowSql],
  );
  const nodes = useMemo(
    (): (
      | CubeDefinitionStepNode
      | CubeDefinitionParameterNode
      | CubeDefinitionFunctionNode
      | CubeDefinitionSqlNode
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
      | CubeDefinitionFunctionNode
      | CubeDefinitionSqlNode,
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
          // SQL: its text, which the box cuts; a step of SQL shows all of it
          const island = flowNode.data.sqlIsland ?? flowNode.data.sqlOf;
          if (island && onShowSql) {
            onShowSql(island);
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
          ? (sqlIslands.find((each) => !each.steps && each.stepId === stepId) ??
            findSqlStep(sqlIslands, stepId)?.island)
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
