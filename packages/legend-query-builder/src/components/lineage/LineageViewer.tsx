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

import { useEffect, type JSX } from 'react';
import {
  PanelContent,
  clsx,
  Dialog,
  Modal,
  ModalHeader,
  ModalBody,
  ModalFooter,
  ModalFooterButton,
} from '@finos/legend-art';
import { observer } from 'mobx-react-lite';
import {
  ReactFlow,
  Background,
  Controls,
  MiniMap,
  ReactFlowProvider,
  Position,
  type Node as ReactFlowNode,
  type Edge as ReactFlowEdge,
} from 'reactflow';
import 'reactflow/dist/style.css';
import {
  type LineageState,
  LINEAGE_VIEW_MODE,
} from '../../stores/lineage/LineageState.js';

import {
  type Graph,
  type Owner,
  type ReportLineage,
  type LineageNode,
  type LineageEdge,
} from '@finos/legend-graph';

function autoLayoutNodesAndEdges<T extends { id: string }>(
  nodes: T[],
  edges: { source: string; target: string }[],
  xSpacing = 220,
  ySpacing = 120,
  areaHeight = 800,
): Record<string, { x: number; y: number }> {
  // Build adjacency and levels
  const nodeIds = nodes.map((n) => n.id);
  const inDegree: Record<string, number> = Object.fromEntries(
    nodeIds.map((id) => [id, 0]),
  );
  edges.forEach((e) => {
    inDegree[e.target] = (inDegree[e.target] ?? 0) + 1;
  });

  // BFS to assign levels
  const levels: Record<string, number> = {};
  const queue: string[] = [];
  nodeIds.forEach((id) => {
    if (inDegree[id] === 0) {
      levels[id] = 0;
      queue.push(id);
    }
  });
  while (queue.length) {
    const current = queue.shift()!;
    const currentLevel = levels[current] ?? 0; // Ensure currentLevel is always a number
    edges.forEach((e) => {
      if (e.source === current) {
        const targetLevel = levels[e.target] ?? -1;
        if (targetLevel < currentLevel + 1) {
          levels[e.target] = currentLevel + 1;
          queue.push(e.target);
        }
      }
    });
  }

  // Group nodes by level
  const levelNodes: Record<number, string[]> = {};
  Object.entries(levels).forEach(([id, lvl]) => {
    if (!levelNodes[lvl]) {
      levelNodes[lvl] = [];
    }
    levelNodes[lvl].push(id);
  });

  // Position nodes per level, centered vertically
  const positions: Record<string, { x: number; y: number }> = {};
  const maxLevel = Object.values(levels).length
    ? Math.max(...Object.values(levels))
    : 0;
  for (let lvl = 0; lvl <= maxLevel; lvl++) {
    const ids = levelNodes[lvl] ?? [];
    const totalHeight = (ids.length - 1) * ySpacing;
    const startY = (areaHeight - totalHeight) / 2;
    ids.forEach((id, idx) => {
      positions[id] = {
        x: 80 + lvl * xSpacing,
        y: startY + idx * ySpacing,
      };
    });
  }
  // Fallback for nodes not in levels (disconnected)
  nodeIds.forEach((id, idx) => {
    if (!positions[id]) {
      positions[id] = {
        x: 80,
        y: 80 + idx * ySpacing,
      };
    }
  });
  return positions;
}

function getLayoutBounds(positions: Record<string, { x: number; y: number }>) {
  const xs = Object.values(positions).map((p) => p.x);
  const ys = Object.values(positions).map((p) => p.y);
  if (!xs.length || !ys.length) {
    return { width: 800, height: 600 };
  }
  const minX = Math.min(...xs);
  const maxX = Math.max(...xs);
  const minY = Math.min(...ys);
  const maxY = Math.max(...ys);
  // Add some padding
  return {
    width: Math.max(400, maxX - minX + 200),
    height: Math.max(300, maxY - minY + 200),
  };
}

