/**
 * Copyright (c) 2020-present, Goldman Sachs
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
  Background,
  BackgroundVariant,
  Controls,
  type Edge,
  MiniMap,
  type Node,
  ReactFlow,
  ReactFlowProvider,
  useEdgesState,
  useNodesState,
  useReactFlow,
} from '@xyflow/react';
import '@xyflow/react/dist/style.css';
import { observer } from 'mobx-react-lite';
import { useEffect, useMemo } from 'react';
import { noop } from '@finos/legend-shared';
import type { Join, Table, View } from '@finos/legend-graph';
import {
  DatabaseTableNode,
  type DatabaseTableNodeData,
} from './DatabaseTableNode.js';
import {
  buildJoinEdges,
  collectForeignKeyColumns,
  estimateNodeHeight,
  getRelationId,
  isView,
  layoutDatabaseDiagram,
  getOrderedRelations,
} from './DatabaseDiagramHelper.js';
import type { DatabaseEditorState } from '../../../../stores/editor/editor-state/element-editor-state/DatabaseEditorState.js';

const NODE_TYPES = { table: DatabaseTableNode } as const;

/**
 * Edge data we attach so the canvas (and click handlers) can identify the
 * underlying Join without a lookup. React Flow's edge `data` is `unknown` to
 * downstream code — we narrow with a typed accessor at use sites.
 */
interface DatabaseEdgeData extends Record<string, unknown> {
  join: Join;
  endpoints: { sourceId: string; targetId: string };
}

/**
 * Resolve a Table or View by its on-canvas node id (`<schema>.<name>`).
 * Used by the click handler to translate React Flow's string id back into a
 * metamodel reference for selection.
 */
const findRelationById = (
  editorState: DatabaseEditorState,
  id: string,
): Table | View | undefined => {
  for (const schema of editorState.database.schemas) {
    for (const table of schema.tables) {
      if (getRelationId(table) === id) {
        return table;
      }
    }
    for (const view of schema.views) {
      if (getRelationId(view) === id) {
        return view;
      }
    }
  }
  return undefined;
};

/**
 * Inner canvas — must be wrapped in `<ReactFlowProvider>` so that the
 * `useReactFlow()` hook can fit-view after layout.
 */
