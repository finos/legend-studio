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
  Tooltip,
} from '@finos/legend-art';
import { Handle, type Node, type NodeProps, Position } from '@xyflow/react';
import { CUBE_DEFINITION_FLOW_LABEL } from '../../__lib__/LegendCubeDefinitionFlowLabels.js';
import { LEGEND_CUBE_TEST_ID } from '../../__lib__/LegendCubeTesting.js';
import type {
  CubeDefinitionSqlIsland,
  CubeDefinitionSqlStep,
} from '../../graph-manager/CubeDefinitionReader.js';
import { CubeSqlStepKind } from '../../graph-manager/CubeSqlStructure.js';
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

// The engine's SQL island, `#SQL{…}#`, in a definition's flow. With the
// engine's tree of its SQL, a container of the steps its clauses are, as the
// SQL says them; folded, or without the tree, one box. Cube checks none of
// it. The flow is read-only, so folding is the viewer's own.

export const CUBE_DEFINITION_SQL_FRAME_TYPE = 'cubeDefinitionSqlFrame';
export const CUBE_DEFINITION_SQL_BOX_TYPE = 'cubeDefinitionSqlBox';

export type CubeDefinitionSqlData = {
  readonly place: CubeCanvasContainerPlace;
  readonly island: CubeDefinitionSqlIsland;
  readonly onToggle: (islandId: string) => void;
  readonly onShowSql?: ((island: CubeDefinitionSqlIsland) => void) | undefined;
};
export type CubeDefinitionSqlNode = Node<
  CubeDefinitionSqlData,
  typeof CUBE_DEFINITION_SQL_FRAME_TYPE | typeof CUBE_DEFINITION_SQL_BOX_TYPE
>;

/** An island's SQL on one line: a box cuts what doesn't fit */
export const printCubeDefinitionSql = (
  island: CubeDefinitionSqlIsland,
): string => island.sql.trim().replace(/\s+/g, ' ');

/** What an island's SQL names, by short name: its data sets, then its access points */
export const getCubeDefinitionSqlNames = (
  island: CubeDefinitionSqlIsland,
): string[] => [
  ...island.dataSets.map((each) => each.dataSet),
  ...island.accessPoints.map((each) => each.accessPoint),
];

/** How many lines of an island's SQL its tooltip shows */
const SQL_TOOLTIP_LINES = 12;