const convertGraphToFlow = (graph?: Graph) => {
  if (!graph?.nodes.length) {
    // Handle missing or empty graph
    return {
      nodes: [
        {
          id: 'no-lineage',
          data: { label: 'No Lineage Generated' },
          position: { x: 350, y: 300 },
          type: 'default',
          style: {
            backgroundColor: '#f5f5f5',
            border: '1px solid #ccc',
            borderRadius: '5px',
            padding: '10px',
            width: 200,
          },
        },
      ],
      edges: [],
      bounds: { width: 800, height: 600 },
    };
  }
  const nodeList = graph.nodes.map((node: LineageNode) => ({
    id: node.data.id,
    label: node.data.text || node.data.id,
  }));
  const edgeList = graph.edges.map((edge: LineageEdge) => ({
    source: edge.data.source.data.id,
    target: edge.data.target.data.id,
  }));
  const positions = autoLayoutNodesAndEdges(nodeList, edgeList);
  const bounds = getLayoutBounds(positions);

  // For class and database lineage, all nodes should have edges starting from right side
  const nodes = nodeList.map((node) => ({
    id: node.id,
    data: { label: node.label },
    position: positions[node.id] ?? { x: 0, y: 0 },
    type: 'default' as const,
    sourcePosition: Position.Right,
    targetPosition: Position.Left,
  }));

  const edges = edgeList.map((edge, idx) => ({
    id: `${edge.source}-${edge.target}-${idx}`,
    source: edge.source,
    target: edge.target,
    type: 'smoothstep' as const,
    // No explicit sourceHandle or targetHandle needed as we set sourcePosition and targetPosition on nodes
  }));
  return { nodes, edges, bounds };
};