const DatabaseDiagramCanvasInner = observer(
  (props: { editorState: DatabaseEditorState }) => {
    const { editorState } = props;
    const {
      database,
      selectedRelation,
      selectedColumn,
      selectedJoin,
      viewColumnFormulas,
      panToSelectedRequestCounter,
    } = editorState;

    // Compute nodes + edges from the metamodel. We rebuild on metamodel changes
    // (driven by `database` identity), but the layout itself (positions) is
    // memoized so dagre runs only once per metamodel snapshot.
    const { laidOutNodes, laidOutEdges } = useMemo(() => {
      const fkColumns = collectForeignKeyColumns(database);

      // Build canvas nodes for both tables AND views. The kind tag drives the
      // table-node component's icon choice and column-row content.
      const relationNodes = getOrderedRelations(database).map(
        ({ schema, relation }) => ({
          id: getRelationId(relation),
          relation,
          schemaName: schema.name,
          estimatedHeight: estimateNodeHeight(relation),
        }),
      );

      const joinEdges = buildJoinEdges(database);
      const positions = layoutDatabaseDiagram(
        relationNodes.map((n) => ({
          id: n.id,
          relation: n.relation,
          estimatedHeight: n.estimatedHeight,
        })),
        joinEdges,
      );

      const reactFlowNodes: Node<DatabaseTableNodeData>[] = relationNodes.map(
        (node) => {
          const pos = positions.get(node.id) ?? { x: 0, y: 0 };
          return {
            id: node.id,
            type: 'table',
            position: { x: pos.x, y: pos.y },
            data: {
              relation: node.relation,
              kind: isView(node.relation) ? 'view' : 'table',
              schemaName: node.schemaName,
              isSelected: false,
              isJoinEndpoint: false,
              fkColumns,
              selectedColumn: undefined,
              // Filled in by `selectionAwareNodes` from observable state.
              viewColumnFormulas: new Map(),
            },
          };
        },
      );

      const reactFlowEdges: Edge<DatabaseEdgeData>[] = joinEdges.map(
        (edge) => ({
          id: edge.id,
          source: edge.source,
          target: edge.target,
          label: edge.name,
          type: 'smoothstep',
          animated: false,
          labelBgPadding: [4, 2],
          labelBgBorderRadius: 2,
          data: {
            join: edge.join,
            endpoints: { sourceId: edge.source, targetId: edge.target },
          },
        }),
      );

      return { laidOutNodes: reactFlowNodes, laidOutEdges: reactFlowEdges };
    }, [database]);

    const [nodes, setNodes, onNodesChange] =
      useNodesState<Node<DatabaseTableNodeData>>(laidOutNodes);
    const [edges, , onEdgesChange] =
      useEdgesState<Edge<DatabaseEdgeData>>(laidOutEdges);
    const { fitView } = useReactFlow();

    // Reset whenever the database identity changes (e.g. after graph rebuild).
    useEffect(() => {
      setNodes(laidOutNodes);
      const timer = window.setTimeout(() => {
        fitView({ padding: 0.15, duration: 200 }).catch(noop());
      }, 0);
      return () => window.clearTimeout(timer);
    }, [laidOutNodes, setNodes, fitView]);

    // Resolve the two endpoint table ids of the selected join (if any). Used
    // both for the `--join-endpoint` highlight on the two nodes and for the
    // pan-to-fit-both effect below. We compute it here once per selection
    // change rather than walking edges in multiple places.
    const selectedJoinEndpointIds = useMemo<{
      sourceId: string;
      targetId: string;
    } | null>(() => {
      if (!selectedJoin) {
        return null;
      }
      const match = laidOutEdges.find((e) => e.data?.join === selectedJoin);
      return match?.data?.endpoints ?? null;
    }, [selectedJoin, laidOutEdges]);

    // Mirror selection from MobX into node data so each table-node renders
    // its current visual state. Three independent flags:
    //   - isSelected: blue ring (single-table focus)
    //   - isJoinEndpoint: yellow ring (one of the two endpoints of the
    //     selected join — distinct color so the user can tell the two modes
    //     apart)
    //   - selectedColumn: forwarded only to the matching table
    const selectionAwareNodes = useMemo<Node<DatabaseTableNodeData>[]>(
      () =>
        nodes.map((n) => {
          const isSelected = selectedRelation
            ? n.id === getRelationId(selectedRelation)
            : false;
          const isJoinEndpoint =
            selectedJoinEndpointIds !== null &&
            (n.id === selectedJoinEndpointIds.sourceId ||
              n.id === selectedJoinEndpointIds.targetId);
          return {
            ...n,
            data: {
              ...n.data,
              isSelected,
              isJoinEndpoint,
              selectedColumn: isSelected ? selectedColumn : undefined,
              // Forward the live formula map. Only view-kind nodes use it,
              // but it's cheap to pass to all and keeps the data shape uniform.
              viewColumnFormulas,
            },
          };
        }),
      [
        nodes,
        selectedRelation,
        selectedColumn,
        selectedJoinEndpointIds,
        viewColumnFormulas,
      ],
    );

    // Highlight the selected edge with a yellow stroke that matches the
    // endpoint-table ring color, and lift it visually. Other edges keep their
    // default style (driven by SCSS in `_database-editor.scss`).
    const selectionAwareEdges = useMemo<Edge<DatabaseEdgeData>[]>(
      () =>
        edges.map((e) => {
          const isSelected = Boolean(
            selectedJoin && e.data?.join === selectedJoin,
          );
          // Build with `exactOptionalPropertyTypes` in mind — only attach
          // `style` when actually overriding it, so TS doesn't see `undefined`
          // assigned to an optional-but-not-undefined-allowed prop.
          const styled: Edge<DatabaseEdgeData> = {
            ...e,
            labelStyle: {
              fontSize: 10,
              fill: isSelected
                ? 'var(--color-yellow-200)'
                : 'var(--color-light-grey-200)',
            },
            labelBgStyle: {
              fill: 'var(--color-dark-grey-100)',
            },
            zIndex: isSelected ? 10 : 0,
          };
          if (isSelected) {
            styled.style = {
              stroke: 'var(--color-yellow-200)',
              strokeWidth: 2,
            };
          }
          return styled;
        }),
      [edges, selectedJoin],
    );

    // Pan to whatever's selected when the panel asks us to. Two modes:
    //   - Table selected → fit on that one node.
    //   - Join selected → fit to encompass both endpoint nodes.
    // The counter (rather than the selection itself) drives this so canvas
    // clicks don't pan — the user is already looking at what they clicked.
    useEffect(() => {
      if (panToSelectedRequestCounter === 0) {
        return;
      }
      if (selectedJoinEndpointIds) {
        fitView({
          nodes: [
            { id: selectedJoinEndpointIds.sourceId },
            { id: selectedJoinEndpointIds.targetId },
          ],
          duration: 400,
          padding: 0.3,
          maxZoom: 1.2,
        }).catch(noop());
        return;
      }
      if (selectedRelation) {
        fitView({
          nodes: [{ id: getRelationId(selectedRelation) }],
          duration: 400,
          padding: 0.4,
          maxZoom: 1.2,
        }).catch(noop());
      }
      // Intentional: only the counter triggers re-pan. Selection identities
      // are resolved at fire time from the closure.
      // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [panToSelectedRequestCounter]);

    return (
      <ReactFlow
        className="database-diagram__canvas"
        nodes={selectionAwareNodes}
        edges={selectionAwareEdges}
        nodeTypes={NODE_TYPES}
        onNodesChange={onNodesChange}
        onEdgesChange={onEdgesChange}
        onNodeClick={(_, node) => {
          const matching = findRelationById(editorState, node.id);
          editorState.setSelectedRelation(matching);
        }}
        onEdgeClick={(_, edge) => {
          if (edge.data?.join) {
            editorState.focusOnJoin(edge.data.join);
          }
        }}
        onPaneClick={() => editorState.clearSelection()}
        nodesDraggable={true}
        nodesConnectable={false}
        elementsSelectable={true}
        proOptions={{ hideAttribution: true }}
        minZoom={0.2}
        maxZoom={1.5}
        fitView={true}
      >
        <Background variant={BackgroundVariant.Dots} gap={18} size={1} />
        <Controls showInteractive={false} />
        <MiniMap
          pannable={true}
          zoomable={true}
          className="database-diagram__minimap"
          nodeColor="var(--color-dark-grey-200)"
          maskColor="rgba(0, 0, 0, 0.6)"
        />
      </ReactFlow>
    );
  },
);

export const DatabaseDiagramCanvas = observer(
  (props: { editorState: DatabaseEditorState }) => (
    <ReactFlowProvider>
      <DatabaseDiagramCanvasInner editorState={props.editorState} />
    </ReactFlowProvider>
  ),
);