/** What an island's tooltip says, one a line: its SQL's first lines, and what Cube knows of it */
export const describeCubeDefinitionSql = (
  island: CubeDefinitionSqlIsland,
  canShow: boolean,
): string[] => {
  const lines = island.sql.trim().split('\n');
  return [
    ...lines.slice(0, SQL_TOOLTIP_LINES),
    ...(lines.length > SQL_TOOLTIP_LINES ? ['…'] : []),
    island.steps
      ? CUBE_DEFINITION_FLOW_LABEL.SQL_AS_STEPS
      : CUBE_DEFINITION_FLOW_LABEL.SQL_ONE_STEP,
    ...(island.closedMessage === undefined
      ? []
      : [CUBE_DEFINITION_FLOW_LABEL.SQL_NOT_DRAWN(island.closedMessage)]),
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

/** The icon of a step of SQL: that of the step of Cube's that does the like, where there is one */
const SQL_STEP_ICONS: Readonly<Partial<Record<CubeSqlStepKind, string>>> = {
  [CubeSqlStepKind.JOIN]: 'join',
  [CubeSqlStepKind.WHERE]: 'filter',
  [CubeSqlStepKind.GROUP_BY]: 'group',
  [CubeSqlStepKind.HAVING]: 'filter',
  [CubeSqlStepKind.SELECT]: 'restrict',
  [CubeSqlStepKind.ORDER_BY]: 'sort',
  [CubeSqlStepKind.OFFSET]: 'drop',
  [CubeSqlStepKind.LIMIT]: 'limit',
  [CubeSqlStepKind.SET]: 'concat',
  // a query given a name
  [CubeSqlStepKind.NAMED]: 'rename',
  [CubeSqlStepKind.VARIABLE]: 'function',
};
const SQL_SOURCE_ICONS: Readonly<Record<string, string>> = {
  table: 'table',
  tb: 'table',
  p: 'dataProduct',
  func: 'function',
  service: 'service',
};

/** A text of SQL on one line */
const onOneLine = (text: string): string => text.trim().replace(/\s+/g, ' ');

/**
 * What a step of SQL shows: its clause as its title, e.g. `Left join`, and
 * what it says under it; a source's alias after its name
 */
export const getCubeDefinitionSqlStepLabel = (
  step: CubeDefinitionSqlStep,
): {
  readonly icon: string | undefined;
  readonly title: string;
  readonly detail: string | undefined;
} => {
  const title = CUBE_DEFINITION_FLOW_LABEL.SQL_STEP(step.kind, step.variant);
  const text = onOneLine(step.text);
  const isSource =
    step.kind === CubeSqlStepKind.SOURCE ||
    step.kind === CubeSqlStepKind.VARIABLE;
  const detail =
    step.kind === CubeSqlStepKind.SELECT && step.columns
      ? step.columns.length === 1 && step.columns[0] === '*'
        ? CUBE_DEFINITION_FLOW_LABEL.SQL_ALL_COLUMNS
        : step.columns.map(onOneLine).join(', ')
      : (step.kind === CubeSqlStepKind.LIMIT ||
            step.kind === CubeSqlStepKind.OFFSET) &&
          /^\d+$/.test(text)
        ? CUBE_DEFINITION_FLOW_LABEL.SQL_ROWS(text)
        : (isSource || step.kind === CubeSqlStepKind.NAMED) &&
            step.alias !== undefined
          ? `${text} ${CUBE_DEFINITION_FLOW_LABEL.SQL_AS(step.alias)}`
          : text;
  return {
    icon:
      step.kind === CubeSqlStepKind.SOURCE
        ? (SQL_SOURCE_ICONS[step.variant ?? ''] ?? 'table')
        : step.kind === CubeSqlStepKind.SET &&
            step.variant?.startsWith('except')
          ? 'difference'
          : SQL_STEP_ICONS[step.kind],
    title,
    detail: detail ? detail : undefined,
  };
};

/** What the tooltip of a step of SQL says, one a line */
export const describeCubeDefinitionSqlStep = (
  step: CubeDefinitionSqlStep,
  canShow: boolean,
): string[] => [
  CUBE_DEFINITION_FLOW_LABEL.SQL_STEP(step.kind, step.variant),
  ...(step.text ? [step.text] : []),
  ...(step.alias === undefined
    ? []
    : [CUBE_DEFINITION_FLOW_LABEL.SQL_ALIAS(step.alias)]),
  CUBE_DEFINITION_FLOW_LABEL.SQL_STEP_AS_WRITTEN,
  ...(canShow ? [CUBE_DEFINITION_FLOW_LABEL.SHOW_SQL] : []),
];

/** The mark of SQL: on its box, its container's head, and nowhere else */
export const CubeDefinitionSqlBadge: React.FC = () => (
  <span className="shrink-0 rounded border border-[var(--color-border-default)] px-1 text-xs font-medium text-[var(--color-text-secondary)]">
    {CUBE_DEFINITION_FLOW_LABEL.SQL}
  </span>
);

const ShowSqlButton: React.FC<{
  island: CubeDefinitionSqlIsland;
  onShowSql: (island: CubeDefinitionSqlIsland) => void;
}> = (props) => (
  <button
    type="button"
    className="nodrag nopan flex h-5 shrink-0 items-center gap-1 rounded px-1 text-xs text-[var(--color-text-secondary)] hover:bg-[var(--color-bg-hover)]"
    title={CUBE_DEFINITION_FLOW_LABEL.SHOW_SQL_BUTTON}
    aria-label={CUBE_DEFINITION_FLOW_LABEL.SHOW_SQL_BUTTON}
    onClick={(event) => {
      event.stopPropagation();
      props.onShowSql(props.island);
    }}
  >
    <CodeIcon aria-hidden={true} />
  </button>
);

const SqlTooltip: React.FC<{
  island: CubeDefinitionSqlIsland;
  children: React.ReactElement;
}> = (props) => (
  <Tooltip
    title={
      <div className="whitespace-pre-line">
        {describeCubeDefinitionSql(props.island, false).join('\n')}
      </div>
    }
    placement="top"
    enterDelay={500}
    disableInteractive={true}
    slotProps={{ tooltip: { className: 'max-w-[40rem]' } }}
  >
    {props.children}
  </Tooltip>
);

/**
 * SQL drawn as steps: a frame behind them, with its first words on top; its
 * fold, and a button that shows its SQL
 */
export const CubeDefinitionSqlFrame: React.FC<
  NodeProps<CubeDefinitionSqlNode>
> = (props) => {
  const { island, onToggle, onShowSql } = props.data;
  const count = island.steps?.length ?? 0;
  return (
    <div
      className="legend-cube__container legend-cube__sql-container h-full w-full rounded-md border border-dashed"
      style={CUBE_CANVAS_FRAME_STYLE}
      data-testid={LEGEND_CUBE_TEST_ID.CANVAS_CONTAINER}
      aria-label={`${CUBE_DEFINITION_FLOW_LABEL.SQL}: ${printCubeDefinitionSql(island)}`}
    >
      <div
        className="legend-cube__container-head nodrag nopan pointer-events-auto flex items-center gap-1 px-1 text-sm text-[var(--color-text-secondary)]"
        style={{ height: CUBE_CANVAS_FRAME_HEAD_HEIGHT }}
      >
        <button
          type="button"
          className="flex h-5 w-5 shrink-0 items-center justify-center rounded hover:bg-[var(--color-bg-hover)]"
          title={CUBE_DEFINITION_FLOW_LABEL.FOLD_SQL}
          aria-label={CUBE_DEFINITION_FLOW_LABEL.FOLD_SQL}
          onClick={(event) => {
            event.stopPropagation();
            onToggle(island.id);
          }}
        >
          <ChevronDownIcon />
        </button>
        <CubeDefinitionSqlBadge />
        <SqlTooltip island={island}>
          <span
            className="min-w-[4rem] truncate font-mono text-[var(--color-text-primary)]"
            aria-description={CUBE_DEFINITION_FLOW_LABEL.STEP_COUNT(count)}
          >
            {printCubeDefinitionSql(island)}
          </span>
        </SqlTooltip>
        <span className="ml-auto" />
        {onShowSql && <ShowSqlButton island={island} onShowSql={onShowSql} />}
      </div>
    </div>
  );
};

/**
 * SQL drawn as steps, folded: one box in its steps' place, the lines into and
 * out of them at its sides. ▸ or a double-click opens it.
 */
export const CubeDefinitionSqlBox: React.FC<
  NodeProps<CubeDefinitionSqlNode>
> = (props) => {
  const { island, onToggle, onShowSql } = props.data;
  const count = island.steps?.length ?? 0;
  return (
    <>
      <Handle
        id={CUBE_FOLDED_INPUT_HANDLE_ID}
        type="target"
        position={Position.Left}
        isConnectable={false}
      />
      <SqlTooltip island={island}>
        <div
          className="legend-cube__folded-container legend-cube__node--sql nodrag nopan relative flex h-full w-full items-center gap-2 rounded border border-dashed border-[var(--color-border-default)] bg-[var(--color-bg-panel)] px-2 text-base text-[var(--color-text-primary)]"
          style={CUBE_CANVAS_FOLDED_STYLE}
          data-testid={LEGEND_CUBE_TEST_ID.CANVAS_FOLDED_CONTAINER}
          aria-label={`Folded ${CUBE_DEFINITION_FLOW_LABEL.SQL}: ${printCubeDefinitionSql(island)}`}
          onDoubleClick={() => onToggle(island.id)}
        >
          <CubeDefinitionSqlBadge />
          <span className="flex min-w-0 flex-col leading-tight">
            <span className="truncate font-mono text-sm font-medium">
              {printCubeDefinitionSql(island)}
            </span>
            <span className="truncate text-sm text-[var(--color-text-muted)]">
              {CUBE_DEFINITION_FLOW_LABEL.FOLDED(
                CUBE_DEFINITION_FLOW_LABEL.STEP_COUNT(count),
              )}
            </span>
          </span>
          <span className="ml-auto flex shrink-0 items-center">
            {onShowSql && (
              <ShowSqlButton island={island} onShowSql={onShowSql} />
            )}
            <button
              type="button"
              className="flex h-6 w-6 shrink-0 items-center justify-center rounded hover:bg-[var(--color-bg-hover)]"
              title={CUBE_DEFINITION_FLOW_LABEL.OPEN_SQL}
              aria-label={CUBE_DEFINITION_FLOW_LABEL.OPEN_SQL}
              onClick={(event) => {
                event.stopPropagation();
                onToggle(island.id);
              }}
            >
              <ChevronRightIcon />
            </button>
          </span>
        </div>
      </SqlTooltip>
      <Handle
        id={CUBE_OUTPUT_HANDLE_ID}
        type="source"
        position={Position.Right}
        isConnectable={false}
      />
    </>
  );
};