const convertReportLineageToFlow = (reportLineage?: ReportLineage) => {
  if (!reportLineage?.columns.length) {
    // Handle missing or empty report lineage
    return {
      nodes: [
        {
          id: 'no-report-lineage',
          data: { label: 'No Lineage Generated' },
          position: { x: 350, y: 300 },
          type: 'default',
          style: {
            backgroundColor: '#f5f5f5',
            border: '1px solid #ccc',
            borderRadius: '5px',
            padding: '10px',
            width: 200,
          },
        },
      ],
      edges: [],
      bounds: { width: 800, height: 600 },
    };
  }

  const nodes: ReactFlowNode[] = [];
  const edges: ReactFlowEdge[] = [];

  // Layout constants
  const ySpacing = 70;
  const leftX = 100;
  const rightX = 500;
  const startY = 100;
  const columnWidth = 180;
  const tableWidth = 220;
  const headerHeight = 40;

  // Create report columns container
  const reportContainerId = 'report_columns_container';
  const reportContainerHeight =
    reportLineage.columns.length * ySpacing + headerHeight;
  nodes.push({
    id: reportContainerId,
    data: { label: 'Report Columns' },
    position: { x: leftX, y: startY },
    style: {
      width: columnWidth,
      height: reportContainerHeight,
      backgroundColor: '#eaf6ff',
      border: '2px solid #0073e6',
      borderRadius: '8px',
      padding: '10px',
      textAlign: 'center',
      fontWeight: 'bold',
    },
    type: 'default',
  });

  // Report columns inside the container
  reportLineage.columns.forEach((col, idx) => {
    const nodeId = `report_col_${col.name}`;
    nodes.push({
      id: nodeId,
      data: { label: col.name },
      position: { x: 10, y: headerHeight + idx * ySpacing },
      parentId: reportContainerId,
      extent: 'parent',
      style: {
        width: columnWidth - 20,
        backgroundColor: '#f0f7ff',
        border: '1px solid #0073e6',
        borderRadius: '5px',
        padding: '8px',
        zIndex: 10,
      },
      type: 'default',
      sourcePosition: Position.Right, // All report columns should have edges leaving from the right
      targetPosition: Position.Left,
    });
  });

  // Collect all unique owner/column pairs
  const tables = new Map<
    string,
    {
      owner: Owner;
      columns: string[];
    }
  >();

  reportLineage.columns.forEach((col) => {
    col.columns.forEach((childCol) => {
      const ownerObj = childCol.column.owner;
      const ownerKey = `${ownerObj.schema.database.package}.${ownerObj.schema.database.name}.${ownerObj.schema.name}`;
      const columnName = childCol.column.name;

      if (!tables.has(ownerKey)) {
        tables.set(ownerKey, {
          owner: ownerObj,
          columns: [],
        });
      }

      const tableInfo = tables.get(ownerKey)!;
      if (!tableInfo.columns.includes(columnName)) {
        tableInfo.columns.push(columnName);
      }
    });
  });

  // Place tables and their columns
  let currentY = startY;
  const tableColumnPositions = new Map<string, { x: number; y: number }>();
  tables.forEach(({ owner, columns }, ownerKey) => {
    const tableId = `table_${ownerKey.replace(/[^a-zA-Z0-9]/g, '_')}`;
    const tableHeight = headerHeight + columns.length * ySpacing;

    // Table container node
    nodes.push({
      id: tableId,
      data: { label: owner.name },
      position: { x: rightX, y: currentY },
      style: {
        width: tableWidth,
        height: tableHeight,
        backgroundColor: '#f5f5f5',
        border: '2px solid #555',
        borderRadius: '5px',
        padding: '10px 0 0 0',
        fontWeight: 'bold',
      },
      type: 'default',
    });

    // Column nodes within table
    columns.forEach((column, colIdx) => {
      const columnId = `${tableId}_column_${column}`;
      const columnY = colIdx * ySpacing;
      tableColumnPositions.set(columnId, { x: 10, y: headerHeight + columnY });
      nodes.push({
        id: columnId,
        data: { label: column },
        position: { x: 10, y: headerHeight + columnY },
        parentId: tableId,
        extent: 'parent',
        style: {
          width: tableWidth - 20,
          backgroundColor: '#fff',
          border: '1px solid #ccc',
          borderRadius: '3px',
          padding: '8px',
          fontSize: '12px',
          zIndex: 10,
        },
        type: 'default',
        sourcePosition: Position.Right,
        targetPosition: Position.Left, // All target columns should accept edges on the left
      });
    });

    currentY += tableHeight + 50; // Add spacing between tables
  });

  // Create edges between report columns and table columns
  reportLineage.columns.forEach((col) => {
    const sourceId = `report_col_${col.name}`;
    col.columns.forEach((childCol) => {
      const ownerObj = childCol.column.owner;
      const ownerKey = `${ownerObj.schema.database.package}.${ownerObj.schema.database.name}.${ownerObj.schema.name}`;
      const columnName = childCol.column.name;
      const tableId = `table_${ownerKey.replace(/[^a-zA-Z0-9]/g, '_')}`;
      const targetId = `${tableId}_column_${columnName}`;

      edges.push({
        id: `${sourceId}-${targetId}`,
        source: sourceId,
        target: targetId,
        type: 'default',
        style: { strokeWidth: 1.5 },
      });
    });
  });

  // Determine total height needed
  const totalHeight = Math.max(startY + reportContainerHeight + 100, currentY);

  return {
    nodes,
    edges,
    bounds: {
      width: rightX + tableWidth + 100,
      height: totalHeight,
    },
  };
};

// Helper to render ReactFlow as a JSX.Element
function renderReactFlow(
  nodes: ReactFlowNode[],
  edges: ReactFlowEdge[],
): JSX.Element {
  return (
    <ReactFlowProvider>
      <div style={{ width: '100%', height: '100%' }}>
        <ReactFlow
          nodes={nodes}
          edges={edges}
          defaultEdgeOptions={{ type: 'default' }}
          defaultViewport={{ x: 0, y: 0, zoom: 1.5 }}
          fitView={true}
          nodesDraggable={true}
        >
          <Background />
          <MiniMap />
          <Controls />
        </ReactFlow>
      </div>
    </ReactFlowProvider>
  );
}

// Graph Viewer Component
const LineageGraphViewer = observer(
  (props: { nodes: ReactFlowNode[]; edges: ReactFlowEdge[] }) => {
    const { nodes, edges } = props;
    return (
      <div style={{ height: '100%', width: '100%' }}>
        {renderReactFlow(nodes, edges)}
      </div>
    );
  },
);

const TAB_ORDER = [
  LINEAGE_VIEW_MODE.DATABASE_LINEAGE,
  LINEAGE_VIEW_MODE.CLASS_LINEAGE,
  LINEAGE_VIEW_MODE.REPORT_LINEAGE,
];

const TAB_LABELS: Record<LINEAGE_VIEW_MODE, string> = {
  [LINEAGE_VIEW_MODE.CLASS_LINEAGE]: 'Class Lineage',
  [LINEAGE_VIEW_MODE.DATABASE_LINEAGE]: 'Database Lineage',
  [LINEAGE_VIEW_MODE.REPORT_LINEAGE]: 'Report Lineage',
};

const LineageTabSelector = observer((props: { lineageState: LineageState }) => {
  const { lineageState } = props;
  return (
    <div className="panel__header query-builder__execution-plan-form--editor__header--with-tabs">
      <div className="uml-element-editor__tabs">
        {TAB_ORDER.map((tab) => (
          <div
            key={tab}
            onClick={() => lineageState.setSelectedTab(tab)}
            className={clsx('query-builder__execution-plan-form--editor__tab', {
              'query-builder__execution-plan-form--editor__tab--active':
                tab === lineageState.selectedTab,
            })}
          >
            {TAB_LABELS[tab]}
          </div>
        ))}
      </div>
    </div>
  );
});

const LineageViewerContent = observer(
  (props: { lineageState: LineageState }) => {
    const { lineageState } = props;
    const selectedTab = lineageState.selectedTab;
    const lineageData = lineageState.lineageData;

    // Prepare all three graphs
    const classLineageFlow = convertGraphToFlow(lineageData?.classLineage);
    const databaseLineageFlow = convertGraphToFlow(
      lineageData?.databaseLineage,
    );
    const reportLineageFlow = convertReportLineageToFlow(
      lineageData?.reportLineage,
    );

    return (
      <div
        className="query-builder__execution-plan-form--editor"
        style={{ height: '100%' }}
      >
        <div className="panel" style={{ height: '100%' }}>
          <LineageTabSelector lineageState={lineageState} />
          <PanelContent>
            {selectedTab === LINEAGE_VIEW_MODE.CLASS_LINEAGE && (
              <LineageGraphViewer
                nodes={classLineageFlow.nodes}
                edges={classLineageFlow.edges}
              />
            )}
            {selectedTab === LINEAGE_VIEW_MODE.DATABASE_LINEAGE && (
              <LineageGraphViewer
                nodes={databaseLineageFlow.nodes}
                edges={databaseLineageFlow.edges}
              />
            )}
            {selectedTab === LINEAGE_VIEW_MODE.REPORT_LINEAGE && (
              <LineageGraphViewer
                nodes={reportLineageFlow.nodes}
                edges={reportLineageFlow.edges}
              />
            )}
          </PanelContent>
        </div>
      </div>
    );
  },
);

export const LineageViewer = observer(
  (props: { lineageState: LineageState }) => {
    const { lineageState } = props;

    const closePlanViewer = (): void => {
      lineageState.setLineageData(undefined);
      lineageState.setSelectedTab(LINEAGE_VIEW_MODE.DATABASE_LINEAGE);
    };

    useEffect(() => {
      if (!lineageState.selectedTab) {
        lineageState.setSelectedTab(LINEAGE_VIEW_MODE.DATABASE_LINEAGE);
      }
    }, [lineageState]);

    if (!lineageState.lineageData) {
      return null;
    }
    const isDarkMode =
      !lineageState.applicationStore.layoutService
        .TEMPORARY__isLightColorThemeEnabled;
    return (
      <Dialog
        open={Boolean(lineageState.lineageData)}
        onClose={closePlanViewer}
      >
        <Modal className="editor-modal" darkMode={isDarkMode}>
          <ModalHeader title="Lineage Viewer" />
          <ModalBody>
            <div
              className="query-builder__execution-plan"
              style={{ height: '100%' }}
            >
              <LineageViewerContent lineageState={lineageState} />
            </div>
          </ModalBody>
          <ModalFooter className="editor-modal__footer">
            <ModalFooterButton
              onClick={closePlanViewer}
              text="Close"
              type="secondary"
            />
          </ModalFooter>
        </Modal>
      </Dialog>
    );
  },
);
